---
title: A1c C2 Anomaly Report — derived-cell reactive computation emission
date: 2026-05-08
session: S73
worktree: agent-a630ed616115e0f3c
phase: WIP-7 (post-implementation anomaly comparison)
status: CLEAR FOR MERGE
---

## Test behavior changes

### Expected
- **+31 new tests in c2-derived-reactive-computation.test.js (§C2.1 - §C2.13)** — direct C2 deliverable per SURVEY §10. Pass-only delta.
- **C1 §C1.4 test 2 updated** — assertion changed from `/* C2: ... */ return null;` placeholder to `document.createElement("span")` + `return _scrml_lift_el_N;`. Test still passes; semantic change is the intended C2 lift.
- **+1 expect call** in C1 §C1.4 test 2 (added `_scrml_derived_declare("badge"` invariant assertion alongside the new factory-body shape assertions).

### Unexpected (Anomalies)
None. Pass count delta (9753 → 9784 = +31) exactly matches the new C2 test count.

## E2E output changes

### Expected
- **Zero byte changes** in any compiled artifact under `samples/compilation-tests/dist/`. Verified via md5sum diff: pre-C2 (codegen reverted to f5b620a) vs post-C2 = identical for all 25 files (12 .client.js + 12 .html + 1 scrml-runtime.js).
- **Zero broader-corpus impact.** Confirmed via `grep -lE "const <[a-z]"` over `samples/`, `samples/gauntlet-r15/`, `samples/gauntlet-s19-phase4/`, and `kickstarter/` — zero hits. No existing sample uses derived-cell syntax that would trigger either C2 dispatch arm.

### Unexpected (Anomalies)
None. The C2 dispatch arms (`_cellKind === "markup-typed" + isConst === true` and `shape === "derived" + isConst === true`) are dormant against the existing corpus.

## New warnings or errors

None. `bun run pretest` shows the same warnings as baseline (expected per-sample warnings unchanged).

## Pre-existing failures preserved

Same 3 self-host parity fails inherited from C1 baseline (out of v0.2.0 scope per S66):
1. `F-BUILD-002 §3: generated entry parses without SyntaxError`
2. `Bootstrap L3: self-hosted API compiles compiler`
3. `Self-host: tokenizer parity > compiled tab.js exists`

Verified via `bun run test 2>&1 | grep "^(fail)"` post-C2 — same 3 names; no new fails introduced.

## Anomaly count: 0

## Status: CLEAR FOR MERGE

C2 closes the SPEC §6.6.3 line 2470-2482 normative gap (transitive deps through fn calls) and lifts C1's `return null` markup-typed-derived factory shell to a real DOM-builder. Test invariant satisfied: pass count UP by exactly the number of new tests, fail count unchanged at 3, skip/todo unchanged.

## Tags

#a1c #c2 #anomaly-report #wip-7 #clear-for-merge #zero-regressions #zero-corpus-diff

## Links

- SURVEY: `docs/changes/phase-a1c-step-c2-derived-reactive-computation/SURVEY.md`
- progress: `docs/changes/phase-a1c-step-c2-derived-reactive-computation/progress.md`
- pre-snapshot: `docs/changes/phase-a1c-step-c2-derived-reactive-computation/pre-snapshot.md`
- C1 predecessor: commit `0d5a144`
- Baseline (parallel-close SHIP): commit `f5b620a`
