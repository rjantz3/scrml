# each-body-interactivity-landing2 — progress

## 2026-06-01T15:27:31Z — startup + survey
- pwd: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-acbb7ff3587be012b
- base: bf2e02e7 (== main; merge-base == main; no staleness)
- bun install OK; bun run pretest OK
- Maps read: primary.map.md + schema.map.md (AST shapes / type-system internals)
- Bug reproduced on baseline: E-SCOPE-001 at TS stage on `class:done=@.done`
- Surveyed fix loci:
  - Locus 1 type-system.ts visitAttr (lines 6905-6955) + each-block case (6747-6769) +
    Scope class (1936) has `label`; each scope pushed with label `each:<key>`.
  - Locus 2 emit-each.ts renderTemplateChildToJs attr loop (208-220) — inert setAttribute.
- AST shapes confirmed (dump):
  - class:done=@.done -> {kind:"variable-ref", name:"@.done", exprNode:escape-hatch raw="@.done"}
  - onclick=toggle(@.id) -> {kind:"call-ref", name:"toggle", args:["@.id"], argExprNodes:[...]}
  - data-id=${@.id} -> {kind:"expr", raw:"@.id", exprNode:escape-hatch}
- visitAttr computes baseName="@" for name="@.done" (slice to first "."), lookup fails -> E-SCOPE-001.
- Next: fix Locus 1 (recognize @. in each scope), then Locus 2 (real per-item attr codegen).

## 2026-06-01T15:38:48Z — Locus 1 + Locus 2 landed
- Locus 1 (type-system.ts): inEachBodyScope() helper + visitAttr skip for @.-sigil
  variable-ref values inside each body. Committed 71300609. Pre-commit full suite green.
- Locus 2 (emit-each.ts): renderTemplateAttrToJs() + rewriteIterValueExpr() +
  eventNameForAttr() + serializeCallArgs(). Replaced inert setAttribute loop.
  Emits: class:NAME -> classList.toggle; onNAME/on:NAME -> addEventListener;
  ${}/@.field -> setAttribute(name, String(expr)); literals preserved; bind:/ref deferred.
- R26 verify on /tmp/r26-each-verify:
  1. No E-SCOPE-001 — compile exit 0 OK
  2. class:done -> _scrml_el_1.classList.toggle("done", !!(_scrml_each_item.done)) OK
  3. onclick=toggle(@.id) -> addEventListener("click", function(event){ _scrml_toggle_1(_scrml_each_item.id); }) OK
  4. data-id=${@.id} -> setAttribute("data-id", String(_scrml_each_item.id)) [VALUE not literal] OK
  5. classic-script parse (vm.Script) OK
  6. website-viewer files compile exit 0 + parse OK (each-in-source are all comments;
     index.scrml friction-bug-#7 note documents THIS bug). each-block.test.js 24/24 pass.
- Next: extend each-block.test.js with assertion cases + happy-dom acceptance test.

## 2026-06-01T15:47:09Z — tests + key finding
- Added §15 unit tests (8 cases) — committed c9319ebb. 32/32 each-block.test.js pass.
- Added each-body-interactivity-landing2.browser.test.js (10 happy-dom cases): emit-wiring,
  mount, data-id VALUE, initial class state, STRUCTURAL class re-eval, handler-fires-on-click.
- KEY FINDING (surface to PA): in-place mutation of an EXISTING keyed row's class:done
  does NOT re-toggle. Root cause: keyed reconcile fast-path (runtime-template.js:1293
  S106 same-keys-same-order) reuses the node + skips create-fn (where classList.toggle lives).
  Runtime delegates per-row updates to _scrml_value_indexed_subscribers/_scrml_prop_subscribers,
  which NEITHER Tier-1 <each> NOR Tier-0 ${for…lift} wires for class: on reused rows.
  VERIFIED empirically: the lift path has IDENTICAL behavior (handler fires, state flips,
  reused-row class does not re-toggle). => Landing-2 is AT PARITY with the lift path.
  In-place per-row class reactivity is a SHARED reconcile-reactivity landing for both paths,
  beyond Landing-2's attr-drop + E-SCOPE-001 scope. DEFERRED (documented in browser test).
- DEFERRED (pre-existing, orthogonal): no-<empty> each + initially-empty/undefined source
  crashes _scrml_reconcile_list ('newItems.length' undefined) at mount. Baseline has the same
  guard structure (if (node.emptyChild) only). Not introduced by this fix.
