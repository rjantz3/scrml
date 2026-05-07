---
title: A1c C0 dispatch brief — kickoff step for Phase A1c codegen+runtime
date: 2026-05-06
session: S65 prep (firing TBD post-parseVariant Phase 2 land)
authority: A1c plan ratified S60; brief drafted S65
status: BRIEF READY — awaits convener authorization to fire
---

## §1 Scope of C0

C0 is the **foundational feature-usage analysis pass** for A1c. Per
`docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md` §4.0 + §11
(Q3-ratified Option C "compile-time elision"):

> Walk A1b's annotated AST and produce a `FeatureUsage` bitmap recording
> which v0.next features the app actually touches. Bitmap is consumed by
> every downstream runtime-emission step (C6, C8, C12, C16, C18, C21, …)
> so the runtime library is emitted per-app based on actual feature usage.

**Deliverable file:** `compiler/src/codegen/usage-analyzer.ts` (NEW).

**Bitmap shape (per SCOPE §11.1):**
- `validators: { req: bool, length: bool, pattern: bool, ... }` — per-predicate flags across the 14-predicate catalog (§55.1, L4)
- `engines: bool` (any `<engine for=…>`?)
- `derivedEngines: bool` (`derived=expr` engine variant, L20)
- `channels: bool` (any `<channel name=… topic=…>`?)
- `refinementTypes: bool` (any §53 zone-bound predicate?)
- `validitySurface: bool` (any compound-with-validators or per-field-with-validators?)
- `renderSpec: bool` (any Shape 2 cell?)
- `markupTypedDerived: bool` (any `const <x> = <markup-expr>`?)
- `reset: bool` (any `reset(@cell)` call site?)
- `defaultExpr: bool` (any state-decl with `default=` attribute?)
- … other v0.next features added at survey-time as discovered

**Soundness vs completeness (§11.2 RATIFIED):** soundness > completeness >
output-size. Conservative inclusion when in doubt. False-negatives crash
apps at runtime; false-positives only bloat. **Conservative inclusion is
mandatory.**

**What C0 does NOT do:**
- Does NOT emit any runtime code. (That's downstream C-steps.)
- Does NOT modify the AST. (A1a's job; A1b's annotations are read-only here.)
- Does NOT fire diagnostic errors. (A1b's job; if a state-decl is malformed,
  A1b already failed.)
- Does NOT decide HOW to emit anything. (Just records WHAT is used.)

C0 is a **pure analysis pass** producing a structured data record consumed
by downstream emitters.

---

## §2 Why C0 fires first

C0 is the foundational analysis pass for the **entire** runtime-elision
strategy ratified at S60. **Every downstream A1c step that emits runtime
helpers consults this bitmap.** Specifically:

| Downstream step | What it reads from C0's bitmap |
|---|---|
| C6 (validator catalog) | per-predicate flags → emit only used predicates |
| C8 (validity surface synthesis) | `validitySurface` → emit synthesis helpers only if any compound has validators |
| C12 (engine state-machine runtime) | `engines` → emit engine helper only if any `<engine>` |
| C14 (`derived=expr` engine) | `derivedEngines` → branch within engine emission |
| C16 (refinement-type runtime) | `refinementTypes` → emit zone runtime only if any §53 predicate |
| C18 (channel WS) | `channels` → emit channel runtime only if any `<channel>` |
| C5 (`reset` runtime) | `reset` → emit reset helper only if any call site |

**Without C0, the elision strategy can't fire.** Every downstream emitter
would have to either (a) emit always (unconditional bloat — defeats the
ratified strategy), or (b) re-walk the AST itself (duplicated work, plus
inconsistent classification across emitters).

C0 produces ONE source of truth, walked ONCE, consumed by all downstream
emitters.

---

## §3 Existing infrastructure C0 inherits

> **NOTE TO IMPLEMENTING AGENT:** the depth-of-survey discount is
> **frequency-7** at scrmlTS (per primer §12 + master-list §0.4). **Run a
> 1-2h survey before per-step decomposition.** Recent dispatches (S64 B2,
> S65 parseVariant Phase A) hit ~30%-50% scope reduction by surveying first.
> Primer §12 has the full mitigation checklist.

**File-by-file inheritance map** (line ranges from this brief's
preparation, current as of HEAD `36a2d88`):

### §3.1 The CG analysis layer — **direct attachment point**

`compiler/src/codegen/analyze.ts` (124 lines)
- `analyzeFile(fileAST)` (lines 69-93) — the canonical per-file analysis
  entry point. Returns `FileAnalysis` (lines 49-60).
- `analyzeAll(input)` (lines 102-124) — the top-level analysis entry,
  returns `{ fileAnalyses, protectedFields }`.

**C0's natural attachment point:** extend `FileAnalysis` (line 49-60) with
a new `usage: FeatureUsage` field, OR add a new top-level cross-file
`featureUsage: FeatureUsage` to `analyzeAll`'s return shape (since the
elision decision is **per-app**, not per-file — imports drag features in).

