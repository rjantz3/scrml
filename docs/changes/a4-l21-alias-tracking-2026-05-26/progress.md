# A4 — L21 walker alias-tracking extension

**Dispatch:** S134 A4
**Worktree:** /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a76778d4b5837d646
**Branch:** worktree-agent-a76778d4b5837d646
**Start SHA:** 8fffdeed83a080ca33a708faf2fc339217da8af3

## Plan

- Phase 0: Startup verification + mandatory reading + empirical reproducer verification
- Phase 1: Provenance model proposal (STOP gate for PA review unless exception applies)
- Phase 2: Implementation in compiler/src/symbol-table.ts
- Phase 3: Tests in compiler/tests/unit/l21-alias-tracking.test.js

## Timeline

- [pre-impl] Startup verification PASS. Tree clean. Pretest populated 13 browser samples.

## Phase 0 — verifications COMPLETE

### SPEC reading
- §6.6.18 read in full (lines 3335-3426). Confirmed normative claim "**value-immutable from the developer's perspective**" + explicit "Forms NOT covered (legal): Local copies are mutable: `let local = [...@filteredItems]; local.push(x)` is fine".
- §6.6.8 read (lines 2922-2946). E-DERIVED-WRITE.
- §53.4 read (lines 27959-28041). NOTE: DD's claim that "§53.4.4 trusted-zone IS alias-flow tracking" is somewhat aspirational — §53.4 covers NUMERIC predicate satisfaction (e.g., `number(>0)` proven by literal `5`). The structural insight (track value-flow within a scope) is right, but I will implement a custom alias-flow mechanism rather than reusing the §53 substrate. Surfacing as a minor framing correction; does NOT affect A4 scope.
- §34 catalog row read (lines 16216-16217). E-DERIVED-VALUE-MUTATE wording unchanged.

### Source reading
- `compiler/src/symbol-table.ts` (9786L). L21 walker at lines 2348-2910 (PASS 6). Gate at line 2456 confirmed.
- B2 walker (`walkLocalDeclsForCollisions`) at line 1438 — already visits let/const/tilde/lin decls scope-aware. Confirms the infrastructure for tracking these exists.
- PASS 6 invoked at line 8984; runs AFTER B11/B12 synth registration. Good ordering for my purposes — B2 (collision check) runs BEFORE PASS 6, so I can collect aliases during a pre-pass and consult them in PASS 6.
- `Scope` interface at line 813. Need a NEW `localAliases: Map<string, AliasRecord>` field.

### Empirical reproducer verification (CONFIRMED — gap is real)

All 5 DD reproducers run under current S134 main compiler, ZERO `E-DERIVED-VALUE-MUTATE` fires per reproducer:

- R1 simple alias `let local = @derived; local.push(1)` — 0 fires
- R2 alias-then-property-write `let alias = @view; alias.email = "evil"` — 0 fires
- R3 destructuring rest `let { ...rest } = @view; rest.email = "evil"` — 0 fires
- R4 computed-index `let local = @derived; local[0] = 99` — 0 fires (note: assignment via computed-index)
- R5 fn-arg `function mutate(arr) { arr.push(99) }; mutate(@derived)` — 0 fires
- CONTROL `@derived.push(1)` direct path — **1 fire** (control case works)
- NEG `let local = [...@derived]; local.push(1)` — 0 fires (correct per SPEC; spread-copy is documented legal)

### Existing test-suite gap analysis
- `compiler/tests/unit/derived-value-mutate.test.js` (474L) — line 420 asserts spread-copy is legal (correct per SPEC). Line 98 asserts `let local = @derived.filter(x => x)` is fine (filter returns new arr — chain-broken). **NO existing test covers the alias-then-mutate-non-copy pattern.** Closing the gap is purely additive; zero regression risk.

