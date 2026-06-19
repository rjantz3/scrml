# TASK: block-analysis-emit D4 — rewire `scripts/dock.ts` to CONSUME the emitted artifact for `.scrml`

**Change-id:** `block-analysis-emit-2026-06-18`. Your `progress.md` + commits reference this id.

This is the LAST dispatch of the block-analysis-emit arc. D1 (footprint), D2 (builder), D3 (emit wiring — the `--emit-block-analysis` CLI flag that writes `<base>.block-analysis.json` per source file) are ALL LANDED in main. Your job: make `scripts/dock.ts` CONSUME that artifact for `.scrml` files instead of its current thin regex + next-def-boundary heuristic. This is the headline proof of the whole architecture (delta-log S206 [14]): the compiler emits the truth; the tooling consumes it — no second parser, no drift.

Authoritative plan: `docs/changes/block-analysis-emit-2026-06-18/SCOPE-AND-DECOMPOSITION.md` §4 v1.4 + §7 D4 + §intro. This brief is operative; the SCOPE doc is the why.

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full (~100 lines); follow its §"Task-Shape Routing" (this is a tooling-script change consuming a compiler artifact). Map currency: maps reflect HEAD `d12fdef7`, a few commits behind current HEAD `7a2da79c`; `block-analysis*.ts` + the D3 `--emit-block-analysis` wiring are NEWER than the watermark — verify against live source, not the maps. In your report: "Maps consulted: [...]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing — [...]".

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
S99 had FOUR path leaks in one session; S126 had THREE Edit/Bash-divergence leaks. Read fully.

Your worktree is under `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-<id>/`.

