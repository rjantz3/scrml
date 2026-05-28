## R24-Bug-30 progress

### 2026-05-28 startup
- WORKTREE_PATH: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a884f3c3e60c5c2b4
- branch: worktree-agent-a884f3c3e60c5c2b4
- base post-merge: 022cce77
- bun install OK, pretest OK
- pre-merge pre-commit baseline (echo-pwd commit): 15012 tests pass / 0 fail

### Phase 0 — diagnose
- Built reproducer at /tmp/r24-bug-30/repro.scrml — `<!-- ... -->` block containing JSX/Svelte/TS demo strings.
- Pre-fix compile fires 6 W-LINT codes inside the comment block: W-LINT-001, W-LINT-003, W-LINT-005, W-LINT-007, W-LINT-014, W-LINT-022.
- R24 dev sources (pre-fix):
  - dev-2-go: 3 W-LINT fires
  - dev-3-svelte: 10 W-LINT fires — ALL 10 (lines 319, 391, 395x2, 431, 438, 460, 511, 512, 519) are inside the `<!-- FRICTION REPORT -->` block (lines 277-543).
  - dev-4-pascal: 4 W-LINT fires
- Fire-site grep confirms: all W-LINT-* codes are emitted by `compiler/src/lint-ghost-patterns.js` (api.js + commands/*.js only consume them; not other sources).

### Root cause
The lint pass owns its own pre-Stage-2 source scan. It builds `stringRanges` and `commentRanges` via `buildSkipRanges()`. The function recognizes:
- `//` line comments
- `/* ... */` block comments
- `"..."` / `'...'` string literals

But NOT `<!-- ... -->` HTML/markup comments. SPEC §4.7 (S87/S88 amendment) explicitly authorizes the BS layer to treat `<!-- ... -->` as opaque raw content; the pre-BS lint pass must do the same.

Every existing W-LINT- pattern that already calls `inRange(offset, commentRanges)` in its `skipIf` will automatically gain HTML-comment awareness once `<!-- -->` ranges flow through `commentRanges`. Two patterns that currently DON'T skip on commentRanges (W-LINT-003 className=, W-LINT-005 value={...}, W-LINT-013 @event=, etc.) also need attention if they should be silenced inside HTML comments — but the bug report listed W-LINT-001 / 005 / 007 / 011 / 014 / 022 plus W-LINT-003 fired in the repro.

Inspecting each pattern:
- W-LINT-001 (`<style>`): skipIf checks `commentRanges` ✓ — will be fixed automatically
- W-LINT-003 (className=): skipIf checks ONLY `logicRanges` — needs commentRanges added
- W-LINT-005 (value={...}): skipIf checks ONLY `logicRanges` — needs commentRanges added
- W-LINT-007 (`<Comp prop={val}>`): skipIf checks `commentRanges` ✓
- W-LINT-011 (Vue `:attr=`): skipIf checks `commentRanges` ✓
- W-LINT-014 (Svelte `{#if}`): skipIf checks ONLY `logicRanges` — needs commentRanges added
- W-LINT-022 (TS `interface`): skipIf checks `commentRanges` ✓

The minimal, surgical fix is two-layered:
1. Extend `buildSkipRanges` to also collect `<!-- ... -->` regions into `commentRanges`. This silences all patterns that already check `commentRanges`.
2. Add `commentRanges` to the skip-list of W-LINT-003, W-LINT-005, W-LINT-014 (and any other lint that currently only checks `logicRanges`) — these should not fire inside ANY comment form (JS `//`, JS `/* */`, HTML `<!-- -->`) per SPEC §27 + §4.7 doctrine that comments are opaque.

### Phase 1 — fix (DONE)
- `buildSkipRanges` now recognizes `<!-- ... -->` (insert at +21 lines, before the `//` clause). HTML 5 non-nesting; unterminated runs to EOF.
- 8 single-logicRanges patterns (W-LINT-003 / 004 / 005 / 006 / 008 / 012 / 014 / 015) extended to also skip on commentRanges.

### Phase 2 — tests (DONE)
- `compiler/tests/unit/lint-html-comment-region-r24-bug-30.test.js` — 19 tests, all green.

### Phase 3 — verify (DONE)
- Reproducer post-fix: 0 W-LINT inside the comment block (down from 6 pre-fix).
- R26 empirical on R24 dev sources:
  - dev-2-go:     3 -> 1 (2 in-comment silenced)
  - dev-3-svelte: 10 -> 0 (all 10 were in-comment)
  - dev-4-pascal: 4 -> 2 (2 in-comment silenced)
  - Remaining fires verified OUTSIDE comment regions.
- Full suite: 15,031 pass / 0 fail / 88 skip / 1 todo (was 15,012 / 0 fail; +19 = the 19 new tests).
- Coupled code+tests committed as ONE commit per S113 (commit SHA: 7e72ed04).
- Pre-commit hook ran cleanly; no --no-verify used.
