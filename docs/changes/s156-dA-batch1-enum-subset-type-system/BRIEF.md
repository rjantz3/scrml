# BRIEF — (d)-A batch 1: enum-subset refinement — type-system foundation (§53.15.1/.2/.3)

**change-id:** `s156-dA-batch1-enum-subset-type-system`
**severity:** feature impl (type-system) · **agent:** scrml-js-codegen-engineer · **isolation:** worktree
**arc:** (d)-A enum-subset refinement (spec landed normative S154). 3 batches: **batch 1 (THIS)** = type-system foundation; batch 2 = match exhaustiveness (§18.8.1/§18.0.1); batch 3 = schemaFor subset CHECK (§41.15.6) + validator `.OneOfFailed(set)` (§55.1). Batches 2+3 DEPEND on batch 1 materializing the subset variant set on the resolved type — that is the load-bearing deliverable.

**SPEC authority (read IN FULL via `offset:`+`limit:` before changing semantics — PA Rule 4, SPEC is normative):**
- §53.15 (line 29622-29792) — the enum-subset refinement section. **All of it**; batch-1-relevant sub-parts: §53.15.1 (syntax + decidability + NO-range-form), §53.15.2 (three-zone table), §53.15.3 (widen-free/narrow-checked flow), §53.15.5 (error codes — E-CONTRACT-001/-RT REUSE), §53.15.7 (engine `for=` subset DEFERRED — out of scope).
- §53.4 (the three-zone refinement model batch 1 EXTENDS — static/boundary/trusted) + §53.5.1 (refinement-flow law T-PRED-3/4) + §53.6.1 (E-CONTRACT-001/-RT mandate) + §53.9.2 (line 29109 — caller/callee constraint matching; the enum-subset widen rows at 29117/29120).
- §34 E-CONTRACT-001 / E-CONTRACT-001-RT (line ~16xxx — REUSED, not new; message names excluded variant + subset).
- §55.1 (`oneOf`/`notIn` validator vocabulary — the same set-membership words, now in refinement-type position over an enum).

---

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full first; follow §"Task-Shape Routing" for a **compiler-source type-system feature** (likely routes to a type-system / dependency map).

