# Progress: s154-spec-landing-event-payload-enum-subset

Scope: land TWO reviewer-passed spec-amendment drafts into compiler/SPEC.md + SPEC-INDEX.md.
SPEC-TEXT ONLY — no compiler source, no tests.

## Startup verification
- pwd = /home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a5f4dd13d143e1c0b (WORKTREE_ROOT — correct prefix)
- git rev-parse --show-toplevel == WORKTREE_ROOT (confirmed)
- git status --short clean at start
- bun install: 204 packages, clean
- bun run pretest: 13 test samples compiled, clean
- Collision-check: 5 new codes (E-ENGINE-ACCEPTS-NOT-ENUM, E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE,
  E-ENGINE-MSG-UNKNOWN, E-ENGINE-MSG-WITHOUT-ACCEPTS, E-MATCH-SUBSET-DEAD-ARM) = ZERO pre-existing.
- Reused codes confirmed present: E-VARIANT-AMBIGUOUS, E-ENGINE-INVALID-TRANSITION,
  E-CONTRACT-001/-RT, W-MATCH-001.

## Section anchors (re-derived against SPEC.md @ 30879 lines)
Amendment 1 (event-payload-transition):
- §51.0.S new: insert after §51.0.R cross-refs (before the '---' + §51.1 at L25526/25528)
- §51.0.G amendment: .advance resolution rule (L24556-24582)
- §51.0.B opener-attr table: accepts= row (L23997-24004)
- §51.0.R cross-ref note (L25429-25524)
- §14.10 cross-ref note (L7889-7923)
Amendment 2 (enum-subset-refinement):
- §53.15 new: insert after §53.14.6 (before '## 54.' at L29210)
- §18.8.1 amendment (L11363-11384)
- §18.0.1 amendment (block-form exhaustiveness, L10892-10893)
- §18.6 note (L11215-11253)
- §41.15.6 amendment (L20439-20457)
- §53.9.2 caller/callee table (L28701-28708)
- §55 confirmation note (L29511+)
§34 catalog: reference index table starts L16156; engine codes ~L16421; match codes ~L16414.

## Log
[06:00] Started — startup verified, anchors derived

## Amendment 1 (event-payload-transition) — DONE
- [06:04] §51.0.B opener-attr table: accepts= row + grammar block
- [06:04] §51.0.G.1 NEW: .advance argument-resolution rule (state plane vs message plane)
- [06:04] §51.0.R: handled-message idle-watchdog reset note (§7.1 ratified)
- [06:04] §51.0.S NEW: 16 subsections (S.0 two-cases .. S.8 cross-refs)
- [06:04] §14.10: cross-ref note to §51.0.G.1 (NON-reuse clarified)
- [06:04] §34 index: +4 E-ENGINE codes (ACCEPTS-NOT-ENUM, MSG-ARM-NOT-EXHAUSTIVE, MSG-UNKNOWN, MSG-WITHOUT-ACCEPTS)
- Committing Amendment 1.

## Amendment 2 (enum-subset-refinement) — DONE
- [06:11] §53.15 NEW: 8 subsections (syntax+decidability, three-zone, flow, match-narrows, evolution+codes, teachable rule, deferred, cross-refs)
- [06:11] §18.8.1: enum-subset narrowing (Option A) + SF-1 dead-arm(E-MATCH-SUBSET-DEAD-ARM)/vacuous-else(W-MATCH-001) + edge cases + no-intra-arm-narrowing
- [06:11] §18.0.1: block-form <match for=> narrows identically
- [06:11] §18.6: W-MATCH-001 over subset-refined type note
- [06:11] §41.15.6: schemaFor SUBSET CHECK override (+nullable composition)
- [06:11] §53.9.2: +4 enum-subset widen/narrow caller/callee rows
- [06:11] §55.1: enum-subset confirmation note (.OneOfFailed(set)=subset, no normative change)
- [06:11] §34 index: +E-MATCH-SUBSET-DEAD-ARM (added in Amendment-1 batch)

## SPEC-INDEX regen
- [06:11] bun scripts/regen-spec-index.ts: Updated 58 rows; missing 0 (FIRST run; line ranges refreshed)
- Invocation note: NOT a package.json script — must run as a FILE (bun <path> / bun --cwd <root> <path>),
  NOT 'bun run scripts/...' (that does a script-name lookup and prints the script list).
- Appended S154 provenance notes to summary cells §14/§18/§34/§41/§51/§53/§55 + updated 'Last updated' line.
- [06:11] re-ran regen: Updated 0 rows; missing 0 (idempotent — summaries preserved, ranges current).

## Baseline / anomaly
- Pre-snapshot baseline (pre-commit hook on first WIP commit): 15506 pass / 93 skip / 1 todo / 0 fail (15600 tests, 818 files).
- After Amendment 1 commit (pre-commit hook): 0 fail (re-ran full suite).
- No source/test edits — SPEC-text only; no behavioral regression surface.
- Committing Amendment 2 + regenerated SPEC-INDEX.
