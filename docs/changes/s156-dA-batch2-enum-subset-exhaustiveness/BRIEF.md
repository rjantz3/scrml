# BRIEF — (d)-A batch 2: match exhaustiveness narrows to the enum subset (§18.8.1 + §18.0.1) + E-MATCH-SUBSET-DEAD-ARM + vacuous-else W-MATCH-001

**change-id:** `s156-dA-batch2-enum-subset-exhaustiveness`
**severity:** feature impl (type-system + SYM) · **agent:** scrml-js-codegen-engineer · **isolation:** worktree
**arc:** (d)-A enum-subset refinement. **batch 1 LANDED `bfc50545`** (materialized `PredicatedType.subsetVariants`/`enumBase` — READ them, don't recompute). THIS = batch 2 (exhaustiveness, BOTH match loci). Remaining: batch 3 (schemaFor §41.15.6 + validator §55.1); batch 4 (Bug 66 — constructor-form + fn-return bare-variant enforcement).

**SPEC authority (read IN FULL via `offset:`+`limit:` — PA Rule 4):**
- §18.8.1 (line ~11400-11446) — JS-style match: variant set `V` = the subset set when declared type is a subset; SF-1 dead-arm / vacuous-else; the 3 edge cases (nested / derived-cell / bound-value read `V` from DECLARED type); intra-arm value-narrowing NOT introduced.
- §18.0.1 (line ~10897-10905) — block-form `<match for=Type on=expr>`: narrows IDENTICALLY; reads the **matched-ON value's** declared subset (NOT `for=Type` — `for=Type` is the base enum for arm-tag inference; `on=expr`'s declared type carries the subset).
- §53.15.4 (line ~29698) — the §53.15 summary of Option A (defers to §18.8.1/§18.0.1).
- §18.6 — W-MATCH-001 (unreachable default) over a subset-refined type.
- §34 — `E-MATCH-SUBSET-DEAD-ARM` (line ~16477; the row EXISTS — the FIRE SITE is new; message names excluded variant + subset; DISTINCT from E-TYPE-023 which is duplicate-arm-only).

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` first; follow §"Task-Shape Routing" (compiler-source type-system + SYM feature). Map currency: baseline `c665714c` (S154-era), STALE — `type-system.ts` + `symbol-table.ts` touched since (incl. batch-1 `bfc50545`). Verify fire-sites against HEAD `bfc50545`; anchors below PA-surveyed at `bfc50545`. Final report: "Maps consulted: [..]; load-bearing finding: <one sentence>" or "not load-bearing."

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup (BEFORE any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. `git merge main` (base may be stale; current main = batch 1 `bfc50545`). Report if conflict.
4. `git status --short` clean.
5. `bun install`.
6. `bun run pretest`.
If any fails: STOP.

## Path discipline (EVERY edit)
- Apply ALL edits via **Bash** (`perl`/`python`/heredoc) on **worktree-absolute paths including `.claude/worktrees/agent-<id>/`** — NOT Edit/Write (S126). Echo path before each write; re-verify via `git diff`/`grep`.
- **NEVER `cd` into the main repo.** `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only.

## Commit discipline (S83) — note the batch-1 slip
- Commit after each meaningful change. First commit: `WIP(dA-b2): start at <pwd>`.
- **NEVER use `git commit --no-verify`.** The pre-commit hook IS the quality gate (a prior batch used `--no-verify` in error — don't repeat). If a commit appears to need `--no-verify` (hook failing), STOP and report the failure — do not bypass.
- `git status` clean before reporting DONE. Coupled code+test = one commit.
- Update `docs/changes/s156-dA-batch2-enum-subset-exhaustiveness/progress.md` per step.
Report: WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED, deferred-items, Phase-2/3 results.

---

# THE TASK — narrow match exhaustiveness to the subset, BOTH loci

When the matched value's **declared type** is an enum-subset `PredicatedType` (batch-1's `enumBase` + `subsetVariants`), exhaustiveness is computed against `subsetVariants`, NOT the base enum's full variant set (Option A, §53.15.4).

