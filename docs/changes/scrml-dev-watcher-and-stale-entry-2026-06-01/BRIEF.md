# BRIEF — two `scrml dev` bugs (watcher inotify-crash + stale-entry serve)

> Archived per pa.md S136. Dispatched S152 2026-06-01 as `isolation:worktree` + `run_in_background` to `scrml-js-codegen-engineer` (opus). Agent ID `a952035b68b7cf859`. Surfaced empirically S152 (user's `scrml dev req.scrml` blank page). File-disjoint from the concurrent #6 fix. Verbatim `prompt:` below.

---

# TASK: fix two `scrml dev` bugs (change-id: `scrml-dev-watcher-and-stale-entry-2026-06-01`)

Both bugs are in `compiler/src/commands/dev.js` (596 lines). They were surfaced empirically this session (S152): a user ran `scrml dev <file>` from a large parent directory and got a blank page. Root causes confirmed by PA. **This is dev-tooling only — do NOT touch codegen / AST / the compile pipeline.** Note: another agent is concurrently editing `runtime-template.js` / `emit-client.ts` / `index.ts` / `module-resolver.js` — you MUST NOT touch those files; your scope is `dev.js` + its test.

## MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; follow §"Task-Shape Routing" for a CLI/dev-server fix. Maps reflect HEAD `09f74bee` (2026-05-31); verify `dev.js` against current source (HEAD `b08f44df`).

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99/S126)
Worktree path assigned by harness.
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo, STOP + report (S90). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. 3. `git status --short` clean. 4. `git merge main` if base looks stale. 5. `bun install`. 6. `bun run pretest`.
- Apply ALL edits via Bash (perl/python/heredoc) on WORKTREE_ROOT-absolute paths incl. the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write tools (they leak into MAIN). Echo path before each write; `git diff` after.
- NEVER `cd` into the main repo. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths.
First commit message includes verbatim `pwd`: `WIP(dev-fix): start at <pwd>`. Commit per-fix; `git status` clean before DONE; write `docs/changes/scrml-dev-watcher-and-stale-entry-2026-06-01/progress.md` per step.

# BUG 1 — the watcher crashes the dev server on an inotify watch-limit (the blank-page cause)
`dev.js:590-592`:
```js
for (const dir of dirsToWatch) {
  watch(dir, { recursive: true }, scheduleRecompile);
}
```
`dirsToWatch` (line 542-547) = `dirname(inputFile)` + `dirname(gatheredFile)`. When `scrml dev /home/.../masterScrml/req.scrml` runs, `dirname` = the big parent (`masterScrml`, which contains sibling repos + every `node_modules` + `.git` + `.claude/worktrees`). `watch(dir, {recursive:true})` then registers an inotify watch for EVERY file in that whole tree → blows `fs.inotify.max_user_watches` (65536 here) → the kernel emits `ENOSPC` ("no space left on device" — the misleading message for *watch descriptors*, NOT disk; disk is 17% full) → the watcher's `error` event is UNHANDLED → uncaught throw → **the dev server process dies**. Nothing serves.

**Fix (both halves):**
1. **Scope the watch to source files, not huge recursive trees.** Watch the bounded set of gathered `.scrml` files DIRECTLY (the known `opts.inputFiles` + `gatheredOut.files` set) rather than `watch(parentDir, {recursive:true})`. `fs.watch(<file>, cb)` per source file registers ONE watch per real source — bounded by source count, never touching `node_modules`/sibling-repos. (`fs.watch` has no ignore-pattern support, so per-file watching is the robust way to exclude `node_modules`; recursive-dir-watch cannot exclude subdirs.) Preserve the existing re-gather-on-recompile (line 557-565) that extends the set on new imports. Acceptable documented limitation: a BRAND-NEW top-level `.scrml` file added to a dir won't be auto-detected until the next recompile/restart (the recursive-dir watch was the bug; per-file is correct). De-dup the file set.
2. **Never let a watch error crash the server.** Wrap each `watch(...)` in try/catch AND attach an `error` handler to the returned watcher (`const w = watch(f, cb); w.on("error", e => { /* warn once, keep serving */ });`). On ENOSPC specifically, print a clear one-line hint (`[dev] file-watch limit hit (fs.inotify.max_user_watches) — hot-reload disabled; raise the limit with: sudo sysctl fs.inotify.max_user_watches=524288`) and CONTINUE serving (graceful degradation — a dead watcher must not kill the server). The server (`Bun.serve` + `await new Promise(()=>{})`) keeps running regardless.

