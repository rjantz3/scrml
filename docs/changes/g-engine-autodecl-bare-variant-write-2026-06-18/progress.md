# g-engine-autodecl-bare-variant-write-2026-06-18 — progress

Fix the MED gap: auto-declared `<engine for=T>` + bare-variant writes/reads in
a sibling `function` body fire E-VARIANT-AMBIGUOUS. change-id above.

## 2026-06-18 — startup + maps
- Startup verification clean: pwd under worktrees/agent-af5ed82479580631c,
  toplevel matches, tree clean, bun install + pretest OK. First WIP commit f06b74b9.
- Maps: primary.map.md "compiler-source bug fix" routing → error.map (E-VARIANT-AMBIGUOUS
  fix notes / S184 recovery) + structure.map (S192 engine-varname / symbol-table) +
  test.map (bare-variant test anchors). Watermark cc865c (current vs HEAD). Not deeply
  load-bearing beyond confirming this is a type-system bug-fix in B20 bare-variant inference.

## 2026-06-18 — SPEC read (Rule 4)
- §14.10 (8122): a bare `.V` resolves vs "a previously-declared cell or local with a
  known type (`@cell = .V` where `@cell: T`)" AND names "an engine `for=T` qualifier"
  as a resolving locus; the implicit seventh position covers "any other position where
  the type is fixed by the surrounding declaration" (incl. `@cell == .V` comparisons).
- §51.0.C (25165): the engine auto-cell IS a reactive state cell typed to the engine's
  enum; "readable everywhere via canonical access"; writable per rule= contract.
- §7.6.1 (5895): file-level cells reachable from every subsequent `${}` block + state-child
  body; the engine auto-cell participates in file scope identically → visible to sibling fns.
- RULING: a bare-variant write/read to an engine auto-cell from a sibling fn IS intended
  to resolve (the cell's type T is statically known).

## 2026-06-18 — R26 reverse-direction: PA-scoped shape does NOT reproduce
- The PA-scoped repro (auto-engine + sibling-fn `@var = .Variant` WRITE, matching names) and
  the kickstarter §11.1 verbatim recipe BOTH compile clean at HEAD AND at the gap-filing
  commit 99ec1d66 (S195). The WRITE path was already fixed (BUG-2 S102 + §14.10 pos#2 via
  the scopeChain prior-bind lookup at type-system.ts ~9004-9024).
- The original 5-error breakdown (E-STRUCTURAL + 2×E-STATE-UNDECLARED + 2×E-VARIANT-AMBIGUOUS)
  was the 16-remote-data engine-attempt; E-STRUCTURAL + colon-shorthand-markup is the SEPARATE
  g-colon-shorthand-markup-misparse gap (brief acknowledges this).
- BROADER root found (brief predicted "real root can be broader than the PA site"): the
  COMPARISON-in-RETURN shape reproduces — `function f() -> bool { return @phase == .Loading }`
  fires E-VARIANT-AMBIGUOUS ("position type is not an enum"). NOT engine-specific — a plain
  `<phase>: Phase` cell fails identically. The `if (@phase == .Idle)` form already works.

## 2026-06-18 — root + fix
- Root: the `return-stmt` case in type-system.ts visitNode (~10024) wired the return-TYPE
  walker (`inferBareVariantsInExpr` with the fn return type as context, S84 Gap B.3) + the
  call-arg walker (Gap B.4) but NOT the comparison-site pre-pass
  (`inferBareVariantsAtComparisonSites`) that the if/while-condition (~9786) and reactive-init
  (~9037) sites already thread. So `return @cell == .V` fed the bare `.V` to the return-type
  walker with `-> bool` as context → not the variant's enum → spurious E-VARIANT-AMBIGUOUS.
  This was EXPLICITLY logged OUT-OF-SCOPE in bare-variant-binary-expr-inference.test.js's
  S84 header ("return-stmt ... do not currently invoke the bare-variant inference walker").
- Fix: one line + comment — add `inferBareVariantsAtComparisonSites(retExprNode, scopeChain,
  retSpan, errors)` to the return-stmt case BEFORE the return-type walker, mirroring the
  established if-condition path. The helper stamps `_bareVariantInferredAtBinaryExpr` so the
  contextType walker skips resolved idents (no double-fire).
- Verified: I2/K (comparison-in-return, engine + plain cell) → clean; N1 (`return .Loading`
  direct, ret bool) → STILL errors; N2 (`.Bogus` typo) → E-TYPE-063 naming the enum; N3
  (union-shared `.Open`) → E-VARIANT-AMBIGUOUS; N4 (int cell) → STILL errors. §11.1 verbatim +
  write repros regression-clean.
- +10 unit tests (engine-autodecl-bare-variant-write.test.js); existing bare-variant + engine
  suite (123 tests) green.

## 2026-06-18 — next
- Full `bun run test` (browser/conformance/self-host); gap flip + §0 regen.
