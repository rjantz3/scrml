# SCOPE — re-`fail` from a handler/match arm: typer scope-check + codegen lowering

**Filed:** S185 (2026-06-11). **Gap:** `g-errarm-fail-and-parsevariant-handler` (MED, re-tagged from LOW S185).
**Authorized:** user — "re-tag MED, write the SCOPE, and dispatch the fix."
**Source:** S184 parseVariant/L22 dog-food → S185 §6/§19 cross-check + verify-before-claim empirical probe.

## The cross-check verdict (DONE — re-`fail` from an arm IS canonical scrml)

Authoritative SPEC anchors (Rule 4, verified against SPEC.md at HEAD `a250348a`):

1. **§19.5.2 (SPEC.md:12669)** — the `?` propagation operator desugars EXACTLY to a match/handler arm
   that re-fails:
   ```scrml
   ::ErrorVariant(args) :> fail EnclosingErrorType::ErrorVariant(args)
   ```
   Re-`fail`-from-arm is the *semantic foundation* of `?`. If it weren't valid, `?` couldn't exist.
2. **§41.13** worked example re-fails inside the arm; enclosing `function loadResult()! -> LoadError`.
3. **§19.3.2 + §19.3.3 NS-4** — `fail` ≡ `return ErrorType::Variant` (NOT an exception); valid inside
   any control-flow construct (incl. `match`) within a `!` body; returns from the FUNCTION, not the
   construct. A `!{}` / match arm body executes in the enclosing function.

**The invariant the fix MUST preserve (§19.3.3 NS-1):** `fail` is valid ONLY inside a `!`-declared
function body. Re-`fail` from an arm whose ENCLOSING function is non-`!` MUST still fire **E-ERROR-001**
(the existing statement-position gate, `type-system.ts:8085-8102`). The PRIMER §6 route-to-state idiom
(`load() !{ … @phase = .Error(msg) … }`, non-`!` function, no re-fail) is a DIFFERENT idiom and stays
valid — do NOT regress it.

## The bug — TWO layers, shared root (empirical, HEAD `a250348a`)

`fail` in arm contexts is parsed/treated as a bare call/identifier, never as a `fail-expr` node. The
working statement-position path proves the machinery exists; arm position never reaches it.

| Re-fail shape | Result today | Layer | Reproducer |
|---|---|---|---|
| `!{}` block arm `{ fail … }` | **E-SCOPE-001** on `fail` | TYPER | `repro/repro-1-errarm-block-refail.scrml` |
| `:> fail …` plain `match` value-arm | **E-CODEGEN-INVALID-JS** | CODEGEN | `repro/repro-2-match-arm-refail.scrml` |
| `inner()?` (`?` desugaring rewrap) | **E-CODEGEN-INVALID-JS** | CODEGEN | `repro/repro-3-propagation-rewrap.scrml` |
| **control:** `if (x) fail …` (statement) | **WORKS** → `return {__scrml_error:…}` | — | `repro/control-stmt-fail-WORKS.scrml` |

