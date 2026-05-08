# schema.map.md
# project: scrmlTS
# updated: 2026-05-07T20:30:00Z  commit: a4eed93

## TypeScript AST — `compiler/src/types/ast.ts` (1,641 LOC)

This is the canonical AST contract. Every pass downstream of TAB consumes/produces these nodes.
~80 `kind` discriminators across `ASTNode` (logic + markup statements) and `ExprNode` (expressions).

### Core / shared
Span                          — { file: string; start: number; end: number; line: number; col: number }.
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

## B9 new AST kinds — `compiler/src/types/ast.ts` (S67)

### RelationalPredicateNode  [ast.ts:541]
Represents the `length(>=N)`-style relational sub-grammar inside validator arg position.
op: ">=" | "<=" | ">" | "<" | "=" | "!="
value: number
span: Span

### ValidatorArg (type alias)  [ast.ts:594]
`ExprNode | RelationalPredicateNode` — the parsed form of a single validator argument.
Produced by `compiler/src/validator-arg-parser.ts` (B9). Consumed by SYM PASS 7 (B10).

## Symbol Table types — `compiler/src/symbol-table.ts` (2,774 LOC)

New types exported by the SYM stage (A1b B1–B10):

### ImportBindingRecord  [symbol-table.ts]
localName: string
exportedName: string
sourcePath: string
pinned: boolean
declNode: ImportDeclNode

### ScopeKind  [symbol-table.ts]
"file" | "function" | "engine" | "component" | "compound"

### CellKind  [symbol-table.ts]
"plain" | "bindable" | "markup-typed" | "compound-parent"

### StateCellRecord  [symbol-table.ts]
name: string
qualifiedPath: string
declNode: ReactiveDeclNode
scope: Scope
pinned: boolean
(plus _cellKind: CellKind, _isBindable: boolean stamped as non-enumerable)

### Scope  [symbol-table.ts]
kind: ScopeKind
stateCells: Map<string, StateCellRecord>
importBindings: Map<string, ImportBindingRecord>
children: Scope[]
parent: Scope | null

### SYMResult  [symbol-table.ts]
errors: SYMDiagnostic[]
stats: SYMStats

### SYMStats  [symbol-table.ts]
totalRecords: number
totalScopes: number

## Validator Catalog types — `compiler/src/validator-catalog.ts` (289 LOC, B10)

### PredicateArgKind (union)  [validator-catalog.ts]
{ kind: "relational-predicate" }       — `length(>=2)` form; B9 produces RelationalPredicateNode.
{ kind: "numeric" }                    — numeric literal/expr for `min(n)`, `max(n)`.
{ kind: "regex" }                      — regex literal for `pattern(re)`.
{ kind: "comparable-with-cell" }       — cell-type-ordered expr for `gt`/`lt`/`gte`/`lte`.
{ kind: "any-equatable-with-cell" }    — cell-type-equatable for `eq`/`neq`.
{ kind: "array-of-cell-type" }         — array of cell type for `oneOf`/`notIn`.
{ kind: "inline-message-override" }    — optional trailing string literal (§55.10); always LAST arg.

### CellTypeRequirement (union)  [validator-catalog.ts]
"any" | "string-or-array" | "string" | "number" | "orderable" | "equatable"

### PredicateSignature  [validator-catalog.ts]
name: string                    — predicate name as in source.
arity: 0 | "0+inline" | 1 | "1+inline"
args: PredicateArgKind[] | null
cellTypeRequirement: CellTypeRequirement
errorTag: string                — ValidationError enum tag (§55.9) emitted on failure.
specRef: string                 — cross-reference to authoritative spec section.

### UNIVERSAL_CORE_PREDICATES  [validator-catalog.ts:139]
Readonly array of 14 PredicateSignature entries per SPEC §55.1:
`req`, `is some`, `length`, `pattern`, `min`, `max`, `gt`, `lt`, `gte`, `lte`, `eq`, `neq`, `oneOf`, `notIn`.
NOT in catalog: `email`/`url`/`numeric`/`integer` (stdlib `scrml:data` predicate-builders) + `custom` (§55.9 enum tag, not a predicate).

## Derived Mutation Ops — `compiler/src/derived-mutation-ops.ts` (84 LOC, B8)

### ARRAY_MUTATING_METHODS  [derived-mutation-ops.ts:33]
ReadonlySet<string> of 9 method names per SPEC §6.5.1 that mutate array values in place:
`push`, `pop`, `shift`, `unshift`, `splice`, `reverse`, `sort`, `fill`, `copyWithin`.
Used by SYM PASS 6 (B8) to fire `E-DERIVED-VALUE-MUTATE` for case-1 (method call on derived cell).

### COMPOUND_ASSIGNMENT_OPS  [derived-mutation-ops.ts:51]
ReadonlySet<string> of 14 compound-assignment operators per SPEC §6.6.18.
Plain `=` tested separately. All 15 total forms fire E-DERIVED-VALUE-MUTATE on derived receivers.

Functions: `isDerivedMutatingAssignOp(op): boolean`, `isArrayMutatingMethod(name): boolean`.

## Validator Arg Parser — `compiler/src/validator-arg-parser.ts` (268 LOC, B9)

Exports:
`parseValidatorArg(raw, span, filePath): ValidatorArg` — entry point; parses one validator arg string into either an ExprNode (via expression-parser) or a RelationalPredicateNode (for `>=N`/`<=N`/`<N`/`>N`/`=N`/`!=N`).
`forEachIdentInValidatorArg(arg, cb): void` — walks idents in a single ValidatorArg.
`forEachIdentInValidators(validators, cb): void` — walks idents across all validators on a cell.
`decorateValidatorsWithExprNodes(validators, filePath): void` — side-effectful; populates `exprNode` fields on ValidatorEntry nodes.

## Expression Parser types — `compiler/src/expression-parser.ts`

### ESNode  [expression-parser.ts:36]
type: string
[key: string]: unknown

### ParseResult  [expression-parser.ts:42]
ast: ESNode | null
error: string | null
trailingContent?: string
sqlDiagnostic?: { code: string; message: string; offset: number }

### RewriteResult  [expression-parser.ts:55]
result: string
ok: boolean

S66 bare-dot fix: `.Variant` as a primary expression in any operator context is now parseable via
preprocessor substitution (`__scrml_bare_variant_Variant__` placeholder, unmasked post-parse).
[expression-parser.ts:729–747]

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
#scrmlTS #map #schema #ast #expression-parser #node-kinds #s65 #s66 #s67 #reactive-decl-rename #parseVariant #symbol-table #b4 #b6 #b7 #b8 #b9 #b10 #bare-dot-fix #validator-catalog #derived-mutation-ops #relational-predicate

## Links
- [primary.map.md](./primary.map.md)
- [domain.map.md](./domain.map.md)
- [error.map.md](./error.map.md)
- [SPEC.md](../../compiler/SPEC.md)
- [PIPELINE.md](../../compiler/PIPELINE.md)
- [master-list.md](../../master-list.md)
