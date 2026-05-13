# §13.2 auto-await extension to `Promise<T>` stdlib calls — SCOPING

**Status:** SCOPING (read-only investigation). No SPEC edits, no compiler changes, no tests added.
**Date:** 2026-05-13 (S89 open).
**Origin:** S88 close — `compiler/runtime/stdlib/host.js:117-143` docstring identified the safeCallAsync await-discipline gap. The hand-off-88 misnamed this as a "§53.7.x amendment" — actual SPEC location is §13.2 (Async Model — Compiler-Managed Asynchrony).
**Worktree:** `agent-aaebfc1edef488f3a`.

---

## §1 Current State

### §1.1 SPEC §13.2 verbatim (lines 6481-6526)

```
## 13. Async Model

### 13.1 Developer-Visible Syntax

The developer SHALL NOT write `async`, `await`, `Promise`, `Promise.all`, or any other
explicit asynchrony construct in scrml source code.

### 13.2 Compiler-Managed Asynchrony

The compiler SHALL:

1. Build a dependency graph of all operations in the program (see Section 30).
2. Identify which operations are independent (no data dependency between them).
3. Parallelize independent operations using `Promise.all` in generated code.
4. Sequence dependent operations using `await` in generated code.
5. Emit all generated async infrastructure without any developer input.

Normative statements:

- The compiler SHALL insert `await` at every call site where a server-generated fetch call is made.
- The compiler SHALL wrap any function containing at least one server call in an `async` function in generated code.
- The developer SHALL write flat, synchronous-looking code. The compiler SHALL produce optimal async execution patterns from this code.
- Independent server calls in the same function body SHALL be parallelized in generated code unless there is a data dependency between them.
```

**Key normative grip:** the four current normative bullets cover **only** "server-generated fetch calls" — the call-site classification is server function (fetch-stub-emitted route), not any Promise-returning callee.

### §1.2 Current compiler implementation

**Auto-await fire-site:** `compiler/src/codegen/scheduling.ts:96-115` — `isServerCallExpr(stmt, routeMap, filePath)`.

```ts
export function isServerCallExpr(stmt, routeMap, filePath): boolean {
  ...
  const callees = exprNodeField
    ? exprNodeCollectCallees(exprNodeField)
    : extractCalleeNames(...);
  if (callees.length === 0) return false;
  const serverFnNames = new Set<string>();
  for (const [fnNodeId, route] of routeMap.functions) {
    if (route.boundary === "server" && route.functionName) {
      serverFnNames.add(route.functionName as string);
    }
  }
  for (const callee of callees) {
    if (serverFnNames.has(callee)) return true;
  }
  return false;
}
```

**`await` is emitted** at four sites inside `scheduleStatements()`:
- Line 285: `await Promise.all([...])` — for independent groups (size ≥ 2).
- Line 292: `const ${var} = await ${callExpr}` — for one-element groups.
- Line 314: `const ${name} = await ${initExpr}` — single statement, is-server-call, decl-shape.
- Line 316: `await ${code}` — single statement, is-server-call, bare-expr shape.

**Classification source:** `compiler/src/route-inference.ts:2314, 2411` — `boundary` is set to `"server"` iff `escalationResults` produced at least one escalation reason (e.g., `?{}` SQL block, `Bun.password.*` static signal, etc. per §12.2). The `routeMap.functions` Map is the authoritative classification surface; `scheduling.ts` reads it directly.

**Fetch-stub emission (cross-process):** `compiler/src/codegen/emit-functions.ts:221, 230, 239, 242` — emit `await fetch(...)` inside the generated client stub for a server function. These are inside the stub, not at the developer's call site, so they're orthogonal to the auto-await proposal.

**Other `await` emissions** (not auto-await, but downstream):
- `emit-functions.ts:329, 337` — inlined server-fn-to-server-fn calls (§13.4) emit `await stubName(...)`.

### §1.3 The S88 finding (load-bearing)

`safeCallAsync` is **not a server function** — it is a stdlib utility that lives in `stdlib/host/index.scrml` and is bundled via `compiler/runtime/stdlib/host.js`. Therefore:

