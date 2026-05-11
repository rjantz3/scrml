# scrmlTS — Session 79 (OPEN — machine-switch arrival · pre-commit hook installed on this machine)

**Date opened:** 2026-05-10
**Previous:** `handOffs/hand-off-78.md` (S78 close — Phase A10 SHIPPED end-to-end · 6-deep deferral chain CLOSED · A5-6 Feature 1 UNBLOCKED · SPEC + test conformance audits BOTH COMPLETE · 16 commits / +101 tests / 0 regressions / pre-commit hook installed on the OTHER machine · ALL 6 environmental fails CLOSED · debounce/throttle re-deliberation COMPLETE (Approach B ratified) · hardcoded threshold sweep COMPLETE)
**This file:** rotates to `handOffs/hand-off-79.md` at S80 open
**Tests at open (S78 close baseline):** 11,051 pass / 77 skip / 1 todo / 0 fail (530 files)

---

## S79 open — caught up

**Cross-machine sync (session-start protocol):**
- scrmlTS: `0 / 0` origin (clean working tree). HEAD already at S78 close + machine-switch wrap commits (no pull required).
- scrml-support: `0 / 0` origin (clean working tree).

**Per-machine setup — pre-commit hook:** This machine's `core.hooksPath` was unset (defaulted to `.git/hooks`). Ran `git config core.hooksPath scripts/git-hooks` per pa.md "Per-machine setup" section. Verified: now points at `scripts/git-hooks`. Hook will fire on every commit going forward.

**Inbox state:** `handOffs/incoming/` empty (only `read/` and `dist/` subdirs). No pending action items.

**Master inbox carry-overs (3 legacy/superseded — safe-to-ignore unless sweep requested):**
- `2026-04-22-scrmlTS-to-master-insight-25-multi-meta.md` (UNREAD legacy, S30s era)
- `2026-05-08-S72-scrmlTS-to-master-needs-push-SUPERSEDED.md` (renamed at master-push retirement)
- `2026-05-08-S71-scrmlTS-to-master-stage-scrml-dev-pipeline.md` (UNREAD; pipeline-substitution clean across 30+ dispatches in S73-S76)

**Self-host dist artifacts:** `compiler/dist/self-host/*.js` + `compiler/self-host/dist/tab.js` present on this machine (pre-existing from prior work; not regenerated this session). If pre-commit hook rejects on a self-host smoke test, run `bun run scripts/rebuild-self-host-dist.ts` per pa.md "Per-machine setup" § "When the hook fails on a clean checkout".

**User-voice state (last contentful read at S79 open):** S67 + S72 entries reviewed. S73-S78 produced no new user-voice entries (SHIP-heavy sessions). Key durable directives carried forward:
- S67 worktree-as-scratch / file-delta dispatch landing (standing protocol; supersedes cherry-pick)
- S67 hierarchy "likely locked"; tree-shakeable runtime cost is acceptable (Class B-shakeable OK)
- S67 effects-as-data middle path open (distinct from Koka rejection); state-timeout surface migration is engineering not design
- S67 OQ-Harel-8 resolved → `<engine>` everywhere; Machine Cohesion sharpened (singleton invariant)
- S67 flip conditions are NOT a feature-adoption gating mechanism
- S72 `server function` keyword inference open-thought (low-priority, post-v0.2.0 deep-dive candidate)
- S72 `server function` is anomalous — every other server-side surface is consequence-routed not intent-discriminated
- S72 SCXML adoption IS a Pillar-5 violation by definition; "do we already have it" is the prerequisite question
- S72 LLM-bounded-by-training-data ≠ PA failure; reflex toward "impossible" is a heuristic for "may be outside training"
- S72 vacuum problem: examples-in-isolation lie; examples-in-call-graph tell the truth (caller-context propagation absorbs empty-body classification)

---

## Next priority — menu (S78 carry-over)

Awaiting user direction. S78 close menu carries forward:

1. **A5-6 Feature 1 UNBLOCKED** — named timer + `cancelTimer` builtin (~2-3h dispatch). Phase A10 closed the 6-deep deferral chain; this is the original closure target.

2. **Debounce/throttle Approach B implementation** (~12-21h) — re-deliberation ratified Approach B (clean cut: retire `@debounced(N)` keyword; canonical form `<name debounced=Nms> = expr` per DD5 attribute-on-state-decl). SPEC text + parser/codegen + AST kind retirement + test refactor + sample updates.

3. **Hardcoded threshold sweep — 5 prioritized refactors** (~4h total) per `docs/audits/hardcoded-thresholds-2026-05-10.md`:
   - `MAX_RUNS = 100` at `runtime-template.js:1104` (~30min, Bucket A)
   - `seq > 1331` at `codegen/type-encoding.ts:443` (~45min, Bucket A)
   - `_SCRML_IDEMPOTENCY_TTL_MS` at `codegen/emit-server.ts:1057` (~1h, Bucket C; cross-ref W-LEAK-010 + S72 idempotency-key direction)
   - serve-client timeouts at `serve-client.js:35,55,112,173` (~20min, Bucket B)
   - `keysVar.length > 32766` at `codegen/emit-control-flow.ts:373` (~1h, Bucket C)

