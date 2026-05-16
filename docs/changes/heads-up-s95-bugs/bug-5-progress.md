# Bug 5 — Component `<TaskCard/>` survives CE → phantom DOM `document.createElement("TaskCard")`

## Investigation

### Repro (minimal, confirmed bug)

The hand-typed brief repro (single-level: `<program>` body → `for` over @tasks → `lift <TaskCard task=t/>`) does NOT reproduce the bug — TaskCard expands cleanly.

The actual S95 repro requires a NESTED component reference: TaskCard referenced from INSIDE another component's body (Column), where Column itself is lifted in the outer iteration.

`/tmp/bug5/repro3.scrml` (reduced):
```scrml
<program>
    const TaskCard = <li class="task" props={ task: Task }>...</>

    const Column = <section class="col" props={ name: string }>
        <h2>${name}</h2>
        <ul>
            ${ for (let task of @tasks.filter(t => t.column == name)) {
                lift <TaskCard task=task/>
            } }
        </ul>
    </>

    <div class="board">
        ${ for (let col of columns) {
            lift <Column name=col/>
        } }
    </div>
</program>
```

Compiles cleanly (0 errors). Emitted client.js:
```js
const _scrml_lift_el_8 = document.createElement("TaskCard");
_scrml_lift_el_8.setAttribute("task", task);
```

### Root causes (two separate bugs)

**Bug 5a — CE skip:** `walkLogicBody`'s `lift-expr` branch (component-expander.ts:2374-2388) expands a user-component lift target via `expandComponentNode` but does NOT recurse into the expanded result's children. The expanded `<section>` (Column's body) contains a nested `<ul>` → logic → for-stmt → lift-expr → `<TaskCard>` chain. The TaskCard reference inside the expanded body never gets visited by CE.

Compare against `walkAndExpand` line 2150-2160 which DOES recurse into expanded.children for the non-lift path. The lift path was missing this defense.

**Bug 5b — VP-2 invariant gap:** `runPostCEInvariantFile` (post-ce-invariant.ts:91-97) checks only:
- `resolvedKind === "user-component"`, OR
- `resolvedKind === "unknown"` AND uppercase tag

But the residual TaskCard has `resolvedKind === undefined` (NOT the string `"unknown"`) AND `isComponent: true`. This shape arises because `parseComponentBody` re-parses Column's body via BS+TAB only (no NR), so `resolvedKind` is never stamped. VP-2 silently skips it.

The pre-CE detector `isUserComponentMarkup` (component-expander.ts:207-214) DOES accept the legacy fallback `resolvedKind == null && isComponent === true`. VP-2 was not updated symmetrically.

### Confirmed via debug script

`/tmp/bug5/debug2.js` runs BS → TAB → MOD → NR → CE manually, then walks the post-CE AST and counts residuals + invokes `walkFileAst` against the VP-2 walker. Output:
```
ceResult ast keys: [filePath, nodes, ...]
WALKER FOUND RESIDUAL: TaskCard resolvedKind= undefined isComponent= true
Total visits: 36 Residuals: 1
```

`runPostCEInvariant` returns 0 errors, despite the walker reaching the node. The skip is at the `if (!isResidualComponent) return;` gate.

## Fix plan

1. **CE fix**: In `walkLogicBody`'s lift-expr branch, after `expandComponentNode` returns the expanded markup, recurse into `expanded.children` via `walkAndExpand` (same shape as the wrapper-element path at line 2395-2407 and the non-lift path at line 2150-2160). Same fix for the bare-ref path (line 2435) and the re-parse path (line 2471) — both need the same recursion.

2. **VP-2 fix**: Add the legacy fallback branch `(n.resolvedKind == null && n.isComponent === true && uppercase)` to the residual detection in `runPostCEInvariantFile`.

3. **Regression tests**:
   - Conformance test: the nested-component repro compiles + emits expanded TaskCard markup.
   - VP-2 unit test: a markup node with `{resolvedKind: undefined, isComponent: true, tag: "X"}` fires E-COMPONENT-035 (synthetic AST).
   - Cross-file component import unchanged.

## Step log

- Startup checks: WORKTREE_ROOT `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a73d9a60e1deeec7d`. Inodes differ from main (9179149 vs 7995696). Tree clean. `bun install` + `bun run pretest` clean.
- Baseline tests: 12054 pass / 88 skip / 0 fail / 619 files.
- Reproducer confirmed at `/tmp/bug5/repro3.scrml`. Phantom `createElement("TaskCard")` in emitted client.js. 0 compile errors.
- Root cause split into 5a (CE skip in lift-expr expansion of user-components) + 5b (VP-2 missing legacy `isComponent` branch).
- Bug 5b fix: commit `1417cf2` — VP-2 adds `(resolvedKind == null && uppercase tag)` clause. Stays within P3-FOLLOW (no `isComponent` code-read) by routing on tag-only heuristic, mirroring the (b) clause's syntactic predicate. Now VP-2 fires E-COMPONENT-035 on the repro.
- Bug 5a fix: commit `7999413` — CE's `walkLogicBody` lift-expr branches (3 sub-paths: markup-form, bare-ref, full re-parse) now recurse `walkAndExpand` into `expanded.children` after `expandComponentNode` returns. Mirrors the non-lift path at line ~2150. Now `<TaskCard>` inside `<Column>`'s body expands to `<li>` instead of surviving as `createElement("TaskCard")`.
- Regression tests: commit `a2b1ed5` — 5 new tests at `compiler/tests/integration/bug-5-nested-component-ce-phantom-dom.test.js`. Covers 5a happy path, 5a single-level regression guard, 5b typo'd nested component, 5b synthetic AST VP-2 fires, 5b synthetic AST VP-2 stays silent on lowercase tag.
- Final tests: 12059 pass (+5 from 12054 baseline), 88 skip, 0 fail / 620 files via pre-commit gate (`bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance --bail`).
- Full `bun run test` shows 38 fails — all in `compiler/tests/browser/browser-todomvc.test.js`, all pre-existing (verified by reverting fixes and re-running). Unrelated to Bug 5 surface.

## Final result

- Repro `/tmp/bug5/repro3.scrml` now compiles cleanly with TaskCard expanded to `createElement("li")` and the `${task.title}` substitution preserved. No phantom DOM emission.
- Typo'd nested component refs fail loudly with E-COMPONENT-035 via VP-2's strengthened invariant.
- All Bug 5 spec requirements (expansion + invariant + backward compatibility + regression tests) closed.
