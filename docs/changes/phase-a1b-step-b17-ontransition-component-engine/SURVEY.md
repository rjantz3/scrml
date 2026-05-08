# A1b B17 — Phase 0 SURVEY

**Date:** 2026-05-07
**Session:** S68
**Branch:** `phase-a1b-step-b17-ontransition-component-engine`
**Driver:** B17 BRIEF.md §"Phase-0 survey gate" + audit §2 brief #8.

## §0 Goal

Confirm walker preconditions, AST shapes, §34 catalog naming, and the both-direction-attribute case before implementing B17. Gate on whether each of the audit §2 brief items 1-7 is actionable today.

## §1 Walker preconditions — by audit §2 brief item

### §1.1 — Item 1: validate `effect=` AND `<onTransition>` placement + form

Audit §2 brief item 1 requires walking engine state-children to validate `effect=` attribute placement and `<onTransition>` element placement.

**Today's AST shape** (per `compiler/src/ast-builder.js`):

- An `<engine>` block parses to `kind: "engine-decl"` (lines 8407-8569).
- Engine body extracted as RAW TEXT (`engine-decl.rulesRaw: string`) — lines 8525-8538 (`for (const child of block.children) rulesRaw += child.raw + "\n"`).
- The legacy `.From => .To` arrow grammar is consumed downstream by `parseMachineRules()` in `type-system.ts` lines 2451+.
- The §51.0.F state-child syntax (`<Small rule=.Big effect=...>`) has NO parser path. No corpus test, sample, or implementation uses `rule=` attribute. Verified via `grep -rln "rule=" /samples /compiler/tests`.

**Verdict:** DEFERRED. The state-child syntax is spec-only.

**Cross-ref:** B15 audit §1.1 — flagged §51.0.F-vs-primer-§7 syntax reconciliation as a deliberation gate. B15 implementation also depends on this resolution.

### §1.2 — Item 2: `effect=` single-target invariant + E-ENGINE-EFFECT-AMBIGUOUS

Same blocker as §1.1. State-children not parsed.

**Verdict:** DEFERRED.

**§34 catalog naming:** `E-ENGINE-EFFECT-AMBIGUOUS` is canonical (line 14231 of SPEC.md):

> "`effect=` attribute used on a state-child whose `rule=` is multi-target. Use `<onTransition>` element child(ren) instead — `effect=` requires a single-target rule."

No new catalog row needed when implementation lands.

### §1.3 — Item 3: `<onTransition>` placement (engine-only) + reuse E-STRUCTURAL-ELEMENT-MISPLACED

`<onTransition>` is registered in spec §4.15 structural-elements registry (line 995):

> | `<onTransition>` | §51.0.H | `to=Variant`, `from=Variant`, `once` (boolean), `if=expr` | bare-body (effect statements) or `:`-shorthand |

§4.15 normative statement (line 1000) requires the block-splitter to classify `<onTransition` openers as scrml-defined structural elements. **This classification is NOT IMPLEMENTED.** `compiler/src/block-splitter.js` does NOT mention `onTransition`, `match`, `engine`, `errors`, or `onTimeout` (verified via grep). The block-splitter is name-neutral; structural classification happens in `ast-builder.js` `_STATE_FORM_LIFECYCLE` set (`{db, schema, engine, machine}`) and `_MARKUP_FORM_LIFECYCLE` set. `onTransition` is in NEITHER.

**Verdict:** DEFERRED. The element is not even tokenized as a structural element today. Activating requires:
1. Add `onTransition` to the appropriate lifecycle set in ast-builder.js (probably `_MARKUP_FORM_LIFECYCLE` or a new `_INSIDE_ENGINE_LIFECYCLE`).
2. Build a parser path for the body forms (effect statements / `:`-shorthand).
3. Compose with engine-state-child parser when that lands.

**§34 catalog naming:** `E-STRUCTURAL-ELEMENT-MISPLACED` already covers this case (line 14250). No new code needed; reuse the canonical "scrml-defined structural element used in wrong context" code per primer §9.6.

### §1.4 — Item 4: `<onTransition>` direction attributes — `to=` / `from=` required + variant validation

Same blocker as §1.3. Element not tokenized.

**Verdict:** DEFERRED.

**§34 catalog status:** No existing rows for `E-ONTRANSITION-NO-DIRECTION` or `E-ONTRANSITION-INVALID-VARIANT`. The audit §2 brief #8 flagged these as TBD. When implementation lands, two new catalog rows in §34 are required. **Naming recommendation** (per BRIEF item 4):
- `E-ONTRANSITION-NO-DIRECTION` — neither `to=` nor `from=` present.
- `E-ONTRANSITION-INVALID-VARIANT` — `to=` / `from=` references unknown variant.