### AST shape inspection
- `let local = @derived` → `initExpr.kind = "ident"`, `name = "@derived"` (`@`-prefixed; direct alias of derived cell).
- `let h = @v.a` → `initExpr.kind = "member"`, `object.kind = "ident"`, `object.name = "@v"` (path alias).
- `let item = @d[0]` → `initExpr.kind = "index"`, `object = {kind: "ident", name: "@d"}` (path alias; index-into-cell).
- `let b = a` (transitive) → `initExpr.kind = "ident"`, `name = "a"` (no `@`; check against `derivedCellAliases` table).
- `let { a, b } = @v` → `decl.name = {kind: "destructure-object", properties: [{kind: "name", fieldName, bindName}, ...], rest?: "name"}`.
- `let [first, second] = @d` → `decl.name = {kind: "destructure-array", elements: [{kind: "name", name}, ...]}`.
- `let local = [...@d]` → `initExpr.kind = "array", elements: [{kind: "spread", argument: {kind: "ident", name: "@d"}}]` — chain break (per SPEC).
- `let w = { x: @d }` → `initExpr.kind = "object", props: [{kind: "prop", key, value: {kind: "ident", name: "@d"}}]` — chain break.
- `let v = @d.n + 1` → `initExpr.kind = "binary"` — chain break.
- `let r = g(@d)` → `initExpr.kind = "call"` — chain break (conservative).

### Phase-0 disposition: PROCEED to Phase 1

All STOP conditions clear:
- SPEC text matches HU/DD summary (with minor §53.4 framing correction surfaced above, not load-bearing for A4 scope).
- L21 walker at documented file/line.
- Zero existing tests cover the 5 reproducers (no regression-risk concern).
- §53.4.4 trusted-zone framing is aspirational, not load-bearing — A4 implements custom alias-flow tracking per the brief's PA recommendation.

## Phase 1 — Provenance Model PROPOSAL

### Data model

Each function/file scope tracks `localAliases: Map<localName, AliasRecord>` where:

```typescript
interface AliasRecord {
  /** Original derived cell name (no `@` prefix). For `let local = @d`, this is `"d"`. */
  cellName: string;
  /** Path tail from the derived cell to the aliased value. Empty for whole-cell alias.
   *  For `let h = @v.a` this is `["a"]`. For `let item = @d[0]` this is `["[…]"]` (computed-index marker; cannot resolve to a named sub-cell). */
  pathTail: string[];
  /** Source decl node for diagnostic anchoring (let-decl / const-decl / function-decl param). */
  declNode: any;
  /** The original derived cell's StateCellRecord (for diagnostic context). */
  cellRecord: any;
}
```

### Rule 1 — Forward propagation (when does a binding become an alias?)

Detected on `let-decl` / `const-decl` (JS-style local) by inspecting `initExpr`:

| Init shape | Aliased? | Path |
|---|---|---|
| `{kind: "ident", name: "@cell"}` | YES (whole-cell alias) | `cellName=cell, pathTail=[]` |
| `{kind: "member", object: {kind: "ident", name: "@cell"}, property: "p"}` | YES (path alias) | `pathTail=["p"]` |
| `{kind: "member", object: <nested member chain rooted at @cell>, property: "p"}` | YES (deep path alias) | `pathTail=[..nestedSegments, "p"]` |
| `{kind: "index", object: {kind: "ident", name: "@cell"}, index: ...}` | YES (indexed alias) | `pathTail=["[…]"]` (computed-index sentinel) |
| `{kind: "ident", name: "<localName>"}` where `<localName>` is itself in `localAliases` | YES (transitive) | inherit from source alias |
| All other shapes (`array`, `object`, `binary`, `unary`, `call`, `lit`, `arrow`, etc.) | NO (chain-break) | — |

**Special case — destructuring:**
- `let { a, b } = @cell` (kind=`destructure-object`) — each `bindName` becomes an alias with `pathTail=[..rhsTail, fieldName]`. For `let {a} = @v` → `a` aliases `@v.a` (cellName=`v`, pathTail=`["a"]`).
- `let { a: aliased } = @cell` — `aliased` aliases `@cell.a` (uses `bindName` as the local name).
- `let { ...rest } = @cell` — `rest` aliases the whole-cell value (`pathTail=[..rhsTail]`); per JS semantics, rest collects "remaining own enumerable properties", which is a NEW object — but it still references the same nested-object identities. **CONSERVATIVE CHOICE:** treat rest-destructuring as a chain-break (NEW object at top level), matching `{...@cell}` spread which is documented legal. Mutations like `rest.foo = x` write to the new top-level rest object — they DO NOT mutate `@cell`. This MATCHES the SPEC §6.6.18 "Local copies are mutable" rule.
- `let [first, second] = @cell` (kind=`destructure-array`) — each element becomes an alias with `pathTail=[..rhsTail, "[…]"]` (or the index number if useful). Since destructuring binds REFERENCES to the same heap objects, mutating `first.x = y` DOES mutate `@cell[0].x`. So array destructuring is NOT a chain-break.

