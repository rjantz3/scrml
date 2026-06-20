# progress — codegen-interp-literal-2026-06-20

worktree: /home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-ac894d93280bac7c8
base HEAD: 41422726

## 2026-06-20 — startup + repro confirm
- startup verification clean (pwd/toplevel/status/install/pretest/merge no-op)
- Bug 1 reproduced: tmp-ad-out/tmp-ad.client.js line 16 emits bare `tag()` inside class-attr template literal; textContent path (line 37) correctly emits `_scrml_tag_4()`; @cell-in-attr (line 24) correctly emits `_scrml_reactive_get("n")`. Confirmed attr-value template-literal path misses user-fn-name encoding.
- Bug 2 reproduced: tmp-regex-out/tmp-regex.client.js line 38 `s.split(s . split ( /[^a-z0-9]+/ ) . map ( t => ( { tok : t } ) )).map(...)` — call-arg literal re-serializes WHOLE enclosing expr (space-tokenized) instead of just `/[^a-z0-9]+/`.

## 2026-06-20 — Bug 1 FIXED (g-attr-interp-fn-name-not-renamed)
- ROOT CAUSE: code-segments.ts rewriteCodeSegments treated backtick template literals as fully opaque (same as `"..."`/`'...'`), so the whole-buffer fn-name mangle (emit-client.ts post-fn-name-mangle, via rewriteCodeSegments) skipped the `${...}` code inside the attr-template literal `setAttribute("class", `box box-${tag()}`)`. Textcontent path worked because its `tag()` is in raw code position. @cell path worked because rewriteTemplateAttrValue handles @-refs before the buffer pass.
- FIX: rewriteCodeSegments now descends INTO template-literal `${...}` interpolations (transform applied to interp code; recurses for nested literals/regex/comments inside the interp). Static template text + plain single/double quote strings remain opaque (preserves S144 Bug Z string-literal opacity).
- R26: tmp-ad.scrml line 16 now `setAttribute("class", `box box-${_scrml_tag_4()}`)` (was bare `tag()`); node --check OK; grep-assert clean. @cell + textContent regression guards green.
- TEST: g-attr-interp-fn-name-not-renamed.test.js (7 tests, 19 expects). Red-green verified: 3 fail without fix, all pass with.
- Adjacent suites green: template-literal-attrs, mangle-string-literal-opacity (S144 Bug Z fence), not-keyword, not-operator-lowering, mangle-spread-call-callee, division-in-ternary-arm (222 pass).

## 2026-06-20 — Bug 2 FIXED (g-literal-arg-expr-serializer-wrong-span) — TWO distinct roots
NOTE: brief asserted "one root" for regex + string symptoms. Empirically FALSE — two distinct loci (verified via minimal repros). Both fixed.

### Root A — regex literal in fn body / call-arg (expression-parser.ts esTreeToExprNode Literal case)
- ESTree represents a regex literal as a `Literal` whose `.value` is a RegExp OBJECT (typeof "object"), so it fell past the number/boolean/null/string arms to the BigInt fallback `makeEscapeHatch(node, span, rawSource ?? ...)` — passing the OUTER rawSource (whole enclosing expr). For `s.split(/[^a-z0-9]+/)` the .split() arg became the re-serialized whole expr.
- FIX: dedicated regex branch — `if (node.regex) return makeEscapeHatch(node, span, raw)` where raw = node.raw (`/[^a-z0-9]+/`). ALSO hardened the BigInt fallback to prefer `raw` over `rawSource` (a literal in arg position must serialize only itself).
- R26: tmp-regex.scrml line 38 now `s.split(/[^a-z0-9]+/).map(...)` (was `s.split(s . split ( /.../ ) . map (...))`).

### Root B — STRING literal arg in `on mount { ... }` lifecycle body (ast-builder.js collectBracedBody)
- collectBracedBody reassembled the braced body via `parts.push(lastTok.text)` raw. A STRING token's `.text` is the content BETWEEN delimiters (quotes stripped, tokenizer.ts readString). So `on mount { f("a-b-c") }` body became `f(a-b-c)` → safeParseExprToNode parsed it as `f(a - b - c)` (subtraction). NOT the same root as A — onclick handlers + fn bodies (collectExpr/collectLiftExpr) already re-quote; only the lifecycle braced-body collector missed it.
- FIX: re-quote STRING tokens in collectBracedBody, mirroring collectExpr/collectLiftExpr (reemitJsStringLiteral for plain, backtick-wrap for isTemplate).
- R26: tmp-strarg.scrml call site now `_scrml_splitLiteral_2("a-b-c")` (was loud E-SCOPE-001 on `a - b - c`). Minimal `f("a-b-c")` in on mount → `_scrml_f_3("a-b-c")`.
- Composition check: regex literal AT on-mount call site `f(/[a-z]+/)` → `_scrml_f_3(/[a-z]+/)` (both fixes compose).
- node --check clean on all repros.
