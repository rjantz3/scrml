# A1c C0 — usage-analyzer dispatch progress (append-only)

Per pa.md "Background Agents" rule: append-only timestamped lines.
Worktree: `agent-a4dbc8fa820c77d64`
Branch: `worktree-agent-a4dbc8fa820c77d64`

---

## 2026-05-08 — Phase 0 SURVEY

### Startup verification

- `pwd` — `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a4dbc8fa820c77d64`
- `git rev-parse --show-toplevel` — matches WORKTREE_ROOT
- `git status --short` — clean
- Initial HEAD — `f59bbcc` (S69 close), 8 commits BEHIND main (`a8a6bdf`)
- **Critical correction:** brief states baseline is `a8a6bdf` (post-A5-3 SHIP). The
  worktree was spun behind main. Discarded `bun install` lockfile noise; rebased
  branch onto main → HEAD now `a8a6bdf`. Tree clean.
- `bun install` — 114 packages
- `bun run pretest` — 12 samples compiled, 0 errors
- `bun run test` baseline — **9,682 pass / 60 skip / 1 todo / 0 fail** — exact match
  with BRIEF §11 stated baseline.

### Phase 0 SURVEY findings — DELIVERED

Wrote `docs/changes/phase-a1c-codegen/SURVEY.md` (~10K). Verdict: **PROCEED-AS-BRIEFED**
with minor scope augmentation (additional A5-2/A5-3-aware bitmap fields). Key findings:

