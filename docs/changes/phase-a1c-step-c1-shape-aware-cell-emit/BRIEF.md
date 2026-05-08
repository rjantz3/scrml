---
title: A1c C1 dispatch brief — shape-aware cell emitter (state-decl shape dispatch + Variant C compound + markup-typed derived + default= storage)
date: 2026-05-08
session: S70 (PA-drafted while C0 implementation is in flight)
authority: A1c phase ratified S60; C0 (foundational usage analysis) running; C1 is the first emission step
status: BRIEF READY — awaits convener authorization to fire (deferred until C0 SHIPS)
predecessor: C0 (foundational feature-usage analysis pass — IN FLIGHT at brief draft time)
successor:   C2 (derived-cell reactive computation emission, ~4-6h)
---

## §1 Scope of C1

C1 is the **first emission step** of A1c. It extends the existing cell-emit
infrastructure to dispatch on `state-decl.shape` (the discriminant A1a Step 4
introduced) and emit per-shape correctly:

| Shape | Source form | Emission |
|---|---|---|
| `plain` | `<count> = 0` | reactive cell setup (`_scrml_reactive_set/get`) |
| `decl-with-spec` | `<userName req length(>=2)> = <input type="text"/>` | reactive cell PLUS bound input element + bind:* dispatch shell |
| `derived` | `const <doubled> = @count * 2` | reactive computation closure with dep-tracking from B7's DAG |

**Plus four bundled responsibilities** (all in C1 scope per A1c SCOPE §3.1):

1. **Variant C compound** — nested reactive proxy with field paths (`@formRes.name` resolves to setter/getter on the proxy). State-decl with `children !== undefined`.
2. **Markup-typed derived** (§6.6.17) — derived cell whose `initExpr` produces markup; consumers via `${@cell}` interpolation. State-decl with `_cellKind: "markup-typed"`.
3. **`default=` storage** — emit the `defaultExpr` as a runtime field on the cell descriptor for `reset()` access (γ semantics per L18). C5 will lower `reset()` reads.
4. **Pre-existing Shape 3 V5-strict codegen gap** (S61 Step 11.5 surfaced) — `const <x> = expr` declarations currently emit `_scrml_reactive_set` instead of `_scrml_derived_declare`. C1 fixes this gap as part of shape-aware dispatch.

**C1 emits** (per A1c SCOPE §4.7):

- L1 (markup-as-first-class-value)
- L2 (Variant C compound state)
- L3 (decl-coupled-with-render-spec)
- L15 (`const <derived>` ALL-SCOPE)

**ZERO new diagnostics.** C1 is pure emission; A1b fired all relevant errors.

**C1 does NOT do:**

