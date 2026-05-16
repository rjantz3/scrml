# scrmlTS — Session 94 (CLOSE)

**Date:** 2026-05-15
**Previous:** `handOffs/hand-off-94.md` (S94 OPEN snapshot — overwritten by this CLOSE per rotation convention)

---

## TL;DR for next-session PA pickup

S94 was a marathon v0.3.x patch arc. 17 scrmlTS commits + 1 scrml-support commit. **11 backlog items closed end-to-end** + 2 design-axiom ratifications + 3 new PA-memory rules. Tests **12,826 / 117 / 1 / 0** (+105 vs S93 close, 0 regressions). **Push state at close: all 17 + 1 will be pushed by wrap step 7.**

**S95 priority (user-stated just before wrap):** heads-up coding session — exploratory authorship, NOT compiler dispatch. "I want to have a heads-up coding session to see what we can and cannot do with this language." Connect to the just-ratified state-vs-logic boundary axiom — stress-test the canonical shape.

---

## Final state at S94 close

- **scrmlTS HEAD:** `156c0ba` (closure of `~` codegen gaps 5+6+7 — pre-CLOSE-commit state; this CLOSE wrap commit lands master-list + changelog + hand-off updates)
- **scrmlTS tag:** `v0.3.0` annotated, on `c520369` (S92 STABLE cut; unchanged this session)
- **scrmlTS ahead/behind origin:** 17 commits ahead pre-CLOSE-commit (18 ahead after wrap-CLOSE commit); push authorized
- **scrml-support HEAD:** `bb1eb91` — user-voice S94 entry "designer-card on `~`"
- **scrml-support ahead/behind origin:** 1 ahead pre-wrap (NOTE: this CLOSE will add a second user-voice entry for state-vs-logic axiom + heads-up coding priority — see below)
- **Working tree:** clean (pre-CLOSE-commit state)
- **Worktrees:** main only (all 6 substantive worktrees from this session cleaned via S83 protocol)
- **Inbox:** empty
- **Hook config:** configuration B (pre-commit + post-commit + pre-push)

**Tests at HEAD `156c0ba`:** **12,826 pass / 117 skip / 1 todo / 0 fail / 650 files / 42,968 expect** (full `bun run test` chained pretest). Delta vs S93 close `d437589` (12,721 / 641 files): **+105 pass / +9 files / 0 fail / 0 regressions across 17 commits**.

---

## S94 commit ledger (17 scrmlTS + 1 scrml-support — chronological from oldest to newest)

```
95e13c8  docs(s94-open): hand-off rotation + Phase A SCOPING for v0.3.x SPA tree-shake
66c1be0  docs(kickstarter): strengthen §6.6 — `reset` is a reserved identifier
1f73732  fix(codegen): v0.3.x SPA tree-shake — shared-runtime union + wire chunk + hash filename
42abfca  docs(bench): re-frame bundle narrative post-Phase-B with honest measurements
783dd46  docs(roadmap): record S94 design insights — `^{}` narrowing + `~` keeper
bb1eb91  (scrml-support) docs(user-voice): S94 — `~` is designer-card-protected primitive
2201556  fix(bs+ce): BS-batch v2 — close 3 residual ${} wrapper shapes (examples 12/19/20)
d37b1f5  fix(codegen): `~` last-unbound-expression carry-forward — close half-shipped surface
09cd0c7  fix(expr-parser): `~` parseExprToNode/emitStringFromTree round-trip stability
0aa2b18  docs(examples): sprinkle `~` usage + file 3 remaining codegen shape gaps
bec57a3  fix(ce): BSBv3 — filter whitespace-only text from E-COMPONENT-031 predicate
13beb3f  fix(ce): BSBv3 — apply E-COMPONENT-031 predicate change to current main
fd052ec  fix(corpus): hos.scrml — canonical non-entry <page> restructure + DEFERRED §2 close
69260c3  fix(auth): tighten I-AUTH-REDIRECT-UNRESOLVED + W-AUTH-LOGIN-MISSING + generate scaffold
0c503c5  feat(ri): D-RI-PAGES — buildPageRouteTree recognizes `pages/` as canonical v0.3 prefix
9e96281  docs(pa,master-list): formalize package.json bump-on-tag versioning convention
a1c720c  docs(perf): closure-analysis pipeline characterization (v0.3.x roadmap item 5)
156c0ba  fix(tilde): close Gaps 5/6/7 — failable-handler + <program>-direct-child + chain
```

