# Dispatch BRIEF — match arm-arrow `:>` canonical (compiler-source)

> Archived verbatim per pa.md S136 (BRIEF.md archival). Dispatched S147 (2026-05-30) to `scrml-js-codegen-engineer`, `isolation: "worktree"`, `run_in_background: true`. Agent ID `a033b8f5ef0bd0b98`. SPEC normative core landed first at main `a2930106`.

---

# Task: match arm-arrow `:>` canonical — compiler-source enforcement + migrate rule

**Change-id:** `match-colon-arrow-canonical-2026-05-30`
**Authority:** deep-dive `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/match-arrow-colon-canonical-2026-05-30.md` (ratified S145, user-voice S145). SPEC §18.2 / §19 / §34 normative core ALREADY LANDED on main at commit `a2930106` (your worktree base may predate it — `git merge main` at startup if so; see step 0 below). Read SPEC §18.2 (grammar + alias note + normative statements), §19 alias-note callout, and the §34 rows `W-MATCH-ARROW-LEGACY` + `E-MATCH-ARM-SEPARATOR` before coding.

---

# MAPS — REQUIRED FIRST READ

Before consuming any other context, read `.claude/maps/primary.map.md` in full (~100 lines). Its §"Task-Shape Routing" tells you which additional maps to consult — this is a **compiler-source bug-fix / small-feature** shape (parser + typer/lint + CLI + tests).

Map currency: maps reflect HEAD `948d3f2f` (2026-05-30). The commits since are docs-only (website + this SPEC amendment) — **zero compiler-source changes since the map refresh**, so map content is current for your navigation. If anything seems off, grep/Read current source as ground truth.

Feedback: in your final report, include either "Maps consulted: [list]; load-bearing finding: <one sentence>" or "Maps consulted but not load-bearing — [which map you expected to help but didn't]". The second is fine and valuable.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Step 0 — startup verification (BEFORE any other tool call)

