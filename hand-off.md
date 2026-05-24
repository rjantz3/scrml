# scrmlTS — Session 126 (CLOSE)

**Date:** 2026-05-24
**Previous:** `handOffs/hand-off-128.md` (S125 CLOSE)
**Machine:** same as S125 (no machine switch).
**HEAD at S126 OPEN:** `dc073b94` · **HEAD at S126 CLOSE:** `3a909c1d` (+ wrap-docs + maps-close commits).
**Wrap:** full 8-step MINUS push. **PUSH STATUS: NONE — user direction "no push."**

---

## S126 CLOSE SUMMARY — read first

**Net:** ~10 commits. Full `bun run test` **21,217 pass / 0 fail / 174 skip / 1 todo / 771 files** (0 fail held). 5 adopter/MCP fixes landed + independently verified + adopter-notified; **MCP-V0.A + B + C CLOSED**; adopter queue drained to the M6-gated tail. Maps refreshed → `3a909c1d`. No tag (pkg.json 0.6.0).

### ⚠ PUSH-PENDING — surface IMMEDIATELY at S127 OPEN (user said NO push S126)
- **scrmlTS** — ~10 S126 commits UNPUSHED (`16042a30` maps-open → `3a909c1d` 6nz-S + the wrap-docs commit + the maps-close commit). At S126 OPEN scrmlTS was in sync (`0 0`); the entire S126 commit set is unpushed.
- **scrml-support** — `pa-scrmlTS.md` (S99 mitigation hardening: Bash-edit + no-`cd`) + `user-voice-scrmlTS.md` (S126 append) UNPUSHED. (Pre-existing untracked drafts `tools/` + `voice/articles/2026-05-09-*` are NOT mine — left untouched.)
- S127 OPEN must run cross-machine sync FIRST: `git -C <repo> fetch` + push these (with auth) OR confirm the no-push was intentional carry.

### M6 ENTERS FRESH AT S127 — under the EXACTING directive
First unit **M6.5.b.2.1** (Class-E newline-as-statement-separator for consecutive bare state-decls in native `compiler/native-parser/parse-stmt.js`; mirror live ast-builder Phase A1a Step 11.0b boundary detection; ~2-4h). Discipline (see §"S126 directive" below + pa.md S99 pt 5): one unit at a time / within-node canary re-run per parser-shape change / Bash-edit + no-`cd` brief / per-unit dual-verify / flip-harness before M6.7 / no premature M6.8 deletion. Maps current at `3a909c1d` (refresh if S127 HEAD moves before dispatch).

### FOLLOW-UP TO VERIFY at S127
MCP-C's `stdlib/mcp/index.scrml` uses `async function` in a `.scrml` stub (maps agent flagged; treated as compiler-internal-stub-exempt). Verify whether a stdlib `.scrml` stub with `async function` is spec-compliant — the no-async/await rule is language-wide; stubs may be JS-host-mode. Likely fine, unverified.

### Bug-V update (post-wave 6nz confirmation)
**6nz-V CONFIRMED GENUINE** (not a Bug-W artifact). Re-verified at `a91ad5de`: `@sel` updates but the `.sel` class stays frozen on the first item — `class:NAME` on a for-lift element is evaluated at create-time only, never re-evaluated when the reconciler reuses the DOM node. **Lift/reconcile RUNTIME path, NOT codegen** (emit is correctly per-item-scoped). Queued MED. 6nz verified-closed Bug W + Bug S + 6nz-P on their side.

---

---

## S126 OPEN — session-start checklist status

| Step | Status |
|---|---|
| Cross-machine sync (scrmlTS + scrml-support) | ✅ both `0 0` ahead/behind origin; scrmlTS tree clean; scrml-support has pre-existing untracked drafts only (`tools/`, `voice/articles/2026-05-09-*.md`) — NOT this session's work |
| pa.md (→ `../scrml-support/pa-scrmlTS.md`) read IN FULL | ✅ |
| PRIMER read IN FULL | ✅ (1002 lines) |
| SPEC-INDEX read IN FULL | ✅ (379 lines) |
| master-list §0 read IN FULL | ✅ (incl. §0.6 surfaced-divergences through recent sessions) |
| hand-off.md (S125 CLOSE) read | ✅ |
| recent user-voice read | ✅ (S122 + S123 contentful; user-voice current through S123) |
| hand-off rotated → `handOffs/hand-off-128.md` | ✅ |
| fresh hand-off.md created | ✅ this file |
| Hook gate verified | ✅ config B (`.git/hooks/` has pre-commit + pre-push; post-commit still absent since S122) |
| Inbox triage | ✅ `handOffs/incoming/` EMPTY |
| Maps currency | ⚠️ watermark `73dd816c`, HEAD `dc073b94` = **7 commits stale** — refresh REQUIRED before first dev dispatch |

