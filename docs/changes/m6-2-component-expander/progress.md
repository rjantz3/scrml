# Progress: m6-2-component-expander

## Plan

Migrate two `splitBlocks` + `buildAST` re-parse sites in `compiler/src/component-expander.ts` to `nativeParseFile` from `compiler/native-parser/parse-file.js`.

### Call-site survey

- **Site 1** — `component-expander.ts:567-568` inside `parseComponentBody(raw, componentName, filePath)`. Synthesized source: tokenized-then-normalized component-def body (markup-plus-logic — may contain `props={...}` blocks, `${expr}` slots, comments, nested elements, **inner `lift <Component/>` references**). Downstream consumer reads `.ast.nodes.filter(kind === "markup")` and `.errors` (filters out warnings + W-PROGRAM-001, maps `tabSpan → span`).
- **Site 2** — `component-expander.ts:2607-2608` inside `walkLogicBody` re-parse path. Synthesized source: tokenized-then-normalized expression-string converted back to markup-only fragment (uppercase-component reference). Downstream consumer reads `.ast.nodes.find(kind === "markup" && isComponent === true)`.

Both sites pass full scrml source (markup + interleaved logic blocks) — `nativeParseFile` is the correct drop-in (not `parseMarkup` alone, which returns block-stream only without the FileAST shape).

### Shared helper

Both sites share the pattern `splitBlocks(path, src) → buildAST(...) → consume .ast.nodes`. They do NOT currently share a helper function. M6.2 introduces a shared helper `reparseSynthesizedFile(filePath, source)` inside component-expander.ts that wraps `nativeParseFile`. Both call-sites use it.

## STOP — surfaced 2026-05-23

### Symptom

After migrating both sites to `nativeParseFile` + adding a `parsePropsBlockRaw` adapter (native produces `props-block.propsDecl: <raw-string>`; live produces `PropDecl[]`), the integration test `compiler/tests/integration/bug-5-nested-component-ce-phantom-dom.test.js` regresses 5/5 → 3/5:

- **5a — nested component inside another component's lift body**: expected `createElement("li")` (TaskCard expansion inside Column); the inner TaskCard reference does NOT expand. CE silently emits Column's expanded `<section>` without TaskCard's `<li>` inside.
- **5b — typo'd nested component name fires E-COMPONENT-035**: expected `errors.length > 0` (the inner `<TaskKard/>` typo should surface as a parse error); got 0 errors. The inner unresolved reference is silently dropped — no phantom DOM, but also no diagnostic.

Pretest GREEN (`bun run pretest` passes). Failure isolated to nested-component-CE-expansion integration tests.

### Root cause

The native A2 expression bridge (`translate-expr.js`) routes the `MarkupValue` ExprKind to `escape-hatch` (documented: translate-expr.js L110, R1 deferred surface). `translate-stmt.js makeLiftExpr` (L382-396) then takes the lift expression's argument — when it's a `MarkupValue` — and wraps it as `{ kind: "markup", node: <raw-MarkupValue> }`. The native MarkupValue carries `{ kind: "MarkupValue", markup: [{ kind: "Markup", name, attrs, children, ... }] }` (PascalCase native node-catalog).

The LIVE BS+TAB path produces `lift-expr.expr.node = { kind: "markup", tag, attrs, isComponent, children, ... }` (lowercase ASTNode shape with `isComponent: true` for uppercase-first-character tags). Component-expander's recursive walk (e.g. `walkLogicBody → walkAndExpand → expandComponentNode`) reads `expr.node` as a `MarkupNode` with `tag`, `attrs`, `isComponent`, `children`. Under native, `expr.node.tag` is `undefined` (native uses `name`), `expr.node.isComponent` is `undefined`, `expr.node.kind === "MarkupValue"` not `"markup"` — so every nested-component lookup inside a `lift <Component/>` inside a component-def body silently misses.

This is a documented bridge-parity gap: native R1 explicitly does not deconstruct MarkupValue into the live MarkupNode shape — see `translate-stmt.js:376-396` header + `M5-divergence-ledger.md`. The proper fix is a native-side translator that converts native `MarkupValue.markup[0]` (a `Markup` block) into the live MarkupNode shape (lowercase kind, `tag`/`isComponent`/`exprNode`-shaped attrs), threading the same idGen and recursively descending into child Markup blocks.

### Scope decision

