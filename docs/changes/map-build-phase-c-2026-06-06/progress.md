# map-build phase-c — SPEC §42.3.1 union-`not` normalization

## 2026-06-06 — startup + scope lock
- DONE: startup verification clean — worktree /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a9c3075095363301a, branch worktree-agent-a9c3075095363301a, tree clean, bun install + pretest OK.
- DONE: read SPEC §42.3.1 IN FULL (line 21130-21142). Normative: flatten nested unions + dedup `not` to exactly one; `(T|not)|not` -> `T|not` idempotent.
- DONE: traced `tUnion` (type-system.ts:593) — 4 call sites, all internal; only resolveTypeExpr:1841 passes variable-length members. Today `tUnion` always wraps (1-member -> 1-member union node). Preserve that.
- DONE: confirmed canary recognizers: emit-schema-for.ts `nullableUnionBase` (:355, exported) + emit-table-for.ts `nullableUnionBaseForCell` (:670) via exported `classifyFieldForCell` (:577). BOTH require `members.length === 2` with EXACTLY one `not`. A nested/3-member un-normalized union would NOT fire -> column silently non-nullable. Normalization MUST collapse to exactly [T, not].
- NEXT: implement normalizeUnion + wire into tUnion; commit.

## 2026-06-06 — implementation + verification COMPLETE
- DONE: normalizeUnion() added (type-system.ts:593), wired into tUnion. Commit 593e9a1d. Flatten nested unions (one-level splice is complete since every constructed union is already normalized) + dedup `not` to one. Non-`not` members untouched (no reorder/dedup). Pre-commit gate green.
- DONE: canary test compiler/tests/unit/union-not-normalization.test.js — 17 tests, all pass. Commit 18372b76. Covers: dedup-not programmatic, flatten nested (idempotent re-optionalize), SCOPE guard (order preserved, non-not NOT deduped), text-path resolveTypeExpr `string | not | not`, BLAST-RADIUS schemaFor.nullableUnionBase + tableFor.classifyFieldForCell on canonical + re-optionalized [string, not].
- DONE: .members-consumer grep — ONLY emit-schema-for.ts:358 + emit-table-for.ts:673 assume arity (`length !== 2`); BOTH protected (normalization collapses to exactly [T, not]). ZERO `members[0]`/`members[1]` index consumers. 24 total `.members` reads, all others iterate (some/find/filter/map/for-of) — shape-agnostic + order-independent. type-encoding.ts (212/583) maps recursively; canonical unions encode identically (idempotency only changes the previously-uncleanly-constructible re-optionalized case, in the correct direction).
- DONE: empirical smoke — phase1-type-union-via-pipe-010.scrml (`type StringOrNot = string | not`) + phase2-given-single-087.scrml (`let : T | not` cell) both compile NO new errors (only pre-existing W-PROGRAM-*/W-GIVEN-ARROW-LEGACY/ghost-pattern lints, all union-unrelated); emitted client.js + runtime node --check clean.
- DONE: full suite `bun run test` = 23108 pass / 0 fail / 220 skip / 1 todo / 917 files (+17 = my new tests, +1 file). ZERO regressions vs 23091 baseline.
- DONE: within-node parity 1005/0 unchanged (NESTED-SHAPE:0, COUNT-LENGTH:984 histogram unchanged — typer change can't shift parser corpus).
- STATUS: COMPLETE. No blockers, no deferred items.
