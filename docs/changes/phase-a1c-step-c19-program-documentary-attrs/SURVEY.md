# Phase A1c · Step C19 — `<program>` Documentary Attributes — SURVEY

**Date:** 2026-05-09 (S75)
**Status after Phase 0 survey:** **C19 IS ALREADY LANDED.** The work the dispatch
asked for shipped in S59 (commits `a72d9a5` + `06f034f`) but the SCOPE row was
never marked closed, so C19 was re-dispatched. This survey documents the
finding and identifies a small two-test coverage gap.

---

## Survey targets (from dispatch brief)

> Per primer §12 / S64 amendment: surveys must locate (a) head emission file,
> (b) attribute-registry coverage, (c) html-elements coverage, (d) prior
> warning-fire-site work, (e) test coverage.

---

## Findings

### 1. Head emission — already implemented

**File:** `compiler/src/codegen/index.ts`
**Lines:** 590-667 (head emission); 277-320 (nested-program detection).

The emitter already covers the §40.7 surface:

- Top-level `<program>` extraction at line 597-599.
- All five documentary attrs extracted at lines 610-614 via `getDocAttr()` helper
  (lines 600-609) which returns `null` for missing / non-string-literal /
  empty-string values — exactly matching §40.7 normative bullets 1-2.
- Author-written `<title>` precedence at lines 619-633 + 648-654 (the
  `hasAuthorTitle` walker), suppressing both documentary `title=` and the
  default basename `<title>` per §40.7 bullet 3.
- Fixed emission order title → description → application-version → author →
  license at lines 648-667 — matches §40.7 bullet 7.
- HTML-escape on emission via `escapeHtmlAttr` — matches §40.7 bullet 5.
- Default head elements (`<meta charset>`, viewport, basename `<title>`)
  preserved at lines 641-642, 651-653 — matches §40.7 head-injection note.

### 2. Nested-program warning — already implemented

**File:** `compiler/src/codegen/index.ts`
**Lines:** 277-320.

`detectNestedDocAttrs(nodes, 0)` runs BEFORE `extractWorkerPrograms()` (so
worker `<program>` nodes are still in the tree). Depth counter ensures only
nested (`depth >= 1`) programs trigger the warning. Each documentary attr on
a nested program emits its own `W-PROGRAM-TITLE-NESTED` warning entry, with
file/span position derived from the attribute (or the node) span. Severity is
`"warning"` — matches §34 catalog row at SPEC.md lines 865 + 14246.

### 3. Attribute-registry coverage — already wired

**File:** `compiler/src/attribute-registry.js`
**Lines:** 81-106.

`ELEMENT_ATTR_REGISTRY.set("program", ...)` includes all five documentary
attrs at lines 102-106 with `supportsInterpolation: false` (matches §40.7
bullet 1: string-literal-only). VP-1 / VP-3 unknown-attribute warnings will
NOT fire on these attrs.

### 4. html-elements registry coverage — already wired

**File:** `compiler/src/html-elements.js`
**Lines:** 517-540.

`REGISTRY.set("program", ...)` includes `description`, `version`, `author`,
`license` explicitly at lines 533-536. `title` is inherited from
`GLOBAL_ATTRIBUTES` (line 52) per the comment at line 532.

### 5. Test coverage — 12 tests already shipped

**File:** `compiler/tests/integration/program-documentary-attrs.test.js`
**Status:** 12/12 passing (verified S75).

Test coverage map vs §40.7 normative bullets:

| §40.7 bullet | Test |
|---|---|
| String-literal → head tags (per attr) | tests 1, 2, 3 |
| All 5 → fixed order in head | test 4 |
| Empty-string → treated as absent | test 10 |
| Author-`<title>` overrides documentary + default | test 5 |
| description/version/author/license stack with author-written `<meta>` | **GAP** — not tested |
| HTML-escape on emission | test 7 |
| Nested → emit nothing + `W-PROGRAM-TITLE-NESTED` | tests 8, 11, 12 |
| Nested without doc attrs → no warning | test 9 |
| No documentary attrs → default basename emits | test 6 |
| Non-string-literal value silently ignored | **GAP** — not tested |

### 6. Spec catalog — already complete

**SPEC.md §34** rows at lines 865 (table-of-codes) + 14246 (descriptions
table) define `W-PROGRAM-TITLE-NESTED` with cross-ref to §40.7.
**SPEC.md §40.7** at lines 16859-16942 is the authoritative section.
No spec edits needed.

---

## Conclusion

The C19 SCOPE row was issued because the row was never checked off; the actual
implementation shipped in S59 (~3 sessions before A1c Wave 5 began). All four
surface areas the dispatch asked for (codegen, attribute-registry, html-elements,
warning fire-site) are wired and the implementation precisely matches §40.7.

**12 tests pass; 2 minor coverage gaps** are the only unfinished work:
1. Non-string-literal value silently ignored (§40.7 bullet 1, second sentence).
2. Documentary `description=` stacks with author-written `<meta name="description">`
   tag (§40.7 bullet 4).

Both gaps are test-only — the implementation already handles both correctly.

## Revised scope for this dispatch

- **DO NOT** rewrite or duplicate the existing implementation.
- **DO** add the two missing tests to bring §40.7 coverage to 100% of
  normative bullets, then close the SCOPE row.
- **DO NOT** edit SPEC.md (already correct).
- **DO NOT** edit attribute-registry.js / html-elements.js (already correct).
- **DO NOT** edit codegen/index.ts (already correct).

Estimated remaining work: **~15 minutes** (2 tests + close-out commit).

## Files that will be touched

- `compiler/tests/integration/program-documentary-attrs.test.js` — append 2 tests.
- `docs/changes/phase-a1c-step-c19-program-documentary-attrs/SURVEY.md` — this file.
- `docs/changes/phase-a1c-step-c19-program-documentary-attrs/progress.md` — landing log.

## Test-delta forecast

Pre-baseline: 10534 pass / 5 fail (pre-existing self-host pipeline failures, unrelated to C19).
Post: 10536 pass / 5 fail. Delta = +2 tests.

(Far less than SCOPE §4.9's "+15 to +25" estimate, because most of the test
work was already done in S59. The estimate was right for "if starting
from zero" — but starting from S59-landed-but-uncounted, it's +2.)
