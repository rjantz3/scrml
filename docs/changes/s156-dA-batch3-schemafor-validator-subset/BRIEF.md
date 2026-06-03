# BRIEF — (d)-A batch 3: schemaFor subset CHECK (§41.15.6 + §41.15.8a nullable) + validator `.OneOfFailed(set)` carries the subset (§55.9)

**change-id:** `s156-dA-batch3-schemafor-validator-subset`
**severity:** feature impl (codegen schemaFor + validator) · **agent:** scrml-js-codegen-engineer · **isolation:** worktree
**arc:** (d)-A enum-subset refinement. **batch 1 LANDED `bfc50545`** (materialized `PredicatedType.subsetVariants`/`enumBase` — READ them). **batch 2 LANDED `7a3c018f`** (exhaustiveness). THIS = batch 3 (schemaFor + validator). Remaining: batch 4 (Bug 66 constructor-form + fn-return enforcement + member-access `on=@p.role` subset reach).

**SPEC authority (read IN FULL via `offset:`+`limit:` — PA Rule 4):**
- §41.15.6 (line ~20522-20534) — schemaFor enum-subset override: a subset-refined bare-variant enum field lowers to `oneOf([SUBSET names])` → `CHECK (col IN (subset))`, NOT all base variants. Variant-literal `.Admin` → string `'Admin'`. MANDATORY (L4 "define type once → schema derives").
- §41.15.8a (line ~20546-20556) — nullable: `MyEnum | not` (bare-variant enum) → §41.15.6 `oneOf([...])` form MINUS `req` = NULLABLE `CHECK (col IN (...))`. `req`+`| not` conflict → nullable wins (drop req).
- §55.1 (line ~30128) + §55.9 (line ~30390 `OneOfFailed(set: array)`) + §55 notes (lines ~30149/30153) — `.OneOfFailed(set)` payload carries the SUBSET, not the base enum. State-cell validator `<role oneOf([.Admin,.Editor])>` form.
- §39.5.8 — the `oneOf([…]) → CHECK (col IN (…))` lowering this rides.
- §53.15.5 (line ~29742) — composition: payload-bearing enum subset is valid at type/match/validator BUT schemaFor STILL rejects payload-enum SQL (E-SCHEMAFOR-VARIANT-PAYLOAD-ENUM-V1) — the rejection is about payload, orthogonal to subset.

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` first; §"Task-Shape Routing" (codegen + schema feature → domain/schema maps). Map currency: baseline `c665714c` (S154-era), STALE — verify fire-sites against HEAD `7a3c018f`. Anchors below PA-surveyed at `7a3c018f`. Final report: maps load-bearing finding or "not load-bearing."

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup (BEFORE any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. `git merge main` (current main = batch 2 `7a3c018f`). Report if conflict.
4. `git status --short` clean.
5. `bun install`.
6. `bun run pretest`.
If any fails: STOP.

## Path discipline (EVERY edit)
- Apply ALL edits via **Bash** (`perl`/`python`/heredoc) on **worktree-absolute paths including `.claude/worktrees/agent-<id>/`** — NOT Edit/Write (S126). Echo path before each write; re-verify via `git diff`/`grep`.
- **NEVER `cd` into the main repo.** `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only.

## Commit discipline (S83)
- Commit after each meaningful change. First commit: `WIP(dA-b3): start at <pwd>`.
- **NEVER use `git commit --no-verify`.** The pre-commit hook IS the gate. If a commit appears to need it, STOP and report.
- `git status` clean before reporting DONE. Coupled code+test = one commit.
- Update `docs/changes/s156-dA-batch3-schemafor-validator-subset/progress.md` per step.
Report: WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED, deferred-items, Phase-2/3 results.

---

# THE TASK

## Deliverable 1 — schemaFor subset CHECK (§41.15.6) — the meaty part
`compiler/src/codegen/emit-schema-for.ts` `classifyFieldType` (~line 210, the enum branch ~217-246) captures a bare-variant enum field's variant names at ~line 243 (`names = variants.map(...)` — currently ALL base-enum variants) → emits `text req oneOf([all variants])`. **When the field's declared type is a subset `PredicatedType`** (batch-1's `enumBase` + `subsetVariants`), capture `subsetVariants` instead of all base variants → emit `oneOf([SUBSET names])` → `CHECK (col IN (subset))`. The variant-literal → string lowering (`'Admin'`) is unchanged (mechanical). **Survey first:** confirm the schemaFor type-resolution path passes the subset `PredicatedType` through to `classifyFieldType` (batch 1 materialized it on `resolveTypeExpr`; if the schemaFor walker unwraps/strips the PredicatedType to a bare EnumType before classify, that's the threading work).