**Per-app vs per-file:** SCOPE §11.3 says C0 must walk transitively-imported
modules — importing a module that uses engines means the importer's bitmap
has `engines: true`. **Cross-file traversal required.** Survey:
`analyzeAll`'s `files` array — confirm it already includes
transitively-resolved modules (likely yes, since MOD already builds the
import graph), and confirm the analyzer should produce ONE
cross-file-merged bitmap, not per-file.

### §3.2 Existing collection helpers — likely useful

`compiler/src/codegen/collect.ts` — `getNodes`, `collectFunctions`,
`collectMarkupNodes`, `collectTopLevelLogicStatements`. Survey-pass:
confirm these traverse deeply enough to find Shape 2 cells, validator
attrs, channel nodes, engine nodes. If they only walk top-level, C0 needs
its own deep-traversal helper (or extends collect.ts with one — additive,
no behavior change for existing emitters).

### §3.3 The compile-time-walks pattern — **canonical shape model**

`compiler/src/codegen/emit-machines.ts` (719 lines) is the canonical
pattern for compile-time AST walks producing a structured emission
artifact. C0 produces a structured **analysis** artifact (not emission),
but the shape is parallel: walk the AST, classify nodes, accumulate
results into a typed record. Read the first ~150 lines for the structure.

### §3.4 Orchestrator dispatch hook — **MERGE-FLAG ZONE**

`compiler/src/codegen/index.ts` (759 lines) is the orchestrator. It
imports analyze.ts at line 34 (`import { analyzeAll } from
"./analyze.ts"`). C0 wires in via the existing analyze.ts attachment;
**index.ts itself only changes if C0 introduces a new top-level
orchestration step** (e.g., a separate `runUsageAnalysis()` call). Survey
will confirm.

> **CONCURRENCY NOTE:** parseVariant Phase 2 (in-flight at S65) also
> touches `index.ts` (the parseVariant codegen dispatch hook lands in
> `emit-parse-variant.ts` and may need a registration in index.ts).
> **C0's index.ts touch should be MINIMAL — ideally zero** — to avoid
> merge conflicts. If C0 truly needs a new orchestrator hook, coordinate
> with parseVariant Phase 2's branch state at fire-time.

### §3.5 A1b annotations C0 consumes (read-only)

C0 reads A1b's decorations on the AST. **B1+B2 have landed; B3-B22 are
pending** (see master-list §0.1). Critical decorations C0 needs:

| A1b deliverable | What C0 reads | Status at S65 |
|---|---|---|
| B1 (symbol table) | `_scope` annotations on nodes | ✅ landed S63 |
| B5 (cell classifier) | `state-decl.shape` discriminator | from A1a Step 4 — already populated |
| B7 (derived dep DAG) | `derivedDeps` annotation | ⏸️ pending |
| B10 (validator typer) | `validators[]` typed annotations | ⏸️ pending |
| B11 (compound-rollup synthesis) | `validitySurface` annotation | ⏸️ pending |
| B14 (engine binding) | `<engine>` resolved binding | ⏸️ pending |
| B16 (derived-engine validation) | `derived=expr` engine annotation | ⏸️ pending |
| B19 (channel context check) | `<channel>` context annotation | ⏸️ pending |
| B21 (zone decision) | refinement-type zone annotations | ⏸️ pending |
| B22 (reset target validation) | `reset(@cell)` resolved target | ⏸️ pending |

