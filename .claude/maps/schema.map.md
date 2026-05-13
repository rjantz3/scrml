# schema.map.md
# project: scrmlts
# updated: 2026-05-12T21:42:04Z  commit: f1555b4

## TypeScript AST — `compiler/src/types/ast.ts` (1,828 LOC)

Single source of truth for all AST node shapes. All nodes carry `id: number` and `span: Span`.

### Span  [ast.ts:19]
file: string, start: number, end: number, line: number, col: number

### AttrValue (union)  [ast.ts:40]
StringLiteralAttrValue | VariableRefAttrValue | CallRefAttrValue | ExprAttrValue | PropsBlockAttrValue | AbsentAttrValue

### AttrNode  [ast.ts:95]
name: string, value: AttrValue, span: Span

### TypedAttrDecl  [ast.ts:106]
name: string, typeExpr: string, optional: boolean, defaultValue: string | null, span: Span

### CSS Types  [ast.ts:120-156]
CSSReactiveRef: { name: string, expr: string | null }
CSSDeclaration: { prop, value, span, reactiveRefs?, isExpression? }
CSSRule = CSSPropertyRule | CSSSelectorRule

### ErrorArm  [ast.ts:163]
pattern: string, binding: string, handler: string, handlerExpr?: ExprNode, span: Span

### SQLChainedCall  [ast.ts:180]
method: string, args: string

### LiftTarget (union)  [ast.ts:193]
{ kind: "markup", node: ASTNode } | { kind: "expr", expr: string, exprNode?: ExprNode }

### MarkupNode  [ast.ts:212]
kind: "markup", tag: string, attrs: AttrNode[], children: ASTNode[], selfClosing: boolean,
closerForm: string, isComponent: boolean,
resolvedKind?: 'html-builtin'|'scrml-lifecycle'|'user-state-type'|'user-component'|'unknown',
resolvedCategory?: 'html'|'channel'|'engine'|'timer'|'poll'|'db'|'schema'|'request'|'errorBoundary'|'machine'|'user-component'|'user-state-type'|'unknown',
auth?: string, loginRedirect?: string, csrf?: string, sessionExpiry?: string

### ChannelDeclNode (extends MarkupNode)  [ast.ts:1152]
tag: "channel"  (always)
isExport?: boolean               — true when declared as `export <channel name="X">`
_p3aInlinedFrom?: string         — source file path when CHX inlined this from another file
_p3aSourceSpan?: Span            — original declaration span when inlined

**NEW S87 Insight 30:** ChannelDeclNode is now the canonical structural alias for channel markup nodes.
Channel decls remain `kind: "markup"` (no new discriminant); this interface documents P3.A annotations.

### TextNode  [ast.ts:247]
kind: "text", value: string

### CommentNode  [ast.ts:254]
kind: "comment", value: string

### StateNode  [ast.ts:263]
kind: "state", stateType: string, attrs: AttrNode[], children: ASTNode[]

### StateConstructorDefNode  [ast.ts:277]
kind: "state-constructor-def", stateType: string, typedAttrs: TypedAttrDecl[], attrs: AttrNode[], children: ASTNode[]

### LogicNode  [ast.ts:292]
kind: "logic", body: LogicStatement[], imports: ImportDeclNode[], exports: ExportDeclNode[], typeDecls: TypeDeclNode[], components: ComponentDefNode[]

### SQLNode  [ast.ts:309]
kind: "sql", query: string, chainedCalls: SQLChainedCall[], nobatch?: boolean

### CSSInlineNode  [ast.ts:328]
kind: "css-inline", rules: CSSRule[]

### StyleNode  [ast.ts:337]
kind: "style", rules: CSSRule[], children: ASTNode[]

### ErrorEffectNode  [ast.ts:348]
kind: "error-effect", arms: ErrorArm[]

### MetaNode  [ast.ts:357]
kind: "meta", body: LogicStatement[], parentContext: string

