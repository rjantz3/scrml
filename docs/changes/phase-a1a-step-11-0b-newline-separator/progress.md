# Phase A1a Step 11.0b — Newline-as-statement-separator — Progress

Branch: `phase-a1a-step-11-0b-newline-separator`
Parent baseline HEAD: `14ebbe9` (s60 close: hand-off + master-list + changelog).
Test baseline: 8,853 pass / 43 skip / 0 fail / 8,896 across 439 files.

## Survey

[step-11-0b startup] Worktree clean. `pwd` / git toplevel match. `git log -7`
shows `14ebbe9 docs(s60-close)` near HEAD and `6d51d00 compile(a1a-step-11-0a)`
just below — baseline parent matches BRIEF expectation. `bun install` → 113
packages. `bun run pretest` → 12 samples compiled. `bun run test` first run
flake (2 ECONNREFUSED), retry → **8,853 pass / 43 skip / 0 fail / 8,896
across 439 files**. Confirmed baseline. Branch
`phase-a1a-step-11-0b-newline-separator` created.

[step-11-0b survey-locus] Located key call sites in
`compiler/src/ast-builder.js`:
- `parseLogicBody` at L1699 (entry point for `${...}` logic blocks).
- `collectExpr` at L1784 — the RHS-collection helper. Already has
  `compoundBody` opt flag (Step 11.0a) at L1790 + boundary at L1993-2001.
- `tryParseStructuralDecl` at L2934 — recognizes `<NAME>` state-decl shape.
  Calls `collectExpr` at L3156, threading `inCompoundBody`.
- `scanStructuralDeclLookahead` at L3203 — pure lookahead for state-decl
  shape (returns null if not a state-decl). USES `tokens[i + scanIdx]`,
  not `peek()`, so it requires `peek(0)` = `<` and `peek(1)` = IDENT.
- `tryParseStructuralDecl` call sites (4 total):
  - L3557 in `parseOneStatement` const-branch (Shape 3 derived)
  - L4636 in `parseOneStatement` default-branch (Shape 1 plain)
  - L5784 in `parseLogicBody` const-branch (Shape 3 derived)
  - L7131 in `parseLogicBody` default-branch (Shape 1 plain)

[step-11-0b survey-collectExpr-boundary-rules] Today's `collectExpr`
boundaries at depth 0 (in source order):
- L1812 `stopAt`-match
- L1817 `BLOCK_REF` at depth 0 (after consuming some tokens)
- L1820 `;` PUNCT — break + consume
- L1824 `}` PUNCT — break (no consume)
- L1834 `startsArmPattern` (match-arm patterns)
- L1902 STMT_KEYWORDS (function/const/let/etc. — except function-as-RHS)
- L1930 BUG-R14: `@name =` or bare-IDENT `=` at depth 0 (assignment opener)
  + isTypedReactive `@name :`
- L1959 BUG-ASI-NEWLINE: `lastEndsValue + tok.line > lastTok.line +
  tokStartsStmt(IDENT or KEYWORD-not-STMT)` — break
- L1993 (Step 11.0a) compoundBody: `<` IDENT or `</` — break

[step-11-0b survey-step-11-0a-compoundBody-mechanism] Step 11.0a's
`compoundBody` flag is enabled ONLY when `tryParseStructuralDecl` is invoked
recursively from inside a Variant C compound body. The flag forces
`collectExpr` to break on `<` IDENT (sibling decl) or `</` (compound close)
at parts.length > 0, angleDepth 0. **No newline gate** — fires same-line.
This works for compounds because compound-children RHS are typically simple
literals (no `a < b` comparisons). Top-level state-decl RHS can have
arbitrary expressions, so reusing the compoundBody flag at top-level WOULD
regress `<x> = a < b ? 1 : 2` (at `<b`, the same-line boundary fires →
truncates RHS at `a`).

[step-11-0b survey-failure-shapes] Probe (`_probe_step11_0b.mjs`)
confirms 7 distinct failure shapes today:
1. `${ <count>=0\n<name>=""\n<items>=[] }` → 1 state-decl, init eats sibs.
2. `${ <a>=0\n<b>=1; <c>=2\n<d>=3 }` → 2 state-decls (a + c), both with
   eaten siblings.
3. `${ <count>=0\n const <doubled>=@count*2\n<name>="" }` → 2 state-decls
   (count parses OK because `const` STMT_KEYWORD breaks; doubled then
   eats `<name>` because `tryParseStructuralDecl` for derived calls
   `collectExpr` without compoundBody flag).
