# Progress: Dispatch 3 — Channels + Schema + Predicates + `not` keyword

Branch: `changes/dispatch-3-channels-schema-predicates`
Started: 2026-05-04
Worktree: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a2e45d64773315e62`

## Plan

The brief decomposes into 5 SPEC.md edit clusters + index regen:

1. **§38 Channels — MAJOR REWRITE (M19)**: file-level placement, drop `@shared`, V5-strict body, auto-injected functions preserved, attribute table refresh, cross-`<program>` reads, migration note.
2. **§39 Schema — PARTIAL ADDITIVE (L4)**: new subsections for additive shared-core vocabulary (`req`, `length`, `pattern`, `min`/`max`, etc.), lowering rules to SQL DDL, when-to-use rule of thumb. SQL-mirror remains canonical.
3. **§53 Predicates — PARTIAL CROSS-REF (L4)**: brief subsections cross-referencing §55 for shared-core vocabulary firing semantics in refinement-type position; composition with state validators.
4. **§42 `not` — SMALL EDIT (L5)**: new subsection clarifying `is some` vs `req` are distinct predicates, three native loci of "exists/required" semantic.
5. **§34 Error codes — partial**: add `E-CHANNEL-INSIDE-PROGRAM`, `E-CHANNEL-SHARED-MODIFIER`.
6. **SPEC-INDEX.md regen + Quick Lookup entries**.

Post-D2 line ranges (verified via grep):
- §38: 14596-15173 (~578 lines)
- §39: 15175-15449 (~275 lines)
- §42: 15882-16133 (~252 lines)
- §53: 21667-22605 (~939 lines)
- §34 error code table: 13290-13533 (~244 lines)

## Steps

- Started — branch `changes/dispatch-3-channels-schema-predicates` created from main HEAD `9cb123c`.
- §38.1-§38.4 rewritten: file-level placement, V5-strict body, drop @shared. Commit `fecb5f0`.
- §38 sweep + §34 +2 codes (E-CHANNEL-INSIDE-PROGRAM, E-CHANNEL-SHARED-MODIFIER) — examples updated for V5-strict, migration note added, E-CHANNEL-002 retired in §38.9 + §34. Commit `fdfc75e`.
- §39.5.7-§39.5.9 — additive shared-core validator vocabulary, SQL DDL lowering rules, when-to-use guidance. SQL-mirror remains canonical. Commit `820ad02`.
- §53.6.1-§53.6.2 — shared-core in refinement-type position (cross-ref §55), composition with state-cell validators. Commit `0c7416b`.
- §42.2.5 — `is some` vs `req` distinct predicates (L5 clarification), three loci of exists/required semantic. Commit `dcefcf8`.
- SPEC-INDEX.md regen + Quick Lookup additions; cross-ref sweep (channel inside program wording fixed). Commit `363a514`.

## Open questions for PA

- §7.10 brief flagged `onserver:message=handler(msg)` composition with V5-strict. After the rewrite: handler `msg` parameter is a function-local LOCAL (bare access in handler body — `msg.foo` etc.), which is exactly the V5-strict locals semantic for parameters (§3, §7). No contradiction. Recorded for completeness; nothing surfaces as a concrete blocker.
- Schema lowering portability — the §39.5.8 lowering table notes DBMS-specific behavior for `pattern` and references §44 (multi-database adaptation) for driver resolution. If §44 needs a complementary cross-ref subsection added to point at §39.5.8, that's a follow-on (not blocking D3 success criteria).

## STATUS: COMPLETE

