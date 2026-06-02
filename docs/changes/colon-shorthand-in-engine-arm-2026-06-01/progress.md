# progress — colon-shorthand-in-engine-arm-2026-06-01

## 2026-06-01

- Startup verified: worktree clean, fast-forward-merged main 4e1f9492 → 3429b385 (briefed SHA, includes S153). bun install + pretest OK.
- Root-caused: `findStateChildCloser` (compiler/src/engine-statechild-parser.ts) pushed §4.14 `:`-shorthand lowercase child openers (`<span : @label>`) onto its `lowerDepth` stack but never popped them (no closer per §4.14 line 979/982) → corrupted depth accounting → state-child `</>` consumed against the phantom opener → E-ENGINE-STATE-CHILD-MISSING. Same gap at the two sibling closer-finders (`findEngineCloser`, `findOnTransitionCloser`).
- FIX: added `isColonShorthandOpener(s, tagNameEnd, openerEnd)` — attribute-aware top-level whitespace-preceded `:` detection (string/paren/brace/bracket/`${}` depth tracking). Wired into all three closer-finders' lowercase-opener push guards alongside the existing void-element + self-close exclusions.
- R26: confirmed bug reproduces PRE-fix (stashed change → E-ENGINE-STATE-CHILD-MISSING for .Running / .Browsing) and is GONE post-fix.
- repro-1 + repro-2 compile; node --check clean; repro-2 each renders `@.name` (`_scrml_each_render_23` present, `<li>` textContent = item.name).
- PRE-EXISTING (out of scope, surfaced): `:`-shorthand body on a LOWERCASE HTML element (`<span : @label>`) does NOT render its expression — emits `<span></span>` (empty) at top-level too (E-DG-002 "label never consumed"). Codegen emission gap, independent of this parser fix; reproduces at top-level (outside engine-arm scope).
- NEXT: unit test (positive + negative-detection cases) + full suite.

## 2026-06-01 (cont.)

- Added unit test compiler/tests/unit/engine-statechild-colon-shorthand-child.test.js (16 tests, 3 groups): parser-level closer-pairing positives, negative-detection (bind:/on:/class:/onserver: namespace colons, string-value colons style/url/title, `${...}` ternary colon, self-closing + combined-attr cases), end-to-end SYM (no E-ENGINE-STATE-CHILD-MISSING).
- Mutation-probed: detector-DISABLED (= pre-fix) → 7 fail with E-ENGINE-STATE-CHILD-MISSING; restored → 16/16 green. Positive + e2e cases are discriminating. Negative cases document the contract (parser depth-bookkeeping is resilient to colon mis-classification by design — named/generic closers no-op on empty stack — so they are regression-guards rather than mutation-killers).
