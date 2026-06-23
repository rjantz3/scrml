# family-a-converge-half1-2026-06-23 — progress (append-only)

## startup (2026-06-23)
- WORKTREE: /home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-a2df7ea92d4065e24
- base HEAD: 9cd5ae810 (NOT 83afdcdb from brief — brief base note stale; my base is the current main tip, deputy tick 193, newer). Working against actual base.
- bun install OK, bun run pretest OK (13 samples compiled to dist).
- MAPS load-bearing line: codegen shape (primary.map.md:140-144) → domain.map "Codegen each/match/engine Emit Map" + structure.map "S212 flogence Bug B" block (emitArmWireFunction directive loop + _disposers). That S212 infra is exactly what this fix extends to bind: directives.

## analysis
- emit-bindings.ts:493-592 = the bind: flavour switch (value/valueAsNumber/checked/selected/files/group), all emitting `document.querySelector` + addEventListener + `_scrml_effect`.
- emit-variant-guard.ts:72 EXPLICITLY lists bind:* as OUT-OF-SCOPE. emitArmWireFunction:444-573 has the class:/attr-template directive loop (S212) using `_root.querySelector` + `_disposers.push(_scrml_effect(...))`.
- emit-html.ts:1946-1980 = registration site. class:/attr-template register an arm-tagged binding when `registry.currentArmContext != null`; bind: only assigns _bindId, no arm binding → the DROP.
- PLAN: (1) extract emitBindDirectiveBody from emit-bindings parameterized on acquire + disposeWrap; (2) register arm-tagged `bind-directive` binding in emit-html; (3) route via emitArmWireFunction wireableBinds loop. Default params byte-identical at top level.

## next
- Step 1: extract emitBindDirectiveBody.

## step 1 DONE (extract emitBindDirectiveBody)
- emit-bindings.ts: added `BindDirectiveBodyOpts` + `emitBindDirectiveBody(bAttr, mkNode, opts) -> string[]`.
- opts.acquire(sel) parameterizes element acquisition (document.querySelector vs _root.querySelector).
- opts.wrapEffect(effectCall) parameterizes effect-disposal (identity vs _disposers.push(...)).
- preserves: enum-select coercion, numeric-input coercion, §53.7.2 predicate write-gating, _flatBindKey dotted-path, per-field touched listeners.
- emitBindings now calls it with document.querySelector + identity wrapEffect.
- BYTE-IDENTITY VERIFIED: diff -r of full compiled output (client+server+html) for reactive-016-bind-value, reactive-014-form-state, combined-003-form-validation = ALL IDENTICAL.

## next
- step 2: register arm-tagged `bind-directive` binding in emit-html.ts (when registry.currentArmContext != null).
- step 3: route via emitArmWireFunction wireableBinds loop.

