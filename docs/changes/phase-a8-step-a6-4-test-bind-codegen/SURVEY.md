# A8 / A6-4 — `test-bind` Codegen — Phase 0 Survey

**Session:** S75. Date: 2026-05-09.
**Worktree:** `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-af981a0ab2b2a4e2f`
**Starting baseline:** 10,735 / 69 / 1 / 3 (3 fails pre-existing self-host parity).

---

## 1. SPEC re-read summary

- **§19.12.6** — `test-bind` declaration syntax. Body-scope-only at `~{}`.
  RHS is any expression; typer (A6-3, SYM PASS 18) discriminates handler vs
  return-stub via `bindKind` annotation on the IR.
- **§19.12.7** — Dispatch contract:
  - `output.testMode` ON → every server-fn call site emits a guarded dispatch.
    - Bound: invoke binding (handler form: call with args; return-stub form:
      ignore args, return value verbatim).
    - Unbound: fire `E-TEST-006` and halt the test execution.
  - `output.testMode` OFF (production) → 0-byte cost. Dispatch hook,
    dispatch table, and `E-TEST-006` runtime check are ALL DCE'd; production
    binary is bit-identical to a no-`test-bind` compilation.
  - Keys are §47-encoded server-fn names. "No new naming scheme."
- **§47.5** — cross-ref affirms that the dispatch table keys ride on the
  encoded-name surface from §47.1–§47.4.
- **§34** catalog row for `E-TEST-006` — Test severity, fail-fast.

---

## 2. Architectural insight — where the dispatch hook lives

**Critical discovery:** the dispatch hook lives entirely in the generated
**test JS** (`<base>.test.js`), NOT in `clientJs` / `serverJs`.

### Reasoning

1. `~{}` test blocks compile to a separate `test.js` artefact via
   `generateTestJs()` (`compiler/src/codegen/emit-test.ts`). This artefact is
   only emitted when `ctx.testMode === true` (`compiler/src/codegen/index.ts:715`).
2. The production binary (clientJs + serverJs + html) is what ships to
   browsers / servers. `test.js` is NEVER part of the production binary.
3. Therefore "0-byte production cost" is achieved structurally: when
   `testMode === false`, `generateTestJs()` returns `null` and no test.js
   is written. The dispatch hook is ENTIRELY ELIDED — the production
   `clientJs` does not need any `if (false)` gating; it never sees the
   dispatch hook at all.
4. SPEC §19.12.7 phrase "every server-function call site in the
   compilation unit emits a guarded dispatch" — the **compilation unit
   for `~{}` test blocks is the test JS file**. Server-fn call sites
   inside test bodies live in test JS. Server-fn call sites in production
   code (markup event handlers, reactive bindings, etc.) live in clientJs
   and are NEVER part of a `~{}` block — they are out of scope for
   `test-bind` dispatch.

### Practical interpretation of §19.12.7 normative claims

- "every server-function call site … emits a guarded dispatch" → applies
  to call sites inside test-body source-text (which become call sites in
  `test.js` after raw-token emission).
- "the production binary is bit-identical to a compilation that contained
  no `test-bind` declarations" → trivially satisfied: `test-bind` declarations
  affect ONLY `test.js`, and `test.js` is not part of the production binary.

---

## 3. Server-fn call-site current shape

### Production (clientJs)
- `compiler/src/codegen/emit-functions.ts:89` — `emitFunctions()` builds
  `fnNameMap: Map<original-name, mangled-name>` for every server-boundary
  function (fetch stubs, CPS wrappers, SSE EventSource stubs).
- `compiler/src/codegen/emit-client.ts:765-772` — post-processes `clientCode`
  with a regex that rewrites bare server-fn calls
  (`fetchUser(...)` → `_scrml_fetch_fetchUser_3(...)`).

### Test (test.js)
- `compiler/src/codegen/emit-test.ts` — emits `describe`/`test`/`expect`
  block from `TestGroup[]` IR. Test body statements are emitted **verbatim**
  (raw token-joined source strings). Asserts emit as `expect(lhs).toEqual(rhs)`
  with `lhs`/`rhs` being raw source expressions.
- Currently: a server-fn call inside a test body emits as the bare
  source identifier — `fetchUser(...)` — with no implementation in scope.
  The test file does NOT import the fetch stubs from `client.js`. So today,
  any `~{}` block that calls a server-fn would fail at runtime with a
  ReferenceError. `test-bind` is the canonical fix.

---

## 4. testMode flag plumbing

- `compiler/src/codegen/context.ts:34` — `testMode: boolean` on `CompileContext`.
- `compiler/src/codegen/index.ts:145, 437, 506` — threaded through `runCG()` →
  per-file CompileContext.
- `compiler/src/codegen/index.ts:714-717` — `generateTestJs()` is called
  ONLY when `testMode === true`. Otherwise `testJs = null` and no test JS
  is written.

This confirms the dispatch hook only needs to exist within the testJs
emission path, gated by `testMode`. No DCE machinery required.

