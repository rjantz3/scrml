# BRIEF — Ship scrml:data set-algebra helpers + fix unique struct-unsafety (S170 ratified)
# Dispatched S170 (2026-06-06) · scrml-js-codegen-engineer · isolation:worktree · agent a061adc58f45dfb9a
# Base HEAD at dispatch: 63106225

Change-id: `set-algebra-helpers-2026-06-06`
Authority: S170 `set` ratification (DEFER type, SHIP helpers) — deep-dive
`scrml-support/docs/deep-dives/set-warrant-and-shape-2026-06-06.md` (RATIFIED banner) + user-voice S170.

## Scope (NO set type, NO new syntax — stdlib + correctness fix + docs + tests)
1. Add value-correct set-algebra to scrml:data: union/intersection/difference + value-safe member
   (optional keyOrFn mirroring unique's signature; operate on arrays, return arrays, reassignment-canonical).
2. Fix unique's struct-unsafety: data.js:118 `[...new Set(array)]` (no-key path) dedups by JS REFERENCE
   → value-equal structs survive wrongly. Fix to value-canonical dedup. Keyed path preserved.
3. Value-canonical key = REUSE the §59 codec `_scrml_value_canonical`/`_scrml_fnv1a` (compiler/src/runtime-template.js;
   §47.1.4 alpha-sort + §45 structural ==). If not reachable from scrml:data runtime, replicate the SAME algorithm
   — must agree with == and map-key equality (no divergent key scheme). S168 guarantees acyclic → no cycle-guard.
4. stdlib source mirrors: stdlib/data/transform.scrml (unique@130) + export in index.scrml@17; lockstep with data.js (S115).
5. SPEC: extend §41 scrml:data catalog IF a normative home exists (survey; transforms may be PRIMER-only). REQUIRED:
   reconcile §59.12 set-line to record S170 (type deferred, B2 on shelf; algebra helpers shipped this arc).
6. PRIMER §10: catalog the 4 helpers + the blessed set-IDIOMS (Approach D: array+.includes multi-select / [K:bool]-map
   O(1) membership / unique dedup / new helpers for algebra).

## Process: F4/S88/S99-S126 path discipline (Bash-edit, no cd-into-main, pwd-in-first-commit), S112 merge-main,
bun install + pretest, S83 code+test one commit, NUL-byte check new test files (S169), S115 .scrml↔.js lockstep.
Tests: union/intersection/difference/member value-correct over primitives AND structs; unique([{id:1},{id:1}])→len 1;
keyed unique still works. bun run test 0-regression before DONE.

(Full dispatch prompt as sent is authoritative; archived per pa.md S136.)
