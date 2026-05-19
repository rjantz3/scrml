# scrmlTS — Session 101 (CLOSE)

**Date:** 2026-05-17 → 2026-05-18
**Previous:** `handOffs/hand-off-103.md` (S100 CLOSE — rotated at S101 open)
**Machine:** single-machine
**HEAD at S101 CLOSE:** v0.3.2 cut commit (this session) ahead of `bd5811d` (README block #3 wrap-form post-Bug-3)
**Origin sync at CLOSE:** scrmlTS pushed (incl. tag v0.3.2); scrml-support pushed (QUEUED dot-path deep-dive)

---

## S101 net outcome — substantial 18-commit session + v0.3.1 + v0.3.2 cuts

S101 was a heavyweight session. Two release tags cut (v0.3.1 + v0.3.2). Two real compiler bugs caught + fixed via a NEW tooling surface (README compile-gate). The M1 native-parser lexer ladder completed (M1.4 InRegexBody). Three substantive scope-correction moments where sub-agents surfaced shipped-state rather than silently re-implementing — corpus-ouroboros caught three times.

## Tests at S101 CLOSE

- **Pre-commit subset** (unit + integration + conformance): **12,660 pass / 88 skip / 1 todo / 0 fail / 660 files / 42,679 expect** (+15 from S101 baseline 12,645)
- **Native-parser conformance**: 97 pass / 0 skip / 0 fail (M1 ladder complete; M1.5 normalizer extension still pending for `expr-literals.js` full-disposition flip)
- **README compile-gate**: **3 pass / 1 skip / 0 fail** out of 4 blocks (gate is green)
- **Pre-push gate**: clean every push this session

## S101 commit chain (18 substantive commits, 2 tag cuts, all pushed)

| # | Commit | What |
|---|---|---|
| 1 | `d77a60d` | fix(compiler): String.replace `$&` audit — 3 sites (component-expander + tailwind-classes + generate.js) |
| 2 | `fae88e4` | docs(native-parser): reframe M1.2 ANOMALY-4 — `var=` + full enumeration are SPEC-CANONICAL, not gaps |
| 3 | `cbe1b1e` | **release(s101): v0.3.1** — patch bump + annotated release notes |
| 4 | tag `v0.3.1` |  |
| 5 | `4ffd085` | docs(scoping): A9 Ext 4 body-split min-viable — SCOPING.md authored (later HISTORICAL-bannered) |
| 6 | `020e47d` | docs(pipeline): 0.7.2 — Stage 2 (BS) v0.next addendum for §4.17 raw-content |
| 7 | `8628a3a` | feat(native-parser): M1.3 — line + block comment body dispatchers (90/0/0 conformance) |
| 8 | `dae8ff1` | docs(native-parser): strike moving-target counts; refresh test-file header for M1.4 |
| 9 | `c40610f` | feat(native-parser): M1.4 — InRegexBody dispatcher (M1 ladder closer; 97 conformance) |
| 10 | `a69d9e7` | docs(maps): /map incremental S101 — 8 maps regenerated, 1 NEW (native-parser.map.md) |
| 11 | `7e39828` | docs(s101): scope-correction — A9 Ext 4 already shipped at S72; A1c FULLY CLOSED (master-list stale-row fix + SCOPING.md HISTORICAL banner) |
| 12 | `99fd3cf` | feat(tooling): README scrml compile-gate on release-tag pushes (extractor + pre-push hook + marker convention + disclaimer) |
| 13 | `d21c32d` | fix(type-system): bug-2 — state-decl bind preserves prior reactive type (subsequent bare-variant writes; +8 tests) |
| 14 | `52456f7` | fix(bs): bug-3 — compound state-decl auto-lift in `<program>` / `<page>` / `<channel>` body (+7 conformance) |
| 15 | `bd5811d` | docs(readme): block #3 — wrap-form + drop redundant `${...}` post-Bug-3 (gate now green) |
| 16 | scrml-support `227b874` | docs(deep-dives): QUEUED — dot-path render-by-tag for compound children (S101 surfaced) |
| 17 | (this commit) | **release(s101-close): v0.3.2** — wrap + bump + hand-off + master-list + changelog |
| 18 | tag `v0.3.2` |  |

## Session-defining outcomes

### 1. v0.3.1 + v0.3.2 patch tags cut

v0.3.1 mid-session (`cbe1b1e`); v0.3.2 at close. First exercise of the NEW README compile-gate as a real pre-push blocker: v0.3.2's push WILL fire the gate; current state is green (3/1/0). Per pa.md S94 bump-commit-tag-push paired discipline.

### 2. Two real compiler bugs caught + fixed via README compile-gate

Bugs #2 + #3 surfaced by the gate's dry-run on README — gate did its job exactly as designed (community-SoT accuracy enforcement).

- **Bug-2 (`d21c32d`)** — state-decl bind clobber. Subsequent `@cell = .V` writes within a function body cleared the engine pre-bind's enum type → bare-variant inference dropped → E-VARIANT-AMBIGUOUS on every second-and-after bare-variant write. Fix: surgical guard at state-decl bind site to preserve prior reactive type when local resolvedType is `asIs`/`unknown`. 8 regression tests across 5 sub-describes.
- **Bug-3 (`52456f7`)** — compound state-decl `<formRes>` ... `</>` shape doesn't auto-lift in `<program>` body. The S86 v0.3 "default-logic mode" amendment shipped Shape 1 + Shape 2 auto-lift but missed the compound form (different lookahead pattern). Fix: BS-layer extension — NEW `COMPOUND_LIFT_EXEMPT_TAGS` Set, `classifyOpenerForCompoundScan`, `peekCompoundStateDeclSignal`, `scanCompoundBlockEnd` (depth-tracked); ast-builder `TOPLEVEL_STATE_DECL_RE` broadened terminator. 7 conformance tests.

Both surfaced via the README gate dry-run; both fixed in parallel background dispatches.

### 3. NEW Bug-4 SURFACED + QUEUED for full design pipeline

Bug-3's fix UNMASKED a third gap: dot-path render-by-tag (`<entry.name/>`) doesn't work in markup-mode outside `${...}` (works inside `${...}` via the markup-as-value pillar). Adopter ergonomics question; not a patch fix. User S101 verbatim:

> "honestly, i really like the dot path but it would requre the full pipeline as it would inolve spec, docs, and impl. deep-dive, debate, the whole 9 yards"
>
> "we would have to use it in heads up coding as well see how i like the way it looks and feels and reads"

Filed at `scrml-support/docs/deep-dives/QUEUED-dot-path-render-by-tag-compound-children.md`. Pre-pipeline filter: heads-up coding sessions to validate look/feel/read against substantive scrml.

### 4. README compile-gate INFRASTRUCTURE shipped

`scripts/extract-readme-scrml.js` (extractor + compile + ghost-pattern lint) + `scripts/git-hooks/pre-push` (source-controlled, branches on `refs/tags/v*` ref payload) + README disclaimer near Documentation section + `// gate: skip` marker convention. Triggered only on release-tag pushes; regular pushes unchanged. Default: gated (opt-OUT via `// gate: skip`) per user-stated accuracy intent.

### 5. M1 native-parser lexer ladder COMPLETE

M1.3 line + block comments + M1.4 InRegexBody dispatcher landed via two parallel background dispatches. All 7 LexMode state-children now have substantive body dispatchers. Conformance 87/3/0 → 90/0/0 (M1.3) → 97/0/0 (M1.4; +7 direct dispatcher tests).

### 6. Three corpus-ouroboros catches via pre-dispatch sanity check

PA discipline was tested + held three times. In each case, a sub-agent's pre-dispatch grep caught that PA had authored a SCOPING/dispatch brief for work that was already shipped:

- **§51.0.Q.1 ANOMALY-4** (M1.2 framing) — `var=innerLexMode` + full state-child enumeration framed as "compiler gaps." Per SPEC §51.0.C + §51.0.Q.1, both are spec-canonical patterns. README + comment reframed (`fae88e4`).
- **A9 Ext 4 SCOPING dispatch** — PA authored a 205-line SCOPING.md ("v0.4 anchor") for work shipped at S72 (`dc98313`, 10 days before SCOPING was authored). Sub-agent surfaced via pre-dispatch sanity check; no code written. SCOPING.md HISTORICAL-bannered (`7e39828`).
- **master-list A1c stale-row** — phase-progress table claimed "Wave 4 next" while line-98 narrative said "FULLY CLOSED Waves 1-6, C0-C23 ALL SHIPPED." Table-vs-narrative drift; corrected (`7e39828`).

Standing rule that crystallized this session: **PA must `git log --grep=<feature>` BEFORE authoring SCOPING for any feature claimed by master-list.** The sub-agent's pre-dispatch sanity check is the canonical pattern; PA-direct work should mirror it.

### 7. /map incremental refresh — 8 maps + 1 NEW (native-parser.map.md)

Map watermark advanced from S92 (`13154ba`) → S101 (`a69d9e7`). Regenerated: primary + structure + schema + domain + error + test + non-compliance.report + NEW native-parser.map.md. Skipped (no relevant changes): dependencies + config + build + events. 4 non-compliant docs carried forward (all pre-existing self-marked); 3 uncertain unchanged.

### 8. v0.4 framing question surfaced (not resolved)

The pre-existing v0.4-anchor framing in the May 14 roadmap article ("v0.4 = body-split") is stale — body-split shipped at v0.2.0. User direction post-acknowledgement: cut v0.3.2 first (done) → formFor as the v0.4 anchor → chip away at profile-guided optimization wherever we can. SCOPING for formFor + PGO entry points DEFERRED to S102+.

## State-as-of-CLOSE

| Item | Status |
|---|---|
| Tests pre-commit subset | 12,660 / 88 / 1 / 0 / 660 files |
| Native-parser conformance | 97 / 0 / 0 (M1 complete) |
| README compile-gate | 3/1/0 green |
| Worktree list | main only |
| Origin sync (scrmlTS) | 0/0 (post-push) |
| Origin sync (scrml-support) | 0/0 (post-push) |
| Inbox `handOffs/incoming/` | empty (only `dist/` + `read/` subdirs) |
| Path-discipline hook | active scrmlTS-local |
| Pre-push hook | source-controlled; installed via install.sh |

## Open / pending threads (carry to S102)

| Item | Status |
|---|---|
| **formFor** (L22 family next member; v0.4 anchor) | User-authorized; needs SCOPING + per-shape sliver test + synonym-detection precondition + deep-dive per L22 family discipline |
| **Profile-guided optimization** ("chip away wherever we can") | User-authorized incremental approach; entry-point candidates unknown — needs scoping for instrumentation hooks + runtime profile-collection scaffold |
| **Bug-4 — dot-path render-by-tag** | QUEUED for full design pipeline (deep-dive + debate + SPEC + docs + impl). Pre-pipeline: user runs heads-up coding sessions with wrap-form to validate dot-path mentally-substituted reads cleaner. |
| **M1.5 — regex-token normalizer extension** | Deferred. Closes the `expr-literals.js` bench-file `"M1.2-string-template-regex"` → `"full"` flip. ~30min mechanical work. |
| **M2 — expression parser** | Native-parser ladder next milestone post-M1 ladder. ~2-4 sessions per DD §D7. |
| **§48.6.4 parser-recognition impl** | SPEC landed S98; impl still pending (`pinned fn` parser recognition). Small dispatch. |

## Carry-forwards (load-bearing across sessions — unchanged)

- pa.md Rules 1-5
- All S96-S101 PA-memory rules (S101 new: NONE filed yet — could write `feedback_corpus_ouroboros_pre_dispatch_sanity_check.md` to make the standing rule explicit)
- S43 cross-machine (dormant)
- S83 commit discipline two-sided rule
- S88 isolation:worktree mandatory + `--no-verify` requires explicit auth
- S91 CWD-routing rule
- S95 communication norms (shoot straight)
- S96 SPEC-at-session-start
- S98 Pillar 5b (Reach discipline)
- S99 path-discipline addendum + S100 PreToolUse hook
- S99 voice-author reuse-over-reinvent
- S99 context-budget operational datum
- **S101 NEW:** v0.3.x patch arc pattern (bump-commit-tag-push paired; READMR gate as release-tag gate)

## Things S102 PA must NOT screw up

In addition to S100 carry-forwards:

- **Bug-2 fix is a guard-on-rebind pattern.** Don't naively expand to other bind sites without verifying the same clobber pathology. Future bare-variant inference work touching `type-system.ts:4928` area needs to preserve the guard.
- **Bug-3 fix uses `COMPOUND_LIFT_EXEMPT_TAGS` Set** — `program` / `page` / `channel` / `schema` / `seeds` / `module`. If a new document-root structural element gets added (e.g., a `<library>` or `<package>` keyword in some future SPEC §4.x amendment), it MUST be added to the exempt set OR the compound-classifier will misclassify the new element's body. Test coverage at `conf-COMPOUND-STATE-DECL-AUTOLIFT.test.js` includes a NEG case for `<div>`; add similar NEG when extending.
- **The README compile-gate is INFRASTRUCTURE on release-tag pushes.** Regular pushes don't run it. Any future authoring change that breaks an example will block the next v0.X.Y push (correct behavior); don't reach for `--no-verify` on tag pushes without surfacing the failure.
- **Bug-4 dot-path is QUEUED, not deferred-forever.** Pre-pipeline filter is the user's heads-up coding sessions. If a coding session surfaces dot-path-feels-clean signal, escalate to deep-dive. If it never gets re-raised, that's also signal (the wrap-form stays canonical).
- **Sub-agent pre-dispatch sanity check IS the standing rule.** When authoring SCOPING for any feature, `git log --grep=<feature> --since=<plausible-shipping-date>` is the mandatory check. The S101 A9 Ext 4 dispatch demonstrated this; PA-direct work should mirror it.

## Session-start checklist for S102 PA

1. Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL
2. Read `docs/PA-SCRML-PRIMER.md` IN FULL (Pillar 5b applies; S98 ratification)
3. Read `compiler/SPEC-INDEX.md` IN FULL
4. Read `master-list.md` §0 LIVE DASHBOARD IN FULL — **NOTE the S101 stale-row correction at A1 row**; future stale-row catches should follow that pattern
5. Read this `hand-off.md` (S101 CLOSE) — will be rotated to `handOffs/hand-off-104.md` at S102 open
6. Read last ~10 contentful user-voice entries from `../scrml-support/user-voice-scrmlTS.md`
7. Session-start sync hygiene: `git fetch origin && git rev-list --left-right --count origin/main...HEAD` should be 0/0
8. Inbox check — `handOffs/incoming/*.md` should be empty
9. Verify worktrees: `git worktree list` shows main only
10. Verify path-discipline hook + pre-push hook installed
11. Report: caught up + next priority

## Tags

#session-101 #CLOSE #v0.3.1-cut #v0.3.2-cut #m1-ladder-complete #bug-2-fixed #bug-3-fixed #bug-4-queued #§4.17-raw-content #readme-compile-gate #corpus-ouroboros-caught-3x #scope-correction-mastered #18-commits #pre-commit-12660 #zero-regressions #pushed-to-origin
