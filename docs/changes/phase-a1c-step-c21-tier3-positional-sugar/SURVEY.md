---
title: A1c C21 Phase 0 SURVEY — Tier 3 predefined-shape compound positional sugar lowering
date: 2026-05-09
session: S75 (A1c Wave 5a parallel dispatch with C17 + C20)
worktree: agent-a2e9c29eeac79419b
branch: worktree-agent-a2e9c29eeac79419b
baseline-head: 72d691f (S74 wrap; close A1c Wave 4 + B17.x family)
status: SURVEY COMPLETE — verdict SCOPE-VIABLE-AS-DISPATCHED
---

## §0 Methodology + worktree state

Read in full: dispatch BRIEF (this dispatch), `compiler/SPEC.md` §14.11 (lines 7210-7253), §14.3 (struct types), §6.3 (Variant C), `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md` rows C1 + C21, `docs/changes/phase-a1c-step-c1-shape-aware-cell-emit/SURVEY.md` (full — for scope-fork context), `compiler/src/ast-builder.js:3200-3392` (state-decl typed-decl path), `compiler/src/expression-parser.ts:1325-1346` (SequenceExpression handling), `compiler/src/codegen/emit-expr.ts:675-695` (escape-hatch emission), `compiler/src/codegen/emit-logic.ts:63-167, 882-1252` (state-decl arm), `compiler/src/codegen/emit-reactive-wiring.ts:250-317` (entry point), `compiler/src/type-system.ts:95-102, 1792-1859` (StructType + buildTypeRegistry), `compiler/tests/integration/parse-shapes-v0next.test.js:1649-1670` (existing parse-side test for §S11C.4 Tier 3), `compiler/tests/unit/c1-shape-aware-cell-emit.test.js:1-100` (test pattern).

### Worktree state
- WORKTREE_ROOT: `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a2e9c29eeac79419b`
- HEAD: `72d691f` (clean, matches main)
- `bun install`: 114 packages, clean
- `bun run pretest`: 12 samples compiled, OK
- Baseline `bun run test`: **10551 pass / 69 skip / 1 todo / 3 fail / 35910 expects**

Pre-existing 3 failures (carried forward from S70+; see C1 SURVEY §0 for context):
1. `F-BUILD-002 §3 generated entry parses without SyntaxError` (integration; self-host parity drift)
2. `Bootstrap L3: self-hosted API compiles compiler` (integration; beforeEach 5 s timeout)
3. `Self-host: tokenizer parity > compiled tab.js exists` (integration)

These are **not C21's regression budget**. C21 invariant: **no NEW fails** post-SHIP.

---

## §1 Bug confirmation — what the codegen emits TODAY

### §1.1 Source form

```scrml
type UserInfo:struct = { name: string, age: number, active: boolean }
<userInfo>: UserInfo = ("alice", 30, true)
```

### §1.2 Parse-side (CONFIRMED via `parse-shapes-v0next.test.js:1649-1670`)

Acorn parses `("alice", 30, true)` as a JS `SequenceExpression`. The ast-builder produces:

```js
{
  kind: "state-decl",
  name: "userInfo",
  init: '("alice", 30, true)',           // raw text
  initExpr: { kind: "escape-hatch",
              estreeType: "SequenceExpression",
              raw: '("alice", 30, true)' },
  shape: "plain",
  structuralForm: true,
  isConst: false,
  typeAnnotation: "UserInfo",            // <— the key gate
  span: …
}
```

Confirmed by reading `expression-parser.ts:1329-1332`: `case "SequenceExpression":` returns an `escape-hatch` ExprNode, preserving the raw text in `raw`.

### §1.3 Codegen-side (CONFIRMED by tracing emit-logic.ts:882+)

