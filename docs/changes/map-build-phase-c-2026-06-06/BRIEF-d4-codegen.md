# MAP BUILD — PHASE C — DISPATCH D4: codegen (map literal + bracket-read + method lowering — the integration)

(Verbatim archive of the dispatch prompt, per S136. The CAPSTONE — integrates D2a's `MapLitExpr` + D3's `_scrml_map_*` runtime into end-to-end map compilation. After D4, the §59 Nominal banner can flip.)

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full + **`docs/changes/map-build-phase-c-2026-06-06/SURVEY-SYNTHESIS.md` (the D4 section — exact fire-sites, the `.advance`/`engineVarNames` interception template, and the load-bearing Q1/Q2 design calls)**. Maps reflect `4c8063b6`; source current. Report `Maps consulted: …; load-bearing finding: …`.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
1. `pwd` starts with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90). Save `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` == `WORKTREE_ROOT`.
3. **`git -C "$WORKTREE_ROOT" merge main` (S112) — inherit D1 (typer) + D2a (`MapLitExpr` parser) + D3 (`_scrml_map_*` runtime).** Confirm post-merge: `grep -c '_scrml_map_from_entries' "$WORKTREE_ROOT"/compiler/src/runtime-template.js` ≥ 1 AND `grep -c '"map-lit"' "$WORKTREE_ROOT"/compiler/src/expression-parser.ts` ≥ 1. Conflicts → STOP.
4. `git status --short` clean. 5. `bun install`. 6. `bun run pretest`.
**Path discipline (S99/S126):** edits via Bash on worktree-absolute paths; NEVER `cd` into main; `git -C "$WORKTREE_ROOT"` + worktree-absolute paths only. **First commit: `WIP(d4): start at <pwd>`.** ⚠ COMMIT TINY + OFTEN (two prior phase-c agents hit the 600s watchdog on long silent stretches — commit each unit immediately; keep output flowing).

# TASK — lower the value-native map to JS (§59.6/§59.7) — the integration
Read SPEC §59 IN FULL + the SURVEY-SYNTHESIS D4 section FIRST (Rule 4). **CRITICAL FIRST STEP: read D3's runtime helpers in `compiler/src/runtime-template.js` (grep `_scrml_map_`) to learn the EXACT signatures + the map value shape `{ __scrml_map, entries, ordered, order? }` — your emitted calls MUST match them.** Also read D2a's `MapLitExpr`/`MapEntry` shape in `compiler/src/types/ast.ts`.

Key fact (the load-bearing constraint, SURVEY-SYNTHESIS D4 Q2): **codegen re-parses expressions and has NO resolved type at the emit site.** So the map-vs-array branch CANNOT key on a resolved type — it keys on a NEW name-set `mapVarNames: Set<string>` collected by an AST walk + threaded through `EmitExprContext`, **exactly mirroring `engineVarNames`** (collected by `collectEngineVarNames`, populated at `emit-reactive-wiring.ts` ~266/312, read in `emitMember`/advance at `emit-expr.ts` ~1158-1170).

## Scope

