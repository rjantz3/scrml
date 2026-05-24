# test.map.md
# project: scrmlts
# updated: 2026-05-24T00:00:00Z  commit: 3a909c1d

## Test Framework

Runner: `bun test` (Bun >=1.3.13 built-in; uses `bun:test` API)
Config: `bunfig.toml` — `[test] root="compiler/tests/", timeout=10000ms`
Browser tests: `@happy-dom/global-registrator` + `happy-dom`; e2e via `@playwright/test`
Run all: `bun test compiler/tests/` (preceded by `pretest` sample compilation)
Run single: `bun test compiler/tests/unit/<file>.test.js`
Run by name: `bun test compiler/tests/<file>.test.js -t "<test name>"`

## Volume (HEAD 3a909c1d — S127)

757 .test.js files under `compiler/tests/`. (The prior watermark map reported 761 unit/integration counts that did not match the filesystem; counts below are re-derived from the tree at HEAD.) S127 ADDED 11 test files (5 unit mcp-descriptors-*, 1 unit not-return-statement-glue, 2 integration mcp-*, 1 integration bug-w, 1 integration giti-019) + 1 unit helper (`helpers/mcp-sidecar-compile.js`); MODIFIED `unit/emit-library.test.js` (+106L, GITI-018), `unit/not-keyword.test.js`, `unit/lift-li-text-template.test.js`, `unit/match-arm-inline-markup-payload.test.js`.

## Test Categories

| Category | Glob | Count |
|---|---|---|
| Unit | `compiler/tests/unit/**` | 529 |
| Integration | `compiler/tests/integration/**` | 81 |
| Conformance | `compiler/tests/conformance/**` | 105 |
| Browser | `compiler/tests/browser/**` | 12 |
| Commands | `compiler/tests/commands/**` | 6 |
| LSP | `compiler/tests/lsp/**` | 10 |
| Self-host | `compiler/tests/self-host/**` | 4 |
| Top-level parser-conformance | `compiler/tests/*.test.js` | 10 |
| E2E | `e2e/**` | Playwright (separate runner) |

## Parser-Conformance Suite (load-bearing for M5 swap / C1+C2 / M6 Wave 1)

Top-level files at `compiler/tests/`:

| File | What it tests |
|---|---|
| `parser-conformance-lexer.test.js` | native lexer vs Acorn (M1.x) |
| `parser-conformance-expr.test.js` | native Expr AST vs Acorn (M2.x); +16 M6.5.b.1 match-arm tests — newline/comma/semi separators + Dot+UpperIdent variant patterns |
| `parser-conformance-stmt.test.js` | native Stmt AST vs Acorn (M3.x) |
| `parser-conformance-markup.test.js` | native markup Block tree; M6.6.b.1.5 attr tokenizer assertions |
| `parser-conformance-corpus.test.js` | bench corpus + .scrml smoke pass |
| `parser-conformance-canary.test.js` | dual-pipeline-canary harness; M6.7 STOP — canary closed |
| `parser-conformance-collect-hoisted.test.js` | collectHoisted hoist-synthesis (A3); M6.4a expanded |
| `parser-conformance-parse-file.test.js` | `nativeParseFile` FileAST assembler (C1) |
| `parser-conformance-within-node.test.js` | M6.5.b.0 within-node parity 7-class classifier; allowlist `parser-conformance-within-node-allowlist.json` (rebased S125 for M6.5.b.1+b.2) |

## S127 NEW Test Files

### MCP-V0.A descriptor-extractor unit suite (`compiler/tests/unit/`)
| File | describe root | What it tests |
|---|---|---|
| `mcp-descriptors-engines.test.js` | "MCP-V0.A engines.json extractor" | `collectEngineDescriptors` — variants, rules map, `cellKey`, primary vs derived |
| `mcp-descriptors-forms.test.js` | "MCP-V0.A forms.json extractor" | `collectFormDescriptors` — nested `compoundKeys` (S127 A↔B fix), per-field descriptors |
| `mcp-descriptors-channels.test.js` | "MCP-V0.A channels.json extractor" | `collectChannelDescriptors` — name/topic defaults, §38.4 auto-synced cells, logic-body descent |
| `mcp-descriptors-serverfns.test.js` | "MCP-V0.A serverfns.json extractor" | `collectServerFnDescriptors` — isServer filter, params/returnType, `dispatchable:false`, file dedupe |
| `mcp-descriptors-degenerate-spa.test.js` | "MCP-V0.A degenerate-SPA sidecars" | empty/degenerate app → well-formed empty sidecars |

### Other S127 new test files
| File | describe root | What it tests |
|---|---|---|
| `integration/mcp-descriptors-runtime-integration.test.js` | "MCP-V0 integration — sidecar emission" | compileScrml emits sidecars → fed into B-landed runtime helpers end-to-end |
| `integration/mcp-server-tools.test.js` | "MCP-V0.C — fixture emits clean sidecars" | the 11-tool surface over a real compiled fixture (Sub-unit C) |
| `integration/bug-w-binary-precedence-parens.test.js` | "Bug W §1: emitBinary re-inserts dropped grouping parens (printer)" | precedence-paren re-insertion correctness |
| `integration/giti-019-lift-loop-coalesce-parens.test.js` | "GITI-019 §1: lift-loop interpolation with \|\| emits valid JS" | `?? ""` coalesce-guard parenthesization |
| `unit/not-return-statement-glue.test.js` | "§1 `return not` does not glue to the next statement" | 6nz-S `[ \t]+` + keyword-exclusion guards (both lowering sites) |

