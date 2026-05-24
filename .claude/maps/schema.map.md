# schema.map.md
# project: scrmlts
# updated: 2026-05-24T00:00:00Z  commit: 3a909c1d

Authoritative AST type catalog: `compiler/src/types/ast.ts`. The M5 native-parser swap
must produce output coercible to `FileAST` / `TABOutput`. As of C1/C2 (S119),
`nativeParseFile` (compiler/native-parser/parse-file.js) IS that coercion and is routed
at the TAB seam behind `--parser=scrml-native`.

## Pipeline I/O Types

### TABOutput  [compiler/src/types/ast.ts:1520]
```
filePath: string
ast: FileAST
errors: TABErrorInfo[]
```

### FileAST  [compiler/src/types/ast.ts:1487] — top-level output of TAB stage
```
filePath: string
nodes: ASTNode[]                — top-level AST nodes
imports: ImportDeclNode[]
exports: ExportDeclNode[]
components: ComponentDefNode[]
typeDecls: TypeDeclNode[]
channelDecls?: ChannelDeclNode[]
spans: Record<number, Span>     — nodeId → Span table
hasProgramRoot: boolean
authConfig: AuthConfig | null   — populated by PRECG stage
middlewareConfig: MiddlewareConfig | null
hasResetExpr / hasEqualityExpr / hasChunkedMarkupTag / hasForStmt: boolean  — PGO flags
```

### AuthConfig  [ast.ts:1432]
`auth / loginRedirect / csrf / sessionExpiry: string`

### MiddlewareConfig  [ast.ts:1444]
`cors / log / ratelimit / headers / idempotencyStore / idempotencyTTL / batchInListCap / corsMaxAge / channelReconnect: string | null`

## Core AST Unions

### ASTNode  [ast.ts:1407] — top-level / markup-child node union
`markup | text | comment | state | state-constructor-def | logic | sql | css-inline | style | error-effect | meta | match-block | LogicStatement`

### LogicStatement  [ast.ts:1358] — ~40-kind sub-union inside logic bodies
`let-decl | const-decl | tilde-decl | lin-decl | reactive-decl | reactive-debounced-decl | reactive-nested-assign | reactive-array-mutation | reactive-explicit-set | reactive-assign (V-kill, S123) | function-decl | component-def | if-stmt | if-expr | for-expr | match-expr | for-stmt | while-stmt | return-stmt | throw-stmt | switch-stmt | try-stmt | match-stmt | match-arm-inline | bare-expr | lift-expr | fail-expr | propagate-expr | guarded-expr | import-decl | use-decl | export-decl | type-decl | transaction-block | cleanup-registration | when-effect | when-message | upload-call + block-ref nodes`

## Node Interfaces (selected)

### Span  [ast.ts:21]
`start / end / line / col: number; file?: string`

### AttrValue  [ast.ts:42] — 6-variant union
`StringLiteralAttrValue | VariableRefAttrValue | CallRefAttrValue | ExprAttrValue | PropsBlockAttrValue | AbsentAttrValue`

### ReactiveAssignNode  [ast.ts:764] — S123 V-kill
```
kind: "reactive-assign"
target: string        — reactive variable name (without @)
value: string         — raw value expression text
valueExpr?: ExprNode  — structured ExprNode form
```
Replaces pre-S123 phantom state-decl synthesis for bare `@name = expr` inside fn/function/user `${...}`. SYM PASS 3 fires E-STATE-UNDECLARED when no structural `<name>` decl is in scope.

### Declaration nodes
`LetDeclNode [447] | ConstDeclNode [462] | TildeDeclNode [480] | LinDeclNode [492] | ReactiveDeclNode [503] | FunctionDeclNode [791] | ComponentDefNode [856] | EngineDeclNode [878] | TypeDeclNode [1235] | ImportDeclNode [1184] | ExportDeclNode [1216] | UseDeclNode [1202] | ChannelDeclNode [1263]`

### FunctionDeclNode  [ast.ts:791] — relevant to MCP serverfns extraction
`params: string[]` [ast.ts:821] (entries may carry `:`-typed annotations in source form); `isServer: boolean` [ast.ts:827] — canonical server-boundary marker the MCP serverfns extractor reads; `returnTypeAnnotation` (canonical, type-system.ts:3869) / `returnType` (forward-compat) read for return type.

