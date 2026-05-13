# §13.2 Sub-Phase C — CLOSURE

**Status:** CLOSED-AS-NO-OP. SCOPING §6 Sub-Phase C scope was already
substantially delivered by Sub-Phase B Step 3 (commit `39eba45`,
`feat(s89-§13.2-B): auto-await for stdlib Promise<T> — classifier + lint + tests`).

This closure doc maps each SCOPING Sub-Phase C item to its as-landed
disposition, surfaces two residual gaps that are NOT in Sub-Phase C scope, and
recommends they be tracked as separate follow-ons.

---

## §1 SCOPING Sub-Phase C → `39eba45` mapping

SCOPING §6 Sub-Phase C lists four items (lines 327-335 of SCOPING.md):

| # | SCOPING item | Disposition | Landed at |
|---|---|---|---|
| 1 | Rename `isServerCallExpr` → `isPromiseReturningCallExpr` (or extend behavior) at `scheduling.ts:96-115` | **DONE (extension, not rename)** | `scheduling.ts:252-309` — new `isPromiseReturningCallExpr` added alongside `isServerCallExpr`; both coexist for backwards-compat. |
| 2 | Rename `hasServerCallees` → `hasPromiseReturningCallees` at `scheduling.ts:44-68` | **DONE (extended in-place)** | `scheduling.ts:105-172` — optional `calleeMap` + `exportRegistry` params; functionally generalizes when threaded, falls back to pre-S89 server-only behavior when null. |
| 3 | Predicate consults `_returnsPromise` annotation in addition to routeMap | **DONE (different mechanism)** | SCOPING proposed `_returnsPromise` on CallExpr; landed mechanism uses `isAsync` flag on `exportRegistry` value-map (per Sub-Phase B Step 2). Predicate consults via `isPromiseReturningStdlibFn(name, sourceModule, exportRegistry)` from `module-resolver.js`. Same outcome. |
| 4 | Detect explicit `await` at developer call site and skip double-emission (handles existing two-step pattern — see §4.5) | **NOT APPLICABLE** | scrml source forbids `await` (§13.1); stdlib `.scrml` files are TAB-only parsed (STDLIB-EXPORT-SEED, api.js Stage 3.105) and never reach scheduling.ts codegen — only JS shims (`compiler/runtime/stdlib/*.js`) are bundled. Regression guard in test §7 asserts emitted JS never contains `\bawait\s+await\b`. |

All four items closed. No remaining Sub-Phase C work.

---

## §2 Auto-await emission paths (post-`39eba45`)

For posterity, the two operative await-emission paths in `scheduling.ts`:

### §2.1 Sequential single-stmt branch (`scheduling.ts:501`)

