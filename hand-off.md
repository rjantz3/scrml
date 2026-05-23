# scrmlTS — Session 123 (OPEN)

**Date:** 2026-05-23
**Previous:** `handOffs/hand-off-125.md` (S122 CLOSE — rotated at S123 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S123 OPEN:** `c2d93544` (S122 wrap commit)

---

## S123 OPEN state

### Sync hygiene
- scrmlTS: at-origin (0 ahead / 0 behind). Clean working tree.
- scrml-support: at-origin (0 ahead / 0 behind). 6 untracked items under `voice/articles/` + `tools/` (pre-existing local-only voice drafts, harmless — not new this session).
- Inbox `handOffs/incoming/`: empty.

### Hook gate
- Configuration B per pa.md S88. Verify with `git config --get core.hooksPath` + `ls $(git rev-parse --git-path hooks)` before first commit.

### Maps freshness — STALE
- Watermark: `136678e5` (S122 OPEN refresh).
- HEAD: `c2d93544`. **30 commits stale.**
- Refresh required before any S123 dev dispatch (pa.md §"Maps-discipline protocol" + S122 close instruction).

### Tests baseline (S122 close)
- Full `bun run test`: 19,907 pass / 0 fail / 175 skip / 1 todo / 754 files.
- Pre-commit gate: 14,033 pass / 0 fail / 92 skip / 1 todo / 713 files.
- Native-parser canary strict-pass: 998/1000 (S121 baseline retained through M6 Wave 1).

### pkg.json
- 0.6.0 (unchanged; no tag cut S122).

---

## Open threads inherited from S122 — for user direction

### Immediately actionable (file-disjoint sequencing ready)
1. **R4-U3** (~1.5h) — wire `translateExpr` at if/while/do-while condExpr sites.
2. **R4-U4** (~2h) — let-decl / const-decl / lin-decl / tilde-decl initExpr sites. **UNBLOCKS 12 prop-substitution test failures.**
3. **R4-U5** (~3h) — lift-expr (non-MV) / propagate-expr / guarded-expr / fail-expr sites.
4. **R4-U6** (~1.5h) — re-apply M6.2 wip-patch + close M6.2b → bug-5 5/5.
5. **M6.6.b.2** (~10-15h) — symbol-table consumer migration using b.1 cookbook (recipes + `colonShorthandBody` discriminator ready). Preserve `engineMeta.stateChildren` shape; swap source-of-truth from `parseEngineStateChildren` to native-block walker.
6. **M6.4b** — deletion fold for ast-builder.js P2-Form1 site (M6.8 deletion candidate post-M6.4a).
7. **M6.7** Phase A flag flip + corpus-stale residual close — gated on M6.6.b.2-b.6 + M6.5 + R4 series + M6.4b all landed.
8. **M6.8** Phase B legacy deletion — gated on M6.7 + soak time.

### Queued additive (independent of M6 path)
- **V-kill (~3-4h)** — auto-state-cell kill. Verdict B ratified. Split ast-builder routing (`@x = expr` → `reactive-assign` not `state-decl`) + SYM PASS 3 E-STATE-UNDECLARED diagnostic + 4-case test fixture + corpus regression gate + SPEC §6.1.1 + §34 amendments.
- **Unit CC (~1-2h)** — Option-2 enforcement: parser/resolver-level rejection of bare `@x = expr` at default-logic body-top-level. Fires `E-WRITE-NOT-IN-LOGIC-CONTEXT`. SPEC §40.8 amendment.
- **MCP-in-scrml v0** (~40-80h) — read-only MCP layer + `<program mcp>` opt-in attribute + 3 prioritized surfaces (engine subsystem / validity surface / chunks.json topology). v0.4+ candidate; no M6 dependency.

### Inbox bug reports (5 logged, NOT triaged — per `feedback_adopter_bug_diligence`)
- GITI-015 — is-some ternary with computed LHS (`.scrml` sidecar)
- 6nz bugs L/M/N/O status + bug P — stop scope timers runtime chunker gap (`.scrml` sidecar)
- GITI-017 — silent `not` corruption inside regex (`.scrml` sidecar)
- 6nz bugs Q/R — Q-1 auto-lift no-init + R if unmount no-op (`.scrml` sidecars)
- GITI-018 — multi-stdlib-import not rewritten (`.scrml` sidecar)
- 6nz bugs S/T — bug T double-slash in string truncates and cascades (`.scrml` sidecar)

**TRIAGE BEFORE FIX-DISPATCH** per `feedback_adopter_bug_diligence.md`. If user picks one of these for S123, PA must read repro + classify + propose disposition + capture root-cause hypothesis BEFORE dispatching any fix brief.

### Pre-existing carry-forwards (unchanged from S121-S122)
- dev.to article updates (Rule 1 — only if user raises)
- Living Compiler retraction stamp (pending user hand)
- scrml.dev article canonicalization (not started)
- SPEC-INDEX Quick-Lookup mini-index stale (S117 flag)
- §29 vanilla-interop spec↔impl divergence (user has not ruled)
- Generator (`yield` / `function*`) policy (S114)
- MK4 lazy-require ESM cycle
- §58 build-story determinism audit
- `eb941333` stray commit (S119 P4-2-agent CWD slip — harmless)
- Bug 9 (dashboard async-not-awaited codegen) — defer to post-M6 per corpus-sweep PLAN
- Dashboard still broken at runtime (Bug 9)
- "Pre-existing unrelated bug" surfaced in Wave 14 DD: `~snapshot = {...}` tilde-decl with reactive deps emits `let _scrml_tilde_3 = ~;` (raw tilde sigil leaked)

---

## Open questions to surface immediately at S123 OPEN

1. **Maps refresh?** — Stale by 30 commits. Recommended BEFORE any dev dispatch.
2. **Next priority direction?** — R4 continuation (U3-U6 to unblock M6.2b) is the lowest-risk highest-leverage path. M6.6.b.2 is the next big M6 milestone. V-kill / Unit CC / MCP / inbox triage are all valid alternatives. User picks.
3. **Inbox triage?** — 5 unprocessed bug reports. Triage gate fires before fix dispatch per `feedback_adopter_bug_diligence`. Triage now or defer?

---

## Tags

#session-123 #OPEN #maps-stale-30-commits #r4-continuation-queued #m6-wave-2-pending #adopter-inbox-5-untriaged