- Bind:* runtime dispatch wiring (the actual `bind:value` / `bind:checked` / `bind:files` plumbing) — C4. C1 emits the reactive cell + binding HOOK, not the binding dispatch logic.
- Render-spec expansion at `<x/>` use site (the markup walker that finds `<userName/>` and expands to the cell's bindable markup) — C3.
- Derived-cell reactive computation closure with full dep-tracking (the actual `_scrml_derived` runtime semantics) — C2 (C1 emits the declaration; C2 wires the dep-tracking).
- Validity surface synthesis — C8.
- `reset()` runtime call lowering — C5 (C1 stores `defaultExpr`; C5 reads it).
- Validator runtime catalog — C6.
- Refinement-type runtime — C16.
- Engine state-machine emission — C12-C15.
- Channel WebSocket emission — C18.

C1 is the foundational shape-dispatch + storage step. C2-C4 build the runtime layer on top.

---

## §2 Spec authority — read every section before emitter work

Per pa.md Rule 4 (spec is normative). Quoted line ranges current at HEAD `a494586`.

| Deliverable | SPEC section | Lines (post-A5-1 land) |
|---|---|---|
| Three RHS shapes for state declarations | §6.2 | `compiler/SPEC.md:1764-1826` |
| V5-strict access — two forms | §6.1 | `compiler/SPEC.md:1677-1763` |
| Variant C compound state | §6.3 | `compiler/SPEC.md:1827-1894` |
| Reactive arrays | §6.5 | `compiler/SPEC.md:1945-2364` (mostly C-deferred — C1 only handles array INIT, not mutation) |
| Derived reactive values `const <name>` | §6.6 | `compiler/SPEC.md:2365-3134` |
| In-compound derived | §6.6.16 | (within §6.6) |
| Markup-typed derived | §6.6.17 | (within §6.6) |
| Markup-as-first-class-value (PILLAR L1) | §1.4 | `compiler/SPEC.md:123-141` |
| `default=` attribute | §6.8 | `compiler/SPEC.md:4818-4878` |

**Locks emitted:** L1, L2, L3, L15 per A1c SCOPE §4.7.

---

## §3 Existing infrastructure C1 inherits

Per primer §12 depth-of-survey-discount frequency-8 (validated A5-2/A5-3/C0). Phase 0 SURVEY mandate before per-step decomposition.

### §3.1 Existing codegen surface — the touchpoints

| File | Role | Lines | Relevance to C1 |
|---|---|---|---|
| `compiler/src/codegen/emit-logic.ts` | Logic-block emitter (already has SHAPE 3 derived dispatch at line 565-579) | 1,895 | **Primary touchpoint.** The shape-discriminant routing for `state-decl` is already partially implemented for Shape 3; C1 extends to Shape 1 + 2 + compound. |
| `compiler/src/codegen/emit-reactive-wiring.ts` | Reactive cell setup (`_scrml_reactive_set/get`) | 1,002 | Existing infra; C1 routes through it for Shape 1. |
| `compiler/src/codegen/emit-bindings.ts` | Bindable-input wiring | 506 | Existing infra; C1 routes Shape 2 through it (the binding HOOK; full dispatch is C4's territory). |
| `compiler/src/codegen/binding-registry.ts` | Binding registry | 167 | Existing infra; survey verifies. |
| `compiler/src/codegen/emit-html.ts` | Markup emitter | (TBD) | Variant C compound (`@formRes.name`) and markup-typed derived rendering surfaces touch this. |

**Shape 3 partial dispatch already at `emit-logic.ts:565-579`** — survey verifies its scope and decides whether C1 extends it OR refactors into a dedicated `emit-cell-shape.ts` module.

### §3.2 A1b annotation surface C1 reads

Per primer §13.7 + symbol-table.ts, C1 consumes:

| Field | Source | C1 use |
|---|---|---|
| `state-decl.shape` ("plain"/"decl-with-spec"/"derived") | A1a Step 4 + Step 11.5 | shape dispatch entry |
| `state-decl.renderSpec` | A1a Step 5 | Shape 2 detection (non-null iff present) |
| `state-decl.defaultExpr` | A1a Step 6 | runtime storage for reset() access |
| `state-decl.validators[]` | A1a Step 5 + B9/B13 (refined) | (NOT C1 — passed through; C6/C7/C8 consume) |
| `state-decl.children` | Variant C compound | compound detection (non-undefined iff parent) |
| `state-decl.isConst` | A1a Step 4 | derived discriminator (combined with shape) |
| `state-decl._cellKind` (B5) | "plain"/"bindable"/"markup-typed"/"compound-parent"/"engine" | shape disambiguation |
| `state-decl._isBindable` (B5) | derived from renderSpec + element type | Shape 2 binding-dispatch hook eligibility |
| `state-decl._record` (B1) | `StateCellRecord` | name resolution + scope |

**Engine cells (`_cellKind: "engine"`)** — NOT C1 territory. Engines are emitted by C12-C15. C1's shape dispatch SKIPS engine cells silently.

### §3.3 The S61 11.5 deferred gap — pre-existing Shape 3 V5-strict codegen

Per primer §13.7 + S61 Step 11.5 progress.md, A1a folded `reactive-derived-decl` into `state-decl{shape:"derived",isConst:true,structuralForm:false}`. The folding kept legacy emit semantics (`_scrml_reactive_set` for Shape 3 declarations), which is wrong per §6.6 — Shape 3 should emit `_scrml_derived_declare` with dep-tracking. The 11.5 progress.md explicitly defers this to A1c codegen pass.

**C1 closes this gap.** Shape 3 V5-strict (`const <x> = expr`) routes through derived-cell-declaration emission (with dep-tracking from B7's DAG ready to wire — though C2 owns the FULL closure semantics; C1 just emits the declaration call).

### §3.4 B7 derived-cell DAG — the dep-tracking substrate

Per primer §13.7 B7 specifics, B7's DAG (`compiler/src/dependency-graph.ts`) tracks `reads` edges between reactive DG nodes. C1 emits the declaration; C2 wires the closure with dep-tracking that consumes the DAG. **C1 does NOT walk the DAG itself** — that's C2's job. C1 just emits `_scrml_derived_declare("name", () => initExpr)`-shaped calls (or whatever the runtime API is); C2 makes the closure reactive.

### §3.5 C0 FeatureUsage bitmap — does C1 read it?

Per A1c SCOPE §4.7, C1 emits L1/L2/L3/L15. C1 is NOT in the SCOPE §4.7 list of bitmap consumers (those are C5/C6/C8/C12/C14/C16/C18). **C1 does NOT read the bitmap.** It emits cells unconditionally based on AST presence.

C1 may THEORETICALLY observe that `featureUsage.markupTypedDerived` is false and skip a markup-typed-derived code path, but the source-level guard (`_cellKind === "markup-typed"`) is the per-cell check and is structurally sufficient. Skip the bitmap touch; C1 stays simple.

---

## §4 Deliverables — concrete

### §4.1 Shape dispatch coverage

| # | Source form | Detection | Emission |
|---|---|---|---|
| 1 | `<count> = 0` (Shape 1 plain) | `shape:"plain"` AND `renderSpec === null` AND `_cellKind:"plain"` | `_scrml_reactive_set("count", 0)` (or whatever the runtime API is) |
| 2 | `<userName req length(>=2)> = <input type="text"/>` (Shape 2 decl-with-spec) | `shape:"decl-with-spec"` AND `renderSpec !== null` AND `_cellKind:"bindable"` | reactive cell + binding HOOK declaration; the actual bind:* dispatch is C4 |
| 3 | `const <doubled> = @count * 2` (Shape 3 derived, plain expr) | `shape:"derived"` AND `isConst:true` AND `_cellKind:"plain"` (most cases) | `_scrml_derived_declare("doubled", () => @count * 2)` (closure semantics in C2) |
| 4 | `const <badge> = <span>${@userName}</span>` (Shape 3 derived, markup-typed) | `shape:"derived"` AND `isConst:true` AND `_cellKind:"markup-typed"` | derived declaration with markup-typed initExpr; consumers via `${@cell}` route through markup-emission |
| 5 | Variant C compound `<formRes><name>=""</></>` | `_cellKind:"compound-parent"` AND `children !== undefined` | nested reactive proxy with field paths; child decls emit recursively (each child gets its own shape dispatch) |
| 6 | Tier 3 predefined-shape compound `<userInfo>: UserInfo = ("alice", 30, true)` | type annotation references a struct + `(...)` positional binding | (Tier 3 sugar — survey identifies whether C1 handles or whether it's pre-lowered by A1b) |

**`default=` storage:** orthogonal to shape — applies to all shapes per §6.8. C1 emits the runtime descriptor field with `defaultExpr`'s ExprNode form (NOT evaluated; C5 evaluates at reset time).

**`pinned` modifier:** orthogonal to shape — per §6.10, affects forward-ref behavior (already validated by B4). C1 may or may not need to emit a runtime flag — survey verifies (PA lean: `pinned` is a parse-time modifier, no codegen change needed).

### §4.2 Engine cells SKIP

`_cellKind:"engine"` state-decls are SKIPPED by C1's shape dispatch. They're emitted by C12-C15. C1's dispatch table treats them as "not-this-pass."

### §4.3 ONE new runtime helper (revised post-Phase-0 SURVEY)

**Original BRIEF claim: "ZERO new runtime helpers."** Phase 0 SURVEY revised to **ONE new helper** — `_scrml_default_set(name, fn)` for `default=` storage (per §6.8.1; C5 reads at reset time). The compound-parent proxy re-uses `_scrml_derived_declare` (Option A-prime in SURVEY §3.3) to avoid a second new helper.

C1 still routes Shape 1/2/3 through EXISTING runtime APIs (`_scrml_reactive_set/get`, `_scrml_derived_declare`, `_scrml_derived_subscribe`). The single new helper is for `default=` storage only.

If C2 / C3 / C4 need additional runtime APIs (closure plumbing, render-spec expansion, bind:* dispatch), those are their territory — not C1's.

### §4.4 ZERO new error codes

A1b fired all relevant errors. C1 emission is unconditional.

### §4.5 Tests

`compiler/tests/unit/c1-shape-aware-cell-emit.test.js` (NEW). Sections per A1c SCOPE §4.9 forecast (+50 to +80 tests for Wave 1, of which C1 is ~25-40):

- §C1.1 Shape 1 plain — `<x> = 0` emits expected reactive setup
- §C1.2 Shape 2 decl-with-spec — `<x req> = <input/>` emits cell + binding hook
- §C1.3 Shape 3 derived — `const <x> = @y * 2` emits derived declaration
- §C1.4 Shape 3 markup-typed derived — `const <badge> = <span>${@x}</span>` emits with markup-routed consumer access
- §C1.5 Variant C compound — `<form><name>=""</></>` emits proxy + child shapes recursively
- §C1.6 `default=` storage — `<x default=null> = Date.now()` stores defaultExpr accessible to reset()
- §C1.7 Engine cells SKIP — `<engine for=Phase>` doesn't fire C1's dispatch
- §C1.8 Tier 3 predefined-shape compound (if survey decides C1 handles)
- §C1.9 byte-output stability — TodoMVC + kickstarter v2 §3 corpus byte-match-or-deliberate-diff
- §C1.10 Pre-existing S61 11.5 gap closed — Shape 3 V5-strict now emits derived-declare not reactive-set

Estimated test count: 25-40.

### §4.6 Output stability checks

Per A1c SCOPE methodology + S61 11.5 precedent: byte-output for the existing TodoMVC + kickstarter v2 §3 corpus must either remain BYTE-IDENTICAL OR change in a specifically-anticipated way (S61 11.5 noted "byte-output preserved"). The pre-existing Shape 3 gap closure WILL change Shape 3 declarations from `_scrml_reactive_set` to `_scrml_derived_declare` — that's an INTENTIONAL diff. Document it. Other Shape changes may also be intentional. Survey identifies the diff envelope BEFORE implementation.

---

## §5 Phase 0 SURVEY — MANDATORY before per-step decomposition

Per primer §12 (depth-of-survey-discount frequency-8). C1 has high discount likelihood:

- A1a + A1b annotation surface is fully populated (B1-B22 all shipped).
- Codegen has partial Shape 3 dispatch already (`emit-logic.ts:565-579`) — extension point identified.
- A5-2/A5-3 don't change cell emission at all (engine territory) — C1 is decoupled.

**Phase 0 deliverables — write `docs/changes/phase-a1c-step-c1-shape-aware-cell-emit/SURVEY.md`:**

1. **Locus confirmation** — for each §4.1 shape dispatch row, name exact file + line range. Confirm or correct §3.1 best-guesses.
2. **Refactor decision** — extend `emit-logic.ts` shape dispatch in place (current shape 3 lives there) OR extract into a dedicated `emit-cell-shape.ts` module. PA lean: extend in place if dispatch logic stays under ~150 LOC; refactor if it grows beyond.
3. **Variant C compound emission** — recursive shape dispatch on children. Survey confirms recursion entry point + walks through state-decl.children.
4. **Tier 3 predefined-shape compound** (Q4 of survey) — does C1 handle, or is it pre-lowered? Per §14.11 (M10) it's "positional binding" sugar; check ast-builder behavior.
5. **Markup-typed derived** — how does the existing markup emitter route `${@cell}` interpolation when `_cellKind === "markup-typed"`? Survey verifies + corrects.
6. **`default=` storage shape** — runtime descriptor field name + lookup API (since C5 will read it). Survey designs the contract; C5 consumes.
7. **S61 11.5 gap closure** — the explicit diff envelope for the Shape 3 V5-strict route change.
8. **Output-stability test scope** — TodoMVC + kickstarter byte-output expectations post-C1. Survey identifies the diff envelope.
9. **Cost decomposition** — sub-steps + WIP-commit boundaries. Brief estimate 4-6h; survey adjusts if needed.
10. **Any SCOPE CORRECTIONS** — per pa.md Rule 4 + dispatch protocol.

**Stop-and-report after Phase 0.** Same protocol as A5-2/A5-3/C0. No implementation without PA acknowledgment.

---

## §6 Test plan

### §6.1 Unit tests — new file

`compiler/tests/unit/c1-shape-aware-cell-emit.test.js`. Sections per §4.5 above. Target 25-40 tests.

### §6.2 Output-stability tests

- TodoMVC byte-output diff (expected: Shape 3 derived declarations change from `_scrml_reactive_set` to `_scrml_derived_declare`; nothing else)
- Kickstarter v2 §3 corpus byte-output diff (same expectation)
- Any sample with Shape 1/2/3 mix → diff documented

### §6.3 Test invariant (revised post-Phase-0 SURVEY)

**Original BRIEF claim: ~9,727 / 60 / 1 / 0.** Phase 0 SURVEY measured actual main HEAD baseline at `e62bb5a` (S70 wrap): **9,734 / 64 / 1 / 3** (5 reported fails because suite-block double-counts; 3 unique tests).

Three pre-existing fails are self-host parity drift (per S66 user direction — self-host is post-v1.0.0, not load-bearing for v0.2.0):

1. `F-BUILD-002 §3 generated entry parses without SyntaxError` (integration)
2. `Bootstrap L3: self-hosted API compiles compiler` (integration; 5s timeout)
3. `Self-host: tokenizer parity > compiled tab.js exists` (integration)

**C1 invariant: "no NEW fails introduced," not "zero fails total."** Post-C1 fail count must equal the baseline-at-dispatch-time (3 unique tests / 5 suite-counted). Run `bun run test` between sub-steps; assert no new fail names appear.

S70 hand-off recorded `9,752 / 60 / 1 / 0` — that count was incorrect; the 3 self-host fails were always present at S70 close. Cross-machine PA accuracy gap, surfaced in the S71 standing list.

---

## §7 Out of scope

- Bind:* runtime dispatch (C4)
- Render-spec expansion at `<x/>` use site (C3)
- Derived-cell reactive computation closure (C2 — C1 emits declaration only)
- Validity surface synthesis (C8)
- `reset()` runtime call (C5)
- Validator runtime catalog (C6)
- Refinement-type runtime (C16)
- Engine state-machine emission (C12-C15)
- Channel WebSocket emission (C18)
- `<program>` documentary attrs (C19)
- Schema lowering (C17)
- Test-bind / Insight 22 (A8)
- Item C / G / G B-shakeable (A5-4 through A5-7)
- Inner-engine recursive parsing (A1c codegen will produce this naturally)

---

## §8 CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

(Worktree-isolation block per pa.md F4 standing rule. Paste verbatim into agent dispatch prompt.)

```
Your worktree path: derive via `pwd` at startup.

## Startup verification (BEFORE any other tool call)

1. `pwd` → save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git status --short` MUST be clean.
4. `bun install` (worktrees don't inherit node_modules).
5. `bun run pretest` (populates samples/compilation-tests/dist).

## Path discipline

- ALWAYS absolute paths under WORKTREE_ROOT for Write/Edit.
- NEVER paths starting with `/home/bryan-maclee/scrmlMaster/scrmlTS/` directly.
- Translate intake-doc paths through WORKTREE_ROOT.
```

---

## §9 Crash recovery + commit cadence (per pa.md global rule)

- WIP commit after each meaningful unit. Name them `WIP(c1): <topic>`.
- Update `docs/changes/phase-a1c-step-c1-shape-aware-cell-emit/progress.md` (append-only) after each step.
- Branch is the checkpoint. Crash → commits + progress.md = recoverable state.

**Final SHIP commit format:**

`feat(c1): SHIP — shape-aware cell emitter (Shape 1 plain + Shape 2 decl-with-spec + Shape 3 derived + Variant C compound + markup-typed derived + default= storage; closes S61 Step 11.5 deferred gap)`

**Final report back to PA:**

- WORKTREE_ROOT (absolute path)
- AGENT_BRANCH (current branch)
- FINAL_SHA (SHIP commit)
- FILES_TOUCHED (full list)
- TEST_DELTA (baseline → baseline + N; 0 fail)
- Output-stability diff envelope (per §6.2 — what byte-output changed and why; cite S61 11.5 gap closure)
- DEFERRED_ITEMS (any deliverable that surfaced complications)
- Anything that surprised you

---

## §10 References

**Required reading:**

1. `docs/changes/phase-a1c-step-c1-shape-aware-cell-emit/BRIEF.md` (this file) — full read.
2. `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md` §3.1 + §4.1 + §4.7 + §4.8 — A1c scope C1 row.
3. `docs/changes/phase-a1c-codegen/SURVEY.md` — C0 survey (FeatureUsage bitmap shape; C0 doesn't gate C1 in the SCOPE list, but C0's bitmap is the substrate downstream consumers use).
4. `compiler/SPEC.md:1675-3134` — §6.1 V5-strict + §6.2 three RHS shapes + §6.3 Variant C + §6.6 derived (full read).
5. `compiler/SPEC.md:4818-4878` — §6.8 default= + reset() (read for `default=` storage shape).
6. `compiler/src/codegen/emit-logic.ts:565-700` — existing Shape 3 derived dispatch.
7. `compiler/src/codegen/emit-reactive-wiring.ts` — reactive cell setup (existing, ~1000 LOC).
8. `compiler/src/codegen/emit-bindings.ts` — bindable-input wiring (existing, ~500 LOC).
9. `compiler/src/codegen/emit-html.ts` — markup emitter (relevant for markup-typed derived `${@cell}` routing).
10. `compiler/src/types/ast.ts` — state-decl shape definitions.
11. `compiler/src/symbol-table.ts:200-310` — StateCellRecord + EngineMetadata + cell kinds.
12. `docs/PA-SCRML-PRIMER.md` §13.7 B5 + B7 specifics — annotation contracts.
13. `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md` (S60) — A1a shape decisions.
14. S61 Step 11.5 progress.md (search `docs/changes/phase-a1a-step-11-5*/progress.md` if present) — the deferred Shape 3 gap C1 closes.

**Briefing context:**

15. `pa.md` §"Worktree-isolation" + §"Dispatch landing" (S67 standing rule).
16. Global rules `~/.claude/CLAUDE.md` — Crash Recovery.

---

## §11 Tags

#a1c #c1 #shape-aware-cell-emit #shape-1-plain #shape-2-decl-with-spec #shape-3-derived #variant-c-compound #markup-typed-derived #default-storage #closes-s61-step-11-5-deferred-gap #wave-1 #brief-ready
