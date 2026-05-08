---
title: A1c C2 Phase 0 SURVEY — derived-cell reactive computation emission
date: 2026-05-08
session: S72
worktree: agent-a78ec5d0aa429cf8c
branch: worktree-agent-a78ec5d0aa429cf8c
baseline-head: f5b620a (post-parallel-close, post-C1 SHIP)
status: SURVEY DRAFT — verdict SCOPE-AMENDMENT-SUGGESTED (3 amendments)
---

## §0 Methodology + worktree state

Read in full: BRIEF/dispatch (S72 dispatch text), C1 SURVEY + BRIEF + progress (full), SPEC §1.4 / §6.6 / §6.6.3 / §6.6.16 / §6.6.17 / §6.8 (incl. line 2470-2482 transitive normative), `compiler/src/codegen/emit-logic.ts` lines 1-110 + 270-860 (full case `state-decl` + helpers), `compiler/src/runtime-template.js` lines 1-340 (derived runtime + `_scrml_default_set`), `compiler/src/dependency-graph.ts` lines 1-100 + 740-870 + 1040-1180 (DGNode shapes, B7 adjacency builder, derived/engine collectors), `compiler/src/codegen/reactive-deps.ts` lines 1-490 (extract* family + `extractReactiveDepsTransitive` + `buildFunctionBodyRegistry`), `compiler/src/codegen/emit-lift.js` lines 380-570 + 1300-1410 (markup → DOM-builder code generator + `emitCreateElementFromMarkup`), `compiler/src/codegen/emit-html.ts` lines 1-200 + 870-915 (markup walker + transitive-extraction usage), `compiler/src/codegen/emit-reactive-wiring.ts` lines 245-310 (top-level state-decl emission entry, `emitOpts` construction), `compiler/src/codegen/index.ts` lines 525-550 (compileCtx setup), `compiler/src/codegen/usage-analyzer.ts` lines 50-285 (FeatureUsage shape; `markupTypedDerived` flag at line 113-114), `compiler/tests/unit/c1-shape-aware-cell-emit.test.js` (full read of all 25 C1 tests).

### Worktree state

- WORKTREE_ROOT: `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a78ec5d0aa429cf8c`
- AGENT_BRANCH: `worktree-agent-a78ec5d0aa429cf8c`
- HEAD pre-survey: `f5b620a` (S72 parallel-close SHIP — ff-merged from main at startup; base was S70 wrap `e62bb5a`)
- `bun install` → 114 packages clean.
- `bun run pretest` → 12 samples 0 errors.
- Baseline `bun run test` → **9,753 pass / 64 skip / 1 todo / 3 fail / 33,965 expects** (within ±1 of dispatch-stated baseline 9,754/64/1/3; the ~1-test fluctuation is bun parallelism noise on a flaky bootstrap test). Three pre-existing fails are the same self-host parity drift inherited from C1: `F-BUILD-002 §3`, `Bootstrap L3`, `Self-host: tokenizer parity`. Out of v0.2.0 scope per S66.

### Test invariant

C2 invariant: post-SHIP **fail count MUST equal 3** (no new fails). Pass count UP by ~25-40 new C2 tests. Skip / todo unchanged. Pre-commit hook excludes self-host integration so `bun test` (subset) shows 3 fails; `bun run test` (full) also shows 3 fails — both consistent.

---

## §1 Locus confirmation — what C1 left for C2

### §1.1 Plain Shape-3 derived closure semantics

**Dispatch arm:** `compiler/src/codegen/emit-logic.ts:733-762` (post-C1).

**Current C1 emission (verified by reading the actual code + the C1 test fixtures):**

For `const <doubled> = @count * 2`:
```js
_scrml_derived_declare("doubled", () => _scrml_reactive_get("count") * 2);
_scrml_derived_subscribe("doubled", "count");
```

For `const <total> = @price * @quantity`:
```js
_scrml_derived_declare("total", () => _scrml_reactive_get("price") * _scrml_reactive_get("quantity"));
_scrml_derived_subscribe("total", "price");
_scrml_derived_subscribe("total", "quantity");
```

**This is ALREADY closure-correct + subscribe-correct for direct `@var` references.** C1's arm uses `extractReactiveDepsFromExprNode(node.initExpr)` which collects `@-prefix` idents. Lazy-pull semantics is in the runtime (`_scrml_derived_get` at `runtime-template.js:326`) — not a compile-time concern. Dirty propagation is in `_scrml_propagate_dirty` (line 227) — eager, BFS, transitive-through-derived-chains.

**What C1 left out (the actual C2 gap, per SPEC §6.6.3 line 2470-2482):**

