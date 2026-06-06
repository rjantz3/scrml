# Progress — cycles-prereq COW-all bracket-write + seen-set guard (S168)

## 2026-06-06 — Startup
- WORKTREE_ROOT: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a938bb754f790271a
- Branch: worktree-agent-a938bb754f790271a
- HEAD at start: 7c3f4e6b (docs/maps-only since 75431e9e source)
- git merge main: Already up to date.
- bun install: 204 packages OK
- bun run pretest: 13 samples compiled OK
- Baseline `bun run test`: 23075 pass / 0 fail / 220 skip / 1 todo (clean run).
  - NOTE: one interactive run showed transient "2 fail" in value-indexed-subscribers /
    bug-k-sync-effect-throw — re-ran those 2 files in isolation: 24 pass / 0 fail. The "boom"
    stack traces are EXPECTED test output (deliberate effect-throws). Classified flaky/transient,
    not pre-existing failure.
- Maps consulted: primary.map.md (full). Routing → codegen + parser-LIVE shape.

## Next: Phase 0 CONFIRM gate

## 2026-06-06 — Phase 0 CONFIRM gate (PASS → proceed to Landings)

### Tokenizer facts (tokenizeLogic probe)
- `[` `]` are PUNCT. `@arr[0]` → NUMBER text "0"; `@m["DAL"]` → STRING text "DAL" (unquoted);
  `@arr[@sel]` → AT_IDENT (computed). Mixed `@obj.field[i].x` tokenizes as expected.

### Two parser sites produce reactive-nested-assign (BOTH need bracket generalization)
- ast-builder.js:5503 (inside parseOneStatement) — primary statement dispatch. Bracket-write
  `@arr[0]=@arr` currently FALLS THROUGH to bare-expr fallback (~5722) → raw in-place write. CONFIRMED.
- ast-builder.js:8562 (parseLogicBody secondary export/type dispatch loop) — near-identical dotted
  collector. Apply same generalization for parity (shared helper to avoid drift).

### CONFIRM table — consumers of reactive-nested-assign .path / .target
| Consumer | site | reads | heterogeneous path safe? | action |
|---|---|---|---|---|
| codegen/emit-logic.ts | 3003 | path,target,valueExpr | NEEDS CHANGE (Landing 3) | piecewise array-literal build |
| codegen/emit-client.ts | 928 | kind only | YES (no path read) | none |
| symbol-table.ts checkReactiveNestedAssign | 3582 | target,path (prefix-resolve) | YES — resolveReceiverRecord/lookupQualifiedStateCell use Map.get(string); object key → null, walks shorter prefix; no crash | cosmetic: map computed seg → "[…]" in fired tail to avoid [object Object] in E-DERIVED-VALUE-MUTATE msg |
| symbol-table.ts checkSynthNestedAssignFire | 4776 | target,path,leaf | YES — guards `typeof property !== "string"` returns false; findDeepest won't match object | none (already guarded) |
| body-dg-builder.ts | 398 | target,valueExpr | YES (no path read) | ADD index-expr read facts (correctness, additive) |
| route-inference.ts | 2140 + 1190 EXPR_NODE fields | valueExpr only | YES (no path read) | ADD index-expr walk (correctness, additive) |
| type-system.ts terminal-mutation | 7230 | target,path[0] msg | YES — only fires for engine state-type targets (not arrays); path[0] in msg | cosmetic guard: render computed → "[…]" |
| type-system.ts lifecycle 15677 | 15677 | target,path[0] Map key | YES — Map.has(object)=false → skip; correct no-op | none |
| type-system.ts lifecycle 16911 | 16917 | target only | YES (no path read) | none |
| component-expander.ts | 1610 | spread + valueExpr | YES (...n preserves path) | ADD computed-index subInExpr (correctness, additive) |
| types/ast.ts | 757 | path: string[] | NEEDS CHANGE (Landing 3) | widen to (string|{index:ExprNode})[] |

### runtime confirmations
- _scrml_deep_set (runtime-template.js:1543): clones array seg ([...obj]) + object seg ({...obj}),
  dynamic current[key]. NO CHANGE needed — clone breaks self-ref → stale snapshot (acyclic). CONFIRMED.
- _scrml_structural_eq (runtime-template.js:2491): no seen-guard → RangeError on cyclic. NEEDS Landing 1.
  Inline copy duplicated in equality-semantics.test.js:213-247 (+ §33 SCRML_RUNTIME contains check) —
  must update inline copy to match + add cyclic-termination tests.

### Phase-0 VERDICT: PASS. Heterogeneous (string|{index:ExprNode})[] cleanly covers all consumers.
No consumer GENUINELY breaks. The cosmetic [object Object] message risks + missing index-expr
dependency tracking are ADDITIVE correctness improvements, not breakers. PROCEED to Landings 1-3.

## 2026-06-06 — Landing 1 DONE: seen-set guard in _scrml_structural_eq
- runtime-template.js:2491 — threaded optional `seen` (WeakMap<object,WeakSet<object>>) keyed on `a`.
  Records (a,b) pair on entering object branch; revisit → return true (assume-equal-on-revisit).
  a===b fast-path + all array/enum/struct logic preserved. Backticks removed from comment (whole
  runtime lives inside a backtick template literal — raw backtick breaks it).
