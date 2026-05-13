# A-2.2 Component 1 — initially_rendered_components + entry-point enumeration

Worktree: agent-af39ed678d4f67a04
Base SHA: bdbf810 (post-rebase onto main with all S89 commits including A-2.1 scaffold 6023923)

## Plan

A-2.2.b — Extract `partiallyEvaluateExpr(ast, env): ConstResult` primitive
  - **Finding:** META's `meta-eval.ts` uses `new Function()` evaluation of synthesized JS source — NOT a structural-fold primitive. There is no existing `partiallyEvaluateExpr` to extract; the dispatch task interprets OQ-A2-D (a) as authoring the primitive fresh in `compiler/src/codegen/constant-folder.ts`. META does not consume it at this wave (its `new Function()` body works for §22 ^{} blocks; sharing is a future-wave refactor when META gains a structural-fold path).
  - **Action:** Author the pure primitive operating on `ExprNode` (compiler/src/types/ast.ts). Signature: `partiallyEvaluateExpr(ast: ExprNode, env: ConstFoldEnv): ConstResult` per the dispatch contract.
  - **META integration:** N/A this wave. Pre-flight read confirms META's serializer is fundamentally a JS-text-evaluator, not a structural folder. Document the asymmetry; defer META refactor to a follow-on wave when both consumers need shared semantics.

A-2.2.a — Entry-point enumerator per §40.8 program shape
A-2.2.c — Per-gate classifier (if= / <match> / <details>; <auth> = WORST-CASE this wave)
A-2.2.d — Worst-case-union admission for runtime gates

## Step log

- 2026-05-13 — Authored `compiler/src/codegen/constant-folder.ts` (pure `partiallyEvaluateExpr` primitive operating on `ExprNode`).
- Test placement: bunfig.toml `[test] root = "compiler/tests/"` — so constant-folder.test.ts MUST live under that root, not next to the source (codebase convention, supersedes dispatch's "next-to-source" path). Placing at `compiler/tests/unit/constant-folder.test.ts`.

- 2026-05-13 — Commit `306edae` (A-2.2.b): constant-folder primitive + 40 tests.
- 2026-05-13 — Commit `e4fe0bb` (A-2.2.a): entry-point enumerator + 10 tests.
- 2026-05-13 — Commit `b5a08dc` (A-2.2.c): per-gate classifier + 19 tests.
- 2026-05-13 — Commit `c982ffb` (A-2.2.d): worst-case-union admission wiring (Component 1 active in solver, updated scaffold §4).
- 2026-05-13 — Commit `442bb8f` (A-2.2 test suite): Component 1 conformance — 13 tests.

## Final state

- Final SHA: 442bb8f
- Test delta: +82 unit tests (40 constant-folder + 10 entry-points + 19 gate-classifier + 13 conformance) — net well above the dispatch's ~15-20 target.
- Zero regressions: 9559 pass / 40 skip / 0 fail on unit suite; 1740/48/0 on integration+conformance.

## OQ-A2-E confirmation (per dispatch ask)

Confirmed: no entry-point synthesis on auth-redirect. The login-route entry is enumerated as its own `<page>` declaration per §40.9.9 "For viewer Anonymous". Documented at the module preamble of `compiler/src/reachability/entry-points.ts`.

## Deferred / not-this-wave

- META refactor to consume `partiallyEvaluateExpr` — META's existing serializer uses `new Function()` over a string-form body, NOT a structural fold. The two are equivalent for the pure-constant subset; converting META requires a structural-fold path in META that this wave does not author. Documented at the constant-folder.ts preamble.
- Component 4 (auth role classification) — `<auth>` is treated as worst-case-union at this wave per dispatch instructions; A-2.5 refines per role.
- Tier-1 / Tier-2 / Tier-N prefetch chunks remain empty — A-2.4 lands the interaction-graph projection that produces them.

