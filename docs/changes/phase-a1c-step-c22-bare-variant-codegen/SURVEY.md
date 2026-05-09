# A1c Step C22 — Bare-variant inference codegen — Phase 0 Survey

**Date:** 2026-05-09 (S75)
**Worktree:** `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-afa8640c1db329910`
**Brief context:** A1c Wave 5 cross-cutting (parallel with C19, C23). File-disjoint.
**Spec authority:** SPEC §14.10, §18.0.3.

---

## §0.1 The load-bearing question

Per BRIEF: how does C22 know what enum the bare `.Variant` resolves to at codegen time?

**Answer: it doesn't need to.** The runtime convention encodes unit variants as plain
string values (no enum-namespace at runtime). So `.Idle` → `"Idle"` is sufficient. The
target enum's identity is irrelevant at codegen — only the variant NAME matters at
runtime, and that is right there on the IdentExpr node (`name.slice(1)`).

This is option (c) in the BRIEF's enumeration: the codegen *was almost* implicitly
correct via the string-rewrite pipeline, but the AST-path emit (`emitIdent`) misses the
case and emits `.Idle` verbatim into JS — which is broken JS.

---

## §0.2 What B20 actually shipped (verified)

Per `docs/changes/phase-a1b-step-b20-bare-variant-inference/SURVEY.md`:

- B20 fires **diagnostics only** (E-VARIANT-AMBIGUOUS, reuses E-TYPE-063 for unknown variant).
- B20 does **NOT annotate the AST** with a resolved enum-context — primer §13.7 was correct.
- B20 covers positions:
  - 1 (state-decl LHS-typed: `<x>: T = .V`)
  - 1b (let/const-decl LHS-typed: `let x: T = .V`)
  - 2 (cell reassignment `@cell = .V` after a typed declaration)
- B20 deferred:
  - 3 (function param) — needs FunctionType.params type capture
  - 4 (function return) — needs return-type AST capture
  - 5 (match arm union-shadow ambiguity) — already handled by exhaustiveness today; ambiguity check deferred
- B20 does NOT regress B15 position 6 (engine `initial=.Idle`).

**Implication for C22:** since B20 left no resolved-context annotation, C22 cannot use
one. But C22 doesn't need one — see §0.1.

---

## §0.3 Codegen path — the actual gap

A bare-variant `.Variant` is parsed (S66 fix, primer §13.8) as `IdentExpr { name: ".Variant" }`
(leading dot retained).

There are **two** codegen paths an expression takes:

1. **AST path** (preferred): `emitExprField(initExpr, fallbackStr, ctx)` → if `initExpr`
   present, dispatches `emitExpr` → `emitIdent` for IdentExprs.
   - `emitIdent` (compiler/src/codegen/emit-expr.ts:193-216) handles `@var` and `~`
     accumulator. **All other names — including `.Variant` — fall through to line 215
     `return name;`** which emits `.Idle` verbatim.
2. **String-rewrite path** (legacy fallback): triggered only when `exprNode` is null/missing.
   The pass `rewriteEnumVariantAccess` (compiler/src/codegen/rewrite.ts:1269-1293) DOES
   correctly rewrite standalone `.VariantName` → `"VariantName"` via the regex at line 1289.

**Today, the AST path is taken almost everywhere** (Phase 3 fast-path is the modern
convention; e.g. `emit-logic.ts:795` for let-decl; the dispatch path for state-decl init
exprs goes through `emitExprField(node.initExpr, ...)` at `emit-logic.ts:1219` and similar
sites; reassignment `@cell = .V` goes through `bare-expr` case at `emit-logic.ts:716` via
`emitExpr` directly).

Therefore **the bug fires at every fast-path site for bare-variant**. The string-rewrite
pass would only catch the legacy fallback, which is dead code for well-formed scrml.

---

## §0.4 Empirical demonstration

Probe file `.probe/bare-variant.scrml`:

```scrml
type Phase:enum = { Idle, Loading, Done }
<phase>: Phase = .Idle
const m = <main>${@phase}</main>
render(m)
```

Compiled `.probe/bare-variant.client.js` produces:

```js
const Phase = Object.freeze({ Idle: "Idle", Loading: "Loading", Done: "Done", variants: ["Idle", "Loading", "Done"] });
_scrml_reactive_set("phase", .Idle);                  // ← BROKEN JS (SyntaxError)
_scrml_init_set("phase", () => .Idle);                // ← BROKEN JS
```

Probe file `.probe/bv-let-only.scrml`:

