# Phase A1c Step C16 — Refinement-type runtime emission — SURVEY

**Date:** 2026-05-09 (S75)
**Worktree:** `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-adaa4d774a71e7b23`
**Branch:** `main` (worktree)
**SPEC anchors:** §53 (full chapter), §53.4 (three-zone), §53.7 (HTML attr generation), §53.9.4 (server-side boundary), §53.11 (E-CONTRACT-001/-002/-003/-004-WARN), §53.13 (open SPEC-ISSUEs — out of scope here)

## Pre-survey: SPEC re-read (pa.md Rule 4)

Read SPEC §53.4 (lines 23852-23932), §53.7 (lines 24061-24131), §53.9.4 (lines 24240-24253), §53.11 (lines 24283-24403), §53.13 (lines 24586-24644).

Load-bearing normative statements for C16:

- **§53.4.5 line 23931** — "The check SHALL be emitted at the assignment site, not at a later use site."
- **§53.7.1 line 24067** — "the compiler SHALL automatically generate HTML validation attributes derived from the predicate. This behavior is not opt-in"
- **§53.7.1 line 24107** — "If the element already declares a `type` attribute, the compiler SHALL emit a warning and use the shape-derived type." (E-CONTRACT-004-WARN)
- **§53.7.2 line 24120** — "`bind:value` on a constrained variable SHALL emit a runtime check at every input event, before the reactive assignment is applied."
- **§53.9.4 line 24243** — "The compiler SHALL generate server-side validation code that runs before any database write or business logic, independently of any client-side check."

§34 catalog rows confirmed:
- 14181 E-CONTRACT-001 — Error (TS fires)
- 14182 E-CONTRACT-001-RT — Runtime
- 14183 E-CONTRACT-002 — Error (TS fires)
- 14184 E-CONTRACT-003 — Error (TS fires)
- 14185 E-CONTRACT-004-WARN — Warning

§53.13 open questions (custom shape registry, constraint arithmetic, type aliases, boolean predicates) — explicitly deferred to v0.3.0+; OUT OF SCOPE for C16.

## What B21 already shipped (verified)

### Annotation surface (`compiler/src/type-system.ts`)
- Line 4133 — `let-decl`/`const-decl` annotated with `predicateCheck = { predicate, zone, sourceKind }` for ALL three zones (boundary / static / trusted).
- Line 4276 — `state-decl` annotated identically.
- Helper `upgradeSourceInfoForPredicatedIdent` — closes the trusted-zone scope-aware classification gap.

### Predicate codegen substrate (`compiler/src/codegen/emit-predicates.ts`, 496 lines)
- `predicateToJsExpr(pred, valueExpr)` — comparison / property / named-shape / and / or / not.
- `emitRuntimeCheck(predicate, valueExpr, varName, label, location)` — emits `if (!check) throw E-CONTRACT-001-RT` block.
- `emitServerParamCheck(paramName, predicate, label, fnName, indent)` — emits 400 Response on violation.
- `deriveHtmlAttrs(predicate, baseType)` — exists and complete with full §53.7.1 mapping (numeric `>N → min`, `>=N`, `<N`, `<=N`; string `.length` → `minlength`/`maxlength`; named-shapes via `NAMED_SHAPE_HTML` table).
- `parsePredicateAnnotation(annotation)` — extracts `{ predicate, baseType, label }` from `string(...)`/`number(...)` annotations.
- `NAMED_SHAPE_RUNTIME` table — 7 built-in shapes (email, url, uuid, phone, date, time, color).
- `NAMED_SHAPE_HTML` table — 7 built-in shapes mapped to HTML attrs.

### Boundary-zone fire-sites (`compiler/src/codegen/emit-logic.ts`)
- Line 1003-1011 — let-decl Phase 3 fast path (predicateCheck zone===boundary).
- Line 1022-1027 — let-decl Phase 4 fallback.
- Line 1510-1518 — state-decl Phase 3 fast path (with `_appendSidecar` reactive sidecar).
- Line 1525-1529 — state-decl Phase 4 fallback.
All four sites: emit `_scrml_chk_X = rhs; if (!check) throw...; assign` order.