## Deliverable 2 — nullable subset (§41.15.8a)
A field typed `MyEnum oneOf([.A,.B]) | not` lowers to the subset `oneOf([...])` form MINUS `req` = NULLABLE `CHECK (col IN (...))`. Compose with the existing `T | not` → nullable-column handling (§41.15.8a) + the subset capture from Deliverable 1. `req`+`| not` conflict → nullable wins (drop req), per §41.15.8a.

## Deliverable 3 — validator `.OneOfFailed(set)` carries the subset (§55.9) — CONFIRM, wire only if gap
The `oneOf` validator (validator-catalog.ts ~line 237, errorTag `OneOfFailed`) already carries its arg-set. **Survey + confirm** that `.OneOfFailed(set)` carries the SUBSET (not the base enum) at BOTH: (a) the state-cell validator form `<role oneOf([.Admin,.Editor])>` (the arg IS the set — likely already correct); (b) a cell whose declared TYPE is a subset refinement (batch-1 `<role>: Role oneOf([.Admin,.Editor])`) — does it get the validity-surface `.OneOfFailed` treatment carrying the subset? If (a) already works and (b) is out of the validity-surface's scope (refinement-type ≠ state-cell-validator — they're distinct enforcement layers per §53.6.2), then Deliverable 3 is a CONFIRM (document the finding) — do NOT manufacture work. If there's a real gap, wire it minimally. Report which.

## OUT OF SCOPE (batch 4 / done / deferred — do NOT touch)
- Constructor-form `Type{…}` + fn-return enforcement (Bug 66) + member-access `on=@p.role` subset reach → batch 4.
- Match exhaustiveness (§18.8.1/§18.0.1) → DONE batch 2 (do not re-touch).
- engine `for=` subset (§53.15.7) — deferred.
- Payload-bearing enum schemaFor rejection (E-SCHEMAFOR-VARIANT-PAYLOAD-ENUM-V1) — UNCHANGED (the rejection is about payload, orthogonal to subset; a payload-enum subset still rejects).
- Non-subset (full-enum) schemaFor lowering MUST be unchanged (full-enum field still emits `oneOf([ALL variants])`).

---

# PHASES

## Phase 0 — survey + STOP-if-mismatch
Confirm: (1) the schemaFor walker passes the subset `PredicatedType` to `classifyFieldType` (or where it strips it); (2) the validator `.OneOfFailed` set-carrying behavior at both forms (Deliverable 3 — is it confirm or wire?). If the threading is materially different OR Deliverable 3 is wholly already-correct, report before editing.

## Phase 1 — implement
Deliverables 1 + 2 (+ 3 if a real gap). Reuse the existing `oneOf → CHECK IN` lowering + the `T | not` nullable handling — feed them the subset. Keep full-enum schemaFor + payload-enum rejection + nested-struct/no-SQL-mapping rejections UNCHANGED.

## Phase 2 — tests
Unit tests: schemaFor of a struct with a subset-refined enum field → DDL `CHECK (col IN ('Admin','Editor'))` (subset, NOT all 3); nullable subset (`MyEnum oneOf([.A]) | not`) → nullable CHECK minus NOT NULL; full-enum field still → all variants (no regression); notIn-complement subset; payload-enum subset still rejects E-SCHEMAFOR-VARIANT-PAYLOAD-ENUM-V1; Deliverable-3 validator finding (test or documented). Run FULL suite (`bun test compiler/tests`) — 0 regressions (baseline `7a3c018f` = 22,719 pass / 0 fail).

## Phase 3 — empirical probe verification (codegen — schemaFor emits SQL DDL)
Author a probe `.scrml` with `<schema>${ schemaFor(PostWithSubsetEnumField) }</>` (subset-refined enum field) + compile via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <probe> --output-dir <tmp>`. Assert: (a) emitted DDL/output contains `CHECK (... IN ('Admin', 'Editor'))` — the SUBSET, NOT all base variants; (b) nullable subset → nullable (no NOT NULL) subset CHECK; (c) `node --check` clean on any emitted JS; (d) a full-enum field still emits all variants (no regression). Report probe outputs. **DO NOT mark DONE without Phase 3 passing + 0 full-suite regressions.**
