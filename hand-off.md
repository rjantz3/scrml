# scrmlTS — Session 103 (OPEN)

**Date:** 2026-05-18
**Previous:** `handOffs/hand-off-105.md` (S102 CLOSE — rotated at S103 open)
**Machine:** single-machine (per S100 directive)
**HEAD at S103 OPEN:** `1f98d60` (`chore(s102-close): wrap — hand-off + master-list + changelog + user-voice`)
**Origin sync at OPEN:** scrmlTS 0/0 · scrml-support 0/0
**v0.3.3 tag:** cut S102 (`5815cf6`); pushed

---

## State-as-of-OPEN

| Item | Status |
|---|---|
| Tests pre-commit subset (S102 CLOSE) | 12,718 pass / 88 skip / 1 todo / 1 fail / 663 files / 43,030 expect |
| The 1 fail | `self-compilation: compiled module shape > compiled modules export resolveModules and runMetaChecker` — S102 LOCAL self-host bootstrap brokenness (rebuild-self-host-dist.ts overwrote May-11 dist with broken-import-path versions; dist files gitignored; nothing propagated to origin) |
| Worktree list | main only (verified) |
| Origin sync (scrmlTS) | 0/0 |
| Origin sync (scrml-support) | 0/0 commits behind/ahead — **but 1 UNTRACKED FILE** at `docs/deep-dives/formFor-design-2026-05-18.md` (1703 lines / 103KB, S102 work — was not committed during S102 wrap) |
| Inbox `handOffs/incoming/` | empty |
| Path-discipline hook | active (scrmlTS-local) |
| Pre-push hook | source-controlled; installed |
| Self-host dist state | all 11 files at `compiler/dist/self-host/*.js` dated May 18 17:47 = S102's broken regen state (gitignored — local only) |

---

## Items needing immediate S103 surfacing to user

1. **Unpushed S102 work in scrml-support** — `docs/deep-dives/formFor-design-2026-05-18.md` (103KB / 1703 lines) is untracked. S102 user-voice + hand-off both reference this deep-dive as load-bearing authority for the formFor SPEC + impl work. The S102 wrap did not commit it. **Recommendation:** commit + push to scrml-support before any S103 substantive work, so the public deep-dive authority is captured. (One-line: `docs(deep-dives): formFor design — 10 OQs + 2 debate verdicts (S102)`.)

