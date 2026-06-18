# BRIEF — fix g-engine-autodecl-bare-variant-write (MED, type-system)
# Dispatched S205 (2026-06-18). Agent scrml-js-codegen-engineer, isolation:worktree, opus, bg.
# Agent id: af5ed82479580631c. change-id: g-engine-autodecl-bare-variant-write-2026-06-18.

BUG: auto-declared `<engine for=T initial=.V>` + bare-variant write `@var = .Variant` in a SIBLING
`function` body → E-VARIANT-AMBIGUOUS (§14.10); the typer can't see the auto-cell's type from fn scope.
Kickstarter §11.1 engine recipe doesn't compile (the E-STRUCTURAL part is the SEPARATE
g-colon-shorthand-markup-misparse; focus on E-VARIANT-AMBIGUOUS/E-STATE-UNDECLARED on the auto-cell).

PA scope: E-VARIANT-AMBIGUOUS from B20 inferBareVariantsInExpr (type-system.ts ~1539); engine auto-cell
registered with _cellKind:"engine" + engineMeta.forType (symbol-table.ts, autoDeriveEngineVarName §51.0.C).
Fix: bare-variant resolution must surface @var's engine-cell forType as context from ANY scope (incl.
sibling fn). Root may be broader than the PA site (match-alternation lesson) — verify the full path.

Rule 4: read §14.10 + §51.0.C + §7.6; confirm the write SHOULD resolve (auto-cell type is known). Don't
introduce the E-DG-002-drawing explicit-<var> workaround. Verify: minimal repro + kickstarter §11.1
(bare-body) compile; negatives (ambiguous-union / not-in-enum E-TYPE-063 / no-context) STILL error; FULL
`bun run test` 0-new-fail (type-system fix → within-node allowlist unaffected; if any OVER-BUDGET, REPORT
not edit — PA owns the allowlist at landing). Add regression test. Flip gap → resolved + state.ts --write.

PA landing: S67 file-delta the type-system/symbol-table/test changes; reconcile known-gaps via targeted
flip (base predates other S205 landings); PA-independent repro-verify; merge-before-push gate; push.
F3 bridges if PA wraps first.
