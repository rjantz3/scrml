# v0.3 Channel Dispensation — SPEC §38.1 + walker pre-check (Option b)

Dispatch: implement module-file `<channel>` dispensation per Insight 30 (S87 ratified).

Append-only timestamped log.

## Baseline

- 2026-05-12T22:23Z — WORKTREE_ROOT `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ae5fc5e6c75f4b0c8`; tree clean; `bun install` OK; `bun run pretest` OK (12 compilation-test samples compiled).
- 2026-05-12T22:23Z — Baseline test run: `channel-placement-shared-b19.test.js` — 15 pass / 0 fail.
- 2026-05-12T22:23Z — Maps consulted: `primary.map.md`, `error.map.md` (via context). Maps stale (HEAD 28cd2ac, current 621a29e) but symbol-table landmark §B19 PASS 15 at `compiler/src/symbol-table.ts:5985-6100` confirmed accurate via grep.
- 2026-05-12T22:23Z — Confirmed scope: edit `compiler/SPEC.md` §38.1 OQ paragraph (line 16061) + §34 catalog row for E-CHANNEL-OUTSIDE-PROGRAM + walker `walkChannelPlacement` (symbol-table.ts:6042-6100) + extend `channel-placement-shared-b19.test.js`.

## Step 1 — SPEC §38.1 prose update — DONE

- 2026-05-12T22:30Z — `compiler/SPEC.md` edited (5 sites): §38.1 Key invariant #1 (~line 16006), §38.1 normative line 16051, §38.1 A8 OQ paragraph (line 16061 — REPLACED with Insight 30 dispensation prose), §38 channel-error-codes summary line 16159, §34 catalog row for E-CHANNEL-OUTSIDE-PROGRAM line 14668, §38.12.6 PURE-CHANNEL-FILE placement-note. A8 deferral signal at lines 16057-16060 PRESERVED per brief.
- 2026-05-12T22:30Z — Pre-commit hook ran 10937 tests / 0 fail / 1 todo / browser validation green. Committed at sha 31d4b46.
- 2026-05-12T22:30Z — Delta: +9/-6 lines (5 sites).

## Step 2 — Walker pre-check (compiler/src/symbol-table.ts) — DONE

- 2026-05-12T22:38Z — Added `hasProgramElement(ast.nodes)` pre-scan helper (and internal `_hasProgramElementInner`) above `walkChannelPlacement` at line ~6042. WeakSet cycle guard mirrors existing convention. Returns `true` iff any `kind:"markup", tag:"program"` node is reachable from `ast.nodes` (children/body/defChildren/consequent/alternate/arms recursion).
- 2026-05-12T22:38Z — Threaded `fileHasProgram: boolean` parameter through `walkChannelPlacement` signature + all 6 recursive call sites. Fire-condition now: `programDepth === 0 && fileHasProgram`. When file has no `<program>` anywhere, file-top `<channel>` is silent — Insight 30 dispensation.
- 2026-05-12T22:38Z — Docstring updates at 3 sites: top-of-block comment (~line 5920-5950), `walkValidateChannels` docstring (~line 5983), PASS 15 wiring comment (~line 7901). All reference Insight 30 + §38.1 + §38.12.6 + engine-parity §21.8/B14.
- 2026-05-12T22:38Z — Walker LOC delta: ~30 added (helper + threading + comments). Functional change in fire-site is a single 1-line condition extension: `&& fileHasProgram`.

## Step 3 — Tests — DONE

- 2026-05-12T22:38Z — `compiler/tests/unit/channel-placement-shared-b19.test.js` updated.
- 2026-05-12T22:38Z — Removed obsolete §B19.2 case "file-top channel in module file (no program anywhere) fires" — its expected behavior is reversed by Insight 30. Replaced with stub comment pointing to new §B19.11.
- 2026-05-12T22:38Z — Added §B19.11 describe-block — 7 new test cases:
  - (1) `<channel>` file-top no-fire in module file
  - (2) `export <channel>` file-top no-fire in module file (trucking shape)
  - (3) multi-channel module file no-fire
  - (4) program-sibling fire preserved (regression guard)
  - (5) program-descendant canonical (regression guard)
  - (6) engine-parity check — both `<engine>` and `<channel>` file-top in module file silent
  - (7) `@shared` orthogonal rejection still fires in module-file context
- 2026-05-12T22:38Z — Net test delta: +6 (1 removed, 7 added). File total: 15 → 21 pass / 53 expect() calls. 0 fail. Pre-commit hook full suite green at 7a77513.

## Step 4 — Trucking-dispatch validation — DONE (unblocking check)

- 2026-05-12T22:45Z — `bun compiler/bin/scrml.js compile examples/23-trucking-dispatch/pages/dispatch/board.scrml` — clean compile (10 warnings, 0 errors); no `E-CHANNEL-OUTSIDE-PROGRAM` emitted. **Before this dispatch:** the cross-file channel import cascade would fail SYM upstream because the imported channels/dispatch-board.scrml fired `E-CHANNEL-OUTSIDE-PROGRAM`. **After this dispatch:** clean compile.
- 2026-05-12T22:45Z — Per-channel-file compile check: all 4 PURE-CHANNEL-FILEs compile silent: `channels/dispatch-board.scrml`, `channels/driver-events.scrml`, `channels/load-events.scrml`, `channels/customer-events.scrml`. Each emits only the unrelated W-PROGRAM-001 (`No <program> root element found` info-warning — pre-existing across module files, unrelated to OQ closure).
- 2026-05-12T22:45Z — `bun compiler/bin/scrml.js migrate --program-shape --dry-run --report examples/23-trucking-dispatch/` — 36 files scanned; 24 would change (20 [route] REWRITE + 4 [module] ADVISORY-bucketed in [module] non-route group); 12 unchanged. The 12 unchanged include the 4 PURE-CHANNEL-FILEs (now ADVISORY-bucketed under [module], no safety-harness blockers, no SYM cascade failures).
- 2026-05-12T22:45Z — Page consumer compile check: `bun compiler/bin/scrml.js compile examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml` — clean (12 warnings, 0 errors); `bun compiler/bin/scrml.js compile examples/23-trucking-dispatch/pages/driver/home.scrml` — clean (1 warning, 0 errors). The cross-file channel import chain resolves end-to-end.
- 2026-05-12T22:45Z — Before/after delta: the 4 channel files transitioned from "fires `E-CHANNEL-OUTSIDE-PROGRAM` blocking downstream consumer compile" to "silent canonical placement"; the 15 page consumer sites that depend on these channels via `import { … as channelAlias } from '../../channels/…scrml'` + `<channelAlias/>` mount now compile through to codegen.
