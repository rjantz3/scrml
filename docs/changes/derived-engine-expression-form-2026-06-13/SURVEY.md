# Phase 0 SURVEY — Derived-engine EXPRESSION form (§51.0.J)

change-id: derived-engine-expression-form-2026-06-13 · agent: scrml-js-codegen-engineer · S190

## 1. Parse — what ast-builder produces TODAY (empirically probed via splitBlocks+buildAST)

| Source form | sourceVar | inlineMatchBody | rulesRaw | Verdict |
|---|---|---|---|---|
| `derived=match @marioState { .Small => .Healthy ... }` (bodied state-children) | `"marioState"` | `".Small \| .Big => .Healthy\n..."` (RAW arm text) | `"<Healthy : ...>"` (the state-children) | PARSES — modern match captured correctly |
| `derived=@miles > 500 ? .High : .Low` (ternary, scalar cell) | `"miles"` | `""` | `"500 ? .High : .Low>\n<High...>"` (LEAKED) | BROKEN — opener-end finder stops at the `>` after `@miles`; `derived=@(IDENT)` regex grabs `@miles` as legacy sourceVar; rest of ternary leaks into rulesRaw |
| `derived=classify(@miles)` (call) | `null` | `""` | `"<High : ...>"` | UNRECOGNIZED — no derived data at all; engine treated as NON-derived |
| legacy `derived=@marioState` (projection arrow rules, `@marioState` is an engine var) | `"marioState"` | `""` | `".Small => .AtRisk\n.Big \| ... => .Safe"` | PARSES — §51.9 legacy projection |

Discrimination signal at parse: **legacy = bare `@ident` only** (sourceVar set, inlineMatchBody empty, rulesRaw holds arrow rules). **modern match = inlineMatchBody non-empty.** **modern ternary/call = NOT PARSED.**

## 2. Discrimination rule (legacy §51.9 vs modern §51.0.J)

