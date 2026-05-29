---
status: current
last-reviewed: 2026-05-28
session: S140
method: workflow (8 parallel empirical probes + synthesis); PA dual-verified per pa.md S138 R26 doctrine
---

> **PA-VERIFICATION ADDENDUM (S140, 2026-05-28, baseline c4d5ef96).** Per pa.md S138 R26 reverse-direction doctrine + Bug-50-redux precedent, PA independently re-compiled + grepped the three HIGH silent-miscompiles before accepting them as dispatch candidates:
> - **each-iteration** — CONFIRMED. emit-client.ts:684 `chunks.add("reconciliation")` is gated inside `case "for-stmt"` only; no `each-block` case. Minimal `<each>`-only file: `_scrml_reconcile_list` CALLED (1) but DEFINED (0) → runtime ReferenceError. Broadest blast radius.
> - **formFor** — CONFIRMED (canonical repro WITH `import { formFor } from 'scrml:data'`). Markup half wired (data-scrml-formfor + 3 bound inputs + submit button); validity half dead (validator-runner refs 0; 8 unbacked `.isValid`/`.errors` reads; `submitted` never set; W-DG-002 orphan ×3; `compound-parent` cellKind never set in emit-form-for.ts). NOTE: a malformed repro WITHOUT the import takes a different path (form not recognized at all) — canonical shape is required to reproduce.
> - **tableFor Defect 1** — CONFIRMED. emit-lift.js:531 emits `function(event) { ${handlerExpr}; }` with `evt` free var (sibling paths 713/731/760 rebind to `event`); emitted JS contains `function(event) { if (evt !==` → runtime ReferenceError.
> - **engine effect= NOT-REPRODUCED correction** — the S139 carry-forward "effect= does not fire" is empirically FALSE on this baseline (runtime-verified bellRung flip). A ghost; do NOT dispatch a fix. Hand-off note corrected.
> - tableFor Defect 2 (`:let` slot drop, HIGH) + render-by-tag nested-compound (MED) accepted on agent evidence (not independently re-run); both have concrete root-cause line cites.

# Bug-51-Class Corpus-Coverage Audit — S140 (2026-05-28, post-v0.6.6)

## 1. Executive Summary

