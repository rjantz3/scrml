# A1b B17 progress log

## 2026-05-07 — startup + Phase 0 survey

- Worktree `/.claude/worktrees/agent-a0f0d1f460a89a789` rebased onto local main `556f540` (B14 SHIP `934100e` + B15/B16/B17 dispatch briefs).
- Branch created: `phase-a1b-step-b17-ontransition-component-engine`.
- `bun install` + `bun run pretest` clean.
- Baseline `bun test compiler/tests/`: **9357 pass / 52 skip / 1 todo / 0 fail** (matches BRIEF expectation).
- Read BRIEF.md, audit `a1b-b17-rule4-audit-2026-05-07.md`, primer §9.6 + §13.7 B14, SPEC §51.0.H + §51.0.K + §18.0.2 + §4.15 + §34 catalog rows for E-COMPONENT-ENGINE-SCOPE / E-ENGINE-EFFECT-AMBIGUOUS / E-STRUCTURAL-ELEMENT-MISPLACED / E-MATCH-EFFECT-FORBIDDEN / E-MATCH-ONTRANSITION-FORBIDDEN.

## Phase 0 survey — findings (CRITICAL)

Walked the parser + ast-builder + symbol-table to locate the hooks B17 needs. **Most B17 fire-sites are NOT actionable today** because the underlying AST isn't materialized.

### Walker preconditions today

| Surface | Status | Walker hook |
|---|---|---|
| Engine state-children (`<Small rule=.Big>` form, §51.0.F) | NOT PARSED — engine body stored as `engine-decl.rulesRaw: string` (legacy `.From => .To` text) | none |
| `<onTransition>` element (§51.0.H, §4.15) | NOT TOKENIZED as a structural element; not in `_STATE_FORM_LIFECYCLE` / `_MARKUP_FORM_LIFECYCLE` of `ast-builder.js`; no AST node kind | none |
| `effect=` attribute (§51.0.H) | NOT PARSED — only legacy `{...}` effect blocks inside `parseMachineRules()` rule lines | none |
| `<match for=Type on=expr>` block-form (§18.0.1) | NOT PARSED — only JS-style `match expr {}` produces `match-arm-block` / `match-arm-inline`. Block-form match has zero implementation today | none |
| Component-def body (`raw` markup string) | NOT PARSED — `component-def.raw: string` | none |
| **Component-def `defChildren`** (sibling AST nodes consumed after a component-def in same parent body) | **WALKABLE** — populated as AST nodes (component-defs hoover up trailing siblings until next component/import/export/type) | `component-def.defChildren[]` |
| Engine inside function-decl body | engine-decl walkable (PASS 10.A descends into `node.body` for all nodes), BUT no scope-context tracking → registers anyway → no fire site | tracking would need new walker state |

### Spec-vs-implementation drift

The §51.0.F state-child syntax (`<Small rule=.Big>`), the `<onTransition>` element (§51.0.H), the `<match for=Type>` block-form (§18.0.1), and the component body markup parser are SPEC-ONLY. No corpus test, sample, or implementation uses them. The `engine-decl.rulesRaw` is parsed by `parseMachineRules()` against the LEGACY `.From => .To` arrow grammar.

**Cross-ref:** B15 audit §1.1 already flagged the §51.0.F-vs-primer-§7 syntax reconciliation as a deliberation point. B17's territory presupposes that work landing.

### Actionable B17 work today (per Phase 0)

1. **E-COMPONENT-ENGINE-SCOPE — engine-decl inside `component-def.defChildren`.** Walk component-def nodes; check defChildren for `kind === "engine-decl"`; fire E-COMPONENT-ENGINE-SCOPE per §51.0.K + §34. This closes the B14-deferred fire-site for the **defChildren-form** of the violation (the `raw` markup form remains deferred pending component-body markup parsing).

### Deferred B17 work (pending preconditions)