**Trade-off note (rest-destructure):** spec text "local copies are mutable" explicitly cites spread (`[...@derived]`), which is a true shallow-copy. Object rest (`let { ...rest } = @v`) is JS-spec equivalent to `Object.assign({}, @v)` (shallow copy + omit listed keys). Spec text doesn't explicitly mention rest, but the semantic is identical — shallow new object. Treating rest as chain-break aligns with spec intent.

### Rule 2 — Chain breaks (when does the chain TERMINATE?)

Per SPEC §6.6.18 "Local copies are mutable":
- Spread (`[...@cell]` / `{...@cell}`) → NEW value, chain breaks
- Object literal field (`{ x: @cell }`) → NEW object; `w.x` aliases the inner reference but `w` itself is fresh. Mutating `w.x.foo = y` walks through the JS reference graph back to `@cell.foo` — but `w.x` is not an alias-record holder in our model. **CONSERVATIVE CHOICE:** chain-break at `object literal` (the new container is a fresh object; the inner field-reads do not propagate alias status).
- Array literal element (`[@cell]`) → NEW array, same reasoning, chain break
- Binary/unary/logical/conditional/tagged-template expressions → chain break (NEW value)
- Function-call return value (`g(@cell)`) → chain break (conservative; can't track through arbitrary fn bodies)
- Function parameter binding (`function mut(x) { ... }` called with `mut(@cell)`) → chain break (conservative — see Rule 4)
- Method-call return (`@cell.filter(x => x)`) → chain break (filter/map/slice/etc. return new arrays per spec)
- `@cell.length` / `@cell.foo` READ → no alias record created; reads don't form aliases

### Rule 3 — Write-through-alias trigger (what fires E-DERIVED-VALUE-MUTATE through an alias?)

Extension to L21 walker's three existing checks (`assign`, `call`, `unary`-delete):

When the receiver chain's leaf-ident is NOT `@`-prefixed (i.e., `buildReceiverPath` would return null today), additionally consult `localAliases` for the leaf-ident name. If hit:
- The receiver path becomes `[aliasRecord.cellName, ...aliasRecord.pathTail, ...remainingSegments]`
- Run the same `findDeepestRegisteredOnPrefix` walk + `firePropertyAssign` / `fireMethodCall` / `fireDelete` (or new variants tailored to alias diagnostic text).

This covers:
- Direct property write `alias.foo = x` → fires
- Method call `alias.push(x)` (if `push` ∈ ARRAY_MUTATING_METHODS) → fires
- Compound assign `alias.n += 1` → fires
- Delete `delete alias.foo` → fires
- Nested path `alias.a.b.c = x` → fires (the path is built from `alias`'s record extended by `["a", "b", "c"]`)
- Indexed assign `alias[0] = x` → fires (computed-index → assignment-target sentinel in tail)

### Rule 4 — Function/closure boundary

**Conservative chain-break at function call site.** Per the brief: "DO NOT fire; conservative answer; chain-break at the function call site."

Implementation: when an alias is passed AS AN ARGUMENT to a function call, the call site doesn't fire. Inside the function, the parameter binding is treated as a FRESH local (no alias record). Even though `function mut(x) { x.push(1) }` would propagate through to the caller's `@derived` cell at runtime, our static analysis stops at the call boundary.

Closures (arrow functions) that DIRECTLY reference `@cell` inside their body — the existing L21 walker already handles via PASS 6 descent into function-decl bodies + ExprNode walk. No change needed; the closure body fires on direct `@cell.x = y` paths.

**Future tightening (out of scope):** inter-procedural alias-flow tracking through function parameters. Filed in progress.md deferred items.

### Rule 5 — Diagnostic surface

New error message variant (`fireMethodCallViaAlias` / `firePropertyAssignViaAlias` / `fireDeleteViaAlias`):

```
E-DERIVED-VALUE-MUTATE: in-place mutation of derived cell `@derived` via alias `local.push(...)`.
  Alias chain: `local` <- `@derived` (declared at line N).
  `@derived` is `const`-derived; mutating its value through any alias is forbidden — the mutation would be silently clobbered the next time upstream dependencies fire (SPEC §6.6.18 + §34).
  Fix: mutate the upstream cell instead, or declare a separate mutable cell for independent storage. To make a local mutable copy, use `let local = [...@derived]` (shallow copy; spread breaks the alias chain).
```

The alias-chain segment names the immediate binding + the original cell. For transitive chains (`a -> b -> @c`), recommend showing intermediate hops.

### Rule 6 — Out of scope (deferred follow-ups)

1. Inter-procedural alias-flow through function parameters (per Rule 4).
2. Cross-file alias tracking (alias crosses module boundary via import binding).
3. Async / closure alias-after-suspend (no such primitive in scrml yet).
4. WeakRef / WeakMap aliases (JS-host primitives — out of scope).
5. Object-literal field deep alias propagation (`let w = { x: @cell }`; `w.x.foo = y` chain-broken at object-literal per Rule 2 — could be tightened later).

### Disposition

The 6 model elements (forward-propagation, chain-breaks, write-trigger, function-boundary, diagnostic, out-of-scope) ALL map 1-to-1 with the brief's required elements. No exotic edge case surfaced beyond:

- **(a) Object rest destructure** — model treats as chain-break (justified by JS-spec semantics matching spread).
- **(b) Array destructure** — model treats as alias-preserving (JS-spec semantics: elements bind to same heap refs).

These are NOT brief-uncovered; they're explicit clarifications of the brief's element 1 (forward propagation). Per the brief's exception clause:

> "if the proposal is fully covered by the brief above (matches the 6 model elements 1-to-1 with no exotic edge case surfacing), you MAY proceed to Phase 2 directly — but note in progress.md "no exotic cases surfaced; proceeding to impl per brief's exception clause" and continue."

**No exotic cases surfaced; proceeding to Phase 2 impl per brief's exception clause.**

## Phase 2 — Implementation COMPLETE

### Changes to compiler/src/symbol-table.ts (+605 lines, 0 deletions)

1. **AliasRecord interface** (~45 lines) — new exported type before `Scope`.
2. **`Scope.localAliases: Map<string, AliasRecord>` field** + `createScope` init.
3. **PASS 2.c walker `walkRegisterLocalAliases`** (~300 lines) — sister to B2's `walkLocalDeclsForCollisions`. Visits let/const/tilde/lin decls and registers AliasRecord entries. Helpers:
   - `pathFromAtCellChain(initExpr)` — extracts `[cellName, ...path]` from `@`-rooted chain
   - `lookupLocalAlias(scope, name)` — parent-chain walk for alias lookup
   - `tryDeriveAliasFromInit(initExpr, scope)` — Case (1) `@cell` chain, Case (2) transitive (bare-ident → existing alias)
   - `registerDestructureAliases(pattern, rhsAlias, declNode, scope)` — recurses through destructure-object / destructure-array patterns
   - `registerAliasForDecl(decl, scope)` — dispatches simple-name vs destructure-pattern
4. **Alias-aware helpers** (`buildReceiverPathViaAlias`, `formatAliasChain`) + **alias-aware fire variants** (`fireMethodCallViaAlias`, `firePropertyAssignViaAlias`, `fireDeleteViaAlias`) — ~140 lines.
5. **L21 walker extension** — 3 branches in `checkExprNodeForMutations` (assign, call, unary-delete) fall back to alias-aware lookup when standard `@`-prefix gate fails. ~50 lines.
6. **`runSYM` wiring** — PASS 2.c inserted between PASS 2 and PASS 2.b.

### Empirical post-impl verification (compared to Phase 0 baseline)

| Reproducer | Phase 0 | Post-impl | SPEC alignment |
|---|---|---|---|
| R1 simple alias | 0 fires | **1 fire** | per §6.6.18 — closes gap |
| R2 alias-then-property-write | 0 fires | **1 fire** | per §6.6.18 — closes gap |
| R3 destructuring rest | 0 fires | 0 fires | rest = NEW object per JS spec; chain-break per §6.6.18 "Local copies are mutable" |
| R4 computed-index alias | 0 fires | **1 fire** | per §6.6.18 — closes gap |
| R5 function-argument escape | 0 fires | 0 fires | conservative chain-break at fn-call site (per Phase 1 Rule 4) |
| CONTROL direct path | 1 fire | 1 fire | no regression |
| NEG spread-copy | 0 fires | 0 fires | per §6.6.18 — spread is explicit chain-break |

## Phase 3 — Tests COMPLETE

### compiler/tests/unit/l21-alias-tracking.test.js (476 lines, 25 tests)

- §A4.1 forward propagation: 10 tests covering simple alias / method-call / destructured-field / indexed-element / transitive / compound-assign / delete / nested-path / dotted-path / array-destructure — ALL fire.
- §A4.2 chain breaks: 6 tests (array spread / object spread / computed value / fn-call result / object-literal field / rest destructure) — ALL silent.
- §A4.3 function/closure boundary: 2 tests (fn-arg passing silent; nested-function-decl with direct write fires).
- §A4.4 negative controls: 6 tests (mutable-cell alias / independent local / similar name / mutable-cell path / read-only / non-mutating method) — ALL silent.
- §A4.5 diagnostic shape: 1 test (code/severity/span/alias-chain message).

### Test counts

| Run | pass | fail | skip | todo |
|---|---|---|---|---|
| Phase 0 baseline (unit+integration+conformance, --bail) | 14632 | 0 | 88 | 1 |
| Post-impl (same) | 14657 | 0 | 88 | 1 |
| Post-impl full `bun run test` | 21676 | 0 | 170 | 1 |

Brief baseline (21651) + 25 new tests = 21676 — matches exactly. Zero regressions across 797 test files.

## Findings surfaced (NOT closed in this dispatch)

1. **Arrow-function bodies inside let-decl init exprs** are represented as `escape-hatch` AST nodes (`nativeKind: "ArrowFunctionExpression"`, body held as `raw` string). The L21 walker does NOT descend into escape-hatch raw strings — so neither direct-path nor alias-tracking fires inside `let fn = () => { @cell.foo = y }`. **This is a pre-existing L21 limitation, NOT introduced by A4.** Surfaces as: closures-as-let-rhs that DIRECTLY write to derived cells silently pass. Documented in the §A4.3 nested-function-decl test comment.
   - **Suggested follow-up:** consider parsing arrow-function bodies into structured ExprNodes (not escape-hatches) so the L21 walker can descend. Out of scope for A4 (alias-tracking scope) but related to the same broader §6.6.18 enforcement story.

2. **§53.4.4 trusted-zone framing** in the DD was somewhat aspirational. §53.4 covers numeric/string predicate satisfaction (e.g., `number(>0)` proven by literal `5`), not value-identity alias tracking. The conceptual parallel is right (track value-flow within a scope) but the SUBSTRATE is not reusable — A4 implements a custom alias mechanism. Minor framing correction; does NOT affect A4 scope or quality.

3. **Inter-procedural alias tracking** (per Phase 1 Rule 4) — function-arg passing chain-breaks at the call site. R5 (`function mut(x) { x.push(1) }; mut(@derived)`) does NOT fire. Whole-function inter-procedural is filed as deferred follow-up per the DD's §10 item 1.

## Disposition

**Phase 0 PROCEED.** **Phase 1 model NO-EXOTIC-CASES, proceeded per brief exception clause.** **Phase 2 + 3 COMPLETE.** Zero new test failures. SPEC §6.6.18 spec-vs-impl drift closed for `let-decl` / `const-decl` aliasing of `const`-derived cells.