---

## 5. §47 encoded-name surface in test JS

- `compiler/src/codegen/type-encoding.ts:415-466` — `EncodingContext.encode()`.
  When `enabled === false` (default), `encode(name)` returns `name` as-is.
- Test bodies emit raw source identifiers (e.g. `fetchUser`). For dispatch
  to work in test JS, the natural keying mechanism is the source-level
  identifier — which is exactly what `encode()` returns when encoding is
  not enabled, and what the source emits anyway.
- Per SPEC §19.12.7 "No new naming scheme is introduced" — using the
  source-level identifier as the dispatch key honours this directive: it
  IS the naming scheme that already keys server-fn references in test bodies.
- When encoding IS enabled and the test body's source-level `fetchUser`
  would map to `_f7km3f2x00` in client.js — this still doesn't apply to
  test.js because test bodies aren't subjected to the client.js regex
  rewrite. Test JS uses developer-readable names.

**A6-4 design decision:** dispatch table keyed by source-level identifier.
This matches the actual surface in test.js, satisfies §19.12.7's
"no new naming scheme" directive, and aligns with `EncodingContext.encode()`
passthrough behaviour.

---

## 6. Dispatch-table emission shape proposal

For each `~{}` test block (TestGroup), at the inner `describe(...)` scope,
emit `const`-bindings — one per `test-bind` declaration — that shadow the
bare server-fn names inside the test bodies:

```js
describe("functions (line 5)", () => {
  // Test-bind dispatch (SPEC §19.12.7) — bound server-fns in scope.
  const fetchUser = ((id) => ({ id, name: "Alice" }));   // handler form
  const fetchPosts = (() => [])();                        // return-stub form (literal value)
  // ↑ For return-stub form we wrap in (() => v)() to evaluate v once
  //   per binding emission, NOT per call. The const stores the value.
  //   But callers do `fetchPosts(...)` — call-site is `name(args)`.
  //   So return-stub binding must itself be a function that returns v.

  test("...", () => { ... });
});
```

**Refinement:** because test bodies write `fetchPosts(args)` (call-site
shape), every binding — handler OR return-stub — must produce a callable
value:

```js
// handler form: bind directly to the function
const fetchUser = (id) => ({ id, name: "Alice" });

// return-stub form: wrap the value in a function that ignores args
const fetchPosts = () => [];
```

This is the simplest emission shape and matches §19.12.7's normative
behaviour: handler-form invokes-with-args; return-stub-form ignores-args
returns-value.

### E-TEST-006 fail-fast for unbound server-fns

For server-fns that COULD be called inside a `~{}` block but lack a
binding, emit a thrower const:

```js
const sendEmail = (...args) => {
  throw new Error(
    "E-TEST-006: server function `sendEmail` was called inside a ~{} test " +
    "block at line N but has no `test-bind` declaration in scope. " +
    "Per SPEC §19.12.7, fail-fast over silent passthrough. Add " +
    "`test-bind sendEmail = <stub>` to the ~{} block."
  );
};
```

To know which server-fns to emit thrower-constants for, we need a
"server-fn names in scope" set. Initial implementation: emit thrower-
constants for all SAME-FILE server-fns (via `routeMap.functions`) that
are NOT bound. Cross-file imported server-fns are deferred — the
export-registry lacks `isServer` (per A6-3 SURVEY §2.3 documented
deferral OQ-A6-3-cross-file-server-fn).

**Pragmatic alternative considered and rejected:** emit a Proxy or a
global throwing function wrapper. Rejected because (a) it adds runtime
machinery to test.js that's not present today, (b) the const-shadow
approach works at the lexical scope level which is the natural fit
for "scope-local to the enclosing `~{}` block" per SPEC §19.12.6.

### bindKind discrimination at emission time

A6-3's `bindKind` annotation on each `TestBindDecl` drives the shape:
- `"handler"` → emit `const ${ident} = ${expression};` (RHS already
  evaluates to a function).
- `"return-stub"` → emit `const ${ident} = (...) => (${expression});` —
  the lambda ignores args and returns the literal value.
- `undefined` (defensive default) → treat as `"return-stub"` per
  IR comment in `ir.ts:188-191`.

---

## 7. Test corpus location

- Primary unit tests for emit-test.ts: `compiler/tests/unit/emit-test.test.js`
- A6-2 parser tests: `compiler/tests/unit/test-bind-parser.test.js`
- A6-3 typer tests: `compiler/tests/unit/test-bind-typer.test.js`
- A6-4 codegen tests will go in: **`compiler/tests/unit/test-bind-codegen.test.js`** (new file).

---

## 8. Estimated revised scope

Per the analysis above, A6-4 is significantly **simpler** than the
original dispatch guidance suggested:

- **NOT** modifying clientJs / serverJs at all.
- **NOT** building a runtime dispatch table object with conditional
  lookup at every call site.
