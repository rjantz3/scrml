# g-match-arm-reactive-attr-effects (HIGH) — progress

## 2026-06-21 (start)
- Worktree synced to main 09cc6b21 (FF merge). bun install + pretest OK.
- Read primary.map.md Task-Shape Routing: compiler-source bug fix.

## Scope-first analysis
- `<match>` MARKUP element render path is emit-match.ts → emit-variant-guard.ts.
  Arm body lowered via generateHtml(arm.body, ctx) → emits HTML string + registers
  text-logic / event bindings in ctx.registry, tagged `engineArm` by the arm-context
  stack (pushArmContext/popArmContext set in emitArmRenderFunction).
  emitArmWireFunction re-emits those per-mount (`_root.querySelector` + _scrml_effect).
- class: + attr-tpl (style="...${@x}...") placeholders ARE emitted into the arm HTML
  string by emit-html.ts (lines ~1826 class:, ~1842 attr-tpl), but their EFFECTS are
  wired ONLY by emit-bindings.ts walking collectMarkupNodes(getNodes(fileAST)).
  collectMarkupNodes (collect.ts:88) descends ONLY node.children — NOT match arm
  bodies (which live in armsRaw/bodyChildren). => arm-body class:/attr-tpl get a
  placeholder but NO effect. Dead binding. ROOT CONFIRMED.
- REPRO compiled pre-fix: only 1 _scrml_effect (OUTSIDE style). INSIDE
  _scrml_attr_tpl_style_3 + _scrml_class_class_hidden_4 placeholders present in
  _scrml_match_match_13_render_Ready() but wire_Ready is a no-op shell.

## <each> block-form sibling check
- emit-each.ts renderTemplateAttrToJs (lines 834-990) DOES handle class: (classList.toggle
  + maybeWrapEachPerItemEffect), attr-tpl/string-literal-with-interp (buildEachAttrTemplate
  + per-item effect), and generic reactive ${...}/@.field (setAttribute + per-item effect),
  all INLINE on the imperatively-built per-item element. => <each> block-form does NOT
  share the gap. NOTE in report.

## Fix plan
- Register class:/attr-tpl directives as registry logic-bindings (new kinds) so they get
  arm-tagged; emitArmWireFunction re-emits per-_root; emit-bindings.ts skips arm-tagged.

## 2026-06-21 (fix implemented)
- binding-registry.ts: + kinds "class-directive" / "attr-template" + directive fields.
- emit-bindings.ts: + lowerClassDirectiveCondition / lowerAttrTemplateValue shared lowering
  helpers (DRY with the top-level wiring; the 4 §5.5.2 class: forms + attr-tpl template).
- emit-html.ts: at class:/attr-tpl placeholder sites, when registry.currentArmContext != null,
  register an arm-tagged directive binding carrying the lowered expr+refs (uses liveCtx, NOT the
  block-scoped ctx — legacy signature has no ctx).
- emit-event-wiring.ts: global logic-binding filter now SKIPS arm-tagged class-directive/attr-template
  (they are per-arm; a module-init document.querySelector would cache a stale/absent node).
- emit-variant-guard.ts emitArmWireFunction: + wireableDirectives filter + per-mount wiring block
  (_root.querySelector + classList.toggle / setAttribute + _disposers.push(_scrml_effect(...))).

## R26 emit-grep (PASS)
- Repro recompiled: _scrml_effect 1 -> 3. wire_Ready now wires INSIDE style attr-tpl + class:hidden
  against _root with disposers. node --check clean. OUTSIDE binding unchanged (global document.querySelector).
  No double-wire (INSIDE placeholders only in render+wire, not global).
