# Missing primitive — event-with-payload as transition trigger

**Filed:** 2026-05-15 (S95)
**Status:** v0.4+ language-design dispatch candidate
**Author:** S95 heads-up coding session
**User confirmation (verbatim, S95):** *"missing the primitive (ablsolutely)"*
**Connects to:** corrected state-vs-logic axiom (user-voice S94 corrigendum, 2026-05-15)
**Adjacent prior art:** `scrml-support/docs/deep-dives/drag-and-drop.md` (2026-03-28, S~14, pre-v0.next — design context, NOT current truth)

---

## The gap, in one sentence

The state system today cannot **fully describe its own transitions** when those transitions need data the event carries (form input value, drop target column, click coordinates, file payload, mouse position). There is no state-system surface for "event with payload triggers transition consuming the payload" — that bridge is forced into `function` glue.

---

## Why this is load-bearing on the corrected state-vs-logic axiom

The corrected axiom (user-voice S94 corrigendum, S95) says:

> The state system should be able to fully describe its own transitions. State → state is state-system territory. The logic system CAN describe state mutations but it shouldn't HAVE to.

Today, for any UI with event-time data, the state system **CAN'T** describe the transition end-to-end. The event handler has to be a `function` (multi-statement glue) because:
- L19 (§5.2.3) bans multi-statement bare-form event handlers
- A typical event-driven transition needs at least two operations: (a) extract data from event, (b) write to state cell with that data
- Even when those collapse to one assignment (`@dragPhase = .Dragging(task.id)`), the data on the RHS comes from event-context (the `task` loop var), not state-context

The result: every event handler that needs event-data becomes a `function` mutator. The 10% glue category — meant to be the rare case — expands to dominate any interactive UI. **Until this primitive lands the 90/10 fn ratio is not achievable for any UI that responds to user input with state changes.**

---

## What the current language gives us (and what it lacks)

**Today's state-system transition surface (`<engine>` body):**

| Surface | What it describes |
|---|---|
| `rule=.X` / `rule=(.A \| .B)` / `rule=*` | Legal targets of a transition |
| `effect=${...}` | Side-effect run during single-target transition |
| `<onTransition to=X>` / `<onTransition from=X>` | Side-effect run on transition direction |
| `<onTransition once>` / `<onTransition if=expr>` | Conditional/single-fire effect |
| `<onTimeout after=N to=.X>` | Time-triggered transition |
| `<onIdle after=N to=.X>` | Inactivity-triggered transition |
| `derived=expr` | Engine value computed from upstream reactive expression |
| `history` attribute / `.Variant.history` | Composite-state restoration |
| `internal:rule=` | Lifecycle-preserving transition |

**Current limitations:**