Uses broad `isPromiseReturningCallExpr(stmt, routeMap, filePath, calleeMap, exportRegistry)`.
Covers `bare-expr`, `let-decl`, `const-decl` with stdlib Promise<T> callees in
the sequential emission loop (active when `fnHasServerCalls === false` OR
when a server-fn-containing function is processed but the current statement
isn't part of a multi-stmt Promise.all group).

### §2.2 Promise.all coalescing branch (`scheduling.ts:473,480`)

Gated on narrow `hasServerCallees(fnNode, routeMap, filePath, null, null)` at
line 371 (deliberately passing `null, null` for the stdlib classifier inputs).
Pre-S89 behavior preserved exactly: only actual server-fn fetch call sites
trigger Promise.all coalescing.

**Rationale** (scheduling.ts:364-370): the DG has no awaits edges between
stdlib calls; broadening the Promise.all gate would emit invalid groupings.
Stdlib parallelization is deferred to a follow-on (see §3.1 below).

### §2.3 emit-logic.ts `case "guarded-expr"` (`emit-logic.ts:2295-2311`)

Threaded via `asyncRouteMap`/`asyncCalleeMap`/`asyncExportRegistry`/`asyncFilePath`
options. Delegates to `scheduling.ts:isPromiseReturningCallExpr` (single source
of truth). Emits `let _scrml_result = await initExpr;` when classifier
matches; emits `let _scrml_result = initExpr;` (pre-S89) otherwise.

### §2.4 emit-functions.ts integration (`emit-functions.ts:91-92,431,481`)

- `buildCalleeImportMap(ctx.fileAST.ast)` built ONCE per file (line 91-92).
- Threaded into `hasServerCallees` (line 431) — drives `async function` prefix.
- Threaded into `scheduleStatements` (line 481) — drives auto-await emission.

---

## §3 Residual scope (NOT in Sub-Phase C, NOT v0.3.0-blocking)

### §3.1 Stdlib Promise.all parallelization

**Observation.** Independent stdlib Promise<T> calls in the same function body
emit as sequential `await x; await y;` rather than `await Promise.all([x, y])`.

**Status.** Deliberate per scheduling.ts:364-370. DG has no `awaits` edges
between stdlib calls. Broadening the Promise.all gate (line 371) without first
teaching DG to emit awaits edges for stdlib Promise<T> calls would produce
invalid Promise.all groupings.

**Estimated effort.** Moderate (2-4h):
1. Extend `compiler/src/dependency-graph.ts` to emit `awaits` edges for
   stdlib Promise<T> CallExpr sites (mirror server-fn awaits-edge logic).
2. Narrow the gate at scheduling.ts:371 to pass `calleeMap`/`exportRegistry`
   through (currently passes `null, null`).
3. Add conformance test:
   `compiler/tests/conformance/auto-await-stdlib-promise-all.test.js` —
   two independent `safeCallAsync` calls coalesce.

**Recommendation.** Track as separate follow-on. NOT a v0.3.0 blocker — the
correctness path (sequential await) is already in place; this is a
performance-only optimization.

### §3.2 Non-failable Promise<T> sites without `!{}`

**Observation.** `const x = hashPassword(pw)` without a `!{}` guard does NOT
auto-await — the function isn't even wrapped in `async function`. Verified
via spot-check compile:

```scrml
<program>
${
  import { hashPassword } from "scrml:auth"
  function caller() {
    const x = hashPassword("test")
    return x
  }
}
<button onclick=caller()>Go</button>
</program>
```

Emits:

```js
function _scrml_caller_3() {
  const x = hashPassword("test");
  return x;
}
```

(no `async function`, no `await`.)

**Status.** This is the **pre-S89 server-fn invariant** — verified that a
server-fn equivalent (`const x = load()` where `load()` is a server function)
emits the same shape (no `async`, no `await`). The auto-await only fires for
`bare-expr` (no init) or `!{}` form.

**Estimated effort.** Small (1-2h) — extend `emit-logic.ts` `case "let-decl"`
and `case "const-decl"` to consult the classifier and prefix `await` when
appropriate. But this is a **pre-S89 gap** and not part of Sub-Phase C scope.

**Recommendation.** Track as separate follow-on. NOT a v0.3.0 blocker because
adopters use the `!{}` form (S88 ratified pattern) which DOES auto-await
correctly.

---

## §4 Tests

`compiler/tests/unit/auto-await-promise-stdlib.test.js` — 9 tests, all pass at
HEAD `39eba45`. No new tests needed for Sub-Phase C closure.

Baseline (HEAD `39eba45`): 11,207 pass / 88 skip / 1 todo / 0 fail (per Sub-Phase B
Step 4 progress note; full `bun test compiler/tests/` yields 11,949 pass /
117 skip / 1 todo / 0 fail when bound-tracking subdirectories are excluded).

---

## §5 References

- SCOPING: `docs/changes/§13.2-auto-await-stdlib-scoping/SCOPING.md`
- Sub-Phase A (SPEC): commit `67a6a81`
- Sub-Phase B Step 1 (AST `isAsync`): commit `503c3b4`
- Sub-Phase B Steps 1c + 2 + 3 + 4 (closure): commit `39eba45`
- Sub-Phase B progress notes: `docs/changes/§13.2-impl-phase-B/progress.md`

## §6 Maps consulted

- `.claude/maps/primary.map.md` — full read.
- `.claude/maps/domain.map.md` — pipeline stages + boundaries.
- `.claude/maps/structure.map.md` — codegen subdirectory inventory.
- `.claude/maps/test.map.md` — coverage taxonomy.

**Load-bearing finding.** Sub-Phase B Step 3 (commit `39eba45`) delivered
the entire SCOPING §6 Sub-Phase C scope. The renames described in SCOPING
landed as in-place extensions, and the `_returnsPromise` CallExpr annotation
described in SCOPING was implemented as an `isAsync` flag on the
exportRegistry value-map (a more efficient location that doesn't bloat every
CallExpr node). Items 1-3 of Sub-Phase C scope: DONE. Item 4 (explicit-await
double-emission): NOT APPLICABLE (scrml source forbids explicit `await`;
stdlib `.scrml` files don't reach scheduling.ts).
