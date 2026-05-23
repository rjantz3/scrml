# scrmlTS — Session 122 (CLOSE)

**Date:** 2026-05-23
**Previous:** `handOffs/hand-off-124.md` (S121 CLOSE — rotated at S122 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S122 OPEN:** `136678e5` · **HEAD at S122 CLOSE:** this wrap commit
**Wrap:** full 8-step. Push **authorized** ("wrap and push").

---

## S122 net outcome

**Marathon ~10-hour session — 30+ commits across multiple parallel arcs.**

For the full session narrative + per-unit detail see:
- `master-list.md` §0 S122 CLOSE addendum (authoritative)
- `docs/changelog.md` 2026-05-23 entry (cross-session audit trail)
- `../scrml-support/user-voice-scrmlTS.md` Session 122 (user verbatim)

**Three architectural arcs:**
1. **M6 cutover plan + Wave 1 substantially landed** — 8-unit decomposition, ~80-130h revised total. M6.1/M6.3 landed (splitBlocks→nativeParseFile pattern). M6.4 STOP → M6.4a P2-Form1 synthesis + collect-hoisted shape fix. M6.2 STOP → M6.2a MarkupValue→MarkupNode bridge. M6.5 path-a proven no-op + regression-gated. M6.6 STOP → M6.6.b.1 SURVEY (path-b 40-80h → ~20-30h) + IMPL (`:`-shorthand recognizer + 540-line contract-derivation cookbook).
2. **R4 expression-catalog continuation surveyed + 2 units landed** — `translateExpr` was built but never wired (A2 closed module, never wired integration); 15 one-line wraps in translate-stmt.js will unblock M6.2b. R4-U1 + R4-U2 landed; U3/U4/U5/U6 sequential.
3. **MCP-in-scrml deep-dive (v0.4+ candidate filed)** — foldkit's MCP-DevTools-for-LLM-agents shtick mapped to scrml; scrml has more machine-readable static structure than foldkit exposes; v0 read-only MCP 40-80h, no M6 dependency.

**Tests:** 19,907 pass / 0 fail / 175 skip / 1 todo across 754 files (full `bun run test`). Pre-commit gate (unit+integration+conformance) 14,033 pass / 0 fail / 92 skip / 1 todo across 713 files.

---

## State-as-of-close

| Item | Value |
|---|---|
| HEAD | this S122 wrap commit |
| Tests (full `bun run test`) | 19,907 pass / 0 fail / 175 skip / 1 todo (754 files) |
| Pre-commit gate | 14,033 pass / 0 fail / 92 skip / 1 todo (713 files) |
| Native-parser canary strict-pass | 998/1000 held (S121 baseline retained through M6 Wave 1) |
| pkg.json version | 0.6.0 (unchanged — no tag cut S122) |
| scrmlTS origin sync | unpushed work — push authorized at wrap |
| scrml-support origin sync | 3 new deep-dive docs + user-voice append + 6 untracked older items — push authorized at wrap |
| Inbox `handOffs/incoming/` | empty (all messages moved to `read/`) |
| Outbox sent | giti FYI-CLOSED on GITI-014 (`handOffs/incoming/2026-05-23-0810-scrmlTS-to-giti-giti-014-fix-landed.md` dropped in giti's inbox) |
| Hook gate | Configuration B per pa.md S88 (pre-commit + pre-push installed; post-commit lost since session-open, machine-local-only artifact) |
| `.claude/maps/` | watermark `136678e5` — needs S123 refresh |
| Worktrees | clean (22 cleaned at this wrap per S83 §6b) |

---

## Wave-by-wave landings (chronological)

**Wave 12 close-out (3 units + GITI fix from S121 carry-forward):**
- Unit X — native-parser-mirror @-sigil cleanup (`bb1f0b9c`)
- Unit U — type-system tilde-decl reassignment fix (`d90298a2`)
- Unit W — name-resolver + api.js imp.names → spec.local fix (leaked Unit W commits + `972a5c07` followup with BB rest + emit-expr.ts emitUnary recovery)
- README server-keyword drop (`62612b44`)

**S122 deep-dives + PRIMER:**
- §48.3.3 SPEC-vs-impl divergence verdict ILLUSORY (`scrml-support/docs/deep-dives/spec-vs-impl-48-3-3-fn-body-cell-mutation-2026-05-23.md`)
- Auto-state-cell synthesis investigation verdict B kill (`scrml-support/docs/deep-dives/auto-state-cell-synthesis-investigation-2026-05-23.md`)
- MCP-DevTools-for-LLM-agents in scrml (`scrml-support/docs/deep-dives/scrml-mcp-llm-agent-surface-2026-05-23.md`)
- M6 joint-retirement cutover plan (`scrml-support/docs/deep-dives/m6-joint-retirement-cutover-plan-2026-05-23.md`)
- PRIMER §6.2 Match block-form Tier-1 subsection (`6c7ae920`)

**Wave 13:** Y (RI TRIGGER walker, `d8278c64`) + Z (E-NAME-COLLIDES-STATE did-you-mean, `bf7a6bb6`)

**Wave 14:** AA (W-LINT-013 scope-gate, `90ec1a9b`) + BB (compound-assign + `++`/`--`, `ccb39c94` Bug A leaked + `972a5c07`) + DD (GITI-014, `18b90f12`)

**M6 Wave 1:** M6.1 (`52c6ec5a`) + M6.3 (`11e47dc0`) + M6.4 STOP (`9624baf0`) + M6.4a (`30327bd1`) + M6.2 STOP (`a30c2b17`) + M6.2a (`9d64ff4c`) + M6.5 path-a (`d982b7fb`) + M6.6 STOP (`32af3da8`) + M6.6.b.1 SURVEY (`dfae2dab`) + M6.6.b.1 IMPL (`f2d296c5`)

**R4 series:** Survey (`a15c86ff`) + R4-U1 (`2d2fe5bb`) + R4-U2 (`56bd0861`)

**Unit EE:** I-FN-PROMOTABLE (`a2eb9096`)

---

## Open threads / carry-forwards — surface at S123 OPEN

**Immediately actionable (file-disjoint sequencing ready):**

1. **R4-U3** (~1.5h) — wire `translateExpr` at if/while/do-while condExpr sites. Sequential after R4-U2.
2. **R4-U4** (~2h) — let-decl / const-decl / lin-decl / tilde-decl initExpr sites. UNBLOCKS the 12 prop-substitution test failures.
3. **R4-U5** (~3h) — lift-expr (non-MV) / propagate-expr / guarded-expr / fail-expr sites.
4. **R4-U6** (~1.5h) — re-apply M6.2 wip-patch + close M6.2b → bug-5 5/5.
5. **M6.6.b.2** (~10-15h) — symbol-table consumer migration using b.1 cookbook (recipes + `colonShorthandBody` discriminator ready). Per b.1 SURVEY: preserve `engineMeta.stateChildren` shape; swap source-of-truth from `parseEngineStateChildren` to native-block walker. If shape-preservation works, b.3/b.4/b.5/b.6 collapse to M6.8 deletion + type relocation.
6. **M6.4b** — deletion fold for ast-builder.js P2-Form1 site (was scoped 0-6h; converts to M6.8 deletion since M6.4a closed the native gap).
7. **M6.7** Phase A flag flip + corpus-stale residual close — gated on M6.6.b.2-b.6 + M6.5 + R4 series + M6.4b all landed.
8. **M6.8** Phase B legacy deletion — gated on M6.7 + soak time.

**Filed queued units (independent of M6 path):**

- **V-kill (~3-4h)** — auto-state-cell kill. Verdict B ratified. Split ast-builder routing (`@x = expr` → `reactive-assign` not `state-decl`) + SYM PASS 3 E-STATE-UNDECLARED diagnostic + 4-case test fixture + corpus regression gate (must stay 0) + SPEC §6.1.1 + §34 amendments.
- **Unit CC (~1-2h)** — Option-2 enforcement: parser/resolver-level rejection of bare `@x = expr` at default-logic body-top-level. Fires `E-WRITE-NOT-IN-LOGIC-CONTEXT`. SPEC §40.8 amendment clarifying auto-lift covers DECLARATIONS only.
- **MCP-in-scrml v0** (~40-80h) — read-only MCP layer + `<program mcp>` opt-in attribute + 3 prioritized surfaces (engine subsystem / validity surface / chunks.json topology). v0.4+ candidate; no M6 dependency.

**Inbox bug reports (5 logged, NOT triaged — per `feedback_adopter_bug_diligence`):**

- GITI-015 — is-some ternary with computed LHS (`.scrml` sidecar)
- 6nz bugs L/M/N/O status + bug P — stop scope timers runtime chunker gap (`.scrml` sidecar)
- GITI-017 — silent `not` corruption inside regex (`.scrml` sidecar)
- 6nz bugs Q/R — Q-1 auto-lift no-init + R if unmount no-op (`.scrml` sidecars)
- GITI-018 — multi-stdlib-import not rewritten (`.scrml` sidecar)
- 6nz bugs S/T — bug T double-slash in string truncates and cascades (`.scrml` sidecar)

**TRIAGE BEFORE FIX-DISPATCH** per the new memory rule. Logging only at this stage.

**Pre-existing carry-forwards (still queued, unchanged from S121):**

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

## Process incidents — S122

**S99 path-discipline counter +5 this session.** Most caught at agent-side; one (EE SPEC.md) caught by PA revert. Recurring shape: agent's branch base predates main HEAD landings; PA file-delta clobbers parallel-sibling work. Multiple instances (BB↔DD on emit-expr.ts, M6.6.b.1 IMPL↔M6.4a on parse-markup.js, EE↔U/W on type-system+api.js) — each recovered via manual additive-diff merge on top of main HEAD. **PreToolUse hook closing this surface is the highest-impact infrastructure investment outstanding.**

**PA-side CWD slips post-agent-completion: 3-4 incidents.** The harness's CWD changes to the just-completed worktree; PA must explicitly `cd /home/bryan/scrmlMaster/scrmlTS` before every git op. Recurring; expected.

**Pre-commit hook gate held throughout** — every commit ran the unit+integration+conformance suite; 0 fail on every landing.

**Configuration B hook status — partial regression at S122 OPEN**: pre-commit + pre-push were uninstalled at session open. PA re-installed via `scripts/git-hooks/install.sh`. post-commit was machine-local-only artifact; lost permanently.

---

## Session-start checklist for S123 PA

1. Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL.
2. Read `docs/PA-SCRML-PRIMER.md` IN FULL (§6.2 Match block-form is new this session).
3. Read `compiler/SPEC-INDEX.md` IN FULL (§56.9 I-FN-PROMOTABLE new; §34 catalog updated).
4. Read `master-list.md` §0 IN FULL — the S122 CLOSE addendum is the live delta.
5. Read this `hand-off.md` (S122 CLOSE) — rotate to `handOffs/hand-off-125.md` at S123 OPEN.
6. Read recent contentful user-voice — S122 entry covers the M6 cutover + R4 series + foldkit/MCP arc + Option 2 ratification + the new `feedback_adopter_bug_diligence` rule.
7. Sync hygiene: `git fetch` scrmlTS + scrml-support. Both should be at-origin (push completed at S122 wrap).
8. Maps refresh (watermark `136678e5` — many commits stale) before any S123 dev dispatch.
9. **Triage gate at top of session:** if dispatching any of the 5 inbox bugs (GITI-015 / 6nz-LMNOP/P / GITI-017 / 6nz-QR/T / GITI-018), TRIAGE FIRST per `feedback_adopter_bug_diligence` — read repro, classify bug class, propose disposition. Brief carries the classification.
10. Next-priority: R4-U3 + R4-U4 + R4-U5 + R4-U6 + M6.6.b.2 are the M6.2b-and-M6.7-unblockers; V-kill + Unit CC + Unit EE follow-up CLI subcommand + MCP-in-scrml v0 are the queued additive backlog. User picks.
11. Report: caught up + next priority.

---

## Tags

#session-122 #CLOSE #m6-cutover-plan-and-wave-1 #r4-expression-catalog-continuation
#unit-ee-i-fn-promotable #mcp-in-scrml-deep-dive #foldkit-sidequest #option-2-ratification
#adopter-bug-diligence-rule #19907-tests-0-fail #marathon-session-30-plus-commits
#wrap-and-push-authorized
