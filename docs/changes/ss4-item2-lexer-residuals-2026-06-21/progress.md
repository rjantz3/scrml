# ss4 item-2 — close the 3 byte-identical native-vs-Acorn lexer residuals

## 2026-06-21 — startup
- F4 verify: worktree `agent-adbf6a5d306b8f9cd`, branch `worktree-agent-adbf6a5d306b8f9cd`.
- Base SHA was `8dba968e` (3 commits BEHIND expected base `3d311fc9`). The 3 intervening
  commits (flogence match-arm + bare-ref handler fixes) touch NONE of my 3 scope files.
  Merged `3d311fc9` to align; HEAD now `3d311fc9`. (S112 stale-base precedent.)
- Symlinked node_modules / compiler/node_modules / samples/compilation-tests/dist from main.

## 2026-06-21 — diagnosis (token diffs vs Acorn)
Dumped raw token diffs for the 3 residual bench files. Findings:
- decl-class.js: the only divergence was the `constructor` class-body member name.
  Acorn surfaces it label="name". The comparator's `NATIVE_CONTEXTUAL_KEYWORDS["constructor"]`
  resolved to `Object.prototype.constructor` (PROTOTYPE POLLUTION on a plain-object lookup
  table) → mis-classified to the `Object` function. Native lexer ALREADY guards this
  (token.js makeIdentOrKeyword, line ~257) and correctly emits Ident. => COMPARATOR BUG.
- expr-optional-chain.js: the only divergence was `a?.b?.fn?.()` — `fn` is a scrml HARD
  keyword (KwFn in JS_KEYWORDS); native lexer reserves it; Acorn emits `name`. Keyword-as-
  member-property is admitted at the PARSE layer (parseMemberProperty), not the lexer, per
  token.js lines ~215-219. => INTENTIONAL scrml-extension divergence; needs comparator
  re-classification (same shape as the existing NATIVE_CONTEXTUAL_KEYWORDS table for
  let/async/await/of/from/as/yield).
- expr-template-literal.js: two structural template-model gaps.
  (1) closing-backtick fold was empty-trailer-only — native ALWAYS folds the closing
      backtick into the preceding TemplateChunk's raw text (scanTemplateChunk includes it),
      so `` `plain` `` → one chunk text="plain`"; the comparator only folded empty trailers.
  (2) flat templateDepth/interpDepth counters mis-handled NESTED templates
      (`` `nested ${`inner ${a}`} outer` ``): an inner backtick inside the outer interp was
      treated as the outer template's CLOSE. Native uses a templateStack; the comparator
      needed equivalent stack discipline.

## 2026-06-21 — fix (comparator-side only; native lexer was already correct)
Edited ONLY `compiler/tests/parser-conformance-lexer.test.js`:
1. Added `lookup(table, key)` own-property helper (mirrors token.js guard); routed all 3
   lookup-table reads through it (ACORN_KEYWORD_TO_KIND, NATIVE_CONTEXTUAL_KEYWORDS,
   NATIVE_SCRML_KEYWORDS, ACORN_LABEL_TO_KIND, the `_=` map) → closes the `constructor`
   prototype-pollution bug. (decl-class.js)
2. Added `NATIVE_SCRML_KEYWORDS` table (is/not/match/lift/fail/render/given/some/lin/fn/
   server/pure — the scrml-only entries of JS_KEYWORDS) + re-classify Acorn `name` surface
   for these to the matching Kw* — documented as an INTENTIONAL scrml-extension divergence.
   (expr-optional-chain.js; also future-proofs the rest of the scrml keyword set.)
3. Generalized the closing-backtick fold (any source-adjacent preceding TemplateChunk, not
   just empty ones) + replaced flat counters with a `frames` stack ({kind:"tmpl"} /
   {kind:"interp",braces}) mirroring lex-in-template.js's templateStack. (expr-template-literal.js)
4. Flipped all 3 disposition entries to "full"; updated the dead residual note in the
   now-unreachable test.skip block + the file header.

## 2026-06-21 — verify
- `bun test tests/parser-conformance-lexer.test.js` → 110 pass / 0 fail / 0 skip.
- The 12 `(full) byte-identical token stream vs Acorn` tests all pass (one per bench file).
- Full pre-commit gate: see commit.

## SCOPE NOTE (surfaced, not a mis-scope)
All 3 residuals were COMPARATOR fidelity gaps — the native lexer (lex.js/token.js/
lex-in-template.js) was already correct for every case. No native-parser source edit was
required. The brief's HARD constraint ("fix the lexer, do NOT game the gate") is satisfied:
the native token stream genuinely already matched Acorn modulo the intentional scrml-extension
divergences (scrml-only keyword set + chunk-includes-backtick template model); the comparator
was failing to normalize those divergences correctly (and had a prototype-pollution bug). The
fixes make the comparator CORRECT — they do not weaken compareFull or invent fake divergences.
The one NEW intentional divergence (NATIVE_SCRML_KEYWORDS) is justified + commented, mirroring
the existing NATIVE_CONTEXTUAL_KEYWORDS divergence.