1. **All 22 B-steps + A5-2 + A5-3 have shipped.** BRIEF §4.3's "WAIT vs PARTIAL" trilemma
   is moot — option (a) (the brief's recommendation) has happened.
2. **`analyze.ts` confirmed as attachment point** but with one structural correction:
   put the analyzer in NEW `compiler/src/codegen/usage-analyzer.ts`, not bloat analyze.ts.
   Wire via 3-LOC change in `analyzeAll`.
3. **Cross-file traversal — RESOLVED IN-FAVOR-OF EXISTING INFRA.** `analyzeAll`'s
   `files[]` carries the full transitively-resolved set. Per-file bitmap + OR-merge gives
   the per-app result. No import-graph traversal needed inside C0.
4. **Bitmap shape extended** beyond brief §1 to capture A5-2/A5-3 fields:
   `engineHistory`, `engineParallel`, `engineInternalRules`, `engineOnTimeout`,
   `engineNested`, `onTransitionHooks`, plus `bareVariantInference`, `programDocAttrs`,
   and split `refinementTypes` (boundary-zone) vs `refinementTypesAny`.
5. **Cost: 3.5-4.25h** (slight reduction from brief's 3.5-5h). Existing-infra coverage
   is excellent.
6. **9 sub-step decomposition** with WIP-commit boundaries documented in SURVEY §5.
7. **Test plan: ~45-55 new tests** (44 per-flag + 3-4 cross-file + integration).

### Files touched in Phase 0

- `docs/changes/phase-a1c-codegen/SURVEY.md` (NEW)
- `docs/changes/phase-a1c-step-c0-usage-analyzer/progress.md` (NEW — this file)

### HEAD at SURVEY commit

`8f63960` — WIP(a1c-c0): Phase 0 SURVEY — locus confirm + bitmap shape vs A5-2/A5-3
(parent: `a8a6bdf` — A5-3 SHIP)

### STATUS — STOP AT PHASE 0 (per dispatch instructions)

Awaiting PA acknowledgment + implementation authorization before proceeding to Phase 1+
(implementation). Per dispatch §"Phase 0 STOP": will NOT proceed to source-file work
without PA re-dispatch.

---

## 2026-05-08 — Phase 1 IMPLEMENTATION (re-dispatch agent ad732aee7dc564ff6)

### Worktree resync

- Initial HEAD on worktree spawn: `f59bbcc` (S69 close — 9 commits behind main)
- Required baseline (per SURVEY): `a494586` (post-A5-3 + SURVEY-landed)
- Resync: `git merge --ff-only a494586` — clean fast-forward, no conflicts
- Tree clean post-resync; `bun install` 114 packages OK; pretest 12 samples OK
- Baseline `bun run test`: **9682 pass / 60 skip / 1 todo / 0 fail** — exact match

### Sub-step 2-5 (combined commit) — usage-analyzer scaffold + walker

Created `compiler/src/codegen/usage-analyzer.ts` (662 LOC). Lands:

- `FeatureUsage` interface — 14 validator predicate flags + 17 feature flags
- `emptyUsage()` / `fullUsage()` / `mergeUsage()` — pure functional skeletons
- `analyzeUsage(fileAST)` — recursive walker over every container shape

Per-flag triggers:
- Validators: `state-decl.validators[].name` matched against
  `UNIVERSAL_CORE_PREDICATES` from `validator-catalog.ts` (no string drift)
- Engines: `kind === "engine-decl"` → `engines: true`; `engineMeta` fields
  drive derivedEngines/engineHistory/engineParallel/engineInternalRules/
  engineOnTimeout/engineNested with defensive fallback to stateChildren walk
- Refinement: `state-decl.predicateCheck.zone === "boundary"` → refinementTypes;
  any zone → refinementTypesAny
- Channels: `markup.tag === "channel"` (raw — no _p3aIsExport filter per
  SURVEY §7.7)
- onTransitionHooks: `markup.tag === "onTransition"`
- programDocAttrs: `markup.tag === "program"` + attrs include
  title/description/version/author/license
- validitySurface + variantCCompound: any compound-parent (per primer §13.7
  B11 unconditional synthesis rule)
- renderSpec / markupTypedDerived: state-decl.shape / _cellKind triggers
- defaultExpr: `state-decl.defaultExpr != null`
- reset: `forEachResetExprInExprNode` over initExpr / defaultExpr / etc.
- bareVariantInference: `forEachIdentInExprNode` filtered by `.UpperCase`
  shape (per SURVEY §8.2 mitigation — no false positives via plain
  member access since MemberExpr is a distinct kind)
- typeAsArgument: STUB returning `false` (parseVariant Phase 2 not landed
  per SURVEY §8.3)

Recursion correctness (per SURVEY §8.4): walker descends through
markup.children / logic.body / state-decl.children + renderSpec.children /
function-decl.body / component-def.body+children / if-stmt.consequent +
alternate / for/while.body / switch+match-stmt.arms[].body /
try-stmt.body+errorArms / transaction-block.body / let/const/tilde/lin
initExpr / when-effect.bodyExpr / generic .children + .body fall-through.

Commit: `2cbd3be` (WIP — file is dead code until sub-step 6 wires).
Tests still green at 9682 / 60 / 1 / 0.

### Sub-step 6 — wire usage analyzer into analyzeAll

`compiler/src/codegen/analyze.ts` (3 LOC behavior change):
- Import `analyzeUsage` / `emptyUsage` / `mergeUsage` / `FeatureUsage`
- `FileAnalysis` gains required `usage: FeatureUsage` field
- `analyzeFile()` invokes `analyzeUsage(fileAST)` and stores
- `analyzeAll()` return shape gains `featureUsage: FeatureUsage` (per-app
  bitmap = OR-merge across files[])
- index.ts unchanged (per SURVEY §1.4 minimal-touch)

Commit: `c834300`. Tests still green at 9682 / 60 / 1 / 0 — no consumer
reads `usage` yet, so all existing flows transparent to the new field.

### Sub-step 7 — unit tests (per-flag positive + negative)

Created `compiler/tests/unit/usage-analyzer.test.js` with 62 tests covering:
- Skeleton constructors (5 tests)
- 14 validator predicates × positive (req/"is some"/length/pattern/min/max/
  gt/lt/gte/lte/eq/neq/oneOf/notIn) + 1 broad negative
- 12 engine + temporal tests (engines/derivedEngines/engineParallel/
  engineHistory/engineInternalRules/engineOnTimeout × pos/neg)
- 2 channels tests
- 3 refinement-type tests
- 2 validity-surface + variantCCompound tests
- 4 render-spec + markup-typed tests
- 4 reset + default tests
- 3 bare-variant inference tests (incl. negative for plain MemberExpr)
- 1 typeAsArgument STUB test
- 3 program-doc-attrs tests
- 4 AST-only soundness tests (structural triggers fire WITHOUT SYM/TS)
- 4 empty/edge-case input tests

Walker tweaks during sub-step 7:
- let-decl/const-decl now picks up `predicateCheck` (B21 fires on let-decls
  too per §B21.8). state-decl AND let-decl coverage = full §53 surface.
- bare-expr now reads `exprNode` (the structured ExprNode form) instead
  of legacy `expr`/`argument`. This was the gap behind reset() detection
  failing — function-decl bodies contain bare-expr with exprNode.kind ===
  "reset-expr".

Surprise: `<opt is some>` as bareword on a state-decl is parser-deferred
(ast-builder.js:3060 note). That validator name is not currently
observable on state-decl.validators[]. The flag is included in the bitmap
for forward-compat; the test exercises the walker contract via synthetic
AST.

Commit: `0fbf0d0`. Test invariant 9682 + 62 = 9744 pass, 0 fail.

### Sub-step 8 — cross-file merge integration test + bitmap completeness probe

Added 5 more tests:
- 4 cross-file merge tests: two-file engine+channel separation, three-file
  validator OR-merge, empty/missing files arrays
- 1 kitchen-sink completeness probe: 22 flags fire from one fixture

Walker hardening during sub-step 8:
- Engine-decl detection now reads parser-level fields FIRST
  (node.parallelAttr, node.sourceVar) — these are always present
  post-buildAST — then SYM-populated fields (node._record.engineMeta.*),
  then a defensive substring scan of node.rulesRaw as a final fallback.

Surprise: SYM PASS 10.A's file-scope-only walker doesn't always populate
`_record` on engine-decls nested inside `<program>` markup (the kitchen-
sink fixture exposed this). Per soundness > completeness (SCOPE §11.2):
walker triangulates from parser-level / SYM-level / substring-scan
signals; over-inclusion bloats output, never crashes. Substring patterns
(`\bhistory[\s>\/]`, `internal:rule`, `<onTimeout`, `<engine`) are
bounded but not perfect — false-positives acceptable.

Commit: `c8bb90f`. Test invariant 9682 + 67 = 9749 pass, 0 fail.

### Sub-step 9 — DoD bitmap output for fixtures + SHIP

DoD probe results (SCOPE §11.3 requirement):

**TodoMVC (`benchmarks/todomvc/app.scrml`)** — all flags FALSE.
TodoMVC uses only legacy `@`-form Shape 1 plain reactive cells, no
validators, no engines, no channels, no refinement types, no compound,
no reset, no default. Bitmap = `emptyUsage()` = correct elision input
(no v0.next runtime needed beyond the basics).

**multi-step-form sample** — all flags FALSE.
Uses legacy `@`-form + HTML `required` (browser native, not scrml
validators). Bitmap = `emptyUsage()` = correct.

**channel-basic.scrml + channel-multiple-001.scrml** — only `channels:
true` fires. Correctly captures the channel surface use.

This validates the soundness contract: the bitmap reflects ACTUAL
v0.next feature use, structurally. Apps using only the baseline scrml
get all-false bitmaps (full elision opportunity for downstream emitters).
Apps using channels / engines / validators / etc. fire only the relevant
flags.

Output-byte-shape stability: C0 emits NO runtime, mutates NO AST. By
construction, byte-output for any fixture is unchanged.

Final test invariant: 9682 + 67 = 9749 pass / 60 skip / 1 todo / 0 fail.
Test delta target was +45 to +55; actual +67 (drove higher to ensure
soundness coverage of the AST-only triggers + cross-file merge + kitchen-
sink probe).
