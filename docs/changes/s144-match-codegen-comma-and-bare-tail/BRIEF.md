# BRIEF — S144 Cluster D (6nz Bug Y + Bug AA)
agent: af08f6cb97aa5b092 · scrml-dev-pipeline · isolation:worktree · model:opus · dispatched S144 2026-05-30 on HEAD 88071273 (post A+B/F/C-Z).
discipline: standard S126/S99/S88/S83/S90/R26 verbatim per pa.md.

Bug Y (MED): comma-separated match arms (`match @m { .A => "AA", .B => "BB" }`) → invalid JS `return "AA" ,;`; now gate-caught (E-CODEGEN-INVALID-JS, generic backstop, not a clean source diagnostic). PREFERRED: clean source-level E-MATCH-* rejecting the comma (cohesion — match arms are newline-separated, single canonical form; confirm SPEC §18 + PRIMER §6.2). ALT: accept comma + emit valid JS (trivial trailing-comma strip) — FLAG for PA ratification if chosen (widens grammar). Either closes accept-then-emit-invalid.

Bug AA (MED): bare tail `match` in a plain `function` builds a value-DISCARDING IIFE (returns inside, no outer return) → returns undefined. `return match` / `fn ->T { match }` work (emit `return (IIFE)()`). Ground in SPEC §48 (plain-function implicit-return?) + §18: if implicit-return → emit `return (IIFE)()`; else → clean W-MATCH-VALUE-UNUSED diagnostic. Report finding + direction.

SCOPE-FENCE: emit-match.ts + emit-logic.ts MATCH-regions ONLY (A+B already touched the channel-broadcast/assignment/control-flow regions of emit-logic.ts — do not touch those) + tests. NOT emit-server/control-flow/expr/rewrite/reactive-wiring/block-splitter/client. Don't regress newline arms / return match / fn-form / block-form <match> / => arms.
ACCEPTANCE: tests for both + regression-guards; pre-commit gate.

---
## RE-DISPATCH (corrected fence) — agent a88b7b23ba2d8c787
First dispatch (af08f6cb) returned BLOCKED: PA fence error — fenced to {emit-match.ts, emit-logic.ts} but real loci are emit-control-flow.ts (Bug Y markup path emitMatchExpr L1510 + shared matchArmInlineToMatchArm L995) + emit-functions.ts (Bug AA scheduleStatements L885). Findings ESTABLISHED by that dispatch (no re-derive):
- Bug Y: SPEC §18.2 arms juxtaposed, NO comma separator → reject with NEW E-MATCH-ARM-SEPARATOR (cohesion; don't widen grammar). AST builder captures `,` into match-arm-inline.result (ParseError resultExpr). Cover BOTH markup ${match} + let/const=match paths. Prefer typer-layer detection.
- Bug AA: SPEC §48.11/§7.3 plain function has NO implicit return → undefined is spec-correct; bug = silent value-discarding IIFE → NEW W-MATCH-VALUE-UNUSED at emit-functions.ts scheduleStatements (NOT emit-logic emitFnShortcutBody — dead code for plain fns, prior agent reverted a warning there).
Corrected fence: emit-control-flow.ts, emit-logic.ts (match), emit-functions.ts, type-system.ts, ast-builder.js (only if needed), SPEC.md §34+§18.2+§48.11, diagnostics registry, tests. OUT: emit-expr/event-wiring/reactive-wiring/engine/machines (Bug-AB owns next). +2 §34 codes (Rule 4).