2. **Self-host bootstrap broken-import-path state** (S102 carry-forward, §0.6 master-list documented) — all `compiler/dist/self-host/*.js` are dated May 18 17:47 (today). Newly-compiled versions have a broken import path (`../../../stdlib/compiler/expression-parser.js` doesn't exist). 1 fail in pre-commit subset. **Two paths** for S103: (a) investigate `compiler/scripts/build-self-host.js` generator + `compiler/self-host/meta-checker.scrml` source for the broken-import origin; possibly fix `compiler/self-host/ast.scrml`'s 102 pre-existing compile errors first; ~2-4h. (b) delete the dist files and let `bun test compiler/tests/integration/self-compilation.test.js` SKIP cleanly; 0 substantive damage (dist gitignored). Pick before any compiler-source dispatch lands.

3. **Map currency** — `/map incremental` last ran S101 (`a69d9e7`). S102 added ~25 commits including PGO Phase 3 wave + formFor SPEC + formFor impl + runtime-perf SCOPING. Maps are stale. **Decision needed:** refresh maps incrementally for S102 deltas, or defer until next dispatch needs them?

---

## S102 closure summary (carried from rotated hand-off-105.md)

S102 was a 25-commit heavyweight across 3 macro-tracks:

1. **PGO Phase 3 wave** — −62% trucking-dispatch pipeline reduction (2326ms → ~880ms median). 4 commits + 2 SCOPING docs. S94 hypothesis REFUTED (`emit-bindings`+`emit-reactive-wiring` were 2.6% of emit-client; actual hot path = `post-fn-name-mangle` 58% + `detect-runtime-chunks` 33%). Byte-identical output verified across all 4 landings.

2. **formFor (FLAGSHIP L22 family member)** — SCOPING → deep-dive (`scrml-support/docs/deep-dives/formFor-design-2026-05-18.md` — UNPUSHED, see #1 above) → 2 debates (OQ-FF-1 slot-style 51.5/60, OQ-FF-2 explicit-attr+slot+PE-default 52/60) → SPEC §41.14 (8 error codes) → impl landing (11 files / +2733 LOC / +58 tests). End-to-end verified.

3. **Runtime-perf SCOPING** — 3-phase ladder mirroring PGO methodology; Phase 1 includes vanilla-JS baseline (per S102 user direction). 4 OQs pending user disposition before P1.A+P1.B dispatch.

**v0.3.3 patch tag cut + pushed mid-session** (`5815cf6`). pkg.json bumped 0.3.2 → 0.3.3 per pa.md bump-on-tag rule.

**Process violation:** PA used user-authorized `--no-verify` to push the 4-commit late-session wave (P3.B-followup + formFor + runtime-perf SCOPING + stripIds fix) because the self-host fail was blocking pre-push. Surfaced in S102 commit-message + this hand-off per S88 visibility protocol.

---

## Carry-forwards available for S103 priority menu

**Compiler / self-host:**
- Self-host bootstrap dist-pipeline brokenness (~2-4h) — see #2 above

**formFor follow-ons** (sequenced as ready; needed before §53.14.3 family-roster flips to "shipped"):
- stdlib export `formFor` + `registerLabels` (~5-8h)
- Sample + example app — flagship demo for scrml.dev (~3-5h)
- scrml.dev refresh + README compile-gate block (~3-5h)
- Comprehensive conformance corpus beyond happy-path + per-error-code (~3-5h)
- `disabled=!@cell` reactive-attr wiring fix (pre-existing compiler-wide gap surfaced by formFor default submit button; workaround = slot="submit" override; ~2-4h)
- v1.next: per-type renderer registry `data.registerRenderer` (~3-5h, per OQ-FF-1)
- v1.next: `@label("...")` type-field annotation (~3-5h, per OQ-FF-7)
- v1.next: auto-recurse into nested struct fields (~5-8h, per OQ-FF-11)

**Runtime-perf** (user-authorized):
- Phase 1 dispatch (P1.A vanilla-JS baseline + P1.B scrml runtime instrumentation parallel, ~9-18h) — 4 open questions pending user disposition:
  1. Authorize Phase 1 (P1.A + P1.B parallel)?
  2. Playwright real-Chrome path if happy-dom masks the profile?
  3. Vanilla-JS style (raw DOM per js-framework-benchmark canonical, recommended) vs pseudo-vanilla with helpers?
  4. Scope (existing 8 ops only, or add scrml-strength differentiating ops)?

**PGO Phase 3 follow-ups** (anticipated; deferred per agent reports):
- (a) `hasEqualityExpr` flag — sibling Option-2 pattern; smaller expected savings (~1-2h)
- (b) Markup/for-stmt double-walk fold in `detectRuntimeChunks` lines 568-570 + 587 (~2-3h)

**Native parser:**
- M2 expression parser (~2-4 sessions per DD §D7; M1 lexer ladder complete S101 + S102 M1.5)
- §48.6.4 `pinned fn` parser-recognition impl (SPEC landed S98; small dispatch ~2-4h)

**Bug-4** dot-path render-by-tag — heads-up coding gate (full pipeline post-signal). User heads-up coding sessions are the pre-pipeline filter.

---

## Carry-forwards (across-session standing rules — unchanged from S102 CLOSE)

- pa.md Rules 1-5 (no marketing / full-production fidelity / right > easy / SPEC normative / shoot straight)
- All S96-S102 PA-memory rules unchanged
- S102 NEW: README staleness paradox methodology (refresh-or-remove inline staleness warnings when refreshing the data itself)
- S43 cross-machine (dormant per S100)
- S83 commit discipline two-sided rule
- S88 `isolation:"worktree"` mandatory + `--no-verify` requires explicit auth
- S91 CWD-routing rule (`git -C` doesn't change shell CWD; verify pwd before Agent dispatches after sibling-repo cd)
- S95 communication norms (shoot straight, no preambles, push back when warranted)
- S96 SPEC-at-session-start
- S98 Pillar 5b (Reach discipline)
- S99 path-discipline addendum + voice-author reuse-over-reinvent + context-budget operational datum
- S100 PreToolUse hook (path-discipline closed at platform level)
- S101 v0.3.x patch arc pattern (bump-commit-tag-push paired; README gate as release-tag gate)
- S101 standing rule — corpus-ouroboros pre-dispatch sanity check (`git log --grep=<feature>` BEFORE authoring SCOPING)

---

## Things S103 PA must NOT screw up

In addition to S102 carry-forwards:

- **Don't run `rebuild-self-host-dist.ts`** until the broken-import-path bug is fixed. Once that's run, the May-11 working dist files are lost. The repair path needs to fix the generator OR fix `compiler/self-host/meta-checker.scrml` source.
- **PGO Phase 3 byte-identity is a hard invariant.** Any future runtime optimization (Phase 3 follow-ups OR runtime-perf Phase 3) MUST verify byte-identical output OR explicitly document the bundle-shape change.
- **formFor §41.14.10 Pillar-5 invariant.** Any future formFor impl changes MUST preserve "emitted output is standard scrml, readable as if hand-authored."
- **OQ-FF-7-skip precedent is for HIGH or MED-HIGH confidence verdicts only** (S102 methodology rule).
- **README BM table has its own staleness clock from any inline warning above it** (S102 methodology rule).
- **`--no-verify` requires explicit user authorization per session** (S88 / S99 standing rule). Each push that needs it is its own authorization, not blanket-future.

---

## Tags

#session-103 #OPEN #post-v0.3.3 #self-host-dist-broken-carryforward #formFor-deep-dive-unpushed #single-machine
