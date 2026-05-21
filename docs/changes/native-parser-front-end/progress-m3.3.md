# M3.3 progress — functions/classes + in-line bodies (subsumes BPP) + import/export + try/throw

Append-only. Per-step.

## 2026-05-20

- Startup verification PASS. Worktree `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa6156cd4206bbc50`; merged main → HEAD `c36c234`. All predecessor files present. `bun install` + `bun run pretest` OK.
- Read maps (primary/schema/dependencies), roadmap §3.2 M3.3 row, S98 DD D5/D3/D7, M3.1+M3.2 substrate (ast-stmt + parse-stmt + parse-mode), M2.3 function-expr seam in parse-expr.js, conformance test structure.
- Scope locked: ast-stmt make* constructors for FunctionDecl/ClassDecl/Import/Export/Try/Throw + Class-member/Import-specifier/Export-specifier/Catch sub-shapes; parse-stmt parsers for those; in-line function/arrow bodies (BlockStub subsumption); `await`/`yield` expression-statement leads (the statement parser hits these inside re-entered bodies); convert the E-STMT-FORWARD-M3-3 forward-seam tests.
- DONE — ast-stmt M3.3 constructors (.scrml + .js). Commit `4033894`.
- DONE — K7 fix: `makeIdentOrKeyword` prototype-pollution. JS_KEYWORDS is a plain object; `JS_KEYWORDS["constructor"]` (also toString/valueOf/hasOwnProperty/__proto__ etc.) resolved to an inherited Object.prototype member → mis-lexed those identifiers to a non-string token kind. Surgical own-property guard. Pre-existing M1 bug; surfaced by M3.3's `class C { constructor() {} }`. Commit `7d26de8`.
- DONE — M3.3 parser core in parse-stmt.js: parseFunctionDecl / parseClassDecl + class members / parseImport / parseExport / parseTry / parseThrow / parseAwaitStatement / parseYieldStatement. parseExprStatement + parseVarDeclarator tie off the function-expr BlockStub seam via reenterBlockStubs. Coupled test conversion (forward-seam tests + reenterBlockStubs deep-walk count). Commit `4d0aae8e`.
- DONE — parse-stmt.scrml canonical shadow, 1:1. Commit `416c7009`.
- DONE — Tier 1+2 Acorn-oracle conformance corpus (70-entry DECL_MODULE_CORPUS) + normalizer extension. Commit `faf40fdf`.
- DONE — native-shape + BPP-subsumption + error-path tests (52 tests). Commit `9521bd59`.
- DONE — M3.4 return-legality seam documented in parseReturn. Commit `2ac0518a`.
- VERIFY: full stmt conformance 454/0; all 4 native-parser conformance suites 1403/0.
- DEFERRED to M3.4: return-legality (top-level `return` parses but no diagnostic — needs a function-scope depth counter); error-recovery engine integration; full conformance.
- NEW K-class for PA: K7 (lexer prototype-pollution — fixed in this dispatch).
