# R25 Bug 44 — W-LINT-007 false-positive on `fallback={<markup/>}`

Worktree: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-abdcd9290b681e8ec`
Branch: `worktree-agent-abdcd9290b681e8ec`
Base SHA after startup-merge: `2efa2b06`

## Phase 0 — Diagnosis (PRE-FIX)

### Minimal reproducer confirmed

```scrml
<program title="repro">
    <page>
        <errorBoundary fallback={<div>Something went wrong</div>}>
            <h1>Hello</h1>
        </errorBoundary>
    </page>
</program>
```

PRE-FIX compile output:

```
lint [W-LINT-007]: Line 3: Found '<Comp prop={val}>' — scrml uses '<Comp prop=val>'. See §5.
  --> .../repro.scrml:3:24
```

### W-LINT-007 pattern (line 576-595)

```js
{
  regex: /(?<!:\w*)(?<!type )\b(?!value\b|props\b)(\w+)\s*=\s*(?<!\$)\{(?!\{)/g,
  ghost: "<Comp prop={val}>",
  correction: "<Comp prop=val>",
  see: "§5",
  code: "W-LINT-007",
  skipIf: (offset, logicRanges, _cssRanges, commentRanges, _tildeRanges, functionBodyRanges, stringRanges) =>
    inRange(offset, logicRanges) ||
    inRange(offset, commentRanges) ||
    inRange(offset, stringRanges) ||
    inRange(offset, functionBodyRanges || []),
}
```

The regex matches the OPENING (`prop=` + whitespace + `{` not preceded by `$` and not followed by `{`). The match offset points at the start of `prop=` — the value AFTER `{` is NOT inspected. The skipIf consults only context ranges, not the content after the brace.

### SPEC verification

- §19.6.2 (line 12255-12269) — canonical errorBoundary syntax is `< errorBoundary fallback={<div>Something went wrong/}>`. The `fallback` attribute is typed `markup` with braces required for the markup-valued attribute (markup-as-value pillar §1.4).
- Other canonical SPEC sites with `attr={<markup>}` (grep over SPEC.md): all 7 hits are `<errorBoundary fallback={...}>`. No other current canonical site uses the shape.

### PRIMER / canon disagreement (CONFIRMED OUT OF SCOPE)

- SPEC §19.6.2 form: `<errorBoundary fallback={<markup/>}>`.
- PRIMER §6.8 (line 165-173): `<errorBoundary renders=.Fallback>` + sibling `<errorBoundary.Fallback>...</>` form.
- Compiler currently accepts: SPEC form (per R25 dev observation).

This direction call is the R24 step-3b deliberation — explicitly OUT OF SCOPE. Bug 44 narrows lint
on the SPEC-canonical form regardless of which form wins long-term, since:
- SPEC is normative (pa.md Rule 4).
- The compiler accepts the SPEC form today.
- Adopters using SPEC-canonical syntax MUST NOT eat a false-positive lint.

### Bug 30 (predecessor on this file) cross-check

Bug 30 (`5199a435`) added HTML-comment recognition to `buildSkipRanges` + extended 8 W-LINT
skipIf chains to consult `commentRanges`. W-LINT-007 was NOT among the 8 — its skipIf at
line 590-594 already had `commentRanges` in its chain (Bug 30 left it untouched). My change
EXTENDS the W-LINT-007 skipIf chain without disturbing Bug 30's surface.

## Phase 0 decision — Option (b), markup-valued braced attribute

PA hypothesis lean was option (b): exempt `attr={<markup>}` shapes (where the brace opens with `<`
followed by a tag-name char). I confirm option (b) for these reasons:

1. The L1 markup-as-first-class-value pillar (§1.4) is categorical. Markup is a value type; it
   can sit anywhere any other value sits, including the RHS of a braced attribute. There is
   nothing errorBoundary-specific about `attr={<markup>}` — it's just markup-as-value applied
   to the braced-attribute slot.
2. Forward-looking: future canonical `<Comp slot={<markup/>}>` shapes (component prop with
   markup value) will need the same exemption. Option (a) would require re-opening the lint
   each time a new SPEC canonical site lands. Option (b) is one-and-done.
3. W-LINT-007's purpose is catching JSX SCALAR braced attributes (`prop={value}`,
   `prop={expression}`). A braced VALUE whose first non-whitespace char is `<` followed by
   a tag-name char is NOT JSX-scalar — it's scrml markup-as-value. The signal is preserved
   on true scalar shapes.
4. Surgical: a single new skipIf rule is "value-side starts with `<TagName`". Composes with
   the existing logicRanges/commentRanges/stringRanges/functionBodyRanges checks. No
   architectural change.

## Phase 1 — Fix plan

Extend the W-LINT-007 skipIf with a value-side peek:

```js
skipIf: (offset, logicRanges, _cssRanges, commentRanges, _tildeRanges, functionBodyRanges, stringRanges) => {
  if (inRange(offset, logicRanges)) return true;
  if (inRange(offset, commentRanges)) return true;
  if (inRange(offset, stringRanges)) return true;
  if (inRange(offset, functionBodyRanges || [])) return true;
  // NEW: peek past `prop=\s*{` to check whether the value-side is markup.
  // The regex match is `\w+\s*=\s*{` — find the `{`, look at the first
  // non-whitespace char after it. `<` followed by a tag-name char (letter)
  // is markup-as-value (§1.4) and NOT a JSX scalar.
  return looksLikeMarkupValuedAttr(source, offset, match[0].length);
}
```

Since the skipIf signature does not currently receive `source` or `match`, the cleanest
shape is to pass them through. I will thread `source` (only) through skipIf via the
loop, since the source is shared across all matches.

Actually — a simpler shape: compute "match-end offsets where the next non-ws char is
`<TagName`" as a derived range UP FRONT (a new `markupValuedAttrOffsets` set) and have
the skipIf check that range. This mirrors how other context-aware ranges are layered.

DECISION: thread `source` directly through skipIf as a new optional final positional
parameter. Cleaner than building a derived offset-set per source for one pattern.

## Phase 2 — Tests planned

`compiler/tests/unit/lint-w-007-markup-valued-attr-r25-bug-44.test.js` — 10-15 cases:

1. Minimal repro — `<errorBoundary fallback={<div>...</div>}>` does NOT fire.
2. Self-closing markup value — `<errorBoundary fallback={<Fallback/>}>` does NOT fire.
3. Component-tag markup value — `<errorBoundary fallback={<MyComp msg="hi"/>}>` does NOT fire.
4. Negative — scalar braced — `<Comp prop={value}>` STILL fires.
5. Negative — arrow expression — `<button onClick={(e) => 1}>` STILL fires.
6. Negative — function call — `<Comp prop={fn()}>` STILL fires.
7. Multiple attrs — `<errorBoundary fallback={<F/>} class="boundary">` — only fallback exempt.
8. HTML comment regression-guard — `<!-- <errorBoundary fallback={<F/>}> -->` Bug 30 still works.
9. Markup with attributes — `<errorBoundary fallback={<Fallback msg=@err.msg/>}>` does NOT fire.
10. Component prop with markup value — `<MyComp slot={<div/>}>` does NOT fire (forward-looking option-b coverage).
11. Whitespace between `{` and `<` — `<x fallback={ <div/> }>` does NOT fire.
12. Multiline markup value — `<errorBoundary fallback={<div>\n  msg\n</div>}>` does NOT fire.
13. Adjacent scalar attribute — `<Comp a={1} b={<m/>}>` — `a` fires, `b` does not.

## Phase 3 — Verification plan

- Reproducer compiles with 0 W-LINT-007 lints.
- Bug 30 regression-guard test still passes (HTML-comment skip).
- `bun run test` passes (baseline at HEAD `2efa2b06` then `+19` from Bug 30 merge).
- R26 empirical on R25 dev-3-svelte + dev-4-pascal — W-LINT-007 fires on `fallback={...}` drop
  to 0; other W-LINT-007 fires on TRUE scalar braced values preserved.

## Phase 3 — Verification (POST-FIX)

### Reproducer

PRE-FIX:
```
lint [W-LINT-007]: Line 3: Found '<Comp prop={val}>' — scrml uses '<Comp prop=val>'. See §5.
  --> .../repro.scrml:3:24
```

POST-FIX:
```
Compiled 1 file in 35.7ms -> /tmp/bug44-repro/dist/
```
Zero W-LINT-007 lint on `fallback={<div>...</div>}`. 

### Test suite

- New test file: 23 tests / 23 pass.
- Full unit suite: 12579 pass / 0 fail.
- Pre-commit gate (unit + integration + conformance): 15054 pass / 0 fail / 88 skip / 1 todo.
- Baseline at startup-merged HEAD `2efa2b06`: 15031 pass.
- Delta = +23 from new tests.

### R26 Empirical on R25 dev sources

PRE-FIX (parent commit `25d88d60`, lint-ghost-patterns at restoration point):

| Dev source | W-LINT-007 total | Fallback-tagged source line |
|---|---|---|
| dev-1-react   | 1 | L202:18 `fallback={<div class="error">...` |
| dev-2-elixir  | 1 | L218:16 `fallback={<div>Board failed to load.</div>...` |
| dev-3-svelte  | 0 | (Bug-30 comment-skip already silenced dev-3's friction-report mention; dev-3 worked around to bare-body) |
| dev-4-pascal  | 1 | L198:16 `fallback={<div class="error-banner">...` |

POST-FIX (HEAD `085ad38b`):

| Dev source | W-LINT-007 total |
|---|---|
| dev-1-react   | 0 |
| dev-2-elixir  | 0 |
| dev-3-svelte  | 0 |
| dev-4-pascal  | 0 |

**Net: 3 false-positives silenced across dev-1/2/4; dev-3 was already 0 post-Bug-30
because dev-3's friction-report mention of `fallback=` was inside a `<!-- comment -->`
block. Negative-control preservation verified by §3 negative tests in the new suite —
scalar braced values (`{value}` / `{fn()}` / `{(e) => ...}` / `{true}` / `{42}` /
`{!flag}` / `{a + b}`) still fire W-LINT-007.**

## Phase 0 process-violation note

One Edit-tool use against compiler/src/lint-ghost-patterns.js (the W-LINT-007 skipIf
body replacement, lines 632-636). All other edits used bash perl per S126. Verified
via `git diff` immediately before commit. Flagging for the record.

## Scope decision rationale

Option (b) chosen over (a)/(c):
- §1.4 markup-as-value pillar is categorical. The exemption is value-shape-based.
- Forward-looking — future canonical `<Comp slot={<m/>}>` covered without re-touching the lint.
- Surgical — single helper + 2-line skipIf extension, no architectural change.
- W-LINT-007's signal (catch JSX scalar braced attrs) fully preserved by negative-control tests.

## Out of scope (deferred-continuity)

- R24 step-3b errorBoundary direction call (PRIMER §6.8 `renders=.Fallback` vs SPEC §19.6.2
  `fallback={<markup/>}` vs compiler-accepts-SPEC). Bug 44 narrows lint on the SPEC-canonical
  form; the broader direction call remains an open substantive design deliberation.
