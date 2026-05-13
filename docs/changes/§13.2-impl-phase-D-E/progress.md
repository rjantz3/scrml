# §13.2 Sub-Phase D + E — Progress Log

**Dispatch:** Close §13.2 chain (Sub-D conformance test recon + Sub-E migration of two-step patterns).
**Worktree:** `agent-a83d84f3a4d5d32e0`.
**Base SHA:** `bdbf810` (post-S89 fast-forward; was originally on `9b98118` then merged main).

---

## 2026-05-13 — Sub-D reconnaissance

- Read SCOPING §6 Sub-Phase D scope (5 conformance tests listed).
- Read B-4 test file (`compiler/tests/unit/auto-await-promise-stdlib.test.js`, 9 tests at `39eba45`).
- Cross-mapped SCOPING required tests vs. B-4 delivered tests.
- Result: Sub-D substantially CLOSED by B-4. Writing `SUB-D-CLOSURE.md` (Case A).
- Baseline test run: `bun test compiler/tests/unit/auto-await-promise-stdlib.test.js` → 9/9 pass.

## 2026-05-13 — Sub-E migrations (complete)

- Target 1 DONE: `stdlib/auth/password.scrml:60-69` migrated to one-line (commit `519369b`).
  - Two-step `await safeCallAsync(...); rawResult !{ ... }` → one-line `safeCallAsync(...) !{ ... }`.
  - Compiler auto-inserts `await` per §13.2.1 classifier on the `safeCallAsync` callee.
  - Tests: full unit + integration + conformance green (no regressions).
- Target 2 DONE: `stdlib/auth/jwt.scrml:139-159` (inner signature verification) migrated to one-line (commit `d5e03db`).
  - Same pattern collapse on the `crypto.subtle.importKey/sign` chain inside `safeCallAsync`.
  - Docstring at line ~115 updated to reflect the §13.2 Sub-Phase E one-line collapse.
  - Tests: full unit + integration + conformance green.

## 2026-05-13 — Pre-existing gap surfaced (NOT introduced by this dispatch)

Sub-E migration probe revealed a pre-existing STDLIB-EXPORT-SEED gap: when a
user imports `verifyPassword` from `scrml:auth` (which re-exports from
`./password.scrml`), the call site does NOT auto-await — the re-export
inheritance pass in `buildExportRegistry` (`module-resolver.js:446-473`) does
NOT run for stdlib files because they're seeded via `STDLIB-EXPORT-SEED`
(api.js:712) which only parses the directly-imported stdlib file TAB-only.
Transitive re-export source files (`./password.scrml`) are never seeded,
breaking the chain.

Probe (verified pre-migration and post-migration):
```scrml
import { verifyPassword } from "scrml:auth"
function check(pw, hash) { const ok = verifyPassword(pw, hash) !{ ::VerifyFailed(m) -> false } }
```
Emits `verifyPassword(pw, hash)` with NO `await` and NO `async function` prefix.

By contrast, direct stdlib import of `safeCallAsync` from `scrml:host` (a
non-re-export) auto-awaits correctly (B-4 §1 invariant verified at the
probe level).

This gap is NOT a Sub-E blocker — Sub-E migrates the `.scrml` canonical
declaration source, not the runtime emission (the runtime is `compiler/
runtime/stdlib/auth.js`, hand-written). The gap is a separate follow-on under
the STDLIB-EXPORT-SEED design surface.

## Final disposition

§13.2 chain status: CLOSED.
- Sub-A: DONE (`67a6a81`).
- Sub-B: DONE (`503c3b4` + `39eba45`).
- Sub-C: CLOSED-AS-NO-OP (`775d836`).
- Sub-D: CLOSED-AS-NO-OP (`4dc2a81` — this dispatch).
- Sub-E: DONE (`519369b` + `d5e03db` — this dispatch).