Map currency: maps reflect HEAD **`c665714c`** (S154 era), STALE by 5 commits. `type-system.ts` was touched by `c6f323f0` (#14 batch-2 typer — added `acceptsMessageType`/`cellMessageEnums`/`resolveAdvanceArgTwoPlane`). Treat any map content about `type-system.ts` / refinement / predicate machinery as a starting hypothesis — verify against current source (HEAD `43cf9f40`). Fire-site line anchors below are PA-surveyed at `43cf9f40`.

Feedback: final report includes "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "not load-bearing."

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup (BEFORE any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90 CWD-routing). Save as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` == `WORKTREE_ROOT`.
3. `git merge main` (worktree base may be stale; bring current main — includes Bug 62 `43cf9f40`). Report if conflict.
4. `git status --short` clean.
5. `bun install` (worktrees don't inherit node_modules).
6. `bun run pretest` (browser-test fixtures).
If any fails: STOP and report.

## Path discipline (EVERY edit)
- Apply ALL edits via **Bash** (`perl`/`python`/heredoc) on **worktree-absolute paths including the `.claude/worktrees/agent-<id>/` segment** — NOT Edit/Write (S126 leak class). Echo path before each write; re-verify via `git diff`/`grep`.
- **NEVER `cd` into the main repo.** Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths.

## Commit discipline (S83)
- Commit after each meaningful change (don't batch). First commit: `WIP(dA-b1): start at <pwd>`.
- `git status` clean before reporting DONE. Coupled code+test = one commit.
- Update `docs/changes/s156-dA-batch1-enum-subset-type-system/progress.md` (append-only, timestamped) per step.
Report: WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED, deferred-items, Phase-2/3 results.

---

# THE TASK — batch 1: recognize + resolve + three-zone-enforce enum-subset refinements

Today an enum-typed position cannot carry a `oneOf([.V])`/`notIn([.V])` subset refinement (the §53 refinement machinery handles numeric/string/named-shape predicates; variant-set membership over an enum base is unimplemented — only 2 `oneOf` mentions in type-system.ts).

## Deliverables
1. **Recognize** `oneOf([.V1,.V2,…])` / `notIn([.Vx,…])` in refinement-type position when the base type resolves to an `EnumType` (per §53.15.1). Variant-literal args (`.Admin`) are the canonical adopter form — reuse B20's bare-variant handling (`inferBareVariantsInExpr` / the `.Variant` IdentExpr recognition) for the args.
2. **Materialize the subset variant set** on the resolved type (a `PredicatedType` over an `EnumType`, carrying the explicit `V_sub` variant-name set — `notIn` materializes as `base_variants \ excluded`). **This is the load-bearing output batch 2 (exhaustiveness reads `V_sub`) + batch 3 (schemaFor emits the subset CHECK) depend on.** Pick a representation the downstream passes can read (a field on the resolved type, e.g. `subsetVariants: Set<string>`).
3. **Three-zone enforcement (§53.15.2 + §53.4):** static (decidable — `.V ∈ V_sub` → OK no check; `.V ∉ V_sub` literal assignment → **E-CONTRACT-001** static error, message names excluded variant + subset); boundary (full-enum value narrowed to subset at an assignment site → emit runtime membership check → E-CONTRACT-001-RT); trusted (already-proven ∈ subset → no check). Extend `classifyPredicateZone` (~1869) + `predicateImplies` (~1825) to variant-set membership: subset ⊆ subset = widen-free (no check, per §53.15.3 / §53.9.2 rows); full→subset = narrow-checked.
4. **Widen-free/narrow-checked flow (§53.15.3):** subset value → full-enum param = NO check (widen, T-PRED-3); subset → narrower-or-equal subset = NO check if provable (T-PRED-4); full-enum → subset = runtime check. **Exhaustiveness does NOT survive a widening boundary** (a subset value in a `fn handle(r: Role)` full-base param matches against the FULL enum inside — declared-type-at-use-site, not value-flow taint; §53.15.3 para).
5. **Range-form rejection (§53.15.1):** `oneOf(.A .. .B)` (range over variants) SHALL be rejected (RPP02 hazard). Pick/reuse an appropriate error.

## Fire sites (PA-surveyed at `43cf9f40`, verify)
- `compiler/src/type-system.ts`:
  - `resolveTypeExpr` (~1468; predicate handling via `parsePredicateExpr` at ~1532) — where a `Base(predicate)` type is resolved. The enum-base + `oneOf`/`notIn`-variant-args case branches here.
  - `parsePredicateExpr` (~867) — parses the predicate string; variant-literal args need recognition (`.Admin` → variant name).
  - `EnumType` (interface ~205) + `PredicatedType` (interface ~325) — the type representations; extend to carry `subsetVariants`.
  - `classifyPredicateZone` (~1869) + `predicateImplies` (~1825) — extend to variant-set membership (the static/boundary/trusted decision + widen-implication).
  - the SourceInfo-upgrade helper (~1907-1940, `upgradeSourceInfoForPredicatedIdent`) — B21's scope-aware predicated-source classification; the enum-subset value-flow rides this.
  - `annotateNodes` (the walker that writes `predicateCheck` on decls; B21/B20 placement) — enum-subset decls get the same zone annotation.
- `compiler/src/expression-parser.ts`: `classifyLiteralFromExprNode`, `inferBareVariantsInExpr` (B20) — the `.V` arg recognition.

PRIMER §13.7 B20 + B21 specifics document the bare-variant inference + three-zone predicate machinery you are extending — read them.

## OUT OF SCOPE (later batches / deferred — do NOT implement)
- Match exhaustiveness narrowing (§18.8.1/§18.0.1 + E-MATCH-SUBSET-DEAD-ARM + vacuous-else W-MATCH-001) → **batch 2**. (Batch 1 only MATERIALIZES `V_sub`; batch 2 reads it.)
- schemaFor subset CHECK (§41.15.6 / §41.15.8a nullable) + validator `.OneOfFailed(set)` (§55.1/§55.9) → **batch 3**.
- engine `for=` subset (§53.15.7) — DEFERRED, not this arc.
- `not`/nullable composition (`Role oneOf([.A]) | not`) — batch 1 should not BREAK it, but full nullable-subset handling is batch 3 (schema-side §41.15.8a). Type-side `match` composition is batch 2.

---

# PHASES

## Phase 0 — survey + STOP-if-mismatch
Confirm the fire sites + the existing PredicatedType/three-zone machinery against current source. If the existing refinement infra is shaped differently than described (e.g. `oneOf` over an enum already partially resolves), OR the spec framing doesn't match, STOP and report your findings + proposed re-scope BEFORE editing (depth-of-survey-discount: the real surface may differ; you are authorized to correct the touchpoints). Otherwise proceed.

## Phase 1 — implement
Deliverables 1-5 above. Reuse existing infra (don't duplicate the predicate/zone machinery — extend it). Keep all existing §53 refinement behavior (numeric/string/named-shape) intact (B21's 27 tests + the broader §53 suite must stay green).

## Phase 2 — tests
Unit tests (`compiler/tests/unit/`): subset recognition over enum base; `V_sub` materialization (oneOf + notIn-complement); static-zone OK (`.Admin ∈ subset`) + static-zone E-CONTRACT-001 (`.Viewer ∉ subset`); boundary-zone runtime-check emission; widen-free (subset→full param, no check); narrow-checked (full→subset); range-form rejection. Run FULL suite (`bun run test`) — 0 regressions (baseline `43cf9f40` = 22,685 pass / 0 fail).

## Phase 3 — empirical compile-probe verification (type-system, not R26-codegen)
Author 2-3 `.scrml` probe files exercising subset refinements (struct field, cell, fn param, fn return per §53.15.1) and compile them via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <probe> --output-dir <tmp>`. Assert: (a) valid subset assignment compiles clean; (b) out-of-subset literal → E-CONTRACT-001 with a message naming the excluded variant + subset; (c) range-form → rejected; (d) subset→full-param widen compiles clean (no spurious narrow error). Report the probe outputs. (Batch 1 is static type-system analysis — the codegen-JS R26 gate applies to batches that emit runtime JS; batch 1's empirical gate is the diagnostic-fire correctness above. If batch 1 DOES emit boundary runtime-check JS, `node --check` the emitted client.js too.)

**DO NOT mark DONE without Phase 3 probes passing + 0 full-suite regressions.**