**See §4 (dependencies + ordering) for the implications.**

---

## §4 Dependencies + ordering — A1b prerequisite

**This is the critical question for the convener and the dispatching PA.**

### §4.1 The strict dependency

SCOPE §9 §1 RATIFIED: "A1b completion before A1c starts — strict
dependency; A1c needs A1b's annotated AST."

C0 walks A1b's annotated AST. Of the 22 B-steps, **B1 + B2 have landed at
S64.** B3-B22 (the bulk — `@name` resolution, derived-DAG, validator
typer, validity-surface synthesis, engine binding, channel context, zone
decisions, reset target validation) are **pending**. C0 reads
decorations from B5, B7, B10, B11, B14, B16, B19, B21, B22 — **all of
which are pending B-steps**.

### §4.2 The implication

**C0 cannot fully fire until A1b-COMPLETE** (or at minimum, the B-steps
producing the decorations C0 reads must have landed). Firing C0 against an
under-decorated AST means:
- The bitmap is incomplete (some features classified as "not used" because
  the decoration that would mark them is absent)
- That violates **soundness** (the ratified soundness > completeness
  invariant)
- The bitmap downstream emitters consume would silently produce
  apps-that-crash

### §4.3 Three options for the convener

| Option | What it means | Risk |
|---|---|---|
| **(a) WAIT for A1b-COMPLETE** | C0 fires only after B22 lands | longest wall-time; safe |
| **(b) Fire C0 NOW with conservative-everything bitmap** | bitmap returns `true` for every flag (no elision) | violates the elision strategy entirely; defeats §11 ratification |
| **(c) PARTIAL C0 — only flags whose A1b decoration has landed** | engine flag waits for B14; validator flags wait for B10; etc. | complex coordination; bitmap shape is in motion |

**Recommendation (this brief — open to convener override):** **Option (a).**
The elision strategy is ratified; the soundness invariant is mandatory;
firing C0 prematurely produces either bloat (conservative-everything,
defeating §11) or unsoundness (firing against missing decorations). Wait
for A1b-COMPLETE.

