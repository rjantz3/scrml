# scrmlTS — Session 85 (IN-FLIGHT)

**Date:** 2026-05-11 → 2026-05-12 (S85; opened the morning after S84's largest-session close)
**Previous:** `handOffs/hand-off-84.md` (S84 close — v0.2.4 tagged + Wave 2 landed + v0.3 program-shape dive ratified)
**This file:** rotates to `handOffs/hand-off-85.md` at S86 open

**Tests at S85 LANDING (Wave 2.5 closed):** **11,522 pass / 77 skip / 1 todo / 0 fail / 556 files** at HEAD `2c687b5`
**Cumulative S84→S85 delta:** **+10 pass / +2 files / 0 regressions** since v0.2.4 baseline `28cd2ac`

---

## S85 — what happened (summary)

S85 opened with sync checks + hand-off rotation. The first substantive move was the user pulling Q2's correction out of PA via a Socratic prompt ("what is the token that every AST ever starts with?") — landing `<program>` as **once-per-application, NOT once-per-file**. User followed with a load-bearing principle: **co-location-of-behavior is the #1 persistent design principle** (since day 1, "over and over"). Verbatim captured in user-voice S85.

Two parallel threads ran the rest of the session:

### Thread A — Wave 2.5 (W2-1 anomaly fixes, parallel A1-A4)

User authorization: **"1"** (Fire Wave 2.5 parallel A1-A4 NOW, Wave 3 after).

4 T1 background dispatches via scrml-dev-pipeline (worktree isolation, file-disjoint). **Pre-flight:** cleaned 4 stale S84 worktrees (hand-off-84 claimed clean but 4 remained locked); installed pre-commit hook on this machine (was uninstalled — `core.hooksPath` defaulted to `.git/hooks`).

**Net result — all 4 landed at S85:**

| # | Outcome | Locus | Tests | Commit |
|---|---|---|---|---|
| A1 | Depth-of-survey #11 — no bug; preprocessor regex at `expression-parser.ts:709/715` already handles `@cell.member` LHS | `compiler/tests/unit/markup-interp-member-is-not-ternary.test.js` (new) | +4 regression tests | `047b4e1` |
| **A2** | **Real fix** — erroneous `_p3aIsExport === true` filter in `collectChannelFunctionMap`/`collectChannelCellMap` (added C18 `e28a022` 2026-05-09); conflated WS-route-emission-skip with lexical-ownership-skip | `compiler/src/codegen/emit-channel.ts` (−4 lines + comments) | +3 unit tests + 1 test inverted | `a1cc782` |
| A3 | Depth-of-survey #12 — stale workaround comment (fix already landed S82 Insight 26 D3 + Wave 1.5 Bug 1.2 v0.2.4) | `examples/23-trucking-dispatch/app.scrml` (5 fn-decl cleanups + comment) | +2 regression tests | `80cbb9c` |
| **A4** | **Real fix** — `normalizeTokenizedRaw` end-anchored `/>` collapse missed internal PascalCase self-closes (e.g., `<LoadStatusBadge/>` inside LoadCard body) | `compiler/src/component-expander.ts` (+13/−1) | +1 integration test (§C10) | `2c687b5` |

**Trucking-dispatch E2E delta:** 11 errors → 7 errors. The 4 E-RI-002 fires (the publisher pattern surfaced by A1+A4 reports) closed by A2's fix. Remaining 7 are pre-existing F-COMPONENT-001 family + E-NAME-COLLIDES-STATE — out of Wave 2.5 scope.

**Methodology signal:** 2 of 4 dispatches were depth-of-survey discounts (#11 + #12). Pattern frequency now at **#12**. Both no-op returns added regression-test coverage per write-test-always — net positive even when "no bug." PA's hint-about-locus was reliably good (4/4 dispatches found the actual locus AT or NEAR PA's guess); PA's "is this a bug" preconception was unreliable (2 misdiagnoses).

**Worktrees cleaned post-landing:** all 4 unlocked + removed + branches deleted. Pruned. Main checkout only.

### Thread B — v0.3 program-shape Q-verdict ratification

User ratified 5 Q-verdicts as PA-leaned + corrected Q2 via the AST-root framing:

| Q | Original (S84 dive) | S85 ratified |
|---|---|---|
| Q1-channels-inside | reverse E-CHANNEL-INSIDE-PROGRAM | ✅ YES |
| Q1-styles-outside | `#{}` stays file-top | ✅ YES |
| **Q2** | one-program-per-file canonical | ✅ **one-program-per-APP canonical** |
| Q3-let/const lift | bare locals at program-top lift | ✅ YES |
| Q3-decl-shape list | full enumeration | ✅ YES |
| Q5-deprecation | W-PROGRAM-REDUNDANT-LOGIC v0.3 → E-* v0.4 | ✅ YES |

**Q2 correction implications:**
- Non-entry files (modules) have NO `<program>` wrapper. Just imports + exports + decls at file-top.
- Migration sweep scope SHRINKS — most multi-file apps will have N−1 files lose their wrapper.
- 40-110h band may calibrate LOWER at dispatch survey time.

**Co-location framing recorded (NOT promoted to lock per user directive):**
- User verbatim: *"co-location-of-behaviour is probobly the #1 design principle that I have persisted"*
- Multi-monitor-for-context-not-editing is the friction co-location eliminates
- Tailwind inline class= + `#{}` file-local styles + entry-file `<program>` + modules-without-`<program>` are all expressions of co-location

**Persisted in:**
- `../scrml-support/user-voice-scrmlTS.md` — S85 entry with verbatim quotes
- `../scrml-support/docs/deep-dives/program-as-container-shape-DIVE-2026-05-11.md` — S85 amendment block

---

## Open questions to surface immediately at S86 open

1. **v0.3.0 spec-amendment cluster** — still pending explicit dispatch authorization. 5-item plan in dive doc (~40-110h band, may calibrate lower post-Q2-correction). PA can dispatch when authorized; survey first to recalibrate band.

2. **Wave 3 (Playwright + benchmarks)** — gated on completing v0.2.x adopter-blocker work. Wave 2.5 closed 2 real bugs but 2 follow-ons remain (A6 + A7) + others still pending. Decision: dispatch A6+A7 then fire Wave 3, OR fire Wave 3 alongside?

3. **5 articles publishable** per S84 W2-3 triage (user-decision queue).

4. **v0.2.5 tag** — Wave 2.5 + v0.3 ratification + W2 bundle = candidate. Did NOT tag this session yet; pending user call.

5. **Hook diagnostic** — pre-commit hook didn't fire on the 4 Wave 2.5 landings even though `core.hooksPath = scripts/git-hooks` was set at S85 open. Setting got reverted at some point during the session (verified clean now). Worth investigating root cause — may be `git worktree prune` clearing config? Test commits did NOT fire hooks; tests passed afterward via manual `bun run test`. Tracked as task #9.

---

## S85 follow-ons surfaced (new tasks queued)

- **A6 (task #7):** Transitive cross-file component registry enrichment. When component X (imported by consumer) references component Y in its body, Y must also be in consumer's CE registry. Currently fires E-COMPONENT-020 after expansion. Surfaced by A4 work on F-COMPONENT-001.
- **A7 (task #8):** Sweep remaining 18 `server function getCurrentUser` redeclarations in trucking-dispatch pages. Each has `?{}` body trigger so dropping `server` is safe. T2 docs sweep candidate.
- **A8 (task #10):** Potential cross-file publishX route-dedup concern. Pre-existing behavior unexposed because A2's fix makes WORKING what was BROKEN. Non-urgent; queued for if/when adopter friction surfaces.
- **Hook investigation (task #9):** Pre-commit hook not inheriting into worktrees AND reverting on main between commits. Diagnostic + per-machine setup directive (pa.md S78) may need a per-worktree clause.

---

## State at landing (S85 close not yet)

### Semver tag history (unchanged from S84 close)

| Tag | Commit | Scope |
|---|---|---|
| v0.2.0 | `022ee02` | First semver baseline (S83) |
| v0.2.1 | `d72c074` | Wave 4A bundle (S83) |
| v0.2.2 | `98e872d` | Wave 4B.1 bundle (S83) |
| v0.2.3 | `d512266` | Bug 2 (S84) |
| v0.2.4 | `28cd2ac` | Wave 1 + Wave 1.5 robust-v0.2 bundle (S84) |
| (untagged) | `1d2f1cf` | Wave 2 (S84 docs/spec/articles + content) |
| (untagged) | `2c687b5` | **Wave 2.5 (S85 — A2+A4 real fixes + A1+A3 depth-of-survey-with-regression-coverage)** |

**v0.2.5 tag candidate:** `2c687b5` (Wave 2 + Wave 2.5 bundle since v0.2.4). Decision pending user.

### Cross-machine sync at landing

- scrmlTS: 0/0 vs origin at v0.2.4 push moment; 6 Wave 2 commits + 4 Wave 2.5 commits + S85 hand-off rotation pending push (this commit cycle).
- scrml-support: 0/0 vs origin at Insight 29 + empirical-study push moment; v0.3 dive S85 amendment + user-voice S85 pending push (this commit cycle).

### Worktree state

CLEAN. Main checkout only. 4 S85 worktrees cleaned post-landing.

### `.claude/agents/` state

Unchanged from S83 (11 project agents + 5 debate panelists carried).

### Pre-commit hook

Set at S85 open; **reverted at some point during session** (verified `scripts/git-hooks` again at landing). 4 Wave 2.5 landing commits did NOT fire the hook. Tests verified manually via full `bun run test` (11,522 pass / 0 fail). Investigation queued as task #9.

---

## Tags

#session-85 #in-flight #wave-2-5-closed #2-real-bugs-fixed-2-depth-of-survey-discounts #depth-of-survey-frequency-12 #v0.3-q-verdicts-ratified #q2-corrected-one-per-app #co-location-principle-recorded-not-locked #4-follow-ons-queued #hook-broken-diagnostic-queued #zero-regressions
