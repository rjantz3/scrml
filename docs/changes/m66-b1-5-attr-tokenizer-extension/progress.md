# Progress: m66-b1-5-attr-tokenizer-extension

- [START] /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-af0c857e4dbab2c32
  - baseline test: 19973 pass / 0 fail / 171 skip / 1 todo across 757 files
  - HEAD: b5e7fc15 (post-fast-forward merge of main into worktree base)
  - branch: worktree-agent-af0c857e4dbab2c32

## Design summary (pre-implementation)

Three additive tokenizer extensions + new AttrValue kinds:

1. **`.X` dotted-ident** — extend `isAttrUnquotedValueStart` to admit `.` followed
   by uppercase IdentStart (or `_`). New AttrValue kind `dotted-ident` with shape
   `{ kind: "dotted-ident", text: ".X", refs: [], span }` — `text` preserves the
   leading dot to match `parseRuleAttrValue`'s expected input shape.

2. **`*` wildcard** — extend `isAttrUnquotedValueStart` to admit standalone `*`
   (not followed by IdentCont). New AttrValue kind:
   `{ kind: "wildcard", text: "*", span }`.

3. **`sourceText` verbatim slice** — additive field on AttrValue carrying the
   verbatim source slice (including any wrappers — quotes for string-literal,
   `${...}` for expr, etc.). Distinct from existing `expr.raw` (unwrapped) and
   `string-literal.value` (unquoted). Consumers can recover the original form via
   `attr.value.sourceText`.

The `if=` quote-preservation + `if=${}` wrapper-preservation divergences (Gap 5 +
Gap 6 in the M6.6.b.2 STOP doc) are closed by `sourceText`: legacy
`ifExprRaw = "\"@a == b\""` / `"${@a == b}"` is recoverable as
`attr.value.sourceText`.

## Plan

- Phase 1: tokenizer.js extension — `.X`, `*`, `sourceText`
- Phase 2: parser-conformance tests for the new shapes
- Phase 3: `.scrml` mirror sync (shape-only)
- Phase 4: cookbook corrigendum
- Phase 5: full-suite verification + canary check

## Commits

- 677704c2 — WIP(M6.6.b.1.5): start at worktree
- 1eee408d — feat(M6.6.b.1.5 — Phase 1+2): native attr tokenizer extensions + tests
- ac04ba41 — feat(M6.6.b.1.5 — Phase 3): mirror tokenizer extensions in tag-frame.scrml
- 99a22a60 — docs(M6.6.b.1.5 — Phase 4): cookbook corrigendum + new helper recipes

## Outcome

Closed M6.6.b.2 STOP-doc Gaps 1, 2, 5, 6 via additive tokenizer extension:

| Gap                                 | Resolution                                                                |
|-------------------------------------|---------------------------------------------------------------------------|
| 1 — `rule=.X` not recoverable       | New `dotted-ident` AttrValue kind; `value.text` preserves leading dot     |
| 2 — `rule=*` silently dropped       | New `wildcard` AttrValue kind; `value.text = "*"`                         |
| 3 — `rule=(.A \| .B)` is `expr`     | Cookbook now routes `expr.raw` through `readRuleAttrInput` — already worked |
| 4 — `<Done(rows)>` form-loss        | Documented as known divergence (paren-form yields same shape as bare)     |
| 5 — `if="..."` quote-strip          | New `sourceText` field preserves verbatim slice (`"@a == b"` recoverable) |
| 6 — `if=${...}` wrapper-strip       | New `sourceText` field preserves verbatim slice (`${@a == b}` recoverable)|

Adjacent fix — `collect-hoisted.js readInitial` extended for the new
`dotted-ident` kind (a pre-existing test exercising `initial=.X` would
have broken without this).

## Test deltas

- Baseline: 19973 pass / 0 fail / 171 skip / 1 todo across 757 files
- Post-impl: 20000 pass / 0 fail / 171 skip / 1 todo across 757 files
- Delta: +27 new tests (4 new `describe` blocks in
  parser-conformance-markup.test.js):
  - `M6.6.b.1.5 tokenizeAttributeRegion — \`.X\` dotted-ident value` (8 tests)
  - `M6.6.b.1.5 tokenizeAttributeRegion — \`*\` wildcard value` (5 tests)
  - `M6.6.b.1.5 tokenizeAttributeRegion — \`sourceText\` verbatim slice` (10 tests)
  - `M6.6.b.1.5 tokenizeAttributeRegion — coexistence with \`:\`-shorthand body` (2 tests)
- Native-parser canary: 998/1000 strict-pass UNCHANGED (the C2
  dual-pipeline canary class histogram is also UNCHANGED).

## Open seams for M6.6.b.2 re-dispatch

The b.2 re-dispatch will build the symbol-table walker on top of the
M6.6.b.1.5 surface. Items to cross-check at b.2 implementation:

1. The cookbook's `readRuleAttrInput` is theoretical until b.2 actually
   wires it into the walker — verify the returned string is in fact what
   `parseRuleAttrValue` accepts for ALL five source forms (the parser
   accepts `.X`, `X`, `*`, `(.A | .B)`, but the dotted-ident kind's
   `value.text` includes the leading `.` — that's already what
   parseRuleAttrValue expects per its `/^\.([A-Z]...)$/` regex; the
   bare PascalCase fallback regex `/^([A-Z]...)$/` handles the
   variable-ref form).

2. The `readIfExprRaw` recipe in the cookbook is theoretical — needs
   integration test once the b.2 walker uses it. Cross-check that the
   B17.3 typer (when authored) reads `ifExprRaw` in the SAME shape as
   the legacy parser produced (`"@a == b"` or `${@a == b}` verbatim).

3. The `payloadBindings` source-form divergence (Gap 4 / OQ #2 in the
   cookbook) is documented as a KNOWN issue but not closed — if the
   B17.3 typer needs to distinguish `<Done(rows)>` from `<Done rows>`,
   a future extension (M6.6.b.1.6?) would need to either route the `(`
   through a new recognizer OR add a structural-call-form discriminator
   to the AttrValue surface. Surface to PA if b.2 lands and B17.3
   typer authoring discovers this need.