```scrml
type Phase:enum = { Idle, Loading, Done }
<phase>: Phase = Phase.Idle
let x: Phase = .Loading
```

produces:

```js
let x = .Loading;                                      // ← BROKEN JS
```

(Position 2 reassignment `@phase = .Done` currently fires E-VARIANT-AMBIGUOUS in this
compiler — likely a separate B20 deferred case, not C22 territory.)

---

## §0.5 Runtime variant convention — the target form

Per `compiler/src/codegen/emit-client.ts:1276` (`emitEnumVariantObjects` §14.4):

- Unit variant `Idle` lowers to `Idle: "Idle"` (a STRING value on the frozen enum object).
- Payload variant `Circle` lowers to `Circle: function(...) { return { variant: "Circle", data: {...} } }`.

Therefore at runtime:

- `Phase.Idle === "Idle"` (the enum-namespace access yields the string).
- `phase === Phase.Idle` is `phase === "Idle"`.
- `match` arms emit `tagVar === "Variant"` string comparison (`emit-control-flow.ts:1136`).
- `is .Variant` operator emits `(left === "Variant")` (`emit-expr.ts:401-402`).

**Conclusion: the bare-variant `.Idle` should lower to the string literal `"Idle"`.**
This matches the existing runtime convention everywhere else.

C22 does NOT need to look up the enum name; the variant name carries enough information
because all variants in the runtime are referenced by their bare string tag.

(Payload-variant bare-form `.Circle(10)` would be a CallExpr whose callee is an
IdentExpr `.Circle` — that case requires emitting a constructor call, NOT a string. But
B20 only handles UNIT variants in unit position; `.Circle(10)` is not a B20 case and is
out of scope per BRIEF "DON'T extend to positions 3-4". §14.10 line 7176 normatively
describes the rule for the unit form only via the `marioState = .Big` example. Phase 0
does not extend to payload-variants — out of C22 scope.)

---

## §0.6 Match-arm patterns — already correct

`emit-control-flow.ts:617-625` parses match arms and strips the leading dot:
```ts
const newVariantMatch = trimmed.match(/^\.\s*([A-Z][A-Za-z0-9_]*)(?:...)?...$/);
return { kind: "variant", test: newVariantMatch[1], ... };  // test is "Variant", no dot
```
Then `armCondition` (line 1135-1137) emits `tagVar === "${arm.test}"`. Already correct.
No C22 work for position 5 (match arm patterns).

---

## §0.7 Engine `initial=.Variant` — already correct

B14 captures `engineMeta.initialVariant` as a bare string (variant name without the dot).
`emitInitialVariantValue` (`emit-engine.ts:385-386`) emits `JSON.stringify(initialVariant)`
→ `"Idle"`. Already correct. No C22 work for position 6.

---

## §0.8 The minimum codegen change

**One file, one function, ~5 lines.**

In `compiler/src/codegen/emit-expr.ts:emitIdent` (line 193), add a bare-variant branch
BEFORE the plain pass-through return at line 215:

```ts
// §14.10 bare-variant inference — `.Variant` (leading dot, uppercase second char)
// lowers to its string tag, matching the runtime convention used by enum objects
// (emitEnumVariantObjects), match-arm conditions, and the `is .Variant` operator.
// B20 already gated this at typer (E-VARIANT-AMBIGUOUS); by the time codegen sees
// `.Variant` in an IdentExpr, it has been validated to belong to a known enum.
if (name.length >= 2 && name.charCodeAt(0) === 46 /* . */ && /^[A-Z]/.test(name[1])) {
  return JSON.stringify(name.slice(1));   // `.Idle` → `"Idle"`
}
```

That is the entire C22 codegen patch.

---

## §0.9 Coverage matrix — final

