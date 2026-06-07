# derived=match `:>` BRIEF (archived per pa.md S136) — agent a8b92a91bc9213f77

Dispatched S172, 2026-06-07. isolation:worktree, general-purpose, opus, background.
Change-id: `derived-match-arrow-colon-2026-06-07`. Ratified S171. Scope: extend the EXISTING
`W-MATCH-ARROW-LEGACY` info-lint + `bun scrml migrate --fix` to cover the derived= / value-return
match-body arm locus (the `=>`/`->`→`:>` deprecation), which S147 landed for block-form + `!{}` arms but
not the derived= locus. ZERO codegen change (all three arrows build identical AST). No new SPEC text /
§34 row (S147 §18.2 already mandates `:>` canonical for match arms generally; W-MATCH-ARROW-LEGACY
exists). Loci: symbol-table.ts/ast-builder.js/type-system.ts (lint emission) + commands/migrate.js
(--fix). Tests mirror match-arrow-alias + s147. Mandatory: write a test + byte-identical-codegen proof.
If already-covered → report NOT-NEEDED with evidence. Full F4/S88/S99/S126 + S83. (Full prompt in
dispatch transcript.)
