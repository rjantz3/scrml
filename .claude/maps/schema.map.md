# schema.map.md
# project: scrmlts
# updated: 2026-05-21T15:00:00Z  commit: 67a17dc5

Authoritative AST type catalog: `compiler/src/types/ast.ts`. This is the contract
the M5 native-parser swap must satisfy — native-parser output must be coercible to
`FileAST` / `TABOutput` for the api.js BS+TAB seam.

## Pipeline I/O Types

### TABOutput  [compiler/src/types/ast.ts:1520]
filePath: string
ast: FileAST
errors: TABErrorInfo[]

### FileAST  [compiler/src/types/ast.ts:1487] — top-level output of TAB stage
filePath: string
nodes: ASTNode[]                — top-level AST nodes
imports: ImportDeclNode[]       — hoisted from logic blocks
exports: ExportDeclNode[]       — hoisted from logic blocks
components: ComponentDefNode[]  — hoisted component definitions
typeDecls: TypeDeclNode[]       — hoisted type declarations
channelDecls?: ChannelDeclNode[] — hoisted `<channel>` markup decls
spans: Record<number, Span>     — nodeId → Span table
hasProgramRoot: boolean
authConfig: AuthConfig | null   — (populated by PRECG stage, computeProgramConfig)
middlewareConfig: MiddlewareConfig | null — (populated by PRECG stage)
hasResetExpr / hasEqualityExpr / hasChunkedMarkupTag / hasForStmt: boolean
  — 4 PGO flags; set by api.js Stage 3.004 (computePGOFlags), NOT by ast.ts shape.

### AuthConfig  [ast.ts:1432]
auth: string | loginRedirect: string | csrf: string | sessionExpiry: string

### MiddlewareConfig  [ast.ts:1444]
cors / log / ratelimit / headers: string|null
idempotencyStore / idempotencyTTL / batchInListCap / corsMaxAge / channelReconnect: string|null

## Core AST Unions

### ASTNode  [ast.ts:1407] — top-level / markup-child node union
markup | text | comment | state | state-constructor-def | logic | sql |
css-inline | style | error-effect | meta | LogicStatement

### LogicStatement  [ast.ts:1358] — ~40-kind sub-union inside logic bodies
let-decl | const-decl | tilde-decl | lin-decl | reactive-decl | reactive-debounced-decl |
reactive-nested-assign | reactive-array-mutation | reactive-explicit-set |
function-decl | component-def | if-stmt | if-expr | for-expr | match-expr | for-stmt |
while-stmt | return-stmt | throw-stmt | switch-stmt | try-stmt | match-stmt |
match-arm-inline | bare-expr | lift-expr | fail-expr | propagate-expr | guarded-expr |
import-decl | use-decl | export-decl | type-decl | transaction-block |
cleanup-registration | when-effect | when-message | upload-call |
+ block-ref nodes: markup | sql | css-inline | meta | error-effect

## Node Interfaces (selected — see ast.ts for full field lists)

### Span  [ast.ts:21]
start / end / line / col: number; file?: string

### MarkupNode  [ast.ts:214] extends BaseNode
tag, attrs: AttrNode[], tokenizedAttrs, children, tagOpenerSpan, tagCloserSpan, …

### AttrValue  [ast.ts:42] — 6-variant union
StringLiteralAttrValue | VariableRefAttrValue | CallRefAttrValue |
ExprAttrValue | PropsBlockAttrValue | AbsentAttrValue

### Declaration nodes
LetDeclNode [447] | ConstDeclNode [462] | TildeDeclNode [480] | LinDeclNode [492] |
ReactiveDeclNode [503] | FunctionDeclNode [791] | ComponentDefNode [856] |
EngineDeclNode [878] | TypeDeclNode [1235] | ImportDeclNode [1184] |
ExportDeclNode [1216] | UseDeclNode [1202] | ChannelDeclNode [1263]

### Statement / expression-stmt nodes
IfStmtNode [939] | ForStmtNode [981] | WhileStmtNode [999] | ReturnStmtNode [1008] |
ThrowStmtNode [1015] | SwitchStmtNode [1022] | TryStmtNode [1031] | MatchStmtNode [1050] |
BareExprNode [1086] | LiftExprNode [1116] | FailExprNode [1126] |
PropagateExprNode [1140] | GuardedExprNode [1152] | HtmlFragmentNode [1106]

### Other block nodes
StateNode [265] | StateConstructorDefNode [279] | LogicNode [294] | SQLNode [311] |
CSSInlineNode [330] | StyleNode [339] | ErrorEffectNode [350] | MetaNode [359] |
TransactionBlockNode [1282] | WhenEffectNode [1303] | WhenMessageNode [1317] |
UploadCallNode [1328]

## ExprNode union  [ast.ts:1939] — scrml's own expression AST
IdentExpr [1569] | LitExpr [1591] | ArrayExpr [1614] | ObjectExpr [1621] |
SpreadExpr [1633] | UnaryExpr [1650] | BinaryExpr [1678] | AssignExpr [1700] |
TernaryExpr [1712] | MemberExpr [1730] | IndexExpr [1741] | CallExpr [1751] |
NewExpr [1761] | LambdaExpr [1789] | CastExpr [1817] | MatchExpr [1835] |
SqlRefExpr [1852] | InputStateRefExpr [1866] | EscapeHatchExpr [1880] | ResetExpr [1921]
Note: the LIVE pipeline's `parseExprToNode` decorates ExprAttrValue / BareExprNode
with Acorn ESTree nodes; downstream stages consume those ESTree nodes directly.

## Codegen I/O Types  [compiler/src/codegen/index.ts]
CgInput [106] — files, routeMap, depGraph, protectAnalysis, batchPlan,
  reachabilityRecord, exportRegistry, emitPerRoute, chunkSizeBudgetBytes, debugPerf, …
CgFileOutput [206] — sourceFile, serverJs, clientJs, libraryJs, html, css, testJs,
  machineTestJs, workerBundles, clientJsMap, serverJsMap
CgOutput [223] — outputs: Map<string,CgFileOutput>, errors, runtimeJs, runtimeFilename,
  chunks?, chunksManifest?

## Native-parser AST (in-progress — divergent from FileAST)
ast-expr.js — `Expr` AST, 37 ExprKind variants (M2.x).
ast-stmt.js — `Stmt[]` from parseProgram(tokens,source), 20 StmtKind variants (M3.x).
parse-markup.js — `BlockNode[]` from parseMarkup(source), 11 BlockKinds.
token.js — TokenKind nested-by-category enum.
These do NOT yet match FileAST; the M5-FULL bridge work translates them.
See compiler/native-parser/M5-ast-bridge-scoping.md and M5-divergence-ledger.md.

## Database Models
No application DB schema — scrml is a compiler. SQLite *.db files at repo root and
in examples/ are throwaway test fixtures (0-byte or test-generated). SQL schema in
.scrml sources is the user-program domain, not a compiler model.

## Tags
#scrmlts #map #schema #ast #fileast #native-parser #codegen

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [domain.map.md](./domain.map.md)