1. `routeMap.functions` does **not** contain `safeCallAsync` with `boundary === "server"`.
2. `isServerCallExpr` returns `false` for `safeCallAsync(thunk)` call sites.
3. No `await` is emitted at developer call sites for `safeCallAsync(thunk)`.
4. Developer must write the **two-step** pattern verbatim — explicit `await` at call site, then `!{}` guard on the awaited result. See `stdlib/auth/password.scrml:60-69`:

```scrml
export async function verifyPassword(password, hash) ! -> PasswordError {
    const rawResult = await safeCallAsync(() => Bun.password.verify(password, hash))
    const ok = rawResult !{
        | ::Thrown(msg, name) -> {
            fail PasswordError::VerifyFailed(msg)
        }
    }
    return ok
}
```

The explicit `await` here is **technically a violation of SPEC §13.1** ("The developer SHALL NOT write `async`, `await`, `Promise`, `Promise.all`, or any other explicit asynchrony construct in scrml source code") — but is currently tolerated because (a) stdlib is hand-authored and slightly above scrml-source rules, and (b) S88 ratified migration to this pattern for verifyPassword without an aliased solution.

**Failable `!{}` shape requirement:** `compiler/src/codegen/emit-logic.ts:2277` — the guarded-expr emission does `if (resultVar && resultVar.__scrml_error) { ... }`. A Promise object has no `__scrml_error` property, so applying `!{}` to an unawaited `safeCallAsync(...)` result **silently misses the error arm** — the guard sees a Promise (truthy, no error sentinel) and the success path always runs. This is why the docstring at `host.js:124-131` is emphatic: the explicit `await` is load-bearing for the failable handler shape.

### §1.4 What is **not** covered today

- **No compile-time detection** that a callee returns `Promise<T>` from any source other than the server-fn route map. `FunctionDeclNode` carries `isServer: boolean` but no `isAsync` or `returnsPromise` field (`compiler/src/types/ast.ts:714-741`).
- **`LambdaExpr` has `isAsync`** (`ast.ts:1671`) but it propagates to emission only (`emit-expr.ts:768`); it does not feed the auto-await classifier.
- **E-PROG-004** (cross-program `Promise<T>` must be awaited) is in the SPEC catalog (line 14872) and prose (line 18558) but **is NOT yet implemented** in `compiler/src/` (grep `PROG-004` and `cross-program` over `compiler/src/` returns zero hits).

---

## §2 Proposed Surface

### §2.1 Draft amendment text (NOT canonical — for impl-dispatch consideration)

Add a new sub-section §13.2.1 after the existing §13.2 normative-statements block:

> **§13.2.1 Auto-await for statically-known `Promise<T>` callees**
>
> The compiler SHALL extend its auto-await behavior (per §13.2) to apply to ANY call site
> whose statically-resolved callee returns `Promise<T>`. This includes — but is not limited to:
>
> 1. Server functions (the existing surface; covered by §13.2 bullet 1).
> 2. Stdlib functions declared with `async function` or `async fn` in their `.scrml`
>    source (e.g., `safeCallAsync`, `hashPassword`, `verifyPassword`, `signJwt`, `verifyJwt`).
> 3. Cross-program function calls (per §43.5.1) — see §13.2.2 below for the E-PROG-004
>    interaction.
>
> The compiler SHALL NOT auto-await calls whose callee is dynamic (function reference,
> higher-order argument, indexed lookup). Such cases require explicit `await` from the
> developer if a Promise is being unwrapped — and stdlib authors SHOULD prefer wrapping
> a dynamic Promise call in a named statically-resolvable thunk (e.g., `safeCallAsync(() => ...)`).
>
> **Classification source:** the type system (Stage 6, §6) SHALL produce a "callee
> returns Promise" predicate for every CallExpr. The auto-await transform (CG, scheduling
> stage) SHALL consume this predicate via the AST-attached annotation `_returnsPromise: true`.

The exact normative wording is **owned by the impl-dispatch**, not this scoping doc.

### §2.2 Statically-known callees in scope

