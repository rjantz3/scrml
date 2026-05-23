# W-DEAD-FUNCTION survey — native-parser .scrml mirrors

Date: 2026-05-22
Dispatch: Wave 10 Unit O
Baseline: `dc2473f3` (post-Unit-L `1203294b` + Unit M)

## TL;DR

**All 20 W-DEAD-FUNCTION fires the brief surfaced are FALSE POSITIVES.** None of
the listed functions is actually dead. Deletion would BREAK the .scrml files
because each "dead" function has active call-sites inside the SAME .scrml file.
Recommend STOP-AND-MEMO; the right answer is a downstream fix to RI's body-callee
analysis (which fails to walk through nested `fn` bodies inside `${...}` meta
blocks), NOT corpus deletion.

This finding matches a previously catalogued false-positive class — see
`docs/changes/heads-up-s95-bugs/FOLLOWUPS.md` Bug 7 ("W-DEAD-FUNCTION
false-positives on functions called from component-body markup"). The shape here
is a sibling of that: instead of markup-context callsites that RI's
`markupReferencedNames` walker misses, these are SCRML-CONTEXT callsites
(callers are themselves `fn` decls inside the same `${...}` meta block) that the
body-callee analysis misses.

## Spec interpretation

Per `compiler/SPEC.md` §34 (catalog) + §12.2 Trigger 6, W-DEAD-FUNCTION fires
when ALL hold:

1. Function is declared
2. NOT called from a server-classified context
3. NOT called from a client-classified context
4. NOT exported
5. NOT server-annotated
6. NOT referenced from markup

Source emitter: `compiler/src/route-inference.ts:2674` — checks
`!hasCallers && !isExported && !isExplicitServer && !isMarkupReferenced && !isGenerator`.

The `hasCallers` flag is derived from `inverseCallerMap` built by RI's
body-callee analysis (Step 5). That body-callee walker is the load-bearing input
to the dead-fn decision. The 20 false-positives prove the walker is NOT seeing
through the call-site shape these .scrml mirrors use.

## Survey table

The W-DEAD-FUNCTION fires originated from 5 of the 37 native-parser .scrml
mirrors. Total: 20 unique fires across all mirrors compiled both standalone and
through `parse-markup.scrml`'s import-graph closure.

| Origin file | Function | Decl line | Callsites in same .scrml | .js sibling has fn? | .js sibling uses it? | Tree-shaken in CG output? | Brief category |
|---|---|---|---|---|---|---|---|
| `tag-frame.scrml` | `isAttrWhitespace` | 909 | 7 (lines 1124, 1165, 1177, 1292, 1512, 1540, + others) | yes (line 602) | yes (5 callsites) | **NO** — 7 occurrences in `tag-frame.client.js` | (ζ) new — see below |
| `tag-frame.scrml` | `isAttrNameStart` | 921 | 1 (line 1133) | yes (line 624) | yes (line 764) | NO | (ζ) |
| `tag-frame.scrml` | `isAttrNameChar` | 928 | 1 (line 1135) | yes (line 631) | yes (line 766) | NO | (ζ) |
| `tag-frame.scrml` | `isAttrUnquotedValueStart` | 941 | 1 (line 1382) | yes (line 613) | yes (line 1005) | NO | (ζ) |
| `parse-expr.scrml` | `isUnparenthesizedLogical` | 581 | 4 (lines 680, 681, 688, 689) | yes (line 532) | yes (4 callsites) | NO — 3 in `parse-expr.client.js` | (ζ) |
| `parse-css-body.scrml` | `isCssWhitespaceChar` | 481 | 3 (lines 410, 411, 463) | yes (line 487) | yes (line 421) | NO | (ζ) — **DEFERRED Unit N file** |
| `parse-css-body.scrml` | `isCssIdentChar` | — | 4 (lines 109, 246, 367, 404) | yes (line 499) | yes (line 414) | NO | (ζ) — **DEFERRED** |
| `parse-css-body.scrml` | `isSelectorLeadChar` | 505 | 1 (line 149) | yes (line 510) | yes (line 142) | NO | (ζ) — **DEFERRED** |
| `parse-css-body.scrml` | `isAtRuleNameChar` | 512 | 1 (line 280) | yes (line 517) | yes (line 285) | NO | (ζ) — **DEFERRED** |
| `parse-css-body.scrml` | `isUnitChar` | 520 | 1 (line 416) | yes (line 525) | yes (line 426) | NO | (ζ) — **DEFERRED** |
| `parse-error-body.scrml` | `isErrorWhitespace` | 312 | 1 (line 304) | yes (line 308) | yes (line 301) | NO | (ζ) — **DEFERRED Unit N file** |
| `parse-error-body.scrml` | `isErrorIdentStart` | 318 | 2 (lines 161, 208) | yes (line 314) | yes (line 213) | NO | (ζ) — **DEFERRED** |
| `parse-error-body.scrml` | `isErrorIdentChar` | — | 5 (lines 150, 165, 174, 195, 210) | yes | yes (5 callsites) | NO | (ζ) — **DEFERRED** |
| `parse-error-body.scrml` | `isUpperAscii` | 341 | 1 (line 162) | yes (line 335) | yes (line 167) | NO | (ζ) — **DEFERRED** |
| `parse-stmt.scrml` | `isStatementStartKind` | 397 | 1 (line 437) | yes (line 361) | yes (line 401) | NO — 2 in `parse-stmt.client.js` | (ζ) |
| `parse-stmt.scrml` | `sameLineFollows` | 1254 | 3 (lines 1295, 1314, 2329) | yes (line 1334) | yes (3 callsites) | NO — 4 in CG output | (ζ) |
| `parse-stmt.scrml` | `fnDeclLeadFollows` | 1486 | 3 (lines 608, 2103, 2164) | yes (line 1587) | yes (3 callsites) | NO | (ζ) |
| `parse-stmt.scrml` | `arrowFollows` | 1507 | 2 (lines 1587, 1603) | yes (line 1611) | yes (2 callsites) | NO | (ζ) |
| `parse-stmt.scrml` | `memberHeadFollows` | 1831 | 1 (line 1821) | yes (line 1975) | yes (line 1966) | NO | (ζ) |
| `parse-stmt.scrml` | `isContextualTypeLead` | 2460 | 2 (lines 547, 2156) | yes (line 2661) | yes (line 524, 2336) | NO | (ζ) |

### Brief category recap

- **(α) Truly dead** — 0 sites
- **(β) Exported but no .scrml consumer** — 0 sites (none are exported; all are
  internal to their file)
- **(γ) Called from .js the analyzer can't see** — 0 sites (.scrml callsites
  exist, so this is not the gap; the .js sibling matches structurally as
  documentation/parity)