# BUG 2 — root `/` serves a STALE entry (wrong app)
`dev.js:421-469` static-file resolution. For root `/`, `staticPathname` becomes `/index.html` (line 443); when the entry isn't `index.html` (e.g. `scrml dev req.scrml` → `req.html`), the `index.html` candidate misses and resolution falls through to **step 5 "(root only) any/first `.html` file in dist root"** (~line 469+). If `dist/` contains stale output from a PRIOR `scrml dev` of a DIFFERENT source (e.g. a leftover `test.html` next to a fresh `req.html` — `scrml dev` does NOT clean its output dir), step 5 serves the WRONG/stale app. Confirmed: `masterScrml/dist` had both `req.*` (fresh) and `test.*` (stale) → `/` served `test.html`.

**Fix:** for root `/`, PREFER the compiled entry `<basename(opts.inputFiles[0], ".scrml")>.html` in `serveDir` as a resolution candidate BEFORE the "first .html in dist root" fallback. (When dev compiles a single input file, that file's `.html` is the canonical index.) Read the step-5 block (just after line 469) to see the current fallback; insert the entry-preference ahead of it. Multi-input / directory dev mode: keep current behavior when there's no single unambiguous entry (e.g. ≥2 input files) — only the single-input case gets the entry-preference. Do NOT auto-delete stale dist files (too destructive); entry-preference is the safe fix.

# VERIFICATION (empirical — MANDATORY; dev-tooling, so RUN it)
Build a small repro IN your worktree and run the dev server (background it, curl, kill):
1. **Watcher no-crash:** create a `.scrml` in a dir whose tree contains `node_modules` (e.g. directly at WORKTREE_ROOT, which has `node_modules/`). Run `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js dev <that-file> --port <free>` backgrounded; sleep; confirm the process is ALIVE and `curl localhost:<port>/` returns the page (NOT a dead connection). With the OLD code this ENOSPC-crashes; with the fix it serves. Confirm node_modules is NOT in the watch set (e.g. log/inspect dirsToWatch→files). Kill the server.
2. **Entry preference:** in a temp dist, place both `<entry>.html` and a stale `other.html`; run dev for `<entry>.scrml`; `curl /` returns `<entry>.html` content, not `other.html`. (Or assert the resolution candidate order in a unit test.)
3. Compile-smoke: `scrml dev` still hot-reloads on a `.scrml` edit (the watch still fires recompile for a real source change) — confirm a change triggers the "Change detected — recompiling" path.

# TESTS
- Extend `compiler/tests/unit/dev-hot-reload.test.js` (exists): (a) the watch set derives from the gathered `.scrml` files (NOT a recursive parent dir — assert `node_modules` paths are absent); (b) a watch `error`/ENOSPC does not throw out of the watch-setup (mock/inject an error, assert the server-setup survives); (c) root `/` resolution prefers `<entryBase>.html` over a sibling stale `.html`.
- Full pre-commit subset (`bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance`) — 0 regressions.

# REPORT (final message — raw data IS the return value)
- WORKTREE_PATH + BRANCH + FINAL_SHA. FILES_TOUCHED (only `dev.js` + its test + progress.md expected).
- The verification results (watcher-no-crash curl output + the entry-preference curl; the watch-set inspection showing no node_modules).
- The exact watch approach you chose (per-file vs scoped-dir) + why; the entry-resolution candidate insertion.
- Test counts before/after + new tests. Maps feedback line.
- Confirm you did NOT touch `runtime-template.js` / `emit-client.ts` / `index.ts` / `module-resolver.js` (the concurrent #6 agent's files).
- Any path-discipline incident (self-report).
