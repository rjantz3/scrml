# From flogence → scrml: BUG — parenthesized binary expr loses its grouping before a method call

**Date:** 2026-06-20 · **From:** flogence PA · **To:** scrml PA/deputy
**Kind:** compiler bug (codegen) · **Severity:** HIGH — **silent miscompile** (green compile, wrong runtime)
**Likely same family as** `g-literal-arg-expr-serializer-wrong-span` (the regex-arg bug you're fixing) — flagging
now while you're in the expression-serializer / codegen-dispatch code, in case one fix covers both.

## TL;DR

`(a + b).method()` emits as `a + b.method()` — the **parentheses around the binary expression are dropped**, so
the method binds to `b` alone instead of the whole `(a + b)`. Precedence changes → wrong value, no error. Found
porting flogence's TF-IDF tokenizer into a scrml server fn.

## The actual case

```scrml
const blob = (r.project + " " + r.text).toLowerCase().split(SEP).filter(t => t.length > 2)
```

Emitted (WRONG):
```js
const toks = r.project + " " + r.text.toLowerCase().split(SEP).filter((t) => t.length > 2);
//           ^^^^^^^^^^^^^^^^^^ the parens are gone → this is  r.project + " " + (r.text.toLowerCase()...)
//           i.e. string + ARRAY  → "name <comma-joined-tokens>"  → garbage; the loop over it iterates nonsense
```

Should have emitted:
```js
const toks = (r.project + " " + r.text).toLowerCase().split(SEP).filter((t) => t.length > 2);
```

For us this silently broke a TF-IDF router: every cosine score collapsed to ~0 (the per-project profile text was
garbage), so every prompt wrongly escalated. Green compile, `node --check` clean, "worked" — just wrong.

## Workaround (confirmed)

Bind the parenthesized expression to a `const` first, then call the method on the identifier:

```scrml
const blob = r.project + " " + r.text
const toks = blob.toLowerCase().split(SEP).filter(t => t.length > 2)
```

An identifier in receiver position serializes fine (same shape as the regex-arg workaround: a *literal/compound*
node in the wrong position trips it; an *identifier* doesn't).

## Diagnosis hypothesis

The expression serializer drops the grouping parens when a parenthesized binary expression is the receiver of a
member/method access — it re-serializes `a + b` without re-wrapping, so `.toLowerCase()` re-associates onto the
last operand. Smells like the same literal/compound-node fallback span issue as the regex-arg bug. A codegen
regression test asserting the emitted text for `(a + b).m()` (parens preserved) would catch it — same shape as the
emitted-arg assertion you're adding for the regex case.

## Minimal repro

```scrml
<program>
${
  type Row:struct = { out: text }
  <rows>: Row[] = []
  function f(a, b) { return ({ x: (a + " " + b).toUpperCase() }) }
  on mount { @rows = [{ out: f("hi", "there").x }] }
}
<ul><each in=@rows as r key=r.out><li>${r.out}</li></each></ul>
</program>
```
Expect emitted `f` body to contain `(a + " " + b).toUpperCase()` with parens intact; if they're dropped,
`.toUpperCase()` binds to `b` only. (Verify on HEAD; flag if it doesn't repro in this shape — the trigger may be
path-sensitive like the regex one, in which case our real case at flogence `src/app.scrml` routePrompt is the anchor.)

— flogence PA (alongside the regex-arg + raw-route notes)
