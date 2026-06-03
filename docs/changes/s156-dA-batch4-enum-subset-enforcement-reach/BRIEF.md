# BRIEF — (d)-A batch 4 (CLOSING): enum-subset enforcement reaches the canonical call sites — constructor-form `Type{…}` (b) + fn-return annotation (a) + member-access `on=@p.role` block-form (c)

**change-id:** `s156-dA-batch4-enum-subset-enforcement-reach`
**severity:** feature impl (parser + type-system + SYM) · **agent:** scrml-js-codegen-engineer · **isolation:** worktree
**arc:** (d)-A enum-subset refinement — the CLOSING batch. **batch 1 `bfc50545`** (type-system foundation — `PredicatedType.subsetVariants`/`enumBase`, READ them), **batch 2 `7a3c018f`** (exhaustiveness), **batch 3 `0097d5b0`** (schemaFor). THIS = batch 4: make subset (and plain-enum) bare-variant enforcement REACH the canonical adopter shapes that batches 1-3 left unenforced. Three sub-deliverables (Bug 66 a+b + the user-folded member-access c).

**SPEC authority (read IN FULL via `offset:`+`limit:` — PA Rule 4):**
- §53.15.1 (line ~29631) — the canonical forms: subset PARAM (`fn promote(r: Role oneOf([.Editor]))`), subset RETURN (`fn assignRole() Role oneOf([.Admin,.Editor])`), subset STRUCT FIELD (`role: Role oneOf([.Admin,.Editor])`).
- §53.15.2 (line ~29661) — the three-zone table; **its CANONICAL static-zone example uses the struct-CONSTRUCTOR form** `const ok = Post { title:"x", role: .Admin }` (OK) / `const bad = Post { … role: .Viewer }` (COMPILE ERROR E-CONTRACT-001). Deliverable (b) MUST make this example fire.
- §18.0.1 (line ~10897) — block-form `<match for=Type on=expr>` reads the matched-ON value's declared subset. Deliverable (c) extends this to a member-access `on=@p.role` subject (the field's subset).
- §14.10 + PRIMER §13.7 B20 specifics — bare-variant inference + B20's DEFERRED positions (constructor / fn-param / fn-return). (a)+(b) close those deferred positions for both subset AND plain-enum typos.
- §34 — E-CONTRACT-001 (static out-of-subset, REUSE) + E-VARIANT-AMBIGUOUS / E-TYPE-063 (plain-enum bare-variant — already exist).

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` first; §"Task-Shape Routing" (compiler-source: parser + type-system + SYM). Map currency: baseline `c665714c` (S154-era), STALE — `ast-builder.js` / `type-system.ts` / `symbol-table.ts` all touched since. Verify ALL fire-sites against HEAD `0097d5b0`; the anchors below are PA-surveyed at an earlier commit and WILL have shifted — treat them as starting hypotheses. Final report: maps load-bearing finding or "not load-bearing."

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup (BEFORE any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. `git merge main` (current main = batch 3 `0097d5b0`). Report if conflict.
4. `git status --short` clean. 5. `bun install`. 6. `bun run pretest`. If any fails: STOP.

## Path discipline (EVERY edit)
- Apply ALL edits via **Bash** on **worktree-absolute paths including `.claude/worktrees/agent-<id>/`** — NOT Edit/Write (S126). Echo path before each write; re-verify via `git diff`/`grep`.
- **NEVER `cd` into the main repo.** `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only.

## Commit discipline (S83)
- Commit after each meaningful change. First commit: `WIP(dA-b4): start at <pwd>`.
- **NEVER use `git commit --no-verify`.** The pre-commit hook IS the gate. If a commit appears to need it, STOP and report.
- `git status` clean before reporting DONE. Coupled code+test = one commit.
- Update `docs/changes/s156-dA-batch4-enum-subset-enforcement-reach/progress.md` per step.
Report: WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED, deferred-items, Phase-2/3 results.

---

# THE TASK — close enforcement at the canonical call sites

Batch 1 materialized the subset + enforces at the cell + plain-object-literal positions. Batches 2/3 narrow exhaustiveness + schema. But three CANONICAL adopter shapes are still UNENFORCED (pre-existing B20-family + the member-access reach):

## Deliverable (b) — struct-CONSTRUCTOR form `Type{…}` [the headline — §53.15.2's canonical example]
`Post { title: "x", role: .Viewer }` does NOT run bare-variant inference today, even for a plain-enum typo. The plain object-literal form (`const x: Post = { role: .Viewer }`) + typed cell DO fire (type-system.ts has a field-typed object-literal descent ~line 7967 `// Struct context — descend into object-literal properties with field types`). **Route the `Type{…}` constructor-form field values through that same field-typed descent** so `.Viewer` (out-of-subset) → E-CONTRACT-001 (subset) and a plain-enum typo → E-VARIANT-AMBIGUOUS/E-TYPE-063. This makes §53.15.2's worked example actually fire. Survey: find the constructor-form (`TypeName { … }`) AST node + why it bypasses the object-literal field-descent; mirror the working path.

