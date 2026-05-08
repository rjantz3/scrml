---
title: A5-3 dispatch brief — typer + symbol-table walker for §51.0.M-Q (S67 ratified extensions; consumes A5-2 AST)
date: 2026-05-08
session: S70 (PA-drafted; A5-2 just shipped at `bdc491c`)
authority: A7 phase ratified S67; A5-1 spec amendments LANDED S68 (`1de05ef`); A5-2 parser-shape LANDED S70 (`bdc491c`)
status: BRIEF READY — awaits convener authorization to fire
predecessor: A5-2 (parser AST-shape extension — LANDED S70 `bdc491c`)
successor:   A5-4 (codegen + runtime extension, ~10-15h)
---

## §1 Scope of A5-3

A5-3 is the **typer + symbol-table walker sub-step** of Phase A7. It consumes the AST that A5-2 produced and fires diagnostics + builds the file-scope EngineMetadata aggregations the typer/codegen needs.

**The five typer responsibilities** (each maps to one or more §34 codes):

| Responsibility | SPEC | §34 codes |
|---|---|---|
| Reject `history` on non-composite state-children | §51.0.N | E-HISTORY-NO-INNER-ENGINE (NEW S68) |
| Reject `internal:rule=` on non-composite state-children | §51.0.O | E-INTERNAL-RULE-NOT-COMPOSITE (NEW S68) |
| Validate `<onTimeout>` `to=` legality vs surrounding `rule=` set | §51.0.M, §51.0.F | E-ENGINE-INVALID-TRANSITION (existing) |
| Validate `<onTimeout>` `to=` variant membership in engine's `for=Type` | §51.0.M, §51.0.E | E-ENGINE-RULE-INVALID-VARIANT (existing — extends the existing fire-site) |
| Reject `<onTimeout>` outside engine state-child / inside `<match>` arm | §51.0.M | E-STRUCTURAL-ELEMENT-MISPLACED (existing — extends the existing catalog row) |
| Cascade-miss diagnostic — extended `E-ENGINE-INVALID-TRANSITION` message naming both engines when write inside composite is rejected by outer's `rule=` | §51.0.Q.3 | (no new code; message-shape extension) |
| Engine cohesion enforcement — nested `<engine>` legal at file scope OR inside another engine's state-child body; forbidden in component bodies, function bodies, snippet bodies | §51.0.K, §51.0.Q.1 | E-COMPONENT-ENGINE-SCOPE (existing, B17) — extended walker |
| Variant validation on `internal:rule=` and `.Variant.history` target | §51.0.O, §51.0.N | E-ENGINE-RULE-INVALID-VARIANT (existing) |
| `parallel` silent-ignore on nested engines / derived engines | §51.0.P | (no new code; silent semantic) |

**Plus EngineMetadata aggregation:** file-scope summary fields `historyAttr` / `internalRules` / `onTimeoutElements` (currently `undefined` per A5-2 BRIEF §3.1) get populated by aggregating from `engineMeta.stateChildren[]`. State-child-level fields are already populated by A5-2.

**A5-3 does NOT do:**