## Deliverables (per §18.8.1 / §18.0.1 + SF-1)
1. **JS-style match (§18.8.1):** `checkEnumExhaustiveness` (`type-system.ts:8826`) computes `allVariants` from `enumType.variants` (the FULL set). When the matched value's declared type is a subset, the variant set MUST be `subsetVariants`. Thread the subset info from the matched-expr's resolved declared type to the checker + its TS-C caller (the entry that emits E-TYPE-020 / E-TYPE-023 / W-MATCH-001, ~`type-system.ts:9452`/9476). A `match` covering exactly `subsetVariants` is exhaustive (no `else`/`_` needed).
2. **Block-form match (§18.0.1):** the `E-MATCH-NOT-EXHAUSTIVE` fire site is `symbol-table.ts:~10551` (block-form `<match for=Type on=expr>` SYM PASS; variant-set computed via `match-statechild-parser.ts`). Narrow IDENTICALLY using the **`on=expr` declared type's** subset (NOT `for=Type`, which stays the base enum for arm-tag inference). A `<match>` covering exactly the subset is exhaustive (no `<_>` needed).
3. **SF-1 dead-arm (NEW fire — both loci):** a concrete arm naming a variant that IS in the base enum but NOT in `subsetVariants` → **E-MATCH-SUBSET-DEAD-ARM** (§34 row exists; message names the excluded variant + the subset). This is DISTINCT from E-TYPE-023 (duplicate arm names the SAME variant twice) and from E-TYPE-020/E-MATCH-NOT-EXHAUSTIVE (missing arm). Do NOT reuse E-TYPE-023 (would emit a false "duplicate" message).
4. **SF-1 vacuous-else (REUSE):** a wildcard (`else`/`_` JS-style; `<_>` block-form) over a fully-covered subset → **W-MATCH-001** (already the "unreachable default" warning; it auto-fires once the variant set is the subset — `unreachableWildcard` in `checkEnumExhaustiveness` already computes `coveredVariants.size >= allVariants.size`, so narrowing `allVariants` to the subset makes it fire correctly. Verify the block-form path emits the equivalent).
5. **Edge cases (§18.8.1) — `V` ALWAYS from the matched value's DECLARED type, never a flow-narrowed type:** (i) nested match (match inside an arm over a still-subset-typed value reads the inner value's declared subset); (ii) match on a derived `const` cell whose declared type carries the subset; (iii) bound-value (matched expr bound to a name) reads the binding's declared type.
6. **Intra-arm value-narrowing NOT introduced** — inside an arm the matched value keeps its declared type; Option A narrows only the exhaustiveness SET. Do not add singleton-subset narrowing.

## Crux
The mechanical core is small (swap `allVariants` source to `subsetVariants` when the declared type is a subset; add the dead-arm classification). The WORK is threading the matched value's resolved DECLARED type (the subset `PredicatedType`) to each exhaustiveness checker at both loci — JS-style (the `match expr` type resolution → checker) and block-form (the `on=expr` type resolution in the SYM pass). Survey how each checker currently obtains the enum type; the subset is reached the same way (the resolved type is now a `PredicatedType` with `enumBase`+`subsetVariants` instead of a bare `EnumType`).

## OUT OF SCOPE (later batches / deferred — do NOT touch)
- schemaFor subset CHECK (§41.15.6) + validator `.OneOfFailed(set)` (§55.1/§55.9) → batch 3.
- Constructor-form `Type{…}` + fn-return-annotation bare-variant enforcement (Bug 66) → batch 4.
- engine `for=` subset (§53.15.7) — deferred.
- **Full-enum (non-subset) match behavior MUST be unchanged** — E-TYPE-020 / E-MATCH-NOT-EXHAUSTIVE still require all base variants when the declared type is the full enum. Only subset-typed matches narrow.

---

# PHASES

## Phase 0 — survey + STOP-if-mismatch
Confirm both fire sites + how each checker obtains the matched value's type, against current source. Confirm batch-1's `subsetVariants`/`enumBase` is reachable on the resolved declared type at each checker. If the threading is materially harder than "the resolved type is now a PredicatedType" (e.g. the checker only ever sees a bare EnumType and the subset is stripped upstream), STOP and report the real shape + proposed approach BEFORE editing.

## Phase 1 — implement (both loci)
Deliverables 1-6. Reuse `checkEnumExhaustiveness`'s structure (extend its variant-set source + add dead-arm detection); mirror for the block-form SYM path. Keep full-enum matches + union matches (§18.8.2) + substate matches (§54.4) UNCHANGED.

## Phase 2 — tests
Unit tests (`compiler/tests/unit/`): JS-style subset match exhaustive-without-else; JS-style dead-arm → E-MATCH-SUBSET-DEAD-ARM (message names excluded variant + subset); JS-style vacuous-else → W-MATCH-001; block-form `<match for=Type on=@subsetCell>` parity for all three; full-enum match still requires all variants (no regression); notIn-complement subset narrows correctly; nested/derived-cell/bound-value edge cases read declared type. Run FULL suite (`bun test compiler/tests`) — 0 regressions (baseline `bfc50545` = 22,705 pass / 0 fail).

## Phase 3 — empirical compile-probe verification
Author probe `.scrml` files and compile via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <probe> --output-dir <tmp>`. Assert: (a) a `match` over a `oneOf([.Admin,.Editor])`-typed value covering only `.Admin`/`.Editor` (no else) → compiles CLEAN (exhaustive); (b) adding a `.Viewer` arm → E-MATCH-SUBSET-DEAD-ARM naming `.Viewer` + the subset; (c) adding an `else` to the fully-covered subset match → W-MATCH-001; (d) block-form `<match for=Role on=@subsetCell>` exhibits the same (a)/(b)/(c); (e) a full-`Role`-typed match still fires E-TYPE-020/E-MATCH-NOT-EXHAUSTIVE if a variant is missing (no regression). Report probe outputs. **DO NOT mark DONE without Phase 3 passing + 0 full-suite regressions.**
