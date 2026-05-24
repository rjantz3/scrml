# M6.7-D2 — FIX-NATIVE: `server`/`pure` modifier on `function` (not just `fn`)

Startup pwd: /home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-ad520491ab86abf79
Merged main -> HEAD cce66699 (absorbed D1). bun install + pretest clean.

Maps consulted: primary.map.md (full). Task-Shape Routing → "Native-parser bug fix"
row (structure/schema/domain/test maps). Load-bearing finding: the native FunctionDecl
node + translate-stmt.js ALREADY support `fnKind:"function"` + isServer/isPure (the gap
is purely in dispatch RECOGNITION + parseScrmlFunctionDecl hardcoding `fnKind:"fn"`).

## Phase 0 — VERIFIED (dual-pipeline: splitBlocks+buildAST = LIVE oracle; nativeParseFile = native)

### Which forms FAIL native (inside a `${ }` logic block — the path that reaches the fn-decl parser)
| Form | LIVE | NATIVE (before fix) |
|---|---|---|
| `function f() {}`             | clean; fnKind "function", isServer false | clean (MATCH) |
| `server function f() {}`      | clean; fnKind "function", **isServer true** | **3 errs** (E-EXPR-UNEXPECTED + cascade), isServer false (WRONG) |
| `pure function f() {}`        | clean; fnKind "function", **isPure true** | **3 errs**, isPure absent (WRONG) |
| `pure server function f() {}` | clean; fnKind "function", isServer true, isPure true | **6 errs** (cascade x2) |
| `server function fetchItems()! -> LoadError {}` (PRIMER §6 recipe) | clean; fnKind "function", isServer true, canFail true, errorType "LoadError" | **7 errs** |
| `server fn f() {}`  | clean; fnKind "fn", isServer true | clean (MATCH — baseline) |
| `pure fn f() {}`    | clean; fnKind "fn", isPure true | clean (MATCH — baseline) |
| `fn f() {}`         | clean; fnKind "fn" | clean (MATCH — baseline) |

### Pinned LIVE AST oracle (the EXACT field set the native fix MUST emit — per §33.6 distinctness)
- `function` keyword forms ALWAYS produce **fnKind:"function"** (NEVER collapse to "fn").
- `server function`      → { fnKind:"function", isServer:true }
- `pure function`        → { fnKind:"function", isPure:true }   (isPure spread only when true)
- `pure server function` → { fnKind:"function", isServer:true, isPure:true }
- trailing `!` → canFail:true; `! -> ErrorType` → errorType:"...".  `function*` → isGenerator:true.
- LIVE OMITS isPure/isPinned/errorType when falsy (conditional spread) — native translate-stmt.js
  already mirrors this (only emits isPure/isPinned when true; errorType when non-empty).

### ROOT CAUSE (confirmed in native source)
- `fnDeclLeadFollows` (parse-stmt.js ~1626) recognizes the `server`/`pure` modifier prefix ONLY
  when it leads to `KwFn`. A modifier before `KwFunction` → returns false → the bare `server`/`pure`
  falls through to the expression-statement arm (parse-stmt.js:621-623) → E-EXPR-UNEXPECTED cascade.
- `parseScrmlFunctionDecl` (parse-stmt.js ~1689) hardcodes `fnKind:"fn"` and `recordError`s if the
  post-modifier token is not `fn`.
- The NATIVE node infra (ast-stmt.js makeFunctionDecl) + bridge (translate-stmt.js makeFunctionDecl,
  line 1358 `stmt.fnKind === "fn" ? "fn" : "function"`) ALREADY support fnKind:"function" + the flags.
  No bridge / node change needed.

### SCOPE confirmed
- Gap is EXACTLY `server`/`pure` (and `pure server`) on the `function` keyword.
- `pinned function` / `async function`: NOT live forms on `function` (pinned/async pair only with `fn`
  in live; native deliberately rejects `async` via E-ASYNC-NOT-IN-SCRML). OUT OF SCOPE.
