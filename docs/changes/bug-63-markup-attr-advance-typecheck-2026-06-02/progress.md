# Bug 63 — markup event-handler-attribute `.advance(.Variant)` not bare-variant-type-checked

Change-id: bug-63-markup-attr-advance-typecheck-2026-06-02

## 2026-06-02 — Phase 0 survey (LOCALIZED HOOKUP, no STOP)
- Probed AST shapes via temporary debug dump in `type-system.ts` `case "markup"`.
- All THREE handler positions (plain `<button>`, `<each>` per-item `<li>`, engine
  state-child body `<button>`) reach the EXISTING `annotateNodes` `case "markup"`
  walk with identical `kind:"call-ref"` value shape:
    { name:"@phase.advance", args:[".Bogus"], argExprNodes:[{kind:"ident",name:".Bogus"}] }
- Interpolation form (`onclick=${@phase.advance(.V)}`) arrives as `kind:"expr"` with
  a real `call`-rooted `exprNode`.
- CONCLUSION: localized hookup — the markup walk already visits the attr; add the
  `inferReactiveSiteBareVariants` call. NO new typer subsystem. Phase-0 STOP NOT triggered.

## 2026-06-02 — Implementation
- Added import `isEventHandlerAttrName` from `./multi-statement-scan.ts`.
- Added file-scope helper `handlerAttrToExprNode(value)` — normalizes a markup
  handler attr value into the `call`/`assign`-rooted ExprNode shape
  `inferReactiveSiteBareVariants` consumes:
    - `call-ref` → synthesized `{kind:"call", callee:{kind:"member", object:{kind:"ident",name:"@cell"}, property:"method"}, args:argExprNodes}`
    - `expr` → its existing `exprNode` passed straight through
    - anything else → null (silent).
- Hooked into `case "markup"` after the `visitAttr` loop: for every `on*` attr
  (via `isEventHandlerAttrName`), normalize + invoke
  `inferReactiveSiteBareVariants(handlerExpr, scopeChain, hSpan, errors, cellMessageEnums)`
  — same two-plane check (state plane → E-TYPE-063; message plane via cellMessageEnums).

## 2026-06-02 — Verification (compile-level static canary)
- A (plain): E-TYPE-063 `.Bogus` / `Phase` — FIRES (was silent).
- B (asymmetry): BOTH fn-body `.Bogus2` AND markup-attr `.Bogus` — FIRE.
- C (<each>): E-TYPE-063 `.Bogus` — FIRES.
- D (engine state-child body): E-TYPE-063 `.Bogus` — FIRES.
- Avalid (`.Active`): CLEAN (no false positive).
- NonAdvance (plain-cell assign + fn call): CLEAN.
- MsgBad (`.UnknownMsg`, accepts=Msg): E-ENGINE-MSG-UNKNOWN — FIRES.
- MsgGood (`.Go` msg-plane + `.Idle` state-plane): CLEAN.
- Unit test `markup-attr-advance-typecheck-bug63.test.js`: 9 pass / 0 fail.

## Files touched
- compiler/src/type-system.ts (import + handlerAttrToExprNode helper + markup-case hookup)
- compiler/tests/unit/markup-attr-advance-typecheck-bug63.test.js (new)