### S127 helper
`compiler/tests/helpers/mcp-sidecar-compile.js` — `makeSidecarTmpRoot(label)` / `cleanupSidecarTmpRoot(root)` / `compileAndReadSidecars(source, tmpRoot)`: drives `compileScrml()` on inline source into a tmp dir and reads back the emitted engines/forms/channels/serverfns .json sidecars. Backbone of the MCP-V0.A unit + integration suites.

### S127 modified test files
| File | Change |
|---|---|
| `unit/emit-library.test.js` (+106L) | GITI-018 — all `scrml:` imports rewritten in `--mode library` (was first-only); leading-indentation round-trip |
| `unit/not-keyword.test.js` | extended for 6nz-S standalone-`not` / keyword-exclusion |
| `unit/lift-li-text-template.test.js` | GITI-019 coalesce-paren expectation update |
| `unit/match-arm-inline-markup-payload.test.js` | minor expectation update |

## S125 Test Files (still load-bearing)

| File | What it tests |
|---|---|
| `unit/mcp-runtime-helpers.test.js` (~485L) | MCP-V0.B `scrml:mcp` runtime shim — install/uninstall lifecycle, loadSidecars reader, getCurrentVariant/getFormStatus/getChannelState READ helpers (against hand-written sidecar fixtures). Now COMPLEMENTED by the S127 extractor suites that drive the real `compileScrml` → sidecar → helper path. |
| `unit/m65-b2-structural-state-decl.test.js` (~298L) | M6.5.b.2 structural state-decl `<ident>` LHS — parse-stmt dispatch + attribute region + typed Shape 1 + translate-stmt → live state-decl |

mcp-runtime-helpers pattern (carried into the S127 suites): `_resetForTests()` in before/afterEach for module-state isolation; sidecar JSON to per-test tmp dir; mock runtime `{reactive_get, derived_get}` via `install()`; asserts helpers throw `/runtime not connected/` before install and `/engines.json not loaded/` before loadSidecars; `{variant,data}` records normalize to tag string; `cellKey` override honored.

## S124 Test Files (still load-bearing)

| File | What it tests |
|---|---|
| `parser-conformance-within-node.test.js` | M6.5.b.0 — within-node divergence classifier |
| `unit/m66-b2-engine-statechild-walker.test.js` | M6.6.b.2 + M6.6.b.3 — native-walker vs legacy `parseEngineStateChildren` structural equality |

## S123 Test Files (still load-bearing)

| File | What it tests |
|---|---|
| `unit/v-kill-state-undeclared.test.js` | E-STATE-UNDECLARED (V-kill) |
| `unit/unit-cc-write-at-body-top.test.js` | E-WRITE-NOT-IN-LOGIC-CONTEXT (Unit CC) |
| `unit/runtime-chunk-dependencies.test.js` | `applyChunkDependencies` (6nz Bug P) |

## Pre-commit Test Gate

`bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance --bail`
Browser tests are NOT in the pre-commit gate (run separately / in pre-push).

## Fixtures & Factories

| Path | Contents |
|---|---|
| `compiler/tests/fixtures/` | promote-match-canonical.scrml, promote-multi-file-app/ |
| `compiler/tests/helpers/` | expr.ts (ExprNode test helpers), extract-user-fns.js, mcp-sidecar-compile.js (S127) |
| `compiler/tests/parser-conformance-within-node-allowlist.json` | M6.5.b.0 within-node parity allowlist (rebased S125 for M6.5.b.1+b.2; +8 entries at HEAD) |
| `samples/compilation-tests/` | ~318 test-case directories driven by pretest (counted, not enumerated) |

## Pattern

Tests use `bun:test` (`describe` / `test` / `expect`). Compiler tests drive `compileScrml()` from `compiler/src/api.js` and assert on `result.errors` / `result.warnings` / `result.outputs`. Diagnostic-stream partition rule (S92/S93): W-* / I-* + severity warning/info → `result.warnings`; tests asserting on W-/I- codes MUST use a cross-stream helper, not `result.errors.filter`. `E-STATE-UNDECLARED` + `E-WRITE-NOT-IN-LOGIC-CONTEXT` ARE errors → assert on `result.errors` normally.

Parser-conformance tests diff native-parser output against the Acorn oracle. The dual-pipeline canary diffs `nativeParseFile` FileAST against live `buildAST` FileAST; the within-node classifier tests at the sub-node field level. MCP descriptor tests (S127) drive `compileScrml` via `compileAndReadSidecars(source, tmpRoot)` and assert on the emitted .json shapes; runtime-shim tests import the shim module directly, fake the runtime via `install({...})`, point `loadSidecars()` at a tmp dir, and `_resetForTests()` between cases.

## Tags
#scrmlts #map #test #bun-test #parser-conformance #native-parser #dual-pipeline-canary #m6-wave1 #m6-6-b2 #m6-5-b1 #m6-5-b2 #v-kill #unit-cc #mcp-v0 #mcp-descriptors #mcp-server #bug-w #giti-018 #giti-019 #6nz-s #s127

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
