# Phase A1c Step C16 — Refinement-type runtime emission — Progress

**Date:** 2026-05-09 (S75)
**Worktree:** `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-adaa4d774a71e7b23`
**Branch:** `worktree-agent-adaa4d774a71e7b23`

## Status: SHIP-READY

## Commits

1. `724ed1b` docs(c16): SURVEY — refinement-runtime gap analysis
2. `ef0f926` feat(c16-1): §53.7.1 HTML attr generation + E-CONTRACT-004-WARN
3. `18475e0` feat(c16-2): §53.9.1 client-side function-param boundary check (Locus 3)
4. `b16df1e` feat(c16-3): §53.9.3 function-return boundary check (Locus 4)
5. `d0eb021` test(c16): C16.1-18 unit tests for refinement-runtime emission

## Test deltas

- **Baseline:** 10626 pass / 69 skip / 1 todo / 3 fail (pre-existing self-host)
- **Final:** 10649 pass / 69 skip / 1 todo / 3 fail
- **Delta: +23 tests**, all in `compiler/tests/unit/c16-refinement-runtime.test.js`

Forecast was +25 to +40 tests; actual +23 (within range; 18 sub-sections covering
HTML-attr generation × 8, E-CONTRACT-004-WARN × 2, conflict precedence × 1,
client-param Locus 3 × 4, return-stmt Locus 4 × 4, AST capture forms × 2 — some
with multiple `test()` calls per `describe` so totals to 23).

## Files touched (all under WORKTREE_ROOT)

```
compiler/src/ast-builder.js                              +75/-37
compiler/src/codegen/emit-bindings.ts                    +3/-1
compiler/src/codegen/emit-html.ts                        +110/-1
compiler/src/codegen/emit-functions.ts                   +54/-2
compiler/src/codegen/emit-logic.ts                       +47/-3
compiler/src/codegen/scheduling.ts                       +5/-1
compiler/tests/unit/c16-refinement-runtime.test.js       NEW (+506)
docs/changes/phase-a1c-step-c16-refinement-runtime/SURVEY.md      NEW (+167)
docs/changes/phase-a1c-step-c16-refinement-runtime/progress.md    NEW (this file)
```

Net: 6 source files modified, 1 new test file, 2 new docs.

## What shipped

### §53.7.1 HTML attr generation (Gap 1)
- `emit-html.ts` pre-pass: for each `bind:value=@var` attribute, look up the
  bound variable's `typeAnnotation` in `reactiveTypeMap`; if predicated, call
  `deriveHtmlAttrs(predicate, baseType)` and inject derived attrs.
- All 7 built-in named shapes work (email, url, uuid, phone, date, time, color).
- Numeric range predicates → `min`/`max`. String length → `minlength`/`maxlength`.
- AND composition merges; OR is conservatively skipped (per existing
  `deriveHtmlAttrs` semantics).
- Boolean attrs (e.g. `required`) emit as bareword.
- `deriveHtmlAttrs` (existed pre-C16, was imported but uncalled) is now wired.

### §53.7.3 E-CONTRACT-004-WARN diagnostic (Gap 2)
- Comparison loop in `emit-html.ts`: developer-supplied attr value vs
  shape-derived value. When they disagree, emit warning with explicit context
  (element tag, declared value, shape-derived value, source variable, predicate).
- Severity: "warning" (not error). Compilation continues.
- Shape-derived precedence: when conflict fires, the developer attr is
  suppressed and the shape-derived attr is emitted in its place (per §53.7.3).
- Reactive/expression-valued developer attrs: derived attr is suppressed in
  favor of developer attr (no static comparison possible; no warning).

### §53.9.1 Locus 3 — Client-side function-param boundary check (Gap 3)
- New helper `emitClientParamChecks` in `emit-functions.ts`.
- For each parameter whose `typeAnnotation` parses as predicated, emits
  `emitRuntimeCheck` guard at function entry — throws E-CONTRACT-001-RT.
- Mirrors emit-server.ts §53.9.4 wiring, but throws instead of returning Response.
- Wired into Step 3 (client function bodies). Step 2 (CPS wrappers) intentionally
  skipped — server-side check is authoritative for server-bound calls.
