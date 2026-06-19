# TASK: block-analysis-emit D3 — emit wiring (`--emit-block-analysis` CLI flag + per-file sidecar)

**Change-id:** `block-analysis-emit-2026-06-18` (matches `docs/changes/block-analysis-emit-2026-06-18/`). Your `progress.md` and commits reference this id.

You are wiring the EMIT layer for a compiler sidecar. D1 (footprint extractor `compiler/src/block-analysis-footprint.ts`) and D2 (builder/serializer `compiler/src/block-analysis.ts`) are ALREADY LANDED in main. Your job is D3 only: add the `--emit-block-analysis` CLI flag and the per-file write-loop, mirroring the existing `--emit-engine-graph` sidecar — WITH ONE DELIBERATE DIVERGENCE (per-file, see §THE DIVERGENCE). Then an integration test + mandatory R26 empirical verification.

The authoritative plan is `docs/changes/block-analysis-emit-2026-06-18/SCOPE-AND-DECOMPOSITION.md` (read §3 schema, §4 v1.3, §7 D3). This brief is the operative spec; the SCOPE doc is the why.

---

# MAPS — REQUIRED FIRST READ

Before consuming any other context, read `.claude/maps/primary.map.md` in full (~100 lines). The §"Task-Shape Routing" section tells you which additional maps to consult; this is a compiler-source bug-fix/feature task — follow that routing.

Map currency: maps reflect HEAD `359a1d83` as of 2026-06-18, and are **~20 commits STALE** (current HEAD is `d12fdef7`). In particular the files you import from — `compiler/src/block-analysis.ts` + `compiler/src/block-analysis-footprint.ts` — are NEW (landed after the map watermark) and will NOT appear in the maps. `api.js` / `commands/compile.js` / `cli.js` were not touched since the watermark. Treat all map content as a starting hypothesis to verify via grep/Read against current source — not ground truth.

Feedback: in your final report include either "Maps consulted: [list]; load-bearing finding: <one sentence>" or "Maps consulted but not load-bearing — [which map you expected to help]." The second is fine and valuable.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

S99 had FOUR path-discipline leaks in one session; S126 had THREE Edit/Bash-divergence leaks. This would be the next incident if you're careless. Read this block fully.

Your worktree path is assigned by the harness under `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-<id>/`.

