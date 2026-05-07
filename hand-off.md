# scrmlTS — Session 67 (OPEN)

**Date opened:** 2026-05-07
**Previous:** `handOffs/hand-off-66.md` (S66 close — 38 commits, wrap-and-push completed)
**Tests at S66 close:** 9,090 / 44 / 1 / 0 (full); 8,366 pre-commit subset

---

## Session-start state

| Field | Value |
|---|---|
| scrmlTS HEAD | `e557e30` (S66 wrap commit) |
| scrmlTS origin sync | 0/0 (clean — S66 push landed) |
| Working tree (scrmlTS) | clean |
| scrml-support sync | 0/0 vs origin/main |
| Working tree (scrml-support) | `?? archive/articles-skipped/` (pre-existing untracked from prior session — single file `scrml-debate-amends-zod-claim-devto-2026-05-06.md`) |
| Inbox | empty |
| Active agents | 45 |

---

## Open questions carried from S66 close (surface immediately)

1. **Workflow concern resolution.** Bryan's S66 mid-session concern about cherry-pick churn vs throw-away-dir/direct-commit pattern. PA's S66-close recommendation: keep worktree+cherry-pick for novel/risky; introduce "fast-forward dispatch" mode for surgical follow-ups. Awaiting Bryan deliberation.
2. **B7 dispatch readiness** — Rule-4 audit on file (`docs/audits/a1b-b7-rule4-audit-2026-05-07.md`). Brief should include transitive-fn-call requirement + canonical name `E-DERIVED-CIRCULAR-DEP`. Estimate 5-7h or 8-12h depending on §31 machinery extensibility.
3. **B8 dispatch readiness** — Rule-4 audit on file (`docs/audits/a1b-b8-rule4-audit-2026-05-07.md`). Recommends scope to E-DERIVED-VALUE-MUTATE only (3-4h); fold E-SYNTHESIZED-WRITE into B11.
4. **`docs:build` execution decision.** Master's change-2 added Bun build script but PA did NOT run `bun run docs:build` (Rule 1). Bryan's call.
5. **Articles canonical_url / Tier-A site refresh.** Master continues per-change FYI/action messages (change 3 = canonical_url; change 4 = index.html). PA continues validate-and-commit pattern.

---

## Standing rules (S66 — PERMANENT until v0.2.0 ships)

- **Rule 1:** No marketing/article/tweet PA-volunteered work.
- **Rule 2:** scrml is not a toy — full-production-fidelity bar.
- **Rule 3:** Right answer beats easy answer 99.999%.
- **Rule 4:** Spec is normative; derived planning docs are NOT — verify every spec-derivative claim against `compiler/SPEC.md` before encoding into briefs.

S66 narrowing reversal + B4 cycle-detection brief are the cited precedents.

---

## Tags

#session-67 #open #b7-pending #b8-pending #workflow-concern-pending