4. `${ <items>=[1,2,3]\n<count>=0 }` → array literal + sibling eaten.
5. `${ <data>={a:1,b:2}\n<count>=0 }` → object literal + sibling eaten.
6. `${ <result>=compute(\n a,b\n)\n<count>=0 }` → multiline call + eaten.
7. `${ let x=1\n<y>=0 }` → let-decl init eats `<y>`.

[step-11-0b survey-non-regression-cases] These MUST remain working:
1. `${ <count>=0; <name>=""; <items>=[] }` — semicolons (works today).
2. `${ <userName>=<input\n type="text"/> }` — Shape 2 markup multi-line
   (works because `parseLiftTag` handles markup — collectExpr never sees it).
3. `${ <x>=@a +\n@b }` — multi-line legitimate expression (`+` does not
   end a value, lastEndsValue=false, ASI-NEWLINE doesn't fire).
4. `${ <x>=a < b ? 1 : 2 }` — same-line comparison (no newline crossed).
5. `${ <name req>=<input/>\n<count>=0 }` — Shape 2 + sibling decl (Shape 2
   uses parseLiftTag — markup ends correctly; siblings are then on a new
   line in the SHAPE 1 path).

[step-11-0b survey-design-decision] **Approach: extend the existing
ASI-NEWLINE rule (L1959-1985) to also fire on `<` PUNCT followed by IDENT
when `scanStructuralDeclLookahead()` confirms state-decl shape.**

Why this approach:
- Fires ONLY on cross-line newline (`tok.span.line > lastTok.span.line`),
  preserving same-line `a < b` comparisons.
- Requires `lastEndsValue` (last token ends a value), so multi-line
  expressions like `@a +\n@b` are not truncated.
- Uses `scanStructuralDeclLookahead()` to confirm the `<` truly opens a
  state-decl — preventing premature break on `<` followed by something
  unrelated (e.g., text content `<` from an html-fragment leak).
- Generalizes to ALL collectExpr call sites (let-decl, fn-body, if-body,
  etc.), not just state-decl RHS — fixing the broader ASI gap as a
  free side-benefit.

Why NOT extend `compoundBody` to top-level:
- compoundBody fires same-line; would break `a < b` comparisons.

Why NOT thread a new top-level-only flag:
- Cleanly works for state-decl RHS but doesn't fix the let-decl /
  bare-expr gap (probe Tests 1+7 from `_probe_let.mjs`).

[step-11-0b survey-discount-9-status] **NOT discount #9.** Survey
confirms genuine source change required — `collectExpr` boundary
extension. The Step 11.0a `compoundBody` mechanism is RELATED but NOT
identical (no newline gate, fires inside compounds only). The new rule
is independent — it lives in the ASI-NEWLINE branch, requires newline-cross,
and uses `scanStructuralDeclLookahead` for shape confirmation.

[step-11-0b survey-call-site-impact] All 4 `tryParseStructuralDecl` call
sites benefit automatically — they all eventually call `collectExpr` for
Shape 1/3 RHS at L3156. Top-level Shape 3 (const) RHS collection: fixed.
Top-level Shape 1 (plain) RHS collection: fixed. parseOneStatement
(function-body) Shape 3/1 RHS: fixed. The fix is universal.

## Plan

1. Extend `collectExpr`'s ASI-NEWLINE branch (L1959-1985) to also detect
   `<` PUNCT + IDENT at start-of-newline as a state-decl boundary. Use
   `scanStructuralDeclLookahead()` for shape confirmation.
2. Add ~8 positive test cases covering:
   - Shape 1 multi-decl newline-separator (kickstarter §3.1)
   - Shape 3 const + Shape 1 mixed
   - Shape 1 with array/object/multiline-call init + sibling
   - mixed `;` + newline separators
   - let-decl + state-decl newline (broader ASI fix)
3. Add regression-baseline assertions:
   - multi-line legit expr `<x> = @a +\n@b` (still ONE decl)
   - Shape 2 markup-RHS multi-line (still works via parseLiftTag)
   - same-line `a < b` comparison inside RHS (no false break)
4. Anti-html-fragment guard on every positive case.
5. Flip Step 11 anti-test memorials with `TODO[step-11.0b]` markers in
   `kickstarter-v2-smoke.test.js`.

## Implementation log

(to be filled in)

## Tags

#phase-a1a #step-11-0b #newline-separator #collectExpr #ASI-NEWLINE
#parser-only #t2 #not-discount-9
