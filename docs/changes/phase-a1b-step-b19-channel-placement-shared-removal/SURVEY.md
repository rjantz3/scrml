# A1b Step B19 — Phase 0 Survey

**Date:** 2026-05-07
**Session:** S69
**Step:** B19 — Channels file-level placement + `@shared` modifier rejection
**Errors:** E-CHANNEL-INSIDE-PROGRAM (§38.1) + E-CHANNEL-SHARED-MODIFIER (§38.4)

---

## §1 Existing channel-handling code

### §1.1 Parser / TAB
- `compiler/src/ast-builder.js` line 836-895: `export <channel name="X">…</>` is recognized as a channel-export form. Channel decls remain `MarkupNode` with `tag: "channel"` (no separate kind).
- `compiler/src/ast-builder.js` line 9130-9173: `walk()` collects all `<channel>` markup nodes into `ast.channelDecls[]` regardless of placement (top-level OR nested inside `<program>`/markup ancestors).
- `compiler/src/types/ast.ts` line 1036-1066: `ChannelDeclNode extends MarkupNode { tag: "channel"; isExport?; _p3aInlinedFrom?; … }`.

### §1.2 Symbol-table / Codegen
- `compiler/src/symbol-table.ts` line 822: `"channel"` is in the kind enum for "definitively-not-cell-not-engine" exports — used by E-IMPORT-PINNED-INVALID.
- `compiler/src/codegen/emit-channel.ts`: full WS codegen exists (collect/client/server/handlers). `collectChannelNodes()` (line 56) walks markup tree filtering `_p3aIsExport`.
- No existing fire site for **E-CHANNEL-INSIDE-PROGRAM** or **E-CHANNEL-SHARED-MODIFIER** anywhere in `compiler/src/`. (Existence-guard #1: empty.)

### §1.3 Where channel placement is checked today
- **Nowhere.** Channels nested inside `<program>` parse cleanly and reach codegen via `collectChannelNodes()` walking `node.children`. No diagnostic is fired.
- §38.1 normative line 15422 mandates the diagnostic; B19 adds it.

---

## §2 `@shared` token recognition + AST shape

### §2.1 Tokenization
- `@shared` is just a single `AT_IDENT` token (`tok.kind === "AT_IDENT"`, `tok.text === "@shared"`). No special tokenizer handling.

### §2.2 AST-builder (TAB)
- `compiler/src/ast-builder.js` line 3947-3966 (logic-block parser path) **AND** line 5823-5841 (alternate path): `@shared <ident> = <expr>` produces a `state-decl` node with `isShared: true`, `shape: "plain"`, `structuralForm: false`, `isConst: false`. Legacy `@`-form, NOT structural form.
- The structural form `<x> @shared = init` does NOT exist in any parser branch — `@shared` is exclusively the legacy `@`-prefix-modifier form.
- Malformed `@shared … (no = init)` falls back to `bare-expr`.

### §2.3 Where `isShared` is read today
- `grep -n "isShared" compiler/src/` reveals readers in code-generator.js, emit-reactive-wiring.ts, and a few others that emit different sync wiring for `isShared: true`. None of them fire a diagnostic — `@shared` is silently accepted today.
- `compiler/src/ast-builder.js` line 2977 has a JSDoc comment listing `@shared` as a recognized initializer marker.

**Existence guard #2:** `@shared` parses cleanly, AST captures it via `state-decl.isShared`, no diagnostic fires anywhere. B19 adds the SYM-time fire.

### §2.4 Spec scope
- §38.4 line 15468: `@shared` SHALL NOT appear in any v0.next source. ANY occurrence fires E-CHANNEL-SHARED-MODIFIER.
- §38.9 line 15670: confirms "inside (or outside) a channel body" — fires whenever `@shared` is present.

---

## §3 AST shape of channel bodies

Confirmed via probe (`/tmp/explore-channel-ast2.js`):

- Top-level channel: `ast.nodes[i].kind === "markup"` with `tag === "channel"` at file root.
- Nested-in-program channel: `<channel>` lives as a child of the `<program>` markup node. `ast.channelDecls[]` still includes it.
- Nested-in-`<div>` (inside `<program>` logic block): the `<div>...</div>` becomes an `html-fragment` and `<channel>` inside it is NOT visible to `ast.channelDecls[]` — that path is treated as raw HTML literal.
- `@shared` inside channel body's `${...}` logic block: `state-decl.isShared === true` is correctly set (TAB stops at the `@shared` form).

---

## §4 Walker insertion point

### §4.1 Best fit: SYM PASS 14 (new)
- Existing passes go up to PASS 13 (B17 components-vs-engines residual).
- B19 adds **PASS 14**: walks `ast.nodes` to detect `<channel>` placement, walks every `state-decl` (including `children` arrays) for `isShared: true`.
- Two sub-walks for clarity:
  - `walkChannelPlacement(ast.nodes, errors, filePath)` — takes a `parent` ancestry context, fires E-CHANNEL-INSIDE-PROGRAM when a `<channel>` markup node is reached with any non-null parent.
  - `walkSharedModifier(ast.nodes, errors, filePath)` — generic AST walker that visits every `state-decl` (incl. compound `children`) and fires E-CHANNEL-SHARED-MODIFIER when `node.isShared === true`.

### §4.2 Why SYM, not parser
- SYM is the canonical "validation after AST is fully formed" stage; it has access to the full file-AST (including hoisted `channelDecls` if needed).
- Adding the check at parse time would be a TAB-time error — but the TAB layer is intentionally permissive (parses any v1 shape, leaving validation to SYM/NR). Keeping with B14-B17's pattern, SYM is the right home.

### §4.3 What B19 does NOT do
- Does NOT validate cross-scope `@cellName` access (B3 owns this).
- Does NOT validate channel attribute shapes (E-CHANNEL-001, etc. are codegen-time today).
- Does NOT remove the `isShared` field from AST or codegen — codegen continues to read it; B19 just FIRES the error so the source is rejected.
- Does NOT address `<channel>` inside HTML-literal `<div>...<channel>...</div>` (that path becomes `html-fragment`; not reachable from B19's walk).

---

## §5 Existing test coverage

- `compiler/tests/unit/channel.test.js`: Tests parser + codegen. Includes a test §13 "@shared variables emit _scrml_reactive_subscribe sync calls" — codegen-side, NOT SYM-side. Should not break.
- No `.skip` placeholders for E-CHANNEL-INSIDE-PROGRAM or E-CHANNEL-SHARED-MODIFIER found.
- `samples/compilation-tests/gauntlet-s20-channels/channel-shared-state-001.scrml` uses both v1 shapes (channel inside `<program>` + `@shared`); but is NOT included in the pretest `compile-test-samples.sh` list and is NOT compiled by any active test that would invoke SYM. No regression.
- `examples/08-chat.scrml`, `examples/15-channel-chat.scrml`, `examples/23-trucking-dispatch/{channels,pages/dispatch/{board,load-detail}}.scrml`: contain `@shared` and/or v1-shape channels. **Not driven through SYM in any active test.** `expr-parity.test.js` walks them for ExprNode parity only; does not invoke SYM.

**Conclusion:** B19 SYM-time fires can be added without breaking existing tests. No corpus migration required.

---

## §6 Risks / open questions

- **None blocking.** The E-CHANNEL-INSIDE-PROGRAM walker only needs ancestry tracking (channels are markup, ancestry is via the AST `children` chain — straightforward).
- **Cross-scope channel cells:** B3's `@cellName` resolution against PASS 1's `stateCells` map already handles channel-declared cells at file scope (state-decls inside channel-body logic blocks register in the **file scope** because logic-blocks don't introduce new scopes). Confirmed via `compiler/src/symbol-table.ts` PASS 1 walker — it descends into markup `children` and into `logic.body`. So channel-declared cells become visible to `<program>` automatically.
- **Confirmation:** the spec line 15425 "Channel-declared state cells SHALL be reachable from within `<program>` and from any logic context in the same file via canonical `@name` access" — already satisfied by B1's PASS 1 + B3's PASS 3.

---

## §7 Decisions

1. **PASS 14 for B19.** Two sub-walks: placement + shared.
2. **Walk channel ancestry stack.** Pass parent kind/tag during recursion; fire when `<channel>` is reached with non-empty stack OR with a parent that is markup.
3. **Walk every state-decl for isShared.** Includes compound `children`; mirrors B5/B11's recursion shape.
4. **Diagnostic message text** per BRIEF §5 + §34 catalog wording.
5. **Span source.** Use `node.span` (always populated) for both diagnostics.

---

## §8 Tags

#a1b-b19 #phase-0-survey #channel-placement #shared-modifier-rejection #pass-14 #s69 #m19
