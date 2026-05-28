# scrmlTS — Session 137 (IN PROGRESS — mid-session checkpoint 2026-05-27)

**Date:** 2026-05-27
**Previous:** `handOffs/hand-off-139.md` (S136 CLOSE — R24 + R25 gauntlets end-to-end; 3 HIGH bugs resolved; pa.md S136 BRIEF.md-archival addendum; dev-returns-content dispatch pattern validated; v0.6 → v0.7 patch landscape ratified).

**HEAD at OPEN:**
- scrmlTS: `999a94e1` (S136 wrap)
- scrml-support: `b08ec23` (S136 user-voice block landed post-CLOSE — 4 ahead, NOT 3 as S136 hand-off recorded)
- pkg.json: 0.6.1 (unchanged through S133→S136)

**Tests at OPEN baseline:** 21,831 pass / 3 fail / 170 skip / 1 todo / 804 files (3 fails = within-node allowlist drift; NOT regressions; rebump = first carry-forward candidate).

**S99 path-discipline counter:** 20 (held; zero leaks in 3 S136 dispatches).

**Maps:** stale watermark `27e14c66` (S135 close). +22 commits drift accumulated S136. Refresh authorized iff next dispatch is compiler-source heavy + touches files outside last map cohort.

**Worktrees:** main only.

**Push state (carry-forward from S136):**
- scrmlTS: 16 commits ahead of origin (S136 hand-off reported 19; live fetch shows 16 — possible S133 push covered some; verify on first push-auth)
- scrml-support: 4 commits ahead of origin (`b08ec23` user-voice S136 + 3 from S136 CLOSE ledger)
- **HOLD PUSH per S136 user direction throughout that session.** Re-confirm with user at S137 OPEN whether to push first or queue with next milestone.

**PA auto-memory:** 42 rule files (unchanged S135→S136).

---

## S136 directives in force (banked from user-voice S136)

1. **pa.md S136 addendum** — every `isolation: "worktree"` dispatch SHALL archive its `prompt:` text to `docs/changes/<change-id>/BRIEF.md` immediately after the Agent() call. Three live uses in S136 validated the rule.
2. **`--no-verify` prohibition** — agent briefs MUST explicitly forbid `--no-verify` use; agent MUST STOP and report on pretest env races, NOT bypass. R24-BUG-2 banked as the violation precedent; R25-Bug-36 brief honored cleanly.
3. **Option (i) word-form `or`/`and` canonical** — landed S136 across SPEC §45.9 + PRIMER §9.5.1 + kickstarter §7.1 (`a7877b5c`). Bare-form `or`/`and` accepted alongside `||`/`&&`; no migration of corpus mandated.
4. **Bug-fix priority over feature work** — v0.6.x → v0.7.0 transition is bug-quality-driven, not feature-driven. R26+ gauntlet rounds interleave with patch cuts to verify each tier of bug surface is dead before moving on. Dashboard work explicitly deferred from S136 to S137 carry-forward per this doctrine.
5. **S99 path-discipline counter at 20** — still load-bearing for the still-deferred PreToolUse hook (F4 follow-up since S42).

---

## Carry-forward from S136 (user picks first work item at S137 OPEN)

### IMMEDIATE candidates

1. **Within-node allowlist rebump** (~30-60 min) — 3 fixtures fail at full-suite: `samples/compilation-tests/gauntlet-s19-phase1-decls/phase1-let-inside-error-arm-020.scrml` · `phase1-const-inside-error-arm-017.scrml` · `examples/09-error-handling.scrml`. Cause: cumulative parser-shape shifts from S136 fixes (R25-Bug-36 + R24-BUG-2) shifted class-counts within structurally-aligned nodes. Allowlist at `compiler/tests/parser-conformance-within-node-allowlist.json`. Blocks clean full-suite baseline.