These names parallel `E-ENGINE-EFFECT-AMBIGUOUS` style. Surface as small spec amendment when implementation lands.

**Both-direction-attributes case** (audit §1.3 spot-check edge case): SPEC §51.0.H is silent on whether `<onTransition to=.X from=.Y>` is legal. PA recommendation per BRIEF: forbid both — they are alternative directionalities. Spec amendment recommended (§4 audit follow-up). Not blocking B17.

### §1.5 — Item 5: `once`, `if=expr` pass-through

Both deferred. `once` is a presence-only attribute (no value validation in B17). `if=expr` expression-typing happens later (not B17's territory).

**Verdict:** N/A in B17. Acknowledged.

### §1.6 — Item 6: E-COMPONENT-ENGINE-SCOPE residual fire-sites

This is the ACTIONABLE B17 item.

**SPEC §51.0.K (line 20418-20460):** "A component declaration body that instantiates an engine is FORBIDDEN... `E-COMPONENT-ENGINE-SCOPE` (§34)."

**Component-body markup parser** (the `raw` field of `component-def`): NOT IMPLEMENTED. Per `compiler/src/ast-builder.js` line 6253-6259, `component-def` stores `raw: expr` as a string (not a walkable AST). Engines authored INSIDE the markup body (`<button><engine .../></button>`) are not detected.

**Component-def `defChildren`:** WALKABLE. Per `ast-builder.js` lines 8647-8663, sibling AST nodes consumed after a component-def in the same logic-body parent are attached as `defChildren[]`. These are AST nodes (not raw text).

**However:** today's parser pipeline DOES NOT place `engine-decl` AST nodes inside a logic-body. Per `ast-builder.js` line 9149-9151:

```
// §51.3: engine-decl nodes are children of markup (program), not logic
if (node.kind === "engine-decl") {
  machineDecls.push(node);
}
```

This collector walks markup containers (`markup`, `state`) and only considers engine-decls reached through markup tree traversal. `walkBodyNodes` (line 9162-9171) is the LOGIC-body walker — it does NOT consider engine-decl. Therefore engine-decls never appear in logic-body AST in today's pipeline.

Since `defChildren` consumption (line 8651-8662) operates on the LOGIC body (`body[ci]`/`body[si]`), engines never reach `defChildren` via the parser today.

**Verified empirically:** debug test parsed `${... const Card = <div/>} <engine .../>` → engine ended up as a sibling of the logic block in the outer ast.nodes, NOT in `Card.defChildren`. Empty defChildren confirmed.

**Verdict:** Walker SHIPS. Walker scaffolding is correct and ready. Synthesized AST tests verify firing. End-to-end tests are `.skip`-ed pending preconditions:
1. Component-body markup parser (so engines authored in `raw` body become walkable children).
2. OR — relaxation of the engine-decl placement rule (so engines could appear in logic body, then get vacuumed into defChildren).

### §1.7 — Item 7: reuse E-STRUCTURAL-ELEMENT-MISPLACED

Per primer §9.6 + §4.15 + §24.4, `E-STRUCTURAL-ELEMENT-MISPLACED` is the canonical code for misplaced structural elements. **No new code introduced** by B17.

The two §18.0.2-specific codes already exist:
- `E-MATCH-EFFECT-FORBIDDEN` (line 14226) — `effect=` inside `<match>` arms.
- `E-MATCH-ONTRANSITION-FORBIDDEN` (line 14227) — `<onTransition>` inside `<match>` arms.

These are the canonical codes for the §18.0.2 boundary. When the block-form `<match for=Type on=expr>` parser path lands AND `<onTransition>` element is tokenized, B17's deferred work activates and fires THESE codes (not E-STRUCTURAL-ELEMENT-MISPLACED). The B17 BRIEF table at line 81-87 was slightly drifted on this point — the §18.0.2-specific codes are the more precise fire targets for the match-arm cases. Not a blocker; just naming clarity.

## §2 Components-vs-engines case enumeration (BRIEF #6 / audit §1.2)

| Case | Owner | Status |
|---|---|---|
| `<engine>` declared inside component body markup (`raw`) | B17 (deferred) | Component-body markup not parsed |
| `<engine>` consumed into `component-def.defChildren` | B17 SHIP | Walker scaffolding live; parser doesn't produce shape today |
| Engine mount tag `<EngineName/>` inside component body | B17 (deferred) | Component-body markup not parsed |
| Component declaration inside engine body | LEGAL per §51.0.K line 20436 ("an engine body MAY instantiate components") | No fire site |
| Engine inside function body | DEFERRED — no §34 code authorized | Per Rule 4: don't introduce unauthorized codes; surface as spec follow-up if needed |

## §3 §34 catalog deltas required

**By B17 (this dispatch):**
- None. Reuses existing `E-COMPONENT-ENGINE-SCOPE` (line 14239).

**Future steps (when preconditions land):**
- `E-ONTRANSITION-NO-DIRECTION` — new row, §51.0.H, severity error.
- `E-ONTRANSITION-INVALID-VARIANT` — new row, §51.0.H, severity error.
- (Optional) row note for E-COMPONENT-ENGINE-SCOPE clarifying the `defChildren`-form variant once it can fire end-to-end.

## §4 Walker insertion point decision

**Question (BRIEF #8(e)):** does B17 add a new SYM PASS, or fold into B15/B16's pass?

**Decision:** new SYM PASS 11 (`walkRejectEnginesInComponentDefChildren`). Rationale:
- B15 + B16 territories operate on engine-decl + state-child concerns (validate variants, check rule= forms, derived-engine rejections). B17's components-vs-engines walker is a separate semantic concern.
- The walker is small (~50 lines) and self-contained.
- Future B17 deferred items (when their preconditions land) will likely add additional walkers (e.g., `<onTransition>` placement walker). Keeping B17 as PASS 11 leaves room for PASS 11.B / PASS 11.C extensions in the same spirit as PASS 10.A/10.B.

## §5 `<onTransition>` AST shape

**Question (BRIEF #8(d)):** is `<onTransition>` parsed as a structural element with attributes + body, or specialized AST kind?

**Verdict:** N/A today. Element is not tokenized. When implementation lands, the spec §4.15 registry suggests it should be a structural element with:
- Attribute slots: `to=Variant`, `from=Variant`, `once` (boolean), `if=expr`.
- Body form: bare-body (effect statements) OR `:`-shorthand.

A natural AST kind would be `kind: "on-transition"` with `attrs: {to, from, once, if}` and `body: ASTNode[]` (effect statements). Specialized vs generic structural element depends on whether attribute parsing reuses the generic markup parser or has dedicated logic. Recommend dedicated logic similar to `engine-decl` since the attribute set is fixed and validated.

## §6 Survey-effort discount

The BRIEF acknowledged that a deep Phase 0 survey "may surface depth-of-survey-discount" — i.e., if the survey reveals most fire-sites are deferred, the implementation cost shrinks dramatically. **That happened here.** Audit estimate was 3-5h; B17 actual implementation took ~1-2h (single walker, single fire-site, defensive scaffolding only). Most B17 work was the survey itself + comprehensive deferral documentation.

## §7 Items DEFERRED to follow-up steps

A precondition step (or steps) is needed before the rest of B17 activates:

1. **B17-pre-A** — Block-form `<match for=Type on=expr>` parser. Activates `E-MATCH-EFFECT-FORBIDDEN` + `E-MATCH-ONTRANSITION-FORBIDDEN` once the inner element parsers land.
2. **B17-pre-B** — Engine state-children parser (`<Variant rule=.X effect=...>` AS AST nodes — §51.0.F). Activates B15 rule= validation + B17's `effect=` validation.
3. **B17-pre-C** — `<onTransition>` element parser (§51.0.H). Activates B17's onTransition placement / direction-attribute / variant validation.
4. **B17-pre-D** — Component-def body markup parser (so `component-def.raw: string` becomes walkable AST children). Activates the canonical E-COMPONENT-ENGINE-SCOPE fire-site for engines in the component body.
5. **§51.0.F-vs-primer-§7 syntax reconciliation** (cross-ref B15 audit §1.1) — the gate for B17-pre-B.

These are non-trivial parser additions. Per BRIEF "Production-language fidelity, not MVP", a regex-based hack on `engine-decl.rulesRaw` for the new syntax would be premature work that gets thrown away when the parser path lands.

After B17-pre-A through B17-pre-D land, the deferred B17 work activates with tests already authored (`.skip` removed).

## §8 Tags

#a1b-b17 #phase-0-survey #wave-4-closer #components-vs-engines-m20 #onTransition-deferred #effect-attribute-deferred #s68
