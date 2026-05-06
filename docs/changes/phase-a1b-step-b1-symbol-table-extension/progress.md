# Phase A1b Step B1 — Progress

**Branch:** `phase-a1b-step-b1-symbol-table-extension`
**Parent:** `4b7e27d` (A1a COMPLETE)
**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ac9404e6ed07fe773`

Append-only timestamped log. WIP commits expected; final clean summary at end.

---

## Timeline

- [00:00] Startup verification: pwd, git rev-parse, git status all clean. Worktree confirmed.
- [00:01] `bun install` complete (113 packages).
- [00:02] `bun run pretest` complete (12 test samples compiled).
- [00:05] `bun run test` baseline: **8902 / 44 / 1 / 0 / 8947 / 439** — matches brief baseline exactly.
- [00:06] Branch `phase-a1b-step-b1-symbol-table-extension` created from `4b7e27d`.
- [00:07] BRIEF.md copied to worktree dispatch dir (not on worktree branch's tree at parent commit).
- [00:10] progress.md scaffolded; entering SURVEY phase.
- [00:15] WIP commit: `90486a7` scaffolding — BRIEF + progress.md.
- [00:16] Survey phase: reading name-resolver.ts, ast.ts, ast-builder.js engine path, api.js pipeline.

---

## Survey phase — findings

Per BRIEF §3, 8 survey questions answered BEFORE source edits. Survey-first is the depth-of-survey discount mandate (9× pattern in A1a).

### Q1: Existing scope concept (`compiler/src/types/ast.ts:662`)

**Finding:** `FunctionDeclNode.stateTypeScope?: string` is a STRING LABEL (the enclosing state-type name when the function is inside a `state-constructor-def`). It is **NOT a generalized scope tree, not a scope object**. It tags `<status>: AdminFlow = ...` style functions for type-system overload routing, not for state-cell visibility.

Grep for `Scope`/`stateCells`/`symbolTable` across `compiler/src/` confirms NO pre-existing scope-tree-as-data-structure. Underscore-prefixed `_componentScope` (codegen) is a string component-name tag for CSS scoping. `_constructorScoped` is a boolean. `meta-checker.ts ScopeVarEntry` is meta-block-specific scope-capture.

**Conclusion:** B1 is GENUINELY new infrastructure. No scope-tree to extend.

### Q2: NR's state-decl handling (`compiler/src/name-resolver.ts`, 494 lines)

**Finding:** NR's walker (lines 301-378) resolves four AST kinds:
- `markup` (line 309) — sets `resolvedKind`/`resolvedCategory`
- `state` (line 323) — markup-tag-style state opener (state-types, NOT state-cells)
- `state-constructor-def` (line 323) — also handled in same branch
- `engine-decl` (line 340) — sets category="engine"|"machine"

NR does **NOT walk `state-decl`** (the reactive cell decl form). Adding state-decl walk to NR would broaden its semantic responsibility from "tag-bearing-node classification" (its current single concern) to "tag classification + state-cell scope construction" — a semantic broadening that violates separation of concerns.

NR's `buildSameFileRegistry` (lines 116-153) walks `ast.components`, `ast.typeDecls`, and inline `state-constructor-def` nodes. NOT `state-decl`. So NR's registry is type/component-name registry, not state-cell registry.

**Conclusion:** Cleanly separable. NR-extension would muddle. NEW pass preferred.

### Q3: Variant C compound walking (`state-decl.children: ReactiveDeclNode[]`)

**Finding:** Per `ast.ts:501`, `ReactiveDeclNode.children?: ReactiveDeclNode[]` is the recursive structure for Variant C compounds. Each child is itself a `state-decl`. Existing parser (Step 11.0a) populates this recursively.

NO pre-existing walker for state-decl children — NR doesn't recurse into state-decls (only walks tag-bearing nodes, not decl-nodes). B1 needs its own recursive walk.

The recursion is straightforward — at each `state-decl` node, if `children` is non-null and non-empty, recurse with the parent's compound sub-scope as context.

### Q4: Function/engine/component body walking

**Finding:** Today's AST has these scope-introducing kinds with WALKABLE bodies:
- `function-decl.body: LogicStatement[]` ✅ walkable AST (kind:"function-decl")
- `state-decl.children: ReactiveDeclNode[]` ✅ walkable AST (Variant C compound)
- `state.children: ASTNode[]` ✅ walkable (state-type instantiation, e.g. `<card>...</card>` ; v0.next state-types)
- `state-constructor-def.children: ASTNode[]` ✅ walkable (state-type bodies)
- `engine-decl.rulesRaw: string` ❌ STRING, no AST body — v0.next engine state-children come at B14+
- `component-def.raw: string` ❌ STRING, no AST body — components store template as text (CE expands later)

**Important downstream implication:** B1 cannot construct `engine` or `component` SCOPE KINDS for today's AST because the bodies aren't AST. Strategy: define `ScopeKind = "file" | "function" | "engine" | "component" | "compound"` in the type system per BRIEF (anticipating B14+/B17+), but the WALKER today only constructs `"file"`, `"function"`, and `"compound"` scopes. Engine + component scopes will be wired when their bodies land as AST in B14+.

This is an ALL-AHEAD-OK decision: API supports the eventual kind set; walker fills in what's available today; B14+ adds engine/component walker branches when their bodies become AST.

NR's walker (lines 358-378) recurses through `children`, `body`, `consequent`, `alternate`, `arms[].body`, `lift-expr.expr.node`. B1 should mirror this recursion pattern but track scope changes when crossing function-decl + state-decl(compound) boundaries.

Logic blocks (`kind: "logic"`, `body: LogicStatement[]`) hoist `imports`, `exports`, `typeDecls`, `components` to file level (per `LogicNode` def, lines 296-303). State-decls inside `${...}` are flattened into `body` — they live in the lexical position they appeared, NOT hoisted. So a `state-decl` inside a function body's logic block is FUNCTION-SCOPED, not file-scoped. Walker must track scope traversal through `kind:"logic"` containers.

### Q5: Annotated-AST decoration convention

**Finding:** Mixed convention:
- **Non-underscore:** NR uses `resolvedKind`/`resolvedCategory` (advisory, AUTHORITATIVE for routing). Decorated directly on AST nodes with documented optional fields in `ast.ts`.
- **Underscore:** Codegen uses `_componentScope`/`_expandedFrom`/`_constructorScoped`. These are compiler-internal pipeline-stage annotations not part of public AST contract.
- **Side-table:** none observed; everything is on-node.

BRIEF mandates `_scope` underscore-prefix. Consistent with codegen convention for "compiler-internal annotation." B1 will use:
- `state-decl._record: StateCellRecord` (per-cell)
- `<scope-introducing-node>._scope: Scope` (per-scope-creating node)
- `FileAST._scope: Scope` (file-level root, ALSO via separate `runSYM` return shape)

Records and scopes are CROSS-LINKED: each record has `record.scope` (the scope it was registered in), each scope has `scope.stateCells: Map<string, StateCellRecord>`.

### Q6: Pipeline insertion point — Stage 3.06 SYM vs NR-extension

**Finding from `api.js:644-668`:** NR runs **after** MOD (line 633→654), per the comment "Why post-MOD instead of post-TAB: cross-file imported names need MOD's exportRegistry to resolve." NR mutates AST in place by adding `resolvedKind`/`resolvedCategory`.

**Pipeline execution order (from api.js):**
```
TAB(3) → GCP1(3.005) → GCP3(3.006) → MOD(3.1) → NR(3.05) → CE(3.2) → VP-1/2/3(3.3) → PA(4) → ...
```

The numeric Stage IDs label artifacts, not execution order. NR runs between MOD and CE.

**Decision: insert SYM as Stage 3.06 between NR and CE.**

Rationale:
1. **Separation of concerns:** NR classifies tag-bearing nodes (tag/category routing). SYM constructs state-cell scopes. Different responsibilities. NR's <5ms/file budget is a tight bound; broadening it risks budget creep + harder future maintenance.
2. **NR is well-bounded.** The 494-line module has ONE clear purpose (per its docblock). Folding SYM in violates the single-responsibility convention NR documents.
3. **B2-B22 build on SYM separately.** B2 (E-NAME-COLLIDES-STATE) consumes SYM. B3 (`@name` resolution) consumes SYM. Treating SYM as a peer stage (not NR-implementation-detail) makes B2-B22 clean.
4. **PIPELINE.md naming convention.** Sub-stages use `.0X` numbering (3.005 GCP1, 3.006 GCP3, 3.05 NR, 3.1 MOD, 3.2 CE). 3.06 SYM cleanly slots after NR (3.05) before CE (3.2).
5. **NO MOD-output dependency** at B1. SYM only needs the per-file AST. Cross-file state-cell resolution is later (B4 import binding). Today, SYM can run on per-file AST without project-level dep.

**API location:** `compiler/src/symbol-table.ts` — new module (parallel to `name-resolver.ts`).

**Pipeline wiring point:** `api.js` between line 668 (`if (verbose) ... [NR] ...`) and line 671 (`// Stage 3.2: CE`). Add a `stage("SYM", ...)` call passing each post-NR `tabResult.ast`.