4. **Phantom-code disposition pass** — 11 codes need disposition (implement or retire):
   - 7 missed-impls: E-MW-001/002/005/006 (whole middleware validator pass missing), E-CHANNEL-004/005, E-STRUCTURAL-ELEMENT-MISPLACED
   - 1 disabled: E-LOOP-003 (parser blocker)
   - 1 deferred: E-FN-009
   - 1 dead-code bug: E-CTRL-004
   - 1 reachable-but-fixture-blocked: E-IMPORT-007 (CLOSED at S78)
   - Middleware family is biggest gap (whole validation pass missing); ~1 dispatch covers 4 codes.

5. **Bootstrap L3 host-compiler library-mode meta-block strip bug** — `compiler/dist/self-host/ast.js` line 31 corrupted by host-compiler emitting `try { ^{...} } catch {}` residue. Test marked describe.skip with documented reason at `compiler/tests/integration/self-compilation.test.js:513`. Real compiler bug; meta-block strip pass needs fix.

6. **Phase A10 deferred items** (preserved from Phase 1+2 SHIP):
   - Payload-binding scope injection (`<Error msg>` introducing `msg` as local in body sub-scope)
   - Type-system body-walk re-enablement (gated on emission-boundary structural-element filter)

7. **Project-mapper refresh recommended** (S78 OQ #9) — user flagged mid-S78 that maps underestimated reactive-wiring + event-wiring runtime infrastructure surface. Dispatch `project-mapper` to refresh `.claude/maps/` with new `emit-variant-guard.ts` + revised reactive-wiring topology + non-compliance report.

8. **A5 family follow-on (S67-ratified engine extensions, A5-6/A5-7 deferred):**
   - A5-6 Item G remaining B-shakeable timer extensions (~3-7h optional; A5-6 Feature 2 `<onIdle>` shipped S77)
   - A5-7 tests + samples (~12-18h)

9. **A9 Ext 5 follow-ups** (3 in-scope-but-thin, deferred from S76):
   - D1 export-synth modifier propagation
   - D3 pure-fn-call detection in classifier (over-emits keys)
   - D5 Redis backend inlining

10. **A6-6 optional API alignment** — LSP/CG API design dive (TBD).

11. **Insight 28 OQ-bridge-5** — compile-time WARNING when bridged validator on schema-column field — defer to compiler-diagnostics audit pass.

12. **Insight 28 OQ-bridge-2** — passive (re-debate trigger on ≥3 adopter friction reports).

13. **W-LEAK-010 follow-up** (per memory-leak deep-dive refresh §7.2):
    - Step 2: `<program idempotency-store=>` background sweeper (CG/runtime dispatch)
    - Step 3: LC pass implementation (Stage 7.6, SCOPE-AND-DECOMPOSITION dispatch)
    - Recommendation: hold for v0.3.0+ unless W-LEAK-010 spec-amendment is fast-tracked

14. **Versioning-discipline discussion** (deferred S78) — patch-version-as-lifecycle-stage thread (`0.2.1` = post-`0.2.0`-SHIP audit phase, etc.). Adjacent question: should `0.2.0` be re-scoped tighter? Hold for a session of its own.

15. **Multi-token threshold deep-read** (~1-2h) — per S78 sweep caveat; grep can't catch `5 * 1000`-shape; per-file deep-read of `codegen/emit-*.ts` would surface 2-4 more Bucket C items in middleware-config defaults (rate-limit, CSRF, CORS Max-Age).

**Articles thread (5 in-flight drafts at scrml-support/voice/articles/):** Per pa.md Rule 1, no PA-volunteered marketing work; await user-raised threads.

---

## Open questions to surface immediately at S80 open

(none new yet at S79 open — carries from S78 close minus #1 push state which is now CLEAN)

1. **Push state — CLEAN at S79 open.** scrmlTS 0/0; scrml-support 0/0.
2. **Pre-commit hook — INSTALLED on this machine** at S79 open via `git config core.hooksPath scripts/git-hooks`.
3. **Project-mapper refresh** still recommended (carry from S78 #9).
4. **All other S78 OQ items** (A5-6 Feature 1 unblocked, debounce Approach B queued, hardcoded threshold sweep, phantom-code disposition, Bootstrap L3 follow-up, Phase A10 deferred items, multi-token threshold deep-read) — see "Next priority" menu above.
5. **Worktree branches retained from S78** (forensic per S67): `worktree-agent-ad20cd804c0aaf101` (Phase 1+2), `worktree-agent-a15b0eefec8d5fae1` (Phase 3+4), `worktree-agent-a4bb977c87382ef9c` (re-wire), `worktree-agent-a74d552fb9c46d753` (21-code conformance), `worktree-agent-a90b0cc8c6adeb229` (§1.2 catalog backfill). Plus pre-S78 retained branches. Cleanup not priority.

---

## Things S79 PA must NOT screw up

S77/S78 standing list (items 1-217+) carries forward verbatim. **No new S79 additions yet.**

---

## Tags

#session-79 #open #machine-switch-arrival #pre-commit-hook-installed-this-machine #clean-state #awaiting-direction