The state-decl flow falls through every C1 dispatch arm:
- arm 1 (compound-parent): NO — no `_cellKind: "compound-parent"` and no `children` field.
- arm 2 (markup-typed): NO — `_cellKind` is "plain", not "markup-typed".
- arm 3 (derived const): NO — `isConst === false`.
- arm 4 (legacy fallthrough at line 1228+): YES — uses `node.initExpr` fast path → `emitExpr` → `emitEscapeHatch` (emit-expr.ts:675-695) → `rewriteExpr(raw, …)`.

`rewriteExpr` is the legacy string-pipeline emitter — it does NOT recognise the SequenceExpression as a positional sugar; it simply rewrites and emits the raw text. The result is:

```js
_scrml_reactive_set("userInfo", ("alice", 30, true));
```

When this evaluates in JS, the comma operator returns the LAST operand: `true`. The cell `userInfo` becomes `true` — silently wrong.

### §1.4 Empirical bug verification

Bug verified via static reading; running a sample fixture is unnecessary because the code path is deterministic. The primary load-bearing question from the BRIEF (§9 deliverable #9) is **YES — the bug emits `(a,b,c)` evaluating to `c` (last operand) per JS comma-operator semantics. No existing diagnostic catches it.**

---

## §2 §14.11 normative interpretation

§14.11 (lines 7210-7253) is brief and prescriptive:

| Norm | Spec ref | C21 implication |
|---|---|---|
| Positional binding ONLY when LHS has predefined struct type annotation. | §14.11 line 7225 | Detection gate: `typeAnnotation` must resolve to a `StructType` in the typeRegistry. |
| Positional values bind in field-declaration order. | §14.11 line 7226 | Mapping: iterate `StructType.fields` (Map preserves insertion order); zip with SequenceExpression args. |
| Field count mismatch = `E-TYPE-001` (positional-arity error). | §14.11 line 7226 | Reuse existing `E-TYPE-001`; new diagnostic message. |
| Per-position type mismatch = `E-TYPE-001` (positional-type error). | §14.11 line 7226 | Out-of-scope for C21 codegen — type-system enforcement is in §14.3 / §15.10 territory. C21 emits the typed object literal; downstream type-checking on the lowered form catches type mismatches naturally. |
| Positional binding does NOT extend to nested structs. | §14.11 line 7228 | Defensive: if any positional value is itself a SequenceExpression (nested tuple), DON'T recurse — emit the value as-is (downstream will type-check). Out-of-scope to enforce. |
| Variant C ad-hoc compound does NOT accept positional binding. | §14.11 line 7229 | NOT C21's territory — the Variant C ad-hoc form has no `typeAnnotation`, so the C21 detection gate naturally excludes it. |

**Error code: `E-TYPE-001` is prescribed.** No new error code needed. No spec amendment needed.

---

## §3 Field-order resolution path

### §3.1 Where the type-registry lives

`compiler/src/type-system.ts:1792` defines `buildTypeRegistry(typeDecls, errors, fileSpan)` → `Map<string, ResolvedType>`. Each struct type is `{ kind: "struct", name, fields: Map<string, ResolvedType> }` (line 98-102). The `fields` Map preserves insertion order, which is the field-declaration order.

### §3.2 How codegen accesses the type-registry

Currently, `emit-reactive-wiring.ts:286-296` builds the type-registry locally for transition-table emission (enums with `transitions{}`). It is NOT threaded into `EmitLogicOpts` today.

**C21 plan:** thread the type-registry through `EmitLogicOpts` so the state-decl arm can resolve `typeAnnotation` strings to `StructType` records. Lift the existing build to a shared point (already at line 287) and pass it through.

### §3.3 typeAnnotation string handling

`typeAnnotation` is a raw STRING (`"UserInfo"`, `"number"`, `"string(pattern(/.../))"`, etc.). For Tier 3, the simple bare-name case `"UserInfo"` resolves directly via `typeRegistry.get("UserInfo")`. Refinement-typed forms (e.g., `"UserInfo using (predicate)"`) need stripping; per BRIEF §14.11 NARROW affordance, only bare struct-type names are in scope. The detection gate uses `.trim()` and falls through cleanly when the lookup misses.

---

## §4 Codegen entry point + ast-builder split

### §4.1 Where to lower: codegen ONLY (no ast-builder change)

The dispatch BRIEF surfaces the architectural split as an open question. Decision: **codegen-only.**

**Rationale:**
- The struct-type field-order info lives in the typeRegistry, which is derived from typeDecls. The ast-builder runs BEFORE typeDecls are processed by the type-system, so the ast-builder cannot resolve `typeAnnotation: "UserInfo"` to its field list.
- C0 SURVEY for C1 already concluded the same about `_cellKind` annotations: A1b (post-parse, post-classify) is where structural detection happens; A1c codegen is where value-shaping happens.
- Putting the lowering at codegen is symmetric with the C1 dispatch arms (1: compound-parent, 2: markup-typed, 3: derived) — Tier 3 is naturally arm 0.5 (between arm 3 and the fallthrough): if `typeAnnotation` resolves to a struct type AND `initExpr` is an escape-hatch SequenceExpression, lower to typed object literal; otherwise fall through.
- ast-builder side stays purely syntactic: it preserves the SequenceExpression escape-hatch as parsed (already the case).

### §4.2 New dispatch arm location

Insert a new arm in `emit-logic.ts case "state-decl"` BEFORE the legacy fallthrough at line 1204. After arm 3 (derived const) at line 1149, BEFORE `if (opts.boundary === "server" && node.sqlNode...)` at line 1164. Detection logic:

```ts
// C21 dispatch arm: Tier 3 predefined-shape compound positional sugar (§14.11)
const _typeAnno = (node as any).typeAnnotation;
if (
  typeof _typeAnno === "string" &&
  _typeAnno.trim() &&
  node.initExpr &&
  node.initExpr.kind === "escape-hatch" &&
  node.initExpr.estreeType === "SequenceExpression" &&
  opts.typeRegistry
) {
  const _resolved = opts.typeRegistry.get(_typeAnno.trim());
  if (_resolved && _resolved.kind === "struct") {
    // → lower SequenceExpression → typed object literal
  }
}
```

### §4.3 Lowering mechanics

The SequenceExpression's `raw` field holds the parenthesised text `("alice", 30, true)`. Two lowering strategies:

1. **String-rewrite path:** parse the raw text via acorn (already a dep), extract the SequenceExpression's `expressions[]` array, format each as a JS expression string, and synthesise `{name: <expr0>, age: <expr1>, active: <expr2>}`.
2. **Re-parse via existing helpers:** the ast-builder's `safeParseExprToNode` is not available at codegen-time. The expression-parser exposes `parseExprToNode` though — `import { parseExprToNode } from "../expression-parser.ts"` — and re-parsing the inner expressions back into ExprNodes lets us route them through the existing `emitExpr` pipeline.

**Recommendation: option 2 (re-parse).** Reasons:
- Uniform with how the rest of codegen handles expressions (rewrite via `emitExpr`).
- Each positional value may itself be a complex expression (`@count`, `f(x)`, `1 + 2`), and `emitExpr` handles all those cases including reactive references.
- Cleaner test surface — the lowered output reuses the same string formatting as a hand-written `{name: x, …}` literal.

**Concrete approach:** parse the SequenceExpression's raw text with acorn directly (via the existing `acorn` import in `expression-parser.ts`), extract the inner expressions, convert each via `esTreeToExprNode`, and emit them through the ExprNode pipeline. Encapsulate the helper in `emit-logic.ts` (or a new `emit-tier3.ts` helper module if it grows beyond ~50 LOC).

### §4.4 Arity-mismatch diagnostic

Per §14.11 line 7226, field-count mismatch fires `E-TYPE-001`. C21 must surface this from codegen. Two surfacing paths:

1. Push a `TABError` into `opts.errors` (or `ctx.errors` from emit-reactive-wiring) — but `EmitLogicOpts` doesn't currently carry an `errors` accumulator.
2. Surface via the existing diagnostic plumbing in compile-context — emit-reactive-wiring is called via `emitReactiveWiring(ctx)` where `ctx.errors` exists.

**Plan:** add `errors?: TABError[]` to `EmitLogicOpts` and have the C21 arm push diagnostics there. Wire this in `emit-reactive-wiring.ts:272` when constructing `emitOpts`.

When arity mismatches, emit a defensive comment in place of the lowered literal (so codegen doesn't crash):

```js
/* E-TYPE-001: positional-arity mismatch — UserInfo expects 3 fields, got 2 */
_scrml_reactive_set("userInfo", undefined);
```

The diagnostic is the load-bearing surface; the runtime emission is recoverable noise.

---

## §5 Test corpus

### §5.1 Existing tests touching positional binding

- `compiler/tests/integration/parse-shapes-v0next.test.js:1649-1670` — §S11C.4 — parse-side test confirming the AST shape (`init: '("alice", 30, true)'`, `typeAnnotation: "UserInfo"`). NO codegen assertion. C21 leaves this untouched.
- No existing codegen test exercises Tier 3.
- No existing sample (`samples/compilation-tests/*.scrml`) uses Tier 3 positional sugar.

### §5.2 New test surface (target ~+18 tests)

Plan a new file `compiler/tests/unit/c21-tier3-positional-sugar.test.js`:

| § | Section | Tests |
|---|---|---|
| §C21.1 | Positive lowering | 4 tests: simple 3-field, 2-field, single-field, complex value expressions |
| §C21.2 | Detection gate (negative — no lowering) | 4 tests: no typeAnnotation, non-struct typeAnnotation (e.g. `number`), no SequenceExpression init, missing typeRegistry |
| §C21.3 | Arity mismatch | 2 tests: too few (`Struct3 = (a, b)`), too many (`Struct2 = (a, b, c)`) → E-TYPE-001 |
| §C21.4 | Variant C ad-hoc rejection | 1 test: `<formRes> = (a, b, c)` (no typeAnno) → falls through (no lowering); separate test confirms the JS-comma-operator path is unchanged for non-typed sequence inits (regression guard for the latent bug NOT applying in scope) |
| §C21.5 | Regression — existing struct init via field-named literal still works | 2 tests: `<x>: UserInfo = {name: "a", age: 1, active: true}` lowers unchanged; `<x>: number = 0` (Shape 1 typed) lowers unchanged |
| §C21.6 | Regression — JS comma-operator outside compound init still works | 2 tests: `for (i = 0, j = 0; ...)` left arm; `(a = 1, b = 2)` in a let-decl init |
| §C21.7 | Field-order preserved | 1 test: struct with reordered field declaration produces lowered literal in declaration order |
| §C21.8 | Span / source preservation | 1 test: lowered emission preserves source span for diagnostics |
| §C21.9 | Integration — full sample | 1 test: end-to-end through `compileFile` for a sample with Tier 3 positional sugar |

**Total: 18 tests.** Within the BRIEF's +15-25 forecast.

### §5.3 No SPEC amendment

§14.11 prescribes `E-TYPE-001` clearly. No new error code. No SPEC drift.

---

## §6 Estimated revised scope

BRIEF estimate: 2-3 h. Survey breakdown:

| WIP | Sub-step | Est | Notes |
|---|---|---|---|
| WIP-1 | Thread typeRegistry + errors through EmitLogicOpts (emit-reactive-wiring + emit-logic) | 30 min | Lifts existing build, adds field, no behavioral change yet |
| WIP-2 | C21 dispatch arm — detection gate + lowering helper | 45 min | New code in emit-logic.ts; option-2 reparse via acorn (~40 LOC) |
| WIP-3 | Arity-mismatch diagnostic (E-TYPE-001) + defensive comment fallback | 20 min | Push to opts.errors; emit recoverable comment |
| WIP-4 | Unit tests (c21-tier3-positional-sugar.test.js, ~18 tests) | 60 min | Mirror C1 test pattern |
| WIP-5 | Regression sweep + commit cadence | 25 min | Verify baseline 10551 pass, no new fails |

**Total: ~3 h** (upper end of BRIEF estimate). Within scope.

---

## §7 Surprises + DD-validation findings

1. **No A1b desugar exists for Tier 3.** A1b's `_cellKind` classifier (symbol-table.ts:1480-1490) marks the cell as "plain" because typeAnnotation alone doesn't promote to a special cellKind. The SequenceExpression remains intact in `initExpr` as an escape-hatch. C21 must do the lowering at codegen.
2. **typeRegistry already built locally in emit-reactive-wiring.ts:287.** Re-using it requires lifting it once and threading through EmitLogicOpts. Cleaner than rebuilding per state-decl.
3. **`_cellKind` is "plain" for Tier 3 (not a special category).** This was confirmed by reading symbol-table.ts:1480-1490 — typeAnnotation does NOT participate in cellKind classification. Means C21's detection cannot rely on `_cellKind` and must inspect `typeAnnotation` + `initExpr.estreeType` directly.
4. **C1 SURVEY §4 EXPLICITLY DEFERRED Tier 3 to C21.** Per the SCOPE-AMENDMENT section (§10.2), C21 retained Tier 3 only after Variant C compound + markup-typed-derived moved to C1. Confirms today's dispatch BRIEF.
5. **No existing sample exercises Tier 3.** Means no fixture-update labor — but also means the bug has been latent + unobserved. C21's positive-case tests will be the first to exercise the path.

---

## §8 Verdict

**SCOPE-VIABLE-AS-DISPATCHED.**

C21 is structurally feasible and the BRIEF is correct. Open questions answered:

- **Q: Should arity-mismatch fire a new error code (E-COMPOUND-POSITIONAL-ARITY)?** A: NO. §14.11 line 7226 prescribes `E-TYPE-001`. Reuse.
- **Q: ast-builder vs codegen split?** A: codegen-only. ast-builder stays untouched.
- **Q: Will the bug-fix break any existing test?** A: No existing test asserts Tier 3 codegen output, so no fixture updates needed. New tests only.

**Recommended sequence:** WIP-1 (typeRegistry threading) → WIP-2 (dispatch arm) → WIP-3 (diagnostic) → WIP-4 (tests) → WIP-5 (regression sweep).

No SCOPE amendments needed. No SPEC amendments needed. Proceed to implementation.

---

## §9 References

- Dispatch BRIEF: this conversation
- SPEC §14.11: `compiler/SPEC.md` lines 7210-7253
- SPEC §14.3: `compiler/SPEC.md` lines 6669+ (struct types)
- SPEC §6.3: `compiler/SPEC.md` (Variant C ad-hoc compound)
- A1c SCOPE: `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md` rows C1 (line 204) + C21 (line 244)
- C1 SURVEY: `docs/changes/phase-a1c-step-c1-shape-aware-cell-emit/SURVEY.md` — full file (esp. §4 Tier 3 disposition + §10.2 SCOPE-AMENDMENT)
- ast-builder typed-decl: `compiler/src/ast-builder.js:3219-3392`
- Expression parser SequenceExpression: `compiler/src/expression-parser.ts:1325-1346`
- Codegen escape-hatch: `compiler/src/codegen/emit-expr.ts:675-695`
- Codegen state-decl arm: `compiler/src/codegen/emit-logic.ts:882-1252`
- Type-system StructType + buildTypeRegistry: `compiler/src/type-system.ts:95-102, 1792-1859`
- Existing parse-side test: `compiler/tests/integration/parse-shapes-v0next.test.js:1649-1670`
- Test pattern: `compiler/tests/unit/c1-shape-aware-cell-emit.test.js:1-100`

---

## §10 Tags

#a1c #c21 #phase-0 #survey-complete #scope-viable-as-dispatched #tier-3 #positional-sugar #section-14-11 #m10 #latent-bug-confirmed #js-comma-operator
