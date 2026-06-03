# s156 (d)-A batch 2 — match exhaustiveness narrows to the enum subset

Append-only progress log.

## 2026-06-02 — Startup + Phase 0 survey COMPLETE
- Startup verified: worktree CWD agent-acbc755a5a409363d, merge main → bfc50545 (batch-1 HEAD), tree clean, bun install + pretest OK.
- SPEC read in full: §18.8.1 (11400-11446), §18.0.1 (10897-10905), §53.15.4 (29698-29724), §18.6 W-MATCH-001 (11240-11267), §34 E-MATCH-SUBSET-DEAD-ARM row (16477; row EXISTS, fire-site new), §53.15.5 error-code table (29748-29760).
- Batch-1 materialization read: PredicatedType.baseType "enum" + enumBase:EnumType + subsetVariants:Set<string> (tEnumSubset 620; parseEnumSubsetRefinement 1541; oneOf=listed, notIn=complemented). All reachable on the resolved declared type.

### Locus 1 — JS-style match (type-system.ts)
- resolveMatchSubjectType (9233) returns the cell/param scope entry's resolvedType.
- For a subset decl, resolvedType IS the PredicatedType (set at state-decl annotator line 5827; let/const parallel). Edge cases (nested / derived-cell / bound-value) all read this same declared resolvedType → handled for free.
- Caller checkMatchDiagnostics (9440) only routes kind==="enum"|"union"|substated-state; a Predicated(enum) subject falls through SILENTLY (no exhaustiveness today). APPROACH: unwrap PredicatedType→enumBase + thread subsetVariants into checkExhaustiveness→checkEnumExhaustiveness.

### Locus 2 — block-form match (symbol-table.ts)
- validateMatchBlock (10510), PASS 20. String-based self-contained. Has forType (base enum name), onExprRaw ("@role"), enumRegistry (name→variants). NO type-system ScopeChain.
- Empirical AST dump: match-block node {forType:"Role", onExprRaw:"@role"}; cell decl state-decl node {name:"role", typeAnnotation:"Role oneOf([.Admin,.Editor])"}.
- APPROACH: build a parallel subset registry (cellName→{baseEnum, subsetVariants}) by scanning state-decl/let/const nodes' typeAnnotation via a SHARED pure subset-parse helper (extract from type-system's parseEnumSubsetRefinement core). Resolve onExprRaw → cell name → subset. forType stays base (arm-tag inference).

### DECISION: proceed, no spec/source mismatch. Threading = "resolved type is now a PredicatedType" exactly as brief predicted. Shared subset-parse helper to be extracted to a new small module so both loci agree on the recognizer.

## 2026-06-02 — Phase 1 locus 1 (JS-style match) DONE
- NEW compiler/src/enum-subset-refinement.ts — shared pure recognizer parseEnumSubsetAnnotation(expr, enumVariantsOf) → {subset|error|null}; whitespace-tolerant; §53.15.1 range-form/empty/malformed → error; notIn complemented. Dep-free (no circular edge into symbol-table).
- type-system.ts:
  - EnumExhaustivenessResult += deadArms.
  - checkEnumExhaustiveness(+subsetVariants?): allVariants = subset (narrow); baseVariants = full (dead-arm classify). SF-1 dead-arm: arm naming base-member EXCLUDED-by-subset → deadArms (classified before cover/dup bookkeeping; continue).
  - checkSubstateExhaustiveness return += deadArms:[].
  - checkExhaustiveness(+subsetVariants?): enum branch emits E-MATCH-SUBSET-DEAD-ARM (names excluded variant + subsetRender `Enum oneOf([...])`); E-TYPE-020/W-MATCH-003/W-MATCH-001 messages name subsetRender when narrowing.
  - checkMatchDiagnostics routing: PredicatedType(baseType==="enum") subject → unwrap enumBase + thread subsetVariants → checkExhaustiveness; return. Edge cases (nested/derived-cell/bound-value) handled for free (all read declared resolvedType off scope entry).
- Phase-3 JS-style probes (let-decl form, the canonical match-expr locus):
  - (a) subset exhaustive no-else → CLEAN.
  - (b) dead .Viewer arm → E-MATCH-SUBSET-DEAD-ARM (names .Viewer + `Role oneOf([.Admin, .Editor])`).
  - (c) vacuous else → W-MATCH-001 (names subset).
  - (d) full-enum `let s: Role` missing .Viewer → E-TYPE-020 (no regression).
- PRE-EXISTING (not batch-2, not regression): fn-param `match r` and `fn ... { return match @cell }` are NOT structurally parsed into match-expr nodes (fn body collapses to bare-expr; "statement boundary not detected"). Exhaustiveness never fired for those forms even for full enums pre-batch-2. Canonical JS-style locus is `let x = match s {...}` in a ${...} block (per gauntlet-s19 test) — works.
- NEXT: block-form locus (symbol-table.ts validateMatchBlock).

