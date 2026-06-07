# D4 — codegen: lower value-native map to JS (§59.6/§59.7)

## Baseline (post-D3, before edits)
- Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a65190cf8922ed026
- Prereqs present: D1 (fbb3c208 typer MapType), D2a (5beb1f55 MapLitExpr parser), D3 (c7bcecf1 runtime _scrml_map_*)
- `bun test compiler/tests/{unit,integration,conformance}` = 0 fail (the pre-commit gate)
- `bun test compiler/tests/{browser,lsp,commands,self-host}` = 0 fail
- `bun run test` (full meta) = 23225 pass / 2 fail — the 2 fails are FLAKY (non-reproducible when sub-suites run in isolation; the meta-script runs migrate-promote concurrently)

## Runtime contract learned (D3, runtime-template.js ~3875-4190)
- Map value shape: `{ __scrml_map:true, entries:{<canonicalKey>:{k,v}}, ordered:bool, order?:[] }`
- `_scrml_map_from_entries(pairs, ordered)` — pairs = array of `[key,value]` 2-arrays; [:] = empty
- `_scrml_map_get(m,k)` returns null on miss AND null on NON-MAP receiver (line 3981) -> Q1 degrades safely
- snake_case helpers: get/has/get_or/insert/remove/update/insert_all/size/keys/values/entries/sorted/sorted_by
- `.size` is a MEMBER access (`@m.size`), lowers to `_scrml_map_size(m)`

## Plan (commit per unit)
1. collectMapVarNames(fileAST) — mirror collectEngineVarNames; signals: [K:V] typeAnnotation OR MapLitExpr RHS
2. map-literal lowering: emitExpr `map-lit` case -> _scrml_map_from_entries
3. bracket-read: emitIndex -> _scrml_map_get (nested chain Q1)
4. method lowering: emitCall -> _scrml_map_<method>; .size member in emitMember
5. detectRuntimeChunks 'map' trigger
6. W-MAP-ITERATION-ORDER lint (best-effort)
7. e2e sample + tests

## DONE units
1. collectMapVarNames + isMapTypeAnnotation (reactive-deps.ts) — committed f84e1d55
2-4. emit-expr lowering: map-lit -> _scrml_map_from_entries; @m[k] -> _scrml_map_get (nested-chain Q1);
   method surface -> _scrml_map_<snake>; @m.size -> _scrml_map_size — committed 69b49d4a
   threading: mapVarNames through emit-logic/reactive-wiring/functions/scheduling/event-wiring/each-iterable — cadeae7e
5. detectRuntimeChunks 'map' trigger via fileHasMapUsage (reactive-deps.ts) — committed b53ac67c
7. R26 END-TO-END: integration test value-native-map-e2e-d4.test.js (inline SRC, self-contained)
   - compiles with NO codegen errors
   - client.js + runtime: node-check / vm.Script valid
   - lowering verified: from_entries / insert / get / size / entries
   - 'map' chunk SURVIVES tree-shaking
   - RUNTIME CORRECTNESS: insert + read-back (4500/3800) + key-miss=null + iterate + Q1 non-map degrade + immutable-overwrite

## Q1 RESOLUTION
_scrml_map_get degrades SAFELY on a non-map receiver (returns null, NO throw — runtime-template.js:3981).
Nested `@outer[a][b]` lowers as nested _scrml_map_get; a mis-assumed nested read yields `not`, not a crash.
Verified at runtime: _scrml_map_get(42, "k") === null, _scrml_map_get(undefined, "k") === null.

## struct-key-literal codegen DECISION (§59.3 M-cut)
EMIT-IF-TRIVIAL chosen. The runtime _scrml_value_canonical hashes ANY §45-comparable key (structs/enums
walked), so a struct-key literal lowers correctly via from_entries. W-MAP-STRUCT-KEY-LITERAL (fired at parse
by D2a) is ADVISORY (names .insert as the recommended v1 shape) but we EMIT the literal rather than fail it —
failing valid hashable keys would be a regression. Documented in emitMapLit docstring.

## within-node parity
A standalone samples/compilation-tests/map-001-fare-by-lane.scrml was created, but it lands in the
parser-conformance within-node corpus (globs samples/) where the NATIVE parser (D2b DEFERRED) can't parse
[:]/[K:V] yet -> residual 102 (SPAN-COORD 42, MISSING-FIELD 33, FIELD-SHAPE 12, EXTRA-FIELD 10, KIND-NAME 3,
COUNT-LENGTH 2). This is a native-parser gap, NOT a D4 regression. Resolution: REMOVED the standalone sample;
the e2e test is self-contained (inline SRC). within-node back to 1005/0. When D2b lands native map parsing,
a parity sample can be added cleanly. DEFERRED: re-add a parity sample post-D2b.

## DEFERRED (v1, per brief)
- Native-path codegen (D2b native parser follow-on) — native can't parse maps yet
- as (k,v) iteration sugar (D2c)
- set (D5), HAMT
- @ordered literal-init propagation (a [:] assigned to an @ordered cell builds unordered; the cell's order
  semantics ride the clone flag on subsequent reassignment — minor v1 gap, documented in emitMapLit)
- W-MAP-ITERATION-ORDER lint (piece 6) — see below
- event-handler ASSIGN-RHS map interception: `@m = @m.insert(...)` as a top-level event handler routes
  through rewriteBlockBody (string path); the common case (function body) works. Single-expr handlers work.

## SURFACED GAP (NOT silently closed — surface to PA) — inline-handler map-assign RHS
`onclick=${@m = @m.insert(k, v)}` (an inline event-handler that is an ASSIGN with a map-method RHS)
lowers via rewriteReactiveAssign (rewrite.ts:2027, the STRING-rewrite pipeline) to
`_scrml_reactive_set("m", _scrml_reactive_get("m").insert(...))` — the RHS `.insert` is NOT map-lowered
(it calls `.insert` on the plain map object → runtime undefined). The string path does NOT reach emitExpr.

WORKING shapes (verified):
  - NAMED function called by handler: `onclick=addFare()` where addFare(){ @m = @m.insert(...) } — CORRECT
    (function body routes through scheduleStatements → emitExpr; this is the e2e-tested canonical shape).
  - ARROW handler: `onclick=${(e) => @m.insert("b", 2)}` — CORRECT (Case B emitExprField → emitExpr).
  - logic-block / derived-init map ops — CORRECT (emit-reactive-wiring threads mapVarNames).

BROKEN shape (rare): inline `onclick=${@m = @m.insert(...)}` (assign-as-handler).
Root cause: rewriteReactiveAssign slices the RHS as a raw string (rewrite.ts:2025-2028); map-method
lowering only happens in emitExpr. Closing it requires threading mapVarNames into rewriteReactiveAssign +
re-parsing the RHS through emitExpr for the assign case — a change to the rewrite.ts string pipeline that
the D4 brief did NOT scope (brief item 4: writes "ride the EXISTING reactive-reassignment path").
Per Rule 3 + no-silent-scope-expansion: SURFACED to PA rather than silently expanded.
Recommended follow-on: a small rewrite.ts change OR convert inline map-assign handlers to named functions
(the canonical scrml handler shape per kickstarter). LOW user impact — the named-function shape is canonical.