- **(δ) Forward-compat stub** — 0 sites
- **(ε) Historically load-bearing, now dead** — 0 sites
- **(ζ) NEW class — called from same-file `${...}` meta-block sibling fn body
  that RI body-callee analysis fails to walk** — **20 of 20 sites**

## Structural finding — why the false positive

Every fire originates from a function declared inside a single top-level
`${...}` meta-context block in its .scrml file. The shape is:

```scrml
<engine for=TagFrame initial=.Closed>
    <Closed rule=(.OpenExpectingChildren | .OpenSelfClosed)></>
    ...
</>

${
    // top-level meta block — the JS-host mirror of the engine above

    export fn tokenizeAttributeRegion(source, start, end, ...) {
        // ...
        while (p < end && isAttrWhitespace(source.charAt(p))) {
            p = p + 1
        }
        // ...
    }

    // isAttrWhitespace — CALCULATION (predicate)
    fn isAttrWhitespace(ch) {
        if (ch == " ") return true
        // ...
    }
}
```

The file's `${...}` block extends 100% of the executable body (tag-frame.scrml
~2.6k lines; parse-stmt.scrml lines 155-3018; parse-expr.scrml similar). Inside
the meta block:

- `export fn` decls are TOP-LEVEL in scrml's hoisting model and ARE recognized
  as the file's public API (RI does see these as exported and as caller
  candidates).
- Plain `fn` decls (no `export`) are intended to be file-private helpers.
- The `export fn`s CALL the plain `fn`s — but RI's body-callee analysis appears
  not to see those callsites.
- The plain `fn`s are emitted into the CG output anyway (verified by
  `grep -c '<fnName>' <file>.client.js` — 2-7 occurrences each). So the
  warning's "It will be tree-shaken from the output" claim is also wrong in
  this case.

This shape is structurally identical across all 5 origin files (tag-frame +
parse-expr + parse-stmt + parse-css-body + parse-error-body): a single
top-level `${...}` block containing 30-150 `fn`/`export fn` decls and their
inter-callsites.

## Verification — functions are NOT tree-shaken

Sample evidence from CG output:

```
$ grep -c "isAttrWhitespace" compiler/native-parser/dist/tag-frame.client.js
7

$ grep -c "isUnparenthesizedLogical" compiler/native-parser/dist/parse-expr.client.js
3

$ grep -c "isStatementStartKind" compiler/native-parser/dist/parse-stmt.client.js
2

$ grep -c "sameLineFollows" compiler/native-parser/dist/parse-stmt.client.js
4
```

If RI flagged them as dead AND the tree-shaker honored the flag, the count
would be 0 (or 1 — the declaration only). The non-zero counts prove BOTH that
the lint message overstates ("It will be tree-shaken from the output") AND that
the function is reachable in practice.