- Codegen (`<onTimeout>` runtime arming, `history` cell synth-write/restore, cascade dispatch wiring) — A5-4.
- Computed-delay relaxation impl (`${expr}<unit>` lowering) — A5-5.
- Item G B-shakeable timer extensions — A5-6.
- Test fixtures + sample updates — A5-7.
- Inner engine recursive parsing into structured AST — DEFERRED. A5-2 captured `NestedEngineEntry { rawText; rawOffset }` per Phase 0 SURVEY §1.5 decision. A5-3 reads the rawText for diagnostic purposes (e.g., recursing into the inner engine's state-children to find `<onTimeout>` to validate). Whether A5-3 invokes the engine-decl construction logic on rawText or punts to A1c is a Phase 0 SURVEY question (see §3.4 below).
- E-CELL-OUT-OF-SCOPE for inner-engine variable visibility — explicitly deferred per §51.0.Q.1 spec ("not fired in v0.next P1; surface to A1c codegen for runtime guard").

A5-3 produces diagnostics + populates EngineMetadata. It walks the A5-2 AST shapes; doesn't modify them.

---

## §2 Spec authority — read every section before walker work

Per pa.md Rule 4 (spec is normative). Quoted line ranges current at HEAD `bdc491c`.

| Deliverable | SPEC section | Lines |
|---|---|---|
| `<onTimeout>` element semantics + `to=` legality (strict-by-default) + placement | §51.0.M | `compiler/SPEC.md:20503-20612` |
| `history` legality (composite only) + `.Variant.history` target form | §51.0.N | `compiler/SPEC.md:20614-20707` |
| `internal:rule=` legality (composite only) | §51.0.O | `compiler/SPEC.md:20709-20770` |
| `parallel` placement + silent-ignore semantics | §51.0.P | `compiler/SPEC.md:20772-20819` |
| Hierarchy + composite state-children + cascade dispatch + cascade-miss diagnostic | §51.0.Q | `compiler/SPEC.md:20821-20988` |
| §34 catalog rows for the new + extended codes | §34 | `E-HISTORY-NO-INNER-ENGINE` line 14250; `E-INTERNAL-RULE-NOT-COMPOSITE` line 14251; `E-STRUCTURAL-ELEMENT-MISPLACED` line 14259 (S67 amendment cites §51.0.M); `E-ENGINE-INVALID-TRANSITION` line 14234; `E-COMPONENT-ENGINE-SCOPE` line 14243; `E-ENGINE-RULE-INVALID-VARIANT` line 14248 |

**Cross-feature spec authority:**

- §51.0.E — `initial=` validation (the substrate variant validation extends). `compiler/SPEC.md:20207-20236`.
- §51.0.F — `rule=` contract (the substrate `to=` legality and `internal:rule=` reuse). `compiler/SPEC.md:20237-20286`.
- §51.0.K — Machine Cohesion footnote (singleton invariant; engine placement rules). `compiler/SPEC.md:20427-20479`.
- §4.15, §24.4 — structural-elements-not-HTML registries (post-A5-1 amendments include `<onTimeout>`).

---

## §3 Existing infrastructure A5-3 inherits

Per primer §12 depth-of-survey discount mitigation checklist (frequency-8 confirmed at A5-2). A5-3 has substantial pre-existing scaffolding:

### §3.1 A5-2 AST surfaces — the input contract

A5-2 (LANDED `bdc491c`) populated these fields on every engine state-child:

```typescript
EngineStateChildEntry {
  tag: string;                              // PascalCase variant name
  rule: EngineRuleForm;                     // §51.0.F (with optional historyForm flag)
  bodyRaw: string;
  isColonShorthand: boolean;
  rawOffset: number;
  // ---- A5-2 NEW ----
  historyAttr: boolean;                     // §51.0.N
  internalRule: EngineRuleForm;             // §51.0.O (parallel to canonical rule=)
  onTimeoutElements: OnTimeoutEntry[];      // §51.0.M (each: {after, to, rawOffset})
  innerEngines: NestedEngineEntry[];        // §51.0.Q.1 (each: {rawText, rawOffset})
}
```

Plus `engine-decl.parallelAttr: boolean` (file-scope only — `false` for non-`parallel` engines).

Plus `EngineRuleForm.single.historyForm?: boolean` and `multi.historyForms?: boolean[]` for `.Variant.history` target.

**Composite state-child marker:** `entry.innerEngines.length > 0`. Use this everywhere.

### §3.2 B14/B15 walkers — the host pass

PASS 10.A (`walkRegisterEngines` in `compiler/src/symbol-table.ts:3680-3720`) registers engine cells and builds the BASIC `EngineMetadata`. PASS 11 (`walkValidateEngineStateChildrenAndRules` per primer §13.7 B15 specifics) walks state-children and fires the existing `W-ENGINE-INITIAL-MISSING` / `E-ENGINE-INITIAL-INVALID-VARIANT` / `E-ENGINE-STATE-CHILD-MISSING` / `E-ENGINE-STATE-CHILD-INVALID-VARIANT` / `E-ENGINE-RULE-INVALID-VARIANT` / `E-ENGINE-RULE-LEGACY-SYNTAX` diagnostics.

**A5-3's natural attachment:** extend PASS 11 (or add PASS 16 — first available number) to walk the new A5-2 fields per state-child.

### §3.3 Existing variant validation in PASS 11

`engineMeta.variants` is populated by PASS 11 from `ast.typeDecls[]`. A5-3's variant checks reuse this set:

- `<onTimeout to=.X/>` — validate `X ∈ engineMeta.variants` → `E-ENGINE-RULE-INVALID-VARIANT` if not.
- `internal:rule=.X` — same check (single + multi targets).
- `.Variant.history` — same check (the target IS a variant; the history suffix is metadata).

### §3.4 Inner engine recursive parsing — Phase 0 question

A5-2 captured `innerEngines: NestedEngineEntry[]` as raw text + offset. A5-3 needs to walk inner engines for several reasons:

- Validate `<onTimeout>` legality recursively (inner engine's state-children may carry their own `<onTimeout>` siblings).
- Cascade dispatch: writes inside inner-engine bodies referencing the OUTER variable need outer-context.
- Variant validation on inner engine's `for=Type`.
- Engine cohesion enforcement (the inner engine's body is a legal nesting context).

**Phase 0 SURVEY question:** does A5-3 invoke the existing engine-decl construction logic on `rawText` to produce a fully-walkable inner-engine record? OR does it punt structural recursion to A1c codegen (which will need to lower the inner engine's structure regardless)?

**PA lean (subject to Phase 0 confirmation):** A5-3 should recursively parse inner engines into proper records — it's the cleanest substrate for the diagnostics A5-3 must fire. The cost is one helper that synthesizes a `block`-like shape from `rawText` + invokes ast-builder's engine-decl path. ~1-2h. Alternative (punt to A1c): forces A1c to do double-duty (parsing AND codegen), and A5-3 has to fire diagnostics from raw text (fragile).

But Phase 0 may discover an existing infrastructure path that simplifies further.

### §3.5 Cascade-miss diagnostic — message-shape extension only

Per §51.0.Q.3 ("No new error code is introduced; the existing E-ENGINE-INVALID-TRANSITION catalog row covers the case — extend message form, not catalog"), the cascade-miss diagnostic is a message-shape extension, not a code addition. The current E-ENGINE-INVALID-TRANSITION fire-site (post-survey identifies exact location) gains a check: if from-state is inside a composite, extend the message to name BOTH engines:

> ```
> E-ENGINE-INVALID-TRANSITION at line N:
>   Inside composite `<Playing>` (outer engine `appMode: AppMode`),
>   write `@appMode = .Inventory` is invalid.
>   Composite `Playing.rule=` permits: .Title, .Paused.
>   (Note: `.Inventory` is a variant of `PlayMode`, not `AppMode` — type mismatch.)
> ```

The "type mismatch" parenthetical is a bonus when the variant is also not in the engine's `for=Type`.

### §3.6 Engine cohesion enforcement — extends B17 walker

PASS 13 (`walkRejectEnginesInComponentDefChildren` per primer §13.7 B17 specifics) currently fires `E-COMPONENT-ENGINE-SCOPE` for engine-decl in component-def.defChildren. A5-3 EXTENDS this to:

- Reject engines in function-decl body / snippet body / arbitrary nested logic block (per §51.0.K).
- Permit engines inside another engine's state-child body (the §51.0.Q.1 nested form — recognized via A5-2's `innerEngines` capture).

The PASS 13 walker recursion shape is already in place; A5-3 extends the predicate.

### §3.7 EngineMetadata file-scope aggregation

Currently:

```typescript
EngineMetadata {
  // populated by B14/B15:
  forType, variants, initialVariant, derivedExpr, varName, isExported, isPinned, stateChildren, parallelAttr (A5-2);

  // STILL undefined (A5-2 BRIEF §3.1):
  historyAttr, internalRules, onTimeoutElements,

  // populated by A5-2 / future:
  innerEngines (state-child-level only), parentEngine,
}
```

A5-3 populates the file-scope summary fields by AGGREGATING from `stateChildren`:

- `historyAttr: boolean` — `true` iff any state-child has `historyAttr: true`.
- `internalRules: EngineRuleForm[]` — flat list of all non-absent `internalRule` values across state-children. (Each carries identifying state-child tag.)
- `onTimeoutElements: OnTimeoutEntry[]` — flat list across state-children. (Each carries identifying state-child tag.)

Phase 0 SURVEY decides whether to keep these as bare arrays or pair with the owning state-child tag (a `{stateChildTag, ...}` shape — likely cleaner for codegen).

### §3.8 Walker placement

Two natural homes:

- **Extend PASS 11** (`walkValidateEngineStateChildrenAndRules`). Adds A5-3's logic alongside B15's existing variant/exhaustiveness/rule= checks.
- **NEW PASS 16** (`walkValidateA7Extensions` or similar). Cleaner separation; A5-3 owns its own pass.

Phase 0 SURVEY decides. PA lean: NEW PASS 16, since A5-3 introduces meaningfully different responsibilities (composite-aware checks, EngineMetadata aggregation, inner-engine recursion). PASS 11 already runs ~80 LOC of B15 logic; adding A5-3 inline could obscure both.

---

## §4 Deliverables — concrete

### §4.1 Diagnostic fire-sites

| # | Fire-site | Code | Condition |
|---|---|---|---|
| 1 | History on non-composite | E-HISTORY-NO-INNER-ENGINE | `entry.historyAttr === true && entry.innerEngines.length === 0` |
| 2 | internal:rule on non-composite | E-INTERNAL-RULE-NOT-COMPOSITE | `entry.internalRule.kind !== "absent" && entry.innerEngines.length === 0` |
| 3 | onTimeout `to=` not in surrounding `rule=` set | E-ENGINE-INVALID-TRANSITION | for each `onTimeout`, validate `to` against `entry.rule` (single/multi/wildcard) |
| 4 | onTimeout `to=` not a variant of engine's `for=Type` | E-ENGINE-RULE-INVALID-VARIANT | `to` not in `engineMeta.variants` |
| 5 | onTimeout outside engine state-child | E-STRUCTURAL-ELEMENT-MISPLACED | (where? markup walker; engine-statechild-parser produced `onTimeoutElements` only inside state-child bodies, so this fire-site is at TAB-time or in a separate markup walker) |
| 6 | onTimeout inside `<match>` block-form arm | E-STRUCTURAL-ELEMENT-MISPLACED | match-arm walker (PASS TBD; B17-territory or extends here) |
| 7 | Cascade-miss diagnostic | E-ENGINE-INVALID-TRANSITION (message ext) | when write inside composite is rejected by outer's `rule=`, extend message to name both engines |
| 8 | Internal:rule= variant validation | E-ENGINE-RULE-INVALID-VARIANT | each target in `internalRule` against `engineMeta.variants` |
| 9 | `.Variant.history` target variant validation | E-ENGINE-RULE-INVALID-VARIANT | the variant component (sans `.history`) validated as in #8 |
| 10 | Engine in component body (extension) | E-COMPONENT-ENGINE-SCOPE | (B17 already; A5-3 extends to A5-2-discovered nested patterns when applicable) |
| 11 | Engine in function/snippet body | E-COMPONENT-ENGINE-SCOPE OR new code | (Phase 0 decides — reuse existing or open a new code) |
| 12 | `parallel` silent-ignore | (none) | when `engine-decl.parallelAttr === true` AND nested OR derived → ignore silently |

### §4.2 EngineMetadata aggregation

| Field | Source | Aggregation |
|---|---|---|
| `historyAttr` | `stateChildren[].historyAttr` | OR-reduce |
| `internalRules` | `stateChildren[].internalRule` (where `kind !== "absent"`) | concat with state-child-tag annotation |
| `onTimeoutElements` | `stateChildren[].onTimeoutElements[]` | concat with state-child-tag annotation |
| `parentEngine` | nested engine's outer-engine record | populated when A5-3 recurses into inner engines |
| `innerEngines` (record-level) | recursively parsed inner engines | populated when A5-3 recurses |

**Phase 0 SURVEY decision:** `internalRules` / `onTimeoutElements` shape — bare arrays or annotated `{stateChildTag, ...}` records. Codegen consumers (A5-4) drive the choice.

### §4.3 Test plan

New file: `compiler/tests/unit/a5-3-typer-walker.test.js`. Sections:

- §A5-3.1 — E-HISTORY-NO-INNER-ENGINE fire conditions (composite + non-composite + edge cases)
- §A5-3.2 — E-INTERNAL-RULE-NOT-COMPOSITE fire conditions
- §A5-3.3 — `<onTimeout>` `to=` legality vs surrounding `rule=` (single, multi, wildcard, absent)
- §A5-3.4 — `<onTimeout>` `to=` variant validation
- §A5-3.5 — `<onTimeout>` placement (outside engine state-child, inside match arm)
- §A5-3.6 — `internal:rule=` variant validation
- §A5-3.7 — `.Variant.history` variant validation
- §A5-3.8 — Cascade-miss diagnostic message shape (composite `<Playing>` outer with rejected inner write to `@appMode`)
- §A5-3.9 — Engine cohesion enforcement (function body, snippet body — extends B17)
- §A5-3.10 — `parallel` silent-ignore on nested + derived
- §A5-3.11 — EngineMetadata aggregation contract (historyAttr OR-reduce, internalRules concat, onTimeoutElements concat)
- §A5-3.12 — Composition (composite state-child with all features triggering all checks)
- §A5-3.13 — Inner engine recursive validation (`<onTimeout>` inside nested engine's state-child fires its own legality check vs INNER's `rule=`, not outer's)

Estimated test count: 40-60 unit tests.

### §4.4 Test invariant

Baseline at `bdc491c`: 9,628 / 60 / 1 / 0 full-suite. Run `bun run test` between each WIP commit. Halt + diagnose at first regression.

---

## §5 Phase 0 SURVEY — MANDATORY before per-step decomposition

Per primer §12 (depth-of-survey-discount frequency-8 at scrmlTS, validated A5-2). A5-3 has high discount-likelihood:

- A5-2 produced clean structured AST → A5-3 reads it directly.
- B14/B15/B17 walker patterns are established (PASS 10.A, PASS 11, PASS 13) — A5-3 mirrors them.
- §51.0.M-Q spec is concrete + bounded → diagnostics are structurally clear.

**Phase 0 deliverables — write to `docs/changes/phase-a7-step-a5-3-typer-walker/SURVEY.md`:**

1. **Locus confirmation** — for each §4.1 fire-site, name exact file + line range.
2. **Walker placement decision** — extend PASS 11 OR new PASS 16. Recommend.
3. **Inner engine recursion** — A5-3 walks inner engines structurally (recommended) OR punts to A1c. Justify with cost + downstream-clarity weighing.
4. **EngineMetadata aggregation shape** — bare arrays vs annotated records. Recommend per A5-4 codegen consumers.
5. **Engine cohesion extension** — does extending PASS 13 to function body / snippet body need new code, or does E-COMPONENT-ENGINE-SCOPE generalize cleanly?
6. **`<onTimeout>` placement walker** — does this need a separate markup walker, or does the existing PASS 13 / state-child PASS 11 cover the practical cases (since A5-2 only captures `onTimeoutElements` inside state-child bodies)?
7. **Cascade-miss diagnostic locus** — name the existing E-ENGINE-INVALID-TRANSITION fire-site that gets the message-shape extension.
8. **Cost decomposition** — recommended sub-steps + WIP-commit boundaries. Per master-list ~5-8h estimate; survey adjusts if needed.
9. **Inner-engine recursion test infrastructure** — how to write end-to-end tests for inner-engine walker (synthesized AST? full-pipeline?).
10. **Any SCOPE CORRECTIONS** — if Phase 0 reveals deliverable shifts, surface explicitly.

**Stop-and-report after Phase 0** — same protocol as A5-2. Do NOT proceed without PA acknowledgment.

---

## §6 Out of scope

- Codegen for §51.0.M-Q (A5-4).
- Computed-delay relaxation impl `${expr}<unit>` (A5-5).
- Item G B-shakeable timer extensions (A5-6).
- Self-host scrml updates (post-v1.0.0).
- E-CELL-OUT-OF-SCOPE for inner-engine variable visibility (explicitly deferred per §51.0.Q.1 spec).
- `history` cell auto-synthesis (`@_<outerVar>_<variantName>_history`) — **A1c codegen** territory per §51.0.N. A5-3 records the requirement; A1c emits.
- A1c codegen orchestrator (independent phase).

---

## §7 CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

(Worktree-isolation block per pa.md F4 standing rule.)

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

## §8 Crash recovery + commit cadence (per pa.md global rule)

- WIP commit after each meaningful unit. Name them `WIP(a5-3): <topic>`.
- Update `docs/changes/phase-a7-step-a5-3-typer-walker/progress.md` (append-only) after each step.
- Branch is the checkpoint. Crash → commits + progress.md = recoverable state.

**Final SHIP commit format:**

`feat(a5-3): SHIP — typer + symbol-table walker for §51.0.M-Q (S67 ratified extensions; E-HISTORY-NO-INNER-ENGINE + E-INTERNAL-RULE-NOT-COMPOSITE + cascade-miss + EngineMetadata aggregation + cohesion extension)`

**Final report back to PA:**

- WORKTREE_ROOT (absolute path)
- AGENT_BRANCH (current branch)
- FINAL_SHA (SHIP commit)
- FILES_TOUCHED (full list)
- TEST_DELTA (baseline 9,628 → 9,628 + N; 0 fail)
- DEFERRED_ITEMS (any deliverable that surfaced complications)
- Anything that surprised you (pre-existing bugs, unexpected interactions)

---

## §9 References

**Required reading:**

1. `docs/changes/phase-a7-step-a5-3-typer-walker/BRIEF.md` (this file) — full read.
2. `docs/changes/phase-a7-step-a5-2-parser-support/BRIEF.md` + `SURVEY.md` + final commit `bdc491c` — A5-2's deliverables (the AST shapes A5-3 consumes).
3. `compiler/SPEC.md:20503-20988` — §51.0.M through §51.0.Q.
4. `compiler/SPEC.md:14234,14243,14248,14250-14251,14259` — §34 catalog rows.
5. `compiler/src/symbol-table.ts:300-415` — A5-2 type extensions (EngineRuleForm, OnTimeoutEntry, NestedEngineEntry, EngineStateChildEntry).
6. `compiler/src/symbol-table.ts:3680-3720` — PASS 10.A engine registration.
7. `compiler/src/symbol-table.ts` — PASS 11 (`walkValidateEngineStateChildrenAndRules`) — B15 source.
8. `compiler/src/symbol-table.ts` — PASS 13 (`walkRejectEnginesInComponentDefChildren`) — B17 source (the cohesion walker A5-3 extends).
9. `compiler/src/engine-statechild-parser.ts` — A5-2 parser (the source of A5-3's input).
10. `docs/PA-SCRML-PRIMER.md` §13.7 — B14/B15/B17 specifics blocks.

**Briefing context:**

11. `pa.md` §"Worktree-isolation" + §"Dispatch landing" (S67 standing rule).
12. Global rules `~/.claude/CLAUDE.md` — Crash Recovery.

---

## §10 Tags

#a7 #a5-3 #typer-walker #s67-amendments #consumes-a5-2-ast #onTimeout-legality #history-composite-only #internal-rule-composite-only #cascade-miss-diagnostic #engine-metadata-aggregation #engine-cohesion-extension #parallel-silent-ignore #inner-engine-recursion-question #brief-ready
