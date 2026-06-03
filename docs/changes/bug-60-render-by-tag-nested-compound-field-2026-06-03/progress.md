# Bug 60 — render-by-tag nested-compound-field — progress

## 2026-06-03 Phase 0 (survey + repro)
- pwd: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa8cc8268588ff91c
- Base HEAD: 1a72c81c (brief expected 3707e212 — STALE; 1a72c81c is further along; primary files
  emit-html.ts (last touch S142 f3e9039d) + symbol-table.ts (last touch S156 71be8f5f) are stable
  ancestors, unaffected by the SHA drift). Safe to proceed.
- Maps read: primary, error, domain, structure. Load-bearing: error.map confirms E-DG-002 fires in
  dependency-graph.ts (SEPARATE pass), so codegen fix alone may not clear it — flagged sub-task.
- SPEC read: §6.3.5 (2205-2217), §6.4.1+§6.4.2 (2224-2266), §34 E-CELL-NO-RENDER-SPEC rows.
  §6.3.5:2209 is normative: nested `<userName/>` inside `<signupForm>...</>` IS valid render-by-tag.
  E-CELL-NO-RENDER-SPEC is for SELF-tag `<x/>` only — wrapper BLOCK form `<signupForm>...</>` does
  NOT fire it. SPEC is SILENT on whether `<signupForm>` block-wrapper emits a DOM element.
- REPRO CONFIRMED FAILING (BEFORE): /tmp/r26-bug60-BEFORE — literal <signupForm>/<userName/>/<email/>,
  ZERO input type=text/email, ZERO data-scrml-render-by-tag, spurious E-DG-002 on @signupForm.
  Runtime cells signupForm.userName/.email DO exist in client.js (no DOM binds to them).

## ROOT-CAUSE LOCUS (confirmed)
- emit-html.ts:1403 `lookupStateCell(fileScope, tag)` resolves BARE leaf only (walks parent-chain
  s.stateCells.get(name)); never descends compound `_scope`. Nested fields resolve ONLY via
  lookupQualifiedStateCell (symbol-table.ts:11082) which emit-html NEVER calls + tracks no
  enclosing-compound context. So decl===null → guard fails → literal-tag fallthrough.

## FIX SHAPE (decided)
1. enclosingCompoundStack (mirror boundaryStack push/pop) — when emitNode enters a markup BLOCK
   element whose tag resolves via lookupStateCell to cellKind==="compound-parent", push its name
   for the children walk; pop after.
2. In the self-tag render-by-tag block: if lookupStateCell(tag)===null AND enclosingCompound set,
   try lookupQualifiedStateCell(fileScope, [enclosing, tag]); use that record + its qualifiedPath.
3. Reuse the SAME expansion path (1405-1448) with qualified name → cellName=qualifiedPath
   ("signupForm.userName"); wiring keys _scrml_reactive_get/set on that (verified emit-bindings.ts:697).
4. Wrapper-emission decision: TRANSPARENT wrapper — compound parent has no render-spec, cannot be a
   DOM element; emit children directly, suppress literal <signupForm>. (SPEC-silent; choice surfaced.)
5. E-DG-002 (dependency-graph.ts separate pass): must credit wrapper render-by-tag as consumption.

## 2026-06-03 IMPLEMENTATION COMPLETE
- emit-html.ts (commit 8a4f613b): enclosingCompoundStack + transparent compound-wrapper
  branch + qualified-fallback resolution in render-by-tag self-tag block + cellName=qualifiedPath.
- dependency-graph.ts (commit e5e8fe98): render-by-tag structural-read credit in markup sweep
  (tag matches reactiveVarNodeIds → creditReader). Clears E-DG-002 on @signupForm AND the
  PRE-EXISTING top-level render-by-tag-only false-positive (@userName). Precise — @orphan
  (declared, never rendered) STILL fires.
- Unit test (commit 6b82988f): 10 tests / 4 groups. PASS.
- Browser happy-dom test (commit c9a4b3fe): 5 tests, bind:value round-trip + effect write-back. PASS.

## R26 EMPIRICAL (POST-FIX) — ALL HOLD
- repro: exit 0 warnings-only (W-PROGRAM-001 only); E-DG-002=0.
  input type=text=1, type=email=1, data-scrml-render-by-tag=2,
  literal <signupForm/<userName/<email = 0/0/0; node --check OK; bind keys signupForm.userName/.email.
- top-level Shape-2 control: input type=text=1, hookpoint=1, literal <userName=0, E-DG-002=0,
  bind keys bare userName (qualifiedPath===name), node --check OK. NO REGRESSION.

## REGRESSION SUITES (explicit)
- render-by-tag.test.js + bug-51-shape-2-render-by-tag-end-to-end + reactive-compound: 49/49 PASS.
- DG suite (dependency-graph + e-dg-002-false-positive-class + dg-markup-read-emission a12-a15 +
  engine-cell-self-credit + projected-var-reader-credit): 117/117 PASS.

## WRAPPER-EMISSION DECISION (surfaced)
- TRANSPARENT wrapper: compound parent <signupForm> emits NO DOM element (no render-spec).
  SPEC §6.3.5:2209 is the only normative text; it is SILENT on wrapper DOM emission. Choice
  follows from compound parent being render-spec-less (E-CELL-NO-RENDER-SPEC is the SELF-tag rule).

## SIBLING GAP SURFACED (Rule 5)
- E-DG-002 false-fired on TOP-LEVEL render-by-tag-only cells too (pre-existing, NOT nested-specific).
  Fixed by the same principled DG credit (render-by-tag consumption). Was already firing before
  Bug 60 work; the negative no-regression test did not require it clean, but fixing it is the
  correct single-mechanism resolution.
- POTENTIAL EDGE (deferred, out of scope): emit-bindings.ts C4 looks up reactiveTypeMap/enumVarMap
  by cellName. For nested fields cellName is now "signupForm.userName" (dotted). If a nested field
  is PREDICATE-typed or ENUM-<select>-typed, those maps may be keyed differently (bare leaf vs
  dotted). Bug-60 repro fields (text/email + req/length/email validators) are unaffected (validators
  lower as HTML attrs in emit-html, not via those maps). Flagged for a future predicate/enum nested
  render-by-tag pass.