## Startup verification (BEFORE any other tool call)
1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If under any OTHER repo, STOP (S90 CWD-routing failure). Save as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` MUST equal `WORKTREE_ROOT`.
3. `git rev-parse HEAD` + `git log -1 --oneline`. You NEED D3 (the `--emit-block-analysis` flag). Confirm it's present: `grep -c "emit-block-analysis" compiler/src/cli.js` MUST be ≥1, and `ls compiler/src/block-analysis.ts compiler/src/block-analysis-footprint.ts` MUST both exist. **If D3 is ABSENT (your base is the session-start commit d12fdef7, pre-D3), run `git merge main`** to pull D3 (HEAD `7a2da79c`). Re-confirm the grep + ls after.
4. `bun install` (worktrees don't inherit node_modules).
5. `bun run pretest` (populates the gitignored browser-test dist).
6. Smoke-test D3's emit BEFORE you start, so you know the artifact shape: pick a real multi-file example with an engine + compound state (e.g. a trucking driver file under `examples/`), run `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <file> --emit-block-analysis -o /tmp/d4-smoke` and `cat` a `.block-analysis.json`. Read `compiler/src/block-analysis.ts` for the EXACT `BlockAnalysisBlock` field names (do NOT hardcode from this brief — verify: `id`, `kind`, `name`, `span:{start,end,line,endLine}`, `reads`, `writes`, `footprintDepth`).

If ANY check fails: STOP and report.

## Path discipline (EVERY edit)
- Apply ALL edits via Bash (`perl`/`python3`/heredoc/`cp`) on worktree-absolute paths including the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write. Echo the path before; `git diff`/`grep` after. (S126: Edit/Write tool calls have leaked to MAIN.)
- NEVER `cd` into the main repo. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"` (and for compile/dock runs, worktree-absolute paths). A `cd` to main leaks (S126 #14/#15).
- perl: `{}` delimiters or escape `/`; heredoc fallback.

# COMMIT DISCIPLINE (S83 + S99)
- Commit after EVERY meaningful edit — don't batch. First commit message embeds your startup `pwd`: `WIP(D4): dock rewire — start at <pwd>`.
- Before DONE: `git status` clean. Update `docs/changes/block-analysis-emit-2026-06-18/progress.md` after each step. Never `--no-verify`.

---

# THE TASK

## The seam — `defsWithExtents(relpath, content)` (dock.ts ~line 274)
This single function feeds BOTH `unitsMode` (~317) and `diffScopeMode` (~327). Today: `const set = relpath.endsWith(".scrml") ? SCRML_DEFS : TS_DEFS;` then regex-extracts raw defs and computes `end` = `next-def-start - 1` (the THIN next-def-boundary heuristic — this is the `bubbleClasses[191..301]` swallow + the b1 coincidental-adjacency residual).

**Rewire ONLY the `.scrml` path:**
- `.scrml` → **artifact-backed.** Obtain the file's `block-analysis.json`, map each block → `DefExt { kind, name, line, end }` using the block's TRUE span: `line = block.span.line`, `end = block.span.endLine` (verify these field names against the smoke-test JSON + `block-analysis.ts`). This replaces both the regex extraction AND the next-def-boundary `end` guess — the artifact's `span.endLine` is the real def end, which is what kills the false-collision.
- `.ts`/`.js`/`.mjs` → **KEEP `TS_DEFS` regex exactly as-is** (the compiler does not parse its own TS; ripping it loses the compiler-source parallel-edit surface — DD §7.1). Do not touch the TS path.
- **Fallback:** if the artifact can't be obtained (compile fails / file absent / JSON parse error), fall back to the existing `SCRML_DEFS` regex path and **log a one-line notice** (e.g. `[dock] block-analysis artifact unavailable for <relpath>; falling back to regex defs`). The regex path stays as the logged safety net — do not delete `SCRML_DEFS`.

## Artifact acquisition — shell out to the WORKTREE compiler (consume the EMIT; dog-foods D3)
Write a helper, e.g. `blockAnalysisDefExts(relpath, absSourcePath): DefExt[] | null`:
1. Compile the file with the worktree compiler to a temp out-dir: `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <absSourcePath> --emit-block-analysis -o <mkdtemp>` (use a UNIQUE temp dir — `mkdtempSync(join(tmpdir(), "dock-ba-"))`; clean it up).
2. Read `<tmpOut>/<base>.block-analysis.json`, `JSON.parse`, map `blocks[]` → `DefExt[]` (sorted by `span.line` to match the existing contract).
3. Return `null` on any failure (caller logs + falls back to regex).

**CRITICAL correctness — compile at the REAL path, NOT an isolated temp copy.** Some blocks (engines especially — `engineMeta` is a SYM-pass product) need the file's imports/sibling types resolvable. Compiling a copied temp file in isolation can fail or drop blocks. So:
- **`unitsMode` + `diffScopeMode`-vs-working-tree** (the `branch === ""` path that reads the on-disk working-tree file): compile the file AT ITS REAL absolute path (`${ROOT}/${relpath}` — but remember NO `cd` to main; pass the worktree-absolute path `$WORKTREE_ROOT/<relpath>`), so imports resolve. This is the headline case (the `messages.scrml` proof).
- **`diffScopeMode`-vs-a-git-ref** (the `gitShow(branch, relpath)` content path): the content is a PAST version; compiling it with imports-at-that-ref is out of v1 scope. Your call, documented in the report: either (a) best-effort materialize+compile and fall back to regex on failure, OR (b) keep the regex path for git-ref content and only use the artifact for the working-tree path. (b) is acceptable for v1 — the headline proof is the working-tree case. State which you chose + why.

## Do NOT touch
- `coverageMode` / `extractDefs` / the `SCRML_DEFS` coverage usage (line ~201, ~222) — D4's scope is `defsWithExtents` (units + diff-scope) only, per SCOPE §7 D4. Leave coverage as-is.
- The `TS_DEFS` path. The compiler source. The block-analysis modules (D1/D2/D3 — consume them, don't edit).

---

# PHASE 3 — MANDATORY R26 EMPIRICAL VERIFICATION (do NOT mark DONE without this)
1. **THE HEADLINE PROOF — `messages.scrml` false-collision GONE.** Find the real trucking `messages.scrml` (the DD/SCOPE cite `bubbleClasses[191..301]`; grep for it). Run `dock --units <messages.scrml>` (and/or a `--diff-scope` that touches its render-markup) BEFORE and AFTER your change. BEFORE (regex): the render-markup region (e.g. `bubbleClasses`) is mis-attributed to the wrong named block via the next-def-boundary guess. AFTER (artifact): the blocks carry their TRUE `span.endLine`, so the markup region is no longer swallowed into an adjacent def. Paste the before/after `dock --units` output showing the fix. If you can't reproduce the BEFORE swallow, say so and show the artifact-backed AFTER is at least correct on true spans.
2. **`.ts` path unchanged.** `dock --units compiler/src/type-system.ts` (or the g-engine-vs-match-alt `--diff-scope --owns` from delta-log S206 [6]) must produce the SAME output as before your change (TS_DEFS untouched). Paste before/after showing identical.
3. **Fallback fires + logs.** Force the artifact-absent case and confirm dock logs the fallback notice + still returns regex defs (degrades, never crashes).
4. **No regressions:** run the pre-commit subset (`bun --cwd "$WORKTREE_ROOT" test compiler/tests/unit compiler/tests/integration compiler/tests/conformance`) — dock.ts isn't compiler-tested, so this just confirms you didn't accidentally touch compiler source; expect unchanged 0-fail.

End-of-Phase-3: DO NOT mark DONE without the headline `messages.scrml` before/after + the `.ts`-unchanged proof + the fallback proof.

---

# FINAL REPORT (your final message IS the data)
- `WORKTREE_PATH:` / `FINAL_SHA:` / `BASE_SHA:` (+ whether you `git merge main`'d to get D3)
- `FILES_TOUCHED:` (worktree-absolute) — expect `scripts/dock.ts` + `progress.md` only
- The git-ref-content decision (a vs b) + why
- R26: paste the `messages.scrml` BEFORE/AFTER `dock --units` (the headline), the `.ts`-unchanged before/after, the fallback-log proof, pre-commit subset result
- The exact `BlockAnalysisBlock` field names you mapped from (verified, not assumed)
- Maps feedback; deferred items / surprises

Commit after each change — don't batch. Update progress.md each step. WIP commits expected. If you crash, commits + progress.md are how the next agent resumes.
