# schema.map.md
# project: scrmlts
# updated: 2026-05-28T00:00:00Z  commit: 1fed5588

Authoritative AST type source: `compiler/src/types/ast.ts` (~1970 lines).
IR type source: `compiler/src/codegen/ir.ts`.
Reachability types: `compiler/src/types/reachability.ts`.
Auth-graph types: `compiler/src/types/auth-graph.ts`.

## TypeScript Types and Interfaces

### Span  [compiler/src/types/ast.ts:21]
`file: string` — absolute source path
`start: number`, `end: number` — byte offsets
`line: number`, `col: number` — 1-based

### AttrValue  [compiler/src/types/ast.ts:42]
Discriminated union: `StringLiteralAttrValue | VariableRefAttrValue | CallRefAttrValue | ExprAttrValue | PropsBlockAttrValue | AbsentAttrValue`

### AttrNode  [compiler/src/types/ast.ts:97]
`name: string`, `value: AttrValue`, `span: Span`

### Core AST Node kinds (via ASTNode union)  [compiler/src/types/ast.ts:1433]
`MarkupNode` — HTML/component element; `kind: "markup"`; `tag`, `attrs`, `children`, `renderSpec`
`TextNode` — plain text; `kind: "text"` (survives post-SPEC §4.18.8 — scope-b quoted-text model)
`StateNode` — reactive cell decl; `kind: "state-decl"`; `name`, `type`, `defaultExpr`, `renderSpec`
`LogicNode` — `${}` logic context; `kind: "logic"`; `statements`
`SQLNode` — `?{}` SQL context; `kind: "sql"`; `chains`
`CSSInlineNode` — `#{}` CSS inline; `kind: "css-inline"`
`MetaNode` — `^{}` meta context; `kind: "meta"`
`EngineDeclNode` — `<engine>` state machine; `kind: "engine-decl"`
`LetDeclNode`, `ConstDeclNode`, `TildeDeclNode`, `LinDeclNode` — declaration nodes
`ReactiveDeclNode` — V5-strict `<x> = RHS` cell decl; `kind: "reactive-decl"`
`ReactiveAssignNode`, `ReactiveNestedAssignNode`, `ReactiveArrayMutationNode`, `ReactiveExplicitSetNode` — reactive write nodes
`FunctionDeclNode` — `fn`/`function`; `kind: "function-decl"`
`ComponentDefNode` — component definition
`ImportDeclNode`, `UseDeclNode`, `ExportDeclNode`, `TypeDeclNode` — module-system nodes
`ChannelDeclNode` — WebSocket channel declaration
`BareExprNode`, `HtmlFragmentNode`, `LiftExprNode`, `FailExprNode`, `PropagateExprNode`, `GuardedExprNode` — expression statement nodes
`MatchArmInlineNode` — `<match>` arm
`WhenEffectNode`, `WhenMessageNode` — channel/effect nodes

### ExprNode  [compiler/src/types/ast.ts:1963]
Discriminated union (20+ kinds): `IdentExpr | LitExpr | ArrayExpr | ObjectExpr | SpreadExpr | UnaryExpr | BinaryExpr | AssignExpr | TernaryExpr | MemberExpr | IndexExpr | CallExpr | NewExpr | LambdaExpr | CastExpr | MatchExpr | SqlRefExpr | InputStateRefExpr | EscapeHatchExpr | ResetExpr | ...`

### FileAST  [compiler/src/types/ast.ts:1513]
`filePath: string`
`children: ASTNode[]`
`imports: ImportDeclNode[]`
`exports: ExportDeclNode[]`
`authConfig?: AuthConfig`
`middlewareConfig?: MiddlewareConfig`

### TABOutput  [compiler/src/types/ast.ts:1544]
`filePath: string`, `ast: FileAST`, `errors: TABErrorInfo[]`

### FileIR  [compiler/src/codegen/ir.ts:43]
`filePath: string`
`html: HtmlIR` — `parts: string[]`
`css: CssIR` — `userCss: string`, `tailwindCss: string`
`server: ServerIR` — `lines: string[]`
`client: ClientIR` — `lines: string[]`

### TestIR  [compiler/src/codegen/ir.ts:244]
`filePath: string`
`groups: TestGroup[]`
`testBindDecls: TestBindDecl[]`
... 15+ fields (read ir.ts for full shape)

### CGError  [compiler/src/codegen/errors.ts:11]
`code: string`, `message: string`, `span: CGSpan | object`
`severity: 'error' | 'warning' | 'info'`

### compileScrml() return shape  [compiler/src/api.js:2208]
`errors: CGError[]` — fatal (E-* prefix OR severity:"error")
`warnings: CGError[]` — non-fatal (W-* / I-* prefix OR severity:"warning"/"info") — diagnostic-stream partition per S93
`lintDiagnostics: any[]` — ghost-pattern + Tailwind lints; never fatal
`fileCount: number`
`outputDir: string`
`durationMs: number`
`outputs: Map<string, string>` — compiled output files
`runtimeFilename?: string`
`gatheredFiles: string[]`
`batchPlan`, `batchPlanJson()`, `reachabilityRecord`, `reachabilityRecordJson()`, `authGraph`, `chunksManifest`

## Tags
#scrmlts #map #schema #ast #types #compiler #pipeline

## Links
- [primary.map.md](./primary.map.md)
- [domain.map.md](./domain.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