- **NOT** introducing new runtime machinery for E-TEST-006 (a `throw new
  Error(...)` suffices).
- **NOT** building a global testMode dead-code-elimination guard
  (testMode-OFF means generateTestJs() returns null, period).

A6-4 is a focused extension to `emit-test.ts`:
1. Read `group.testBinds[]` from each TestGroup.
2. Emit `const`-bindings (one per binding, kind-discriminated by
   `bindKind`) at the start of each inner describe block.
3. Emit `const`-throwers for same-file server-fns that lack a binding,
   so `E-TEST-006` fires when an unbound server-fn is called inside the
   test body.
4. To enumerate same-file server-fns, accept an optional parameter to
   `generateTestJs()` (e.g. `serverFnNames: string[]`) and have
   `runCG()` populate it from `routeMap.functions`.

Estimated: **2 commits** (Phase 1 dispatch-table emission + thrower stubs;
Phase 2 tests). Test delta forecast: **+15 to +20 tests**.

---

## 9. Load-bearing question — 0-byte production cost

**Answer:** achieved structurally via `test.js` separation.

When `output.testMode === false`:
1. `generateTestJs()` is not called (per `index.ts:715` gate).
2. `testJs` is `null`.
3. `test.js` artefact is not written by `api.js`.
4. `test-bind` declarations in source `~{}` blocks are PARSED but never
   reach codegen (the `~{}` block's `testGroup` IR is skipped).
5. The production `clientJs` / `serverJs` outputs are unchanged: the
   server-fn call sites in event handlers, reactive bindings, etc. emit
   exactly the production call shape (fetch stubs / CPS wrappers).

**Verification approach (Phase 4 — DCE check):** compile a sample with
`testMode: false` and another with `testMode: true`, both with `test-bind`
declarations in the source. Assert that:
- `output.clientJs` is byte-for-byte identical between the two.
- `output.serverJs` is byte-for-byte identical between the two.
- `output.testJs` is null in the testMode-false case, non-null in
  testMode-true case.

---

## 10. Open questions surfaced

### OQ-A6-4-async-binding
SPEC §19.12.7 is silent on async semantics. If the bound server-fn is
async (Promise-returning) and the test-bind RHS is a sync function, what
happens? The dispatch SHALL invoke the binding "instead of the production
server-fn call" — verbatim semantics suggest no Promise-wrapping is added
by the compiler. Caller (test body) is responsible for awaiting if needed.

**Resolution at A6-4:** emit the binding verbatim. A handler-form binding
is invoked with the call-site args; if the binding is sync, the test
sees the sync result. No Promise auto-wrapping. SPEC silence accepted as
"verbatim invocation, no auto-wrapping."

### OQ-A6-4-throw-shape
E-TEST-006 emission shape: structured Error object vs string-message
throw vs test-runner-specific failure mechanism (e.g. bun:test's
`expect.fail`)?

**Resolution at A6-4:** plain `throw new Error("E-TEST-006: ...")`. This
matches the existing test-body raw-emission style (no test-runner-
specific magic). bun:test surfaces a thrown error as a test failure,
which is the desired behaviour.

### OQ-A6-4-cross-file-server-fns (inherits OQ-A6-3-cross-file-server-fn)
Cross-file imported server-fns lack an `isServer` discriminator on the
export-registry shape per A6-3 SURVEY §2.3. We can't emit thrower stubs
for them.

**Resolution at A6-4:** scope thrower-stub emission to SAME-FILE server-fns
only. Cross-file server-fns called inside `~{}` without a `test-bind` will
emit a bare reference (e.g. `getRemoteUser(...)`) which will fail at test
runtime with a ReferenceError (not E-TEST-006 specifically). Documented
as a deferral; future enhancement requires propagating `isServer` through
the export registry.

---

## 11. Files to touch

1. `compiler/src/codegen/emit-test.ts` — add binding-emission logic +
   thrower-stub emission. Modify `generateTestJs()` signature to accept
   `serverFnNames: string[]` (optional).
2. `compiler/src/codegen/index.ts` — populate `serverFnNames` from
   `routeMap.functions` and pass to `generateTestJs()`.
3. `compiler/tests/unit/test-bind-codegen.test.js` — NEW. Unit tests for
   the binding emission shape, thrower-stub emission, scope isolation,
   bindKind discrimination, regression of A6-2/A6-3 diagnostics, and
   0-byte production cost (compile both modes, diff outputs).
4. (Possibly) `compiler/tests/unit/emit-test.test.js` — extend if needed
   for shape regression. Likely not needed; new test file covers it.

---

## 12. Phase plan

- **Phase 1 (commit 1):** emit-test.ts dispatch-table emission + thrower-stubs +
  `serverFnNames` plumbing through index.ts. Self-contained codegen change.
- **Phase 2 (commit 2):** unit tests in `test-bind-codegen.test.js`.
- **Phase 3 (verification):** `bun run test` regression check;
  0-byte production cost verification via diff of testMode-on vs
  testMode-off compilation.
