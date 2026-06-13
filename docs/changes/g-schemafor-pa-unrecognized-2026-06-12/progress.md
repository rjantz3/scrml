# Progress — g-schemafor-pa-unrecognized-2026-06-12

WORKTREE: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aab252e80c605044c

## 2026-06-12 — Phase 0/1 (startup + diagnosis)
- Startup verification PASS: pwd under worktrees/agent-, toplevel matches, clean, bun install + pretest OK.
- Maps read: primary.map (full) → routed to error/structure/domain. error.map E-PA-002 row + F-SCHEMA-001.
- REPRODUCED: Form-B `<schema> ${ schemaFor(Driver) } </>` with no t.db → E-PA-002 (drivers). Literal control compiles CLEAN.
- ROOT: protect-analyzer F-SCHEMA-001 path (extractSchemaCreateTableStatements) reads only text-kind children of <schema>; Form-B body is a logic-escape bare-expr schemaFor() call → parseSchemaBlock sees no DDL → table not registered → E-PA-002.
- AST shape confirmed: <schema>.children has a kind:"logic" node; logic.body[0] = {kind:"bare-expr", exprNode:{kind:"call", callee:{kind:"ident",name:"schemaFor"}, args:[{kind:"ident",name:"Driver"}]}}. type-decl: {kind:"type-decl", name:"Driver", typeKind:"struct", raw:"{ id : integer , ... }"}. import-decl specifiers:[{imported:"schemaFor",local:"schemaFor"}], source:"scrml:data".

## FIX DIRECTION (chosen): localized PA-recognition (brief's recommended)
- New fn extractSchemaForCreateTableStatements(nodes): collect schemaFor import-locals + struct registry (name->raw); walk <schema> logic children for schemaFor(Struct) bare-expr calls; pluralizeStructName (§41.15.2) → synthesize "<plural> { <struct fields> }" schema-block body → reuse parseSchemaBlock + generateCreateTable (the SAME lowering the literal path uses). Merge as lowest-precedence ColumnDef source. Robust fall-through on unresolved struct / unparseable / zero columns.
- NEXT: implement in protect-analyzer.ts; commit; Phase-3 empirical (Form-B clean / literal still clean / genuine-missing still E-PA-002) + regression test.

## 2026-06-12 — Phase 2/3 (implement + verify) DONE
- IMPLEMENTED extractSchemaForCreateTableStatements in protect-analyzer.ts (b904e3d3): collects schemaFor import-locals (alias-aware) + struct registry (type-decl name->raw); walks <schema> children for schemaFor(Struct) bare-expr calls; paPluralizeStructName (§41.15.2 local mirror) + splitStructFieldsTopLevel → synthesize "<plural> { fields }" → parseSchemaBlock + generateCreateTable (SAME literal-path lowering). Wired as 4th (lowest-precedence) ColumnDef source after ?{} + literal <schema>. Robust fall-through on unresolved struct / unparseable / zero columns.
- PHASE-3 empirical (CLI compile, no db file):
  - CASE 1 Form-B schemaFor → CLEAN (exit 0), E-PA-002 GONE.
  - CASE 2 literal <schema> control → STILL CLEAN (no regression).
  - CASE 3 genuine missing 'ghosts' → STILL E-PA-002 (no over-suppression).
  - CASE 3b schemaFor(Driver) but tables=ghosts → STILL E-PA-002 for ghosts (precise).
  - Shadow DB columns REAL: SELECT name,age FROM drivers compiles clean; SELECT nonexistent_col → W-SQL-ROW-UNTYPED (proves bounded column set, not wildcard).
- REGRESSION TEST protect-schemafor-formb-source.test.js (2be39ffd, 6 cases): Form-B clean + correct cols; alias honored; genuine-missing E-PA-002; mismatch E-PA-002; unresolved-struct fall-through; ?{} precedence wins. 6/0.
- GATES: source-fix commit pre-commit gate 16807 pass / 0 fail / 90 skip; test commit pre-commit gate green. schemaFor+PA cluster 141/0.
- FIX LOCUS CHOSEN: PA-side recognition (brief recommended). Stage-reorder NOT needed — F-SCHEMA-001 infra (parseSchemaBlock/generateCreateTable) covered the lowering; the real fix was the localized recognition + synthesis from the struct type-decl available at PA stage.