### MatchBlockNode (synthesized by parse-file.js — S121 P5-7)
`{ kind: "match-block", forType, onExprRaw, armsRaw, bodyChildren, span }`

## ExprNode union  [ast.ts:1939] — 20 lowercase kinds

`IdentExpr | LitExpr | ArrayExpr | ObjectExpr | SpreadExpr | UnaryExpr | BinaryExpr | AssignExpr | TernaryExpr | MemberExpr | IndexExpr | CallExpr | NewExpr | LambdaExpr | CastExpr | MatchExpr | SqlRefExpr | InputStateRefExpr | EscapeHatchExpr | ResetExpr`

### BinaryExpr precedence printer  [codegen/emit-expr.ts — Bug W, S127]
`emitBinary` (emit-expr.ts:688) now re-inserts the grouping parens Acorn dropped (Acorn keeps the tree's nesting but drops `ParenthesizedExpression` nodes, so the flat `default` branch previously printed `2 + 3 * 4` for the correctly-nested `(2 + 3) * 4` — a SILENT arithmetic-correctness bug, no diagnostic). Supporting tables:
- `BINARY_PRECEDENCE` [emit-expr.ts:590] — `Record<BinaryExpr["op"], number>`; `**`=14 … `||`/`??`=4; self-bracketed `is`/`is-*`=3 (never used as a flat PARENT op).
- `RIGHT_ASSOCIATIVE` [emit-expr.ts:612] — `Set(["**"])` (only right-assoc JS binary op).
- `binaryOpEmitsFlat(op)` [emit-expr.ts:622] — false for `==`/`!=`/`is`/`is-not`/`is-some`/`is-not-not` (those emit their own outer parens / IIFE, so never need a precedence wrap).
- `binaryOperandNeedsParens(child, parentOp, isRightChild)` [emit-expr.ts:649] — wrap when `prec(child) < prec(parent)`, or equal-precedence wrong-side, or the ES2020 `??`-mixed-with-`||`/`&&` SyntaxError class.

## MCP Descriptor Shapes  [compiler/src/codegen/mcp-descriptors.ts]

App-wide arrays emitted as JSON sidecars (`engines.json` / `forms.json` / `channels.json` / `serverfns.json`). Shapes ARE the A↔B contract `scrml:mcp` runtime helpers (`compiler/runtime/stdlib/mcp.js`) consume. Authority: SCOPING §3 Sub-unit A. **A↔B contract fix (S127, commit 55325b10): the four compound-rollup keys are NOW nested under `FormDescriptor.compoundKeys` (was flat on the descriptor root — flattening left B unable to decode `submitted`), and `EngineDescriptor` NOW emits `cellKey` explicitly.** v0 ENCODING CAVEAT: the per-file §47 encoding context is built inside CG and not threaded to this post-CG extractor, so `cellKey` and the form keys are emitted as the raw (encoding-off) name; `cellKey === name` in default compile mode. Production-encoding pass-through is a documented follow-on.

### McpDescriptors  [mcp-descriptors.ts:905]
`{ engines: EngineDescriptor[]; forms: FormDescriptor[]; channels: ChannelDescriptor[]; serverFns: ServerFnDescriptor[] }`  (assembled by `buildMcpDescriptors` [mcp-descriptors.ts:915])

### EngineDescriptor  [mcp-descriptors.ts:59] → engines.json
```
name: string                     — auto-declared var name (no @) or var= override
cellKey: string                  — runtime-state key for the current-variant cell; read via
                                   _scrml_reactive_get(cellKey). encodeKey-identity in default mode (===name).
                                   (NEW S127 — read at mcp.js:249 as descriptor.cellKey || descriptor.name)
type: string                     — governing enum type (for=Type)
variants: EngineVariantDescriptor[]
rules: Record<string, string[]>  — FROM-tag → legal-to set; single→[X], multi→[A,B], wildcard→["*"], absent/terminal/malformed→[]
kind: "primary" | "derived"      — derived = §51.0.J derived=expr engine
```

### EngineVariantDescriptor  [mcp-descriptors.ts:52]
`{ tag: string; fields: EngineVariantFieldDescriptor[] }`  (fields=[] for unit variants)

### EngineVariantFieldDescriptor  [mcp-descriptors.ts:42]
`{ name: string; type: string }`  (type = raw source-text annotation; normalized-type resolution deferred)

### FormDescriptor  [mcp-descriptors.ts:134] → forms.json
```
formName: string
compoundKeys: FormCompoundKeys   — NEW S127: the 4 rollup keys NESTED (was flat). Read by
                                   getFormStatus → descriptor.compoundKeys.{...} (mcp.js:311-323).
fields: FormFieldDescriptor[]
```

### FormCompoundKeys  [mcp-descriptors.ts:123] — NEW S127
`{ isValidKey; errorsKey; touchedKey; submittedKey: string }`  — resolved `<formName>.{isValid|errors|touched|submitted}` compound rollups. `submittedKey` is compound-ONLY (§55.7 — no per-field `submitted` surface); this is why flattening broke B.

### FormFieldDescriptor  [mcp-descriptors.ts:98]
`{ name; qualifiedName; errorsKey; isValidKey; touchedKey: string }`  (resolved per-field §55.6/§55.9 keys; v0 = raw qualified names, encoding passthrough)

### ChannelDescriptor  [mcp-descriptors.ts:154] → channels.json
`{ name: string; topic: string; autoSyncedCells: ChannelAutoSyncedCell[] }`  (name defaults "channel"; topic defaults to name per §38.3)

### ChannelAutoSyncedCell  [mcp-descriptors.ts:147]
`{ name: string; key: string }`  (§38.4 V5-strict state-decl cells)

### ServerFnDescriptor  [mcp-descriptors.ts:174] → serverfns.json
```
name: string
params: ServerFnParamDescriptor[]
returnType: string               — raw annotation or "unknown"
file: string                     — absolute decl path (same-name disambiguation)
dispatchable: false              — PERMANENT v0 marker (read-only enumeration, PA Q2)
```

### ServerFnParamDescriptor  [mcp-descriptors.ts:164]
`{ name: string; type: string }`  (type = raw annotation or "unknown")

## Codegen I/O Types  [compiler/src/codegen/]

### FileIR  [codegen/ir.ts:43]
```
filePath: string; html: HtmlIR; css: CssIR; server: ServerIR; client: ClientIR
```

### CompileContext  [codegen/context.ts:24]
```
filePath / fileAST / routeMap / depGraph / protectedFields / authMiddleware /
middlewareConfig / csrfEnabled / encodingCtx / mode / testMode / dbVar /
workerNames / errors / registry / derivedNames / analysis / runtimeChunks: ...
```

### RewriteContext  [codegen/rewrite.ts:50]
```
errors?: any[]; derivedNames?: Set<string>; dbVar?: string; skipPresenceGuard?: boolean
```

### RuntimeChunkName  [codegen/runtime-chunks.ts]
Union of named runtime chunk keys ('core' | 'scope' | 'timers' | 'animation' | 'prefetch' | ...).
`CHUNK_DEPENDENCIES: { scope: ['timers', 'animation'] }` — 6nz Bug P (S123).
`applyChunkDependencies(chunks)` — fixed-point closure; called after detectRuntimeChunks.

## Code-Segment Fence  [codegen/code-segments.ts — NEW S125, leaf module, no project imports]

Shared regex-literal / comment / string-aware splitter for every scrml keyword-lowering text pass. Extracted so BOTH `rewrite.ts::rewriteNotKeyword` AND `expression-parser.ts::preprocessForAcorn` share one fence (the residual GITI-017 half — preprocessForAcorn had its own unfenced `not`-lowering). Leaf placement avoids the rewrite.ts ↔ expression-parser.ts import cycle.
- `rewriteCodeSegments(expr, transform)` [code-segments.ts:67] — applies `transform` ONLY to code regions; string / regex / line-comment / block-comment interiors pass through verbatim. Re-exported from rewrite.ts.
- `regexAllowedAfter(codeBefore)` [code-segments.ts:34] — regex-vs-division disambiguation via `REGEX_PERMISSIVE_KEYWORDS` set + trailing-punctuation check.

## Symbol Table Types  [compiler/src/symbol-table.ts]

### ScopeKind
`"file" | "function" | "engine" | "component" | "compound" | "field"`

### CellKind
`"plain" | "bindable" | "markup-typed" | "compound-parent" | "engine"`

### EngineStateChildEntry  [symbol-table.ts:549]
```
tag: string; rule: EngineRuleForm; bodyRaw: string
isColonShorthand: boolean; rawOffset: number; historyAttr: boolean
internalRule: EngineRuleForm; onTimeoutElements: OnTimeoutEntry[]
innerEngines: NestedEngineEntry[]; effectRaw: string | null
onTransitionElements: OnTransitionEntry[]; payloadBindings: PayloadBinding[]
onIdleElements: OnIdleEntry[]  — exported by symbol-table.ts; consumed by native-walker
```
Produced by `engine-statechild-walker.ts` (M6.6.b.2 primary path) or `engine-statechild-parser.ts` (legacy fallback for synthetic ASTs). `EngineRuleForm` kinds (`absent`/`single`/`multi`/`wildcard`/`legacy-arrow`/`parse-error`) are read by `mcp-descriptors.ts:buildRulesMap` to derive the engine `rules` map.

### SYMInput  [symbol-table.ts:855]
`{ filePath, ast: FileAST, exportRegistry? }`

### SYMResult  [symbol-table.ts:822]
`{ filePath, errors: SYMDiagnostic[], fileScope: Scope, stats: SYMStats }`

### Scope  [symbol-table.ts:792]
`{ kind: ScopeKind; parent: Scope | null; file: string; stateCells: Map<string,StateCellRecord>; importBindings: Map<string,ImportBindingRecord>; children: Scope[] }`

## Native-parser AST Catalogs

### Token  [compiler/native-parser/token.js]
`TokenKind` — Object.freeze enum; `CONTEXTUAL_KEYWORDS` = `{ "type": "type" }`.

### Stmt catalog  [ast-stmt.js] — frozen StmtKind variants
Block, ExprStmt, Empty, VarDecl, If, While, DoWhile, For, ForIn, ForOf, Return, Break, Continue, Labeled, FunctionDecl, ClassDecl, Import, Export, Try, Throw, LinDecl, TypeDecl, TildeDecl, **StateDecl** (M6.5.b.2, S125 — `StmtKind.StateDecl = "StateDecl"`; V5-strict structural reactive decl).

#### Native StateDecl node shape  [parse-stmt.js:3223 `parseStructuralStateDecl`]
```
kind: "StateDecl"
name: string
typeAnnotation: string | null
structuralForm: true
isConst: boolean
shape: "derived" (const) | "plain"
defaultExprRaw: string | null    — from default= attr
pinned: boolean                  — §6.10 bareword modifier
server: boolean                  — §52 bareword modifier
debouncedRaw / throttledRaw: string | null   — §6.13
validators: [...]                — bareword (args:null) + call-form (name+args)
init: <expr>                     — RHS of `= expr`
span
```
Bridged to live `state-decl` by `translate-stmt.js:785 makeStateDeclNode` (StmtKind.StateDecl arm at translate-stmt.js:326). `server` → live `isServer`. PARTIAL: 6 of 8 productions (Shape 2 not yet emitted from `parseStructuralStateDecl`).

### Expr catalog  [ast-expr.js] — 40 frozen ExprKind variants
Ident, NumberLit, StringLit, BoolLit, RegexLit, TemplateLit, AtCell, BareVariant, This, Super, Array, Object, Paren, Unary, Update, Binary, Logical, Assignment, Conditional, Sequence, Call, New, Member, TaggedTemplate, Arrow, Function, RestElement, AssignmentPattern, BlockStub; scrml-extension: NotValue, Tilde, Sql, InputStateRef, IsCheck, Match (+MatchArm/VariantPattern/WildcardPattern/IsPattern/MatchBinding), Render, Lift, Fail, Propagate, GuardedExpr, Yield, MarkupValue.

Match-arm parsing (M6.5.b.1, S125): `parseMatchExpr` (parse-expr.js:2547) accepts `,` / `;` / **newline** as inter-arm separators (newline is the canonical corpus form); `parseMatchArmPattern` (parse-expr.js:2888) handles Dot+UpperIdent variant patterns (`.Done`).

### Block catalog  [parse-markup.js]
BlockKinds: Markup, Text, Comment, Sql, Css, Meta, ErrorEffect, LogicEscape, DisplayTextLiteral, Test (`_{}`), ForeignCode (`^^{}`).

## Database Models
No application DB schema — scrml is a compiler. SQLite *.db files are throwaway test fixtures.

## Tags
#scrmlts #map #schema #ast #fileast #native-parser #codegen #m5-swap #bridge #match-block #v-kill #reactive-assign #symbol-table #runtime-chunks #engine-statechild-walker #m6-6-b2 #m6-5-b2 #mcp-v0 #mcp-descriptors #emit-binary #code-segments #s127

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [domain.map.md](./domain.map.md)