A "statically-known callee" is a CallExpr whose `callee.kind === "ident"` (or `member` for `obj.method()`) resolves at compile time to a `FunctionDeclNode` (or stdlib export) carrying enough information to decide `Promise<T>` return. Three concrete sources:

1. **Server function** — already classified via `routeMap.functions[fnNodeId].boundary === "server"`. No change to this surface; the proposed extension is **additive**.
2. **`async function` / `async fn`** declared in `.scrml` source — `FunctionDeclNode` would need a new `isAsync: boolean` field (currently absent from `ast.ts:714-741`). Populated by the AST builder when the source carries `async` modifier (already parsed for `LambdaExpr.isAsync`).
3. **Cross-program function calls** (`<#name>.foo(...)` per §43.5.1) — return `Promise<T>` per spec; today they would fire E-PROG-004 if unawaited. Proposed: classify these as auto-await-eligible.

### §2.3 Out of scope

- **Dynamic callee detection.** Function refs (`const f = safeCallAsync; f(thunk)`), higher-order pipelines (`array.map(safeCallAsync)`), and indexed lookups (`api["safeCallAsync"](thunk)`) are intentionally NOT covered. Rationale: scrml has no first-class type-flow for these forms today, and forcing auto-await to handle them would require a Reachability Solver pass (per the v0.3 Approach A-2 surface). Authors must use explicit `await` or wrap in a named thunk.
- **User-authored `async function`s.** Per §13.1, scrml developers MAY NOT write `async` in source. So this concern only applies to stdlib `.scrml` files (which are above-the-rule). User-authored functions that happen to call a Promise-returning stdlib are covered transitively — the call site auto-awaits; the user-fn body is therefore async; the compiler wraps the user-fn in `async function` at emission time per §13.2 bullet 2 (this already happens for server-call-containing fns; the extension naturally generalizes).
- **Non-`Promise<T>` async constructs** (Observable, Stream, AsyncIterable, etc.). Not in scope; no stdlib API today returns these shapes.

---

## §3 Inventory: stdlib functions returning `Promise<T>`