---

## State-as-of-open

| Item | Value |
|---|---|
| HEAD | `dc073b94` (S125-close wrap commit) |
| pkg.json version | 0.6.0 |
| scrmlTS origin sync | in sync (`0 0`) |
| scrml-support origin sync | in sync (`0 0`); untracked drafts pre-exist (dev.to articles 05-09 + `tools/`) |
| Test baseline (S125 CLOSE) | 21,114 pass / 0 fail / 170 skip / 1 todo / 761 files (full `bun run test`) |
| Worktrees | clean (all cleaned at S125 wrap) |
| `.claude/maps/` | watermark `73dd816c` — 7 commits stale; refresh before dev dispatch |
| S99 path-discipline counter | 11 |
| Active arcs | M6.5 path-b Wave 2 (b.1 closed, b.2 PARTIAL) · MCP-V0 (B closed, A PARTIAL) |

---

## Open threads / carry-forwards (from S125 CLOSE — surface to user)

### M6.5 path-b Wave 2 (continuing)
```
✅ M6.5.b.0 (S124)   ✅ M6.5.b.1 (S125 afbc566c)   🟡 M6.5.b.2 PARTIAL (S125 cd82eeb9)
⬜ M6.5.b.2.1 boundary-detection (~2-4h) — NEW from S125 b.2
⬜ M6.5.b.3 FIX-NATIVE hoist-gap recursion (~4-8h)
⬜ M6.5.b.4 FIX-NATIVE sql-ref envelope (~3-6h)
⬜ M6.5.b.5 ADAPT shape normalizer at api.js boundary (~3-6h)
⬜ M6.5.b.6 ADAPT SPAN-COORD enrichment (~1-2h)
⬜ M6.5.b.7 closure + canary verification (~2-3h)
```

### MCP-V0 (continuing)
```
✅ MCP-V0.B (S125 e40c9cc3)   🟡 MCP-V0.A PARTIAL (S125 fa25ac31; tests follow-on)
⬜ MCP-V0.A-tests follow-on (NEW from S125 A; unblocks C)
⬜ MCP-V0.C scrml:mcp stdlib + 11 tools + MCP SDK (blocked by A-tests)
⬜ MCP-V0.D <program mcp> attr wiring (blocked by C)
⬜ MCP-V0.E E2E tests + adopter docs (blocked by D)
```

### 4 queued adopter bugs (triaged per feedback_adopter_bug_diligence; gate = before fix-dispatch)
1. **6nz-S** — `return not` + `const` mis-emit (HIGH, ~1-3h)
2. **6nz-R** — `if=@derivedReactive` no-unmount (HIGH, ~2-4h)
3. **GITI-018** — Multi-`scrml:` stdlib library-mode (HIGH blocker, ~2-4h)
4. **GITI-015** — `is some` ternary + computed-member LHS (workaround exists, ~1-2h)

### Build-story arc — 6 open Qs in `scrml-support/docs/build-story-research-roughing-2026-05-23.md` §4 (pending user refinement; gated on M6 cutover complete)

### v0.7 critical path (post-S125)
```
M6.5.b.2.1 (~2-4h) → M6.5 .b.3-.b.6 parallel (~11-22h) → .b.7 closure (~2-3h)
→ M6.7 Phase A flag flip re-dispatch (~3-6h) → SOAK (≥1 session) → M6.8 deletion (~12-20h) → v0.7 cut
Revised total ~45-90h. MCP-V0 parallel: A-tests + C + D + E (~40-60h).
```

### Pre-existing carry-forwards (unchanged)
V-kill READ-side fire · dev.to article updates · Living Compiler retraction (pending user stamp+publish) · scrml.dev canonicalization · SPEC-INDEX Quick-Lookup mini-index stale · §29 vanilla-interop divergence (user has not ruled) · Generator policy · MK4 lazy-require ESM cycle · Bug 9 dashboard async-not-awaited · Dashboard still broken at runtime · `~snapshot = {...}` tilde-decl emits raw tilde sigil · `eb941333` stray commit · Adopter corpus migration backlog · v0.4 release-cut (queued, unscheduled).

---

## Structural lessons banked (recent — watch for recurrence)
- **Opt-in-flag gating obscures regressions, REPEATEDLY** (M6.7 STOP S124 + M6.5.b.2 boundary bug S125). Pre-commit gate EXCLUDES top-level `parser-conformance-*.test.js`; parser-shape-changing landings must re-run within-node canary before wrap. The canary absorbs new bugs into the regenerated allowlist baseline rather than flagging them as regressions — future refinement should differentiate improvement vs bug-shape-change.
- **Agent stall pattern normalized** — 3 of 4 S125 agents stalled; S89 §13.2 partial-recovery + S83 commit-discipline held, zero data loss.