### Server-side §53.9.4 fire-sites (`compiler/src/codegen/emit-server.ts`)
- Line 597-608 — baseline-CSRF path: per-param annotation lookup → `parsePredicateAnnotation` → `emitServerParamCheck`.
- Line 708-719 — non-CSRF path: identical pattern.

### `bind:value` runtime gating §53.7.2 (`compiler/src/codegen/emit-bindings.ts`)
- Line 8 — imports `parsePredicateAnnotation, predicateToJsExpr, deriveHtmlAttrs` (note: `deriveHtmlAttrs` IMPORTED but NEVER CALLED — see gap below).
- Line 314 — `reactiveTypeMap = buildReactiveTypeMap(fileAST)`.
- Line 406-423 — source-level `bind:value`: predicate check inside event listener (`if (check) reactive_set`).
- Line 670-732 — render-by-tag bindings (Shape 2 expansion): identical predicate gating.

### Test coverage
- `compiler/tests/unit/predicate-codegen.test.js` — 706 lines, 30 sections covering predicateToJsExpr / emitRuntimeCheck / emitServerParamCheck / deriveHtmlAttrs / parsePredicateAnnotation. Tests utilities directly.
- `compiler/tests/unit/predicate-parsing.test.js` — 256 lines.
- `compiler/tests/unit/predicate-types.test.js` — 794 lines.
- `compiler/tests/unit/refinement-three-zone-b21.test.js` — 448 lines, B21 three-zone classification tests.

## C16's actual gaps (post-B21)

### Gap 1 — §53.7.1 HTML attr injection (the load-bearing gap)
**Status:** `deriveHtmlAttrs` exists in emit-predicates.ts but is NEVER CALLED in production code. Imported into emit-bindings.ts line 8 but unused.

**What's missing:** `emit-html.ts` does NOT inject the predicate-derived attrs (minlength, maxlength, min, max, type=email/url/etc) into the rendered HTML when an `<input bind:value=@cell/>` references a refinement-typed cell. The bind:value loop at line 1082-1087 emits only the `data-scrml-bind-value="..."` placeholder; static HTML validation attrs are NOT injected.

**Fix locus:** `emit-html.ts` element attribute emission loop (line ~1073) — when `attr.name === "bind:value"` and the bound `@var` has a refinement-type annotation, call `deriveHtmlAttrs(predicate, baseType)` and inject the resulting attrs alongside the existing `data-scrml-bind-value` placeholder.

**Spec anchor:** §53.7.1 lines 24081-24115 (concrete examples of what HTML must look like compiled).

### Gap 2 — E-CONTRACT-004-WARN diagnostic emission
**Status:** Catalog row exists (§34 line 14185); spec text §53.7.3 line 24127 normative; `deriveHtmlAttrs` returns shape-derived attrs that reveal the conflict; BUT no warning emission site exists in any pass.

**What's missing:** Compare developer-written `type=` (and `minlength`/`maxlength`/`min`/`max`/`required`/`pattern`) against shape-derived attrs from `deriveHtmlAttrs`; emit `E-CONTRACT-004-WARN` when they disagree.

**Fix locus:** Same site as Gap 1 (emit-html.ts attribute loop). Comparing developer-supplied attrs vs derived attrs is local to that loop.

**Spec anchor:** §53.7.3 lines 24127-24131 + §53.11 E-CONTRACT-004-WARN lines 24384-24403.

### Gap 3 — Locus 3 (function-param caller-site boundary check)
**Status:** Server-side via emit-server.ts is wired (§53.9.4 — fires inside server endpoint). CLIENT-SIDE caller-site check at the call expression for client functions and CPS wrappers is NOT wired. The typer does NOT stamp `predicateCheck` on parameter nodes (line 3878 walks params for scope binding only, no predicate stamping).