This is **out of M6.2 scope**. M6.2 was scoped as "2 hard-bound splitBlocks consumers — replace with native equivalents". The fix actually required is at the A2/R1 bridge layer (translate-expr / translate-stmt MarkupValue handling), which is a Tier-B bridge unit owned by the broader M5/M6 native-parser-completion arc (see M5-SWAP-residual-decomposition.md, M5-divergence-ledger.md, and the cutover plan's M6.6 surface).

Per the brief's STOP-condition: "if the 2 call-sites have fundamentally different shapes requiring different native APIs, surface as a possible Unit-split scenario." — the issue isn't a per-call-site shape difference, but a deeper A2/R1 bridge gap that surfaces in BOTH call-sites because both feed downstream consumers expecting the live MarkupNode shape under nested lift-expr contexts. Same conclusion: surface and stop.

### Possible Unit-split paths (PA decides)

1. **M6.2a — A2/R1 MarkupValue bridge** — write `translateMarkupValueToLiveNode(mv, idGen, source)` in translate-expr.js / translate-stmt.js that mirrors `parse-file.js synthMarkupNode` for embedded markup-as-expression contexts (lift-expr arg, render-expr, etc.). Convert `{ kind: "MarkupValue", markup: [Markup] }` → `{ kind: "markup", tag, attrs (lowercase shape), children (recursive), isComponent, span, ... }`. Heavier than M6.2 originally scoped — likely 8-15h on its own. Once landed, M6.2 mechanical site-replacement becomes a 1-2h follow-up.
2. **M6.2-defer — leave component-expander on live BS+TAB until M6.7 flip** — abandon the M6.2 migration; let component-expander keep `splitBlocks` + `buildAST` imports. Defer to M6.6 (engine-statechild-parser arc) or the M6.7 flag-flip cohort where bridge-parity gaps surface in bulk. Tradeoff: keeps a 2-site `splitBlocks` consumer alive through M6.7 (no progress on M6 Wave 1 surface area count, but no false-positive regressions either).
3. **M6.2-bounded — narrow M6.2 to only the safe call-sites if any exist** — survey shows BOTH sites trigger the MarkupValue divergence as soon as a component-def body OR a re-parsed component-ref expression carries a nested `lift <Component/>`. The single-level test (`test 5a — single-level component lift`) PASSES post-migration because it never hits the re-parse path. So path (3) is empty — there is no safe-narrowing surface within these 2 sites.

### Work captured

The migration code is checkpointed on `worktree-agent-ae74239dcd58a8461`:

- `compiler/src/component-expander.ts`:
  - removed `splitBlocks` + `buildAST` imports
  - added `nativeParseFile` import from `../native-parser/parse-file.js`
  - added `splitAtTopLevelCommasCE` helper (mirrors ast-builder L2147)
  - added `parsePropsBlockRaw` helper (mirrors ast-builder L2182)
  - added `upgradeNativePropsDeclsInFileAST` FileAST walker
  - added `reparseSynthesizedFile(filePath, source)` shared helper
  - migrated both call-sites (L567, L2607) to use the shared helper

The propsDecl-shape adapter IS load-bearing and correct — it closes the prop-parsing shape divergence. The MarkupValue divergence is the remaining blocker, owned by a deeper bridge unit.

Net diff: +178/-12 in `compiler/src/component-expander.ts`. Pretest GREEN, unit-test surface OK, integration regression isolated to bug-5-nested-component-ce-phantom-dom.test.js (5/5 → 3/5).

### Recommendation to PA

Choose path (1) M6.2a OR path (2) M6.2-defer. Path (3) is empty.

If (1): the M6.2a unit lifts native MarkupValue handling first; once that lands the M6.2 site-replacement work in this worktree resumes (rebases cleanly).

If (2): revert the changes in this worktree (`git checkout -- compiler/src/component-expander.ts`; remove the progress dir); document in master-list that M6.2 is parked pending M6.6/M6.7 bridge surface.

## Log

- [start] Verified worktree path `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-ae74239dcd58a8461`; pretest GREEN; startup commit `7f086328`.
- [step 1] Surveyed both call-sites + native parser entry point. Confirmed nativeParseFile drop-in shape (`{ filePath, ast, errors }`) matches.
- [step 2] Initial Edits applied to the WRONG path (`/home/bryan/scrmlMaster/scrmlTS/compiler/src/...` — main repo, not worktree). S99 path-discipline leak. Reverted main-repo edits with `git checkout --` and re-applied to worktree path. Lesson: enforce $WORKTREE_ROOT prefix on every Edit. (Counter +1.)
- [step 3] Implemented shared helper `reparseSynthesizedFile(filePath, source)` wrapping `nativeParseFile`. Migrated both sites (L567 parseComponentBody, L2607 walkLogicBody re-parse).
- [step 4] Initial commit attempt failed pre-commit hook with `TypeError: Attempted to assign to readonly property` at L673 `decl.isSnippet = false`. Root cause: native parser emits `props-block.propsDecl: <raw-string>` not `PropDecl[]`. Added `splitAtTopLevelCommasCE` + `parsePropsBlockRaw` + `upgradeNativePropsDeclsInFileAST` adapter; pretest GREEN.
- [step 5] Targeted integration-test run isolated a deeper regression: `bug-5-nested-component-ce-phantom-dom.test.js` 5/5 → 3/5. Both failing tests involve nested component references inside `lift <Component/>` inside a component-def body. Root cause: native A2/R1 bridge routes `MarkupValue` to escape-hatch (translate-expr.js L110, documented), and `makeLiftExpr` (translate-stmt.js L382-396) wraps the raw native MarkupValue inside `lift-expr.expr.node` without converting to the live MarkupNode shape. Component-expander walks `expr.node` as a live MarkupNode (reads `tag`/`isComponent`/`children`) — those fields don't exist on a native MarkupValue.
- [step 6] Concluded STOP per brief. Filed PA action with three Unit-split paths.