- §48 body-purity prohibitions apply to `fn`/`pure`, not the general `function` body. The native
  parser does not enforce body-purity at parse time (it's a downstream typer concern), so no
  body-rule flag handling differs between `server fn` and `server function` at the parse layer.

## THE FIX (commit ac1c49fd — compiler/native-parser/parse-stmt.js only)
1. `isFnDeclKeyword(k)` — new predicate: `KwFn || KwFunction`.
2. `fnDeclLeadFollows` — accept `KwFunction` (not just `KwFn`) after the `server`/`pure`
   modifier prefix. A BARE `function` is still dispatched by the dedicated KwFunction arm.
3. `parseScrmlFunctionDecl` — read which keyword follows; set `fnKind` dynamically
   (`"fn"` vs `"function"`, §33.6 distinct — NOT collapsed); consume the `function*`
   generator marker; thread `isGenerator` into the body parse + makeFunctionDecl.
4. statement-dispatch comment + both export paths (parseExportDefault /
   parseExportedDeclaration) inherit the fix via the shared predicate — `export server
   function` now parses clean.
- NO node/bridge change needed: ast-stmt.js makeFunctionDecl + translate-stmt.js
  makeFunctionDecl (line 1358 `stmt.fnKind === "fn" ? "fn" : "function"`) ALREADY support
  fnKind:"function" + isServer/isPure (the docstrings even named the `function` form).

## POST-FIX PARITY (dual-pipeline, all forms now MATCH live exactly)
server function / pure function / pure server function / server function!-> LoadError /
server function* → all parse native with ZERO errors and the live-matching field set.
Baseline function/fn/server fn/pure fn → byte-identical output (the `fn` path passes
isGenerator=false unchanged).

## VERIFICATION
- New unit suite compiler/tests/unit/m67-d2-server-function-parse.test.js: 28 pass / 0 fail.
- Strict-pass corpus canary: EXACT=964 (HOLDS — load-bearing gate), 1019 pass / 0 fail.
- Within-node canary: GREEN after allowlist regen (1005 pass / 0 fail). Aggregate total
  94411 -> 95351 (EXPECTED parse-completeness rise — D1 artifact). Per-class:
  KIND-NAME +43, FIELD-SHAPE +120, MISSING-FIELD +67, EXTRA-FIELD +18, COUNT-LENGTH -151,
  SPAN-COORD +843. All 59 value-changed allowlist entries contain a server/pure function
  decl; NO file lacking one moved. In files where the server-function was the sole defect
  (e.g. 20-middleware) KIND-NAME/MISSING/EXTRA DROP — net structural-fidelity improvement.
- Full `bun test compiler/tests/`: 21321 pass / 0 fail on clean re-run (2 transient fails on
  one run were the known bootstrap/trucking double-compile flaky class — cleared on re-run;
  pre-commit hook also reported 0 fail).

## D2-IMPACT SPOT-CHECK (precise)
Across all 82 corpus files containing a `server`/`pure function` decl, ZERO real errors land
at a modifier-function decl HEAD (the one E-CTX-001 hit is prose `server function)` inside a
comment — a regex false positive, not a decl). The recognition gap is FULLY closed.

## RESIDUALS (DISTINCT clusters, OUT OF D2 SCOPE — filed, not fixed)
Some server-function files still show cascades from SEPARATE native gaps unrelated to the
modifier-on-function recognition:
- bare `function name() ! ErrorType {` (the `!` failable marker on the BARE-`function` path —
  parseFunctionDecl has no `!` handling; only parseScrmlFunctionDecl does) — 09-error-handling.
- `not` operator inside a paren-grouped condition (`if (a && not b)`) — 08-chat.
- `lin` parameter modifier in a param list (`function f(lin x: T)`) — 19-lin-token.
- object-type return annotation (`-> { id: number } {`) — login.
- `fail .Variant` / `fail AuthError(...)` expression forms — 09-error-handling, login.
These are independent flip residuals for a future sub-unit.

## SCOPE/STOP CONDITIONS
No STOP condition hit. The live AST did NOT require a different node kind (fnKind discriminator
sufficed); §48 body-purity is a downstream-typer concern, not a parse-layer flag — no body-rule
divergence between `server fn` and `server function` at parse time.
