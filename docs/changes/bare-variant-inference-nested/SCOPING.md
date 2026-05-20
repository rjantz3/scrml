# SCOPING — Bare-variant inference in nested expression positions

> **Status:** SCOPING (analysis only; no implementation)
> **Authored:** 2026-05-19 (S109)
> **Authority:** SPEC §14.10 (bare-variant inference) + §18.0.3 (match-arm patterns)
> **Origin:** match block-form Phase 5 carry-forward — "bare-variant inference in
> nested expression positions" (`docs/changes/match-block-form-scoping/` Phase 5;
> `emit-match.ts` module header v1-limitation note). The gap is GENERAL §14.10
> typer work, not match-specific — it surfaced via match because match arm
> bodies are one place adopters hit it.
> **HEAD at scoping:** `3f27d3a`

---

## 1. Problem statement

SPEC §14.10 says a bare variant `.V` SHALL be resolved "when the type at the
position can be inferred from … **any other position where the type is fixed
by the surrounding declaration**." In practice the typer resolves bare
variants at the *immediate* LHS / param / return / match-`for=` positions but
does NOT always propagate the expected type *inward* through a nesting
expression. Where it fails, a structurally-legal bare variant fires a spurious
`E-VARIANT-AMBIGUOUS` and the compile hard-fails.

## 2. Current behavior — probe matrix (HEAD `3f27d3a`)

Each row is a minimal compile probe. ✅ = compiles clean; ❌ = spurious
`E-VARIANT-AMBIGUOUS`.

| # | Position | Probe | Result |
|---|----------|-------|--------|
| 1 | ternary in cell-assign RHS | `function go(){ @x = (1>0) ? .A : .B }` (`<x>: T`) | ✅ |
| 2 | **ternary in fn-param position** | `let r = f((1>0) ? .A : .B)` (`f(v: T)`) | ❌ |
| 3 | **array literal element (multi)** | `<xs>: [T] = [.A, .B]` | ❌ |
| 4 | match-arm RHS bare variant (JS-style) | `match @x { .A => .B, .B => .A }` | ✅ |
| 5 | nested struct field bare variant | `<w>: W = { phase: .A }` (`W.phase: T`) | ✅ |
| 6 | fn-return ternary | `function pick(c: boolean) -> T { return c ? .A : .B }` | ✅ |
| 7 | DIRECT bare variant in fn-param | `f(.A)` | ✅ |
| 8 | **array literal element (single)** | `<xs>: [T] = [.A]` | ❌ |
| 9 | match-arm RHS payload-call | `match @x { .A => .B(1), .B n => .A }` | ✅ |
| 10 | bare variant in fn-call in arm body | `<A> : ${ tag(.B) }` (`tag(v: T)`) | ✅ |

**Two gaps**, both spurious-error (false positive — legal code rejected):

- **Gap A — array-literal elements under a `[T]` annotation** (rows 3, 8).
- **Gap B — ternary (conditional) branches in fn-param position** (row 2).

Everything else propagates correctly, including the asymmetry-suspect cases:
ternary in cell-assign RHS (row 1) and fn-return (row 6) both work — only the
fn-PARAM ternary (row 2) fails.

## 3. Root cause

### Gap A — array-literal elements

`type-system.ts` state-decl branch: when the decl type is `[T]` (array), the
bare-variant dispatch hands the **array type** to a walker
(`inferBareVariantsWithStructNav` / `inferBareVariantsInExpr`). The walker
descends the array literal `[.A]` and reaches the `.A` ident, but the
`contextType` it carries is the array type — not the element type `T`.
`inferBareVariantsWithStructNav` has no array-literal case, so the array
contextType degrades to `asIs`/`unknown` and the `.A` ident hits the
"no resolvable type context" branch (`type-system.ts:6818-6827`):

```
E-VARIANT-AMBIGUOUS: Bare variant `.A` has no resolvable type context.
```

The element type `T` is statically known (`[T]` annotation) — §14.10's
"position where the type is fixed by the surrounding declaration" plainly
covers it. The typer just doesn't unwrap `[T]` → `T` when descending an
array literal.

### Gap B — ternary branches in fn-param position

`inferBareVariantsAtCallArgs` (`type-system.ts:7389`) DOES resolve the call
arg correctly: for `f(c ? .A : .B)` it calls
`inferBareVariantsInExpr(ternaryNode, paramType, …)`, whose flat ident-walker
(`forEachIdentInExprNode`, which DOES descend `case "ternary"`) reaches `.A`
and `.B` and checks them against `paramType` — no error.

The spurious error comes from the **fallback flat walk** that runs afterward
for unannotated `let`/`const` decls (`type-system.ts:~4939`):

```ts
inferBareVariantsInExpr(initExprForScope, null, letSpan, errors);
```

This re-walks the whole init expr with `contextType = null` and re-diagnoses
`.A`/`.B` → `E-VARIANT-AMBIGUOUS: … has no type context`.