**Layer 1 — TYPER (E-SCOPE-001).** `!{}` arm bodies run through `checkLogicExprIdents`
(`type-system.ts:6165`), the logic-expr ident walker, where `fail` reads as an undeclared identifier.
The body never reaches the `fail-expr` node handling + NS-1 gate (`type-system.ts:8085-8102`).
`fail`-SPECIFIC — an arm WITHOUT `fail` compiles clean (so the payload-binding scope is fine; it's the
`fail` keyword that's unrecognized).

**Layer 2 — CODEGEN (E-CODEGEN-INVALID-JS).** Arm-VALUE `fail` (`:> fail …`, incl. the `?` desugaring)
emits `fail` LITERALLY: `_scrml_tilde_N = fail "Wrapped"(reason)`. It never routes through the working
`fail-expr` emitter at `emit-logic.ts:2618` (`case "fail-expr"` → `return { __scrml_error: true, type,
variant, data };`, line 2651).

**Why MED not LOW:** Layer 2 breaks the **`?` propagation operator (§19.5)** — a documented flagship
error-model primitive — for the rewrap case. Adopter-visible breakage of a documented primitive. (It
hard-errors at E-CODEGEN-INVALID-JS, not silent-wrong-output, and the corpus uses route-to-state so the
`?`-rewrap path is sliver-empty today — hence MED, not HIGH.) **No passing test exercises re-`fail` from
an arm** (`nested-error-handler-no-invalid-js`, `error-handler-arm-body-emission`,
`multifield-failable-arm-binding` all use route-to-state / value-return arms) — the path is genuinely
uncovered.

## Working path to MIRROR (the agent confirms exact loci in Phase 0)

- **Parser:** `parseFailStmt()` (`ast-builder.js:4211`) → `{ kind: "fail-expr", enumType, variant, args,
  argsExpr, span }`. Reached only at statement contexts (`ast-builder.js:5579`, `:9397` — `tok.kind ===
  "KEYWORD" && tok.text === "fail"`). `fail` IS a tokenizer KEYWORD (`tokenizer.ts:64`). Arm-body /
  arm-value parse paths do NOT reach it — that is the shared root to close.
- **Typer:** `fail-expr` node handling + NS-1 gate at `type-system.ts:8085-8102`
  (`if (k === "fail-expr" && !canFail) … E-ERROR-001`). The arm-body scope walks that must route
  `fail-expr` through this gate (instead of `checkLogicExprIdents`): the `!{}` handler arm path + the
  `<match>` block-form `case "match-block"` (added at the Gap-2 landing `7fe7044f`, ~`type-system.ts`
  match-block case) + the JS-style `match-arm-block` path. `canFail` is the enclosing-function-`!` flag
  already threaded for statement position.
- **Codegen:** `fail-expr` emitter at `emit-logic.ts:2618`. Arm-position emission lives in
  `emit-match.ts` (block-form + JS-style match arms) and the `!{}` error-handler arm-body emitter
  (cf. tests `error-handler-arm-body-emission.test.js`, `nested-error-handler-no-invalid-js.test.js`).
  Arm bodies/values must route a `fail` through the `fail-expr` emitter, not emit it literally.

These loci are a STARTING HYPOTHESIS (line numbers post-date the Gaps-1+2 landing `7fe7044f`). The agent
runs a Phase-0 survey and is AUTHORIZED to correct the touchpoints (depth-of-survey discount; PRIMER §12).

## Fix shape (3 parts; agent confirms decomposition in Phase 0)

1. **Recognize `fail` as a `fail-expr` in arm contexts** (`!{}` handler arm bodies, `<match>` block-form
   arm bodies, JS-style `match` value-arms). Likely the parser must reach `parseFailStmt` in arm-body
   parsing, OR the arm-body re-parse path must recognize the `fail` keyword.
2. **Typer:** arm-body `fail-expr` nodes route through the NS-1 gate (`type-system.ts:8085-8102`) — legal
   when the enclosing function is `!` (`canFail` true), **E-ERROR-001 when non-`!`**. NOT through
   `checkLogicExprIdents` (which mis-reads `fail` as an undeclared ident).
3. **Codegen:** arm-position `fail` lowers via the `fail-expr` emitter (`emit-logic.ts:2618`) →
   `return { __scrml_error: … }` — for `!{}` arm bodies (statement form `{ fail … }`) AND match
   value-arms (`:> fail …`) AND the `?` desugaring. `node --check` clean.

## Out of scope (do NOT bundle)
- §41.13 doc fix — PA-direct AFTER the fix lands + the corrected four-variant example compiles
  (`docs/changes/payload-binding-gaps-2026-06-11/GAP3-DOC-FIX-PLAN.md`).
- (3) `:`-shorthand block-form match-arm interpolation literal-emit — separate pre-existing gap,
  carry-forward.
- Type-compatibility of the re-failed variant vs the enclosing error type (§19.5.3 E-TYPE-001) is
  EXISTING behavior — don't re-build it; just don't regress it.

## Verification (S138 R26 doctrine — codegen fix relying on AST)
- Pre-commit subset green (unit+integration+conformance), 0 new fails.
- All four reproducers in `repro/`: repro-1/2/3 → 0 E-SCOPE-001 / 0 E-CODEGEN-INVALID-JS + `node --check`
  clean on emitted JS; control (`control-stmt-fail-WORKS.scrml`) still works (no regression).
- Negative: re-`fail` from a `!{}` arm in a NON-`!` enclosing function STILL fires E-ERROR-001 (NS-1
  preserved). Route-to-state arm idiom (`@phase = .Error(msg)`) still compiles (no regression).
- New unit + integration tests covering all three positive shapes + the NS-1 negative.
