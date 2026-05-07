# schema.map.md
# project: scrmlTS
# updated: 2026-05-06T23:50:00Z  commit: 7334fb0

## TypeScript AST — `compiler/src/types/ast.ts` (1,641 LOC)

This is the canonical AST contract. Every pass downstream of TAB consumes/produces these nodes.
~80 `kind` discriminators across `ASTNode` (logic + markup statements) and `ExprNode` (expressions).

### Core / shared
Span                          — { start: number; end: number; line?: number; col?: number }.
AttrValue (union)             — StringLiteralAttrValue | VariableRefAttrValue | CallRefAttrValue | ExprAttrValue | PropsBlockAttrValue | AbsentAttrValue.
AttrNode                      — { name; value: AttrValue; span; eqSpan?; ... }.
TypedAttrDecl                 — typed attribute decl shape used by props-blocks + bind:value validators.
SQLChainedCall                — { method: string; args: ExprNode[] } — used in `SQLNode.chained` for `.bind(...).all()` chains (S58 lift+sql/return+sql triad).
LiftTarget (union)            — `state-cell` | `tilde` | `lin` etc.

### Markup + control
MarkupNode                    — generic HTML element/component-instance node (`kind: "markup"`); has `tag`, `attrs`, `children`.
TextNode                      — `kind: "text"`.
CommentNode                   — `kind: "comment"`.
ChannelDeclNode (extends MarkupNode) — `kind: "markup"` with `tag === "channel"`; file-level WebSocket channel decl.
HtmlFragmentNode              — `kind: "html-fragment"`; raw HTML pass-through.
StyleNode                     — `kind: "style"`.
CSSInlineNode                 — `kind: "css-inline"`.
CSSRule (union)               — CSSPropertyRule | CSSSelectorRule.
CSSReactiveRef                — reactive ref captured inside CSS.

### Decls
LetDeclNode                   — `kind: "let-decl"`.
ConstDeclNode                 — `kind: "const-decl"`.
TildeDeclNode                 — `kind: "tilde-decl"` — pipeline accumulator (§32).
LinDeclNode                   — `kind: "lin-decl"` — linear type (§35).
ReactiveDeclNode              — `kind: "state-decl"` (renamed from `"reactive-decl"` in Phase A1a Step 3, S59).
StateConstructorDefNode       — `kind: "state-constructor-def"`.
StateNode                     — `kind: "state"`.
ReactiveDebouncedDeclNode     — `kind: "reactive-debounced-decl"`.
ReactiveNestedAssignNode      — `kind: "reactive-nested-assign"`.
ReactiveArrayMutationNode     — `kind: "reactive-array-mutation"`.
ReactiveExplicitSetNode       — `kind: "reactive-explicit-set"`.
FunctionDeclNode              — `kind: "function-decl"`; `pure?: boolean` (§48).
ComponentDefNode              — `kind: "component-def"`; classifier at ast-builder.js:3634 still has the open S29 bug (uppercase-named `const/let` regardless of RHS).
TypeDeclNode                  — `kind: "type-decl"`.
RenderSpecNode                — `kind: "render-spec"` (§5.4.1).
ImportDeclNode + ImportSpecifier — `kind: "import-decl"`.
UseDeclNode                   — `kind: "use-decl"`.
ExportDeclNode                — `kind: "export-decl"`. (S65 ast-builder grammar fixes: export function decl swallow, export *, renamed re-exports.)

