## ast-builder grammar fixes — STATUS

[2026-05-06 22:10] - Survey complete. SURVEY-NOTE.md written. Probe confirms:
  - F1 export function: only export-decl emitted, no function-decl
  - F2 export *: completely unparsed (exportedName=null, exportKind=null)
  - F3 export { A as B }: regex captures literal "A as B" as exportedName

[2026-05-06 22:30] - F1 + F2 + F3 implementation lands in commit b661c0b
  (folded under A+ verdict agent's parallel commit — no-worktree-isolation
  staging collision; my files were staged when their commit fired).

  Files changed (mine, in b661c0b):
  - compiler/src/ast-builder.js (export branch + parseNameSpec helper)
  - compiler/src/codegen/emit-library.ts (skip fromExport function-decl)
  - compiler/src/codegen/emit-logic.ts (skip fromExport function-decl)
  - compiler/src/module-resolver.js (propagate isReExportAll + localName)
  - compiler/tests/self-host/ast.test.js (skip new fields in parity)
  - compiler/tests/unit/ast-builder-grammar-fixes.test.js (NEW; 18 tests)

[2026-05-06 22:32] - Full suite: 9019 pass / 44 skip / 1 todo / 0 fail / 9064 total

## Verdict

GREEN — all three findings resolved. F1 makes export-wrapped functions
discoverable in the AST without breaking existing export-decl consumers.
F2 + F3 land the parser surface for re-export-all and renamed re-exports;
module-resolver propagates the new shapes via `isReExportAll` flag and
per-entry `localName`. api.js seeder is unchanged (per dispatch
file-discipline) — it can adopt `localName` and `re-export-all` chasing
in a follow-up dispatch when grammar matures further.

## Coordination note (operational, not a verdict factor)

This dispatch ran without worktree isolation in parallel with three
others. The A+ verdict agent's pre-commit captured my staged changes and
committed them under their message (b661c0b). All my work is preserved
verbatim; the commit attribution is theirs. Future parallel dispatches
should use worktree isolation to prevent this.
