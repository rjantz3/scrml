# BRIEF — Approach B: patch CE markup-attribute prop-substitution (g-each-inline-component-prop-member-unsubstituted)

Dispatched S202 (2026-06-17) · agent `scrml-js-codegen-engineer` · isolation:worktree · model:opus · bg.
Change-id: each-inline-prop-member-substitution-2026-06-17.

## Verdict source
Deep-dive `scrml-support/docs/deep-dives/each-inline-component-architecture-2026-06-17.md` (S202).
DD refuted the original fork's premise: scrml has NO component-instance model — CE INLINES components in BOTH the <each> and Tier-0 for-lift paths; the `_scrml_modules` component binding is DEAD. Option A (each module-imports like for-lift) describes a non-existent path → from-scratch subsystem, separate gated arc. **B = the near-term fix.**

## Root (verified, in the DD + PA R26)
CE's STEP-2B substitution (buildPropExprMap/substituteProps, component-expander.ts:1163-1290) substitutes expr-valued props into LOGIC-block ExprNode bodies, but the MARKUP-attribute path drops it: a component's own prop (load/row) used as the BASE of a member-access in a markup attr — on a nested component (`<LoadStatusBadge status=load.status/>`) OR on the inlined root's own markup attrs (href, root class) — is left unsubstituted. For-arg is `l` → `load`/`status` undefined → silent ReferenceError (for-lift) / loud E-SCOPE-001 (each).

LIVE in the shipped flagship: PA R26 of examples/23-trucking-dispatch/pages/dispatch/board.scrml on caa8f77b emits `setAttribute("status", load.status)`, `statusLabel(load.status)`, `load.weight_lbs!==null`, `"/dispatch/loads/${load.id}"` (raw), `statusBadgeClasses(status)` — all `load`/`status` UNSUBSTITUTED → cards throw on first render. S200 helper-hoist + member-collapse landed; neither substituted base var load→l.

## Fire sites (component-expander.ts)
expandComponentNode ~:2164+ · substitutePropsInRawExpr ~:2112 (leading-identifier discipline — REUSE) · buildPropExprMap/substituteProps ~:1163-1290 (STEP-2B logic-body machinery to MIRROR for markup-attr path) · structural recursion ~:2057 · walkAndExpand ~:2780.

## The fix (3 steps; inline model STAYS, prop refs substituted to caller value)
1. Substitute the component's own prop into markup-attr member-access bases (nested-component args + inlined-root markup attrs); mirror substitutePropsInExprNode for the markup-attr value path; reuse substitutePropsInRawExpr leading-identifier discipline (don't touch .foo tails / bare-variants / numerics).
2. Resolve inlined-root markup-attr `${}` interps (the href="${load.id}"-emitted-RAW site) through the dynamic-attr lowering a non-inlined root uses, after substitution.
3. Lower the inlined-root class `${}` interp (case-c MED g-inlined-component-root-class-interp-raw) through the module-emitted-root dynamic-class lowering, after substitution.

## Closes (verify each empirically)
g-each-inline-component-prop-member-unsubstituted (HIGH) · g-inlined-component-root-class-interp-raw (MED case-c) · the silent for-lift runtime-ReferenceError class (shared CE root) · the href-${load.id}-raw site.

## SPEC: NO CHANGE (§5.2 sanctions obj.prop; codegen correctness only).

## NO SILENT CAPS: enumerate markup-attr prop-ref shapes; fix bounded set; LOG any shape not covered (e.g. 3-levels-deep).

## Phase 3 — R26 on the REAL board is the acceptance test (S138)
Compile board.scrml; assert emitted board.client.js substitutes the iter var (`l.status`, `setAttribute("status", l.status)`, `statusLabel(l.status)`, `l.weight_lbs`, `"/dispatch/loads/" + l.id`); ZERO bare unsubstituted `load`/`status` in the loop body; node --check 0; happy-dom render (cards render, no ReferenceError). DO NOT mark DONE without it.

## Gates
+browser regression (mirror g-each-component-helper-hoist; both each + for-lift, nested component + member-arg + root-class-interp). S198: re-baseline within-node allowlist for any over-budget fixture IN THE SAME LANDING. Run FULL `bun run test` before DONE.

## F4 / path-discipline / commit-discipline: standard (worktree-absolute Bash edits, no cd-into-main, echo pwd in first commit, merge main at startup, commit-per-change, git status clean before DONE, progress.md per step).