**Spec implication:** §53.9.2 caller/callee constraint matching is the rule. The simplest correct C16 emission strategy: when calling a client function whose param has a `typeAnnotation` matching `parsePredicateAnnotation`, emit a runtime check in the callee body at function entry (analogous to server). This is the OPPOSITE end of the wire from the call site — it's a single-emission strategy that doesn't require caller-side type analysis. The spec's §53.9.2 elision optimization (caller's constraint implies callee's → no check) is an OPTIMIZATION; the correctness-floor is "always check on entry to the function body". Gap 3 is real and small.

**Fix locus:** `emit-functions.ts` — at the start of every client-side function body where `params[i].typeAnnotation` parses as a predicate, prepend `emitServerParamCheck`-style guard (with a runtime throw, not a 400 Response).

### Gap 4 — Locus 4 (function-return boundary check)
**Status:** Per primer §13.7 B21 §4.2 brief #2, return-site classification is deferred to A1c. Currently `return-stmt` in type-system.ts (line 4980) does scope-walk only; no predicateCheck stamp. emit-logic.ts return-stmt case (line 1538) has no boundary-check emission.

**Spec implication:** §53.9.3 lines 24226-24238 — "The compiler SHALL verify that all return expressions satisfy the constraint, applying the three-zone model to each return site." The spec EXAMPLE explicitly shows a runtime check at the return site for a tax function.