---

## Next-priority candidates (for user direction)
- **MCP-V0.A-tests follow-on** (~3-5h) — unblocks MCP-V0.C
- **M6.5.b.2.1 boundary-detection** (~2-4h) — closes b.2 properly
- **M6.5.b.3-.b.6** — 4 parallel-eligible dispatches (~11-22h)
- **MCP-V0.C/D/E** — dependent chain after A-tests
- **4 queued adopter bugs** — still queued

---

## Cross-repo sends (S126)

Closed a notice gap the S124 wrap left open (master-list S124 claimed "2 closure replies sent" — they were NOT actually in the sibling inboxes):
- **→ giti** `2026-05-24-0606-scrmlTS-to-giti-giti-017-fix-landed.md` — GITI-017 regex-`not`-corruption fix (`f181d60a`, in HEAD `dc073b94`); action: revert char-class workaround + close.
- **→ 6nz** `2026-05-24-0606-scrmlTS-to-6nz-bug-p-fix-landed.md` — bug-P chunker closure fix (`d570341d`, in HEAD `dc073b94`; covers `animation` chunk too per their "in case" flag); action: re-smoke p5/p6 + close. Re-noted Bug L still open (M6-subsumed).

Both `needs: fyi`. No push of sibling repos by this PA — they pull on their own session-start.

**Then 3 new messages arrived mid-session (0609-0613) — triaged + archived to read/:**
- **GITI-017 reopened (PARTIAL).** giti re-verified at `dc073b94`: my 0606 fix-landed notice was WRONG. `f181d60a` fixed the absence-sentinel path (`(not)`→`(null)` ✅) but the boolean-negation `not `→`!` lowering STILL corrupts regex bodies (`/not a jj repo/i`→`/!a jj repo/i`). PA independently confirmed. **Correction notice sent** (`2026-05-24-0618-...giti-017-CORRECTION`). Root cause located: `rewriteNotKeyword` (rewrite.ts:620) got the regex/comment fence in f181d60a (absence path); the boolean-negation lowering fires in a branch that didn't. Fix = extend the same fence. Queued as GITI-017-residual (HIGH — silent corruption).
- **6nz: P verified-CLOSED** (p5 18/18, p6 7/7 — my notice was correct), **Q migrated** (closed by Unit CC), **R RETRACTED** (was a Q artifact, not a standalone if= bug — PULL from queue), only **bug-S** left active (`return not`+const → `return !const`; hard parse fail, narrow, workaround `return null`). L+T deferred to M6.
- **GITI-019 NEW (HIGH, UI-blocking giti).** `for…lift` interp with top-level `||`/`&&` emits illegal `a || b ?? ""` (missing parens; ES2020 `??`+`||` rule). Root cause: lift-loop text builder `createTextNode(String(expr ?? ""))` doesn't paren a LogicalExpression inner. Clean repro. Direct top-level interp unaffected (different emit path).

### Queued adopter-bug list (triaged; gate = before fix-dispatch)
**LANDED + verified this session:** GITI-017-residual (`3341f34d`) · GITI-019 (`fa665e9d`) · 6nz-P (S124, 6nz-verified). Fix-landed notices sent + PA-independently verified.
**IN FLIGHT:** Bug W (CRITICAL — see ledger).
**Still queued:**
1. **GITI-018** (HIGH blocker — multi-`scrml:` stdlib library-mode; needs scoping)
2. **6nz-S** (MED — `return not`+const mis-emit; needs locate-survey; workaround `return null`)
3. **6nz-V** (MED — `class:NAME` on for-lift stale; **RE-VERIFY AFTER Bug W** — its repro is Bug-W-contaminated; emit IS reactive so symptom is subtler, likely per-iteration `it`-capture / reused-node re-subscribe)
4. **6nz-U** (LOW — bare `/` after close-tag → E-SYNTAX-050; likely M6-subsumed)
5. **GITI-015** (LOW — is some ternary + computed LHS; workaround exists)
(6nz-P/Q CLOSED · 6nz-R RETRACTED · 6nz-L/T deferred-to-M6 · meta-effect-write-during-render: 6nz not-filing; `W-EFFECT-WRITE-DURING-RENDER` lint parked as candidate)

