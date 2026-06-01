# Progress — scrml-dev-watcher-and-stale-entry-2026-06-01

Change: fix two `scrml dev` bugs in compiler/src/commands/dev.js. Dev-tooling only.

## Step log (append-only)

- 2026-06-01 start. Worktree base merged main → b08f44df (fast-forward). bun install + pretest OK.
- Read primary.map.md (high-level; no dev.js detail → verified against source directly).
- Read dev.js (596L) + dev-hot-reload.test.js (298L) + api.js gatheredFiles trace.
- Confirmed: api.js line 758 `inputFiles = resolvedInputFiles` (gathered closure);
  result.gatheredFiles = full resolved transitive .scrml set (entry + imports). So the
  watch set can derive DIRECTLY from this set, per-file (bounded, never node_modules).
- Plan: extract two exported pure helpers (deriveWatchFiles, resolveRootEntryCandidate)
  for unit testability; wire into runDev/buildServeConfig; per-file fs.watch with
  try/catch + error handler (ENOSPC graceful degradation).

- IMPL DONE (commit 006ebd3b): dev.js
  * import basename from path
  * deriveWatchFiles(opts, gatheredFiles) — bounded per-file .scrml set, de-duped, no node_modules
  * resolveRootEntryCandidate(opts, serveDir) — single-input <entryBase>.html preference; "" for multi/zero
  * buildServeConfig root `/`: prefer entry candidate BEFORE first-.html readdir fallback
  * runDev: per-file fs.watch via watchFile() — try/catch + w.on("error") + ENOSPC hint (warn-once); re-gather adds NEW file watches dynamically
- EMPIRICAL (all green, repro at WORKTREE_ROOT next to node_modules):
  * watcher no-crash: server ALIVE, curl / => 200 + entry HTML; inotify descriptors held = 2 (req.scrml + its parent dir), node_modules NOT watched (inode cross-check empty). Old recursive code would attempt 60k+.
  * hot-reload: edit .scrml => "Change detected — recompiling" + curl / shows edited content.
  * entry-preference: stale aaa-stale.html (sorts before req.html) ignored; curl / serves req entry.
- TESTS: extended dev-hot-reload.test.js §15-§17 (10 new). 28 pass / 0 fail.
- NEXT: full pre-commit subset; commit test; final report.
