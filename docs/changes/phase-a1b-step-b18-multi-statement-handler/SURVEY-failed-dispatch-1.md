# B18 — Phase 0 SURVEY

**Date:** 2026-05-07
**Step:** A1b B18 — L19 multi-statement event-handler validation (E-MULTI-STATEMENT-HANDLER)
**Brief:** `docs/changes/phase-a1b-step-b18-multi-statement-handler/BRIEF.md`
**Spec:** SPEC §5.2.3 (lines 1127-1188), §4.14 (lines 941-983), §34 catalog row 14256, §6.6.1 line 980 (engine state-child cross-ref).

## §1 Survey items (per BRIEF §6 Phase-0 gate)

### (a) Existing walker locus + extension point

**Finding:** Two complementary insertion points exist; neither overlaps the other.

1. **Markup-attribute scope (event-handler attrs):** No existing walker dedicated to attribute-value validation per-attribute. The closest is `walkRenderByTagUses` (B6 PASS 5) which walks every MarkupNode but inspects the tag, not the attrs. There is no AST-level access to original raw opener text after `parseAttributes` runs (the AttrValue nodes record their span but do not preserve sequence-context — the inter-attribute character stream is gone).
2. **Engine state-child `:`-shorthand body:** `engine-statechild-parser.parseEngineStateChildren` yields `EngineStateChildEntry { tag, rule, bodyRaw, rawOffset }`. The `bodyRaw` IS the post-`:` text (engine-statechild-parser.ts:347-356). PASS 11 already walks engines and consumes these entries — extending it for body-form L19 is a natural continuation.

**Verdict:**
- For (1), implement at **AST-builder time** (in `parseAttributes` flow in `ast-builder.js`). We have access to the BS-emitted `block.raw` for markup blocks at line 8355. Scan the opener portion, track expression-internal contexts, fire on top-level `;` mapped to the most-recent event-handler attribute name.
- For (2), extend symbol-table B15 PASS 11 to scan `bodyRaw` of `:`-shorthand state-children for top-level `;`.

### (b) Whether AST already distinguishes single-expression from multi-statement attribute values

**Finding:** No. Today's tokenizer (compiler/src/tokenizer.ts):

- ATTR_CALL emission stops at the matching `)` of the call's args (lines 395-406).
- ATTR_IDENT emission stops at any character outside `[A-Za-z0-9_\-\.@]` (line 391).
- ATTR_EXPR (boolean expression) only emitted for `if=`, `!`-prefix, `(`-prefix, or `${...}` forms.

The AST receives ATTR_CALL, ATTR_IDENT, etc. as **single-shape** attribute values. A multi-statement source like `onclick=fn(); other()` parses as:
```
onclick = fn()         # ATTR_CALL, args="" (just the inner content of fn())
track                  # ATTR_NAME (boolean attr — silent split!)
"hi"                   # ATTR_STRING (orphan, no =)
```
No syntax error today; the second statement is silently swallowed. **This is the silent-bug surface that L19 was designed to catch.**

The tokenizer's "Unexpected char — skip / advance()" branch at lines 498-499 is the silence-source.

### (c) `:`-shorthand body coverage

**Finding:** `:`-shorthand body validation IS in scope. SPEC §4.14 line 980 explicitly cross-refs the same E-MULTI-STATEMENT-HANDLER for `<Idle : startGame(); track()>` form.

`engine-statechild-parser.parseEngineStateChildren` yields `bodyRaw` for each state-child (engine-statechild-parser.ts:373-381). PASS 11 (B15) already walks engines.

**Verdict:** B18 owns BOTH event-handler attrs AND engine state-child `:`-shorthand bodies. The two checks share a single helper (`scanForTopLevelSemicolon`) but live in different walkers — the markup-attribute check at AST-builder time, the state-child body check at SYM PASS 11 (B15) extension.

Match-block `:`-shorthand arm bodies (§18.0.1) are RAW TEXT today (parser limitation analogous to engine state-children). Out-of-scope for B18 v1; surfaced as DEFERRED follow-up.

### (d) `${...}` arrow form is exempt path-distinguished

**Finding:** YES. Tokenizer emits ATTR_EXPR for `${...}` (tokenizer.ts:366-384). The entire bracket-balanced content becomes one opaque token — L19 must NOT scan inside ATTR_EXPR `${...}` attribute values. Per SPEC §5.2.3 line 1144 the explicit `${}` wrapper is valid; the rule only applies to bare-form.

**Verdict:** Implementation passes through ATTR_EXPR `${...}` values without scanning. Inside the source-text scan (markup-attribute path), when we see `${` we skip past matching `}`.

### (e) Existing test coverage of E-MULTI-STATEMENT-HANDLER

**Finding:** Zero matches in `compiler/tests/` and `compiler/src/`. Net-new diagnostic.

## §2 Plan

1. **Helper:** add `scanForTopLevelSemicolon(text: string): SemicolonHit[]` in a new module `compiler/src/multi-statement-scan.ts` (or inline in ast-builder + reused via export). Tracks: paren depth, brace depth, bracket depth, single/double/back-tick string state, line-comment / block-comment state, `${...}` template-literal interpolation depth. Emits each top-level `;` offset.
2. **Markup-attribute check (B18 fire-site #1):** in `ast-builder.js` markup branch (around line 8355), before/after `parseAttributes`, scan the opener portion of `block.raw` (everything from `<` to the matching `>` of the opener — NOT the body). Walk character-by-character with the helper. For each top-level `;`, find the most-recent `attrName=` token in the opener and check if `attrName` matches event-handler shape (`/^on[a-z]+$/i` OR `/^on:/` OR `/^onserver:/` OR `/^onclient:/`). If yes, push TABError(E-MULTI-STATEMENT-HANDLER).
3. **Engine state-child body check (B18 fire-site #2):** in symbol-table.ts B15 PASS 11 (`validateEngineStateChildrenAndRules`), after parsing state-children, for each state-child entry whose body was parsed via `:`-shorthand path AND whose `bodyRaw` contains top-level `;`, push SYMDiagnostic(E-MULTI-STATEMENT-HANDLER). Use the same helper.
4. **Test coverage:** new file `compiler/tests/unit/multi-statement-handler-b18.test.js` covering all 7 scenarios from BRIEF §"TEST EXPECTATIONS" plus a few negative cases.

## §3 OUT-OF-SCOPE / DEFERRED

- **Match-block `:`-shorthand arm bodies (§18.0.1):** parser yields raw text only; same shape as engine state-children. Out of B18 v1; can be added as a future micro-step when match-arm parsing matures.
- **Compile-time validation of named-function existence:** that's resolver territory (B3-style). B18 only validates the bare-form shape.
- **A1c codegen** for bare-form lowering: codegen concern (§5.2.1).

## §4 Spec-prose follow-ups

None expected. SPEC §5.2.3 + §34 row are normative-complete. Cross-refs §4.14 line 980 (engine state-child `:`-shorthand) and §6.6.1 already reference E-MULTI-STATEMENT-HANDLER.
