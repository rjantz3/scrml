# Bug 5 SCOPING — progress

## 2026-05-19 (S107) — SCOPING.md authored

- Verified Bug 5 reproduces at HEAD `0534c18` (S106 close) via minimal reproducer at `/tmp/bug-5-repro/app.scrml`.
- New finding beyond side-session report: phantom `_scrml_logic_1` placeholder rendered OUTSIDE the host element from implicit logic-wrap of the bare `const` decl. Logged as Anomaly C.
- Spec verification (pa.md Rule 4) — read §1.4, §7.4, §7.4.1, §3 context grid, §7.6 file-level-scope rule in full from `compiler/SPEC.md` directly (not PRIMER summary). Spec gap identified: no normative statement on `${expr}` in markup-body position for non-reactive cases. Surfaced as Q-BUG5-OPEN-1.
- Root cause: emit-event-wiring.ts:928 conditional has no else-branch for "non-empty body, no reactive refs, no server fn." Two structurally-related sites in emit-html.ts:1650-1690 (phantom placeholder) + emit-logic.ts file-scope statement walker (orphan no-op).
- Three fix-shape options surfaced: α (compile-time inline), β (one-shot startup binding), γ (hybrid — α where foldable, β otherwise).
- PA recommendation: Option γ. Phase 1 (~2-3h) closes HIGH-severity headline symptom via Option β only; Phase 2 (~2-3h) cleans up Anomalies B + C; Phase 3 (~3-5h) adds constant-folding optimization + SPEC §7.4.2 normative section.

**Next step:** surface SCOPING + 5 OQs to user for ratification.

## 2026-05-19 (S107, mid-session) — OQs ratified + Q-BUG5-OPEN-6 added per user surface

User ratifications via AskUserQuestion:
- **Q-BUG5-OPEN-1: Yes — add new §7.4.2** (PA recommendation accepted)
- **Q-BUG5-OPEN-2: γ hybrid** (PA recommendation accepted; three-phase sequencing)
- **Q-BUG5-OPEN-3: Emitter classifier** (PA recommendation accepted; keep implicit logic-wrap, fix downstream)

User surfaced new question: "does this affect ~ fallthrough?"

PA investigation:
- Read SPEC §32 (`~` keyword) in full from line 14285 directly per Rule 4.
- Confirmed `${~}` interpolation in markup body is BROKEN at HEAD `0534c18` with the same shape as `${VERSION}` — same code path, same fall-through.
- Reproducer: `${ "v0.3.0"; ~ }` compiles to placeholder + hoisted `_scrml_tilde_N` at file-scope + EMPTY wiring block. Identical Bug 5 symptom.
- §32.4 boundary rule preserved — cross-`${}` `~` reference is E-TILDE-001 (unchanged).
- Multi-statement concern dissolved — `~` rewriter at `emit-reactive-wiring.ts:372` already hoists, so by the time wiring path runs the body is single-reference.

Disposition: `~` fallthrough rides Bug 5's fix automatically. No new code path. Test coverage SHALL include `~` regression cases. Logged as Q-BUG5-OPEN-6 in SCOPING.

**Next step:** Phase 1 dispatch decision (PA-direct now vs queue for next session vs delegate).

## 2026-05-19 (S107, post-Phase-1) — Phase 1 SHIPPED

Phase 1 landed at `c70176e`. 19 new unit tests, 13,047/0-fail. Bug 5 HIGH-severity headline symptom CLOSED. Tilde guard added for safety (skips wiring when expr has standalone `~` — pre-existing tilde-rewriter context isn't threaded into the binding's stored expr; emitting `el.textContent = ~;` would be invalid bitwise-NOT JS).

Mid-flight learning: kind-guard on `binding.kind == null` was needed because the OUTER for-loop iterates ALL `logicBindings` (chain branches, errors-element, transitions, default reactive-text) — not just default reactive-text. First implementation surfaced 17 regressions in expr-parity + chain-mount-emission tests; fix was a small `binding.kind == null` guard restricting the new else-branch to the default reactive-text shape.

## 2026-05-19 (S107, post-Phase-2) — Phase 2 SHIPPED

Anomalies B + C closed. Tilde context threading + multi-binding dedup re-scoped to Phase 3.

**Anomaly C — phantom placeholder from declaration-only logic body (`emit-html.ts:1672`):** added `stmtContainsRenderableLogic` classifier; placeholder allocation gated on body containing at least one `bare-expr` or `lift-expr` (recursive). Declaration-only bodies (const/let/function/type decls under implicit logic-wrap via S101 §40.8 program-as-container) no longer produce phantom `<span data-scrml-logic>` siblings in the DOM.

**Anomaly B — orphan pure-read no-op JS at file-scope (`emit-reactive-wiring.ts:389`):** added a per-stmt filter — when group has `pid` (interpolation) AND no `groupTildeCtx` AND stmt is `bare-expr` AND emitted JS matches the pure-read orphan shape (`/^(?:IDENT(?:\.PATH)*|_scrml_(?:reactive|derived)_get\([^)]*\))\s*;?\s*$/`), skip the file-scope emit. The value is consumed by binding wiring at DOMContentLoaded; emitting at file-scope produces the orphan `VERSION;` (and historically `_scrml_reactive_get("count");`) no-ops. Assignments, calls, multi-statement blocks all keep emitting (preserves side effects).

**4 brittle pre-existing tests fixed:** `compiler/tests/unit/engine-event-handler-writes.test.js` hardcoded `_scrml_attr_onclick_2` which depended on the phantom-placeholder counter increments that Anomaly C's fix removed. Replaced with `clientJs.search(/_scrml_attr_onclick_\d+": function\(event\)/)` (counter-resilient). The hardcoded `_2` was an accidental dependency on phantom behavior; the fix is the right shape.

**7 new Phase 2 tests added** to bug-5-const-interpolation.test.js (now 26 total):
- §9: Anomaly C — bare const decl does NOT emit phantom `<span data-scrml-logic>` (2 tests)
- §10: Anomaly B — interpolation body does NOT emit orphan pure-read at file-scope (3 tests, includes regression guard that legitimate const decl IS still emitted)
- §11: Anomaly B filter PRESERVES side-effecting bare-exprs (`${@count = @count + 1}` still emits `_scrml_reactive_set`) (2 tests)

**Tests at HEAD:** 13,054 pass / 88 skip / 1 todo / 0 fail / 678 files / 44,335 expect. Delta vs Phase 1 close (13,047/0): +7 pass / +8 expect / **0 regressions**.

**Scope-out: tilde context threading + multi-binding dedup → Phase 3.** The SCOPING originally included these in Phase 2 but they need more design work:
- Tilde threading requires plumbing `_scrml_tilde_N` var names from `emit-reactive-wiring.ts:372`'s hoister into the binding registry so `emit-event-wiring.ts` can rewrite `~` references. Sub-design needed: does each binding capture the tilde context at HTML-emit time? Does the wiring path re-resolve at emit time? Either threads through 3+ files.
- Multi-binding dedup is pre-existing structural — same `placeholderId` from multi-bare-expr `${...}` bodies produces multiple wiring blocks. Fix: register only the LAST binding per placeholderId, or dedup at emit time. Either works but has separate test surface.

Phase 3 will fold these into the constant-folding + SPEC §7.4.2 work since both touch the same surfaces. Aggregate estimate: ~5-8h (was Phase 3's ~3-5h + the deferred ~2-3h).

**Next step:** Phase 3 dispatch decision (constant-folding + SPEC §7.4.2 + tilde threading + multi-binding dedup) OR queue Phase 3 + take another high-impact item (e.g., Bug 3 trivial QoL fix).
