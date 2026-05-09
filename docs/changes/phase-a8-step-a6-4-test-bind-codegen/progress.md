# A8 / A6-4 — `test-bind` codegen — Progress Log

**Session:** S75. Date: 2026-05-09.
**Worktree:** `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-af981a0ab2b2a4e2f`
**Branch:** `worktree-agent-af981a0ab2b2a4e2f` (worktree-as-scratch per S67).
**Starting commit:** `72d691f` (S74 wrap).

---

## Phase 0 — Survey ✅ COMPLETE (commit `0f81021`)

- Read SPEC §19.12.6 (line 11358), §19.12.7 (line 11385), §47.5 (line 18124),
  §47.1 (line 17876), §34 row `E-TEST-006` (line 11448).
- Re-read A6-3 progress + SURVEY at
  `docs/changes/phase-a8-step-a6-3-test-bind-typer/`.
- Mapped:
  - IR shape `TestBindDecl.bindKind` at `codegen/ir.ts:171-205`.
  - `emit-test.ts` `generateTestJs()` at `codegen/emit-test.ts:107`.
  - `testMode` plumbing through `CompileContext` and `runCG()`.
  - `emit-functions.ts` `fnNameMap` rewrite of server-fn call sites in
    CLIENT JS (irrelevant to test JS — different artefact).
- **Critical insight:** dispatch hook lives in test JS (`<base>.test.js`),
  NOT in clientJs/serverJs. Production binary is bit-identical to
  no-`test-bind` compilation because `test.js` is not part of the
  production binary at all (api.js writes it as a separate artefact
  only when testMode is enabled).
- Survey written at canonical path:
  `docs/changes/phase-a8-step-a6-4-test-bind-codegen/SURVEY.md`.

**Baseline tests verified:** 10,735 / 69 / 1 / 3.

---

## Phase 1 — Codegen implementation ✅ COMPLETE (commit `6658eae`)

### `compiler/src/codegen/emit-test.ts`
- Added `emitTestBindDispatch(bind, indent)` helper:
  - `bindKind === "handler"` → `const ${ident} = ${expression};`
  - `bindKind === "return-stub"` → `const ${ident} = () => (${expression});`
    (lambda-wrap so call-site `name(args)` works while ignoring args
    and returning value verbatim per §19.12.7)
  - `bindKind === undefined` (defensive default) → treat as `"return-stub"`.
- Added `emitTestBindThrowerStub(fnName, indent)` helper:
  - Emits `const ${fnName} = (...args) => { throw new Error("E-TEST-006: ..."); };`
  - Error message names the unbound fn, references SPEC §19.12.7, and
    suggests adding a `test-bind` declaration to the `~{}` block.
- Modified `generateTestJs()` signature to accept optional 4th arg
  `serverFnNames: string[]` (default `[]`):
  - For each test group, emits bound `test-bind` dispatches first
    (declaration order), then thrower stubs for any same-file server-fn
    NOT in the bound-set.
  - Emits at the inner describe scope so all test cases in the `~{}` block
    see the bindings; sibling `~{}` blocks have independent describe scopes,
    giving SPEC §19.12.6 scope-isolation for free.

### `compiler/src/codegen/index.ts`
- In the `testMode` test-JS-generation block, added a walk over
  `analysis.fnNodes` to compute `sameFileServerFnNames[]` from
  `routeMap.functions` entries with `boundary === "server"` and a
  matching `${filePath}::${span.start}` nodeId. Threaded through to
  `generateTestJs(filePath, testGroups, [], sameFileServerFnNames)`.

**Self-check after Phase 1:** 10,736 / 69 / 1 / 3 (no regressions).

---

## Phase 2 — Tests ✅ COMPLETE (commit `a425455`)

Created `compiler/tests/unit/test-bind-codegen.test.js`:

- §1 handler-form emission (arrow, zero-arg, ident-bound) — 3 tests
- §2 return-stub-form emission (literal, number, object) — 3 tests
- §3 defensive default for undefined `bindKind` — 1 test
- §4 multiple bindings per `~{}` block, declaration order — 2 tests
  (incl. SPEC §19.12.8 worked example)
- §5 scope isolation across sibling `~{}` blocks — 2 tests
- §6 E-TEST-006 thrower-stub emission — 3 tests
  (incl. error-message content + multiple unbound fns)
- §7 bound server-fns suppress thrower-stub emission — 2 tests
  (incl. cross-block scope isolation)
- §8 empty inputs → no dispatch emission — 2 tests (back-compat shape)
- §9 testBinds without serverFnNames — 1 test
- §10 serverFnNames without testBinds — 1 test
- §11 backward-compat 3-arg signature — 1 test
- §12 end-to-end via `runCG`: bound + unbound + mixed — 3 tests
- §13 0-byte production cost — 2 tests
  (testMode=false → null testJs; clientJs/serverJs bit-identical)

**Total: 26 tests, all passing.**

---

## Final test count