Plus this wrap-CLOSE commit landing master-list + changelog + hand-off + (potentially) a second scrml-support commit for state-vs-logic-axiom + heads-up-coding entries.

---

## 11 backlog items closed end-to-end this session — full per-item detail in master-list §S94 CLOSE addendum + changelog S94 entry

| # | Priority | Item | Commit(s) | Headline |
|---|---|---|---|---|
| 1 | HIGH | Closure-analysis runtime tree-shake (SPA) | `1f73732` + `42abfca` | TodoMVC 40.8 → 15.8 KB gzip (−25 KB); shared-runtime union + wire chunk + hash filename |
| 2 | MEDIUM | BS-batch v2 (3 residual ${} shapes) | `2201556` | block-splitter.js orphan-brace gate + component-expander.ts Step 0b |
| 3 | priority | `~` codegen lowering (half-shipped) | `d37b1f5` | `_scrml_tilde_N` capture/reference + scope rules; 5 regression tests |
| 4 | pre-commit blocker | `~` parser round-trip | `09cd0c7` | drop `tildeActive` gate; regex is structural disambiguator; 19 tests |
| 5 | user-ask | `~` example sprinkle | `0aa2b18` | examples/16-remote-data retrofit + new examples/24-tilde-pipeline |
| 6 | follow-up | `~` codegen gaps 5+6+7 | `156c0ba` | `!{}` handler / `<program>`-direct-child / consume+reinit chain |
| 7 | sibling-friction | BSBv3 component-expander whitespace | `bec57a3` + `13beb3f` | E-COMPONENT-031 false-fire on whitespace-only text |
| 8 | MEDIUM | hos.scrml restructure | `fd052ec` | canonical non-entry `<page>` shape; DEFERRED §2 CLOSED |
| 9 | MEDIUM | Auth-redirect tightening | `69260c3` | Diagnostic + scaffold UX; surfaced D-RI-PAGES as HIGH follow-up |
| 10 | HIGH (promoted) | D-RI-PAGES | `0c503c5` | `buildPageRouteTree` recognizes `pages/`; closes auth UX loop |
| 11 | MEDIUM | Perf characterization | `a1c720c` | Closure-analysis 3% of pipeline; CG dominates 78%; DG super-linear scaling |
| (LOW) | LOW | pkg.json bump-on-tag convention | `9e96281` | Formalized into pa.md; precedent codified |

---

## Two design-axiom ratifications (verbatim in user-voice S94)

### Designer-card on `~`

> "this was my first real idea that I got excited about when I came up with it. I hate naming variables because it often takes me so long to decide on it, this is a cost that is entirly unnecessary for these intermediate type values. and the cleanliness is cool to me. look at a ternary for example. I am using my designer card on this one. riding with 0.4 is smart framing"

**Disposition.** `~` is keeper. Adoption gap is documentation surface; NOT a feature-existence question. v0.4 body-split is the natural discovery context for adopter learning.

### State ↔ logic boundary

> "in scrml the state system should be able to handle state exclusively, the logic system should be able to handle the logic that describes the mutation of state, but not necessarily the the state itself. This is analgous to the relationship and boundarys of the logic system and the type system. You dont use one for the purpose of the other. Axiomatically, IMO, devs writing work-a-day scrml should be able to declare ~90% of functions as fn()."

**Disposition.** State owns nouns; logic owns verbs; they must not blur. Operational consequence: `fn()` dominates work-a-day scrml (~90/10 vs `function`). Apply to language-addition reviews, example-corpus audits, anti-pattern catalog, dispatch reviews.

**Both saved to PA-memory feedback rules** + `feedback_state_vs_logic_boundary.md` + `feedback_designer_card_and_retirement_framing.md`.

---

## Three new PA-memory rules filed this session