## Deliverable (a) — fn-return annotation reaches resolveTypeExpr
`ast-builder.js` DOES capture `returnTypeAnnotation` (~line 6050) and type-system calls `inferBareVariantsInExpr` on return exprs (~line 6840). The gap (batch-1 finding): a MULTI-TOKEN return annotation `Role oneOf([.Admin,.Editor])` never reaches `resolveTypeExpr`, so the subset doesn't materialize on the return type + return-variant enforcement doesn't apply. **Survey** whether the capture truncates the multi-token annotation OR `resolveTypeExpr` isn't called on it; make the full annotation resolve so a subset return type materializes (batch-1's recognizer applies) + an out-of-subset `return .Viewer` fires E-CONTRACT-001.

## Deliverable (c) — member-access `on=@p.role` block-form subset reach [user-folded]
batch 2's block-form pass (`symbol-table.ts` `collectSubsetCells` ~10447 + `validateMatchBlock`) resolves the subset from a top-level CELL's typeAnnotation, keyed by cell name. A member-access subject `<match for=Role on=@p.role>` where `p: Post` and `Post.role: Role oneOf([…])` does NOT reach the field's subset (it's a struct-field property, not a top-level cell) → falls through to full-enum exhaustiveness. **Resolve `on=@p.role`'s declared field type** (p's struct type → the `role` field's subset refinement) in the block-form pass so exhaustiveness narrows + E-MATCH-SUBSET-DEAD-ARM fires for the member-access subject. NOTE: this is string-based SYM (no scope chain) — the meatier of the three; survey how `p`'s declared struct type is reachable in the SYM pass.

## OUT OF SCOPE (do NOT touch — file-only / deferred)
- Bug 67 (match-in-fn-body not parsed) — SEPARATE parser gap; (a) touches the same fn-signature region but Bug 67 (match AS a fn-body return) is broader. If (a)'s work naturally helps Bug 67, NOTE it — do NOT scope-creep into it.
- Bug 68 (positional-payload enum schemaFor classify) — separate.
- Bug 69 (tableFor §41.16.6 subset reach) — separate (NOT folded into batch 4 per the user; member-access c IS folded, tableFor is NOT).
- engine `for=` subset (§53.15.7) — deferred.
- Non-subset / full-enum behavior at all three positions MUST be unchanged EXCEPT that (a)/(b) NOW enforce plain-enum bare-variant typos at the constructor + fn-return positions where they previously didn't (this is the intended B20-deferred-position close — a plain-enum `.Bogus` typo SHOULD now fire E-VARIANT-AMBIGUOUS/E-TYPE-063; verify this is correct, not a regression — it's closing a known under-enforcement).

---

# PHASES

## Phase 0 — survey + STOP / SPLIT-proposal
Survey all three fire sites against HEAD `0097d5b0`. **This batch has 3 sub-deliverables across 3 subsystems (parser + type-system + SYM).** If the survey shows any one is materially bigger than expected OR the three don't share enough to be one coherent batch, STOP and propose a SPLIT (e.g. b4a = constructor+fn-return [type-system/parser], b4b = member-access [SYM]) before editing. Otherwise proceed. Also confirm (b)'s "plain-enum typo now fires at constructor form" is the intended close (not a surprise regression) — it closes B20's deferred position.

## Phase 1 — implement
(b) + (a) + (c). Reuse the field-typed object-literal descent (b), batch-1's recognizer (a), batch-2's block-form subset logic (c). Keep cell + plain-object-literal + full-enum behavior intact.

## Phase 2 — tests
Unit tests for each: (b) `Post { role: .Viewer }` → E-CONTRACT-001 + plain-enum typo → E-VARIANT-AMBIGUOUS/E-TYPE-063; valid `Post { role: .Admin }` clean. (a) fn subset return `return .Viewer` → E-CONTRACT-001; valid clean. (c) `<match for=Role on=@p.role>` narrows to the field subset (dead-arm fires, exhaustive-without-`<_>`). Full suite (`bun test compiler/tests`) — 0 regressions (baseline `0097d5b0` = 22,737 pass / 0 fail).

## Phase 3 — empirical compile-probes
Author probes + compile via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <probe> --output-dir <tmp>`. Assert: (b) §53.15.2's CANONICAL `const bad = Post { title:"x", role: .Viewer }` → E-CONTRACT-001 naming `.Viewer` + subset; `const ok = Post { … role: .Admin }` → clean; (a) a subset-return fn with `return <out-of-subset>` → E-CONTRACT-001; (c) `<match for=Role on=@post.role>` over a subset field, covering only the subset variants, no `<_>` → clean (exhaustive), + a dead-variant arm → E-MATCH-SUBSET-DEAD-ARM. Report outputs. **DO NOT mark DONE without Phase 3 passing + 0 full-suite regressions.**

This batch CLOSES the (d)-A arc — after it lands, enum-subset refinement is enforced end-to-end at type / match (both loci) / schema / construction / fn-boundary / member-access-match.