### Q7: Test infrastructure

**Finding:** Existing test files under `compiler/tests/integration/`:
- `parse-shapes-v0next.test.js` (2483 lines) — A1a Step 2-11 + 11.0a-f tests; uses `splitBlocks` + `buildAST` directly; asserts on raw AST shape
- `parse-import-pinned.test.js`, `parse-mutation-shapes.test.js`, `parse-reset-keyword.test.js` — A1a step-specific tests
- `expr-node-corpus-invariant.test.js` — sample-corpus invariants
- `cross-file-components.test.js`, `p2-export-component-form1-cross-file.test.js`, `p3a-cross-file-multi-page-broadcast.test.js` — multi-file integration

**Decision: NEW test file `compiler/tests/integration/symbol-table.test.js`.**

Rationale:
1. **B1 is a NEW pipeline stage.** Mirroring the per-step test-file pattern (parse-shapes-v0next.test.js for parser; symbol-table.test.js for SYM) keeps the namespace clean for B2+ test additions (which can extend symbol-table.test.js or add their own).
2. **Test pattern:** `splitBlocks` → `buildAST` → `runSYM` → assert on scope tree. Mirrors `parse-shapes-v0next.test.js` structure (`splitBlocks` → `buildAST` → assert on AST shape).
3. **§B1.1-§B1.15 invariants** map directly to a 15-test describe block.