1. **`collectMapVarNames(fileAST)`** — mirror `collectEngineVarNames`. A cell is a map iff: (a) its state-decl/let/const type annotation resolves to a `[K:V]` map type (reuse `findMapEntryColon`/the `[...:...]` shape recognizer — or import the typer's check), OR (b) its RHS is a `MapLitExpr` (`<m> = ["a": 1]` makes `m` a map even without an annotation). Thread `mapVarNames` into `EmitExprContext` (populate alongside `synthCellKeys`/`engineVarNames` at `codegen/index.ts` ~805 + `emit-reactive-wiring.ts`).

2. **Map-literal lowering** — `MapLitExpr` → `_scrml_map_from_entries(...)` matching D3's signature (read it — likely an array of `[k, v]` pairs or `{k,v}`). `[:]` (empty entries) → an empty map. Wire into `emitExpr` (the `map-lit` case — currently `emitStringFromTree` round-trips it to `[k: v]` text, which is NOT valid JS; D4 replaces that with the runtime call at the JS-emit site). **Struct/enum-key literals (§59.3 M-cut): the W-MAP-STRUCT-KEY-LITERAL already fired at parse (D2a); for v1, emit primitive-key literals via from_entries; a struct-key literal is codegen-deferred per §59.3 — read §59.3 + either emit-if-trivial (the runtime hashes any key) or defer with a clear path to `.insert`. Decide + document.**

3. **Bracket-READ lowering** — `@m[k]` (IndexExpr whose root object resolves to a `mapVarNames` cell) → `_scrml_map_get(<receiver>, <key>)` returning `V|not` (D3 returns `null` on miss → composes with `given`/`is some`). Intercept in `emitIndex` (`emit-expr.ts` ~1109). **Q1 — nested-map read `@outer["a"]["b"]` (the survey's open call):** the inner map-ness is a value type invisible to the name-set. RESOLUTION: when the ROOT of an index chain is a `mapVarNames` cell, lower the WHOLE chain as nested `_scrml_map_get` calls (`_scrml_map_get(_scrml_map_get(outer, "a"), "b")`) — assume nested brackets on a map root are map-reads. (Confirm D3's `_scrml_map_get` on a non-map returns `null` gracefully rather than throwing, so a mis-assumed nested read degrades safely; if it throws, add a guard. Report which.)

4. **Map-METHOD lowering** — a `CallExpr` whose callee is `@m.<method>(...)` where `@m` ∈ `mapVarNames` → the matching `_scrml_map_<method>(<receiver>, ...args)`. Intercept in `emitCall` (mirror the `.advance` interception at ~1158-1170). Map ALL of: `.get/.has/.getOr/.insert/.remove/.update/.insertAll/.size/.keys/.values/.entries/.sorted/.sortedBy` → D3's `_scrml_map_*` names (match exactly; note D3 uses snake_case e.g. `_scrml_map_get_or`/`_scrml_map_insert_all`/`_scrml_map_sorted_by` — map the camelCase surface method to the snake_case helper). The WRITE methods return a new map; `@m = @m.insert(k,v)` rides the EXISTING reactive-reassignment path (the `@m =` lowers to `_scrml_reactive_set` already — confirm zero new reactivity needed).

5. **`detectRuntimeChunks` 'map' trigger** — D3 registered the `'map'` chunk + markers in `runtime-chunks.ts`. Wire the DETECTION so the `'map'` chunk is EMITTED when the output uses any `_scrml_map_*` / `_scrml_value_canonical` (find how `detectRuntimeChunks` decides which chunks to include — marker-scan of emitted JS, or codegen flags). ⚠ Without this, a map-using build → `ReferenceError` (chunk tree-shaken away). This is the #1 integration risk (SURVEY-SYNTHESIS D4 R2).

6. **`W-MAP-ITERATION-ORDER`** (Info, §59.11) — iterating a non-`@ordered` map's `.entries()`/`.keys()`/`.values()` (e.g. in an `<each in=@m.entries()>`) without `.sorted()`, where order may matter. Info → `result.warnings` (W- prefix auto-partitions, api.js:2403). Best-effort lint; if non-trivial to detect the iteration site, scope to the obvious `<each in=@m.entries()>` case + report.

## VERIFICATION (before DONE) — END-TO-END now works (R26 APPLIES)
1. Full `bun run test` — baseline (post-D3; ≈23,226/921 — confirm the actual baseline first via `bun run test` BEFORE editing). ZERO regressions.
2. NEW codegen-unit tests: map-literal → `_scrml_map_from_entries`; `@m[k]` → `_scrml_map_get`; `@m.insert(k,v)` → `_scrml_map_insert`; each method maps; emitted JS `node --check` clean.
3. **R26 END-TO-END (NOW APPLIES — the first real map compile):** write a REAL `.scrml` map example (e.g. a `<fareByLane>: [string: Money] = [:]` cell + `.insert`/`@m[k]`-read/`<each in=@m.entries() as e>` iteration) and add it to `samples/compilation-tests/` (this is the first end-to-end map source). Compile it via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <file>`; confirm: NO codegen errors, emitted client JS `node --check` clean, the `'map'` chunk is present in the output (grep `_scrml_map_` in the emitted JS), AND the map operations produce correct results (a happy-dom or node runtime check: insert + read-back + iterate). **DO NOT mark DONE without this end-to-end verification passing.**
4. within-node parity — a codegen change on map samples could shift it; run + report (a NEW map sample adds to the corpus → the within-node count may legitimately grow by 1; confirm no REGRESSION on existing samples).

## DEFER (v1)
- Native-path codegen (native is shadow-only; D2b is the native parser follow-on).
- `as (k,v)` iteration sugar (D2c).
- `set` (D5).
- HAMT (D3 plain-object clone-on-write).

## COMMIT DISCIPLINE (S83) — reinforced
Commit per unit (collector; literal lowering; read; methods; chunk trigger; lint; the e2e sample+test). `git diff`→`git add`→commit each immediately. Clean `git status` before DONE. Update `progress.md` per unit.

## REPORT (raw structured text)
`WORKTREE_PATH` · `FINAL_SHA` · `FILES_TOUCHED` · merge-startup result (all 3 prereqs present?) · full-suite + within-node counts · per-piece status (1-6) · **the END-TO-END R26 result** (compile + node --check + 'map' chunk present + runtime correctness) · Q1 nested-read resolution (does `_scrml_map_get` degrade safely on non-map?) · struct-key-literal codegen decision · deferred items · maps feedback.
