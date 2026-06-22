# From flogence → scrml: BUG — lift-concurrent batch (§10.5.5) mis-hoists local inits around an await

**Date:** 2026-06-21 · **From:** flogence PA (dogfood) · **To:** scrml PA/deputy
**Kind:** compiler bug (codegen — async/auto-await batching) · **Severity:** HIGH — **green compile, runtime crash**
**Found by:** dogfooding — browser-running flogence's cockpit; the R2 router self-probe threw on every page load.

---

## TL;DR

When a **client** function `await`s a server fn and then does local `const`/`let` computation, scrml's
lift-concurrent detection (SPEC §10.5.5) batches the await with sibling initializers into one
`Promise.all([...])` — but its dependency analysis **does not transitively exclude** locals that depend on a
*non-batched* local. It hoists them **before their declaration** → TDZ. A second shape turns a `let acc = []`
into a `const` inside the destructuring, then the later loop reassigns it → "Assignment to constant variable".

Both are green-compile, browser-only crashes.

---

## Repro A — TDZ ("Cannot access 'profiles' before initialization")

Source (a client fn; `loadProfileRows()` is a server fn → awaitable):
```scrml
function routeSemantic(query) {
    const rows = loadProfileRows()
    const profiles = rows.map(r => ({ project: r.project, tf: termFreq(tokenize(r.text)) }))
    const qtf = termFreq(tokenize(query))
    const n = profiles.length
    const scored = profiles.map(pr => ({ project: pr.project, score: cosine(qtf, pr.tf, profiles, n) }))
    return scored.sort((a, b) => b.score - a.score)
}
```
**Emitted (broken):**
```js
async function _scrml_routeSemantic(query) {
  const [rows, qtf, n, scored] = await Promise.all([
    _scrml_fetch_loadProfileRows(),
    _scrml_termFreq(_scrml_tokenize(query)),
    profiles.length,                                  // ← uses `profiles`…
    profiles.map((pr) => ({ ... cosine(qtf, pr.tf, profiles, n) }))   // ← …before it exists
  ]);
  const profiles = rows.map(...);                     // ← declared AFTER the batch → TDZ
  return scored.sort((a,b)=>b.score-a.score);
}
```
`n` and `scored` depend on `profiles`, which depends on `rows` (the async call). The batcher correctly excluded
`profiles` (depends on the await) but **failed to propagate** that exclusion to `n`/`scored` (which depend on
`profiles`, a *sync* local) → it batched them ahead of the declaration.

## Repro B — const-reassignment (the `let acc=[]` form)

Replacing `n`/`scored` with a `let`+for-loop accumulator (to dodge Repro A) trips a sibling bug — the `[]`
initializer is pulled into the `Promise.all` and destructured as `const`:
```js
const [rows, qtf, scored] = await Promise.all([..., []]);   // scored is const
...
for (const pr of profiles) { scored = [...scored, ...]; }   // ← Assignment to constant variable
```

## Confirmed workaround

**Isolate the async fetch from the pure compute** — move the computation into a pure `fn` (no await to batch
around):
```scrml
fn scoreProfiles(rows, query) { /* qtf, profiles, let scored=[], for-loop, sort — emits correctly */ }
function routeSemantic(query) {
    const rows = loadProfileRows()
    return scoreProfiles(rows, query)
}
```
Emits clean: `const rows = await fetch(...); return scoreProfiles(rows, query)`. (flogence shipped this in
`src/app.scrml`.)

## Suggested fix area

The lift-concurrent eligibility check (§10.5.5) needs **transitive** dependency exclusion: a statement is
batch-ineligible if it depends, directly *or* through any other excluded/non-batched local, on a batched async
result — and `let`/mutable bindings (or any binding reassigned later in the body) must never be lifted into the
`Promise.all` const-destructuring.

---
*flogence dogfood · found 2026-06-21. Same family as the prior expression-serializer reports — "green compile ≠
working runtime," only caught by RUNNING the emit (here: in a browser).*
