---
title: "v0.3 Batch 2 Trio A — 14-mario / TodoMVC / load-detail bug fixes"
date: 2026-05-12
session: S87
status: DRAFT — awaits Wave 3 v0.3 fixture-sweep landing + user authorization
authority: pa.md S82 maps-discipline / S83 commit discipline / S67 file-delta landing
predecessors:
  - Wave 3 D2 (S86 `f32bd00`) — surfaced bug families 1, 2, 3, 4
  - scrml-dev codegen fix (S86 `41f7fe9`) — surfaced bug 6 (load-detail)
  - D3b benchmarks (S87 `5762069`) — surfaced bug 5 (`.filter(cb).<member>`, NOT in this trio)
walltime-band: bug 1 (~3-6h) + bug 4 (~4-8h) + bug 6 (~2-4h) — parallel total ~4-8h
fires-as: 3 parallel general-purpose Opus worktree-isolated dispatches
tags: [v0.3, batch-2, trio-a, latent-bugs, parallel-dispatches, s87-prepared]
---

# v0.3 Batch 2 Trio A — 3 file-disjoint latent compiler bug fixes

## §0 File-disjoint matrix — why these 3 in parallel

Per S87 Batch 2 file-territory survey (Task #5):

| Bug | Compiler-src files (primary) | Example/fixture files |
|---|---|---|
| **1. 14-mario enum-payload destructuring** | `emit-engine.ts` / `emit-variant-guard.ts` / possibly `emit-expr.ts` (structural-eq) | `examples/14-mario-state-machine.scrml` |
| **4. TodoMVC form-submit + E-DG-002** | `emit-event-wiring.ts:354` / `dependency-graph.ts:1946-1955` | TodoMVC e2e fixtures (`compiler/tests/browser/playwright/04-todomvc.spec.ts`) |
| **6. load-detail `<li>` text-template lift** | `emit-lift.js` / `emit-control-flow.ts` / `emit-html` | `examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml` |

**Conflict-free pairwise:**

- 1 vs 4: emit-engine + emit-variant-guard (engine codegen) vs emit-event-wiring + dependency-graph (event + DG). DISJOINT.
- 1 vs 6: emit-engine + emit-variant-guard vs emit-lift + emit-control-flow. DISJOINT (control-flow only if Bug 6 needs it; if it stays in emit-lift only, fully disjoint).
- 4 vs 6: emit-event-wiring + dep-graph vs emit-lift + emit-control-flow. DISJOINT.

**Bug 2 (05-multi-step) excluded from Trio A** because Bug 2b touches `emit-expr.ts` which Bug 1 may also touch (structural-eq emission). Sequenced to Trio B.

**Bug 3 (03-contact-book) excluded from Trio A** because it's likely fixture-only + may involve route-inference auth-gate DESIGN call (not a clean mechanical fix). Sequenced to Trio B with a survey-first preamble.

**Bug 5 (.filter(cb).<member> NEW from D3b) excluded from Trio A** because it touches `emit-expr.ts:emitCall` — conflict with Bug 1 if Bug 1's structural-eq fix also touches emit-expr.ts. Sequenced to Trio B after Bug 1 establishes emit-expr.ts territory.

---

## §1 Bug 1 — 14-mario bare-`n` enum-payload destructuring

### §1.1 Symptom (per S86 Wave 3 D2 finding)

When a `<match>` arm uses payload destructuring like `.Mushroom(n) => { @coins = @coins + n }`, the bare `n` reference inside the arm body either:
- Compiles incorrectly such that runtime structural-eq compares the WHOLE enum object (`MarioState`) instead of the VARIANT (`MarioState.Small`), OR
- The payload binding `n` isn't extracted from the variant; the body sees the whole variant object.

Wave 3 D2 e2e test for 14-mario specifies the canonical user-visible AC and fails.

### §1.2 Surface analysis

Per primer §13.7 B20 specifics (S69): the match-arm-block payload binding parser landed at S69. AST node `match-arm-block` has `payloadBindings: string[]` field; the typer's match-arm-block walker binds these names into the arm scope with type `tAsIs()`.

**B20 fixed PARSING + TYPER.** It did NOT fix CODEGEN. Codegen still has gaps:

- For `<engine>` state-children with payload syntax: `emit-engine.ts` + the variant-guard helper at `emit-variant-guard.ts` (~830 LOC factored Phase A10) may not emit the payload extraction.
- For block-form `<match>` arms with payload syntax: `emit-control-flow.ts` (match-arm codegen).
- For the structural-eq comparison: `emit-expr.ts` (the `_scrml_structural_eq` emission for variant pattern matching).

### §1.3 Required reads (verbatim per pa.md)

- `compiler/SPEC.md` §14.10 (M9) bare-variant inference — read offsets via SPEC-INDEX.md.
- `compiler/SPEC.md` §18.0 match-arm patterns — read offsets via SPEC-INDEX.md.
- `compiler/SPEC.md` §51.0.F engine state-child rule= forms — read offsets via SPEC-INDEX.md.
- `docs/PA-SCRML-PRIMER.md` §13.7 B20 specifics — match-arm payload binding contract.
- `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — load-bearing for any scrml fixture authoring.
- `docs/articles/llm-kickstarter-v1-2026-04-25.md` — canonical scrml shape.

### §1.4 Acceptance criteria

1. **Test:** Wave 3 D2 14-mario e2e test (currently failing) PASSES under Chromium + Firefox + WebKit.
2. **Regression:** test suite 11600 → ≥ 11600 + N (where N counts new unit tests added for the codegen fix). 0 regressions.
3. **No SPEC text changes** unless the spec is silent on payload-extraction semantics (in which case surface to PA before encoding).
4. **Idiomatic-examples styling rule** (S86): any test fixture you author uses inline `class=` Tailwind-style, NO file-top `#{}` for styling.

### §1.5 Walltime band

3-6h. If you hit 5h without converging on the codegen fix, STOP and surface to PA for re-scoping (depth-of-survey-discount mitigation per pa.md).

---

## §2 Bug 4 — TodoMVC form-submit + edit-mode + E-DG-002 false-fire

### §2.1 Symptoms (per S86 Wave 3 D2 finding)

Multiple distinct symptoms in TodoMVC e2e tests:

1. **Form-submit handler not propagating** — submitting new-todo form doesn't add an item to the list. Event handler is wired but the write to `@todos` doesn't trigger the reactive update OR the handler itself is mis-resolved.
2. **Edit-mode UI never rendered** — double-click on a todo should enter edit mode (set `@editingId = todo.id` and render the edit input). Edit input never appears.
3. **4× W-DEAD-FUNCTION warnings** at compile time — functions that ARE called from event handlers are being flagged as dead. Indicates the call-detection walker doesn't see event-handler call references.
4. **E-DG-002 false-fire** — reactive variables with no readers detected when they ARE read from event handlers / `for/lift` blocks. Indicates the read-detection walker in dependency-graph misses some read sites.

### §2.2 Surface analysis

Per primer + survey findings:
- `compiler/src/codegen/emit-event-wiring.ts:354` — "Group event bindings by event type (onclick, onsubmit, onchange)". onsubmit dispatch may not propagate to the reactive write site correctly.
- `compiler/src/dependency-graph.ts:1946-1955` — E-DG-002 sweep; the "has readers" accounting at lines 1719+1727+1747+1857 misses some categories of read.

Both fixes are in the dependency-graph + codegen event-wiring territory. May be related (the same walker missing reads triggers both W-DEAD-FUNCTION and E-DG-002).

### §2.3 Required reads

- `compiler/SPEC.md` §5.2 event handlers — bare-call / bare-assignment / bare-single-expression forms.
- `compiler/SPEC.md` §31 dep-graph + E-DG-001/002.
- `compiler/SPEC.md` §34 — W-DEAD-FUNCTION row.
- `compiler/src/dependency-graph.ts` lines 1500-1960 — the existing "has readers" logic.
- Wave 3 D2 spec: `compiler/tests/browser/playwright/04-todomvc.spec.ts` for canonical AC.
- pa.md S82 maps + S83 commit discipline + S67 file-delta.

### §2.4 Acceptance criteria

1. **Test:** Wave 3 D2 TodoMVC e2e test PASSES under all 3 browsers.
2. **W-DEAD-FUNCTION + E-DG-002 false-fires resolved** — TodoMVC compilation produces 0 of either warning.
3. **Regression:** 0 new test failures; existing W-DEAD-FUNCTION / E-DG-002 fire-sites still work for genuine dead code / unread cells.
4. **Add unit tests** covering the call-detection + read-detection corner cases that landed (event handler call refs, for/lift body reads, etc.).

### §2.5 Walltime band

4-8h. Dual-issue (codegen + dep-graph) so larger than Bug 1. If you find a SINGLE root-cause that explains all 4 symptoms, that's the win — surface in progress.md.

---

## §3 Bug 6 — load-detail `<li>` text-template lift inline

### §3.1 Symptom (per S86 scrml-dev codegen fix follow-on)

In `examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml`, an `<li>` inside a for/lift block carrying a text-template (`${@expr}` interpolation) emits invalid client.js code around line 285. Surfaced during scrml-dev codegen fix dispatch; deferred to a separate small fix.

### §3.2 Surface analysis

Per survey: `compiler/src/codegen/emit-lift.js` + `emit-control-flow.ts` + `emit-html` handle lift codegen. The `<li>` shape with text-template body has a specific lowering that's miscompiling.

Run `bun scrml compile examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml` and inspect the generated `load-detail.client.js` line ~285 to reproduce.

### §3.3 Required reads

- `compiler/SPEC.md` §32 `lift` + for/lift semantics.
- `compiler/SPEC.md` §29 text-template interpolation.
- `compiler/src/codegen/emit-lift.js` — current lift codegen.
- pa.md S82 maps + S83 commit discipline + S67 file-delta.

### §3.4 Acceptance criteria

1. **Compile-test:** `bun scrml compile examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml` produces valid JS (Node syntax-check passes on the output).
2. **Add unit test** for the `<li>` + text-template lift shape. Place in `compiler/tests/unit/lift-li-text-template.test.js` (new file).
3. **Regression:** 0 test failures; existing lift tests still pass.

### §3.5 Walltime band

2-4h. Small targeted fix. If the bug is more architectural than a small lowering miss (e.g., the for/lift body parser drops text-templates structurally), surface to PA for re-scoping.

---

## §4 Dispatch shape (all 3, identical)

For each bug, dispatch via:
- `subagent_type: general-purpose`
- `model: opus`
- `isolation: "worktree"`
- `run_in_background: true`

Each prompt MUST include verbatim:
- pa.md F4 startup verification block (pwd / git rev-parse / bun install / bun run pretest)
- pa.md F4 path discipline block
- pa.md S82 maps required first read with currency note (commit `28cd2ac`, 2026-05-11; HEAD will be POST-Wave-3-landing — likely a recent S87 commit)
- pa.md S83 commit discipline two-sided rule
- pa.md S67 file-delta landing instruction
- Anti-patterns + kickstarter required reading
- Idiomatic-examples styling rule reminder
- Task-specific brief (one of §1 / §2 / §3 above)

Final report shape per pa.md:
```
DONE / PARTIAL / BLOCKED
WORKTREE_PATH
FINAL_SHA
FILES_TOUCHED
git status (must be clean)
Maps consulted
Test suite delta
Verdict
Surfaced findings (out-of-scope follow-ups)
Open questions for PA
```

---

## §5 Sequencing within S87 (or S88)

**Pre-flight (gated):** Wave 3 v0.3 fixture-sweep MUST land first. Wave 3 modifies examples/*.scrml + may touch 23-trucking-dispatch + 14-mario shape files. Fire Trio A only AFTER Wave 3's file-delta lands cleanly in main.

**Fire shape:** all 3 in parallel in a single PA message (3 Agent tool uses).

**Landing shape:** each agent's branch → PA reviews `git diff main..<branch>` → `git checkout <branch> -- <files>` from main → single PA-authored commit per agent. Pre-commit hook validates each.

**Trio B (after Trio A lands):** Bug 2a (05-multi-step component-expander) + Bug 2b (05-multi-step variant write) + Bug 3 (03-contact-book auth-gate) + Bug 5 (.filter(cb).<member>). Trio B sequencing depends on what Trio A's emit-expr.ts territory looks like after landing — Bug 2b + Bug 5 may need to be serialized depending on overlap.

---

## §6 Cross-refs

- **Survey:** S87 Task #5 file-territory map (in PA task list)
- **Source bug list:** S86 hand-off Phase 14 (Wave 3 D2 bombshell findings)
- **S86 hand-off:** `handOffs/hand-off-86.md`
- **scrml-dev codegen fix (surfaced load-detail bug):** S86 commit `41f7fe9`
- **D3b benchmarks (surfaced .filter(cb).<member>):** S87 commit `5762069`

**Tags:** #s87 #batch-2 #trio-a #pre-dispatch-scoping #ready-to-fire-after-wave-3
