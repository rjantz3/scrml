---
title: A1c C2 Pre-snapshot — derived-cell reactive computation emission
date: 2026-05-08
session: S72
worktree: agent-a630ed616115e0f3c
branch: worktree-agent-a630ed616115e0f3c
baseline-head: f5b620a (post-parallel-close, post-C1 SHIP)
phase: WIP-1 (pre-snapshot + corpus audit)
---

## Test baseline

`bun run test` → **9,753 pass / 64 skip / 1 todo / 3 fail / 33,965 expects** (Ran 9,821 tests across 474 files).

Three pre-existing fails (all self-host parity drift, inherited from C1 baseline; out of v0.2.0 scope per S66):

1. `F-BUILD-002 §3: generated entry parses without SyntaxError > write entry to a temp file and verify node --check accepts it`
2. `Bootstrap L3: self-hosted API compiles compiler > (unnamed)`
3. `Self-host: tokenizer parity > compiled tab.js exists`

C2 invariant: post-SHIP fail count MUST equal 3 (no new fails). Pass count UP by ~25-40 from new C2 tests.

## Pretest baseline

`bun run pretest` → 12 samples compiled, 0 errors.

## Sample-corpus audit (per SURVEY §7.1)

```
grep -rE "const <[a-z]" samples/*.scrml samples/compilation-tests/*.scrml 2>/dev/null
```

→ **zero hits**. No existing sample uses the `const <varname>` derived-cell syntax.

```
grep -rE "const <[a-z][a-zA-Z]*> = <" samples/*.scrml samples/compilation-tests/*.scrml 2>/dev/null
```

→ **zero hits**. No existing sample uses markup-typed derived (`const <name> = <element>...`).

```
grep -rE "const <[a-z][a-zA-Z]*> = [a-zA-Z]+\(" samples/*.scrml samples/compilation-tests/*.scrml 2>/dev/null
```

→ **zero hits**. No existing sample uses derived with function-call init.

**Output-stability diff envelope for existing corpus: ZERO bytes change.** New C2 unit tests carry all assertions; TodoMVC/kickstarter rebuild is a regression check (must produce byte-identical output).

## Worktree state

- WORKTREE_ROOT: `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a630ed616115e0f3c`
- AGENT_BRANCH: `worktree-agent-a630ed616115e0f3c`
- HEAD: `f5b620a` (post-parallel-close + C1 SHIP)
- ff-merged from `e62bb5a` (S70 wrap) at startup
- `bun install` → 114 packages clean

## Survey artifact preservation

SURVEY.md and progress.md copied verbatim from prior worktree (`agent-a78ec5d0aa429cf8c`) into this worktree's `docs/changes/phase-a1c-step-c2-derived-reactive-computation/` per PA preference (option a — exact preservation). progress.md will be appended-to as WIPs land.

## Tags

#a1c #c2 #pre-snapshot #wip-1 #baseline-9753-3 #zero-corpus-diff-envelope

## Links

- SURVEY: `docs/changes/phase-a1c-step-c2-derived-reactive-computation/SURVEY.md`
- progress: `docs/changes/phase-a1c-step-c2-derived-reactive-computation/progress.md`
- Predecessor (C1 SHIP): commit `0d5a144`
- Predecessor (parallel-close SHIP): commit `f5b620a`