> "The compiler SHALL track reactive dependencies transitively through function calls that appear in reactive positions. ... If a function `f()` is called in a reactive position and `f`'s body (as seen by the compiler's static call graph) reads one or more `@variable`s, those `@variable`s SHALL be recorded as dependencies of the enclosing reactive expression, exactly as if the reads occurred directly at the call site. Transitive tracking extends recursively through `f`'s callees..."

**Concrete gap example:**

```scrml
${ function upperOf(s) { return s.toUpperCase() } }
<name> = "alice"
const <displayName> = upperOf(@name)
```

Per spec, `displayName` has dep `name` (transitively through `upperOf`). C1 emits:
```js
_scrml_derived_declare("displayName", () => upperOf(_scrml_reactive_get("name")));
// MISSING: _scrml_derived_subscribe("displayName", "name") — but it would actually fire because `@name` is direct here.
```

Wait — `@name` IS direct in `upperOf(@name)`, so direct-extraction catches it. Try:

```scrml
${ function getName() { return @name } }
<name> = "alice"
const <displayName> = getName()
```

C1 emits:
```js
_scrml_derived_declare("displayName", () => getName());
// MISSING: _scrml_derived_subscribe("displayName", "name") — `@name` is INSIDE getName()'s body, not at the call site.
```

When `@name` is written, `displayName` is NOT marked dirty. The lazy pull on next `${@displayName}` read returns the stale cached value. **This is a spec violation per §6.6.3 line 2476-2482.**

**The fix is COMPILE-TIME in `emit-logic.ts case "state-decl"`'s derived arm:**

Replace `extractReactiveDepsFromExprNode(node.initExpr)` with `extractReactiveDepsTransitive` (which already exists in `reactive-deps.ts:462`), threading a `FunctionBodyRegistry` through `EmitLogicOpts`.

**Status:** GAP, real, must close.

### §1.2 Markup-typed derived factory body

**Dispatch arm:** `compiler/src/codegen/emit-logic.ts:720-731` (post-C1).

**Current C1 emission for `const <badge> = <span class="badge">${@x}</span>`:**

```js
function _scrml_markup_factory_badge_<id>() { /* C2: emit markup tree + register _scrml_derived_subscribe edges for upstream cells in renderSpec.element */ return null; }
_scrml_derived_declare("badge", _scrml_markup_factory_badge_<id>);
```

The factory returns `null` and registers no subscribe edges. Reading `${@badge}` produces `null` at runtime today.

**What C2 fills in:**

1. The factory body BUILDS the markup DOM tree from `node.renderSpec.element`. Existing primitive: `emitCreateElementFromMarkup(markupNode, lines)` in `emit-lift.js:479-569`. This function is currently **NOT exported** — C2 either exports it, or extracts a shared helper.
2. The factory **subscribes** to all reactive cells the markup interpolates. `${@x}` interpolations inside the markup tree show up as `kind: "logic"` children with `bare-expr` body. Walking the markup tree to collect `@var` reads gives the dep list. This is the same job `extractReactiveDepsFromExprNode` does for plain Shape 3, but for markup nodes the walker needs to descend into `kind: "logic"` children.

**Status:** GAP, must close.

**Coupling concern (per dispatch §2):** the dispatch asks "extend `emit-logic.ts` arms in place, OR factor markup-factory-body synthesis into a shared helper used by both?" — recommendation §2 below.

### §1.3 In-compound derived (§6.6.16)

**Locus:** routes through C1's compound arm (`emit-logic.ts:652-697`) recursively. When the recursive walk hits a child with `shape: "derived"` AND `isConst: true`, it falls into the same Shape-3 derived arm at line 733-762.

**Current C1 emission for `const <displayName> = @signup.first + ' ' + @signup.last` inside `<signup>`:**

```js
_scrml_derived_declare("signup.displayName", () => _scrml_reactive_get("signup.first") + ' ' + _scrml_reactive_get("signup.last"));
_scrml_derived_subscribe("signup.displayName", "signup.first");
_scrml_derived_subscribe("signup.displayName", "signup.last");
```

Verified by reading `c1-shape-aware-cell-emit.test.js:278-289`. The `compoundPathPrefix` threading from C1 makes the qualified-path key correct. **This is already complete** — C2 does NOT need to touch it.

**Status:** ALREADY DONE by C1's recursive dispatch. C2 inherits transitive-through-fn-calls via §1.1's fix (which automatically applies because the compound child routes through the same Shape-3 arm).

### §1.4 Derived-of-derived chains

**Example:** `const <a> = @x; const <b> = @a + 1`.

**Current C1 emission:**

```js
_scrml_derived_declare("a", () => _scrml_reactive_get("x"));
_scrml_derived_subscribe("a", "x");
_scrml_derived_declare("b", () => _scrml_reactive_get("a") + 1);
_scrml_derived_subscribe("b", "a");
```