## steps 2+3 DONE (arm routing)
- binding-registry.ts: +kind "bind-directive"; +bindAttr/bindNode fields (carry raw attr+node; bind lowering is element-shape-dependent so pre-lowering isn't possible like class:/attr-tpl).
- emit-html.ts: register arm-tagged bind-directive binding when registry.currentArmContext != null (mirrors S212 class:/attr-tpl reg).
- emit-bindings.ts: export buildEnumVarMap (was private).
- emit-variant-guard.ts: wireableBinds filter + short-circuit inclusion + bind loop calling emitBindDirectiveBody with _root acquire + _disposers wrapEffect; docstring moves bind:* from OUT-OF-SCOPE to in-scope.
- R26 VERIFIED match arm: /tmp/r26/match-bind.scrml → _scrml_match_match_10_wire_Editing has _root.querySelector + addEventListener("input") + _disposers.push(_scrml_effect). round-trips to @name.
- R26 VERIFIED engine: /tmp/r26/engine-bind.scrml → _scrml_engine_mode_wire_Editing has same. ONE fix, BOTH paths.
- TOP-LEVEL byte-identity re-confirmed after routing changes (diff -r identical).

## next
- adversarial: bind:checked/group in arm, enum-select in arm, predicated-type in arm, nested match, top-level byte-id.
- write unit/browser test; full suite.

## bindId-lockstep fix (engine double-render) + regression test
- FINDING (via adversarial happy-dom drive): engine state-child round-trip FAILED — render HTML id (_3) != wire-fn selector id (_1). Root: engine renders a state-child body through generateHtml MORE THAN ONCE (static initial-mount HTML + arm render fn); each mints a fresh genVar bindId. attr._bindId is sticky from the FIRST render; re-deriving the selector from it pointed at a stale id. (The S212 class:/attr-tpl path is immune — it captures directiveSelector at reg time. MATCH arms render ONCE so they were unaffected.)
- FIX: capture the per-render LOCAL bindId into the binding (bindIdForArm) at registration; emitBindDirectiveBody takes a bindIdOverride opt; emitArmWireFunction passes it. File-scope leaves it undefined → falls back to attr._bindId → byte-identical.
- engine round-trip now PASS both ways (cell-write->input + type->cell). Top-level byte-identity re-confirmed.
- regression test compiler/tests/browser/g-bindvalue-wiring-dropped-in-match-arm.browser.test.js: 9/9 pass (§1 emit-shape match+engine; §2 happy-dom round-trip match+engine + top-level no-regression).

## adversarial results
- bind:checked in match arm: .checked + change listener + checked effect, _root-rooted, _disposers — CORRECT.
- bind:group (2 radios) in match arm: (read === el.value) on init AND in-effect — CORRECT.
- enum-<select> bind in arm: Theme_toEnum[...] coercion + change event — CORRECT.
- predicated-type bind in arm: byte-EQUIVALENT to top-level (the §53.7.2 named-shape gate fires/doesn't fire identically; the `int where ...` source form isn't a recognized named-shape at EITHER locus — pre-existing, orthogonal).
- nested <match> inside <match> arm: PRE-EXISTING gap — the inner match's dispatcher/render/wire machinery is NOT emitted at all (verified absent at base 9cd5ae810 too). My fix neither introduced nor regressed it. DEFERRED.
- top-level bind byte-identity: confirmed (diff -r identical) at every step.

## next
- full suite (bun run test).

## FINAL — DONE
- full `bun run test` (includes browser): 24928 pass / 0 fail / 211 skip / 1 todo (25140 tests / 1055 files). Baseline was 17617/0 (pre-commit gate, excludes browser). My +9 browser tests included.
- NO within-node OVER-BUDGET / canary warnings (as predicted — arm-body emission, not parser ASTs).
- browser suite alone: 473 pass / 0 fail / 8 skip.
- coverage proof: emit-match.ts (block-form <match>) + emit-engine.ts (C12 + derived) ALL route through emitVariantGuardedRender → emitArmWireFunction. emitArmWireFunction is the SINGLE locus. ONE fix, ALL arm loci.
- real-world adversarial: combined-008-wizard / combined-005-dashboard / combined-002-todo / basic-011-form all compile 0 codegen-errors + valid client.js.
- FINAL_SHA: 15a43275. 4 commits ahead origin/main, 0 behind. tree clean.

DEFERRED (surfaced, out of scope HALF 1):
- nested <match> inside a <match> arm body: the INNER match's dispatcher/render/wire machinery is not emitted at all (verified ALSO absent at base 9cd5ae810 — pre-existing, "structural elements inside arm bodies not recursively expanded", docstring line ~69). bind: inside the inner arm therefore never reaches a wire fn. Not a regression. Candidate follow-on.
- §53.7.2 bind:value runtime predicate gate: the `int where value >= 0 && value <= 120` source form is NOT a recognized named-shape predicate at EITHER top-level OR arm (parsePredicateAnnotation only matches `baseType(predicate)[label]`). Arm path is byte-equivalent to top-level. Orthogonal pre-existing recognition gap.