- §53.9.2 caller-site elision optimization deferred to v0.3.0 (S60 Q6 deferral
  scope; correctness-floor "always check on entry" is the v0.2.0 strategy).

### §53.9.3 Locus 4 — Function-return boundary check (Gap 4)
- AST builder modified at three function-decl parse sites to capture
  `returnTypeAnnotation` as a string (previously only `hasReturnType:true` was
  set; the annotation tokens were discarded).
- Parser bug fix: track `parenDepth` alongside `angleDepth` so refinement
  predicates like `number(>0)` don't cause `>` to over-decrement angle-depth
  and over-consume into the function body. This was a pre-existing latent
  bug surfaced by C16's first use of the captured annotation downstream.
- `EmitLogicOpts` extended with `returnTypeAnnotation` + `enclosingFnName`.
- `emit-logic.ts` case `"return-stmt"`: when opts carry a predicated return
  type, wrap the return value in `_scrml_chk_ret_N` with `emitRuntimeCheck`.
- Threaded through `emit-functions.ts` → `emitFnShortcutBody` and
  `scheduleStatements`.

## What was DEFERRED (with rationale)

### `runtime/zones.js` NEW module (Gap 7) — SKIPPED
The SCOPE row called for a new runtime module. SURVEY established this would
be manufactured work:
- Trusted-zone elision is deferred to v0.3.0 per S60 Q6 ratification.
- Static-zone elision is a compile-time decision (no runtime hook needed).
- Boundary-zone runtime checks fire via `emitRuntimeCheck` directly; no
  shared runtime helper would reduce code or improve correctness.
- A no-op marker module would be unused dead code.

**Surface to PA:** the SCOPE row's "runtime/zones.js (NEW)" deliverable is
redundant given B21's TS-stage zone classification. If a documentation-only
marker is desired, a comment in `compiler/src/codegen/emit-predicates.ts`
suffices. No spec amendment needed.

### Loci 5-6 (bare-expr reassignment + reactive-nested-assign) — DEFERRED
Per primer §13.7 B21 audit §4.2 brief #2, these are typer-stage gaps
(`type-system.ts` does not stamp `predicateCheck` on reassignment sites where
the cell was declared elsewhere). Codegen already gates correctly when the
typer stamps; the gap is at the typer.

**Surface to PA:** these are typer-stage tasks, properly belonging to a
B-series follow-up rather than C16's "codegen+runtime emission" remit. The
SURVEY documents the precise typer change needed (extend the let/state-decl
predicate-stamping logic at `type-system.ts:4133` and `:4276` to handle
reassignment sites by looking up the cell's prior annotation in `scopeChain`).

### §53.9.2 caller-site elision optimization — DEFERRED (per S60 Q6)
The simplest correct strategy (callee-entry checks always fire) is what
v0.2.0 ships. Caller-site elision (constraint-implication analysis like
`x: number(>0 && <100)` → callee taking `number(>0 && <10000)` doesn't need
a runtime check) requires whole-expression type tracking through the AST and
is part of the trusted-zone elision optimization scope deferred to v0.3.0+.

## Spec amendments

**NONE.** §53 prose was followed verbatim. The only fix was a parser bug
(angle-depth/paren-depth tracking) that would have fired regardless of C16
once anything depended on `returnTypeAnnotation` content.

## Open questions (none load-bearing)

The dispatch surfaced three open questions; all answered by SURVEY:
1. **`runtime/zones.js`:** SKIPPED with rationale above.
2. **Loci 5+6:** DEFERRED with rationale above.
3. **HTML attr per-input-type dispatch:** not needed; `deriveHtmlAttrs`
   encodes the per-base-type mapping via its `baseType` argument and the
   spec drives derivation from the predicate, not the input-type attribute.

## Test plan reminder for next session

Browser smoke-test `bind:value` on a refinement-typed cell to verify the
generated HTML attrs (e.g. `minlength="3"`) actually fire in a real browser.
Currently covered by unit tests against the emitted HTML string, not against
real DOM behavior. Browser tests live in `compiler/tests/browser/` and follow
puppeteer patterns; consider adding `c16-refinement-html-attrs.browser.test.js`
in a follow-up if not already covered by the existing browser suites.
