# Progress: program-documentary-attrs

## Baseline
- [16:00] Branch `feature-program-documentary-attrs` created from d28f6f7
- [16:00] `bun install` clean (113 packages, 0 errors)
- [16:01] `bun run pretest` clean
- [16:02] `bun run test` baseline:
  - Run 1: 8744 pass / 43 skip / 2 fail (network ECONNREFUSED — flake)
  - Run 2: **8745 pass / 43 skip / 0 fail / 8788 tests** — matches expected baseline
  - Baseline-stable per flake protocol

## Plan
1. Survey: locate `<head>` emission in emit-html.ts, find `<program>` attr extraction path
2. Spec: SPEC.md §40.7 NEW + §34 W-PROGRAM-TITLE-NESTED + SPEC-INDEX entry
3. Impl: codegen/index.ts head injection + warning emission
4. Tests: program-documentary-attrs.test.js (~10 cases)
5. Article: tier-ladder-promotion-devto-2026-05-04.md update + callout
6. Validate: full bun run test, 0 regressions

## Survey Findings (16:10)

**Head emission locus:** NOT in `emit-html.ts`. Lives in `compiler/src/codegen/index.ts` lines 530-555 within the `runCG()` per-file loop.

```ts
// codegen/index.ts:530-555
const base = basename(filePath, ".scrml");
let html: string | null = null;
if (htmlBody) {
  const docParts: string[] = [];
  docParts.push("<!DOCTYPE html>");
  docParts.push("<html lang=\"en\">");
  docParts.push("<head>");
  docParts.push("  <meta charset=\"UTF-8\">");
  docParts.push("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">");
  docParts.push(`  <title>${escapeHtmlAttr(base)}</title>`);  // <-- default <title> = filename basename
  if (css) {
    docParts.push(`  <link rel="stylesheet" href="${base}.css">`);
  }
  ...
```

**Default `<title>`:** Auto-injects `<title>${basename}</title>` always. Documentary `title=` should override the default.

**Author-written `<title>`:** No special handling — appears as a generic markup tag in `htmlBody` (which goes inside `<body>`). To detect "author-written `<title>`" I scan the AST under the top-level `<program>` for any `kind: "markup", tag: "title"` node. If found, suppress the documentary `title=` (and the default basename `<title>`) entirely.

**Top-level `<program>` AST node:** `nodes.find(n => n.kind === "markup" && n.tag === "program")` — pattern already used in ast-builder.js:8248 for auth config extraction. `.attrs` is array of `{name, value}` where `value` is `{kind: "string-literal", value: "..."}` or `{kind: "variable-ref", name: "..."}`. For documentary attrs, only string-literals are spec-meaningful (no compile-time variable interpolation in HTML head metadata).

**Nested `<program>` detection:** Walk `nodes` recursively — any `<program>` that is NOT the top-level (`nodes[].kind=markup,tag=program`) but lives deeper. The top-level `<program>` is always at the root. Workers (nested programs with `name=`) are extracted via `extractWorkerPrograms()` (codegen/index.ts:222) BEFORE codegen runs. After extraction, the only nested `<program>` left in `nodes` would be one without `name=` — but if any of the 5 documentary attrs appear on those, warn.

**Warning emission path:** `errors.push(new CGError(...))` — but this is for errors. CGError has a `code` field. I'll emit W-PROGRAM-TITLE-NESTED as a CGError-with-warning-code (the codebase pattern is to put warnings into the same error array tagged by code prefix). Confirm by checking how W-PROGRAM-001 is currently emitted.

**Design choices:**
- Insert spec section as **§40.7 Documentary Attributes** (after current §40.6 Error Codes), to avoid renumbering churn (§40.3-§40.6 all already exist; cross-refs in module-resolver.js to §40.4 would need updating).
- Empty-string attribute (`title=""`) treated as ABSENT — no emission. Documented in spec.
- Attribute emission order: title, description, version, author, license — in this fixed order, following the table in §40.7.
- HTML-escape via existing `escapeHtmlAttr()` helper from `codegen/utils.ts`.
- `<title>` content escape via plain HTML text escape (same as attr — `escapeHtmlAttr` quotes & < > " ').
- Default basename `<title>` is suppressed when documentary `title=` is present OR when an author-written `<title>` exists in source.
