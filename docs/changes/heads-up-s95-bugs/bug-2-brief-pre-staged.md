# Bug 2 — dispatch brief (PRE-STAGED, S95)

**Status:** ready to dispatch the moment Bug 1 lands and worktree is clean. Bug 1 + Bug 2 both touch `compiler/src/codegen/emit-control-flow.ts` — running them sequentially avoids the file-delta clobber.

**Pre-dispatch checks:**
- Verify Bug 1 has landed cleanly + Bug 1 worktree is cleaned up
- `pwd` is scrmlTS main (CWD slip defense)
- `git status` shows expected uncommitted set (benchmarks/llm-efficiency/, S95 doc work, etc.) but no surprise modifications to source

---

# Bug 2 — Variant constructor at engine direct-write emits string-as-function call

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

### Startup verification (do BEFORE any other tool call)

1. `pwd` — output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` — MUST equal WORKTREE_ROOT.
3. `git status --short` — clean.
4. `bun install`.
5. `bun run pretest`.

### Path discipline — RECURRING FAILURE MODE (S95 Bug 16 precedent)

**Bug 16 agent leaked 3 Edit calls to MAIN before self-detecting via inode comparison.** Write/Edit tools resolve absolute paths LITERALLY. `/home/.../scrmlTS/foo` writes to MAIN. Your worktree path is `/home/.../scrmlTS/.claude/worktrees/agent-<id>/foo`.

**Mandatory defenses:**

1. EVERY Write/Edit absolute path MUST start with WORKTREE_ROOT. No exceptions.
2. Before the FIRST Write/Edit, run `stat <expected-worktree-path>` AND `stat <main-equivalent-path>`. Confirm DIFFERENT inodes.
3. After every Write/Edit, read-back via the relative path to confirm the change.
4. Before reporting completion, `git -C /home/bryan-maclee/scrmlMaster/scrmlTS status --short` MUST show no unexpected modifications.

## MAPS — REQUIRED FIRST READ

`.claude/maps/primary.map.md` in full. Map reflects `13154ba`; HEAD will be Bug 1's landing SHA when this dispatches. Recent landings: Bug 18 (`394eeba`), Bug 16 (`074a307`), Bug 13 (`a6e17e6`), Bug 17 + Bug 5 + Bug 1 (SHAs TBD when this fires).

**Critical Bug 1 overlap:** Bug 1 touches the JS-style match codegen in `emit-control-flow.ts`. Bug 2's variant-constructor emission may share helpers. Grep for shared variant-construction helpers BEFORE touching anything; if a shared helper exists, coordinate edits to NOT clobber Bug 1's just-landed work.

Feedback in final report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing".

## REQUIRED PRE-READS

- `compiler/SPEC.md` §51.0 (Engines — §51.0.B declaration syntax, §51.0.F rule= contract + direct write enforcement, §51.0.C auto-declared variable)
- `compiler/SPEC.md` §14 (Type System — §14.4 enum variants, §14.4.1 toEnum lookup tables, §14.4 variant constructors)
- `docs/PA-SCRML-PRIMER.md` §7 (engines)
- `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`

## THE BUG

### Reproducer (minimal)

```scrml
<program title="Bug 2 Repro">
    type DragPhase:enum = {
        Idle
        Dragging(id: number)
    }

    function startDrag(taskId) {
        @dragPhase = .Dragging(taskId)
    }

    <engine for=DragPhase initial=.Idle>
        <Idle     rule=.Dragging></>
        <Dragging rule=.Idle></>
    </>

    <button onclick=startDrag(42)>Test</>