- All transitions either (a) fire from authored code (`@var = .X`) — pure or computed from already-reactive state, OR (b) fire from time/idle. **None fire from events.**
- `<onTransition>` bodies execute after the transition fires; they CAN read `event` context only via the runtime escape hatch (and even then it's the JS DOM event, not a structured payload).
- Engine variants can carry payload data (`Dragging(id: number)`), but the only way to populate the payload is to AUTHOR the assignment `@dragPhase = .Dragging(someId)` — meaning some logic-side code has to know the id at write time. The state system can't say "when this DOM event fires on this element, transition to this variant with the event's data as payload."

The missing primitive is the surface that closes this loop: **declarative wiring from a DOM event (with optional payload extraction) to a state-system transition.**

---

## Adjacent prior art — drag-and-drop deep-dive (2026-03-28, pre-v0.next)

The deep-dive at `scrml-support/docs/deep-dives/drag-and-drop.md` is from S~14 (3+ months before v0.next). It identifies the SAME class of gap from a different angle — "how do you wire DnD events to state changes?" — and explores 4 approaches:

- **A: Compiler fix** — recognize `ondragstart`/`ondragover`/`ondrop`/etc. as known event attributes. **Landed.** Confirmed by S95 triage board compilation: `ondragstart=startDrag(task.id)` does wire.
- **B: `<sortable>` wrapper element** — declarative container that auto-handles reorder events. 3 votes (svelte, vue, htmx).
- **C: Wait for `^{}` runtime + SortableJS** — escape hatch via meta. 1 vote (bun).
- **D: `<draggable>` / `<dropzone>` state-type pair** — typed drag-data primitives. 3 votes (react, solid, rust).

**3-3-1 split, unresolved.** No `<sortable>`, `<draggable>`, or `<dropzone>` in stdlib or compiler today.

That deep-dive is about packaging — how to make DnD ergonomic at the application surface. The missing-primitive this file describes is upstream — the underlying state-system transition mechanism. A future `<sortable>` element would likely BUILD ON the missing primitive (its `onreorder` callback would be a state-system transition trigger consuming reorder data). Resolving the primitive first makes the packaging design less speculative.

---

## Sketch — three candidate shapes

These are NOT spec proposals. They're starter material for a future design deliberation. Each sketch is the most surface-minimal shape that closes the loop; the real proposal would be larger.

### Shape 1 — Engine-bound event triggers

Engine state-children declare event handlers that trigger transitions with payload extraction:

```scrml
<engine for=DragPhase initial=.Idle>
    <Idle rule=.Dragging>
        on:dragstart from=<li class="task"> => .Dragging(event.taskId)
    </>
    <Dragging(id) rule=.Idle>
        on:dragend => .Idle
        on:drop    from=<ul class="task-list"> =>
            ${ @tasks = taskMovedTo(@tasks, id, event.dropTarget); .Idle }
    </>
</>
```

- Each state-child can declare `on:event from=<selector> => transition-target` lines.
- `event.X` references inside the transition target are extracted from DOM event context.
- The `=>` body can include a sequence — last expression IS the transition target.
- The engine OWNS the wiring; no `function` decl in user-code is needed for the transition trigger.

**Strengths:** state-system fully self-describes the transition. The event-to-transition map is co-located with the rule= contract.

**Weaknesses:** introduces a new sub-grammar inside engine state-child bodies. The `from=<selector>` shape is complex (which element does the event source from? scoping concerns). Mixing markup-shape inside engine-body grammar is a structural-element-boundary question.

---

### Shape 2 — Attribute-on-markup wired to state-system transition

The event-to-transition wiring lives on the MARKUP side, but the right-hand side is a state-system-recognized transition expression:

```scrml
<li
    class="task"
    draggable=true
    on:dragstart => @dragPhase = .Dragging(task.id)
    on:dragend   => @dragPhase = .Idle
>${task.title}</>
```

- `on:event => expr` is bare-form-compatible (single expression).
- The expression is recognized as a state-system transition if the LHS is `@engineVar` and the RHS is a variant constructor.
- The event-context (`event.X`) is bound to a synthetic `event` local inside the RHS.
- `task.id` closes over the loop variable from the surrounding `${ for ... lift ... }` iteration.

**Strengths:** minimal grammar addition (`on:event => expr` as alternative to `onevent=`); composes with existing bare-form discipline (L19); doesn't require new engine-body grammar.

**Weaknesses:** the `=>` after `on:event=` adds another syntactic shape on top of the existing `onevent=fn()` and `onevent=${(e) => ...}` forms; risks surface bloat. Also doesn't materially change the multi-cell-write case (`dropOn` still needs to do task-move + phase-reset).

---

### Shape 3 — Engine-level event declarations + transition consumption

The engine declares typed events at the engine level; state-children consume them in `rule=`:

```scrml
<engine for=DragPhase initial=.Idle>
    event drop(taskId: number, toColumn: string)
    event dragstart(taskId: number)
    event dragend

    <Idle    rule=.Dragging on:dragstart => .Dragging(event.taskId)></>
    <Dragging(id) rule=.Idle>
        on:dragend => .Idle
        on:drop    => { @tasks = taskMovedTo(@tasks, id, event.toColumn); .Idle }
    </>
</>

<!-- Markup side fires the typed event with explicit payload: -->
<li
    draggable=true
    on:dragstart=dragPhase.fire(dragstart, { taskId: task.id })
    on:dragend=dragPhase.fire(dragend)
>...</>
<ul on:drop=dragPhase.fire(drop, { taskId: @draggingTaskId, toColumn: col })>...</>
```

- The engine has a typed event surface (`event drop(...)`). Variants of the event carry typed payloads.
- The markup `on:event` handlers `fire` events into the engine; the engine's state-child rules describe transitions in response.
- This mirrors XState's `events` model.

**Strengths:** strongest typing — the event surface is part of the engine's type. The state system has full control over which events are admissible per-state. Decouples the DOM event from the state-system event (a single state-event can be fired from multiple DOM events).

**Weaknesses:** heaviest surface — engine grammar grows by a lot. Two-step wiring (DOM event → state event → transition) is more ceremony than today's direct handler.

---

## Recommended next step (advisory only, not a dispatch directive)

A deep-dive on this primitive — comparing the three shapes (and any others surfaced during the dive) against:

- The corrected state-vs-logic axiom (does this shape strengthen state-self-description?)
- The XState / SCXML prior art (what's the academic / industry precedent?)
- The drag-and-drop deep-dive's findings (does this shape make `<sortable>` / `<draggable>` more or less needed downstream?)
- Performance characteristics (event delegation vs per-element listeners; engine-fire dispatch overhead)
- L1 markup-as-value composition (do markup-typed transitions need the same primitive?)

The deep-dive ideally feeds a debate (XState expert vs scrml-engine expert vs minimalist-resistant) to surface the actual cost/benefit tradeoffs before any `compiler/SPEC.md` text gets drafted.

---

## What this primitive DOES NOT solve

Even with the missing primitive landed, there will remain some `function` glue cases:

- **DOM-side ceremony** that doesn't map to state transitions. Example: `ondragover=allowDrop` where the function just calls `event.preventDefault()` for HTML5 DnD plumbing. This is irreducible — it's the DOM's API surface, not application state.
- **Server-function call orchestration** when an event triggers a server fetch whose RESULT then updates state. The fetch + the state-update is a two-step that needs to host both.
- **Validation-gated transitions** where the decision to fire the transition depends on cross-cell predicates. These could be expressed via `if=` on the transition target, but composability with current `rule=` shape is unclear.

These reduce — they don't disappear. A reasonable target post-primitive is "the 10% glue category is genuinely small, not 70-80% of typical app code."

---

## Tags

#missing-primitive #v0.4+ #state-vs-logic-axiom #event-payload-transition #design-deliberation
#deep-dive-candidate #engine-surface-evolution #s95-heads-up-coding