### Q8: `@`-prefix preservation in `name` field

**Finding from `ast.ts:434`:** `ReactiveDeclNode.name: string` doc says "Reactive variable name (without `@`)". Confirmed: state-decl.name stores BARE name without `@` prefix.

For ExprNode `ident.name`: per A1a Step 10, `ident.name` preserves `@` verbatim (e.g., `@count` → `ident.name === "@count"`). But this is for the EXPRESSION-position `@name` access, not the DECL-position `<name>`/`@name`.

**Conclusion:** Symbol-table key uses BARE name (no `@` prefix). No normalization needed at registration. When B3 later resolves `@name` in expression position, it strips the `@` then calls `lookupStateCell(scope, name.slice(1))`.

---

## Insertion-point decision

**SYM as a NEW Stage 3.06 module at `compiler/src/symbol-table.ts`,** wired into `api.js` between NR and CE.

**Full rationale captured in Q6 above.** Override of the BRIEF's "leans new sub-stage" wording: the survey CONFIRMS the lean — NR-extension would muddle responsibility, and B2-B22 are cleaner consuming SYM as a peer stage.

**Public API surface** (per BRIEF §2.1.6):
- `runSYM(input: SYMInput): SYMResult` — main entry; mirrors NR's shape.
- `runSYMBatch(tabResults: ...): SYMResult[]` — batch wrapper.
- `lookupStateCell(scope: Scope, name: string): StateCellRecord | null` — walks parent chain.
- `lookupQualifiedStateCell(scope: Scope, path: string[]): StateCellRecord | null` — multi-segment path resolution.
- `getScopeForNode(node: ASTNode): Scope | null` — reverse lookup via `_scope` field.

**Type definitions** (per BRIEF §2.1.1):
- `ScopeKind = "file" | "function" | "engine" | "component" | "compound"` (full set; walker fills file/function/compound today; engine+component reserved for B14+/B17+).
- `Scope { kind, parent, stateCells: Map<string, StateCellRecord>, qualifiedPath: string }`
- `StateCellRecord { name, declNode, scope, qualifiedPath, structuralForm, shape, isConst, isPinned, isCompoundParent, isCompoundChild, hasValidators, hasDefaultExpr, hasTypeAnnotation }`

**Annotation convention:**
- `state-decl._record: StateCellRecord` (back-pointer to the registered record)
- `<scope-introducing-node>._scope: Scope` (back-pointer to the scope created at this node)
- `FileAST` gains `_scope: Scope` (the file-level root scope)

**Self-host parity:** NO-OP per A1a Steps 4-7 policy.

---

## Implementation phase

(starts after this commit)