### LetDeclNode  [ast.ts:368]
kind: "let-decl", name: string, ifExpr?, forExpr?, matchExpr?, initExpr?: ExprNode

### ConstDeclNode  [ast.ts:383]
kind: "const-decl", name: string, ifExpr?, forExpr?, matchExpr?, initExpr?: ExprNode

### TildeDeclNode  [ast.ts:401]
kind: "tilde-decl", name: string, initExpr?: ExprNode

### LinDeclNode  [ast.ts:413]
kind: "lin-decl", name: string, initExpr?: ExprNode

### ReactiveDeclNode  [ast.ts:424]
kind: "state-decl", name: string,
shape?: "plain"|"decl-with-spec"|"derived", structuralForm?: boolean, isConst?: boolean,
renderSpec?: RenderSpecNode | null, validators?: ValidatorEntry[], defaultExpr?: ExprNode | null,
pinned?: boolean, children?: ReactiveDeclNode[], typeAnnotation?: string, isShared?: boolean

### ValidatorEntry  [ast.ts:574]
name: string, args: ValidatorArg[] | null, span: Span, inlineOverride?: string | null

### ValidatorArg (union)  [ast.ts:614]
ExprNode | RelationalPredicateNode

### RelationalPredicateNode  [ast.ts:541]
kind: "relational-predicate", op: ">=" | "<=" | "<" | ">" | "=" | "!=", value: ExprNode, span: ExprSpan

### RenderSpecNode  [ast.ts:625]
kind: "render-spec", element: MarkupNode

### ReactiveDeclNode (derived/debounced/nested)  [ast.ts:639-682]
ReactiveDebouncedDeclNode: kind "reactive-debounced-decl", name, delay: number, initExpr?
ReactiveNestedAssignNode: kind "reactive-nested-assign", target, path: string[], valueExpr?
ReactiveArrayMutationNode: kind "reactive-array-mutation", target, method, args: string
ReactiveExplicitSetNode: kind "reactive-explicit-set", args: string

### FunctionDeclNode  [ast.ts:687]
kind: "function-decl", name, params: string[], body: LogicStatement[], fnKind: "function"|"fn",
isServer, canFail, errorType?, route?, method?, isHandleEscapeHatch?

### EngineDeclNode  [ast.ts:745]
kind: "engine-decl"; ... (engine declaration with state-child body; see file for full shape)

### Control Flow  [ast.ts:806+]
IfStmtNode, IfExprNode, ForExprNode, MatchExprNode — standard control flow shapes

### WhenEffectNode  [ast.ts:1165]
kind: "when-effect"; reactive side-effect trigger

### ASTNode (discriminated union)  [ast.ts:1283]
... 30+ node kinds — see `export type ASTNode` for full list

### LogicStatement (union)  [ast.ts:1232]
All statement kinds usable inside logic/meta blocks

### FileAST  [ast.ts:1341]
filePath: string, nodes: ASTNode[], ... additional pipeline-stamped fields
channelDecls?: ChannelDeclNode[]  — **NEW S87** hoisted channel decl nodes for CHX lookup

### TABOutput  [ast.ts:1374]
filePath, ast: FileAST, errors: TABErrorInfo[]

### AuthConfig / MiddlewareConfig  [ast.ts:1347+]
Auth and middleware configuration shapes stamped on program-tag MarkupNodes.

**AuthConfig.csrf** (S80 narrowing): value-set narrowed to `"auto" | "off"` per §52.13. Invalid literals fire W-ATTR-002. The legacy `csrf="on"` was retired at S80.

**MiddlewareConfig fields** (current shape, ast.ts:1347):
- `cors: string | null` — CORS origin pattern (e.g. "*")
- `log: string | null` — Logging mode (e.g. "structured")
- `ratelimit: string | null` — Rate-limit pattern (e.g. "100/min")
- `headers: string | null` — Security headers mode (e.g. "strict")
- `idempotencyStore?: string | null` — A9 Ext 5 (§39.2.6) backend selector
- `idempotencyTTL?: string | null` — S79 audit fix C.1 (§19.9.6)
- `batchInListCap?: string | null` — S79 audit fix C.2 (§8.10.6)
- `corsMaxAge?: string | null` — S81 audit fix F.1 (§39.2.1 ext)
- `channelReconnect?: string | null` — S81 audit fix F.2 (§38.3.1)