- `feedback_designer_card_and_retirement_framing.md` — don't bury retirement as a flat-list option; surface the axis explicitly so user can invoke designer-card.
- `feedback_cwd_slip_after_worktree_dispatch.md` — CWD-slip after `git checkout worktree-branch -- <files>` from main. Observed 4+ times in S94. Defensive `pwd && git rev-parse --abbrev-ref HEAD` before every file-delta op. Stash-loss is possible.
- `feedback_state_vs_logic_boundary.md` — the just-ratified design axiom; PA-side design check.

---

## Filed for follow-up (out-of-scope this session)

**v0.3.x candidate (HIGH-MEDIUM):**
- `~` codegen gaps 8 + 9 (FOLLOWUPS.md): guarded-expr arm-body emission produces invalid JS (pre-existing, surfaced by Gap 5 repro but orthogonal); top-level fn-body `!{}` not block-split (BS orphan-brace path doesn't push error-effect frames).
- 4 `~` S94 SURVEY-deferred items: E-TILDE-001/002 ExprNode-form firing; unbound-if-as-expression parser gap; accumulation-lift not honoring tildeContext; function-body value-lift untested.
- 23-trucking-dispatch auth-redirect adopter-config mismatch (app uses default `loginRedirect=/login` while scaffold sits at `pages/auth/login.scrml`).

**v0.3.x backlog still untouched:**
- W-AUTH-001 single-instance investigation (LOW).
- 09-error-handling residual BS-batch v2 candidate (LOW).
- Roadmap doc publication-site decision (LOW; user-call only).

**v0.4+ candidate:**
- DG super-linear scaling investigation (per-file Δms grew 8.5× across 28→108 file sweep; only 59 ms at 108 files but slope warrants attention before adopter corpora hit ~500 files).
- CG profiling (78% of pipeline; obvious v0.4+ target).
- §51.0.K Machine Cohesion footnote — explicit `<page>` body enumeration as engine-decl locus (one-sentence spec-prose follow-up).
- Self-host `ri.scrml:675` parity for D-RI-PAGES (post-v1.0 per B4 deferral).

**v0.4 anchor (soft-ratified S93):** body-split (failable batches + idempotent retries; Ext 4 + Ext 5 per S72).

---

## S95 priority — heads-up coding session

**User-stated S94 just before wrap:**

> "I don't think we have pushed the canonical of this language hard enough, I am not suggesting compiler changes (necesarilly). but next session I want to have a heads-up coding session to see what we can and cannot do with this language."

**S95 operational shape — DO NOT confuse this with a dispatch / wrap / roadmap session:**

- It IS: exploratory authorship. Probe by writing. Surface what's surfaced.
- It is NOT: continued v0.3.x backlog drain; wrap-shaped; roadmap-shaped; debate/deep-dive/deliberation.

**PA's role:**
- Collaborative authorship + grounded honesty on what works vs surfaces gaps.
- Write scrml alongside / for user where useful.
- Gaps discovered get FILED (FOLLOWUPS / SCOPING / dispatch-candidate) but NOT immediately fixed unless trivial.
- Compiler changes are NOT the goal but MAY emerge as dispatch candidates from the surface findings.

**Connection to state-vs-logic axiom (just-ratified S94):** the stress test naturally surfaces where the boundary holds AND where it blurs. Awkward patterns indicate either (a) the language has a real gap, (b) the canonical shape was misunderstood, or (c) the example-corpus / documentation hasn't shown the right idiom. Each outcome is informative.

---

## Methodology validations this session

- **S88 file-delta-vs-cherry-pick rule fired 4×** — every parallel-batch landing required manual reconcile to preserve sibling commits. Specifically: BSBv3 worktree base predated BSBv2 (worktree's file-delta would have clobbered Step 0b normalization → applied predicate change manually onto current main; canonical precedent); A.3 hos.scrml base predated BSBv3 (excluded conflicting files from file-delta); A.1 auth-redirect base was 13 commits behind main (file-deltaed only the 6 auth-redirect-specific files; rest would have reverted Phase B + BS-batch v2 + `~` codegen + BSBv3 + hos.scrml); D-RI-PAGES worktree base 13 commits behind (file-deltaed only 4 core files).
- **S67 file-delta protocol held** across 6 substantive worktree dispatches.
- **S83 commit discipline two-sided rule held** — no work-lost recurrence.
- **S90 CWD-routing rule fired during parallel Batch A** (3 simultaneous worktree provisions; rule held).
- **NEW `feedback_cwd_slip_after_worktree_dispatch.md`** — observed 4+ times. Symptom: empty staged-delta after `git checkout worktree-branch -- <files>`. **One stash-loss precedent**: PA's `~` examples sprinkle stash was dropped when CWD slipped during the round-trip dispatch landing. Recovered by reconstructing from Edit/Write history. Worth being defensive about going forward.
- **`~` arc validated "stated intent > corpus" methodology** — designer-card invocation pre-empted corpus-ouroboros for sliver-empty primitive. Before user invoked designer-card, PA's three-option recommendation list buried retirement as one of three flat options (saved as `feedback_designer_card_and_retirement_framing.md` going forward).

---

## Cross-machine state at S94 close

- scrmlTS: 17 commits ahead origin pre-wrap-CLOSE; 18 ahead after wrap-CLOSE; PUSH AUTHORIZED.
- scrml-support: 1 commit ahead origin (`bb1eb91`); may add second commit for state-vs-logic axiom + heads-up coding entries; PUSH AUTHORIZED.
- Working tree clean (pre-wrap-CLOSE state).
- No agent worktrees retained.

---

## Things S95 PA must NOT screw up (carried + extended)

### Rules permanently load-bearing

- Rule 1 — no marketing/article/tweet work unless user brings it up
- Rule 2 — full-production-language fidelity
- Rule 3 — right answer beats easy answer 99.999% of the time
- Rule 4 — spec is normative; derived planning docs are NOT
- S86 ratifications — idiomatic-examples styling rule + corpus-ouroboros warning + BS-layer over SPEC retreat
- S87 memory rules — bash-cleanup dry-run + file-delta base SHA check
- S88 memory rules — file-delta-vs-cherry-pick + stated-intent-vs-corpus migration + `isolation: "worktree"` MUST be explicit on every dev-agent Agent() call
- S89 memory rules — land-before-cleanup + agent-crash-partial-recovery + null-does-not-exist-in-scrml (ABSOLUTE; extends to undefined; `""` is defined) + self-host-is-from-scratch
- S90 memory rule — agent-isolation-cwd-routing
- S93 memory rule — diagnostic-stream-partition (`result.warnings` is non-fatal incl. info-level)

### S94 additions

- **`~` is designer-card-protected** — keeper at all phases; adoption gap is documentation surface
- **State ↔ logic boundary axiom** — state owns nouns; logic owns verbs; `fn()` dominates work-a-day scrml (~90/10)
- **Don't bury retirement as a flat-list option** — surface the axis explicitly when PA's recommendation set contains a retirement-shaped option
- **CWD-slip defense** — `pwd && git rev-parse --abbrev-ref HEAD` before every file-delta op; stash-loss is possible

### S95-specific load-bearing items

- **The heads-up coding session is NOT a dispatch session.** Don't reflexively dispatch agents. Authorship + grounded honesty.
- **Gaps surfaced during the stress test go to FOLLOWUPS / SCOPING / dispatch-candidate; NOT immediate fix** unless trivial.

### Anti-patterns

- DO NOT revisit "TS parity" as load-bearing scrml property
- DO NOT treat `null` or `undefined` as canonical scrml tokens in ANY context
- DO NOT clean up agent worktree BEFORE landing its content into main
- DO NOT bury retirement as an unmarked option in PA's recommendation list (S94 precedent)
- DO NOT blur state ↔ logic boundary in new feature proposals (S94 axiom)
- DO NOT default to `function` decls in example scrml when `fn()` would do (corpus-skew concern per S94 axiom)

---

## Tags

#session-94 #CLOSE #v0.3.x-marathon #11-backlog-items-closed #2-design-axioms-ratified #3-pa-memory-rules #~-codegen-end-to-end #spa-tree-shake-landed #auth-redirect-loop-closed #bsbv2-bsbv3-closed #hos-restructure-closed #perf-characterized #pkg-versioning-formalized #s95-heads-up-coding
