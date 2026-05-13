# null-eradication-self-host — progress

- 2026-05-13T00:00Z — Started. Worktree verified. bun install + pretest OK. Maps read.
- 2026-05-13T00:10Z — Audit complete:
  - scrml `not` keyword codegens to JS `null` (emit-expr.ts:296-298). Runtime parity preserved by default.
  - `is not` / `is some` codegen to `(x === null || x === undefined)` / `(x !== null && x !== undefined)`.
  - Parity test reads from MAIN project root by default (line 41-43); worktree edits invisible until merge.
  - TS reference module-resolver.js `null` usages are JS-host primitives — task framing says LEAVE.
  - TS reference meta-checker.ts: lines 1774 + 2020 contain `"null"` primitive-type seed; per S89 ruling MIGRATE.
  - GLOBAL_BUILTINS lines 138-139 are JS reserved-keyword fingerprints; LEAVE.
- 2026-05-13T00:15Z — scrml self-host module-resolver.scrml migrated (5 `null` → `not`).
- 2026-05-13T00:20Z — Parity test extended:
  - findSelfHostRoot() prefers worktree if it has the self-host source.
  - rewriteNotSyntax() translates scrml `not`/`is not`/`is some`/`is not not` → JS-runtime equivalent (mirrors emit-expr.ts).
  - All 25 parity tests pass against worktree-local self-host.
- 2026-05-13T00:25Z — Commit c1d55a1: module-resolver.scrml + parity-test extended.
- 2026-05-13T00:30Z — meta-checker.scrml migrated:
  - 7× `m != null` regex-exec guards → `m is some` (canonical predicate form)
  - Line 624 type-name seed `"null"` REMOVED per S89 ruling
  - Line 96 GLOBAL_BUILTINS `"null"` LEFT (JS-host keyword fingerprint per task spec)
  - Parity test still 25/25 pass.
- 2026-05-13T00:35Z — Commit fe5d30e: meta-checker.scrml migration + parity 25/25.
- 2026-05-13T00:40Z — TS reference migration:
  - compiler/src/meta-checker.ts line 1774: `"null"` removed from type-name seed list (buildFileTypeRegistry).
  - compiler/src/meta-checker.ts line 2020: `"null"` removed from BUILTINS Set (serializeTypeRegistry).
  - compiler/src/module-resolver.js: file-header JSDoc updated with S89 audit note.
    Rationale: all `null` usages are JS-host primitives; scrml `not` codegens to JS `null`
    so runtime parity is preserved by default; values are not exposed to scrml-source-readable surfaces.
  - compiler/tests/unit/self-host-meta-checker.test.js:418: asserts registry.has("null") === false now.
  - Full suite: 11912 pass / 0 fail (baseline preserved).