| # | Position | Today's codegen | C22 work |
|---|---|---|---|
| 1 | `<x>: T = .V` (state-decl init) | broken (`.Idle`) | **emitIdent fix** — emits `"Idle"` |
| 1b | `let x: T = .V` (let/const init) | broken (`.Loading`) | **emitIdent fix** — same |
| 2 | `@cell = .V` (reassignment) | broken (would be `.Done`); B20 typer also gates | **emitIdent fix** — same. (B20 typer fires E-VARIANT-AMBIGUOUS today on a probe; that's a B20 fire-site question, not C22 codegen. If B20's fire is correct, codegen never runs; if B20's fire is incorrect — separate-DD territory — codegen will still emit correctly.) |
| 3 | `f(.V)` (call arg) | B20.b territory | **OUT OF SCOPE per BRIEF** |
| 4 | `return .V` | B20.b territory | **OUT OF SCOPE per BRIEF** |
| 5 | match arm `.V => ...` | already correct | none |
| 6 | engine `initial=.V` | already correct | none |

The single `emitIdent` fix covers positions 1, 1b, 2 simultaneously because they all
funnel through the same AST emit path. Positions 5/6 already work via separate codegen
paths. Positions 3/4 are excluded per BRIEF and B20.b territory.

---

## §0.10 Test-delta forecast

New unit test file: `compiler/tests/unit/c22-bare-variant-codegen.test.js`. ~10–15 tests:

- state-decl `<x>: T = .V` → emits `_scrml_reactive_set("x", "V")`
- let-decl `let x: T = .V` → emits `let x = "V";`
- const-decl `const x: T = .V` → emits `const x = "V";`
- regression: `Phase.Idle` (qualified form) still emits `Phase.Idle` (must NOT be
  rewritten — that's a MemberExpr, not an IdentExpr-with-leading-dot)
- regression: engine `initial=.Idle` codegen unchanged (string-emitted via B15 path)
- regression: match arm `.Idle => ...` codegen unchanged (string-emitted via match-arm path)
- regression: `is .Idle` operator unchanged (still emits `=== "Idle"`)
- corner case: `.x` (lowercase) IS NOT a variant — IdentExpr `name === ".x"` should
  pass through verbatim (matches the regex constraint `[A-Z]` on second char) — though
  this is an unreachable AST shape in practice (parser gates on uppercase).
- corner case: bare-variant inside binary expr — `if (@phase == .Idle) ...`. (Note:
  the `==` operator already routes `.Idle` through `is`-style rhs handling in
  emitBinary — but for the structural-eq fallback, `.Idle` would still need to be a
  valid string.) Verify.
- corner case: bare-variant inside ternary — `cond ? .Idle : .Done`.
- corner case: bare-variant inside array literal / object value (e.g. compound init).

Forecast: +10 to +15 tests; baseline 10535 → ~10545–10550. (Brief expected ~10,553/65/1/0;
worktree baseline is 10535/69/1/3 with 3 pre-existing infra fails out of scope.)

---

## §0.11 SPEC amendments — NONE forecast

C22 implements existing §14.10 / §18.0.3 prose. No spec changes. The runtime convention
(`Idle: "Idle"`) is already encoded by `emitEnumVariantObjects` per §14.4. The bare-variant
form is now consistent with this convention.

---

## §0.12 Risks & deferrals

| Risk | Severity | Mitigation |
|---|---|---|
| Regression on legitimate `.foo` member access where the property starts uppercase | LOW | An IdentExpr's `name` field is the WHOLE name. Member access `obj.Foo` parses as MemberExpr `{ object: Ident(obj), property: "Foo" }` — never an IdentExpr with name `.Foo`. So matching only IdentExpr is safe. |
| Bare-variant in payload position `f(.Variant)` (call arg, B20.b) | DEFERRED | C22 fix would still emit `"Variant"` if reached — but B20.b's typer gate is required first. If B20.b lands and adds the call-arg fire-site, the codegen will already be correct because the fix is structural, not typer-gated. |
| `is .Variant` rhs detection at `emit-expr.ts:401` would now see `"Variant"` instead of `.Variant` if the fix runs first | LOW | Need to verify the dispatch order. Inspecting `emitBinary`: it emits `right = emitExpr(node.right, ctx)` (line 367) — that's already the variant-stringified form by the time the `is` check runs. The check at line 401 looks at `node.right.kind === "ident" && node.right.name.startsWith(".")` — it inspects the AST node BEFORE the recursive emit. So the `is` rewrite at line 401 takes precedence (correct). The fall-through at line 411 (default binary) would emit `(left === "Variant")` if the `is` check is not active — also correct. |
| Empty IdentExpr name (`.`) — unreachable | LOW | The parser only emits `.Variant` with at least one trailing letter; the regex `[A-Z]` on second char gates correctly. |

---

## §0.13 Implementation plan — final

**File touched:** `compiler/src/codegen/emit-expr.ts` only.

**One change:** add bare-variant branch in `emitIdent`.

**Test file:** new `compiler/tests/unit/c22-bare-variant-codegen.test.js`.

**Phases:**
1. Phase 1 (commit): apply the `emitIdent` patch.
2. Phase 2 (commit): add unit tests.
3. Phase 3 (commit): progress.md + this survey, update SCOPE-AND-DECOMPOSITION row.

End of survey.
