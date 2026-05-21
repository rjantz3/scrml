# Progress — F7: native-parser state / SQL / CSS sub-parsers

Append-only timestamped log. Dispatch worktree:
`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a11c365f6891afd27`

## 2026-05-21 — startup
- Worktree verified; `git merge main --no-edit` clean (base advanced to cf761400).
- `bun install` + `bun run pretest` OK.
- Baseline `bun run test`: 17980 pass / 169 skip / 1 todo / 0-2 fail (intermittent
  pre-existing flake — count varied 2→0 across re-runs; not F7-related).

## Phase 0 survey — live→native payload shapes
- State: live `buildBlock` case `"state"` — `openerHadSpaceAfterLt` discriminates a
  state block from a markup block (native: `TagKind.StateOpener`). `parseTypedAttributes`
  splits `attrs[]` (AttrNode) from `typedAttrs[]` (TypedAttrDecl: name/typeExpr/optional/
  defaultValue/span). `hasTypedDecls` → `state-constructor-def`, else `state`.
- SQL: live `case "sql"` — `parseSQLTokens` → `{ query, chainedCalls }`.
  `chainedCalls[]` = `{ method, args }`; `.nobatch()` stripped → `node.nobatch`.
  The chain trails the `?{...}` closing `}`: `.method(args).method(args)`.
- CSS: live `case "css"` — `parseCSSTokens` → `CSSRule[]`. A rule is either a
  property rule `{ prop, value, span, reactiveRefs?, isExpression? }` or a selector
  rule `{ selector, declarations[], span }` or an at-rule `{ atRule, span }`.
  `scanCSSValueForReactiveRefs` extracts `@ident` refs.

## F7.a/b/c — landed together (shared parse-markup.js wiring)
- The three sub-parsers attach via parse-markup.js — one import block + one
  emitMarkupElement edit + one emitContextBlock edit. They are interdependent
  through the shared file (the import statement references all three modules),
  so they commit as one logical unit.
- F7.a — parse-state-body.{scrml,js}: shapeStateBlock derives the live
  StateNode/StateConstructorDefNode payload (stateNodeKind/stateType/typedAttrs)
  from a StateOpener Markup block's tokenizedAttrs. emitMarkupElement stamps
  block.tagKind + calls shapeStateBlock for StateOpener blocks.
  GAP FOUND + FIXED: native recognizeContextEntryAt did not recognize a
  `< Ident` (space-after-`<`) state opener — added isStateTagBoundaryAfterLt.
- F7.b — parse-sql-body.{scrml,js}: shapeSqlBlock parses the `?{...}` body into
  query + consumes the trailing `.method(args)` chain into chainedCalls;
  `.nobatch()` stripped → block.nobatch. emitContextBlock captures bodyText for
  InSql + advances the cursor past the consumed chain.
- F7.c — parse-css-body.{scrml,js}: shapeCssBlock parses the `#{...}` body into
  rules[] (property rules / selector rules / at-rules + reactiveRefs).
  emitContextBlock captures bodyText for InCss + calls shapeCssBlock.
- Conformance: parser-conformance-markup.test.js 512 pass / 0 fail (was 477;
  +35 F7 tests incl. live-buildAST parity assertions ×3 contexts).
  Corpus histogram unchanged. Pre-commit gate 13395 pass / 0 fail.
- Landed in one commit (459cabbd) — the three sub-parsers share parse-markup
  .{js,scrml} (the import block references all three modules); per-sub-step
  commits would leave an unresolvable-import intermediate state.

## SPEC §5 single-quote reconciliation item (carry — NOT touched by F7)
F1 surfaced a native-vs-live divergence on opener-END for single-quoted
attribute values containing `>`. F7 does NOT touch that boundary: F7.a's
`isStateTagBoundaryAfterLt` inspects only the whitespace + first letter
AFTER `<` (the opener-DETECTION boundary — does a `< Ident` start a tag),
never the opener-END `>` terminator nor any attribute VALUE. The
single-quote divergence stays for M5. SPEC §5 (Attribute Quoting
Semantics, lines 1269-1919) not consulted further — no F7 interaction.

## DONE
All three sub-parsers landed; .scrml canonical + .js shadow per file;
git tree clean at 459cabbd.
