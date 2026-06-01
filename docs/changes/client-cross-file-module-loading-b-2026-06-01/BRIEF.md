# BRIEF — #6 cross-file CLIENT module-loading via `_scrml_modules` registry (Approach B)

> Archived per pa.md S136. Dispatched S152 2026-06-01 as `isolation:worktree` + `run_in_background` to `scrml-js-codegen-engineer` (opus). Agent ID `aa6b1298537be002e`. Authority: `scrml-support/docs/deep-dives/client-cross-file-module-loading-2026-06-01.md` (verdict B, no debate). Verbatim `prompt:` below.

---

# TASK: #6 — cross-file CLIENT module-loading via `_scrml_modules` registry (Approach B) (change-id: `client-cross-file-module-loading-b-2026-06-01`)

You are fixing confirmed known-gaps **#6 (HIGH)**: a multi-file scrml app's emitted `client.js` ships raw ES `import`/`export` into a file loaded as a CLASSIC `<script>`, so it fails to parse ("Cannot use import statement outside a module") and NO client code runs. The fix + design is fully decided — implement **Approach B (a global `_scrml_modules` registry mirroring `_scrml_stdlib`)** per the deep-dive.

## AUTHORITY — READ FIRST
Read the deep-dive in full before any code: `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/client-cross-file-module-loading-2026-06-01.md`. It has the verdict (B, no debate), the A-4 intersection analysis, the trade-off matrix, the 3 open questions WITH resolutions, and the 5-touch-point Implementation Plan + 5-part Test Plan. **This brief is a pointer to that plan — the doc is the spec. Follow its Implementation Plan section (lines ~522-588) exactly; where this brief and the doc agree, the doc wins on detail.**

## MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; follow its §"Task-Shape Routing" for a compiler-source codegen bug fix (codegen + module/import maps). Map currency: maps reflect HEAD `09f74bee` (2026-05-31); `type-system.ts` + `emit-each.ts` were modified after (S151/S152). Verify `emit-client.ts`, `index.ts`, `runtime-template.js`, `module-resolver.js` against current source (HEAD `b08f44df`) — treat maps as hypothesis.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99/S126: 15+ leaks; do NOT be #16)
Worktree path assigned by harness; derive at startup.
## Startup (BEFORE any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo (esp. `scrml-support/.claude/worktrees/`), STOP + report (S90 routing failure). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. `git status --short` clean.
4. `git merge main` if your base looks stale vs main (S112).
5. `bun install` (worktrees don't inherit node_modules — pre-commit `bun test` fails on 'acorn' otherwise).
6. `bun run pretest` (populates `samples/compilation-tests/dist/` for browser tests).
## Path discipline (EVERY edit)
- Apply ALL edits via Bash (perl/python/heredoc/cp) on WORKTREE_ROOT-absolute paths that include the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write tools (they've leaked into MAIN). Echo the path before each write; re-verify via `git diff`/`grep` after.
- NEVER `cd` into the main repo or anywhere. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only.
If any check fails: STOP, report, exit.

# COMMIT DISCIPLINE (S83/S99)
- Commit after EACH meaningful change; WIP commits expected. FIRST commit message includes verbatim `pwd`: `WIP(modules-b): start at <pwd>`.
- Before DONE: `git status` clean. Write `docs/changes/client-cross-file-module-loading-b-2026-06-01/progress.md` (append-only, timestamped) per step.

# THE FIX — Approach B, 5 touch-points (per the deep-dive Implementation Plan; verify line numbers against current source)
1. **Runtime registry** — `runtime-template.js` (~line 150): add `const _scrml_modules = {};` as a sibling to `const _scrml_stdlib = {};`. Tree-shake-gate it like stdlib chunks (`detectRuntimeChunks`/`usedRuntimeChunks`) so single-file apps don't carry it.
2. **Exporter footer** — `emit-client.ts`, new stage after function/enum emit: for any file imported by another `.scrml` in the compile unit (consult `exportRegistry`), emit `_scrml_modules["<stableKey>"] = { <publicName>: <emittedName>, ... };`. Public names from `exportRegistry.get(absPath)`; emitted (possibly-mangled) names from the per-file `fnNameMap` (`emit-functions.ts:419` returns `{ lines, fnNameMap }`); enum/variant objects emitted un-mangled (public name directly).
3. **Importer rewrite** — `emit-client.ts:1050-1064` (the `emit-imports` stage): replace the raw-`import` fall-through for local `.scrml` with the registry-read lowering, EXACTLY mirroring the `scrml:` branch at 1037-1047: `const { <destructured> } = _scrml_modules[<stableKey>];`. Keep `filterChannelImportSpecifiers` (channels stay inlined). Handle `isDefault` via `const <name> = _scrml_modules[key].default;` (Open Q #3 — grep confirms no client-side default `.scrml` exports today; implement the path defensively but it won't be exercised).
4. **Dependency `<script>` emission** — `index.ts:931-938`: the HTML currently emits ONLY the entry's own `<script src>`. Add: for each transitive `.scrml` dependency (from `importGraph` / auto-gather closure), emit a classic `<script src="<dep>.client.js">` BEFORE the entry's script, TOPOLOGICAL order (deps first), dedup via a `Set`. Reuse topo machinery (Kahn's in `cps-batch-planner.ts:245`, or a DFS post-order over `importGraph`). The per-page shell composition (`index.ts:1261-1302`) already does `upToRoot` relative-path rewriting — extend it to dependency scripts.
5. **Exporter `import` strip** — Touch-point 3 handles this automatically (a dependency that itself imports is ALSO an importer; same rewrite). Verify in tests; no separate strip.

**Stable key (Open Q #2 — RESOLVED):** start PATH-RELATIVE (the `.client.js` path the importer already uses, e.g. `"types.client.js"`) to match auto-gather's `absSource` resolution. Leave a comment for the future content-addressed (FNV-1a) hash-key unification with A-4. Importer and exporter MUST agree on the key — derive it identically on both sides (handle the shell-composition `upToRoot` rewrite so a page in a subdir and its dep agree).

**OUT OF SCOPE (Open Q #1 — tracked follow-up, do NOT touch):** the A-4 chunk-payload bare-`import` (`atom-emitter.ts`) is the SAME bug class but gated on `emitPerRoute` (default-OFF). Leave it; PA tracks it as a separate gap that blocks A-4 default-on. Your registry is the foundation A-4 will later register into — keep the registry shape A-4-compatible, but do NOT implement the A-4 path.

# PHASE 3 — EMPIRICAL R26 (MANDATORY — pa.md S138; do NOT mark DONE without it)
Recompile real multi-file adopter sources on your post-fix baseline + assert the symptom is gone:
```
for src in examples/22-multifile/app.scrml /home/bryan-maclee/scrmlMaster/req.scrml ; do
  bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$src" --output-dir /tmp/r26-modb/$(basename "$src" .scrml)
done
# also compile a trucking-dispatch cross-file page (e.g. examples/23-trucking-dispatch/components/load-card.scrml)
```
Then for EVERY emitted `.client.js`:
1. **Browser-faithful parse** — `node -e 'const fs=require("fs"),vm=require("vm"); new vm.Script(fs.readFileSync(F,"utf8"))'` exits 0 (NO "Cannot use import statement outside a module"). `node --check` is a FALSE oracle (auto-detects ESM) — use `vm.Script`.
2. **No raw `import`/`export`** — `grep -E '^\s*(import|export)[ {]' *.client.js` → NONE.
3. **Exporter registers** — the dependency client.js contains `_scrml_modules["..."] = { ... }`.
4. **Importer reads** — the page client.js contains `const { X } = _scrml_modules[...]`.
5. **HTML loads deps** — the page `.html` emits `<script src="<dep>.client.js">` BEFORE the entry script, deps-first.
6. **0 regressions** on single-file examples (the registry tree-shakes out).

`examples/22-multifile` is the canonical repro; `/home/bryan-maclee/scrmlMaster/req.scrml` is a fresh adopter file (a todo) — both MUST go green.

# TESTS (per deep-dive Test Plan — closes the C5 coverage gap)
1. **happy-dom multi-file browser test** (`compiler/tests/browser/browser-multifile-import.test.js`, NEW): compile `examples/22-multifile/app.scrml`; load runtime + `types.client.js` + `components.client.js` + `app.client.js` IN THAT ORDER in the existing IIFE harness; assert no parse error, `_scrml_modules["types.client.js"].badgeColor` (or the actual export) is a function, and the rendered DOM has the team badges. THIS is the scenario that silently miscompiled.
2. **`vm.Script` regression guard** (unit): every emitted `.client.js` for a multi-file compile parses as a classic script.
3. **Exporter-footer assertion** (codegen unit): the dep client.js has the `_scrml_modules[...] = {...}` footer + NO `^import`/`^export`.
4. **Importer-read assertion** (codegen unit): the page client.js has `const { ... } = _scrml_modules[...]` + NO raw `import`.
5. Full pre-commit subset (`bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance`) — 0 regressions. (Do NOT flip VERIFIED.md row 51 — that's a human-verification step PA handles post-landing.)

# REPORT (final message — raw data IS the return value)
- WORKTREE_PATH + BRANCH + FINAL_SHA.
- FILES_TOUCHED (worktree-absolute).
- R26 Phase-3 results (the 6 checks; actual emitted snippets for the registry footer + importer read + the dep `<script>` tags; vm.Script exit codes).
- Test counts before/after + new tests.
- Maps feedback line.
- The stableKey scheme you used + how importer/exporter agree across the shell `upToRoot` rewrite.
- Any deferred items (esp. confirm you did NOT touch the A-4 atom-emitter path).
- Any path-discipline incident (self-report).