Comprehensive list of `.scrml` declarations using `export async function`. File + line + signature inferred from source. **14 exported async functions** total across host/auth/oauth (+ 18 in redis + 7 in http, listed separately as they're I/O-heavy modules where every export is already Promise-returning by nature). All paths relative to worktree root.

### §3.1 scrml:host (1 export)

| Function | File:line | Return |
|---|---|---|
| `safeCallAsync(thunk)` | `stdlib/host/index.scrml:130` | `Promise<value \| HostError sentinel>` |

### §3.2 scrml:auth (5 exports)

| Function | File:line | Return |
|---|---|---|
| `hashPassword(password)` | `stdlib/auth/password.scrml:40` | `Promise<string>` |
| `verifyPassword(password, hash)` | `stdlib/auth/password.scrml:60` | `Promise<boolean \| PasswordError>` |
| `signJwt(payload, secret, expiresIn)` | `stdlib/auth/jwt.scrml:69` | `Promise<string>` |
| `verifyJwt(token, secret)` | `stdlib/auth/jwt.scrml:117` | `Promise<{ valid, payload? \| reason? }>` |
| `verifyTotp(code, secret)` | `stdlib/auth/index.scrml:146` | `Promise<boolean>` |

### §3.3 scrml:oauth (6 exports + pkce)

| Function | File:line | Return |
|---|---|---|
| `deriveChallenge(verifier)` | `stdlib/oauth/pkce.scrml:62` | `Promise<string>` |
| `startFlow(config, sessionKey)` | `stdlib/oauth/index.scrml:179` | `Promise<{authUrl, state}>` |
| `exchangeCode(config, sessionKey, code, state)` | `stdlib/oauth/index.scrml:241` | `Promise<TokenSet \| OAuthError>` |
| `refreshToken(config, refreshTokenStr)` | `stdlib/oauth/index.scrml:300` | `Promise<TokenSet \| OAuthError>` |
| `getUserInfo(config, accessToken)` | `stdlib/oauth/index.scrml:327` | `Promise<UserInfo \| OAuthError>` |
| `revoke(config, token, tokenTypeHint)` | `stdlib/oauth/index.scrml:365` | `Promise<boolean>` |

### §3.4 scrml:redis (18 exports — all async)

`stdlib/redis/index.scrml` — `get`, `set`, `setex`, `del`, `exists`, `expire`, `ttl`, `incr`, `decr`, `getBuffer`, `sadd`, `srem`, `sismember`, `smembers`, `publish`, `subscribe`, `unsubscribe`, `send`.

### §3.5 scrml:http (7 exports)

`stdlib/http/index.scrml` — `get`, `post`, `put`, `del`, `patch`, `retry`, `uploadFile`.

### §3.6 JS-shim modules (`compiler/runtime/stdlib/*.js`)

For modules without a corresponding `.scrml` declaration (e.g., `crypto.js`):

| Function | File:line | Return |
|---|---|---|
| `hmac(secret, payload)` | `compiler/runtime/stdlib/crypto.js:61` | `Promise<Uint8Array>` |

(All other `crypto.js` exports — `hash`, `verifyHash`, `generateToken`, `generateUUID`, `safeCompare` — are synchronous.)

### §3.7 Totals

- **14** non-redis/http exported async functions (host + auth + oauth).
- **18** redis exports (each is async by module philosophy).
- **7** http exports.
- **1** JS-shim async (`crypto.hmac`).

**Grand total: ~40 stdlib `Promise<T>`-returning surfaces** that would benefit from auto-await once the proposed extension lands.

---

## §4 Compiler Touchpoints

### §4.1 TS (Type System, Stage 6, `compiler/src/symbol-table.ts` + `compiler/src/types/`)

**Today:** TS produces type registry + validator-arg deps + synthesized validity cells. There is **no callee-returns-Promise** classification today.

**Required change:** add a callee-classification pass that stamps `_returnsPromise: true` on every `CallExpr` whose statically-resolved callee:
- (a) is a server function (already classifiable via routeMap — reuse existing path), OR
- (b) is an `async function` declared in `.scrml` source (requires new `isAsync: boolean` on `FunctionDeclNode` — see §4.4), OR
- (c) is a cross-program call (`<#name>.foo(...)` shape — requires §43.5.1 classification, currently absent from compiler).

**Files:** `compiler/src/types/ast.ts` (add `_returnsPromise?: boolean` to `CallExpr`); `compiler/src/symbol-table.ts` (add pass); `compiler/src/route-inference.ts` (re-export server-fn-name set for TS reuse).

### §4.2 AST builder + Parser (Stage 3 TAB, `compiler/src/ast-builder.js`)

**Required change:** populate `isAsync: boolean` on `FunctionDeclNode` when source carries `async function` / `async fn`. The `LambdaExpr.isAsync` is already populated (`ast.ts:1671`) — same logic generalizes.

**Files:** `compiler/src/types/ast.ts` (add `isAsync?: boolean` to `FunctionDeclNode` interface at line 714); `compiler/src/ast-builder.js` (recognize `async` modifier).

### §4.3 DG (Dependency Graph, Stage 7, `compiler/src/dependency-graph.ts`)

**Today:** DG emits `awaits` edges from server-call statements to their dependents. Used by `scheduling.ts:218-226` to build dependency sets.

**Required change:** **none expected.** The `awaits` edge logic is currently keyed on `routeMap.functions` + boundary === "server" (see `dependency-graph.ts:1086-1087`). Once TS stamps `_returnsPromise: true` on the relevant CallExprs, DG can read that annotation instead of (or in addition to) routeMap classification. Minor refactor — same algorithm, broader signal source.

**Files:** `compiler/src/dependency-graph.ts:1086-1100` (extend the classifier).

### §4.4 CG (Codegen, Stage 8)

**Primary touchpoint:** `compiler/src/codegen/scheduling.ts` — the `isServerCallExpr` predicate at lines 96-115. Rename to `isPromiseReturningCallExpr` (or extend it to consult both `routeMap` and the new `_returnsPromise` annotation).

The four `await`-emitting sites (lines 285, 292, 314, 316) remain unchanged — they fire when the predicate returns true. The predicate's logic broadens; the emit shape is identical.

**Async function wrapping:** §13.2 bullet 2 ("The compiler SHALL wrap any function containing at least one server call in an `async` function") — extend `hasServerCallees` at `scheduling.ts:44-68` to `hasPromiseReturningCallees`. The `async function` emission downstream (e.g., `emit-functions.ts`, `emit-library.ts:427`) already reads `isAsync` — once the AST carries it transitively (via the new TS pass), no codegen edit is required.

**Files:**
- `compiler/src/codegen/scheduling.ts` (rename/extend predicate; update both `isServerCallExpr` and `hasServerCallees`).
- `compiler/src/codegen/emit-functions.ts` (verify async-wrapping path picks up the new predicate; likely no edit).
- `compiler/src/codegen/emit-library.ts:427` (same; verify only).

### §4.5 Tests

**New conformance tests required:**
- `compiler/tests/conformance/auto-await-stdlib-promise.test.js` — fixture: `${ const r = safeCallAsync(() => fn()); r !{ ... } }` → expect emitted JS to wrap in `await`, expect `!{}` arm to fire on error.
- `compiler/tests/conformance/auto-await-cross-program.test.js` (if cross-program path is opted in — see §5).
- `compiler/tests/unit/scheduling-promise-classifier.test.js` — predicate-level unit tests.

**Migration tests:** the existing `stdlib/auth/password.scrml:60-69` two-step pattern must compile to the SAME emitted JS under the new regime (the explicit `await` becomes idempotent — emitting `await await x` would be wrong; need to detect explicit await and skip). See §6 Sub-Phase E for migration logic.

---

## §5 Interaction with E-PROG-004

### §5.1 Current state

- **SPEC:** §43.5.1 line 18558 + §40.4 + §34 catalog (line 14872) — cross-program calls return `Promise<T>`; unawaited cross-program call is `E-PROG-004` (Error severity).
- **Compiler:** **not implemented** (zero hits for `PROG-004` or `cross-program` in `compiler/src/`).
- **Developer experience:** today, cross-program RPC (per §43.5.1 example) requires the developer to write `await <#compute>.add(1, 2)` explicitly — once E-PROG-004 is implemented, the compiler would diagnose the missing `await`; until then, missing `await` silently produces a Promise.

### §5.2 The dilemma

Two coherent positions:

**Position A — RETIRE E-PROG-004 in v0.4+ (auto-await cross-program).**
- Pros: Consistency. If safeCallAsync auto-awaits, why should `<#worker>.foo()` not auto-await? Same Promise<T> shape. §13.1 forbids developer-written `await` — E-PROG-004 enforcing explicit `await` is technically a §13.1 violation for the developer.
- Cons: Loses the security-boundary visibility cue. Cross-program calls cross a real process boundary (worker / nested program / sidecar); the explicit `await` signals "this is leaving the current execution context". Hiding it can mask latency/failure surfaces.

**Position B — PRESERVE E-PROG-004 (explicit await stays mandatory at process boundaries).**
- Pros: Explicit boundary visibility. The developer SEES that this call crosses a process boundary. Maps to S86 BS-layer-over-SPEC-retreat (sometimes explicit is right).
- Cons: Inconsistent with stdlib auto-await. Two different rules for the same Promise<T> shape. Forces developer to write `await` — formally violates §13.1.

**Position C — AMEND E-PROG-004 (loosen to a warning / I-level lint).**
- Recognize the inconsistency but keep the visibility cue. `await` becomes optional (auto-await fires) but writing it is permitted (and idempotent at codegen — see §4.5 migration logic).

### §5.3 Recommendation

**Position C (AMEND).** Reasons:

1. Maintains §13.2 consistency (auto-await applies uniformly to all statically-known Promise<T> callees).
2. Preserves the boundary-visibility affordance for adopters who want it — writing `await <#worker>.foo()` is permitted; the compiler doesn't error.
3. Avoids retiring a SPEC error code (S88 precedent: catalog stability matters — E-CHANNEL-INSIDE-PROGRAM retirement at S87 was a significant content-migration cost).
4. Maps to the same precedent as W-ENGINE-SELF-WRITE-DETECTED (Option d synthesis, S87) — the operation is permitted at runtime; the lint informs the developer.
5. Allows future SPEC clarification that `await` is **always** optional (developer-facing rule §13.1 reframed: "the developer NEED NOT write `await`; if they do, it is idempotent").

**Open question:** should the E-PROG-004 amendment be in the same dispatch as the §13.2 amendment, or separate? Surface to PA in §7.

---

## §6 Sub-Phase Decomposition

### Sub-Phase A — SPEC amendment text (4-6h)

- Draft §13.2.1 (auto-await extension) per §2.1 above.
- Draft §13.2.2 (cross-program interaction; depends on §5 disposition).
- Update §34 error catalog: amend E-PROG-004 if Position C chosen (or retire if Position A).
- Cross-refs: §13.1 (developer-visible syntax), §43.5.1 (cross-program RPC), §40.4 (nested program), §19.4 (failable `!{}`).
- Update `compiler/SPEC-INDEX.md`.

**Files:** `compiler/SPEC.md` (§13.2 + §34 catalog + §43.5.1 cross-ref + §40.4 cross-ref); `compiler/SPEC-INDEX.md`.
**Gate:** docs-only; no test gate.

### Sub-Phase B — AST + TS extension (8-12h)

- Add `isAsync?: boolean` to `FunctionDeclNode` interface (`ast.ts:714`).
- Add `_returnsPromise?: boolean` to `CallExpr` interface (`ast.ts` ExprNode section).
- Extend `ast-builder.js` to populate `isAsync` from `async` modifier.
- Add TS pass: classify every CallExpr → stamp `_returnsPromise` if callee is (a) server fn OR (b) async fn-decl OR (c) cross-program (per §5 disposition).

**Files:** `compiler/src/types/ast.ts`, `compiler/src/ast-builder.js`, `compiler/src/symbol-table.ts`.
**Gate:** existing AST/typer test suites must remain green; new unit test for the classifier.

### Sub-Phase C — CG transform extension (4-6h)

- Rename `isServerCallExpr` → `isPromiseReturningCallExpr` (or extend behavior) at `scheduling.ts:96-115`.
- Rename `hasServerCallees` → `hasPromiseReturningCallees` at `scheduling.ts:44-68`.
- Predicate consults `_returnsPromise` annotation (set by Sub-Phase B) in addition to routeMap.
- Detect explicit `await` at developer call site and skip double-emission (handles existing two-step pattern — see §4.5).

**Files:** `compiler/src/codegen/scheduling.ts`.
**Gate:** existing scheduling tests; new fixture for stdlib auto-await.

### Sub-Phase D — Conformance + integration tests (6-10h)

- `auto-await-stdlib-promise.test.js` — safeCallAsync + `!{}` pattern compiles to single `await`.
- `auto-await-async-fndecl.test.js` — `export async function f() { ... }; const r = f()` auto-awaits at call site.
- `auto-await-cross-program.test.js` — if Position A or C chosen, `<#worker>.foo()` auto-awaits.
- `auto-await-explicit-await-idempotent.test.js` — `await safeCallAsync(...)` compiles same as auto-await form (no `await await`).
- `e-prog-004-still-fires.test.js` (Position B) OR `e-prog-004-warning-only.test.js` (Position C).

**Files:** `compiler/tests/conformance/`, `compiler/tests/unit/`.
**Gate:** all new tests green; existing 11,912 pass count maintained.

### Sub-Phase E — Migration of existing two-step pattern (3-5h)

- Audit S88-landed two-step sites: `stdlib/auth/password.scrml:62`, `stdlib/auth/jwt.scrml:140` workaround, any future safeCallAsync sites.
- Decision: keep explicit `await` (idempotent under Sub-Phase C) OR remove it for cleaner source.
- Update stdlib `.scrml` files if removing.
- Update docstring at `compiler/runtime/stdlib/host.js:124-131` to reflect new auto-await behavior.

**Files:** `stdlib/auth/password.scrml`, `stdlib/auth/jwt.scrml`, `compiler/runtime/stdlib/host.js` (docstring only).
**Gate:** stdlib module tests + integration tests for verifyPassword / verifyJwt still pass.

### §6.1 Estimated total

**25-39h.** Sub-Phase A (SPEC) gates the rest; Sub-Phase B is the largest single chunk (typer extension); Sub-Phase D is the test-write surface.

Compared to S88 hand-off envelope ("small follow-on, no explicit estimate"): this is slightly larger than implied — the typer extension (Sub-Phase B) is the load-bearing cost. The S88 framing as "small" likely under-estimated the AST/typer changes needed to surface `Promise<T>` statically.

---

## §7 Open Questions (for PA / user disposition)

**Q1 — Surface breadth.** Does the extension apply to ALL stdlib `Promise<T>` returns (~40 surfaces per §3), or just `safeCallAsync` specifically (the immediate S88 trigger)?

- *Pros of broad (all):* uniform; future-proof; eliminates the `!{}`-on-Promise footgun for every async stdlib API.
- *Pros of narrow (safeCallAsync only):* minimal blast radius; surfaces only the failable-shape-correctness need.
- *Recommendation:* broad — narrow surface would re-create the same problem the next time an async stdlib is added.

**Q2 — Cross-program disposition.** Per §5: retire / preserve / amend E-PROG-004?

- *Recommendation:* AMEND (Position C). Lint-level info; auto-await fires; explicit await idempotent.

**Q3 — Performance considerations.** Auto-await on every stdlib Promise call — does this serialize independent calls that could parallelize?

- The existing `scheduling.ts` already parallelizes via `Promise.all` when there's no data dependency (line 285). The same logic applies to the broader Promise classifier — independent stdlib calls SHOULD parallelize.
- *Concern:* the predicate (`isPromiseReturningCallExpr`) is called on every statement in a function body; broadening it may slow CG marginally. Likely negligible (stdlib classification can be cached).
- *Recommendation:* implement broad; measure CG time on `samples/` fixture; revisit if regression > 5%.

**Q4 — `!{}` interaction with explicit `await`.** Does `!{}` work without explicit `await` once auto-await fires?

- *Today:* `result !{ ... }` requires `result` to be an already-unwrapped value (the `__scrml_error` sentinel check at `emit-logic.ts:2277`).
- *Under proposal:* yes — auto-await unwraps the Promise BEFORE `!{}` reads `__scrml_error`. The two-step pattern at `password.scrml:60-69` collapses to one line: `const ok = safeCallAsync(() => Bun.password.verify(...)) !{ | ::Thrown -> ... }`. The compiler emits both the `await` and the `!{}` guard in correct order.
- *Confirmation needed:* the `guarded-expr` emit at `emit-logic.ts:2248-2289` must be verified to interact correctly with the auto-await transform. Sub-Phase D conformance test must cover this exactly.

**Q5 — `async` modifier in scrml source.** §13.1 forbids `async` keyword. But `stdlib/auth/password.scrml:40` declares `export async function hashPassword`. Is stdlib above-the-rule, or is §13.1 amended?

- *Today:* stdlib has been tacitly treated as "above the rule" for `async` (same as `bun:`/`node:` imports pre-S88 amendment).
- *Recommendation:* surface in Sub-Phase A SPEC amendment — make stdlib's special status explicit, or amend §13.1 to permit `async` in declarations (auto-await still fires; the `async` modifier is now informational + drives the auto-await classifier).
- *Risk:* if §13.1 is amended to permit user `async`, the user's call-site rule (no explicit `await`) becomes harder to police — user could write `async function f()` and never call it, expecting auto-await to not fire. Cleaner to keep §13.1 strict for user source and document stdlib as a separate surface.

**Q6 — Static-resolution boundary.** What about `safeCallAsync(thunk)` where `thunk` itself returns a Promise vs. a non-Promise?

- *Today:* `safeCallAsync` always returns `Promise<...>` regardless of thunk shape (it `await`s internally). So auto-await is always correct.
- *Future risk:* if a new stdlib API has a conditional Promise return (e.g., "Promise if remote, value if cached"), auto-await can't classify statically. **Recommendation:** stdlib API design rule — every Promise-returning function must ALWAYS return Promise (no union with bare value). Add to stdlib authoring guide as part of Sub-Phase A.

---

## §8 Estimated Total

**25-39 hours** across 5 sub-phases (A=4-6h / B=8-12h / C=4-6h / D=6-10h / E=3-5h).

**Compared to S88 hand-off envelope.** Hand-off-88 framed this as "small follow-on, no explicit estimate" — implying ≤8h. **This scoping surfaces a 3-5× larger envelope** than the implicit S88 framing. Primary driver: Sub-Phase B (AST + TS extension) is non-trivial because today there is no `Promise<T>` static classification in the compiler. Adding it touches three files (`ast.ts`, `ast-builder.js`, `symbol-table.ts`) and requires careful integration with existing route-inference.

The total still fits within a "single dispatch" envelope (~1-2 work-days). It is NOT a multi-session epic.

**Risk hedges:**

- If Sub-Phase B's TS extension is gnarlier than estimated (~12h might balloon to ~20h), a smaller-scope fallback exists: implement Sub-Phase C **only** with a hardcoded stdlib allowlist (~10 names — safeCallAsync, hashPassword, verifyPassword, signJwt, verifyJwt, verifyTotp, etc.). Crude but fast. Then upgrade to TS classification in a follow-on.
- If E-PROG-004 disposition stalls (Q2), Sub-Phases A+B+C+D can land FIRST (covering stdlib only), and cross-program is a separate follow-on.

---

## Appendix — Files consulted

**SPEC.md sections:**
- §13.1 / §13.2 / §13.3 / §13.4 (lines 6481-6566) — Async Model.
- §13.5 (RemoteData enum) — async loading pattern context.
- §43.5.1 (line 18549-18558) — cross-program RPC + E-PROG-004 prose.
- §41.4 (lines 17987-18006) — protocol prefixes (S88 bun:/node: precedent).
- §34 catalog — E-PROG-004 at line 14872.

**Compiler source:**
- `compiler/src/codegen/scheduling.ts:96-115` — `isServerCallExpr`.
- `compiler/src/codegen/scheduling.ts:285,292,314,316` — await emission sites.
- `compiler/src/codegen/scheduling.ts:44-68` — `hasServerCallees`.
- `compiler/src/codegen/emit-functions.ts:221,230,239,242,329,337` — server-stub await emission.
- `compiler/src/codegen/emit-logic.ts:2248-2289` — `guarded-expr` (`!{}`) shape.
- `compiler/src/route-inference.ts:2295-2419` — server boundary classification.
- `compiler/src/types/ast.ts:714-741` — `FunctionDeclNode` (no `isAsync` today).
- `compiler/src/types/ast.ts:1671` — `LambdaExpr.isAsync` (existing surface to generalize from).

**Stdlib source:**
- `compiler/runtime/stdlib/host.js:117-143` — `safeCallAsync` JS shim + docstring.
- `stdlib/host/index.scrml:130-135` — `safeCallAsync` scrml stub.
- `stdlib/auth/password.scrml:60-69` — S88 two-step pattern (verifyPassword).
- `stdlib/auth/jwt.scrml:117-168` — S88 workaround (verifyJwt with try/catch).
- All `stdlib/*/index.scrml` + `stdlib/auth/*` — async export inventory.

**Maps consulted:**
- `.claude/maps/primary.map.md` — full read.
- `.claude/maps/domain.map.md` — pipeline stages + Phase A10 surface.
- `.claude/maps/schema.map.md` — AST node kinds + ExprNode (CallExpr).
- `.claude/maps/error.map.md` — E-PROG-* family + W-ENGINE-SELF-WRITE-DETECTED precedent.

**Master list:**
- `master-list.md:5-27` — S88 close context (safeCallAsync ship + verifyPassword migration + hand-off-88 §53.7.x misnaming).