**Alternative (a'):** if the convener wants C0 work to start before
A1b-COMPLETE, scope C0 to **scaffolding + the bitmap shape + the analyzer
skeleton**, leaving the per-feature-flag detection logic as TODOs to
fill in as each B-step lands. This produces the
infrastructure now, and per-feature dispatches as B-steps wrap. Adds
coordination overhead but unblocks parallel progress.

> **OPEN QUESTION FOR THE CONVENER (#1):** which option? See §13.

---

## §5 Tier classification — **T2**

Per `scrml-dev-pipeline` agent's tier model:
- **T1** = stdlib/pure-scrml only, no compiler change
- **T2** = compiler change with new SPEC surface OR new compiler subsystem
- **T3** = cross-cutting architectural change

**C0 is T2.** It introduces a new compiler analysis pass
(`usage-analyzer.ts`), extends the codegen analysis layer's contract
(adds `FeatureUsage` to `FileAnalysis` or `analyzeAll`'s return), and
establishes the data contract that ~7 downstream emitter dispatches
consume. It does NOT touch SPEC.md (the elision strategy is ratified at
SCOPE §11 — SPEC §11.x amendment is C23's territory under PIPELINE prose,
not C0's).

If survey reveals the analyzer needs a new orchestrator stage in
PIPELINE.md, that bumps surface — confirm-or-deny at survey time.

---

## §6 Estimated effort

SCOPE §4.0 says **3-5 h**. This brief refines:

| Sub-task | Estimate (existing-infra) | Estimate (new-infra) |
|---|---|---|
| Survey pass (mandatory; depth-of-survey discount #7) | 0.5-1 h | 0.5-1 h |
| `FeatureUsage` type definition | 0.25 h | 0.25 h |
| Analyzer skeleton (`usage-analyzer.ts`) | 0.5 h | 0.75 h |
| Per-feature detection logic (~10 flags × 10-20 LOC) | 1-2 h | 1.5-3 h |
| Cross-file merge logic | 0.25 h | 1 h (if MOD's import graph isn't already shaped right) |
| Wiring into `analyzeAll` | 0.25 h | 0.5 h |
| Tests (unit + integration) | 1 h | 1.5 h |
| Progress.md + commit hygiene | 0.25 h | 0.5 h |
| **Total** | **~3.5-5 h** | **~6-7.5 h** |

**Estimate range: 3.5h IF existing-infra covers (collect.ts deep-walks,
MOD import graph is already merged-shape, FileAnalysis attachment is
clean) ≤ 7.5h IF new-infra needed (own deep-walk, own import-graph
merge, new orchestrator stage).**

Survey-pass distinguishes the two regimes.

---

## §7 Risks

### §7.1 Soundness invariant

**Highest risk.** C0 false-negatives crash apps at runtime. Every flag's
detection logic must err on the side of inclusion. Survey must enumerate
every code path that produces a feature use, not just the "obvious" one.

**Test invariant:** every flag MUST have at least one positive test
(feature present → flag set) AND one negative test (feature absent → flag
clear). For `validators` (per-predicate), this is 14 positive + 1 broad
negative.

### §7.2 Cross-file traversal completeness

If a transitively-imported module uses engines, the importer's bitmap
must have `engines: true`. Survey: confirm `analyzeAll`'s `files` array
already includes the full import closure. If not, C0 needs to walk the
import graph itself.

**Test fixture:** TodoMVC (no engine) + kickstarter v2 §3 corpus
(uses-everything) — bitmap output for each documented at C0's DoD per
SCOPE §11.3.

### §7.3 parseVariant Phase 2 concurrency on `index.ts`

parseVariant Phase 2 (in-flight S65) lands `emit-parse-variant.ts` and
may register a new dispatch hook in `compiler/src/codegen/index.ts`. C0's
index.ts touch should be **minimal** to avoid merge conflicts. If C0 truly
needs an orchestrator hook, coordinate with parseVariant's branch state at
fire-time. **PA: check git log for recent index.ts touches before firing
C0.**

### §7.4 A1b decoration-shape stability

A1b is in flight — B-step decoration field names may shift as
later B-steps reveal needs. C0 attaches to specific field names (e.g.,
`node.validators` for B10, `node.derivedDeps` for B7). If a B-step
later renames a field, C0 needs an update. Mitigation: each B-step's DoD
should include "C0 reads field X" as an invariant; check at landing.

### §7.5 Fire-order: parseVariant vs C0

C0's bitmap should likely include `typeAsArgument` (parseVariant present)
as a flag — parseVariant emits monomorphized parser code per call site,
and downstream optimizations (output-size budgeting, etc.) may want to
know. **NOT a blocker** — if parseVariant lands first, C0 adds the flag;
if C0 lands first, the flag is added when parseVariant lands. No
architectural collision.

### §7.6 Output-byte-shape regression

SCOPE §9 §8 RATIFIED: ≤5% regression budget on critical paths (TodoMVC,
kickstarter v2 §3). C0 itself emits no runtime code, so it can't directly
cause output regression — but its bitmap shape determines what downstream
emitters produce. **Defensive test: C0 must not change byte-output for
the TodoMVC sample or the kickstarter §3 corpus** (until downstream steps
consume the bitmap; at C0-landing, all flags should be `true`-default
keeping byte-output stable).

---

## §8 L22 family interaction — parseVariant orthogonality

**parseVariant compiler implementation lands in
`compiler/src/codegen/emit-parse-variant.ts` + `compiler/src/type-system.ts`
extension** (per parseVariant Phase 2 — see
`docs/changes/parsevariant-impl/SCOPE.md` §"Compiler change" + survey).

**C0's relationship to parseVariant:**

- **File-disjoint.** C0 touches `usage-analyzer.ts` (NEW) + possibly
  `analyze.ts`. parseVariant Phase 2 touches `emit-parse-variant.ts` (NEW)
  + `type-system.ts` (existing). **No overlap on source files** except
  potentially `index.ts` (the orchestrator) — see §7.3 concurrency note.
- **Semantically independent.** parseVariant is the L22 type-as-argument
  primitive. C0 is the elision-bitmap producer. Neither depends on the
  other for correctness.
- **C0 MAY register a `typeAsArgument` flag** if survey reveals downstream
  emitters want to elide based on parseVariant presence. **Optional, not
  required.**

**C0 must NOT touch `emit-parse-variant.ts`, `type-system.ts`, or any
parseVariant-related code path.** If survey reveals an unexpected coupling,
flag it for the convener and pause.

---

## §9 Required reading for the C0 implementing agent

In dispatch order:

1. **`docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md`** —
   the A1c plan. Read §1, §3, §4.0, §4.7, §4.8, §11 in full; skim the
   rest. **Primary input.**
2. **This brief** (`C0-DISPATCH-BRIEF.md`) — read end-to-end.
3. **`docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md`** —
   to understand what A1b decorations C0 reads. Focus on B5, B7, B10,
   B11, B14, B16, B19, B21, B22.
4. **`docs/PA-SCRML-PRIMER.md`** — canon scrml. Especially §6 (error
   model), §10 (stdlib), §13 (locks L1-L22), §13.6 (type-as-argument
   family), and §12 (depth-of-survey-discount mitigation checklist —
   **mandatory pre-implementation read**).
5. **`docs/articles/llm-kickstarter-v1-2026-04-25.md`** — kickstarter;
   mandatory for any dispatch that may produce scrml.
6. **`/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`** —
   anti-patterns brief; mandatory for any dispatch.
7. **`compiler/PIPELINE.md`** head + table-of-contents — to understand
   stage 8 (CG) context.
8. **`compiler/SPEC-INDEX.md`** — to navigate SPEC.md without overflow
   if a SPEC reference is needed.
9. **For orientation only (DO NOT MODIFY):**
   - `compiler/src/codegen/index.ts` (orchestrator)
   - `compiler/src/codegen/analyze.ts` (analysis layer — C0's attachment)
   - `compiler/src/codegen/collect.ts` (existing collection helpers)
   - `compiler/src/codegen/emit-machines.ts` (compile-time walks pattern)

---

## §10 Worktree-isolation discipline

**Per S64 hand-off note 43 (worktree-routing harness bug):** dispatch
this work via **`general-purpose` agent with `isolation: "no-isolation"`**
NOT a worktree.

**Absolute worktree path for the implementing agent:**
`/home/bryan-maclee/scrmlMaster/scrmlTS`

**Startup verification (every dispatch):**

```bash
pwd                    # must be /home/bryan-maclee/scrmlMaster/scrmlTS
git status --short     # confirm baseline (note any in-flight uncommitted from other dispatches; leave alone)
git rev-parse HEAD     # note starting commit
bun install            # ensure deps fresh
bun run pretest        # baseline test pass before any source change
```

**Branch:** `phase-a1c-step-c0-usage-analyzer` per SCOPE §10
(per-step branch; PA cherry-picks to main).

**Per-step doc directory:** `docs/changes/phase-a1c-step-c0-usage-analyzer/`
with `BRIEF.md` (cherry-picked from this dispatch brief) + `progress.md`
(append-only, per pa.md "Background Agents" rule).

**Incremental commits expected.** WIP commits are fine. Commit after each
meaningful unit of work — see pa.md §"Background Agents" Crash Recovery
section.

**Do not bypass pre-commit hook (`--no-verify`) without explicit user
authorization.** If pre-commit fails, fix the underlying issue and create
a NEW commit (never amend after hook failure).

---

## §11 Deliverables

| # | Deliverable | Commit-message hint |
|---|---|---|
| D1 | Survey pass: confirm/deny existing-infra coverage; document file paths + line ranges | `WIP(a1c-c0): survey findings — existing-infra coverage map` |
| D2 | `FeatureUsage` type definition | `WIP(a1c-c0): define FeatureUsage type for runtime-elision bitmap` |
| D3 | `compiler/src/codegen/usage-analyzer.ts` skeleton + per-flag detection | `WIP(a1c-c0): usage-analyzer skeleton + N-of-M flag detectors` |
| D4 | Cross-file merge logic | `WIP(a1c-c0): cross-file FeatureUsage merge` |
| D5 | Wiring into `analyzeAll` (or equivalent attachment per survey) | `WIP(a1c-c0): wire usage-analyzer into FileAnalysis` |
| D6 | Tests: per-flag positive + negative; cross-file merge fixture | `WIP(a1c-c0): unit tests for usage-analyzer flags` |
| D7 | Output-byte-shape regression test (TodoMVC + kickstarter §3 corpus unchanged) | `WIP(a1c-c0): byte-output stability tests` |
| D8 | `progress.md` final entry + cherry-pick-ready summary | `feat(a1c-c0): usage-analyzer pass + per-app FeatureUsage bitmap` |

**Test invariant at C0-landing:** zero source-level regressions. Baseline
delta = +N tests (per-flag positive + negative + fixture tests). No
behavior change to compiled-app byte-output (downstream C-steps consume
the bitmap; until they do, all flags default such that byte-output is
unchanged).

---

## §12 Final report shape (≤300 words)

The implementing agent reports to PA at completion with:

1. **Lead verdict:** LANDED / BLOCKED-ON-X / NEEDS-CONVENER-INPUT.
2. **Test delta:** baseline before / after / pass-skip-fail-todo.
3. **Survey discount:** what was originally estimated 3.5-7.5h → what
   it actually took. Cite specific findings (existing-infra coverage,
   surprise couplings, etc.).
4. **Bitmap shape shipped:** list every flag, with one-line semantics each.
5. **Cross-file merge approach:** how transitively-imported features
   propagate to the importer's bitmap.
6. **TodoMVC + kickstarter §3 fixture results:** bitmap output for each
   documented (per SCOPE §11.3 DoD).
7. **Open questions / surprises:** anything that surfaced and needs
   convener attention.
8. **Strongest depth-of-survey-discount candidate:** the single finding
   that most reduced scope — record it for primer §12 and design-insights
   archival.

---

## §13 Open questions for the convener

1. **Fire-order vs A1b completion.** Per §4.3, three options:
   (a) WAIT for A1b-COMPLETE (recommended in this brief), (b) fire C0
   NOW with conservative-everything (defeats §11 elision), (c) PARTIAL C0
   covering only flags whose A1b decorations have landed.
   **Convener decision required before firing.**
   **PA's lean (this brief):** option (a).

2. **C0 vs parseVariant Phase 2 scheduling.** parseVariant Phase 2 is the
   most likely source of `index.ts` merge friction. Should C0 wait for
   parseVariant Phase 2 to land (clean orchestrator state), or fire in
   parallel (file-disjoint except for index.ts hook)?
   **PA's lean:** wait for parseVariant Phase 2 to land. Marginal
   wall-time cost; eliminates merge friction.

3. **Per-app vs per-file bitmap shape.** SCOPE §11 implies per-app (the
   elision decision is global). Survey will confirm `analyzeAll`'s
   `files` array carries the full import closure. If not, C0 needs to
   walk the import graph itself. Acceptable, or out-of-scope for C0?
   **PA's lean:** in-scope. C0 is foundational; getting the shape right
   here pays for itself across all 7 downstream consumer steps.

4. **`typeAsArgument` flag inclusion.** Should C0's bitmap include a
   `typeAsArgument: bool` flag tracking parseVariant call-site presence?
   Useful for downstream output-size budgeting; not strictly required.
   **PA's lean:** include — additive cost is trivial; unblocks future
   family-member flags.

5. **PIPELINE.md prose update.** C23 covers PIPELINE prose for all of
   A1c. Does C0 need an interim PIPELINE.md note (mentioning the
   usage-analyzer pass), or is C23 the right place for the canonical
   prose? **PA's lean:** defer to C23 (one update pass, not seven).

---

## §14 Tags

#a1c-c0 #dispatch-brief #usage-analyzer #feature-elision #compile-time-elision-option-c #t2-tier #depth-of-survey-discount #brief-ready #awaits-convener-input
