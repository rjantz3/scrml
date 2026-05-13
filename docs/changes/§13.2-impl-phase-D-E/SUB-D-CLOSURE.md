# §13.2 Sub-Phase D — CLOSURE

**Status:** CLOSED-AS-NO-OP (Case A). SCOPING §6 Sub-Phase D scope was already
substantially delivered by Sub-Phase B Step 4 (commit `39eba45`,
`feat(s89-§13.2-B): auto-await for stdlib Promise<T> — classifier + lint + tests`).

This closure doc maps each SCOPING Sub-Phase D required test to its
as-landed disposition in B-4's `auto-await-promise-stdlib.test.js` (9 tests),
identifies two non-residual gaps that fall outside Sub-D scope, and records
the test-suite delta.

---

## §1 SCOPING Sub-Phase D → B-4 mapping

SCOPING §6 Sub-Phase D lists 5 conformance tests (SCOPING.md lines 339-343):

| # | SCOPING required test | Disposition | Landed at |
|---|---|---|---|
| 1 | `auto-await-stdlib-promise.test.js` — `safeCallAsync` + `!{}` pattern compiles to single `await` | **DONE** | B-4 §1 (`safeCallAsync(thunk) !{ ... }` collapses to one-line auto-await; asserts emitted JS matches `= await safeCallAsync\b`). |
| 2 | `auto-await-async-fndecl.test.js` — `export async function f() { ... }; const r = f()` auto-awaits at call site | **DONE (via stdlib import path)** | B-4 §1 + §2 + §6 + §8 exercise the `export async function` declared in a stdlib module (`safeCallAsync` from `scrml:host`, `hashPassword` from `scrml:auth`) called from user source. Auto-await fires when the callee is statically resolved to a `scrml:*` module with `isAsync: true` in `exportRegistry`. The "user-source `export async function` followed by direct call site" form is **deliberately excluded** by Q5 (stdlib carve-out — user source forbidden from declaring `async`; B-4 §4 asserts the negative). |
| 3 | `auto-await-cross-program.test.js` — if Position A or C, `<#worker>.foo()` auto-awaits | **DEFERRED (out of scope)** | Q2 ratified Position C (E-PROG-004 amended to lint), but the cross-program codepath itself (§43.5.1) is **not yet implemented** in `compiler/src/` (SCOPING §5.1 verbatim: "Compiler: not implemented — zero hits for `PROG-004` or `cross-program` in `compiler/src/`"). Test cannot be authored against absent behavior. Tracked as a separate follow-on under the E-PROG-004 implementation surface. |
| 4 | `auto-await-explicit-await-idempotent.test.js` — `await safeCallAsync(...)` compiles same as auto-await form (no `await await`) | **DONE** | B-4 §7 (regression guard: emitted JS never matches `\bawait\s+await\b`). Per Sub-Phase C CLOSURE §1 item 4, scrml source itself forbids explicit `await` (§13.1); the idempotency guard is the regression invariant for the emitted-JS surface. |
| 5 | `e-prog-004-still-fires.test.js` (Position B) OR `e-prog-004-warning-only.test.js` (Position C) | **DEFERRED (paired with #3)** | Position C was ratified, but the E-PROG-004 firing code itself doesn't exist yet (SCOPING §5.1). When cross-program lands, this lint-only fire-site will be authored as part of that surface. |

All in-scope items closed. Items #3 + #5 are non-residual gaps (out of scope
for §13.2 — they depend on §43.5.1 cross-program implementation that has not
landed).

---

## §2 Bonus coverage in B-4 (beyond SCOPING)

B-4 also delivered 5 tests not explicitly named in SCOPING §6 Sub-Phase D,
all valuable for the regression surface:

| # | B-4 test | Coverage |
|---|---|---|
| §2 | stdlib Promise<T> exports — canonical probe | Compile-clean check that `safeCallAsync` + `safeCall` co-import from `scrml:host` produces zero blocking errors. Smoke for STDLIB-EXPORT-SEED end-to-end. |
| §3 | Negative: `safeCall` (sync) does NOT auto-await | Asserts no `async function` prefix and no `await safeCall` for the sync stdlib surface. Pin against false-positive classification. |
| §4 | Negative: user `async function` call site does NOT auto-await | Q5 carve-out invariant — user-source async fns don't match `isPromiseReturningStdlibFn`. |
| §5 | Positive: `I-ASYNC-USER-SOURCE` fires on user `async function` | Catalog row sanity + stdlib carve-out invariant (stdlib files don't fire the lint). |
| §8 | STDLIB-EXPORT-SEED isolation | Regression guard for the api.js Stage 3.105 design choice — stdlib `.scrml` files are TAB-only parsed, never reach SYM/TS, no `E-SCOPE-001` leak from host-global references. |

These are conformance-quality tests; their presence in the unit-test
directory (vs `conformance/`) is a placement choice that does not affect
their correctness coverage. No re-housing recommended.

---

## §3 Test directory placement note

SCOPING §6 Sub-Phase D names tests under `compiler/tests/conformance/`. B-4
landed all 9 tests under `compiler/tests/unit/`. Discussed in Sub-Phase C
CLOSURE; the placement choice is consistent with neighboring auto-await
classifier tests and does not weaken coverage. **No relocation required.**

---

## §4 Test counts

Baseline at `bdbf810` (HEAD, post-S89 fast-forward):
`bun test compiler/tests/unit/auto-await-promise-stdlib.test.js` →
**9 pass / 0 fail / 20 expect() calls** (303ms).

Pre-S89 (pre-B-4): 0 auto-await stdlib conformance tests.
Delta from S89 §13.2 chain: **+9 tests** authored at `39eba45`.

---

## §5 Sub-Phase D disposition

**Case A — CLOSED-AS-NO-OP.** No new tests authored in this dispatch. Sub-D
scope substantially closed by Sub-Phase B Step 4. The two non-residual gaps
(#3 + #5) are blocked on §43.5.1 cross-program implementation and tracked as
a separate follow-on.

§13.2 chain progress after this dispatch:
- Sub-Phase A — DONE (`67a6a81`, SPEC amendments).
- Sub-Phase B — DONE (`503c3b4` + `39eba45`, AST + TS + classifier + lint + tests).
- Sub-Phase C — CLOSED-AS-NO-OP (`775d836`, CLOSURE.md).
- **Sub-Phase D — CLOSED-AS-NO-OP (this dispatch, SUB-D-CLOSURE.md).**
- Sub-Phase E — IN PROGRESS (this dispatch).

---

## §6 References

- SCOPING: `docs/changes/§13.2-auto-await-stdlib-scoping/SCOPING.md`.
- Sub-Phase A: commit `67a6a81`.
- Sub-Phase B Step 1: commit `503c3b4`.
- Sub-Phase B Steps 1c + 2 + 3 + 4: commit `39eba45`.
- Sub-Phase C closure: commit `775d836`.
- B-4 test file: `compiler/tests/unit/auto-await-promise-stdlib.test.js`.

## §7 Maps consulted

- `.claude/maps/primary.map.md` — task-shape routing.
- `.claude/maps/structure.map.md` — codegen / stdlib paths.
- `.claude/maps/test.map.md` — conformance vs unit directory conventions.

**Load-bearing finding.** B-4 (commit `39eba45`) delivered the entire
SCOPING §6 Sub-Phase D scope minus two items (cross-program tests #3 + #5),
which depend on `§43.5.1` cross-program implementation that has not landed.
Items #3 + #5 are therefore NOT residual Sub-D gaps — they are tracked as
follow-on work for the cross-program impl surface.