</program>
```

### Compile result

Compiles cleanly. 0 errors.

### Emitted client.js (the bug)

The file has a CORRECT enum constructor table near the top:
```js
const DragPhase = Object.freeze({
    Idle: "Idle",
    Dragging: function(id) { return { variant: "Dragging", data: { id } }; },
    variants: ["Idle", "Dragging"]
});
```

That table IS the variant constructor. `DragPhase.Dragging(42)` returns `{variant: "Dragging", data: {id: 42}}`.

But the engine direct-write site emits:
```js
function _scrml_startDrag_5(id) {
    // §51.0.F engine direct-write hook: dragPhase (DragPhase)
    _scrml_engine_direct_set("dragPhase", "Dragging"(id), __scrml_engine_dragPhase_transitions);
}
```

`"Dragging"(id)` calls the STRING `"Dragging"` as a function. Runtime TypeError on the first click.

### Root cause hypothesis (PA's pre-investigation)

The engine direct-write codegen builds the new-value expression by:
1. Looking up the variant tag — gets the literal string `"Dragging"` (matches the transition table lookup, which IS keyed by string).
2. If the variant has a payload, applying the payload by appending `(args)` to the tag expression.

Step 2 is where the bug lives — it appends `(args)` to the STRING tag instead of to the CONSTRUCTOR FUNCTION (`DragPhase.Dragging`). The fix is to route through the variant constructor table (lines 9-10 of the emit shown above) when the variant carries a payload, and emit just the string when it doesn't.

Expected emit:
```js
function _scrml_startDrag_5(id) {
    _scrml_engine_direct_set("dragPhase", DragPhase.Dragging(id), __scrml_engine_dragPhase_transitions);
}
```

### Note — no-payload variants already work

The no-payload form `@dragPhase = .Idle` correctly emits `_scrml_engine_direct_set("dragPhase", "Idle", ...)` — the transition-table key. The bug is specifically the **payload form** at engine-direct-write sites.

## INVESTIGATION + RESOLUTION

1. Locate the engine direct-write codegen. Likely in `compiler/src/codegen/emit-engine.ts` (engine substrate emission). Look for where the RHS of `@engineVar = .Variant(args)` gets lowered.
2. Confirm the bug: the codegen emits `"VariantName"(args)` for payload variants instead of `EnumName.VariantName(args)`.
3. Fix: when the variant carries a payload AND the assignment target is an engine variable, emit `EnumName.VariantName(args)` to invoke the constructor.
4. Coordinate with engine-write semantics:
   - The transition table is keyed by the bare tag string (`"Dragging"`).
   - The runtime helper `_scrml_engine_direct_set` likely extracts the tag from the constructed value via `value.variant` or similar. Verify how the runtime helper handles structured-variant values vs bare-string values.
   - If the helper currently assumes bare-string only, EITHER pass the constructed value AND update the helper to extract the tag, OR pass both the constructed value AND the tag explicitly. Pick the simpler shape and document the choice in progress.md.

## REQUIREMENTS

1. **Payload-bearing engine direct-writes emit correct constructor invocations.** The reproducer compiles AND clicking the button doesn't throw a TypeError.
2. **No-payload engine direct-writes continue to work.** `@dragPhase = .Idle` still emits as a bare string.
3. **The `.advance(.Variant(payload))` form also needs to work** if it shares codegen with direct-write. Verify and fix if needed.
4. **Runtime helper compatibility:** if `_scrml_engine_direct_set` needs changes to handle structured-variant values, update it. Document in progress.md.
5. **Regression tests** under `compiler/tests/integration/`:
   - Payload-bearing direct-write (reproducer above)
   - No-payload direct-write (regression guard)
   - Payload `.advance()` if applicable
   - Mixed (file with both payload and no-payload writes)

## INTERACTION WITH OTHER S95 BUGS

- **Bug 1** (just landed) touched `emit-control-flow.ts` for JS-style match value-return codegen. If you discover that variant-constructor emission is shared between match-arms and engine-writes, Bug 1's fix may have already touched the shared helper — verify you're not undoing it.
- **The S95 triage board** at `examples/25-triage-board.scrml` currently uses a workaround (no-payload `DragPhase:enum { Idle, Dragging }` + separate `<draggingTaskId>` cell) precisely because of Bug 2. Once your fix lands, the triage board can be refactored to use the canonical payload-variant form `Dragging(id: number)` — that refactor is a separate PA-side change after this dispatch lands.

## COMMIT DISCIPLINE — S83

Commit after each meaningful change. Don't batch. `git status` MUST be clean before reporting done.

## PROGRESS REPORTING

Create `docs/changes/heads-up-s95-bugs/bug-2-progress.md`. Per-step changes with commit SHAs. Investigation findings (especially: did Bug 1 land a shared helper that affects this work?). Test results.

## FINAL REPORT FORMAT

1. WORKTREE_PATH
2. BRANCH name
3. FINAL_SHA
4. FILES_TOUCHED
5. Root cause + chosen shape (where the constructor call is emitted from)
6. Tests: `bun run test` pass/fail counts before/after
7. **`git -C /home/bryan-maclee/scrmlMaster/scrmlTS status --short` result** — confirm no agent-side leak
8. Maps consulted
9. Deferred items

## SCOPE BOUNDS

In scope: engine direct-write payload variant constructor emission; `.advance()` if shared; runtime helper update if needed; regression tests.

Out of scope: other bugs in catalog; refactoring the S95 triage board (PA does that separately).

## NULL / UNDEFINED RULE (ABSOLUTE)

`null` / `undefined` do NOT exist in scrml source. BOTH map to `not`. `""` / `0` / `false` / `[]` / `{}` are DEFINED values.
