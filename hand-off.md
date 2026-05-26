# scrmlTS — Session 132 (OPEN)

**Date:** 2026-05-26
**Previous:** `handOffs/hand-off-134.md` (S131 CLOSE — grammar-lockdown + carry-forward: 3-parallel dispatch [Lifecycle Landing 2 + Iteration Landing 1 + MCP V0.E] + open-Q lockdown sweep [4 HU surfaces ratified] + lockdown post-work 4-parallel [SPEC amendments AB + ~snapshot codegen fix + Iteration Landing 2 SPEC + Lifecycle Landing 2.5]).
**Machine:** same as S131.
**HEAD at S132 OPEN:** `c2d3f7ae`
**pkg.json:** 0.6.0 (no tag cut planned)
**Hooks:** pre-commit + pre-push installed (`.git/hooks`; no post-commit on this machine — pre-commit is the load-bearing gate).
**Tests at open (per S131 close, unverified this session):** 21,584 pass / 0 fail / 170 skip / 1 todo / 794 files.

---

## Session-start state (S132 OPEN)

- **Both repos SYNCED with origin** (`git rev-list --left-right --count origin/main...HEAD` = `0 0` for scrmlTS AND scrml-support). The S131 hand-off recorded both as UNPUSHED-at-wrap; the push landed afterward. **Open question #1 from S131 (push authorization) is RESOLVED — already pushed.**
- **Inbox empty** (`handOffs/incoming/` has only `read/`). No unread cross-repo messages.
- **scrml-support untracked files** (pre-existing, NOT this-session): `tools/` + 5 `voice/articles/2026-05-09-*.md` drafts. Stale private voice-author drafts; not blocking; left untouched.
- **Mandatory session-start reads done IN FULL:** pa-scrmlTS.md (907L) · PA-SCRML-PRIMER.md (1001L) · SPEC-INDEX.md (379L) · master-list §0 (218-464) · hand-off (S131) · user-voice S129+S130.

### Flags surfaced at open (reported to user)

1. **Maps stale.** `.claude/maps/primary.map.md` watermark = commit `3a909c1d` (S126, 2026-05-24). HEAD is `c2d3f7ae` — ~5 sessions ahead (S127 native-parser D-class + S128 + S129 grammar-lockdown audits + S130 lifecycle/iteration landings + S131 landings). **Refresh before any compiler-source dev dispatch** per maps-discipline protocol. Doc-authoring work (PRIMER/kickstarter/SPEC) is less map-dependent.
2. **S131 user-voice gap.** user-voice-scrmlTS.md has NO `## Session 131` section (last is S130). S131 inputs were terse ratification selections ("dispatch 1+2+3 in parallel", "lets lockdown open qs", "a b b go", "hybrid e", "a b a c", "a a a", "a a a a a a a a", "1") — captured in the S131 hand-off + SPEC. Whether any rise to durable-directive level warranting verbatim backfill is a USER call. Memory `feedback_user_voice.md` flags user-voice append as mandatory-every-session; S124/S125/S128 also have no section (momentum sessions under "keep going" — arguably correct no-append). Surface, don't crisis.

---

## Governing arc — Grammar lockdown / consolidation (S129 → present)

User pulled hard brakes at S129 on M6.7 native-parser default-flip work (PA was about to dispatch a fix that would have RE-ADDED a contradiction to the language). Ratified 4-phase grammar-consolidation plan:

- **Phase 1a/1b/1c — audits: DONE** (3 docs landed S129: `docs/audits/spec-consolidation-inventory-2026-05-24.md` + `spec-corroboration-canons-pipeline-2026-05-24.md` + `spec-feature-canon-coverage-2026-05-25.md`).
- **Phase 2 — heads-up coding sessions: IN PROGRESS** (S130 + S131 closed large chunks: Lifecycle Landings 1/2/2.5, Iteration HU-1 + Landings 1/2, SPEC amendments AB, HU-3/4/5/6 lockdown sweep). Phase 1c clusters H-N ratified S131 (HU-6) — authoring queued.
- **Phase 3 — confirm 100% example-code coverage corroborates SPEC: not started.**
- **Phase 4 — re-evaluate further refactor (M6.7 D-class resumes with consolidated SPEC): gated on Phase 2/3.**

---

## Carry-forward menu (from S131 close — ready to dispatch)

### Highest priority
1. **Lifecycle Landing 3** — PRIMER + kickstarter FLAGSHIP section for `(A to B)` lifecycle annotation (F-023 — user flagged FOUNDATIONAL to scrml's type-system identity; currently ABSENT from canon). ~25-40h spread.
2. **Iteration Landing 3** — `bun scrml promote --each` CLI subcommand impl (SPEC §56.10 spec'd S131; impl pending). *Compiler-source → maps refresh first.*
3. **Iteration Landing 4** — PRIMER + kickstarter F-NEW (`<each>`) catch-up.
4. **Iteration Landing 5** — Corpus migration (113 sites; gradual via CLI; W-EACH-PROMOTABLE info→warning→error→strip sunset).
5-11. **Phase 1c Clusters H-N authoring** (HU-6 ratified S131): H flagship reveal (`^{}` + type-as-arg family + refinement zones) · I self-host idiom · J error-handling depth · K kickstarter §4 advanced engines · L worker/sidecar/SSE unified · M module/type-system extensions · N 7 footnote additions.

### Research/design dispatch
12. **`$(param){...}` + L19 DD** authoring (research dispatch — user's S129/S130 `$`-body-mode spit-ball + multi-statement-handler relaxation).
13. **Phase 2 Cluster B-code Site 1 retirement** sub-task arc (META_BUILTINS purge → 5 meta-eval call drops → Pass 4 drop + bun-eval.test.js retire). *Compiler-source.*

### Deferred / nominal
- dev.to publication actions (14-action checklist in user's hands; awaiting post-completion note for changelog).
- §29 vanilla-interop retire-vs-implement (open user decision).
- 6nz-V (GENUINE class:NAME-on-for-lift runtime path; MED) · GITI-015 (LOW) · 6nz-U / 6nz-L/T (queued).
- Build Story §58 impl (Nominal; M6-gated; ~90-200h) · `import:host` §21.3.1 (Nominal) · quoted-text §4.18 compiler fire (Nominal, native-parser waves).
- Compiler-managed-async A9-class gap (deferred per S126).
- Phase 3 (100% example coverage) + Phase 4 (M6.7 D-class resume + v0.7 cut) gated.
- versioning drift reconcile (pkg.json 0.6.0 vs changelog) before any future tag cut.

---

## Open questions to surface immediately (S132)

1. ~~Push authorization~~ — RESOLVED at open (both repos synced; S131 push landed).
2. **What to work this session** — carry-forward menu above. Governing arc is grammar-lockdown Phase 2. PA-lean: Phase 1c authoring (ratified, high-leverage on canon) OR Lifecycle Landing 3 (foundational, F-023). Awaiting user direction.
3. **Phase 1c cluster authoring order** — H-N ratified bulk; user may set starting cluster vs PA-pick.
4. **Maps refresh** — stale 5 sessions; refresh if compiler-source dispatch chosen.
5. **S131 user-voice backfill** — user call (see flag #2 above).
6. **dev.to publication status** — awaiting completion note.

---

## Tags

#session-132 #OPEN #grammar-lockdown-phase-2 #carry-forward-13-ready #both-repos-synced #maps-stale-s126 #user-voice-s131-gap
