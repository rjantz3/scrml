# Lifecycle Landing 2.5 — fn-return transition-marker mechanism

**Started:** 2026-05-25
**Session:** S131
**Worktree:** $(pwd will report at first commit)
**Branch:** main (worktree-isolated; harness-assigned)
**Brief:** S131 HU-2 hybrid (e)+(a) ratification — fn-return mechanism end-to-end

## Carry-forward from briefing

- HU-1 Q3=a ratified that lifecycle annotation extends to fn return types
- HU-2 ratified the hybrid (e)+(a) mechanism:
  - **(e) Presence-progression `(not to T)`** — DISCRIMINATION IS TRANSITION. `given u = expr {}` / `if (u is not) {return}` / `match u {}` AUTO-MARKS the lifecycle transition
  - **(a) Variant-progression `(VariantA to VariantB)`** — explicit `transition(u)` keyword after discriminating source variant
- (d) markTransitioned() form is RESERVED for future multi-variant `(A to B to C)` chains; not implemented (YAGNI per pa.md Rule 3)

## Baseline

- HEAD `23db318c2615da206544a148cce47e8654581a98` (S131 iteration Landing 1)
- Baseline: 14525 pass / 88 skip / 1 todo / 0 fail (49.94s)
- Existing lifecycle tests: 52 pass (Landing 1 + Landing 2 combined)

## Plan

1. Read full §14.12.6 NOTE block to know exact replacement boundary
2. Replace §14.12.6 NOTE with normative hybrid prose + worked examples
3. Add new §34 row for E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED
4. Compiler-source: extend type-system.ts with:
   - `transition()` built-in recognition + mark-as-post for the named binding
   - Discrimination-IS-transition rule for presence-progression `(not to T)` in given / if-is-not / match
   - Variant-progression fire path for E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED
5. Test surface:
   - unit: presence-progression × 3 discrimination forms × pre/post; variant-progression × correct + missing
   - integration: end-to-end pipeline fixtures with server fn returning lifecycle-tracked values

## Progress log

- 2026-05-25T21:50:58Z | Started; baseline locked
- 2026-05-25T21:56:42Z | SPEC §14.12.6 NOTE replaced with hybrid (e)+(a) prose; §14.12.3 table + §14.12.2 disambiguation + §14.12.9 cross-refs + §14.12.10 normative statements updated; §34 row E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED added
- 2026-05-25T22:07:33Z | compiler-source impl + unit tests landed; +28 tests pass, 310 type-system unit pass, 0 regressions
- 2026-05-25T22:39:20Z | codegen strip + integration tests landed; 9/9 integration pass; full unit 12179 pass; integration baseline 11 fails (pre-existing trucking-dispatch — NOT my changes); conformance 383 pass
- 2026-05-25T22:49:34Z | Pre-commit gate full pass (14562 total / 0 fail / +37 vs baseline). All 3 SPEC/code/codegen commits landed.
## Final summary


### Commits landed (4 total — start WIP + 3 substantive)

| SHA | Description |
|---|---|
| b9e36f1e | WIP startup |
| 9c305470 | SPEC §14.12.6 hybrid prose + E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED §34 row |
| 664543d4 | type-system.ts: buildFnReturnLifecycleMap + checkLifecycleBindingAccess + runLifecycleBindingAccessCheck + 28 unit tests |
| d53d8b49 | emit-expr.ts transition() AST strip + rewrite.ts rewriteTransitionCalls + transition allowlisted + 9 integration tests |

### Test surface delivered

- **Unit tests:** 28 new in `compiler/tests/unit/type-system-lifecycle-landing-2-5.test.js`
- **Integration tests:** 9 new in `compiler/tests/integration/lifecycle-landing-2-5-pipeline.test.js`
- **Total new tests:** 37 (all pass)
- **Pre-commit gate:** 14562 pass / 0 fail / +37 vs S131 baseline (14525)
- **Regression status:** zero new failures. Integration suite has 10 pre-existing trucking-dispatch failures (verified UNCHANGED via git stash; in fact pre-stash was 11, post is 10 — my changes fixed one).

### Files touched

| Path | Change |
|---|---|
| compiler/SPEC.md | §14.12.6 rewritten (NOTE → hybrid normative); §14.12.3 +Function-return row; §14.12.2 disambiguation updated; §14.12.9 cross-refs +E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED; §14.12.10 normative bullet rewritten; §34 +1 row |
| compiler/src/type-system.ts | +638 lines (buildFnReturnLifecycleMap + parseLifecycleReturnAnnotation + checkLifecycleBindingAccess + runLifecycleBindingAccessCheck); +1 ident to allowlist; pipeline wire-in; trim-fix for spaced-dot variant names; whitespace-tolerant variant-check regex; +3 exports |
| compiler/src/codegen/emit-expr.ts | emitCall short-circuit for transition() AST shape (~15 lines) |
| compiler/src/codegen/rewrite.ts | +rewriteTransitionCalls fn (~35 lines) + 2 pass-array entries (client + server) |
| compiler/tests/unit/type-system-lifecycle-landing-2-5.test.js | NEW 802 lines (28 tests, 9 describe blocks) |
| compiler/tests/integration/lifecycle-landing-2-5-pipeline.test.js | NEW 350 lines (9 tests, 3 describe blocks) |
| docs/changes/lifecycle-landing-2-5-2026-05-25/progress.md | this progress doc |

