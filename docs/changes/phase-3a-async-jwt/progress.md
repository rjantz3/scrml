# Phase 3a Async JWT Migration — Progress

## 2026-05-13 — start

- Startup verified: worktree-clean, pretest passed.
- Read primary.map.md + relevant maps; safeCallAsync precedent already documented in stdlib/host/index.scrml docstring.
- Inspected precedent commit `5cb177b` (verifyPassword migration) — two-step pattern:
  1. `import { safeCallAsync, HostError } from 'scrml:host'`
  2. `const rawResult = await safeCallAsync(() => asyncCall())`
  3. `const value = rawResult !{ | ::Thrown(msg, name) -> { fail SomeError::Variant(msg) } }`
- Located verifyJwt at `stdlib/auth/jwt.scrml:117-168` with `try/catch` around `crypto.subtle.importKey/sign`.
- JwtError exists (line 23) — currently only has DecodeFailed variant. Need to add a variant for signature-verification failure.
- decodeJwt already uses safeCall + JwtError::DecodeFailed pattern (lines 185-204).
- safeCall is already imported (line 15) — need to add safeCallAsync to the import.

## 2026-05-13 — migration commit `8635518`

- Added safeCallAsync to existing import line.
- Replaced try/catch around crypto.subtle.importKey/sign with two-step
  safeCallAsync pattern. Result-shape API preserved — !{} handler returns
  {valid:false, reason:"invalid"} matching the old catch arm.
- jwt.scrml error count: 15 → 12. Closed: E-ERROR-007 (try) + 2 TextEncoder
  E-SCOPE-001 instances (those were inside the try block). Remaining 12 are
  pre-existing stdlib issues (null/undefined tokens, browser globals) — same
  baseline as verifyPassword precedent.
- Pre-commit gate fired clean: 11,170 pass / 0 fail.

## 2026-05-13 — test commit `8a05eb6`

- Updated extracted verifyJwt helper in stdlib-auth.test.js to mirror the
  post-migration shape (bare safeCallAsync + sentinel-check).
- Added A20: stub crypto.subtle.importKey to Promise.reject → verifies
  safeCallAsync catches async rejection.
- Added A21: stub crypto.subtle.importKey to throw synchronously → verifies
  shim's try/catch wraps thunk invocation, not just await.
- Counts: stdlib-auth.test.js 19 → 21. Pre-commit subset: 11,170 → 11,172.

## DONE

Phase 3a closure: 2 of 4 async sites migrated (verifyPassword S88, verifyJwt
S89). 2 remaining (http _request + http retry) require Phase 3c throw-refactor
first per pa.md hand-off.