The skip mechanism — the `_bareVariantInferredAtBinaryExpr` stamp — is the
intended guard against this double-diagnosis. But `inferBareVariantsAtCallArgs`
only stamps the call arg **if the arg itself is a direct bare-variant ident**
(`type-system.ts:7433-7440`: `if (a.kind === "ident" && a.name.startsWith("."))`).
When the arg is a ternary (or any non-ident expr) wrapping the bare variants,
the nested `.A`/`.B` idents are never stamped → the fallback re-walk re-fires.

That is exactly why row 7 (`f(.A)` — direct ident arg) works but row 2
(`f(c ? .A : .B)` — ternary arg) fails.

## 4. Fix approaches

### Gap A

**Approach A1 (recommended) — element-type unwrap at the array-literal case.**
Give the bare-variant walker an explicit `array` contextType + array-literal
expr case: when `contextType.kind === "array"` (or `"list"`) and the expr
node is an array literal, recurse into each element with
`contextType.element` as the new contextType. Localized — one case in
`inferBareVariantsInExpr` (and/or `inferBareVariantsWithStructNav`). Composes
recursively (`[[T]]` nested arrays, array-of-struct, etc.).

**Approach A2 — pre-unwrap at the decl dispatch.** At the state-decl branch,
if the decl type is `[T]` AND the init expr is an array literal, dispatch the
walker per-element with `T` directly. Narrower but doesn't generalize to
arrays nested inside other expressions.

A1 is the structural fix; A2 is the shortcut. Per pa.md Rule 3, A1.

### Gap B

**Approach B1 (recommended) — stamp recursively.** In
`inferBareVariantsAtCallArgs`, after `inferBareVariantsInExpr(arg, paramType,
…)` resolves the arg, walk `arg` and stamp `_bareVariantInferredAtBinaryExpr`
on **every** bare-variant ident inside it — not only when `arg` is itself a
bare ident. This makes the fallback flat walk skip them, exactly as it
already does for the direct-ident case. ~5-10 LOC. The resolution already
happens; only the stamp coverage is too narrow.

**Approach B2 — make `inferBareVariantsInExpr` itself stamp.** Have the
resolver stamp each ident as it resolves it (when called with a non-null
contextType). Cleaner conceptually (resolution + stamp are one act) but
touches a function on more call paths — wider blast radius; needs a full
regression pass on every `inferBareVariantsInExpr` caller.

B1 is the contained fix; B2 is the "right shape" but riskier. Lean B1 for
this dispatch, note B2 as a future consolidation.

## 5. Cost estimate

| Item | Approach | Estimate |
|------|----------|----------|
| Gap A — array-literal element-type unwrap | A1 | ~1-2h (1 walker case + tests) |
| Gap B — recursive stamp in call-args | B1 | ~1h (~5-10 LOC + tests) |
| Tests (probe matrix → unit tests + a few full-compile) | — | ~1h |
| **Total** | | **~3-4h** — single PA-direct dispatch |

Survey-discount caveat (PRIMER §12): the bare-variant infrastructure is
mature (5 `inferBareVariants*` functions, the `_bareVariantInferredAtBinaryExpr`
stamp protocol). Both fixes are extensions of existing machinery, not new
infrastructure — the estimate should hold or come in under.

## 6. Open questions

- **OQ-BVI-1 — does Gap B also affect ternary args to METHOD calls**
  (`obj.method(c ? .A : .B)`)? `inferBareVariantsAtCallArgs` line 7408-7411
  explicitly skips method-call callees ("not in §14.10 scope today"). If
  method-call args need bare-variant inference at all, that is a separate,
  larger item — out of scope here. Probe before implementing.
- **OQ-BVI-2 — array-of-ternary** (`<xs>: [T] = [c ? .A : .B]`) is Gap A ×
  Gap B composed. A1 + B-style propagation should cover it once both land;
  add it to the test matrix as a composition check.
- **OQ-BVI-3 — should a SPEC §14.10 normative bullet explicitly enumerate
  array-literal elements + nested-conditional branches** as covered positions?
  Currently §14.10 line 7419 leans on the catch-all "any other position where
  the type is fixed." Adding two explicit examples would make the conformance
  intent unambiguous — small SPEC edit, recommend bundling with the impl.

## 7. Recommendation

Single PA-direct dispatch, ~3-4h: Approach A1 (Gap A) + Approach B1 (Gap B) +
probe-matrix tests + the OQ-BVI-3 SPEC §14.10 example bullets. No debate
needed — both gaps are unambiguous spurious-error bugs against the existing
§14.10 normative text; there is no design choice, only the structural-fix vs
shortcut axis (resolved: structural per Rule 3). OQ-BVI-1 (method-call args)
is explicitly OUT of this dispatch — probe-and-defer.

## 8. Cross-references

- SPEC §14.10 (bare-variant inference) — `compiler/SPEC.md:7396`
- SPEC §18.0.3 (match-arm patterns) — `compiler/SPEC.md:9712`
- `compiler/src/type-system.ts` — `inferBareVariantsInExpr` (6710),
  `inferBareVariantsWithStructNav` (6882), `inferBareVariantsAtCallArgs` (7389)
- match block-form Phase 5 — `docs/changes/match-block-form-scoping/`
- `E-VARIANT-AMBIGUOUS` — SPEC §34