## Maps (S126)
Refreshed `73dd816c`→`dc073b94`, committed `16042a30`. NOTE: now ~4 commits stale (MCP/017/019 + Bug-W in flight) — refresh before next dev dispatch that touches mapped surfaces. The refresh SURFACED the A↔B contract gap (Rule-4 win: maps-vs-source beat A's false self-report).

## S126 dispatch ledger
**LANDED (S67 file-delta, PA-authored, hook-gated, 0 regressions each):**
- `55325b10` MCP-V0.A-tests + A↔B form-contract fix (+30). **MCP-V0.A CLOSED → MCP-V0.C unblocked.** Nested compound keys (submitted decodes) + engine cellKey + channel logic-body descent bug also fixed.
- `3341f34d` GITI-017-residual — 2nd not-lowering site (`expression-parser.ts::preprocessForAcorn`) fenced via shared `codegen/code-segments.ts` leaf module (+11). Verified `/not a jj repo/i` verbatim.
- `fa665e9d` GITI-019 — `emit-lift.js` paren-wrap before `?? ""` (+4). Verified node --check pass. **PATH-DISCIPLINE INCIDENT #12** (Edit/Bash filesystem divergence leaked into main; S99 recovery; documented in commit body).

- `a91ad5de` **Bug W (CRITICAL, 6nz P0)** — precedence-aware `emitBinary` in `codegen/emit-expr.ts` (Approach B, user-ratified over preserveParens). Fixes silent paren-drop `(2+3)*4`→`2+3*4` (+24). Verified `(2 + 3) * 4` = 20. No-double-paren confirmed (self-bracketed forms excluded). 6nz fix-landed notice sent + verified. **PATH-DISCIPLINE INCIDENT #13** (2nd consecutive — Edit/Bash divergence leaked to main; agent self-recovered; PA dual-verified main clean pre-landing).

**WAVE STATUS (post-S126 adopter/MCP wave — supersedes any earlier in-flight bullets below):**
- ✅ **MCP-V0.C LANDED** `be7a3ded` — 11 tools over stdio, SDK `@modelcontextprotocol/sdk@1.29.0` (MIT), +24. **MCP-V0.C CLOSED.** D/E remain (D: add `mcp` to stdlib bundling allowlist + inject `startMcpServer` on `<program mcp>`; Tool-7 shape gap: chunks.json has no `serverFnNodeIds` → `get_reachable_server_fns` degraded-honest, needs A-side nodeId). Incident #14 (cd-leak of bun-add into MAIN; agent reverted, PA dual-verified clean).
- ✅ **GITI-018 LANDED** `32c2fd39` — `rewriteStdlibImports` now rewrites ALL `scrml:` imports in `--mode library` (root cause: `^import` anchor disallowed leading indentation, not the "no /g" guess). +4. **Mailbox prototype WORKED** (agent polled startup/commit/final, seed-only, `mail-ack: none`).
- 🛑 **dashboard-async STOPPED (no fix, by design — bounded-brief working as intended).** Diagnosed a REAL pre-existing compiler bug (see TRACKED ITEM). Worktree a7ddf56d produced no landable work (diagnostic instrumentation reverted). Incident #15 (cwd-reset into MAIN for a compile/run command leaked diagnostic instrumentation to `scheduling.ts`; PA reverted to HEAD — nothing lost, no fix to preserve).
- ⏳ **6nz-S (af913acc) STILL RUNNING** — `preprocessForAcorn` `return not` fix. Mailbox + Bash-edit. Land + independently verify when it returns; then send giti/6nz fix-landed notices for the wave.

### NEW TRACKED ITEM — compiler-managed-async gap (phantom `route.functionName`)
`scheduling.ts::hasServerCallees`/`isServerCallExpr` read `route.functionName` — a field that **does not exist** on `FunctionRoute` (only `functionNodeId`). So `serverFnNames` is **always empty** via the routeMap path → server-fn-calling CLIENT functions never get `async`/`await`. GITI-001 worked only as an independent post-emit string rewrite. **This is the corpus-sweep's underlying compiler gap** — full-stack runtime breakage (dashboard, ~certainly 03-contact-book `loadContacts`, the "≥6 runtime bugs"). 3-layer fix: L1 fix `serverFnNames` resolution (small, scheduling.ts — reuse `buildServerFnNames(fnNameMap)` pattern) · L2 auto-await plain `const`/`let`-decl + bare-expr server-fn inits (medium, emit-logic.ts; today only `!{}` guarded-expr auto-awaits) · L3 **transitive async-coloring across client functions = NEW SUBSYSTEM** (per-file client-call-graph fixpoint + await-insertion at every async-client-fn call site; broad blast radius). **DISPOSITION (agent rec + PA + user "get it right"): DEFER to dedicated A9-class async-coloring work; do NOT blind-patch; all-3-or-none (L1+L2 alone = half-fixed dashboard).** First-class item; anchors the post-M6 full-stack-runtime cluster. Refs: dashboard NOTES + corpus-sweep PLAN + GITI-001 `d23fd54` / GITI-005 `e585dba`.

### S126 directive — INTENTIONAL & EXACTING THROUGH M6 (user, this session)
User (verbatim): *"from here. lets be intentional and exacting through the rest of M6. Still parallel if safe. but let's get it right."* → M6 discipline: (1) one M6.5 unit at a time, or genuinely-disjoint pairs — NOT a fire-hose (the 5 path-discipline near-incidents this session scale with concurrency). (2) within-node canary re-run after EVERY parser-shape change (pre-commit gate EXCLUDES `parser-conformance-*`; S125 false-green lesson). (3) Bash-edit + no-`cd` mitigation in every M6 brief (pa.md S99 pt 5). (4) per-unit PA diff review + dual-verify before each file-delta. (5) M6.7 flag-flip: build the "what-breaks-if-flipped" within-node-shape diff harness BEFORE flipping (the S124 845-failure lesson). (6) no premature M6.8 deletion — parity RIGHT first. **WRAP user-voice TODO: append this directive verbatim.**
- **GITI-018 (ab24dfdb)** — fix `rewriteStdlibImports` (api.js) to rewrite ALL `scrml:` imports in `--mode library` (one-shot bug) + leading-comment case. Pinned to that function; STOP if it balloons into shared api.js regions (MCP-C collision guard). Carries Bash-edit mitigation + mailbox.
- **6nz-S (af913acc)** — tighten `preprocessForAcorn` `not\s+operand` rewrite (expression-parser.ts) so `return not` (+ keyword-following / cross-statement-boundary) doesn't mis-lower to `return !`. Builds on GITI-017 (`3341f34d`). Carries Bash-edit mitigation + mailbox.

**S126 INFRA ADDS:** (1) **Bash-edit mitigation** ratified into pa.md S99 addendum point 5 — dev briefs instruct Bash-only edits on worktree-abs paths (the #12/#13 Edit/Bash-divergence fix); now in every new brief. (2) **Mid-flight mailbox prototype** — `.claude/agent-mail/<slug>.md` (gitignored, MAIN), agent polls at every commit/doc checkpoint, PA appends course-corrections. First live use on GITI-018 + 6nz-S. If it works, formalize in pa.md; if not, retire. (MCP-C + earlier dispatches predate it.)

**WRAP TODO (don't miss):** append S126 to `user-voice-scrmlTS.md` — incl. the user's **Approach-B ratification for Bug W** (picked precedence-aware printer over preserveParens via AskUserQuestion) + the session's other contentful directives ("the MCP track / make sure bug fix notices are in the msgs", "fire C in parallel with W", the build-bench feasibility ask).

**RECURRING INFRA SIGNAL:** path-discipline incidents #12 (GITI-019) + #13 (Bug W) were BOTH the Edit/Bash filesystem-divergence class, two consecutive dispatches. The deferred PreToolUse hook (reject subagent Write/Edit whose abs path is in main, not the active worktree) is now the highest-leverage infra fix outstanding — surface to user for v0.4+ prioritization.

**Worktrees retained (clean at wrap):** ab36f664 (MCP-A) · a01d4c35 (017) · a6aa73fd (019) · a44e5c9c (Bug W) · a2939a2f (MCP-C, running).

## Build-time bench (S126 — user asked feasibility; AWAITING decision)
Native-parser speed vs BS+Acorn — never benchmarked (S119 open measurable, "worth before M6"). Findings: `--parser=scrml-native` at CLI runs native as an OBSERVABILITY SHADOW (compile.js:109 — legacy AST still canonical; S119 changelog says "routes" — DISAGREEMENT, verify before trusting). Single-file CLI `time` is Bun-startup-dominated (legacy 0.10s == native 0.10s). **Right bench = a parse-stage micro-harness** (BS+Acorn front-end vs native front-end, in-process, N iters over corpus, front-end-only timing) — doesn't exist yet (~1-2h). Caveats surfaced to user: total build delta likely small (front-end is 1 of ~10 shared stages; native's payoff is architectural not speed); parity-limited (native errors on trucking-dispatch/mario — cleanest corpus is the C2 999/1000 set). PA offered to build the harness (zero-collision); user has not yet said go/hold.

## Tags
#session-126 #OPEN #3-fixes-landed-verified #bug-w-critical-in-flight #mcp-v0-a-closed #path-discipline-incident-12 #notices-sent #mcp-c-next