All adopter-override fields are raw strings on the AST; parsed at codegen time by per-field helpers. Silent fallback to default on null/malformed values.

## ExprNode Types — `compiler/src/types/ast.ts` (ExprSpan section, ~1,407+)

ExprSpan: { start, end, line?, col? }
ExprNode (union): IdentExpr | LitExpr | ArrayExpr | ObjectExpr | SpreadExpr | UnaryExpr |
  BinaryExpr | AssignExpr | TernaryExpr | MemberExpr | IndexExpr | CallExpr | NewExpr |
  LambdaExpr | CastExpr | MatchExpr | SqlRefExpr | InputStateRefExpr | EscapeHatchExpr | ResetExpr

## Codegen IR — `compiler/src/codegen/ir.ts`

### HtmlIR  [ir.ts:22]
parts: string[]

### CssIR  [ir.ts:27]
userCss: string, tailwindCss: string

### ServerIR  [ir.ts:33]
lines: string[]

### ClientIR  [ir.ts:38]
lines: string[]

### FileIR  [ir.ts:43]
filePath: string, html: HtmlIR, css: CssIR, server: ServerIR, client: ClientIR

## Codegen Key Interfaces — `compiler/src/codegen/*.ts`

### CompileContext  [context.ts:23]
filePath, fileAST, routeMap, depGraph, protectedFields: Set<string>, authMiddleware, middlewareConfig,
csrfEnabled: boolean, encodingCtx: EncodingContext | null, mode: "browser"|"library", testMode: boolean,
dbVar: string, workerNames: string[], errors: CGError[], registry: BindingRegistry,
derivedNames: Set<string>, analysis: FileAnalysis | null, usedRuntimeChunks: Set<string>,
exportRegistry?: Map<string, Map<string, { kind, category, isComponent }>> | null

### BindingRegistry  [binding-registry.ts:53+]
EventBinding: { placeholderId, eventName, handlerName, handlerArgs, handlerExpr?, engineArm? }
LogicBinding: { placeholderId?, expr?, reactiveRefs?, isConditionalDisplay?, varName?, condExpr?, refs?, kind?, chainId?, ... }

### CGError  [errors.ts:11]
code: string, message: string, span: CGSpan | object, severity: 'error' | 'warning'

### VariantArm  [emit-variant-guard.ts:106]
tag: string, payloadBindings: string[], body: any[]

### VariantGuardOutput  [emit-variant-guard.ts:135]
mountElementHtml: string, renderFunctionsJs: string, dispatcherJs: string

### VariantGuardOptions  [emit-variant-guard.ts:163]
idPrefix: string, mountAttr?: string, renderFnPrefix?: string, variantSubscribeName?: string | null

### FileAnalysis  [analyze.ts:55]
filePath, nodes, fnNodes, markupNodes, topLevelLogic, ... (pre-computed AST analysis slices for CG)

## DB Scope Collection — `compiler/src/codegen/emit-server.ts` (NEW S87 Bug 3a)

`collectDbScopes(ast)` returns `Map<dbVar, { connectionString, driver }>`. Both `<db src=>` block form
and `<program db=>` attribute form produce entries. The emitter scans server output for `_scrml_sql`
and `_scrml_sql_<n>` tokens and emits `import { SQL } from "bun"; const _scrml_sql = new SQL(...)` declarations at top of file. Closes latent `ReferenceError: _scrml_sql is not defined`.

## Tags
#scrmlts #map #schema #ast #types #codegen #ir #s87 #channel-decl-node #bug-3a

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [domain.map.md](./domain.map.md)