When `@x` is written:
1. `_scrml_propagate_dirty("x")` runs (synchronous BFS).
2. Visits `x`'s downstreams → marks `a` dirty.
3. Visits `a` (via the BFS queue at line 242: `queue.push(derived)` cascades to derived's own downstreams).
4. Marks `b` dirty.

**Verified by reading `_scrml_propagate_dirty` lines 227-248: transitive cascade is built-in.**

When `${@b}` is read:
1. `_scrml_reactive_get("b")` → `_scrml_derived_get("b")` (per line 195 routing).
2. `b` is dirty → re-evaluate: `() => _scrml_reactive_get("a") + 1`.
3. Inside the closure, `_scrml_reactive_get("a")` → `_scrml_derived_get("a")` (a is also dirty).
4. `a` re-evaluates, caches, clears dirty flag. Returns `_scrml_state["x"]`.
5. `b`'s closure adds 1, caches, clears dirty flag.

**This is already correct.** C2 does NOT need to do anything for derived-of-derived **provided the subscribe edges are accurate**. C1's `extractReactiveDepsFromExprNode` extracts `@a` from `b`'s init, registers `_scrml_derived_subscribe("b", "a")`. Edge `x → a` exists; edge `a → b` exists. BFS cascade works.

**Status:** ALREADY DONE. Inherits §1.1's transitive-fn-call fix automatically.

### §1.5 Cycle detection (E-DERIVED-CIRCULAR-DEP)

**Locus:** B7 in `dependency-graph.ts`. Cycle detection fires at A1b time (Stage 7 DG). C2 inherits — it does not run cycle detection itself. If a cycle survives to codegen, the AST is malformed; defensive comment is acceptable.

**Status:** OUT OF SCOPE. Inherited from B7. C2 does NOT add a diagnostic.

### §1.6 What C2 does NOT need to do (depth-of-survey-discount candidates)

| Candidate | Why C1 already handles |
|---|---|
| Plain Shape-3 derived `_scrml_derived_declare` emission | C1 line 756 already emits |
| Plain Shape-3 derived direct-`@var` subscribe edges | C1 line 757-760 already emits |
| In-compound derived via §6.6.16 | C1's recursive dispatch through `compoundPathPrefix` already handles |
| Derived-of-derived dirty cascade | Runtime `_scrml_propagate_dirty` already cascades |
| Lazy pull on read | Runtime `_scrml_derived_get` already handles |
| `${@derivedMarkup}` interpolation lowering at use-site | Runtime template line 195 routes `_scrml_reactive_get` → `_scrml_derived_get` automatically |
| Cycle detection | B7 already runs in Stage 7 |

**Net C2 net-new work: TWO things only.**
1. **Transitive dep extraction** through function calls in derived init expressions (closes §6.6.3 line 2470-2482 normative gap).
2. **Markup-factory body synthesis** + dep-tracking for markup-typed derived cells (lifts C1's `return null` shell to a real DOM-builder).

This is a markedly smaller surface than the dispatch's framing suggested. **Cost decomposition reflects this** — see §8 below.

---

## §2 Refactor decision

**Recommendation: extend `emit-logic.ts` derived arms in place + export `emitCreateElementFromMarkup` from `emit-lift.js` rather than duplicating it.**

Decomposed:

1. **Plain Shape-3 derived (transitive deps)** — modify the existing arm at `emit-logic.ts:733-762`. Add an `if (opts.fnBodyRegistry)` branch that uses `extractReactiveDepsTransitive` instead of `extractReactiveDepsFromExprNode`. Falls back to the current direct-extraction when registry is absent (preserves test-fixture compatibility — many C1 unit tests pass synthetic state-decls without a registry). ~15 LOC + 1 import.

2. **Markup-typed derived factory body** — modify the existing arm at `emit-logic.ts:720-731`. Replace the `return null;` body with a call to `emitCreateElementFromMarkup(node.renderSpec.element, lines)`. Walk the same markup tree separately to collect reactive deps (any `kind: "logic"` child with `${@x}` interpolations contributes deps). Emit `_scrml_derived_subscribe(factoryName, dep)` calls per dep. ~40 LOC.

3. **Export `emitCreateElementFromMarkup`** — add `export` keyword in `emit-lift.js:479`. ~1 LOC. **No refactor; just expose the existing helper.**

4. **Thread `fnBodyRegistry` through `EmitLogicOpts`** — add `fnBodyRegistry?: FunctionBodyRegistry | null` field to the interface; build the registry once in `emit-reactive-wiring.ts:251` (where `fileAST` is in scope) and pass it through `emitOpts`. Top-level entry is the only caller path that needs to be aware; recursive calls inherit via `{ ...opts }` spread. ~5 LOC + 1 import.

Total dispatch logic projected: ~60 LOC across 3 files (`emit-logic.ts`, `emit-lift.js`, `emit-reactive-wiring.ts`). Stay in place; no new module.

**Single-line audit-trail comment block** at the head of the modified arms describing the C2 contract (transitive + factory-body).

---

## §3 B7 DAG vs local extraction — which does C2 use?

The dispatch frames C2 as "wire B7's DAG into derived computation closures." On reading B7's DAG and comparing to the local-extraction path:

**B7's DAG output** (`dependency-graph.ts:1062-1114`) for a derived state-decl:
- Builds a `ReactiveDGNode` with `_pendingDerivedReads: string[]` (the `@var` names found via `collectReactiveRefsFromExprNode`).
- Builds a `_pendingDerivedCallees: string[]` (via `collectCalleesFromExprNode`).
- The full DAG has cross-file edges; B7 detects cycles via `buildDerivedReadsAdj` (line 765).

**Local-extraction** (`reactive-deps.ts:284-298`):
- Walks the ExprNode for any `@-prefix` ident.
- Same data B7's `collectReactiveRefsFromExprNode` produces — these are the same primitive.

**Critical observation:** B7's DAG is built in Stage 7 (DG), which runs BEFORE Stage 8 (CG). The DG output is per-file, indexed by NodeId. To consume B7's DAG, codegen would need to look up the current state-decl by NodeId in the DG (requires threading the depGraph through `EmitLogicOpts`). The data B7 stores about the cell's reads is identical to what `extractReactiveDepsFromExprNode` extracts at codegen time.

**However:** B7 stores **direct reads only** (line 1086-1099 — it pulls from `collectReactiveRefsFromExprNode` which is the AST-walker counterpart of `extractReactiveDepsFromExprNode`). It does NOT do call-graph traversal.

**Conclusion:** the dispatch's "wire B7's DAG into closures" framing is slightly off — B7's DAG and the local extraction give the same answer for direct deps. The actual gap (per spec §6.6.3 line 2470-2482) is **transitive through function calls**, which neither B7 nor C1's local extraction covers today, but `extractReactiveDepsTransitive` (`reactive-deps.ts:462`) does.

**C2 should use `extractReactiveDepsTransitive`, not B7's DAG directly.** This is consistent with how `emit-html.ts:891-893` already wires transitive extraction for `${@x}` markup interpolations. C2 brings the derived-cell path to parity with the markup-interp path.

**SCOPE-AMENDMENT-LITE:** the dispatch text says "wire B7's DAG"; the actual implementation reuses `extractReactiveDepsTransitive` (which produces the equivalent result with call-graph traversal). Document this in the SHIP commit; no functional difference, but the framing matters for future readers.

---

## §4 Markup-factory body synthesis — design

### §4.1 Reuse `emitCreateElementFromMarkup`

`emit-lift.js:479-569` already produces `createElement` chains for a markup tree, returning the root element variable. Its semantics are exactly what the markup-typed-derived factory body needs:
- Walks `node.attributes` and emits `setAttribute` calls.
- Walks `node.children`:
  - `text` → `appendChild(createTextNode(...))`.
  - `markup` → recursively emit child + `appendChild(childVar)`.
  - `logic` → emit `${@x}` interpolation as a `createTextNode(String(rewritten ?? ""))` (where `rewritten` routes `@x` through `emitExprField` → `_scrml_reactive_get` → runtime-routed to `_scrml_derived_get` if the cell is derived).

**Action:** export `emitCreateElementFromMarkup`. ~1 LOC.

**Caveat:** `emit-lift.js` is `.js` (not `.ts`); in TypeScript-strict consumers, the helper's signature is loose. The C2 caller uses it from `emit-logic.ts` (which already imports from `emit-lift.js` line 6 — `import { emitLiftExpr } from "./emit-lift.js";`). Pattern is established.

### §4.2 Factory body shape

For `const <badge> = <span class="badge">${@signup.name}</span>`:

```js
function _scrml_markup_factory_badge_<id>() {
  const _lift_el_<id1> = document.createElement("span");
  _lift_el_<id1>.setAttribute("class", "badge");
  _lift_el_<id1>.appendChild(document.createTextNode(String(_scrml_reactive_get("signup.name") ?? "")));
  return _lift_el_<id1>;
}
_scrml_derived_declare("badge", _scrml_markup_factory_badge_<id>);
_scrml_derived_subscribe("badge", "signup.name");
```

The factory function body is what `emitCreateElementFromMarkup(node.renderSpec.element, lines)` produces, plus a final `return ${rootVar};`. The subscribe edges come from a separate walk of the markup tree to collect interpolations.

### §4.3 Dep collection from markup tree

Per §1.2: walk `node.renderSpec.element` recursively. For each `kind: "logic"` child with `bare-expr` body, extract `@var` refs via `extractReactiveDepsFromExprNode(child.exprNode)`. Union all; emit one `_scrml_derived_subscribe` per unique dep.

**Transitive concern:** markup interpolations CAN call functions (`${upperOf(@name)}`). The markup-emit path already uses `extractReactiveDepsTransitive` in `emit-html.ts:891-893` for the `display-wiring` case. C2 reuses the same primitive for the markup-typed-derived case. **One unified rule: every reactive-dep extraction in C2 uses transitive-through-fn-calls when a registry is available.**

### §4.4 Empty markup / static markup

Static markup with NO `${...}` interpolations has zero deps. The factory still builds the DOM tree. The cell is "derived" but has no upstream — it never re-evaluates. The runtime correctly handles this: `_scrml_derived_dirty["badge"]` stays `true` initially (line 299 `_scrml_derived_declare`), first read evaluates and caches, no subscribe edges means no dirty propagation, value never invalidates.

This is correct per §6.6.3: "A derived value SHALL initialize all derived values by marking them dirty at startup." Static markup-typed derived = read-once-cache-forever. Not a bug.

**However, the existing tilde-decl path at `emit-logic.ts:568` has a similar guard: "if `tildeDeps.size > 0`" — only emit `_scrml_derived_declare` if there are deps. For Shape 3 derived plain at line 746-749, there's a `W-DERIVED-001` warning ("treating as const") if no reactive deps.** Should markup-typed derived emit the same warning? Per spec §6.6 (no explicit normative on this), the markup case is structurally legitimate (a static markup VALUE is still a reactive cell — just one that never invalidates). **Recommendation: emit no warning; static markup-typed-derived is legal and the runtime handles it correctly.**

### §4.5 What if `renderSpec.element` is missing or malformed?

C1 today emits the placeholder unconditionally. C2 must handle:
- `renderSpec.element` absent (defensive — A1b/B5 should ensure it's present for `_cellKind: "markup-typed"`).
- `renderSpec.element.kind !== "markup"` (defensive).

Defensive: emit a comment line `// C2: markup-typed derived <name> has no markup tree — A1b should have rejected before codegen` and a stub factory returning `null`. Mirrors C1's existing defensive shell.

---

## §5 In-compound derived (§6.6.16) — verify thread-through

C1's compound arm recurses through `node.children` with `compoundPathPrefix` set. When a child is `shape: "derived" && isConst: true`, the recursion enters the Shape 3 derived arm at line 733-762. The arm reads `_qualifiedName` (computed at line 629 as `${compoundPathPrefix}.${child.name}`) and emits `_scrml_derived_declare(_qualifiedName, ...)` + subscribe edges per dep.

**For C2's transitive-fn-call extension:** when the compound child's init expression contains a function call, the same `extractReactiveDepsTransitive` fires (the dispatch arm doesn't care whether it's at top-level or compound-child). Subscribe edges resolve to the qualified path of upstream cells.

**Potential subtlety:** the function called from within the compound (`upperOf(@signup.first)`) may itself read other compound-qualified cells. The function-body walk in `extractReactiveDepsFromBody` extracts `@var` patterns; it doesn't qualify them. If the function reads `@signup.first` directly, the extraction returns `signup.first` (with the dot). That registers correctly as a dep.

**If the function reads bare `@first` expecting the compound parent's resolution:** that's a semantic violation of compound scoping (compound children are accessed via dotted form from outside the compound, but inside a function body without compound context, `@first` is just a plain reactive — and B1/B2 should reject this at A1b time). C2 inherits A1b's enforcement; no new check.

**Status:** thread-through works without modification. C2 doesn't add code for the compound case beyond §1.1's transitive extraction.

---

## §6 Lazy semantics — runtime-only, no compile-time work

Per §6.6.3: "A derived value SHALL NOT be re-evaluated until it is read AND its dirty flag is set."

**Verified by reading `runtime-template.js:326-336`:** `_scrml_derived_get` exactly implements this. C2 emits no code for lazy-pull; it's a runtime concern.

**Verified by reading `runtime-template.js:227-248`:** `_scrml_propagate_dirty` exactly implements eager dirty-cascade. C2 emits no code for dirty propagation; it's a runtime concern.

**Verified by reading `runtime-template.js:62`:** `_scrml_derived_cache` initialized to `undefined`; `_scrml_derived_dirty[name] = true` on declare. First read re-evaluates per Phase 3.

**No new runtime helpers needed for C2.** All lazy semantics already implemented.

---

## §7 Output-stability test scope

### §7.1 Sample-corpus diff envelope

Grep over `samples/*.scrml` and `samples/compilation-tests/*.scrml`:

```
grep -l "const <[a-zA-Z]" samples/*.scrml samples/compilation-tests/*.scrml 2>/dev/null
```

If zero hits: ZERO sample bytes change for direct-derived path; the dispatch arms remain dormant in the existing corpus. (C1's progress.md §WIP-7 confirmed this.)

If hits exist with function-call inits: those will now emit additional `_scrml_derived_subscribe` edges. **Expected, intentional diff.** Document magnitude in WIP-7.

### §7.2 Markup-typed-derived corpus

Grep for any sample with `const <[a-z]+> = <`:

```
grep -l "const <[a-zA-Z][a-zA-Z]* = <" samples/*.scrml samples/compilation-tests/*.scrml 2>/dev/null
```

If zero hits: zero existing samples emit factory bodies. New C2 tests cover the surface. (C1's progress.md confirmed zero markup-typed-derived samples in corpus.)

If hits exist: factory bodies replace the `return null` shell; subscribe edges add. **Expected, intentional diff.**

### §7.3 TodoMVC + kickstarter byte-output

Per the dispatch's explicit "TodoMVC + kickstarter v2 §3 corpus byte-output diff" requirement: rebuild via `bun run pretest` + diff against `samples/compilation-tests/dist/` snapshots. C1's progress confirmed zero diff for these corpora (no use of derived cells calling functions; no markup-typed derived). **Expected post-C2: zero diff at TodoMVC/kickstarter level**, modulo possible factory function additions for any markup-typed-derived if added during C2 test fixture authoring.

### §7.4 Diff-envelope summary

| Diff source | Cause | Expected magnitude |
|---|---|---|
| Plain derived with fn-call init gains transitive subscribe edges | §1.1 closure | Per call-bearing derived: ~1-3 new lines per derived. Existing corpus likely has zero matches. |
| Markup-typed derived factory body synthesis (`null` → real DOM tree) | §1.2 closure | Per markup-typed-derived: ~5-30 new lines (DOM build) + 1-N subscribe lines. Existing corpus likely has zero matches. |
| In-compound derived with fn-call init | §1.1 inherited | Same as plain; zero existing samples. |
| Plain derived with direct-`@var` init (no fn calls) | NO CHANGE | None — direct extraction already emits the right edges in C1. |
| Shape 1/2/Variant C/default= sidecar | NO CHANGE | None — C1's emissions untouched. |

---

## §8 Cost decomposition + sub-step boundaries

Dispatch estimates 4-6h. Survey breaks down to ~3-5h based on §1.6 discount:

| WIP | Sub-step | Est | Notes |
|---|---|---|---|
| WIP-1 | Pre-existing fixture audit + corpus grep + pre-snapshot | 20 min | Enumerate fn-call-bearing derived + markup-typed-derived samples; baseline test snapshot |
| WIP-2 | Export `emitCreateElementFromMarkup` from `emit-lift.js` | 15 min | One-line export + import in emit-logic.ts |
| WIP-3 | Thread `fnBodyRegistry` through `EmitLogicOpts` | 30 min | Add field; build at `emit-reactive-wiring.ts:251` (fileAST is in scope); spread through recursive calls |
| WIP-4 | Plain Shape-3 derived: switch to `extractReactiveDepsTransitive` when registry present | 30 min | Conditional fallback to direct-extraction when registry absent (test-fixture compatibility) |
| WIP-5 | Markup-typed derived factory body synthesis + dep walk | 75 min | Replace `return null` shell with `emitCreateElementFromMarkup`; walk markup tree for interpolations; emit subscribe edges |
| WIP-6 | New unit-test suite (`c2-derived-reactive-computation.test.js`) | 60 min | ~25-40 tests covering §C2.1 - §C2.10 (see §6 of dispatch + §10 below) |
| WIP-7 | Output-stability validation + commit-cadence wrap | 30 min | TodoMVC + kickstarter byte-output diff confirmed against §7.4 envelope |

**Total: ~4 h** (lower end of dispatch estimate; survey-confirmed discount per §1.6).

**WIP-commit boundaries:** each row is one commit `WIP(c2): <topic>`. Sequence keeps tests passing throughout.

---

## §9 SCOPE corrections (per pa.md Rule 4)

### §9.1 Dispatch §1 framing — "wire B7's DAG"

**Reality:** B7's DAG and local-extraction give the same direct-deps answer. The actual normative gap (§6.6.3 line 2470-2482) is **transitive through function calls**, which is closed by `extractReactiveDepsTransitive` (already exists in `reactive-deps.ts`). C2 does NOT consume B7's DGNode IDs directly; it uses the local extraction primitive.

**Amendment:** the SHIP commit should clarify: "C2 closes the §6.6.3 transitive-fn-call normative by routing derived-cell extraction through `extractReactiveDepsTransitive`, bringing the derived path to parity with the markup-interp path (which already uses the transitive primitive at `emit-html.ts:891`). B7's DAG provides cycle detection (separate, A1b-time) but does not feed the codegen subscribe-edge emission directly."

This is a **CLARIFICATION, not a scope reduction.** The end-to-end behavior is the same (transitive deps tracked); the implementation path is `extractReactiveDepsTransitive`, not a B7 DAG lookup.

### §9.2 Dispatch §1.5 "cycle detection" — INHERITED, no new diagnostic

The dispatch states this correctly: "already fired by B7 at A1b time (E-DERIVED-CIRCULAR-DEP). C2 inherits; no new diagnostic." Verified. No amendment.

### §9.3 Dispatch §3 in-compound derived — auto-handled by C1 recursion

The dispatch lists this as a C2 deliverable: "wires the dep-tracking with the compound-qualified path." Verified by reading the C1 dispatch arm at `emit-logic.ts:733-762`: it reads `_qualifiedName` (which already incorporates `compoundPathPrefix`), and the dep-extraction extracts `@signup.first`-style deps directly. **C2 needs to do nothing extra for this case beyond §1.1's transitive change.**

**Amendment:** dispatch §3 implies C2 has new compound-qualified work; reality is the C1 recursion already threads correctly. C2's transitive change applies uniformly to top-level + compound. **Not a scope reduction; just a clarification that C2 doesn't add a separate code path for in-compound.**

### §9.4 Dispatch §4 derived-of-derived chains — RUNTIME-HANDLED

Verified by reading `runtime-template.js:227-248` (`_scrml_propagate_dirty`'s BFS cascade). **C2 emits no compile-time code for chained dirty propagation.** B7's DAG IS used for cycle detection (A1b time), but the cascade itself is runtime BFS over `_scrml_derived_downstreams`.

**Amendment:** dispatch §4 says "B7's DAG already tracks transitive deps; C2 emits subscribe edges per the DAG output." More precisely: **C1's existing direct-extraction emits the per-edge subscribe correctly for chains** (each derived subscribes to its DIRECT predecessor; the runtime BFS makes the chain transitive). C2 doesn't add chain-traversal code; it relies on C1's per-edge emission + the runtime's BFS.

### §9.5 Markup-typed derived coupling with C2

The dispatch flags this correctly per C1 SURVEY §5.2 Option (b). C2 lifts the `return null` shell to a real factory. No amendment needed beyond exporting `emitCreateElementFromMarkup`.

### §9.6 FeatureUsage bitmap consumption — does C2 read it?

Per A1c SCOPE §4.7 (line 260): "C2 emits L15 + §6.6.17 markup-derived." C2 is NOT in the §4.7 list of bitmap consumers (which are C5/C6/C8/C12/C14/C16/C18). **Verified: C2 emits unconditionally based on per-cell shape; the FeatureUsage bitmap is for whole-app elision in DOWNSTREAM emitters.** No bitmap consumption in C2. Matches dispatch silence on this.

---

## §10 Test plan (per BRIEF §6 / SCOPE §4.5)

`compiler/tests/unit/c2-derived-reactive-computation.test.js` (NEW). Sections:

- §C2.1 Plain Shape-3 derived with direct `@var` references — regression guard (no behavior change vs. C1)
- §C2.2 Plain Shape-3 derived with function-call init — transitive deps recorded as subscribe edges
- §C2.3 Plain Shape-3 derived with NESTED function calls (`f(g(@x))`) — transitive recursion
- §C2.4 Plain Shape-3 derived with no fnBodyRegistry available — falls back to direct extraction (test-fixture compat)
- §C2.5 Markup-typed derived: factory body synthesizes DOM build calls
- §C2.6 Markup-typed derived: factory subscribes to interpolated reactive deps
- §C2.7 Markup-typed derived: static markup (no `${...}`) emits factory + 0 subscribe edges
- §C2.8 Markup-typed derived: nested markup interpolations collect deps from all levels
- §C2.9 In-compound derived with fn-call init — transitive deps with compound-qualified paths
- §C2.10 Output-stability — Shape 1/2/Variant C unchanged; existing C1 tests pass

Estimated test count: 25-40.

---

## §11 Verdict

**SCOPE-AMENDMENT-SUGGESTED — three CLARIFICATIONS (not scope changes).**

The C2 dispatch is feasible and the BRIEF is fundamentally correct, but three framing clarifications are needed:

1. **B7 DAG vs `extractReactiveDepsTransitive`** — C2 uses the latter, which produces the equivalent result with call-graph traversal, brings parity with `emit-html.ts:891`'s markup-interp path. The dispatch text "wire B7's DAG into derived computation closures" should be read as "track transitive deps through fn calls" — implementation is `extractReactiveDepsTransitive`, not a literal B7 DGNode lookup.

2. **Derived-of-derived chains + dirty cascade** — handled at RUNTIME by `_scrml_propagate_dirty` BFS, not at compile time. C2 emits per-edge subscribe lines (which C1 already does); cascade is runtime-built. No compile-time cascade emission needed.

3. **In-compound derived (§6.6.16)** — auto-handled by C1's existing recursive dispatch + `compoundPathPrefix` threading. C2 does not add a separate code path; the transitive change applies uniformly.

**Net new C2 work: TWO things.**
- Plain Shape-3: switch from direct-extraction to transitive-extraction when fnBodyRegistry is available (closes §6.6.3 line 2470-2482 normative).
- Markup-typed derived: replace C1's `return null` factory shell with a real DOM-builder body via the existing `emitCreateElementFromMarkup` helper, plus subscribe edges for interpolated `@var`s.

**Cost:** ~4h (lower end of dispatch estimate per §1.6 discount).

**Surprises:**
- The C2 surface is markedly smaller than the dispatch implied, because C1 already emitted correct subscribe edges for direct `@var` references AND because the runtime already handles chained dirty cascade + lazy pull. The remaining gaps are TWO compile-time emissions only.
- `extractReactiveDepsTransitive` already exists in `reactive-deps.ts:462`, used by `emit-html.ts:891` for markup-interp deps but NOT by `emit-logic.ts` for derived-cell deps. C2 closes this asymmetry.
- `emitCreateElementFromMarkup` in `emit-lift.js` is exactly the markup → DOM-builder primitive C2 needs; it's not currently exported, so C2 adds a one-line `export`.
- Threading `fnBodyRegistry` through `EmitLogicOpts` is straightforward — `fileAST` is in scope at `emit-reactive-wiring.ts:251` (the top-level state-decl emit entry), and the registry is already-built per-file (`buildFunctionBodyRegistry` at `reactive-deps.ts:316`).

**Recommended verdict: PROCEED-AS-BRIEFED with the three §9 clarifications applied IN THE SHIP COMMIT (no separate amendment cycle needed).** The clarifications don't change deliverables, scope, or cost; they just describe the implementation path more precisely than the original dispatch text. PA may overrule and require an explicit amendment cycle, in which case I STOP here and await acknowledgment.

If proceeding: WIP-1 next (pre-snapshot + corpus audit). If amendment cycle: STOP, report, await PA.

---

## §12 References

- C2 dispatch: S72 dispatch text (this thread)
- C1 SURVEY: `docs/changes/phase-a1c-step-c1-shape-aware-cell-emit/SURVEY.md`
- C1 BRIEF: `docs/changes/phase-a1c-step-c1-shape-aware-cell-emit/BRIEF.md`
- C1 progress (impl details): `docs/changes/phase-a1c-step-c1-shape-aware-cell-emit/progress.md`
- C1 SHIP commit: `0d5a144`
- A1c SCOPE: `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md` §3.1 / §4.1 / §4.5 / §4.7 / §4.8
- A1c C0 SURVEY: `docs/changes/phase-a1c-codegen/SURVEY.md`
- SPEC: `compiler/SPEC.md` §1.4 / §6.6 (incl. line 2470-2482 transitive normative) / §6.6.3 / §6.6.16 / §6.6.17 / §6.8
- Existing codegen: `compiler/src/codegen/emit-logic.ts` (case "state-decl" at lines 608-855); `emit-lift.js:479-569` (`emitCreateElementFromMarkup`); `emit-html.ts:891-893` (transitive extraction usage); `emit-reactive-wiring.ts:251` (top-level entry where fileAST is in scope)
- Reactive deps: `compiler/src/codegen/reactive-deps.ts` (`extractReactiveDepsTransitive` at line 462; `buildFunctionBodyRegistry` at line 316)
- B7 DAG: `compiler/src/dependency-graph.ts` (lines 765, 1062-1114; cycle detection separate from codegen)
- Runtime: `compiler/src/runtime-template.js` (lines 195, 227-248, 296-336 — derived runtime fully implements lazy + dirty cascade)
- C1 tests: `compiler/tests/unit/c1-shape-aware-cell-emit.test.js` (25 tests)
- Process: `pa.md` §"Worktree-isolation" + §"Dispatch landing"; `docs/PA-SCRML-PRIMER.md` §13.7 B7

---

## Tags

#a1c #c2 #phase-0 #survey-complete #scope-amendment-suggested #derived-reactive-computation #transitive-deps #markup-typed-derived-factory #depth-of-survey-discount-caught #fnBodyRegistry-threading

## Links

- Worktree: `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a78ec5d0aa429cf8c/`
- Branch: `worktree-agent-a78ec5d0aa429cf8c`
- Baseline HEAD: `f5b620a`
- Change directory: `docs/changes/phase-a1c-step-c2-derived-reactive-computation/`
- C1 predecessor: `0d5a144` (commit) + `docs/changes/phase-a1c-step-c1-shape-aware-cell-emit/`
- A1c SCOPE: `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md`
- SPEC: `compiler/SPEC.md` §6.6 + §6.6.16-17