| Audit §2 brief item | Status | Blocker |
|---|---|---|
| 1. `effect=` placement + form validation | DEFER | engine-state-children not parsed |
| 2. `effect=` single-target invariant + E-ENGINE-EFFECT-AMBIGUOUS | DEFER | same |
| 3. `<onTransition>` placement (engine-only) | DEFER | element not tokenized |
| 4. `<onTransition>` direction attributes (`to=`/`from=`) + E-ONTRANSITION-NO-DIRECTION + E-ONTRANSITION-INVALID-VARIANT | DEFER | element not tokenized |
| 5. `once`, `if=expr` pass-through | N/A in B17 (acknowledged) | — |
| 6. E-COMPONENT-ENGINE-SCOPE residual fire-sites | **PARTIAL — defChildren actionable; raw markup body deferred** | component-body markup not parsed |
| 7. Reuse E-STRUCTURAL-ELEMENT-MISPLACED | N/A — no fire site reachable | — |
| 8. Phase-0 survey gate — completed (this entry) | DONE | — |

### Deferred items to carry forward

- A precondition step (call it **B17-pre** or fold into A5-2/A5-3) must add:
  - Block-form `<match for=Type on=expr>` parsing.
  - Engine state-children parsing (`<Variant rule=.X effect=...>` AS AST nodes).
  - `<onTransition>` element parsing (under engine state-child).
  - Component-def body markup parsing (so `raw` becomes walkable children).

  These are non-trivial parser additions. Per BRIEF "Production-language fidelity, not MVP", a regex-based hack on `engine-decl.rulesRaw` for the new syntax would be premature work that gets thrown away when the parser path lands.

- The §51.0.F-vs-primer-§7 syntax reconciliation (B15 audit §1.1) is the gate for the parser work.

## 2026-05-07 — implementation

### PASS 11 walker — `walkRejectEnginesInComponentDefChildren`

Added in `compiler/src/symbol-table.ts` (worktree path):

- New SYM PASS 11 between PASS 10.B and the `runSYM` return.
- Walker recurses through `node.children` / `node.body` / `node.consequent` /
  `node.alternate` / `node.arms[].body` mirroring PASS 10.A's shape, plus
  the new branch: when a `component-def` has a `defChildren` array, fire
  `E-COMPONENT-ENGINE-SCOPE` per §51.0.K + §34 for each child whose
  `kind === "engine-decl"`. Recurse into each defChild so nested
  component-defs are also inspected.
- Diagnostic message includes the component name, the engine's `var=` name
  (when present, falling back to the governed type, then to a generic
  placeholder), and the spec-canonical remediation hints (declare engine
  at file scope and mount via `<EngineName/>`, or use `@cell` for
  per-instance state).
- The fire-site is reachable today only via SYNTHESIZED AST. Per ast-builder.js
  line 9149-9151, engine-decl nodes only ever appear as children of markup
  containers (`<program>`, top-level), never inside a logic-body. Logic-body
  is where `defChildren` consumption happens (line 8647-8663). So the
  parser pipeline never produces this shape today. The walker is
  defensive scaffolding — when the precondition (component-body markup
  parser, OR a later engine-decl placement relaxation) lands, the
  walker is already correct.

### Tests (`compiler/tests/unit/engine-component-scope-b17.test.js`)

- §B17.1 — single engine in defChildren → one fire (synthesized AST).
- §B17.2 — no engine in defChildren → no fire.
- §B17.3 — multiple engines in one component's defChildren → one fire each.
- §B17.4 — multiple components each with own engine → fire per (component, engine).
- §B17.5 — engine `var=` override surfaces in diagnostic message.
- §B17.6 — malformed engine-decl (missing var/type) → graceful fallback,
  generic placeholder in message.
- §B17.7 — nested component-def inside another's defChildren — fire on
  the INNER one only (named correctly).
- §B17.8 — component-def reachable via `ast.nodes` but not in
  `ast.components` → still walked.
- §B17.9 — component-def reachable via parent `body[]` → still walked.

DEFERRED `.skip` tests with rationale:
- §B17.skip end-to-end engine in defChildren via parser (parser doesn't
  produce the shape today).
