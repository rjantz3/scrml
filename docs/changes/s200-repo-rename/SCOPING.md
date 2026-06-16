# S200 — repo rename: `scrmlTS` → `scrml`, `scrml` → `scrml-native`

**Ratified S199 (user); executing S200.** `scrml` (pure self-host) → **`scrml-native`**; `scrmlTS` (working compiler — the artifact adopters use through v1.0) → **`scrml`** (the public canonical name). Sweep scope = **SURGICAL** (user-ruled): rename forward-looking current-truth + live config + paths; **preserve historical records verbatim** (changelog blocks, hand-offs, user-voice session entries, design-insights, archived BRIEF/progress docs — they correctly say "scrmlTS" as the name at that time). The only history-touch is an *additive* "renamed S200" note in the changelog + master-list.

## Phase status
- **Phase 1 — GitHub repo renames (USER, web UI): ✅ DONE** (`bryanmaclee/scrml`→`scrml-native`, `bryanmaclee/scrmlTS`→`scrml`). GitHub auto-redirects old URLs.
- **Phase 2 — local switchover (USER runs the script, then reopens Claude): script ready** at `/home/bryan-maclee/scrmlMaster/RENAME-S200-switchover.sh`. It does: dir renames (self-host first) · `git remote set-url` ×2 · memory-slug `mv` (`-scrmlTS`→`-scrml`; self-host has none) · path-discipline-hook `sed`. **Cannot be done from inside the scrmlTS-keyed session** (self-rename breaks harness CWD + memory slug). After it runs → reopen Claude in `/home/bryan-maclee/scrmlMaster/scrml`.
- **Phase 3 — content sweep (THIS doc; the post-restart session): below.** Runs in the renamed, correctly-keyed `/…/scrml` session; can grep + compile-verify + push.

---

## Phase 3 — content-sweep target list (surgical)

### A. Working-compiler repo (now `/home/bryan-maclee/scrmlMaster/scrml`)
1. `pa.md` (thin pointer) — title + repo-identity prose `scrmlTS`→`scrml`; the pointer target `../scrml-support/pa-scrmlTS.md` → `pa-scrml.md` (per decision **D-a** below).
2. `vpa.md` (boot pointer) — same treatment; pointer `../scrml-support/vpa-scrmlTS.md` → `vpa-scrml.md`.
3. `master-list.md` — header / repo-name (NOT the historical §0.6 recent-sessions entries).
4. `README.md` — repo name + clone URL (`github.com/bryanmaclee/scrml`) + any "scrmlTS" branding.
5. `package.json` — `"name": "scrmlts"` → `"scrml"`.
6. `.claude/maps/*` — **re-run `project-mapper` cold** (cleanest — regenerates repo-name + paths + watermark) rather than sed.
7. `.claude/settings.local.json` — stale `/…/scrmlTS/` allow-entries → `/…/scrml/` (or regenerate via `/fewer-permission-prompts`). Harmless if skipped (extra prompts only).
8. **Additive history note (the ONLY history touch):** new `docs/changelog.md` S200 dated block "renamed scrmlTS→scrml, scrml→scrml-native (S200, 2026-06-16)" + one line in `master-list.md`.
9. **Verify the build survived the dir move:** grep `compiler/tests/` + `samples/` + `examples/` for hardcoded `/…/scrmlTS/` (a few test fixtures historically hardcoded cwd — see pa.md S78 "test-bind A6-5 hard-coded `/home/bryan-maclee/` cwd"). Fix any that break. Then `bun run test` full suite green.

### B. scrml-support
10. **Decision D-a — rename the live PA-directive sidecar files** (`git mv`, preserves history): `pa-scrmlTS.md`→`pa-scrml.md`, `pa-core-scrmlTS.md`→`pa-core-scrml.md`, `vpa-scrmlTS.md`→`vpa-scrml.md`, `user-voice-scrmlTS.md`→`user-voice-scrml.md`. **Recommend YES** (these are the LIVE directive/log files named for the target repo; the name tracks the repo). Update the pointers in `scrml/pa.md` + `scrml/vpa.md` accordingly. Update *current-truth* "scrmlTS" repo-name refs INSIDE these files (NOT the historical session quotes in user-voice).
11. `master-list.md` (scrml-support's own) — current-truth refs to the scrmlTS repo.
12. `.claude/resource-maps/*` (2 files) — re-run `resource-mapper` or update the scrmlTS path refs.
13. In `pa-scrml.md`: the "Cross-repo references" + outbox-targets — update the SELF path (`scrmlTS`→`scrml`) and the self-host ref (`../scrml` → `../scrml-native`). Sibling paths (giti/6nz/master/scrml-support) UNCHANGED.

### C. ~/.claude (global, per-machine, gitignored — do on EACH machine)
14. `~/.claude/CLAUDE.md` — the auto-memory block references the slug path `…-scrmlMaster-scrmlTS` → `…-scrmlMaster-scrml`.
15. `~/.claude/agents/*` (5 files) — current-truth path refs `/…/scrmlTS/` → `/…/scrml/`.
16. PA auto-memory files (now under `…-scrmlMaster-scrml/memory/`) — surgical: update load-bearing **path** refs (`feedback_path_discipline_hook_installed`, `feedback_agent_isolation_cwd_routing`, `feedback_cwd_slip_after_worktree_dispatch`, etc. that cite `/…/scrmlTS/` paths); PRESERVE the lessons/prose. Update `MEMORY.md` pointers if any cite the path.
17. `~/.claude/hooks/path-discipline.sh` — already done by the Phase-2 script.

### D. Self-host repo (now `scrml-native`)
18. Its ~16 `scrmlTS`-referencing files — current-truth cross-refs to the working compiler → `scrml`; preserve history.

---

## Open sub-decisions (resolve in Phase 3)
- **D-a (above):** rename scrml-support sidecar files `-scrmlTS`→`-scrml`? → recommend YES.
- **D-b:** `package.json` name `"scrmlts"`→`"scrml"` — confirm (the chunks.json `compiler` field per §47.5 is sourced from it; cosmetic, informational).
- **D-c:** settings.local.json — refresh now vs let it accrete extra prompts and regenerate later.

## Verification (Phase 3 done-gate)
1. `bun run test` full suite green in `/…/scrml` (the dir move didn't break fixtures).
2. `grep -rl "scrmlTS" pa.md vpa.md master-list.md README.md package.json` → 0 (current-truth clean; history elsewhere is fine).
3. `grep -rl "scrmlMaster/scrmlTS"` across current-truth docs/config → 0.
4. The S100 path-discipline hook fires on the new `/…/scrml/.claude/worktrees/` path (verify on the next worktree dispatch).
5. Push `scrml` + `scrml-native` + `scrml-support` (the renamed remotes; first push confirms the GitHub rename).

## Cross-machine
The user works on 2 machines. On machine B: run the Phase-2 switchover script (same steps), `git pull` the Phase-3 content commits, and update machine-B-local `~/.claude` (hook + agents + settings + memory slug). The memory slug on machine B is its own `-scrmlTS` dir → `-scrml`.

## Why this couldn't be one session
Self-rename: the live session is keyed to `/…/scrmlTS` (harness CWD root + worktree allocation + path-discipline hook + memory slug derived from the path). Renaming the dir from inside it breaks tool resolution + orphans memory. `gh` is not installed → GitHub rename is a manual user action. Hence: Phase 1 (you) → Phase 2 script (you) + restart → Phase 3 (fresh session).
