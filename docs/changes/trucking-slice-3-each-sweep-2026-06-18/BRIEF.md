# BRIEF — Trucking corpus slice 3: the `<each>` sweep
# Dispatched S205 (2026-06-18). Agent: scrml-js-codegen-engineer, isolation:worktree, opus, bg.
# Agent id: a3a475168766ceba8. change-id: trucking-slice-3-each-sweep-2026-06-18.

GOAL: convert Tier-0 `${ for (let x of @coll) { lift <markup/> } }` list-renders → Tier-1 `<each>`
(PRIMER §6.3 / SPEC §17.7) across the 18 trucking files that have them (~30 sites). Dog-food:
exercises `<each>` codegen on the flagship + surfaces compiler bugs.

FULL DISPATCH PROMPT (verbatim) — see the session transcript / this brief mirrors it:
- Startup: F4 worktree-prefix verify · bun install · bun run pretest · absolute-path + Bash-edit
  (S99/S126) discipline · no cd-to-main · first commit echoes pwd.
- Maps-first-read (watermark cc765a5a@2026-06-17; trucking files unchanged since → maps current).
- Required reads: kickstarter-v2 + BRIEFING-ANTI-PATTERNS + PRIMER §6.3 + SPEC §17.7.
- 18 files (all compile clean in-app today): seeds · models/auth · components/{assignment-picker,
  status-picker} · pages/dispatch/{billing,customers,drivers,load-detail,load-new} ·
  pages/driver/{home,hos,load-detail,load-log,messages} · pages/customer/{home,invoices,
  load-detail,loads}.
- Method: `promote --each <file> [--dry-run]` for bare-@cell sites (tool is STANDALONE-STRICT — fails
  on program-scope refs e.g. publishCustomerEvent → HAND-LIFT those). Hand-lift the rest per §6.3
  (in=/of=, @./as name, <empty>, :-shorthand, explicit key=@.id). No behavior change beyond the lift.
- Verify: `compile <file> --output-dir /tmp/...` exits 0 (NO --dry-run — promote-only flag); then
  compile the WHOLE APP (app.scrml) — must stay exit-0 (baseline: clean, 5 warn + 3 ghost-lints);
  node --check a couple emitted .client.js.
- Dog-food: file (don't fix) any real compiler bug a valid `<each>` surfaces; leave that site Tier-0;
  keep going. Bug inventory is a deliverable.
- Commit per-file after verify (crash-recovery); progress.md append-only; clean git status before DONE.
- Report: WORKTREE_PATH · FINAL_SHA · branch · FILES_TOUCHED · sites (tool/hand-lift) · sites-left +
  reason · BUGS FILED · app-compile-clean confirm · maps finding.

PA landing plan: S67 file-delta from the agent branch; PA-independent app-compile-verify; flip any
filed bugs into known-gaps; full bun test; merge deputy-maint (gate); push. If PA wraps before the
agent completes, the deputy F3 reboot-bridge monitors it + records completion → next session re-attaches.