10762 pass / 69 skip / 1 todo / 3 fail. Delta: +26 tests, 0 regressions.
The 3 pre-existing fails are unchanged self-host parity issues
(F-BUILD-002, Bootstrap L3, tokenizer parity) — not introduced by A6-4.

---

## Load-bearing question — 0-byte production cost

**Answer:** achieved structurally via `test.js` separation, NOT via
runtime DCE.

When `output.testMode === false`:
1. `generateTestJs()` is gated behind `if (testMode)` in
   `index.ts:715-737`. Skipped entirely.
2. `testJs` is `null`. The `<base>.test.js` artefact is not written.
3. `test-bind` declarations in `~{}` blocks are PARSED (A6-2) and
   TYPED (A6-3) but never reach codegen — the codegen-side dispatch
   emission code path in emit-test.ts is unreachable when testMode is off.
4. Production `clientJs` / `serverJs` outputs are unchanged: server-fn
   call sites in event handlers, reactive bindings, etc. emit exactly
   the production call shape (fetch stubs / CPS wrappers). The
   `clientJs` post-process regex rewrite (`emit-client.ts:765-772`) and
   `emit-functions.ts` are entirely unaware of `test-bind` declarations.

**Verification:** §13 of `test-bind-codegen.test.js` directly asserts:
- `out.testJs` is falsy when `testMode === false`.
- `out.clientJs` is byte-for-byte identical between a compilation that
  contains a `test-bind` declaration and one that does not (both with
  `testMode === false`).
- `out.serverJs` is byte-for-byte identical between the two.

These tests pass — the 0-byte production cost guarantee is verified.

---

## Files touched

1. `compiler/src/codegen/emit-test.ts` — added test-bind dispatch helpers
   + 4th parameter `serverFnNames` on `generateTestJs()`.
2. `compiler/src/codegen/index.ts` — collects same-file server-fn names
   and threads through to `generateTestJs()`.
3. `compiler/tests/unit/test-bind-codegen.test.js` — NEW. 26 unit tests.
4. `docs/changes/phase-a8-step-a6-4-test-bind-codegen/SURVEY.md` — Phase 0 survey.
5. `docs/changes/phase-a8-step-a6-4-test-bind-codegen/progress.md` — this file.

---

## Deferred for A6-5 / A6-6

**A6-5 (integration tests):** end-to-end compile-and-run a sample
`.scrml` file with `test-bind` declarations and verify the bound dispatches
fire correctly inside `bun:test`. Out of scope for A6-4 (codegen-only).

**A6-6 (API alignment):** any required updates to public CG API or LSP
hover support for `test-bind` declarations. Out of scope for A6-4.

**Cross-file imported server-fns** (inherits A6-3 deferral
OQ-A6-3-cross-file-server-fn): the `exportRegistry` shape lacks an
`isServer` discriminator, so cross-file imported server-fns called
inside `~{}` without a `test-bind` will NOT receive a thrower stub at
A6-4. They will fail at test runtime with a `ReferenceError`. Future
enhancement: propagate `isServer` through `module-resolver.js` so codegen
can emit thrower stubs for cross-file unbound server-fns too. Documented
in SURVEY §10.

---

## Open questions resolved at A6-4

- **OQ-A6-4-async-binding** — SPEC silent on async semantics. Resolution:
  emit binding verbatim, no Promise auto-wrapping. If the bound server-fn
  is async and the binding is sync, the test sees the sync result. SPEC
  silence accepted as "verbatim invocation, no auto-wrapping".

- **OQ-A6-4-throw-shape** — E-TEST-006 emission shape. Resolution: plain
  `throw new Error("E-TEST-006: ...")`. bun:test surfaces thrown errors
  as test failures, fulfilling SPEC §19.12.7 "halt the test execution".
  No test-runner-specific magic.

---

## Self-host parity

NONE in A6-4. The codegen change is to TS code (`emit-test.ts`) that has
no self-host counterpart yet (the self-hosted compiler's CG hasn't reached
the test-bind codegen layer). The self-host parity tests (`scrml-self-host`)
test tokenization / parsing only — not test-JS emission. No drift introduced.

---

## SPEC amendments

NONE. SPEC §19.12.6 / .7 / §47.5 / §34 were sufficient.

---

## Drift surfaced (not fixed in A6-4)

Inherited from A6-2/A6-3: `compiler/src/codegen/errors.ts` lines 30-48
have stale comment-only documentation for E-TEST-001..005 with meanings
that diverge from SPEC §34 — A6-4 does not touch the comment block;
PA-cleanup item from A6-2.

---

## Session summary

- 4 commits on `worktree-agent-af981a0ab2b2a4e2f`:
  1. `0f81021` — Phase 0 SURVEY + progress
  2. `6658eae` — Phase 1 codegen (emit-test.ts + index.ts)
  3. `a425455` — Phase 2 unit tests (test-bind-codegen.test.js)
  4. (this update) — final progress.md

- Total LOC: emit-test.ts +~80, index.ts +~20, test-bind-codegen.test.js +534.
- Test delta: +26 tests, 0 regressions, 3 pre-existing fails unchanged.

A6-4 SHIP. A6-5 and A6-6 remain.