## 2026-06-02 — Phase 1 locus 2 (block-form match) DONE
- symbol-table.ts PASS 20:
  - import parseEnumSubsetAnnotation (shared recognizer).
  - SubsetCellInfo {baseEnum, subset:Set, subsetRender} interface.
  - collectSubsetCells(): walks state-decl/let-decl/const-decl; typeAnnotation → shared recognizer; valid subset → registry keyed by BOTH name + @name. Range/empty/malformed skipped (decl-site already fired E-CONTRACT-002).
  - threaded subsetCellRegistry through walkValidateMatchBlocks → walkMatchBlockNodes → validateMatchBlock.
  - validateMatchBlock: subsetInfo = registry.get(onExprRaw.trim()). When subset-typed: dead-arm (arm ∈ base \ subset → E-MATCH-SUBSET-DEAD-ARM, names <Variant> + subsetRender); vacuous <_> over fully-covered subset → W-MATCH-001; else missing-subset-variant → narrowed E-MATCH-NOT-EXHAUSTIVE. forType stays base (arm-tag inference). NON-subset on= falls through to the unchanged full-forType check.
- Phase-3 block-form probes:
  - (a) subset exhaustive no <_> → CLEAN.
  - (b) dead <Viewer> arm → E-MATCH-SUBSET-DEAD-ARM (names <Viewer> + subset).
  - (c) vacuous <_> → W-MATCH-001 (names subset).
  - (e) full-enum `@role: Role` missing .Viewer → E-MATCH-NOT-EXHAUSTIVE (no regression).
  - (f) notIn([.Viewer]) complement {Admin,Editor} exhaustive no <_> → CLEAN.
  - (g) notIn subset missing .Editor → narrowed E-MATCH-NOT-EXHAUSTIVE naming subset.
- match-block-phase2 existing tests: 24/24 pass (no regression).
- NEXT: unit tests (Phase 2) + full suite + Phase 3 finalization.

## 2026-06-02 — Phase 2 tests
- NEW compiler/tests/unit/enum-subset-match-exhaustiveness-da-b2.test.js — 14 tests / 33 expects, 11 describe blocks: JS-style §1 exhaustive-no-else, §2 dead-arm (names excluded + subset, NOT E-TYPE-023), §3 vacuous-else W-MATCH-001, §4 full-enum no-regression, §5 notIn complement (clean + dead-arm); block-form §6-§10 parity (incl. notIn missing-variant narrowed message NOT demanding excluded variant); §11 edge cases (derived const cell exhaustive + dead-arm read DECLARED subset). Cross-stream findDiagnostic helper (W-/I- partition).
- 14/14 pass.
- NEXT: full suite + Phase 3 finalize.

## 2026-06-02 — Phase 3 finalize + verification
- Full suite (bun test compiler/tests, incl. browser): 22719 pass / 0 fail (baseline 22705 + 14 new). 0 regressions.
- unit+integration+conformance gate: 15629 pass / 0 fail (baseline 15615 + 14).
- Phase-3 CLI probes (bun compiler/bin/scrml.js compile):
  - JS-style: (a) subset exhaustive no-else CLEAN; (b) dead .Viewer → E-MATCH-SUBSET-DEAD-ARM (names .Viewer + `Role oneOf([.Admin, .Editor])`); (c) vacuous else → W-MATCH-001; (d) full-enum missing .Viewer → E-TYPE-020.
  - Block-form: (a) subset exhaustive no-<_> CLEAN; (b) dead <Viewer> → E-MATCH-SUBSET-DEAD-ARM; (c) vacuous <_> → W-MATCH-001; (e) full-enum missing .Viewer → E-MATCH-NOT-EXHAUSTIVE; (f) notIn complement exhaustive CLEAN; (g) notIn missing .Editor → narrowed E-MATCH-NOT-EXHAUSTIVE.
  - Dead-arm + full-subset-coverage: exactly ONE E-MATCH-SUBSET-DEAD-ARM, no spurious E-TYPE-020 / E-TYPE-023.
  - Emitted bf-exhaustive.client.js: node --check OK; 0 _scrml_sql/connectionString/password hits (codegen unchanged — exhaustiveness is compile-time-only).
- STATUS: batch 2 COMPLETE. Both loci narrow to subset; SF-1 dead-arm (new fire, both loci) + vacuous-else/<_> W-MATCH-001 (reuse); full-enum + substate + union matches unchanged.
- Deferred (per brief): batch 3 (schemaFor §41.15.6 + validator §55.1); batch 4 (Bug 66 constructor-form + fn-return bare-variant).
- Surfaced PRE-EXISTING (not batch-2, not regression): JS-style `match` inside a `fn ... { return match … }` body and a fn-PARAM `match r` are NOT structurally parsed into match-expr nodes (fn body collapses to bare-expr; "statement boundary not detected"). Exhaustiveness never fired for those forms even for FULL enums pre-batch-2. The canonical JS-style locus (`let x = match s {…}` in a ${…} block) works correctly. Member-access `on=@p.role` / computed `on=` falls through to the full-enum block-form check (subset reach is a declared-CELL property; direct `on=@cell` is the §18.0.1 canonical case).
