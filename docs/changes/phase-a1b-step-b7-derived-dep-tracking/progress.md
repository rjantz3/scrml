# A1b B7 — Derived-cell dep tracking — progress

## 2026-05-07 11:25 — Dispatch start
- Worktree verified `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ae4ce3919624429f9`.
- Branch `phase-a1b-step-b7-derived-dep-tracking` created from `e557e30` (descendant of `bd3a0aa`).
- `bun install` and `bun run pretest` succeeded.
- Audit `docs/audits/a1b-b7-rule4-audit-2026-05-07.md` read in full.
- Compiler source survey beginning.

## 2026-05-07 11:26 — Phase 0 SURVEY start
Looking at:
- `compiler/src/dependency-graph.ts` (1714 lines — substantial existing infra)
- `compiler/src/symbol-table.ts` (B3 forEachIdentInExprNode)
- `compiler/src/type-system.ts` (fn purity)

## 2026-05-07 11:55 — Phase 0 SURVEY complete — PROCEED (no STOP triggers)
- See `SURVEY.md` for findings.
- Key gaps for B7: (1) pure-`fn` filter on transitive reads; (2) DFS cycle scan on derived `reads` subgraph; (3) wire `E-DERIVED-CIRCULAR-DEP`.
- Existing T15 tests cover direct/transitive deps already; B7 adds the cycle-detection branch + pure-fn filter.
- Estimate: 4-5h remaining (low end of audit's 5-7h "extends infra" path).

## 2026-05-07 12:25 — Phases 1-5 COMPLETE
- **Phase 1 (data structures):** generalized `detectAwaitsCycle` → `detectCycle(adj, allNodes)` (parameterized; reusable by B10/B11/B12/B16). Added `buildDerivedReadsAdj` to filter `reads` edges between reactive DG nodes.
- **Phase 2 (direct RHS walk):** existing `collectReactiveRefsFromExprNode` already covered direct `@cell` reads in derived RHS. No change needed; the walker registers `reads` edges between deriving cell and upstream cells.
- **Phase 3 (transitive function call walker):** added `fnPurityMap: Map<name, isPure>` derived from `FunctionDeclNode.fnKind === "fn"`. Pure callees skip transitive-read propagation in two places:
  - Step-2 fixed-point propagation through fn call graph (line ~1373).
  - Derived-decl → callee propagation (line ~1485).
- **Phase 4 (DAG + cycle detection):** new B7 cycle-detection block before E-DG-001 awaits-cycle scan. Self-references tracked via `selfReferencingDerivedNodes: Set<NodeId>` — captured in TWO places: (i) direct `@x` in RHS of `const <x> = …`, (ii) transitive read of `@x` via reactive function called from `const <x>`'s RHS.
- **Phase 5 (error fire):** `E-DERIVED-CIRCULAR-DEP` emitted from §34 catalog. Fail-fast on detection (mirrors E-DG-001 pattern; SPEC §6.6.10 line 2710 says "SHALL block code generation").

## 2026-05-07 12:30 — Phase 6 tests COMPLETE
- New file: `compiler/tests/unit/derived-circular-dep.test.js`
- 22 tests, 5 describe blocks:
  - direct-deps control (4 tests, no false positives on legitimate chains)
  - degenerate self-reference (3 tests, including SPEC §6.6.10 line 2741 example)
  - multi-node cycles (4 tests including fail-fast guard)
  - pure-fn filter (4 tests, including audit §1.1 worked example)
  - transitive cycles through reactive functions (2 tests, two-hop)
  - regression guards / no false positives (5 tests including canonical-name guard)
- All 22 pass.

## 2026-05-07 12:35 — Phase 7 docs COMPLETE
- `docs/PA-SCRML-PRIMER.md` §13.7: B7 row added to annotated-AST contracts table; full B7 specifics block following B6 specifics.

## 2026-05-07 12:40 — Phase 8 final test run
- `bun test`: **9112 pass / 44 skip / 1 todo / 0 fail / 32141 expect()** across 452 files [17.11s].
- Baseline was `8366 pass / 33 skip / 1 todo / 0 fail` per dispatch brief, but recent commits in worktree HEAD pushed counts higher; pre-survey `bun install` + `bun run pretest` on branch base reported `8400 pass / 33 skip` — so delta from B7 is **+712 pass, +11 skip, 0 fail**. (The +712 includes browser-test counts not present in the dispatch's pre-commit subset; the unit-only delta from B7 is **+22 unit tests added**.)
- 0 regressions.

## Deferred / follow-ups
- SPEC §6.6.10 prose rename `E-REACTIVE-005 → E-DERIVED-CIRCULAR-DEP` already landed via S66 footnote at line 2747 (audit §4 was satisfied during the audit landing; B7 only consumes the canonical name). No further SPEC edits required from B7.
- B10/B11/B12 (validator-arg deps, §31.4) and B16 (engine-derived, `E-DERIVED-ENGINE-CIRCULAR`) can now reuse `detectCycle` + the `buildDerivedReadsAdj` pattern (audit §1.4-§1.5 reusability constraint satisfied).

## Final summary
- Tier: T2/T3 — compiler-source change in `dependency-graph.ts` (+151 lines net), new test file (~458 lines).
- Survey-discount actual cost: **~75 min** vs estimate 5-7h (existing infra was very mature; gap was narrow).
- Branch: `phase-a1b-step-b7-derived-dep-tracking`.
- Commits: 4 (SURVEY, core impl, tests + transitive-cycle fix, primer + progress).
