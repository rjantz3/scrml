# Bug 17 — Progress

## Summary

Tailwind utility class scanner only ran on the statically emitted HTML
body. Class names reachable through `${ for ... lift <markup class=...> }`
iteration bodies (and sibling control-flow shapes) were emitted as
`setAttribute("class", "...")` JS calls inside `_scrml_lift(() => {...})`
factories — those strings never appeared in the static HTML, so the
scanner missed them. SPEC §26.1 violation: silent broken styling, no
diagnostic.

## Investigation findings

1. Tailwind scanner entry: `compiler/src/codegen/index.ts` lines 661-665
   (pre-fix). Called `scanClassesFromHtml(htmlBody)` only.
2. HTML body for the reproducer contained only the outer `<div class="flex
   gap-4 p-4">` plus `<span data-scrml-logic="...">` placeholders for the
   `${...}` block. The lift body markup was nowhere in HTML.
3. Confirmed by grep: lift body classes appeared in `repro.client.js` as
   `_scrml_lift_el_N.setAttribute("class", "flex-1 bg-white ...");` —
   never reachable to the regex-based HTML scanner.
4. AST shape: `${ for ... lift ... }` produces
   `logic-node { body: [for-stmt { body: [lift-expr { expr: {kind:"markup",
   node: <MarkupNode>} }] }] }`. The `lift-expr.expr.node` carries the
   MarkupNode with its `class="..."` AttrNode.

## Resolution

### Step 1 — collector module
**Commit:** `9d63ae1`
**Files:**
- `compiler/src/codegen/collect-class-names.ts` (new) — AST walker
  exporting `collectClassNamesFromAst(nodes): Set<string>`.
- `compiler/src/codegen/index.ts` — merges AST-collected Set with
  HTML-scanned Set before `getAllUsedCSS([...])`.

Walker recurses through:
- `markup.children`
- `logic` `.body`
- `for-stmt` / `for-expr` / `while-stmt` `.body`
- `if-stmt` / `if-expr` `.consequent` + `.alternate`
- `switch-stmt` / `match-stmt` / `match-expr` `.body`
- `lift-expr` `.expr.node` (when `kind === "markup"`)
- `try-stmt` `body` / `catchNode.body` / `finallyNode.body`
- `function-decl` / `state-constructor-def` / `state` / `engine-decl`
  / `component-decl` body+children (defensive)
- Generic fallback: any node with `.children` or `.body`

Collects from each markup node:
- `class="a b c"` static strings (string-literal AttrValue)
- `class:NAME=expr` reactive directives — NAME portion only (the class
  added at runtime via `classList.toggle` per SPEC §5.5.2 + Bug 13)

Skipped (documented edge case): dynamic `class="${expr}"` or
`class=@cell` — runtime value not statically determinable. Adopters
should use `class:NAME=cond` instead. W-TAILWIND-001 covers some of
these at a different detection layer.

### Step 2 — integration regression suite
**Commit:** `cfd8ad9`
**File:** `compiler/tests/integration/bug-17-tailwind-lift-iteration-scan.test.js`

7 tests:
1. Reproducer: outer 3 + inner-lift 11 classes all emit.
2. Nested lift inside lift: depth-2 classes emit.
3. Conditional lift inside `${ if (...) { lift ... } }` — emits.
4. `class:NAME` inside lift: NAME emits CSS rule.
5. Top-level static (Mario-shape) regression guard.
6. Mixed static + lift-internal regression guard.
7. Logic-only file: no spurious Tailwind CSS.

## Test results

Pre-fix (baseline): 12054 pass / 88 skip / 1 todo / 0 fail
Post-fix:           12061 pass / 88 skip / 1 todo / 0 fail (+7 new tests)
Pre-commit gate:    PASS (12150 tests / 620 files, 53s)

## Edge cases / deferred follow-ups

1. **Hyphenated/numeric class:NAME in lift template** — pre-existing
   tokenizer issue. `<li class:bg-blue-500=@active>` tokenizes as
   `class:"", bg-blue:"", -:"", 500:"@active"` instead of one attribute.
   Out of Bug 17 scope. Bug 13's tests all used single-token class names
   (`class:active`, `class:done`, etc.) so the issue didn't surface.
   File this as a separate bug.

2. **Dynamic class strings (`class="${expr}"`)** — out of scope per
   brief and SPEC §26.1 (can't statically determine class names from
   runtime expressions). The collector deliberately skips
   non-string-literal `class=` attribute values. W-TAILWIND-001 has
   adjacent coverage for some failure modes; making it cover dynamic
   class strings would be a separate feature.

3. **expr-string lift target** (`{kind: "expr", expr: "<li class=...>${x}/"}`)
   — this is the deprecated path per emit-lift.js code comments
   ("S14 Lift Approach C — real code uses emitCreateElementFromMarkup
   via the structured {kind: 'markup'} path. Only legacy test fixtures
   reach here."). The collector skips this shape; if it surfaces in
   real adopter code, the scanner is the wrong layer to fix it — the
   parser should produce structured `{kind: "markup"}` nodes.

## Final verification

- `git status --short` clean in worktree (only the new progress file)
- `git -C /home/bryan-maclee/scrmlMaster/scrmlTS status --short` shows
  zero modifications to files I touched (no main leak)
- Reproducer CSS verified: 13 of 14 classes emitted (only `cursor-grab`
  missing — separate issue: not in registry; unrelated to lift scanner)
- Mario regression: 54 lines of CSS preserved (matches brief baseline)