- equality-semantics.test.js: inline copy updated to match; +5 cyclic-termination tests; +§34 runtime
  contains seen-guard regression. 39 pass / 0 fail. SCRML_RUNTIME loads OK.

## 2026-06-06 — Landings 2+3 DONE: parser bracket-write + AST/codegen computed segments
- ast-builder.js: NEW shared `collectAtPathSegments()` helper (after safeParseExprToNode ~L2496) —
  heterogeneous (.ident | [idx])+ collector. Literal index (NUMBER/STRING) → STRING segment;
  non-literal → {index:ExprNode, raw}. Returns {segments, reconstruct} (faithful source for READ
  bare-expr fallback). Applied to BOTH AT_IDENT dotted-path collectors (parseOneStatement ~L5584 +
  parseLogicBody export/type loop ~L8632). Entry condition now `. || [`. Array-mutation gated on
  `typeof lastSeg === "string"` (bracket index never collides).
- ast-builder.js: S167 boundary recognizer (~L2847) extended — chain-walk now accepts `[idx]`
  (bracket-depth-aware skip) so a bracket-WRITE following another statement is recognized as a NEW
  statement (multi-statement write-loss class, generalizing S167 to bracket targets).
- types/ast.ts: ReactiveNestedAssignNode.path widened string[] → (string | {index?:ExprNode; raw?})[].
- codegen/emit-logic.ts: reactive-nested-assign builds path as a piecewise JS array literal —
  JSON.stringify(string) for string segs, emitExprField(seg.index) for computed. _scrml_deep_set
  UNCHANGED (clone-then-set already breaks self-ref → acyclic snapshot).
- Consumer additive correctness fixes (Phase-0 identified):
  - symbol-table.ts checkReactiveNestedAssign: computed seg → "[…]" in E-DERIVED-VALUE-MUTATE tail.
  - type-system.ts terminal-mutation: computed first seg → "[…]" in E-STATE-TERMINAL-MUTATION msg.
  - body-dg-builder.ts: collect computed-index ExprNode reads into facts.reads.
  - route-inference.ts: walk computed-index ExprNodes (route/server refs in index not invisible).
  - component-expander.ts: substitute props into computed-index ExprNodes too.

### R26 EMPIRICAL VERIFICATION (Phase 3 — PASS)
| probe | source | expected emit | actual | node --check |
|---|---|---|---|---|
| A | `@arr[@sel] = 99` | `_scrml_deep_set(..., [_scrml_reactive_get("sel")], 99)` | MATCH | exit 0 |
| B | `@arr[0] = @arr` | `_scrml_deep_set(..., ["0"], _scrml_reactive_get("arr"))` (COW, NOT raw in-place) | MATCH; no raw `[0]=` write | exit 0 |
| C | `@m["DAL"] = 99` | literal string idx → `["DAL"]` string seg | MATCH | exit 0 |
| D | `@grid[@r][@c] = 9` | two computed segs `[get("r"), get("c")]` | MATCH | exit 0 |
| Read | `let x = @arr[@sel]` | reconstruct `_scrml_reactive_get("arr")[_scrml_reactive_get("sel")]` (NOT COW) | MATCH | exit 0 |
| Multi | `@a[0]=10;@b.k=20;@a[1]=30` | all 3 writes survive | MATCH (3 deep_set calls) | exit 0 |
- Runtime harness (probeB COW simulation): arr[0]!==arr (stale snapshot), JSON.stringify no throw → NO live cycle.
- seen-guard: equality-semantics 39/0 incl. 5 cyclic-termination tests; SCRML_RUNTIME carries guard.
- Targeted regression slice (deepset/derived-mutate/synth/component/route/dg/terminal): 504 pass / 0 fail.

## 2026-06-06 — Tests + locked-test correction
- LOCKED TEST corrected: compiler/tests/integration/parse-mutation-shapes.test.js §M10.4 asserted
  the OLD cycle-capable shape (`@arr[0]="x"` → bare-expr, target.kind=index). That test was LOCKING
  the exact bug the brief fixes. Updated to assert the new COW shape (reactive-nested-assign,
  target:"arr", path:["0"], valueExpr lit "x"). Per pa.md Rule 4 + S96 (locked tests can lock
  spec-divergent behavior). §M10.9 (`delete @arr[i]`) is a DELETE not a write — correctly stays
  bare-expr (no change). §B8.5 (derived-value-mutate `@derived[0]=99`) still fires E-DERIVED-VALUE-MUTATE
  correctly through the new COW path (literal index → string segment, clean diagnostic).
- NEW compiler/tests/unit/cow-bracket-write-emit.test.js — 7 emit-shape tests (computed index, literal
  numeric/string index, nested computed, mixed dotted+bracket, bracket-READ-not-COW, multi-statement
  survival). 7/0.
- NEW compiler/tests/browser/browser-cow-bracket-write.test.js — 3 happy-dom RUNTIME acceptance
  (node --check, computed-index write applies arr[1]=99, self-ref @arr[0]=@arr → NO live cycle:
  arr[0]!==arr + stale [1,2,3] snapshot + JSON.stringify terminates). 3/0.