## Why deletion is wrong (Rule 3)

Per pa.md Rule 3 + the brief's final paragraph: "the right answer is the one
that doesn't lose information; deletion is destructive."

Deleting any of these 20 functions would:

1. Leave dangling `isAttrWhitespace(...)` callsites in the SAME .scrml file
2. Force the .scrml file to fail to compile (E-SCOPE-001 / unresolved reference)
3. Diverge the .scrml mirror from its .js sibling (which keeps the helper) —
   breaking the documentation-class parity charter
4. Cost the file 5-7 lines of useful predicate code per fn (the implementations
   are small but real: ASCII whitespace tests, identifier-char tests, etc.)
5. Cause downstream Wave-10/Wave-11 work to re-introduce them

Therefore: **no deletion — write memo + surface for downstream RI fix.**

## Phase 2 decision

**STOP-AND-MEMO.** Do not invoke Phase 3 sweep.

Rationale:

1. 100% of the 20 W-DEAD-FUNCTION fires are false positives (category ζ).
2. The fix is upstream — RI body-callee analysis needs to walk through nested
   `fn` bodies inside `${...}` meta blocks to discover callsites.
3. Even setting aside the RI defect, the .scrml side mirrors the .js side and
   the .js side keeps these helpers as documented API parity → deletion would
   diverge.
4. 9 of 20 sites are in Unit N's in-flight files (parse-css-body.scrml +
   parse-error-body.scrml) → forbidden by the scope fence regardless.
5. The remaining 11 sites in open files (tag-frame.scrml, parse-expr.scrml,
   parse-stmt.scrml) are the SAME class as the deferred 9 — the right answer
   is the same for both populations: don't delete, fix the analyzer.

## Recommendations for downstream

### Recommendation 1 — RI body-callee analysis fix

`compiler/src/route-inference.ts` Step 5 builds `inverseCallerMap` by walking
function bodies for callsites. The walker appears to STOP at the boundary of a
nested `fn` declaration OR to fail to handle the `${...}` meta-block AST shape
that the .scrml mirrors use. The fix is to ensure the walker descends through
nested fn bodies declared in the same meta-block scope.

Reproduction is easy: any of the 5 .scrml mirrors listed above. The minimum
reduction is probably a 2-fn .scrml file where `export fn outer()` calls
`fn inner()` inside a `${...}` block.

### Recommendation 2 — alternative compiler-side mitigations

If the body-callee fix is non-trivial, two interim options:

- **Suppress W-DEAD-FUNCTION inside `${...}` meta blocks for v0.7.x** — these
  are documentation-class .scrml mirrors where the fn shape is identical to
  the .js sibling. The lint's signal value is near-zero on these files (none
  of the W-DEAD-FUNCTION fires have been actionable).
- **Documentation pragma** — a `// @scrml-keep-dead` or similar in-source
  pragma to tag intended-but-currently-not-detected callsites. This would also
  cover the S95 Bug 7 markup-callsite case.

The compiler-side change wins because it's centralized and doesn't pollute the
.scrml mirrors with annotations. But either is preferable to deletion.

### Recommendation 3 — `export` workaround (acknowledged false-positive escape)

The W-DEAD-FUNCTION message says: *"export the function or add an explicit
caller"* — exporting these 20 functions would suppress the warning. However:

- 20 spurious exports pollute the public-API surface of the .scrml mirror.
- It diverges the .scrml from its .js sibling (which leaves them as
  file-private helpers).
- It treats the symptom (the lint) instead of the cause (the analyzer).

Not recommended unless the RI fix is deferred past v0.7.x.

## Cross-references

- `compiler/SPEC.md` §12.2 Trigger 6 + §34 W-DEAD-FUNCTION row
- `compiler/src/route-inference.ts:2674` — emitter
- `compiler/src/route-inference.ts:2418-2500` — `markupReferencedNames` walker
  (Bug 7 sibling logic)
- `docs/changes/heads-up-s95-bugs/FOLLOWUPS.md` Bug 7 — sibling false-positive
  class on markup-context callsites
- `compiler/native-parser/{tag-frame,parse-expr,parse-stmt,parse-css-body,parse-error-body}.scrml`
  — the 5 origin files
- `compiler/native-parser/{tag-frame,parse-expr,parse-stmt,parse-css-body,parse-error-body}.js`
  — the .js siblings (all 20 helpers present + actively called)

## Unit N file overlap respected

9 of 20 fires (parse-css-body + parse-error-body) are inside Unit N's
in-flight scope and were NOT touched. Edits to those files are deferred to
post-Unit-N landing per the brief.

## Files touched

None. This is a survey + memo outcome. No corpus edits.

## Test count delta

0. No source touched.

## Triage histogram

Unchanged. No source touched.