This audit re-ran the Bug-51-A / Bug-56 detection method (compile real adopter source on the current baseline, then verify the *emitted output actually contains the feature's required runtime wiring* — the "`node --check` clean ≠ correct" silent-emit-omission class) across 8 shipped feature surfaces. **It found 5 SILENT-MISCOMPILES** — surfaces that compile to exit-0, pass `node --check` on every emitted artifact, yet ship feature-wiring that is absent or runtime-broken. Four are HIGH severity (`formFor`, `each`-iteration, two distinct `tableFor` defects) and one is MED (`render-by-tag` nested compound field). The remaining 3 surfaces (`schemaFor`, `engine effect=`, `engine onTransition`) are empirically CORRECT but have **no runtime (happy-dom) test coverage**, and one surface (`shape1-lifecycle` E-TYPE-001) is fully OK with genuine real-pipeline coverage. The unifying root cause across all 5 miscompiles: **every one was shipped behind emit-string-only test coverage** — the exact blind spot that let Bug 51-A and Bug 56 ship. Source claims in this report were independently re-verified against current `compiler/src/` (line numbers confirmed).

## 2. Findings Table

| Surface | Coverage tier | Runtime coverage? | Classification | Severity | One-line |
|---|---|---|---|---|---|
| each-iteration (Tier-1 `<each>`) | emit-string | No | SILENT-MISCOMPILE | HIGH | `_scrml_reconcile_list` called but tree-shaken out of bundle → ReferenceError on first render |
| formFor (§41.14/§55) | emit-string | No | SILENT-MISCOMPILE | HIGH | Inputs render but validity surface (isValid/errors/touched/submitted/validators) never emitted; onsubmit gets no `values` |
| tableFor Defect 1 (§41.16) | emit-string | No | SILENT-MISCOMPILE | HIGH | Per-row checkbox onchange references undefined `evt` → runtime ReferenceError (Bug-50-class residual) |
| tableFor Defect 2 (§41.16) | emit-string | No | SILENT-MISCOMPILE | HIGH | `:let={...}` slot body silently dropped at parse layer; falls through to default text render |
| render-by-tag-shape2 (§6.3.5) | emit-string | No | SILENT-MISCOMPILE | MED | Nested compound-field use-site emits literal browser-ignored tags; input never appears |
| schemaFor (§41.15) | emit-string | No | COVERAGE-GAP-ONLY | LOW | DDL pipeline correct end-to-end; real adopter fixtures never driven schemaFor→DDL |
| engine effect= (§51.0.H) | emit-string | No | COVERAGE-GAP-ONLY | LOW | Fires correctly (runtime-verified); S139 "does not fire" claim NOT REPRODUCED |
| engine onTransition (§B17.4) | emit-string | No | COVERAGE-GAP-ONLY | LOW | Handler fires on matching (from,to) (runtime-verified); no runtime test references fire_hooks |
| shape1-lifecycle E-TYPE-001 (§14.12) | diagnostic-stream | N/A | OK | none | E-TYPE-001 fires on all positions, no false-fire; real-pipeline covered |

## 3. Per-Surface Evidence

### 3.1 each-iteration — SILENT-MISCOMPILE (HIGH)

Compile of `/tmp/bug51-audit/each-iteration/repro.scrml` → exit 0 (only `W-EACH-KEY-001` + `W-PROGRAM-SPA-INFERRED`); `node --check` PASSES on both `repro.client.js` and `scrml-runtime.*.js`. Client-JS wiring is present across all 4 shapes: each `_scrml_each_render_N()` contains `_scrml_reconcile_list(_mount, _items, keyFn, createFn)`, the `<empty>` branch, and `_scrml_each_render_N(); _scrml_effect_static(_scrml_each_render_N);`.

The defect: the keyed-reconcile RUNTIME PRIMITIVE is tree-shaken out. `grep "function _scrml_reconcile_list"` of `scrml-runtime.*.js` → MISSING (3 hits are comments/instrumentation). Node verification: defined-in-runtime=false, defined-in-client=false, called-in-client=true → **CALLED-BUT-NEVER-DEFINED=true**. happy-dom drive → `ReferenceError: _scrml_reconcile_list is not defined` on the first `_scrml_each_render_10()`.

ROOT CAUSE (verified): `emit-client.ts` chunk-selection walk has no `case "each-block"`. The only `chunks.add("reconciliation")` is at **line 684**, gated inside `case "for-stmt"` (line 663). Control proof: a Tier-0 `${for...lift}` file DOES emit `function _scrml_reconcile_list`; a Tier-1 `<each>`-only file does NOT. Every adopter file whose only iteration is Tier-1 `<each>` ships a runtime-dead feature. (A `<each of=5>` with no `@`-state decl could additionally lose `effect_static`, which survives here only incidentally because state-decls pull `deep_reactive`.)

COVERAGE: `each-block.test.js` asserts emit strings (`toMatch` on the client-JS call-site) and never checks the runtime bundle defines the primitive nor drives DOM.

### 3.2 formFor — SILENT-MISCOMPILE (HIGH)

Compile of the canonical §41.14 example (`struct Signup{name req length(>=2), email req pattern, agree boolean req}` + server fn `persistSignup` + `<formFor for=Signup onsubmit=persistSignup/>`) → exit 0, zero errors; `node --check` PASSES on all 4 emitted JS.

**Markup half is correctly wired (so this is NOT a Bug-51-A total omission):** `signup.html` contains `<form data-scrml-formfor="Signup" ... action="/api/__ri_route_persistSignup_1" method="POST">`, three `<div data-scrml-formfor-field>` with bound inputs + `<span data-scrml-errors-anchor>`, and `<button type="submit" data-scrml-formfor-submit data-scrml-bind-bool-disabled>`.

**Validity-surface half is the silent miscompile:** `signup.client.js` has `_scrml_derived_declare` count=0, `_scrml_reactive_declare` count=0, validator-runner count=0, `submitted` count=0. The synthesized compound `signup` cell is never declared/seeded; `signup.isValid`, `signup.<field>.errors/.touched`, `signup.submitted` are never emitted; the struct validators (req/length/pattern) are never wired. The disabled button reads `!_scrml_reactive_get("signup").isValid` and errors blocks read `_scrml_derived_get("signup.name.errors")` — but nothing registers those. Compile also surfaces corroborating `W-DG-002` ("Reactive variable @name/@email/@agree declared but never consumed").

ROOT CAUSE (verified): `type-system.ts:11113` `spliceFormFor` does `arr.splice(i, 1, synth.compoundDecl, synth.formElement)` — inserting the synthesized compound state-decl **in place in the MARKUP children array** (where `<formFor>` lived inside `<program>`). `emit-logic.ts` (the pass emitting `_scrml_reactive_declare`/`_scrml_derived_declare`, validator runners, and the synth surface via `emit-synth-surface.ts`) only walks state-decls inside `${...}` logic blocks. A state-decl sitting among markup children is processed only by the HTML/binding emitter (explaining correct markup) but never reaches state-declaration / validity-surface emission. `emit-form-for.ts:523` `buildCompoundStateDecl` also never sets `_cellKind:"compound-parent"` (grep count 0).

RUNTIME PROBE (happy-dom): `_scrml_reactive_get("signup")` UNDEFINED, `signup.isValid` UNDEFINED, `_scrml_derived_get("signup.name.errors")` UNDEFINED. Net adopter impact: the flagship scrml.dev demo form renders inputs but has NO validation, disabled-gating reads `undefined.isValid`, the submit handler is invoked with NO `values` argument (§41.14.3 mandates `fn(values)`), and `submitted=true` is never set before invoking (§41.14.3 5th bullet, violated).

COVERAGE: `conf-form-for-canonical.test.js` asserts html/clientJs CONTAIN substrings like `data-scrml-formfor` and `signup.name.errors` — but those come from the errors-anchor READ site and the disabled-attr READ site, NOT from any declaration/registration, so the test passes while the surface is dead. `form-for-stdlib-runtime.test.js` drives only `registerLabels` through a no-op DOM stub. NO happy-dom test mounts the form and asserts isValid/errors/submit.

### 3.3 tableFor Defect 1 (per-row checkbox) — SILENT-MISCOMPILE (HIGH)

Compile of `tableFor-basic`, `example-27`, and minimal repros → exit 0, `node --check` PASS. Structural wiring is correct: `<table data-scrml-tablefor="User">`, mechanical title-case `<th>`, per-row `_scrml_reconcile_list(..., (item,i)=>item?.id!=null?item.id:i, _scrml_create_item)`, per-cell `createTextNode`, sort handlers, master-checkbox onchange.

The defect: the per-row checkbox onchange is emitted via the inline lift path (`emit-lift.js:531` — confirmed: `lines.push(\`${elVar}.addEventListener(${JSON.stringify(eventName)}, function(event) { ${handlerExpr}; });\`)`), where `handlerExpr` already passed through `rewritePresenceGuard`. Emitted verbatim: `_scrml_lift_el_9.addEventListener("change", function(event) { if (evt !== null && evt !== undefined) { ... } })`. Param is `event`; the guard references undefined free var `evt`. Drove it in node: **`ReferenceError - evt is not defined`**. The MASTER checkbox (delegated `emit-event-wiring.ts` Case B path) is correctly `evt => {...}` — because the Bug-50 fix (commit `c89f1176`) only patched `emit-event-wiring.ts` (confirmed: the only "Bug 50" reference in that file is at line 402), NOT the `emit-lift.js:531` inline per-row site. Bug 50 is RESOLVED S138 and its regression test (`onchange-arrow-fallback-r24-bug-50.test.js`) ONLY exercises the delegated `emitEventWiring` map — never the per-row inline lift handler. **Bug-50-class residual at an uncovered site.**

COVERAGE: `table-for.test.js` (476 lines) has meaningful emit-string assertions, but ZERO test drives runtime (no happy-dom) — which is exactly how this slipped through.

### 3.4 tableFor Defect 2 (`:let` slot) — SILENT-MISCOMPILE (HIGH)

`<column field="role" :let={(user) => <span class="badge">${user.role}</span>}/>` slot body is SILENTLY DROPPED. Emit falls through to DEFAULT `_scrml_lift_el_9.appendChild(document.createTextNode(String((row.role) ?? "")))` — no `<span>`/`badge` anywhere in client JS. Only signal is advisory `W-ATTR-001: Attribute let= is not recognized on <column>`. `type-system.ts` captures `slotBody: colNode.children` but `children` is empty — the `:let={...}` brace-block-with-markup attribute is consumed/dropped at the parse layer before the type-system sees it. This is the unfiled gap flagged in `known-gaps.md` as the "Bug 54 candidate — `:let=` attribute-registry wire-up" (surfaced by the Bug 33 W-LINT-011 fix, S138 `5ec84589`), never filed.

### 3.5 render-by-tag-shape2 (nested compound field) — SILENT-MISCOMPILE (MED)

Compiled all 8 variants at baseline HEAD `c4d5ef96` → ALL exit 0, ALL `node --check` PASS. **S139 fixes holding:** v1-v6, v8 (text/checkbox/select/textarea/const-prefix-sibling/multi-line `match{}`-sibling/explicit `${...}`-wrap) each emit `data-scrml-render-by-tag="_scrml_render_by_tag_1"` at the use-site with NO surviving literal tag, plus correct bind dispatch; all inits emit `_scrml_reactive_set("X", null)` (Bug 51-B fix holds).

NEW MISCOMPILE — v7 nested compound-field. Source: `<signupForm>` compound with field `<userName req length(>=2)> = <input type="text"/>`; use-site `<signupForm><userName/></signupForm>`. SPEC §6.3.5 explicitly declares this valid. Emit compiles clean, `node --check` passes. But emitted `v7-compound-field.html` line 12 is verbatim `<signupForm><userName /></signupForm>` — ZERO `data-scrml-render-by-tag`, NO `<input>`, BOTH tags survive as literal browser-ignored markup. The runtime cell IS fully wired in client.js (`_scrml_reactive_set("signupForm.userName", null)` + validators + errors/isValid derived), so the cell exists but NO DOM element binds to it. Compiler even emits `E-DG-002` "declared but never consumed in a render context."

ROOT CAUSE (verified): `emit-html.ts:1325` render-by-tag expansion calls `lookupStateCell(fileScope, tag)` with the BARE leaf tag `"userName"`. `lookupStateCell` only walks the parent-chain `s.stateCells.get(name)` — it never descends into a compound parent's `_scope`. Nested fields are resolved only by `lookupQualifiedStateCell`, which `emit-html.ts` NEVER calls for render-by-tag (grep: 0 hits). `decl===null` → the `if (decl && cellKind==="bindable")` guard fails → falls through to literal-tag emission. MED (not HIGH) because the trigger is narrower (nested-compound render-by-tag specifically), vs. the total-feature-breaks above.

### 3.6 schemaFor — COVERAGE-GAP-ONLY (LOW)

Compile of `examples/26-type-derived-schema.scrml` → exit 0 (only `W-PROGRAM-SPA-INFERRED` info); `node --check` PASS. The naive Bug-51 output-dir grep shows NO DDL in any emitted `.js`/`.html` — but **this absence is BY DESIGN**: SPEC §41.15.9 "DDL is compile-time string... No new runtime hooks needed"; `emit-html.ts:73` `SERVER_ONLY_STATE_TYPES = new Set(["schema","seeds"])` excludes `<schema>` from HTML/client.js (Bug 41 RESOLVED S137). The real wiring fires: driving the full BS→CE→PA→RI→TS pipeline, the schemaFor REWRITE FIRES (post-TS `<schema>` node contains synthesized `users { email: text req length(<=120) ... role: text req oneOf(['Admin','Editor','Viewer']) } tasks {...}`); `parseSchemaBlock` → 2 tables; `diffSchema(sqlite)` → `CREATE TABLE "users" (... "role" TEXT NOT NULL CHECK ("role" != '') CHECK ("role" IN ('Admin','Editor','Viewer')))`. Flagship enum-lowering (§41.15.6/OQ-SCH-12) fires correctly. **WIRING CRITERION FULLY SATISFIED.**

GAP: the two real canonical adopter fixtures are only AST-shape parse-conformance-checked, never driven schemaFor→DDL; the integration tests use hand-written inline sources, not the shipped adopter files.

### 3.7 engine effect= — COVERAGE-GAP-ONLY (LOW)

S139 carry-forward suspicion ("engine effect= does NOT fire correctly") **NOT REPRODUCED on current baseline (R26 reverse-direction).** Compile → exit 0; `node --check` PASS. Wiring present: hook fn `__scrml_engine_phase_fire_hooks(fromVariant, toVariant)` with `if (fromVariant==="Loading" && toVariant==="Done") { _scrml_ringBell_2(); }`, and the direct-write site wraps `_scrml_engine_direct_set("phase", Phase.Done, ...)` with `if (__scrml_engine_external) __scrml_engine_phase_fire_hooks(...)`. The `.advance()` path emits the equivalent IIFE. RUNTIME DRIVE (happy-dom + node vm, two-script-tag scope): fired `finish()` → transition Loading→Done → `effect=${ ringBell() }` executed → `bellRung` flipped false→true on BOTH dispatch paths: **EFFECT_FIRED: YES.**

GAP: emit-string only (`b17-4-codegen-ontransition-effect.test.js §B17.4.13`); no happy-dom state-flip assertion. ACTION ITEM: correct the S139 hand-off note — the "effect= does not fire" claim is empirically false on the current baseline.

### 3.8 engine onTransition — COVERAGE-GAP-ONLY (LOW)

Compile → exit 0; `node --check` PASS. Wiring present: `__scrml_engine_phase_fire_hooks` emits BOTH the `to=.Success` arm AND the `from=.Loading` arm correctly resolved to the same `(Loading,Success)` key; call-site fires the handler only on EXTERNAL transition (`if (__scrml_engine_external) ...`), keyed by captured-from + post-write-to. RUNTIME DRIVE (happy-dom): BEFORE phase=Loading fireCount=0; AFTER `succeed()`: phase=Success fireCount=1 lastFrom=loading-to-success → **HANDLER-FIRED YES.**

GAP: all 3 fire_hooks test files use emit-string `toContain` only; the happy-dom (`engine-body-render`) and `new Function` (`c13-advance-write-hook`) runtime tests drive ADJACENT paths but never reference fire_hooks. Wiring is correct, so this is the Bug-51-class blind spot WITHOUT an actual miscompile.

### 3.9 shape1-lifecycle E-TYPE-001 — OK (no action)

This is a COMPILE-TIME diagnostic surface, so the Bug-51 analog is inverted: failure = silent non-firing of E-TYPE-001. Probed via real CLI: (1) struct-field `passwordHash: (not to string)` + `print(u.passwordHash)` → exit 1, FIRES `E-TYPE-001`; (2) Shape-1 cell `<status>: (Idle to Done) = .Idle` + `@status.foo` → exit 1, FIRES; (3) Shape-1 struct-typed `<u>: User` + `@u.passwordHash` → exit 1, FIRES. NO false-fire: `struct-post.scrml` (write then read) → exit 0, zero E-TYPE-001; `shape1-happy.scrml` → exit 0, `node --check` PASS. Real-pipeline coverage exists (`lifecycle-shape1-tracker.test.js` Test 20-25 + `lifecycle-shape1-source-form.test.js` import `compileScrml` and assert E-TYPE-001 codes). Bugs 19/21/22/23/24/25 all RESOLVED or LOW-heuristic per known-gaps. happy-dom = N/A (no runtime artifact).

ORTHOGONAL (separate surface): `struct-post.client.js` emitted raw unlowered markup `let u = < User id = 1 ... >` inside a fn body, failing `node --check` — a fn-body `<Type>` state-instantiation codegen leak, independent of the lifecycle tracker.

## 4. Coverage-Gap Inventory — shipped features with NO runtime (happy-dom) test

Every audited runtime-bearing surface is emit-string-only. The features with NO happy-dom mount-and-drive test today:

- **formFor** — no test mounts the form and asserts isValid/errors/submit; existing tests are emit-string or no-op-DOM-stub.
- **tableFor** — `table-for.test.js` (476 lines) is all emit-grep; no per-row event dispatch / no-throw assertion.
- **each-iteration** — `each-block.test.js` is `toMatch` on the call-site only; never checks the runtime bundle defines the primitive nor drives DOM.
- **render-by-tag (Shape 2)** — entire surface is emit-string regex only; no nested-compound-field use-site case at all.
- **engine effect=** — emit-string only (B17.4.13); no state-flip assertion.
- **engine onTransition** — emit-string `toContain` only; no runtime test references `fire_hooks`.
- **schemaFor** — feature is server-only (no happy-dom appropriate), but the real adopter fixtures are never driven schemaFor→DDL in any tier.

The through-line: **emit-string coverage cannot detect a tree-shaken-out primitive (each), a wiring-in-wrong-pipeline drop (formFor), a runtime free-var ReferenceError (tableFor D1), a parse-layer slot drop (tableFor D2), or a literal-tag fallthrough (render-by-tag).** A happy-dom mount-and-drive tier is the missing acceptance gate that would have caught all 5.

## 5. Prioritized Recommendations

### Fix-dispatch candidates (live silent-miscompiles — dispatch first)

1. **each-iteration chunk omission** — HIGH. Scope: add `case "each-block"` to the `emit-client.ts` chunk-walk adding `chunks.add("reconciliation")` + `chunks.add("deep_reactive")` (and/or have `emitEachBodyRenderForFile` signal required chunks). Single-case addition; broadest blast radius (any Tier-1-`<each>`-only file). + happy-dom test asserting the bundle defines `_scrml_reconcile_list` and mounts a non-empty list.
2. **formFor validity-surface drop** — HIGH. Scope: route the synth compound state-decl out of the markup-children splice into the logic/state-declaration emission pass; tag `_cellKind:"compound-parent"` in `buildCompoundStateDecl` (emit-form-for.ts:523); pass collected `values` + set `@cell.submitted=true` before invoking onsubmit (§41.14.3). File as NEW bug (Bug-51 sibling: wiring dropped by AST splice into wrong emission pipeline). + happy-dom test (cell declared; isValid false until validators pass; per-field errors render; submit passes values + sets submitted).
3. **tableFor Defect 1 — per-row checkbox `evt` ReferenceError** — HIGH. Scope: mirror the Bug-50 fix at the `emit-lift.js` per-row inline-handler path (~505-531) — route synth-fallback-string arrow handlers through `rewriteExprArrowBody`, skipping `rewritePresenceGuard`. File as NEW HIGH (Bug-50-class residual). + happy-dom per-row change-event no-throw + `selectedIds`-mutated test.
4. **tableFor Defect 2 — `:let` slot-body drop** — HIGH. Scope: file the long-deferred **Bug 54** (`:let` slot-body consumed at parse layer; column falls through to default render). Adopter custom cell rendering silently vanishes. Cross-ref the known-gaps Bug 33→Bug 54 candidate.
5. **render-by-tag nested compound field** — MED. Scope: `emit-html.ts` render-by-tag expansion (line 1325) must track enclosing-compound context and resolve nested field use-sites via `lookupQualifiedStateCell` (currently only `lookupStateCell`, top-level). + happy-dom test + a nested-compound-field use-site case (suite has none; §B6.10 only covers the compound PARENT negative case).

### Add-runtime-test candidates (features work; close the blind spot)

6. **schemaFor** — LOW. Thin migrate-tier integration test driving the real adopter fixtures (`examples/26` + `samples/.../schemaFor-basic.scrml`) through `compileToTS`→`parseSchemaBlock`→`diffSchema`, asserting CREATE TABLE + enum CHECK. NOT a fix-dispatch.
7. **engine effect=** — LOW. happy-dom test compiling an engine with `effect=` on a single-target state-child, firing both `@var=.X` and `@var.advance(.X)`, asserting the effect side-effect (cell flip) occurs. Also correct the S139 hand-off/carry-forward note (claim empirically false).
8. **engine onTransition** — LOW. happy-dom / `new Function` test compiling `<onTransition to=/from=>` writing an observable cell, driving the matching transition, asserting the side effect fires exactly once and does NOT fire on a non-matching transition.

### No action

9. **shape1-lifecycle E-TYPE-001** — OK; verified end-to-end. Optional separate follow-up: file the orthogonal fn-body `<Type>` state-instantiation raw-markup emit leak (NOT a lifecycle-tracker bug).

## 6. Cross-References to Known-Gaps

- **Bug 41** (Schema DDL HTML-leak exclusion) — RESOLVED S137; the schemaFor DDL-absence-from-bundle is the SPEC-mandated server-only behavior it guards (`schema-html-leak-r25-bug-41.test.js`). schemaFor finding is correctly NOT a regression of Bug 41.
- **Bug 50** (onchange arrow-fallback `evt` ReferenceError) — RESOLVED S138 `c89f1176`; patched `emit-event-wiring.ts` ONLY. tableFor Defect 1 is the **residual at the uncovered `emit-lift.js:531` inline per-row site**. File as NEW HIGH (Bug-50-class residual).
- **Bug 54 candidate** (`:let=` attribute-registry wire-up) — surfaced by the Bug 33 W-LINT-011 fix (S138 `5ec84589`), recorded in `docs/known-gaps.md` but **never filed**. tableFor Defect 2 is its adopter-firing instance. File Bug 54 as NEW HIGH.
- **Bug 46** (tableFor `sortable=`/`selectable=` not implemented; W-ATTR-001 forwarded as plain HTML, NEW S136 R25) — adjacent to the tableFor surface; Defect 1 and Defect 2 are distinct from Bug 46 (Defect 1 is a runtime ReferenceError on an *implemented* selection path; Defect 2 is the `:let` slot, also distinct).
- **Bugs 19/21/22/23/24/25** (Shape-1 lifecycle tracker + source-form) — all RESOLVED or LOW-heuristic per `docs/known-gaps.md` §1/§5; nothing OPEN matches the shape1-lifecycle surface.
- **Bug 51-A / Bug 51-B / Bug 51-C / Bug 56** — the parent class. This audit confirms the class is NOT fully closed: 5 new instances of "clean emit, broken/absent runtime wiring, hidden behind emit-string-only tests" remain live.

## 7. Method Note

All probes compiled real adopter source via `bun compiler/bin/scrml.js compile <src> --output-dir <out>` on the current baseline, then verified emitted artifacts with `node --check` AND inspected the output for the feature's required runtime wiring, with happy-dom / node-vm runtime drives where a runtime artifact exists. Load-bearing root-cause claims (`emit-client.ts` chunk-walk line 684 / `case "for-stmt"` line 663; `emit-lift.js:531` inline wrap; `type-system.ts:11113` `spliceFormFor`; `emit-html.ts:1325` `lookupStateCell`; absence of `compound-parent` cellKind and `lookupQualifiedStateCell` in render-by-tag) were independently re-verified against current `compiler/src/` during synthesis.