CLEAN and already half-encoded:
- symbol-table.ts:5191 ALREADY tags `kind:"inline-match"` when `inlineMatchBody` non-empty, else `kind:"legacy-source-var"`. (Brief's "always legacy-source-var" claim is STALE — the inline-match tag exists.)
- B16 `lookupDerivedEngineMeta` (symbol-table.ts:6841) ALREADY returns hits for any kind != `legacy-source-var` → B16 rejections fire for inline-match.
- DG `buildEngineDerivedAdj` (dependency-graph.ts:1567/1577) ALREADY handles BOTH `legacy-source-var` and `inline-match` cycle edges.
- codegen `collectDerivedEngineDeps` + `buildDerivedEngineClosureBody` (emit-engine.ts:3054/3095) ALREADY handle BOTH kinds; inline-match lowers via `rewriteExpr(`match @VAR {BODY}`)`.

The ONLY stage that does NOT consult `inlineMatchBody` is **type-system `buildMachineRegistry`** (type-system.ts:5124), which gates purely on `sourceVar` → routes the modern match form through the §51.9 `validateDerivedMachines` legacy projection path.

## 3. E-ENGINE-018 / E-ENGINE-004 disentanglement (R26 EMPIRICAL — brief's symptom table CORRECTED)

Brief claimed `derived=match` → E-ENGINE-018 and `derived=@miles>...` → E-ENGINE-004. EMPIRICALLY at HEAD 11c648c7:
- `derived=match @marioState {...}` (bodied) → **E-ENGINE-004** (NOT E-ENGINE-018). Because `buildMachineRegistry` registers it `isDerived:true, sourceVar:marioState` (hasStateChildOpener branch, line 5125), then `validateDerivedMachines` looks for `@marioState` as a machine-bound reactive in `reactiveBindings`. `@marioState` IS a plain enum cell here (not machine-bound) → E-ENGINE-004.
- `derived=@miles > 500 ? .High : .Low` → **E-ENGINE-004** (matches brief).
- To get E-ENGINE-018 you need the legacy projection arrow-rule body whose source IS machine-bound but whose rules are non-exhaustive.

**SURPRISE FINDING (load-bearing):** the brief's "legacy `derived=@machineVar` 1:1 projection WORKS end-to-end" is only true at the **codegen-unit-test** level. Through the **full CLI pipeline**, the c14 canonical shape `<engine for=Health derived=@order>` over a plain enum cell `@order: Phase` ALSO fires **E-ENGINE-004** — because §51.9 legacy projection REQUIRES the source to be a machine-bound reactive (§51.9.3 normative). The c14 unit tests use `runUpToSYM`+`generateClientJs` which SKIPS `validateDerivedMachines`. The genuinely-working full-pipeline legacy form is `examples/14-mario-state-machine.scrml`'s `<engine for=HealthRisk derived=@marioState>` where `@marioState` is itself an ENGINE variable (machine-bound, in reactiveBindings via the Bug-2 loop at type-system.ts:17720). This compiles CLEAN today.

Disentanglement plan: in `buildMachineRegistry`, when `inlineMatchBody` is present (modern match form) OR a modern expr form is present, DO NOT register as a §51.9 `isDerived` projection machine → `validateDerivedMachines` never sees it → no E-ENGINE-004/018. The modern match's exhaustiveness is the match's OWN handling (the `_`/`else` wildcard arm + the E-DERIVED-ENGINE-INITIAL-ABSENT runtime guard already emitted by codegen). The legacy `derived=@machineVar` projection path (arrow rules, machine-bound source) stays UNTOUCHED — its E-ENGINE-018 exhaustiveness over the source enum is genuine and preserved.

## 4. Codegen — does the inline-match recompute work?

YES for the match form (already wired S83 B3): `_scrml_derived_declare(varName, () => { match @VAR {BODY} lowered via rewriteExpr; INITIAL-ABSENT guard })` + `_scrml_derived_subscribe(varName, upstream)` + forced `_scrml_derived_get`. Single-upstream only (the `match @VAR` subject). Multi-cell match subjects + ternary/call need `collectDerivedEngineDeps` to walk a parsed ExprNode for ALL `@cell` reads. Legacy 1:1 path (`_scrml_derived_subscribe("health","order")`) UNCHANGED.

## 5. B16 light-up

Already lit for inline-match (see §2). Setting a non-legacy `derivedExpr.kind` (which already happens for inline-match) fires E-DERIVED-ENGINE-NO-RULES/-NO-INITIAL/-NO-WRITE + DG E-DERIVED-ENGINE-CIRCULAR. VERIFY in build phase that the modern form fires these correctly and NOT E-ENGINE-018/E-ENGINE-INVALID-TRANSITION.

## 6. DESIGN DECISIONS surfaced (vs mechanical)

**(A) match form (`derived=match @x {...}`): MECHANICAL-ONCE-MAPPED.** The fix is one disentanglement in `buildMachineRegistry` (skip §51.9 registration when `inlineMatchBody` present). All other stages already handle it. Exhaustiveness is the match's own (`_`/`else` + INITIAL-ABSENT guard).

**(B) ternary/call forms (`derived=@x > 500 ? .A : .B`, `derived=classify(@x)`): NOT MECHANICAL — needs real parser work + a codegen substrate choice.** Two sub-problems:
  - (B1) The opener-end finder `_findOpenerEnd` stops at the `>` in `@miles > 500`. Need to NOT treat a `>` that is a comparison operator (binary-op context) as the opener close. This is the SAME class as the S188 unquoted-condition-operator work (`>=`/ternary `?`-depth in attr values).
  - (B2) A general `derived=<expr>` needs a parsed ExprNode (not raw text) so codegen can (i) subscribe to ALL `@cell` reads and (ii) recompute. Today no ExprNode is captured for these forms.

DECISION POINT: scope (A) is clean and closes the flagship match example + the B16 light-up + the E-ENGINE-018/004 mis-fire. Scope (B) is a parser+codegen build that risks the opener-end finder (a high-blast-radius function used by EVERY engine opener). Per the brief "full feature build now" + Rule 2 (no ship-the-smaller-surface), BOTH are in scope. Proceeding to build (A) first (low-risk, closes the flagship), then (B) with the opener-end finder guarded narrowly (mirror S188 ternary-depth/operator-ahead discipline) + a parsed-ExprNode derivedExpr.