1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it is under any other repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that is the S90 CWD-routing failure. Save the output as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` MUST equal `WORKTREE_ROOT`.
3. `git -C "$WORKTREE_ROOT" merge main` (your worktree base = session-start commit, may be stale; main has the landed SPEC at `a2930106`). Resolve trivially or report if conflicts.
4. `git status --short` — confirm clean post-merge.
5. `bun install` (worktrees do NOT inherit node_modules; the pre-commit hook's `bun test` fails with "cannot find package 'acorn'" otherwise).
6. `bun run pretest` (populates `samples/compilation-tests/dist/` for browser tests; gitignored, empty in fresh worktrees).

If ANY check fails: STOP, report, exit.

## Path discipline (S99/S126 — FOUR-incident leak history; this would be the next incident)

- **Apply ALL file edits via Bash** (`perl -i`, `python`, `cp`, heredoc) on **worktree-absolute paths that include the `.claude/worktrees/agent-<id>/` segment** — NOT the Edit/Write tools. Echo the target path before each write; re-verify via `git diff` / `grep` after. (S126: the Edit/Write tools twice wrote to PRIMARY MAIN while the agent's git view saw the worktree — filesystem divergence. Bash writes go where `pwd`/`git` resolve, sidestepping it.)
- **NEVER `cd` into the main repo or anywhere** — use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively. (S126 incident #14: a `cd <main> && bun add` leaked into main's package.json.)
- Your first commit message MUST include the verbatim `pwd` output, e.g. `WIP(match-colon): start at $(pwd)`.

---

# CONTEXT — what already exists (verified by PA survey, do not re-derive blindly but confirm)

The match/handler arm separator collapses to a single canonical glyph `:>`. **`=>` and `->` become deprecated arm-separator aliases.** Critically: **all three glyphs ALREADY parse, build, and emit byte-identical JS today** — `:>` is live end-to-end. This is NOT a behavioral change. Codegen cost is ZERO. Your job is enforcement + migration, not new behavior.

Verified touchpoints (confirm via Read):
- `compiler/native-parser/parse-expr.js` — `parseMatchArm` (~2682), `isColonArrowAliasAhead` (~2771), `isArmArrowAt` (~2789). `parseMatchArm` already computes a `separator` value ("=>" / ":>" / "->") around line 2690-2708.
- `compiler/native-parser/parse-error-body.js` — `scanErrorArrow` (~227) accepts `->`/`=>`/`:>` for `!{}` handler arms.
- `compiler/src/ast-builder.js` — `isArmArrow` (~2561) recognizes all three; `match-arm-block` nodes built at ~6279/6400/6425/6444. The glyph is currently "normalised away" — you likely need to PRESERVE it on the built node so the lint can fire at the site.
- `compiler/src/type-system.ts` — `checkMatchDiagnostics` (~8522) is where `E-MATCH-ARM-SEPARATOR` fires; it is the natural sibling home for the new match-arm lint (you decide; it may also belong in a lint-pass file — survey and pick the cohesive locus).
- `compiler/src/commands/migrate.js` (~2153 LOC) — existing regex-based `applyMigrations(source)` rewrites (whitespace, `<machine>`→`<engine>`, program-shape). Invoked via `compiler/src/cli.js` `migrate` subcommand.

---

# DELIVERABLES (commit per sub-bucket — do NOT batch)

## Sub-bucket 1 — glyph preservation + `W-MATCH-ARROW-LEGACY` lint (PRIMARY)

1. **Preserve the arm-separator glyph on the AST.** Wherever match-arm and `!{}` handler-arm nodes are constructed, record which glyph the source used (`:>` | `=>` | `->`) on the node (e.g. a `separator` / `armArrow` field). Thread the value the parser already computes through to the built node. Do NOT change which glyphs parse — all three still parse.
2. **Emit `W-MATCH-ARROW-LEGACY`** (info-level) at every match-arm AND `!{}` handler-arm whose recorded glyph is `=>` or `->` (NOT `:>`). The lint is **ARM-CONTEXT-SCOPED**: it fires ONLY at the arm-separator position. It MUST NOT fire on `=>` used as an arrow-function glyph anywhere else, nor on `->` used as a `fn` return-type separator or a legacy `<machine>` event-arrow. Diagnostic message: name the location, state the canonical form `:>`, suggest `bun scrml migrate --fix`, cross-ref §18.2 / §34. **Mirror the existing `W-LIFECYCLE-LEGACY-ARROW` template** (search the codebase for how that info-lint is emitted + shaped — same `->`→`to` deprecation pattern; replicate its severity, message shape, and diagnostic-stream partition). Ensure it lands in `result.warnings` (info-level partition per the S93 diagnostic-stream rule), NOT `result.errors`.
3. Add `W-MATCH-ARROW-LEGACY` to wherever error/lint codes are catalogued in code (ERROR_DESCRIPTIONS / lint registries / getErrorSource families — grep how `W-LIFECYCLE-LEGACY-ARROW` is registered and replicate).

## Sub-bucket 2 — `bun scrml migrate --fix` arm-arrow rewrite (SECONDARY — park if it proves hard)

4. Add an arm-arrow→`:>` rewrite to the `migrate` command. **It MUST be AST/parser-position-driven, NOT a regex text-replace** — `=>` is the arrow-function glyph (33k+ uses) and `->` is the `fn` return separator; a blind text replace would destroy every lambda and fn signature. Use the native parser's arm-position information (the same recognition `parseMatchArm` / `isArmArrowAt` / `scanErrorArrow` use) to locate ONLY arm-separator `=>`/`->` occurrences and rewrite them to `:>`. The existing `applyMigrations` regex rules in migrate.js are the wrong tool for THIS rule (they're fine for `<machine>`→`<engine>`); add a separate parser-position-aware pass. Wire it to a `--fix` flag (or fold into the default migrate run with the other rewrites — match how migrate.js's existing options like `--program-shape` gate their rewrites; pick the cohesive choice and document it). If this sub-bucket proves materially harder than ~1-2h, COMMIT sub-bucket 1, report sub-bucket 2 as PARKED with your findings, and stop — do not let it block the lint landing.

## Sub-bucket 3 — tests

5. Unit tests: glyph preserved on the node for each of the three forms; `W-MATCH-ARROW-LEGACY` fires for `=>` and `->` arms (match block-form, JS-style value-match, AND `!{}` handler arms), does NOT fire for `:>` arms, and does NOT fire on a non-arm `=>` (arrow-function) or non-arm `->` (fn return / machine arrow) in the same file. If sub-bucket 2 landed: a migrate test showing `=>`/`->` arms → `:>` while lambdas/fn-returns are untouched.
6. Run the FULL pre-commit suite (`bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance`) at EACH sub-bucket — adjacent match/handler shapes are well-covered and will catch over-broad lint scoping. Zero regressions is the contract.

---

# EMPIRICAL VERIFICATION (before reporting DONE)

Write a tiny `.scrml` with a value-`match` using `=>` arms + a `!{}` handler using `->` arms + (separately) an arrow-function `(x) => x` and a `fn f() -> int`. Compile it via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <file> --output-dir /tmp/match-colon-verify`. Confirm:
- `W-MATCH-ARROW-LEGACY` info-lint fires for the `=>` match arms + the `->` handler arms (count matches arm count).
- It does NOT fire on the arrow-function or the fn-return arrow.
- Compile is exit-0 (info-level is non-fatal); emitted JS passes `node --check`.
- If sub-bucket 2 landed: rerun with `migrate --fix` on the file, confirm arms become `:>`, recompile → zero `W-MATCH-ARROW-LEGACY`, and the emitted JS is byte-identical to the pre-migrate emit (`diff` the two client.js — they MUST match; this is the zero-codegen-cost invariant).

Report the exact commands + output in your final report. DO NOT mark DONE without this empirical check passing for sub-bucket 1.

---

# COMMIT DISCIPLINE (S83 — two-sided rule)

- After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>` to verify; `git -C "$WORKTREE_ROOT" add <file>`; commit IMMEDIATELY. Commit per sub-bucket. WIP commits expected.
- Before reporting DONE: `git -C "$WORKTREE_ROOT" status` MUST be clean. "work in worktree, no commits" is NOT an acceptable terminal report.
- Update `docs/changes/match-colon-arrow-canonical-2026-05-30/progress.md` after each step (append-only, timestamped: what was done, what's next, blockers). If you crash, your commits + progress.md are how the next agent resumes.

---

# FINAL REPORT (return as your last message — this IS the data, not a human-facing summary)

- `WORKTREE_PATH` (verbatim pwd) + `FINAL_SHA` (`git -C "$WORKTREE_ROOT" rev-parse HEAD`) + the branch name.
- `FILES_TOUCHED` list.
- Per sub-bucket: DONE / PARKED (+ why) / findings.
- Empirical verification commands + output.
- Test deltas (pass/skip/fail before + after).
- Maps feedback line.
- Any deferred items / surprises / SPEC-vs-code drift you noticed.