## Startup verification (do this BEFORE any other tool call)
1. Run `pwd`. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If it is under any OTHER repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that is the S90 CWD-routing failure. Save the output as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` MUST equal `WORKTREE_ROOT`.
3. `git rev-parse HEAD` — confirm base. `git log -1 --oneline` should be at or descend from `d12fdef7` (the merge that includes D1+D2). If your base is BEHIND `d12fdef7`, run `git merge main` (or `git merge d12fdef7`) before starting — you NEED D1+D2's files.
4. Confirm D1+D2's files exist in your worktree: `ls -la compiler/src/block-analysis.ts compiler/src/block-analysis-footprint.ts`. Both MUST be present. If absent, STOP (your base is stale).
5. `bun install` (worktrees do NOT inherit node_modules; the pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise).
6. `bun run pretest` (populates `samples/compilation-tests/dist/` for browser tests; gitignored, empty in fresh worktrees).
7. Baseline: run the suites you'll need green at the end ONCE now to confirm a clean baseline (see Phase 3 for the exact set).

If ANY check fails: DO NOT proceed. Report and exit.

## Path discipline (enforce on EVERY edit)
- **Apply ALL file edits via Bash** (`perl`/`python3`/heredoc/`cp`) on worktree-absolute paths that include the `.claude/worktrees/agent-<id>/` segment — NOT the Edit/Write tools. Echo the target path before each write; re-verify via `git diff`/`grep` after. (S126 interim mitigation — Edit/Write tool calls have leaked to MAIN while git/Bash saw the worktree. Bash writes go where `pwd`/`git` resolve, sidestepping the divergence.)
- **NEVER `cd` into the main repo** (or anywhere outside the worktree). Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively. A `cd` into main leaks installs/compiles/edits into MAIN (S126 incidents #14/#15).
- For perl edits use `{}` delimiters or escape `/`; heredoc-rewrite is the reliable fallback.
- If a path references `/home/bryan-maclee/scrmlMaster/scrml/foo` (main), translate to `$WORKTREE_ROOT/foo` before writing.

# COMMIT DISCIPLINE (S83 two-sided + S99 echo-pwd)
- Commit after EVERY meaningful edit — do NOT batch. WIP commits expected. Crash-recovery depends on it.
- Your FIRST commit message MUST embed your startup `pwd`: e.g. `WIP(D3): emit wiring — start at <paste pwd>`. (PA verifies the recorded pwd starts with the worktree prefix on landing.)
- Before reporting DONE: `git status` MUST be clean (no uncommitted changes). "work in worktree, no commits" is NOT an acceptable terminal report.
- Update `docs/changes/block-analysis-emit-2026-06-18/progress.md` (append-only, timestamped) after each step.
- Never `--no-verify`. The pre-commit hook (~17k-test subset, ~75-120s) WARNS on non-main but must pass.

---

# CONTEXT — what D1+D2 landed (read these first)

- `compiler/src/block-analysis.ts` (D2) — the builder. Public exports (VERIFIED):
  - `buildBlockAnalysisForFile(file, source?) -> BlockAnalysis` (ONE file → `{version, file: relPath, blocks: [...]}`)
  - `buildBlockAnalysis(files) -> BlockAnalysis[]` (one per file, file order)
  - `serializeBlockAnalysis(analysis) -> string` (deterministic JSON, 2-space, trailing `\n`)
  - `buildBlockAnalysisJson(file, source?) -> string` (build+serialize ONE file — the per-file convenience fn)
  - Its OWN doc-comments (lines 428–458) state the design intent: "The emit layer (D3) writes ONE sidecar per source file… the per-file shape is what the write-loop consumes." Honor that.
- `compiler/src/block-analysis-footprint.ts` (D1) — `footprintForBlock(...)`; D2 imports it. You do not touch D1/D2's logic.
- The mirror pattern: `compiler/src/engine-graph.ts` — `buildEngineGraphJson(files)`, wired in `api.js:2551` as `engineGraphJson: () => buildEngineGraphJson(metaFiles)`, written by `commands/compile.js:586-595` under `--emit-engine-graph`, flag parsed at `compile.js:168`, declared in `cli.js:~55`.

# THE DIVERGENCE FROM engine-graph (the ONE correctness trap — read twice)

`engine-graph` MERGES all engines across all files into ONE graph and writes the SAME merged JSON to every `<base>.engine-graph.json` (see compile.js:586-593: one `json`, looped over `inputFiles`).

**block-analysis is PER-FILE.** Each `<base>.block-analysis.json` MUST contain ONLY that source file's blocks (its own `buildBlockAnalysisForFile` result). Do NOT write a merged all-files blob. This is why D2 built `buildBlockAnalysisJson(file, source?)` (per-file) instead of an all-files variant.

So your wiring is NOT a blind copy of the engine-graph write-loop. The clean shape:
1. **api.js (~2551, next to `engineGraphJson`):** surface a per-file accessor. Recommended: `blockAnalyses: () => buildBlockAnalysis(metaFiles)` (returns `BlockAnalysis[]`, each carrying `.file` = relPath). Import `buildBlockAnalysis` (+ `serializeBlockAnalysis` if you serialize in compile.js) from `./block-analysis.ts`. Mirror the lazy-fn style + the explanatory comment block.
2. **commands/compile.js write-loop (after the engine-graph block ~595):** for each input file, write that file's OWN analysis to `<base>.block-analysis.json`. You must MATCH each input file to its analysis. Two viable matches — pick the one you can PROVE correct against the code, and state which in your report:
   - **By identity:** `analyses.find(a => a.file === <relPath of input f>)` — needs the same relPath computation `block-analysis.ts` uses (`relativeFilePath`); robust to ordering.
   - **By order:** zip `inputFiles[i]` ↔ `analyses[i]` IF and ONLY IF you VERIFY `metaFiles` is 1:1 and same-order with `inputFiles` (it may include imported/stdlib files or differ in order — verify before relying on index zip; if unverified, use identity match).
   Honest-empty: a file with no blocks still gets a `{version:1, file:relPath, blocks:[]}` sidecar (mirror engine-graph's honest-empty `{engines:[]}`).
3. **compile.js flag plumbing:** grep `emitEngineGraph` and `--emit-engine-graph` across `cli.js` + `commands/compile.js` + `api.js` and mirror EVERY threading site for `emitBlockAnalysis` / `--emit-block-analysis` (parse at ~168, thread through the call chain ~98/279/409, the destructure). Do not miss a site — a half-threaded flag silently no-ops.
4. **cli.js (~55):** register `--emit-block-analysis` in the flag list/help, mirroring `--emit-engine-graph`.

# NEW TEST
`compiler/tests/integration/emit-block-analysis-integration.test.js` — compile a REAL fixture that has ≥1 of {function, engine, component} (a compound-state engine file is ideal — `_record.engineMeta` is a SYM-pass product, so the fixture must go through the full pipeline, NOT synthesized AST). Assert: (a) `<base>.block-analysis.json` written; (b) it parses; (c) it contains ONLY that file's blocks with correct `id`/`kind`/`span.line`/`reads`/`writes`; (d) a file with no leasable blocks gets honest-empty `blocks:[]`; (e) **byte-determinism** — compile twice, assert byte-identical sidecars. If you compile a multi-file program, assert each file's sidecar is DISTINCT (the per-file proof — this is the regression guard against the merged-blob trap).

---

# PHASE 3 — MANDATORY R26 EMPIRICAL VERIFICATION (do NOT mark DONE without this passing)

Per the S138 R26 doctrine (HIGH-value codegen-adjacent wiring requires empirical end-to-end verification, not just unit tests):

1. **Per-file artifact correctness on REAL adopter source.** Compile a real multi-file example through the worktree CLI with `--emit-block-analysis`, e.g.:
   ```
   bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <a real examples/ multi-file .scrml program> --emit-block-analysis --output-dir /tmp/d3-verify [other flags as needed]
   ```
   Confirm: one `.block-analysis.json` per source file; each contains ONLY its own blocks (open two and confirm they differ); `id` = `<relpath>::<name>`; `span.line`/`endLine` present; `reads`/`writes` are SORTED dotted paths with no `@`. Pick a file with a compound-state cell and confirm the BREAK-1 dotted grain survived (e.g. `quoteForm.originCity` distinct from `quoteForm.weightLbs` in reads/writes if present).
2. **Byte-determinism:** compile the same input twice into two dirs; `diff -r` the sidecars — MUST be identical.
3. **DG-untouched proof (the add-alongside guarantee):** run the body-DG / batch-planner suites and confirm GREEN — they prove D3 didn't perturb the reorder DG:
   ```
   bun --cwd "$WORKTREE_ROOT" test compiler/tests/unit/ext1-m1-2-body-dg-builder* compiler/tests/unit/ext1-m1-3-cps-batch-planner* compiler/tests/unit/batch-planner* compiler/tests/unit/sql-batch-5b-guards* compiler/tests/unit/sql-loop-hoist-detection*
   ```
   (find the exact filenames via `ls compiler/tests/unit/ | grep -E 'ext1-m1|batch-planner|sql-batch|sql-loop'`).
4. **Within-node parity canary:** unrelated to this change (it's a parser classifier, not RW) — but if you edited any fixture, re-baseline per the within-node allowlist instructions and re-run.
5. **FULL suite green (S198 brief-template fix):** run the FULL `bun --cwd "$WORKTREE_ROOT" run test` (NOT just the pre-commit subset — the parity canary + browser/lsp live only in the full suite) and confirm 0 failures before reporting DONE. Record the pass/skip/fail counts.

The Phase-3 block ends with: DO NOT mark DONE without empirical R26 verification (per-file artifact + byte-determinism + DG suites green + full suite green) passing.

---

# FINAL REPORT (return as your final message — this IS the data, not a human note)
- `WORKTREE_PATH:` (your pwd)
- `FINAL_SHA:` (your branch tip)
- `BASE_SHA:` (what you branched from / merged to)
- `FILES_TOUCHED:` (every file, worktree-absolute)
- Which file-match strategy you used (identity vs order) + the proof you verified it
- R26 results: per-file artifact correctness (paste a 2-file diff confirming distinctness), byte-determinism diff result, DG-suite result, FULL suite pass/skip/fail counts
- Maps feedback (per the MAPS block)
- Any deferred items / surprises

Commit after each meaningful change — don't batch. Update `docs/changes/block-analysis-emit-2026-06-18/progress.md` after each step. WIP commits are expected. If you crash, your commits + progress file are how the next agent picks up.
