# Spec 01 — Triage Board

**Shape:** drag-and-drop 3-column kanban for triaging work items.

**Why this spec:** exercises state-machine ergonomics (drag phase), iteration with event capture (per-task event handlers), reactive lists (tasks across columns), basic styling, and DOM event handling. Mid-sized — small enough that frontier models should produce something, large enough that quality differences show.

**Scope:** client-only (no server persistence, no auth, no real-time). Persistence is in-memory across the page session only.

---

## Functional requirements

### Initial state
- The app renders three columns side by side: "Inbox", "Doing", "Done"
- Four sample tasks render at start:
  - "Triage incoming bug reports" — in Inbox, position 0
  - "Review PR #42" — in Inbox, position 1
  - "Wire up onboarding flow" — in Doing, position 0
  - "Update changelog" — in Done, position 0

### Drag-and-drop interaction
- Each task is draggable via the HTML5 DnD API (`draggable="true"`).
- Dragging a task and dropping it on a different column moves the task to that column.
- The dropped task appears at the END of the target column (i.e., highest `order` value within that column).
- Dropping on the same column the task came from is a no-op (or visually equivalent; the task may briefly leave + return).
- Tasks within a column render sorted by `order` ascending.

### Visual requirements
- Each column has a heading showing its name.
- Tasks render with title visible.
- Some visual indication exists that an element is draggable (cursor change on hover, or similar).
- Layout: three columns side by side, reasonable spacing, readable typography. Mobile/touch behavior is OUT OF SCOPE.

---

## Acceptance criteria (validator-asserted)

### Compile / build
- The submission compiles without errors.
- For scrml: `bun run compile <file>` exits 0.
- For React+TS: `tsc --noEmit` exits 0 AND `vite build` exits 0.

### Static rendering
- After mount, the DOM contains exactly four task elements with the four expected titles.
- Three column container elements exist, with the correct headings.
- Each task is in the expected initial column.

### Interactive behavior — simulated DnD
The validator simulates a DnD sequence:

1. Find the task with title "Review PR #42".
2. Find the column container for "Doing".
3. Synthesize `dragstart` on the task → `dragover` on the target column → `drop` on the target column → `dragend` on the task.
4. After the drop, the DOM is re-checked:
   - "Review PR #42" task element is now inside the "Doing" column's container.
   - "Doing" column contains exactly 2 tasks ("Wire up onboarding flow" then "Review PR #42" in that order — drop-at-end).
   - "Inbox" column contains exactly 1 task ("Triage incoming bug reports").
   - "Done" column is unchanged.

5. Second move: drag "Update changelog" from Done to Inbox. Re-check:
   - "Inbox" now has 2 tasks ("Triage incoming bug reports", then "Update changelog").
   - "Done" is now empty.

### Failure modes (validator reports each separately)

- **F1 — compile-fail:** code does not compile.
- **F2 — runtime-error-on-mount:** code compiles but throws during initial mount.
- **F3 — initial-state-wrong:** mounts cleanly but the initial DOM doesn't match expected.
- **F4 — drag-not-wired:** drag events fire but don't change state.
- **F5 — drop-target-wrong:** drag moves the task but to the wrong column.
- **F6 — ordering-wrong:** drag moves to correct column but at wrong position.
- **F7 — second-move-fails:** first move works but second move breaks (e.g., state corruption).

---

## What the spec DOES NOT require

- Reordering within a column (only inter-column moves)
- Adding / removing tasks
- Editing task titles
- Persistence beyond page session
- Server interaction
- Touch / mobile support
- Animations
- Undo / redo
- Multi-select
- Keyboard accessibility (DnD with keyboard is its own problem and out of scope here)

These exclusions are intentional. The spec measures **canonical-shape state-driven UI**, not feature breadth.

---

## Reference implementation

The scrml reference implementation exists at `examples/25-triage-board.scrml`. It was authored during S95 heads-up coding and matches this spec. Validators may use it as a known-working baseline.

**Note:** the reference implementation contains workarounds for known compiler bugs (Bug 2 — payload-variant engine writes; Bug 13 — `class:` parens-form reactive toggle; Bug 18 — fixed S95). Models writing scrml without those workarounds may hit those bugs and fail. This is itself a measured outcome — it surfaces which structural-claim cases are blocked by current compiler state.

A React+TS reference implementation does NOT currently exist (deliberately — the benchmark measures what models produce, not author-blessed baselines on the React side). If during analysis we want a baseline, we'll author one separately and mark it as such.

---

## Prompt insertion

The spec body (from `## Functional requirements` to `## What the spec DOES NOT require` inclusive, minus the React-impl note) gets inserted verbatim into the user prompt. Acceptance criteria are NOT shown to the model — they're the validator's contract, not the model's instructions.

The user prompt template (`prompts/user-prompt-template.md`) wraps this content with framing.

---

## Status

- **Designed:** S95 (2026-05-16)
- **Reference impl (scrml):** exists at `examples/25-triage-board.scrml`
- **Reference impl (React+TS):** intentionally absent
- **Validator implementation:** pending (next pass)