- §B17.skip engine inside component `raw` markup body (markup not parsed).
- §B17.skip engine mount tag inside component body (markup not parsed).
- §B17.skip `effect=` ambiguous on multi-target rule= (state-children not parsed).
- §B17.skip `<onTransition>` placement (element not tokenized).
- §B17.skip `<onTransition>` direction attributes (element not tokenized).
- §B17.skip `<onTransition>` inside `<match>` arm (block-form match not parsed).
- §B17.skip `effect=` inside `<match>` arm (block-form match not parsed).

### Test delta

- Before: 9357 pass / 52 skip / 1 todo / 0 fail.
- After:  9366 pass / 60 skip / 1 todo / 0 fail.
- Delta: +9 pass / +8 skip (matches new tests added: 9 active + 8 deferred).

## 2026-05-07 — REPORTING (per BRIEF §"REPORTING")

### 1. WORKTREE_PATH

`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a0f0d1f460a89a789`

Branch: `phase-a1b-step-b17-ontransition-component-engine`

### 2. FINAL_SHA

`6afa2dffb5da817c079107db2b052c7853257a1a` (HEAD of `phase-a1b-step-b17-ontransition-component-engine`).

Commit chain (post B14 base `934100e`):
- `b0f051d` docs(a1b-b17): Phase 0 survey — startup + walker-precondition findings
- `f78dd90` feat(a1b-b17): SHIP — PASS 11 E-COMPONENT-ENGINE-SCOPE on engine-decl in component-def.defChildren
- `6afa2df` docs(a1b-b17): primer §13.7 B17 row + B17 specifics + Phase 0 SURVEY

### 3. FILES_TOUCHED (full paths from repo root)

- `compiler/src/symbol-table.ts` (PASS 11 walker `walkRejectEnginesInComponentDefChildren` + diagnostic `fireComponentEngineScope` + wiring in `runSYM`).
- `compiler/tests/unit/engine-component-scope-b17.test.js` (NEW — 9 active synthesized-AST tests + 8 .skip deferred end-to-end tests).
- `docs/PA-SCRML-PRIMER.md` (B17 row in §13.7 contracts table + B17 specifics block).
- `docs/changes/phase-a1b-step-b17-ontransition-component-engine/progress.md` (this file).
- `docs/changes/phase-a1b-step-b17-ontransition-component-engine/SURVEY.md` (NEW — Phase 0 walker-preconditions survey).

### 4. TEST_DELTA

- Pre-B17 baseline: 9357 pass / 52 skip / 1 todo / 0 fail.
- Post-B17:        9366 pass / 60 skip / 1 todo / 0 fail.
- Delta: **+9 pass, +8 skip, 0 fail** (matches new tests: 9 active synthesized-AST + 8 deferred-end-to-end .skip).

Pre-commit hook subset (browser excluded): 8642 pass / 49 skip / 1 todo / 0 fail. Post-commit full-suite + browser checks: PASS.

### 5. DEFERRED_ITEMS

Per Phase 0 survey + audit §2 brief mapping:

1. **Item 1 — `effect=` placement + form validation.** DEFERRED. State-children not parsed (engine bodies stored as `engine-decl.rulesRaw: string`).
2. **Item 2 — `effect=` single-target invariant + `E-ENGINE-EFFECT-AMBIGUOUS`.** DEFERRED (same blocker).
3. **Item 3 — `<onTransition>` placement (engine-only).** DEFERRED. Element not tokenized as a structural element.
4. **Item 4 — `<onTransition>` direction attributes (`to=`/`from=`) + new codes `E-ONTRANSITION-NO-DIRECTION` + `E-ONTRANSITION-INVALID-VARIANT`.** DEFERRED. Same blocker.
5. **Item 5 — `once`, `if=expr` pass-through.** N/A in B17 (acknowledged).
6. **Item 6 — E-COMPONENT-ENGINE-SCOPE residual fire-sites.**
   - **defChildren-form: SHIPPED via PASS 11.**
   - `raw` markup body fire-site: DEFERRED (component-body markup parser not implemented).
   - Engine mount tag inside component body: DEFERRED (same blocker).