### Effects + flow
LogicNode                     — `kind: "logic"`.
SQLNode                       — `kind: "sql"`; carries `chained?: SQLChainedCall[]`.
MetaNode                      — `kind: "meta"` (§22).
ErrorEffectNode               — `kind: "error-effect"`.
WhenEffectNode                — `kind: "when-effect"`.
WhenMessageNode               — `kind: "when-message"`.
TransactionBlockNode          — `kind: "transaction-block"`.
CleanupRegistrationNode       — `kind: "cleanup-registration"`.
UploadCallNode                — `kind: "upload-call"`.
DebounceCallNode              — `kind: "debounce-call"`.
ThrottleCallNode              — `kind: "throttle-call"`.
IfStmtNode / IfExprNode       — `kind: "if-stmt"` / `"if-expr"`.
ForStmtNode / ForExprNode     — `kind: "for-stmt"` / `"for-expr"`.
WhileStmtNode                 — `kind: "while-stmt"`.
ReturnStmtNode                — `kind: "return-stmt"`.
ThrowStmtNode                 — `kind: "throw-stmt"`.
SwitchStmtNode                — `kind: "switch-stmt"`.
TryStmtNode                   — `kind: "try-stmt"`.
MatchExprNode                 — `kind: "match-expr"`.
MatchStmtNode                 — `kind: "match-stmt"`.
MatchArmInlineNode            — `kind: "match-arm-inline"`.
ErrorArm                      — match-arm error variant.

### Expression-level (mixed into LogicStatement)
BareExprNode                  — `kind: "bare-expr"`. (Phase 4d Step 8 deleted `BareExprNode.expr` field — strict cleanup landed pre-S40.)
LiftExprNode                  — `kind: "lift-expr"` (§10).
FailExprNode                  — `kind: "fail-expr"`.
PropagateExprNode             — `kind: "propagate-expr"`.
GuardedExprNode               — `kind: "guarded-expr"`.
ValidatorEntry                — single validator binding entry inside `ReactiveDeclNode.validators[]`.

### ExprNode kinds (used in expression-parser.ts)
`ident`, `lit`, `string-literal`, `array`, `object`, `spread`, `call`, `member`, `index`, `binary`, `unary`, `ternary`, `cast`, `assign`, `lambda`, `new`, `call-ref`, `variable-ref`, `sql-ref`, `input-state-ref`, `expr` (parenthesized), `escape-hatch`, `reset-expr` (§55 `reset(@cell)`), `match-expr`, `if-expr`, `for-expr`, `lift-expr`, `fail-expr`, `propagate-expr`, `guarded-expr`, `props-block`, `absent`.

### Auth / module config
AuthConfig                    — `<program auth>` config object.
MiddlewareConfig              — `<program middleware>` config object.

### Top-level shapes
FileAST                       — root output of TAB; `{ blocks: ASTNode[]; ... }`.
TABOutput                     — TAB stage envelope.
LogicStatement (union)        — every `kind:` allowed inside a `<logic>` body.
ASTNode (union)               — every node kind that can appear at top level / in markup children.
ASTNodeKind = ASTNode["kind"] — string literal union over kind discriminators.

## SQL Schema (per-file `<schema>` block — §39)

scrml does not own a single global DB schema. Each `.scrml` file may declare a `<schema>` block; `compiler/src/schema-differ.js` reconciles diffs at compile time. Migrations are emitted into `dist/` per file. The schema shape is user-defined; compiler validates SQL passthrough via `<sql>` blocks against the declared schema.

## Database driver classification — `compiler/src/codegen/db-driver.ts` (151 LOC, S40 Phase 2)

URI scheme classifier for `?{}` multi-database adaptation (§44):
- `postgres://`, `postgresql://` → Bun.SQL postgres driver.
- `sqlite:` / file path → Bun.SQL sqlite driver.
- Mismatched URI vs declared dialect → **E-SQL-005** (URI/dialect mismatch).

## GraphQL / Proto
None. (Project does not use GraphQL or protobuf.)

## Tags
#scrmlTS #map #schema #ast #expression-parser #node-kinds #s65 #reactive-decl-rename #parseVariant

## Links
- [primary.map.md](./primary.map.md)
- [domain.map.md](./domain.map.md)
- [error.map.md](./error.map.md)
- [SPEC.md](../../compiler/SPEC.md)
- [PIPELINE.md](../../compiler/PIPELINE.md)
- [master-list.md](../../master-list.md)