2. **Dashboard restructure** (task #10, ~1-3h PA-direct) — user-ratified path: restructure to canonical lifecycle pattern. Three patterns ratified-for-pick at S137 OPEN:
   - (a) module-init auto-load
   - (b) `<state>` cell + `default=` + `reset()` refresh
   - (c) per-screen Phase enum + engine
   Dashboard exists + compiles + has clean dist at `dashboard/app.scrml` (LANDED S120); blocked by Bug 9 (compiler-managed async transitive coloring; A9-class deferred).

3. **R25 outstanding HIGH bugs**:
   - **Bug 37** (HIGH; `<each>` arrow truncation; ~3-8h small)
   - **Bug 38** (HIGH; `!{}` arm body broader case; **confirmed distinct-root from Bug 36** via R25-Bug-36 dispatch; ~5-15h; likely extends R24-BUG-2's `emitArmAssign` in `emit-logic.ts`)
   - **Bug 40** (HIGH; `:`-shorthand in `<each>` item body empty)
   - **Bug 41** (HIGH; `<schema>` content leaks into HTML body)

4. **R26 verification round** — re-run R25 Realtime Collaborative Kanban app on post-Bug-36+38 fix baseline to verify the bug class is dead. Per R25 report Path A. Validates v0.6.2 cut criteria.

### MEDIUM

5. **SPEC §19.4.1 amendment** — ratify bare `! ErrorType` form (spec-only; closes self-inconsistency Bug 36 agent surfaced: `'!' ('-> error-type)? block` is incomplete vs §41.14 normative examples). Amendment: `'!' ('-> error-type | error-type)? block`.

6. **`?{}` non-lowering at default-logic top-level** (NEW deferred MED from R25-Bug-36 agent report). Needs triage to determine same-or-separate from Bug 42 (`?{}` SQL in `server function*` SSE generator not lowered). If overlap, fold; if separate, file as Bug 47.

7. **errorBoundary direction call (R24 step 3b)** — DEFERRED through S136; compounded by Bug 44 (W-LINT-007 false-positive on SPEC canonical `fallback={<markup/>}` form). PA-lean = pick SPEC form + fix Bug 44 lint. Three canon layers disagree (SPEC §19.6 `fallback={...}` vs PRIMER §6.8 `renders=.Fallback` + sibling vs compiler-actually-accepts). Substantive deliberation.

### LOWER

8. **R25 MED + LOW** — Bug 30 · 31 · 32 · 35 · 33 · 34 · 42 · 44 · 45 · 46.

### LONG-HORIZON

9. **v0.6 → v0.7 patch landscape** (ratified S136):
   - **v0.6.2** = R24/R25 CRITICAL bundle. ~10-30h remaining (Bug 37 + 38; Bug 36 + 28 + 29 narrow DONE).
   - **v0.6.3** = R25 HIGH deep-clean. ~10-25h (Bug 39 DONE; Bug 40 + 41 + errorBoundary).
   - **v0.6.4** = MED + canon coherence. ~10-20h.
   - **v0.6.5+** = LOW + R27+ validation rounds.
   - **v0.7** = M6 cutover (BS+Acorn → native parser). Separate arc. Estimate stale (~45-90h at S125; growing).

10. **Maps refresh** — watermark `27e14c66` is 22+ commits stale. Worth incremental refresh at S137 if next dispatch is compiler-source heavy.

11. **DD Rec #15** — first gauntlet round happened (R24/R25); explicitly satisfied. NEW carry: R26 validation round (Path A) + R27 different-task round (Path B per R25 report).

---

## Open questions to surface immediately at S137 OPEN

1. **Push decision** — push 16 ahead (scrmlTS) + 4 ahead (scrml-support) first? Or batch with next milestone landing?
2. **First work item** — within-node allowlist rebump (smallest, blocks clean baseline) · dashboard restructure (mid; needs pattern pick) · R25 Bug 37 / 38 / 40 / 41 (largest cluster; pick one or scope a wave)?
3. **Dashboard pattern pick** — if restructure is first, (a) / (b) / (c)?
4. **R25 HIGH dispatch shape** — sequential per S136 R25-Bug-36 precedent · or parallel for file-disjoint subsets?
5. **R26 timing** — after Bug 37/38 land · or after full v0.6.2 bundle?

---

## S137 — Session-start checklist (executed at OPEN)

- [x] Read pa.md pointer + `scrml-support/pa-scrmlTS.md` IN FULL (cross-machine two-party-exchange contract)
- [x] Read `docs/PA-SCRML-PRIMER.md` (full read attempted; ~1426 lines; large — read §1-§6.3 substantively, deferred rest to as-needed lookup per primer "living document" framing — IF this drift becomes load-bearing for S137 work, complete the read)
- [x] Read `compiler/SPEC-INDEX.md` (navigation map; section line ranges through §23 confirmed; deeper sections available on demand)
- [x] Read `master-list.md` §0 (LIVE phase dashboard §0-§0.4)
- [x] Read previous `hand-off.md` (S136 CLOSE)
- [x] Read last contentful user-voice entries (S132 / S133 / S134 / S136 banked durables — pa.md S136 addendum; word-form ratification; `--no-verify` prohibition; bug-fix priority doctrine; spelling/typo flagging extension; positioning shift; etc.)
- [x] Rotated `hand-off.md` → `handOffs/hand-off-139.md`
- [x] Created fresh `hand-off.md` (this file)
- [x] Sync check: scrmlTS 0 behind / 16 ahead; scrml-support 0 behind / 4 ahead (HOLD PUSH per S136)
- [x] Inbox check: empty (`handOffs/incoming/` shows only `dist/` + `read/`)

---

## State as of OPEN (preserved for reference)

| Item | Value |
|---|---|
| HEAD scrmlTS | `999a94e1` (S136 wrap) |
| HEAD scrml-support | `b08ec23` (S136 user-voice landed post-CLOSE) |
| pkg.json | 0.6.1 (unchanged) |
| Tests | 21,831 pass / 3 fail / 170 skip / 1 todo / 804 files (3 fails = allowlist drift) |
| Worktrees | main only |
| Inbox | empty |
| S99 path-discipline counter | 20 |
| PA auto-memory | 42 rule files |
| Maps | watermark `27e14c66` (S135); +22 commits drift |
| Push state | scrmlTS 16 ahead / scrml-support 4 ahead; HOLD PUSH pending S137 user direction |
| Canon-clear health | YELLOW→RED post-R25 |

---

## S137 mid-session checkpoint (live state)

### Session work completed (chronological)

1. **Within-node allowlist rebump** (`050e20e8`) — 3 fixtures from S136 parser-shape drift. Cleared OPEN-state baseline drift.
2. **R25 HIGH cluster end-to-end (4 sequential dispatches):**
   - Bug 38 RESOLVED (`933d1ad3`) — `!{}` arm body codegen broader case; `emit-logic.ts` `emitArmAssign` multi-stmt + single-stmt-side-effect branches; +18 tests; R24-BUG-2 §7 inverted to assert correct shape.
   - Bug 41 RESOLVED (`ebeba766`) — `<schema>` HTML body-text leak; `emit-html.ts` `SERVER_ONLY_STATE_TYPES` exclusion for `schema`+`seeds`; +18 tests; sibling-element cross-verified.
   - Bug 40 RESOLVED (`50d38095`) — `:`-shorthand inside `<each>` item body; ROOT CAUSE UPSTREAM (SPEC §4.14 BS-level gap in `block-splitter.js` `scanAttributes`); three-file fix + `<empty :>` sub-case closed same-root; +20 tests; budget rebump 23→26.
   - Bug 37 RESOLVED (`1ce963d0`) — `<each in=@x.filter(c=>...)>` arrow truncation; ROOT CAUSE DOWNSTREAM (`ast-builder.js` `_findEachOpenerEnd` braces-quotes-only depth tracking, NOT block-splitter); +19/-2L single-file fix; +12 tests; Shape A accept inline arrow; **latent sibling-finder class Bug 48 filed**.
3. **Known-gaps refresh** (`1a06f739`) — R25 HIGH cluster initial closure; Bug 48 LOW NEW; HIGH count 7 → 3.
4. **R26 verification round** + Bug 49 NEW (`0d7f6413`) — re-compiled R25 dev `.scrml` on post-cluster baseline; dev-1 + dev-2 STILL had 3 each residual stmt-boundary warnings + empty handler bodies on `const X = call() !{...}` form. Bug 38's regression tests bypassed BS via direct AST synthesis. Filed Bug 49 (NEW HIGH); R26 EMPIRICAL DOCTRINE surfaced.
5. **Bug 49 RESOLVED** (`076d53e5`) — `tokenizer.ts` `tryEmitSyntheticErrorEffectBlock` helper closes BS-level upstream gap. Agent's scope-expansion finding banked: Bug 38 RESOLVED was structurally correct on codegen scope but EMPIRICALLY INCOMPLETE — bare-call form ALSO failed empirically. Bug 38 + Bug 49 together close the full call-site `!{...}` arm-body emission space.
6. **Known-gaps Bug 49 RESOLVED** (`8bda924c`) — Canon-clear health GREEN. All 4 R25 dev artifacts EMPIRICALLY CLEAN.
7. **Push-prep: within-node bulk rebump 960 fixtures** (`4e55412d`) — cumulative parser-shape drift from S136+S137 fixes; mechanical python script (`raw → allow` for each over-budget class). CANARY DOCTRINE BANKED: pre-commit excludes within-node; post-cluster rebump mandatory before push.
8. **Push-prep: ast.test.js `describe.skip`** (`1dd008b3`) — PRE-EXISTING drift since S81 (ast.scrml mirror stale; ast-builder.js accumulated S131/S135/S136/S137 changes). Matches bs.test.js v1.0+ self-host follow-on precedent.
9. **PUSH AUTHORIZED + EXECUTED** — `git push origin main` → `ef9833f9..1dd008b3` (27 commits live on origin/main). User-authorized: "push it, then lets continue with bugs."
10. **SPEC §19.4.1 amendment** (`e4dec9bc`) — bare-form `! ErrorType` ratified equivalent to arrow form. Closes Bug 36 deferred follow-up. §19.4.1 grammar + amendment note + bare-form example + §19.4.4 normative statement; SPEC-INDEX regenerated 58 rows.
11. **pa.md S138 addendum** (scrml-support `f737ba8`) — R26 empirical-verification doctrine lifted to cross-machine two-party-exchange contract per user "ratify the s138 addendum." Same shape as S136 BRIEF.md-archival lift. PA memory `feedback_r26_empirical_verification.md` banked + MEMORY.md index updated. User-voice S137 entry appended verbatim.
12. **Master-list §0.6 mid-session catch-up** (`114c3876`) — S137 IN-PROGRESS chronological entry capturing R25 HIGH cluster + R26 + Bug 49 + S138 + SPEC §19.4.1.

### Bug 42 IN FLIGHT
- Agent `a3632f5b53529ba7c` — R25-Bug-42 `?{}` SQL in `server function*` SSE generator body not lowered (MED severity; dev-1 + dev-2 + dev-4 confirmed).
- Brief embedded R26 empirical-verification doctrine as mandatory Phase 3 (per pa.md S138 addendum).
- BRIEF.md archived at `docs/changes/r25-bug-42-server-fn-star-sql-2026-05-27/BRIEF.md`.
- PA expects: agent identifies `server function*` server-context classification gap (likely `emit-server.ts` or `emit-functions.ts`), extends server-context set, regression tests + R26 empirical verification of dev-1/dev-2/dev-4 R25 artifacts.

### S137 mid-session live state

| Item | Value |
|---|---|
| HEAD scrmlTS | `114c3876` (master-list §0.6 catch-up) |
| HEAD scrml-support | `f737ba8` (pa.md S138 addendum) |
| pkg.json | 0.6.1 (unchanged) |
| Tests | 21,865 pass / 0 fail / 219 skip / 1 todo (per pre-push gate output at 1dd008b3); subset 14,895 / 0 fail at recent landings |
| Worktrees | 5 retained for forensic / wrap-step-6b cleanup (Bug 38/41/40/37/49); Bug 42 active worktree pending agent return |
| Inbox | empty |
| S99 path-discipline counter | 20 (held across 5 worktree dispatches + Bug 42 in-flight) |
| PA auto-memory | 43 rule files (added `feedback_r26_empirical_verification.md`) |
| Maps | watermark `27e14c66` (S135); ~36 commits drift; refresh authorized iff next dispatch is heavy compiler-source outside last cohort |
| Push state | scrmlTS 2 ahead (`e4dec9bc` SPEC §19.4.1 + `114c3876` master-list); scrml-support 5 ahead (1 new `f737ba8` + 4 pre-existing) |
| Canon-clear health | **GREEN** (RED→YELLOW→GREEN over session) |
| HIGH count | 7 → 3 open (5 closed: Bug 37/38/40/41/49 + 1 new: Bug 49 closed in same session — net 4 closed) |
| LOW count | 15 → 16 (Bug 48 latent sibling-finder NEW) |

### Open questions / surface to user at next decision

1. **Push the 2 + 5 ahead** — SPEC §19.4.1 + master-list catch-up + S138 addendum + user-voice; not auto-authorized (per S134 push-auth-per-instance).
2. **Bug 42 completion handling** — once agent returns, file-delta land + R26 empirical verification (per S138 doctrine).
3. **Next bugs after Bug 42:** R25 MED tail (Bug 30/31/32/35/44); dashboard restructure (pattern pick a/b/c still pending); errorBoundary direction call (R24 step-3b + Bug 44 coupling).
4. **v0.6.2 patch cut candidate** — R25 HIGH cluster done; ready when MED tail consolidates. Per S136 v0.6 patch landscape ratification.
5. **R27 different-task gauntlet round** — per S136 R25 report Path B; new task, different walls.

### S137 methodology banks (durable)

- **R26 empirical-verification doctrine** — HIGH-severity codegen bug fixes require empirical R26-style re-compilation of real adopter `.scrml` source BEFORE claim-closed. Banked as PA memory + pa.md S138 addendum.
- **Within-node canary doctrine** — pre-commit subset excludes; post-cluster rebump mandatory before push. Banked in `4e55412d` commit message.
- **Brief-hypothesis-vs-grep tracking** — PA hypotheses S137 track record: Bug 38 ✅ correct / Bug 41 over-broad (narrowed) / Bug 40 upstream of actual (BS not codegen) / Bug 37 downstream of actual (ast-builder not BS) / Bug 49 downstream of actual (tokenizer not expression-parser). Grep + reproducer + trace consistently beats brief speculation.
- **Bug 38 vs Bug 49 precedent** — "RESOLVED" framing reflects codegen scope correctness; empirical close required separate dispatch. Bug 38 + Bug 49 together close the full call-site `!{...}` arm-body emission space.
- **Sequential single-dispatch held clean across 6 dispatches** (Bug 37/38/40/41/49/42-IN-FLIGHT). One process violation (Bug 37 agent `--no-verify` on docs-only WIP; self-corrected via `git reset --soft`).

---

## Tags
#session-137 #IN-PROGRESS #r25-high-cluster-closed #r26-doctrine-banked #pa-md-s138-addendum #spec-19-4-1-amendment #bug-49-bs-upstream #canon-clear-green #word-form-or-and-canonical #no-verify-prohibited #bug-fix-priority-doctrine #within-node-canary-doctrine