**Fix locus:** Either type-system stamps `predicateCheck` on `return-stmt` (with the enclosing function's return-type predicate as `predicate`), OR emit-logic.ts threads the function's return type into its emit context and gates the return.

**Decision (smallest viable):** thread the enclosing function's `returnType` into the codegen emission options for the body, then in emit-logic.ts case "return-stmt", if return type is predicated, emit the boundary check before the return.

### Gap 5 — Locus 5 (bare-expr reassignment) — DEFERRABLE
**Status:** Per primer brief, the bare-expr walker tracks scope but does NOT re-classify predicates on reassignment. Reassignment statements like `@cell = expr` parsed as bare-exprs would skip the boundary check.

**Spec implication:** §53.4.5 line 23931 — "the assignment site, not a later use site." All assignment-site-reachable forms must check.

**Status check:** In scrml's parser, `@cell = expr` reassignment in a function body is parsed as `state-decl` with `name=cell`, NOT as `bare-expr`. Verified: emit-logic.ts state-decl case line 1510 catches reassignment via `predicateCheck.zone === "boundary"` (which the typer stamps for state-decl reassignment annotations as well — though the annotation only lives at the declaration site, not at re-assignment sites).

**Sub-gap:** The typer stamps `predicateCheck` on state-decl ONLY when `reactAnnot` is present. Reassignment state-decl nodes (where the cell was declared elsewhere) do NOT carry the annotation. This means: re-assignment sites are NOT predicate-checked today. Per §53.4.5, they should be.

**Decision (smallest viable):** thread the cell's declaration-site annotation through the typer's scope, so any state-decl whose name matches a previously-annotated cell gets `predicateCheck` stamped at the reassignment site. This is a typer change, not a codegen change; emit-logic.ts already gates correctly when the stamp is present.

**Status: DEFER.** This is a typer-stage gap, not a codegen-stage gap. Surfaces a question at the typer level — out-of-scope for C16's "codegen+runtime emission" remit. SURVEY surfaces it for next session; the closest A1c/B-series sub-step picks it up.

### Gap 6 — Locus 6 (reactive-nested-assign) — DEFERRABLE
**Status:** Per primer, walker line 4887 lacks zone classification.

**Decision: DEFER.** Same justification as Gap 5 — typer-stage, not codegen-stage.

### Gap 7 — `runtime/zones.js` NEW module
**Status:** No file exists at `compiler/runtime/`, `compiler/src/runtime/`, or top-level. Only `compiler/runtime/stdlib/{auth,crypto,store}.js`.

**Decision per S60 Q6:** trusted-zone elision is DEFERRED to v0.3.0. The marker module would only exist to record where future trusted-zone pruning could happen. Per pa.md hardly-ever rule "DON'T manufacture work" + the SCOPE row's specific "trusted-zone elision deferred to v0.3.0" — `runtime/zones.js` is **NOT NEEDED for C16**. There is no runtime client of trusted-zone elision in v0.2.0; emit-logic.ts gates check emission on `zone === "boundary"` and emits nothing for static/trusted. The marker module would be unused dead code.

**Decision: SKIP `runtime/zones.js` entirely.** Surface to PA: the SCOPE row's "runtime/zones.js (NEW)" deliverable is REDUNDANT given the static-zone elision is already a compile-time decision (no runtime hook needed) and trusted-zone is deferred. If PA wants a documentation marker, a 1-line comment in `compiler/src/codegen/emit-predicates.ts` is sufficient.

## Revised scope vs SCOPE row's 5-7h estimate

**Original SCOPE estimate:** 5-7h "runtime/zones.js (NEW) + codegen/*"

**Revised post-survey estimate:** **2-4h** focused.

Items in scope:
1. **§53.7.1 HTML attr injection** in emit-html.ts (Gap 1) — ~1-2h.
2. **E-CONTRACT-004-WARN** wired at the same site (Gap 2) — ~30min (catalog row + warning emission inside the same loop where attrs compare).
3. **Locus 3 client-side function param entry check** in emit-functions.ts (Gap 3) — ~30-60min.
4. **Locus 4 function-return boundary check** wired through emit-logic.ts (Gap 4) — ~30-60min.

Items SKIPPED with surfaced rationale:
- **`runtime/zones.js`** — manufactured work; not needed (Gap 7).
- **Loci 5 and 6** — typer-stage, not codegen-stage (Gaps 5+6); SURVEY surfaces, primer cited gaps already, defer with note.
- **Trusted-zone elision** — out-of-scope per S60 Q6.

## Q for PA: surface before implementing

1. **`runtime/zones.js`:** Confirm SKIP. Per SURVEY rationale: no runtime client; trusted-zone elision deferred; static-zone elision is compile-time. Surface that the SCOPE row's deliverable is redundant given B21's zone classification already happens in TS stage.
2. **Loci 5+6 (bare-expr / reactive-nested-assign):** confirm DEFER per "typer-stage gap, not codegen-stage". Or PA can pull these into C16 by stamping `predicateCheck` on state-decl reassignment sites in type-system.ts (it would mean coupling typer + codegen in one dispatch — bigger scope).
3. **HTML attr injection scope (Gap 1):** is per-input-type dispatch needed (e.g., text vs number)? Survey reads SPEC §53.7.1 as: derive from predicate, not from input type. The `deriveHtmlAttrs` already encodes this — it returns `type="number"` for numeric base types and `type="email"` etc for named shapes. No per-input-type dispatch needed beyond what's in the existing utility.

## Files touched (planned for implementation phases 1-4)

- `compiler/src/codegen/emit-html.ts` — Gap 1 + Gap 2 (HTML attr injection + E-CONTRACT-004-WARN warning emission).
- `compiler/src/codegen/emit-functions.ts` — Gap 3 (client function param entry checks).
- `compiler/src/codegen/emit-logic.ts` — Gap 4 (return-stmt boundary check, requires return-type threading).
- `compiler/src/codegen/emit-predicates.ts` — possible new helpers (`emitClientParamCheck`, `emitClientReturnCheck`) if cleaner than reusing `emitRuntimeCheck` directly.
- `compiler/tests/unit/c16-refinement-runtime.test.js` (NEW) — coverage for Gap 1-4.

## Estimated test-delta

- Gap 1 HTML attr generation: ~10-15 tests (numeric / string-length / named-shape / E-CONTRACT-004-WARN cases × predicate combos).
- Gap 2 conflict warning: ~3-5 tests.
- Gap 3 client param check: ~5-8 tests.
- Gap 4 function return check: ~5-8 tests.

**Forecast:** +25 to +40 tests.