7. **Item 7 — Reuse `E-STRUCTURAL-ELEMENT-MISPLACED`.** N/A in B17 (no fire site reachable). Note: §18.0.2 match-arm cases use the more specific codes `E-MATCH-EFFECT-FORBIDDEN` / `E-MATCH-ONTRANSITION-FORBIDDEN` (already in §34) when those preconditions land.
8. **Item 8 — Phase-0 survey gate.** COMPLETE. See `SURVEY.md`.

A1b roadmap impact: A precondition step (call it B17-pre or fold into A5-2/A5-3) is needed before the rest of B17 activates. SURVEY.md §7 enumerates the four parser additions required (block-form `<match>`, engine state-children, `<onTransition>` element, component-def body markup). When those land, the deferred B17 work activates with `.skip` tests already authored.

`<onTimeout>` is NOT B17 territory (A5-2/A5-3, Phase A7 sub-step). S68 spec amendment landed but implementation deferred.

### 6. OPEN_QUESTIONS

- **(Audit follow-up §1.3 + §4.)** Both-direction-attributes case on `<onTransition to=.X from=.Y>`: SPEC §51.0.H is silent. PA recommendation is to forbid the both-form (alternative directionalities). Surface as small spec amendment when implementation lands. Not blocking.
- **(BRIEF §5 / B14 audit §1.5 reconciliation.)** The B17 BRIEF table at lines 81-87 cited `E-STRUCTURAL-ELEMENT-MISPLACED` as the canonical code for `<onTransition>` / `effect=` inside `<match>` arms. The §34 catalog (lines 14226-14227) has more specific codes — `E-MATCH-EFFECT-FORBIDDEN` and `E-MATCH-ONTRANSITION-FORBIDDEN`. Those are canonical per §18.0.2. The BRIEF text was slightly drifted; primer §13.7 B17 specifics now records the canonical mapping. Not a blocker.
- **(B15 sibling, audit §1.1.)** §51.0.F-vs-primer-§7 syntax reconciliation (engine `rule=` form) is the gate for the future engine state-children parser (which in turn gates B17's deferred items 1-4). Already flagged in B15 audit; B17 inherits the dependency.

### 7. PRIMER §13.7 B17 ROW DRAFT + B17 specifics block

Already landed in `docs/PA-SCRML-PRIMER.md` §13.7 in commit `6afa2df`. See:
- B17 row in the contracts table (immediately after B14 row).
- B17 specifics block (between B14 specifics and §13.8 promotion ergonomics).

### 8. SURVEY-NOTE

Already landed at `docs/changes/phase-a1b-step-b17-ontransition-component-engine/SURVEY.md` in commit `6afa2df`.

### 9. SPEC-PROSE FOLLOW-UPS

No new §34 catalog rows added by B17 (reuses existing `E-COMPONENT-ENGINE-SCOPE`).

Future spec follow-ups (when preconditions land):
- §34 — add `E-ONTRANSITION-NO-DIRECTION` row.
- §34 — add `E-ONTRANSITION-INVALID-VARIANT` row.
- §51.0.H — clarify whether `<onTransition to=.X from=.Y>` (both-direction-attributes) is legal. PA recommendation: forbid; surface as amendment footnote.
- §34 — optional row note for `E-COMPONENT-ENGINE-SCOPE` clarifying the `defChildren`-form variant once it can fire end-to-end.
- Primer §7 — engine `rule=` syntax example reconciliation (§51.0.F-vs-primer drift, B15 audit §1.1).

### Wave 4 status

**Wave 4 is functionally COMPLETE pending the parser preconditions** (engine state-children + `<onTransition>` element + component-body markup parser). Steps shipped:

- B14 — engine binding + auto-declared variable + cross-file mount + MOD engine-aware exportRegistry.
- B15 — (parallel; not yet observed in this branch).
- B16 — (parallel; not yet observed in this branch).
- B17 — components-vs-engines residual fire-site (defChildren-form) + Phase 0 deferral catalog.

Cross-cutting B18-B22 follow in Wave 5.

