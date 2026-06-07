# Progress — set-algebra-helpers-2026-06-06

S170 ratified disposition: "defer the type, ship the helpers."
Scope: 3 set-algebra helpers (union/intersection/difference) + value-safe `member`
in scrml:data, value-correct via a replicated §59.5 canonical-string codec;
fix `unique`'s struct-unsafety; .scrml mirrors; SPEC §59.12 reconcile; PRIMER §10
catalog + idioms; regression tests.

NO `set` type, NO new syntax.

## Decisions
- Value-canonical path: REPLICATE (not reuse). `_scrml_value_canonical` lives as a
  runtime-template global; data.js is bundled BOTH as a standalone server module
  (where the global is absent) AND inside an IIFE in the client runtime. A
  correctness invariant cannot ride a maybe-present global, so the §59.5
  canonical-string algorithm is transcribed locally into data.js as `_data_value_canonical`
  (byte-identical to runtime-template's, so it agrees with `==` and the §59 map key).
- §41 has NO normative catalog home for the pure runtime transforms (pick/omit/
  groupBy/sortBy/unique are PRIMER-only; only the compile-time-magic helpers
  parseVariant/formFor/schemaFor/tableFor/registerMessages have normative §41
  subsections). So the new helpers go in PRIMER §10 only; §41 NOT forced.
- Arg order matches `unique(array, keyOrFn)` family: union/intersection/difference
  take `(a, b, keyOrFn?)`; member takes `(arr, x, keyOrFn?)`.

## Log
- 2026-06-07T03:30:46Z startup verified (worktree agent-a061adc58f45dfb9a); merged main (already up to date @63106225); bun install + pretest OK. Read deep-dive, data.js, codec, .scrml mirrors, SPEC §41/§59. Decisions recorded above.
- 2026-06-07T03:45:44Z data.js: replicated §59.5 codec (_data_value_canonical, byte-identical to runtime-template's _scrml_value_canonical — cross-checked via node), fixed unique no-key path (was [...new Set] → now value-canonical dedup; keyed path hardened too), added union/intersection/difference/member with optional keyOrFn. node --check OK. Functional demo over structs OK. Committed 07458a53 (pre-commit gate green).
- 2026-06-07T03:45:44Z .scrml mirrors: transform.scrml codec+unique fix+4 helpers+self-test extended (assertFalsy added to test import); index.scrml export list +4. Lockstep verified (both carry identical surface). Bundled in the same 07458a53 commit. New regression test data-set-algebra.test.js (16 tests, 0 NUL bytes verified via python+file(1)) — all pass.
- 2026-06-07T03:45:44Z SPEC §59.12 set bullet reconciled (type deferred / helpers shipped / B2 on shelf). §41 had NO normative catalog home for plain transforms (only compile-time-magic helpers have §41 subsections) → not forced; helpers are PRIMER-only. Committed fb41ae3e.
- 2026-06-07T03:45:44Z PRIMER §10: scrml:data catalog line + new 'Set idioms' block (Approach D). Committed 6f932782. Pre-commit gate: 16246 pass / 0 fail / 1 todo / 860 files (+16 vs 16140/859 baseline). Running full bun run test for browser-inclusive baseline next.
