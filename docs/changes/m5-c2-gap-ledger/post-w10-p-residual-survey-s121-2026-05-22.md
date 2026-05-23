---
status: current
last-reviewed: 2026-05-22
session: S121
agent: scrml-deep-dive (Wave 11 Unit Q)
parent-fix: Wave 10-P (route-inference walker, commit 498ae3e6)
---

# Wave 11 Unit Q — Post-W10-P residual diagnostic survey

Read-only categorization of the residual diagnostic fires the native-parser
`.scrml` mirror import graph emits after Wave 10-P. Source: a single invocation
of `bun compiler/bin/scrml.js compile compiler/native-parser/parse-markup.scrml`
at HEAD `498ae3e6`. No code, no SPEC, no test files were modified.

---

## Summary

**Headline correction to the dispatch brief: there are 51 unique fires across
9 codes — NOT 76 across 10.** The "76" figure was a grep-counting artifact:
`grep -oE "(E|W)-[A-Z0-9-]+" | sort | uniq -c` against the full stderr stream
double-counts every code that appears once in the diagnostic prefix
(`error [X-CODE]:`) AND a second time embedded in the message body
(`X-CODE: ...explanation`). Counting only the citation prefixes
(`^(error|warning|lint) \[`) yields the true unique-fire counts. The brief's
10th class, `E-STMT-FOR-BINDING-INIT`, is **not a fire at all** — the only
occurrence is inside a string literal in the source code of
`parse-stmt.scrml` (a call to `recordError(ctx, "E-STMT-FOR-BINDING-INIT", ...)`
where the .scrml mirror itself emits that diagnostic to the program-under-parse,
not to its own compile).

**Headline correction 2: nothing "doubled". Wave 10-P did NOT surface new
diagnostic surface.** Comparing pre-W10-P (`6297fefc`) to post-W10-P
(`498ae3e6`) on the same file:

| Class | Pre-W10P | Post-W10P | Delta |
|---|---|---|---|
| W-DEAD-FUNCTION | 20 | 0 | -20 |
| W-LINT-010 | 14 | 14 | 0 |
| W-LINT-001 | 10 | 10 | 0 |
| E-ROUTE-001 | 9 | 9 | 0 |
| E-NAME-COLLIDES-STATE | 9 | 9 | 0 |
| E-SCOPE-001 | 4 | 4 | 0 |
| E-SYNTAX-042 | 2 | 2 | 0 |
| W-LINT-011 | 1 | 1 | 0 |
| W-LINT-007 | 1 | 1 | 0 |
| E-MU-001 | 1 | 1 | 0 |
| **Total** | **71** | **51** | **-20** |

Wave 10-P's RI walker fix is **callees-only**
(`route-inference.ts:1158-1167`). It repopulates `callees[]` with previously-
missed call sites; it does NOT touch trigger detection. Every diagnostic class
in the brief except W-DEAD-FUNCTION has emission paths unchanged by W10-P, and
the empirical pre/post counts confirm this.

**FAILED summary the CLI prints is `16 errors, 9 warnings`** = (9 E-NAME-COLLIDES + 4 E-SCOPE-001 + 2 E-SYNTAX-042 + 1 E-MU-001) errors + 9 E-ROUTE-001 warnings. The 26 lints (`lint [W-LINT-NNN]:`) are info-stream and excluded from the FAILED summary count.

### Per-class disposition table

| Code | Fires | Dominant category | Recommendation |
|---|---|---|---|
| E-ROUTE-001 | 9 | (α) real + spec-correct | author-pattern decision; reword source or accept warning |
| E-NAME-COLLIDES-STATE | 9 | (β) compiler false positive | structural fix needed — undeclared `@x = v` auto-creates phantom state cell |
| W-LINT-010 | 14 | (β/δ) lint false positive | naive `buildCssRanges` ignores string/comment context |
| W-LINT-001 | 10 | (δ) mirror-class artifact | `<style>` in comments + strings discussing the language being parsed |
| E-SCOPE-001 | 4 | (β) compiler false positive | import alias (`x as y`) not registered under alias name |
| E-SYNTAX-042 | 2 | (α) real bug in mirror | `return null` in `display-text-literal.scrml` lines 491-492 |
| W-LINT-011 | 1 | (δ) mirror-class artifact | `:attr=` inside a string literal demonstrating the parser's recognition |
| W-LINT-007 | 1 | (δ) mirror-class artifact | brace-attribute syntax inside a comment / string |
| E-MU-001 | 1 | (α) real bug in mirror | `let consumedRhs = false; ...; consumedRhs = true` — bare reassignment is a TILDE-DECL, not an update |

Net: 51 fires; 11 of 51 (22%) are α (real bugs / spec-correct in mirrors);
**26 of 51 (51%) are β compiler false positives across two structural
classes** (auto-state-cell creation + naive CSS-range builder); **14 of 51
(27%) are δ mirror-class artifacts** (the mirror's documentation-class purpose
embeds ghost-pattern strings in comments and string literals that the lint's
context detection cannot suppress).

---

## Per-class deep-dive

### E-ROUTE-001 — 9 fires

**§34 catalog row** (SPEC.md:15193):
> | E-ROUTE-001 | §12.4 | Unresolvable callee or computed member access in route analysis | Warning |

**Normative cross-ref** (SPEC.md:6726):
> A function that the compiler cannot fully analyze for route placement SHALL be a compile error (E-ROUTE-001).

**Emitter locus.** `compiler/src/route-inference.ts:922-933`. Predicate:
```ts
const COMPUTED_MEMBER_REGEX = /\b[A-Za-z_$][A-Za-z0-9_$]*\s*\[/;
// ...
if (!isWorkerBody && COMPUTED_MEMBER_REGEX.test(expr)) {
  warnings.push({ code: "E-ROUTE-001", ... severity: "warning" });
}
```
The check is a textual regex match — it fires on ANY bare-expr text containing
"ident `[`". No AST inspection.

**Per-site enumeration:**

| # | File | Expression (truncated) | Site shape |
|---|---|---|---|
| 1 | block-context.scrml:334 | `table["$" + brace] = BlockContext.InLogicEscape` | sigil-table init |
| 2 | block-context.scrml:335 | `table["?" + brace] = BlockContext.InSql` | sigil-table init |
| 3 | block-context.scrml:336 | `table["#" + brace] = BlockContext.InCss` | sigil-table init |
| 4 | block-context.scrml:337 | `table["!" + brace] = BlockContext.InErrorEffect` | sigil-table init |
| 5 | block-context.scrml:338 | `table["^" + brace] = BlockContext.InMeta` | sigil-table init |
| 6 | block-context.scrml:339 | `table["~" + brace] = BlockContext.InTest` | sigil-table init (the message renders the test sigil as `__scrml_tilde__` — see cross-class note) |
| 7 | block-context.scrml:340 | `table["_" + brace] = BlockContext.InForeignCode` | sigil-table init |
| 8 | parse-css-body.scrml:404 | `seen[name] = true` | set-membership lookup |
| 9 | parse-stmt.scrml:N (recorded via re-emit) | `decl.declarations[0].init is some` → regex catches `declarations[` | array-index inside expression |

**Category breakdown.**
- **(α) real + spec-correct: 9 of 9.** Each fire is spec-conformant per
  §12.4 — the compiler cannot statically determine the accessed key. The
  block-context.scrml sites carry an explicit author comment
  ("README ANOMALY-1 string-literal workaround ... a string literal containing
  a brace-bearing sigil written literally trips the same BS-layer
  bracket-matching issue as a literal sigil in a comment"). The author
  chose computed key concatenation deliberately to work around a BS-layer
  bug; the warning is correct but disagrees with intent.
- **(ε) double-emission: 0.** Each fire is a distinct call site.

**Per-class recommendation.** Author-side decision. The diagnostic is
spec-correct. Three viable closures:
1. Rewrite `table["$" + brace] = ...` to `table["${"] = ...` (literal key) IF
   the BS bracket-matching workaround is no longer needed (verify against
   block-splitter at HEAD).
2. Move the helper into a `<program worker>` so `isWorkerBody=true`
   suppresses E-ROUTE-001 (route-inference.ts:824 — workers are exempted).
3. Accept the 7 sigil-table warnings as documentation of the workaround.

Sites #8 (`seen[name]`) and #9 (`declarations[0].init`) are ordinary
JavaScript patterns the .scrml author used because the call-graph is parsing
JS-host code. No protected fields are involved; the warning is informational
but spec-correct.

---

### E-NAME-COLLIDES-STATE — 9 fires

**§34 catalog row** (SPEC.md:15344):
> | E-NAME-COLLIDES-STATE | §6.1 | Local identifier declaration uses the same name as a registered state cell in scope. Local names cannot shadow state names. Example: `<count> = 0; ... let count = 5`. | Error |

**Normative cross-ref** (SPEC.md:1992):
> **E-NAME-COLLIDES-STATE** (compile error): A local identifier declaration uses the same name as a registered state cell in scope. Local names cannot shadow state names. See §34.

**Emitter locus.** `compiler/src/symbol-table.ts:1213-1244`
(`checkLocalDeclCollidesState`). Predicate:
```ts
if (!decl.name) return;
const collided = lookupStateCell(currentScope, decl.name);
if (!collided) return;
// ... push E-NAME-COLLIDES-STATE error
```

The trigger depends on a registered state cell of the same name being found
by `lookupStateCell` walking the parent-scope chain.

**Per-site enumeration:**

| # | File | Decl | Source line |
|---|---|---|---|
| 1 | parse-markup.scrml | `let p` | function body inside top-level `${...}` meta block |
| 2 | parse-markup.scrml:432 | `let braceDepth` | inside `isStateDeclOpenerAt` function |
| 3 | parse-markup.scrml:433 | `let parenDepth` | (same function) |
| 4 | parse-markup.scrml:434 | `let inDouble` | (same) |
| 5 | parse-markup.scrml:435 | `let inSingle` | (same) |
| 6 | parse-markup.scrml:436 | `let stop` | (same) |
| 7 | (separate fn) | `let p` | another helper function |
| 8 | parse-markup.scrml:538 | `let name` | `peekTagNameLower` |
| 9 | (separate fn) | `let p` | another helper function |

**Category breakdown.**
- **(β) compiler false positive: 9 of 9.** No `.scrml` file in the
  parse-markup.scrml import graph contains a state-cell declaration
  (`<p> = init`, `<braceDepth> = init`, etc.) at any scope. Verified by
  comprehensive grep: every reference to `<p>` / `<braceDepth>` / `<name>` etc.
  in the .scrml mirrors is either inside a `//` comment or a `"..."`
  string literal.
- The actual block-context.scrml engine declares state-children named
  `<TopLevel>`, `<InMarkupTag>`, `<InLogicEscape>`, `<InCss>`, `<InSql>`,
  `<InErrorEffect>`, `<InMeta>`, `<InTest>`, `<InForeignCode>` — none of
  which collide with the locals firing E-NAME-COLLIDES-STATE.

**Root cause** (12-line minimal repro):

```scrml
<engine for=Foo initial=.A>
    <A></>
</>

${
    export fn check() {
        let braceDepth = 0
        @braceDepth = @braceDepth + 1
    }
}
```

Compiling this fires E-NAME-COLLIDES-STATE on `let braceDepth = 0`,
claiming it shadows registered state cell `<braceDepth>`. There IS no such
declaration anywhere in the source. The compiler is **auto-creating a
`<braceDepth>` phantom state cell from the `@braceDepth = ...` write**.

Confirmation tests:

- Remove the `@braceDepth = @braceDepth + 1` line — collision disappears.
- Remove the `let braceDepth = 0` and keep only `@braceDepth = @braceDepth + 1`
  — no E-SCOPE-001 fires either (the compiler silently accepts the write to a
  cell that was never declared via `<braceDepth> = init`).

The .scrml source authors wrote `@p = @p + 1` / `@braceDepth = ...` etc.
inside function bodies that ALSO declared `let p` / `let braceDepth`. Per
V5-strict (§6.1), `@x` is a state-cell read/write — a bare `@x = v` on
an undeclared cell should either be E-SCOPE-001 ("undeclared identifier")
or a normative error. Instead the compiler is silently treating it as a
declaration, then firing E-NAME-COLLIDES-STATE when the function's `let x`
appears.

**Per-class recommendation.** Compiler-source fix needed. Two viable
shapes:
1. Make `@x = v` on an undeclared cell fire E-SCOPE-001 / a dedicated
   E-NO-SUCH-STATE-CELL diagnostic. The .scrml author then knows to either
   declare `<x> = init` or drop the `@` sigil.
2. Make `@x = v` not auto-register a phantom cell (the symbol-table
   registration must be tied to an actual `<x> = init` AST node, not to a
   bare `@`-prefixed write). The current behavior creates phantom records
   that downstream walkers consult as if real.

Either fix closes all 9 fires AND restores diagnostic clarity for the
.scrml author (the .scrml mirror's intent is clearly a local mutation —
the `@` sigils on `@p`, `@braceDepth` etc. are a code-style mistake the
author has been getting away with).

This finding is a **structural pattern that may warrant its own deep-dive**
— see Cross-class observation #2 below.

---

### W-LINT-010 — 14 fires

**§34 catalog row** (SPEC.md:15465):
> | W-LINT-010 | §9 | A `${...}` interpolation was found inside a `#{ ... }` CSS context. scrml's CSS context accepts `@var` directly; `${}` interpolation is for logic context only. (Ghost-pattern lint.) | Warning |

**Emitter locus.** `compiler/src/lint-ghost-patterns.js:463-476`. Predicate:
```js
{
  regex: /\$\{/g,
  ghost: "${} in CSS context",
  correction: "@var directly in #{}",
  code: "W-LINT-010",
  skipIf: (offset, logicRanges, cssRanges) => {
    if (!inRange(offset, cssRanges)) return true; // skip — not in CSS context
    return false;
  },
},
```

`cssRanges` is computed by `buildCssRanges` (lint-ghost-patterns.js:140-159):

```js
function buildCssRanges(source) {
  const ranges = [];
  let i = 0;
  while (i < source.length) {
    if (source[i] === "#" && source[i + 1] === "{") {
      const start = i;
      i += 2;
      let depth = 1;
      while (i < source.length && depth > 0) {
        if (source[i] === "{") depth++;
        else if (source[i] === "}") depth--;
        i++;
      }
      ranges.push([start, i]);
    } else { i++; }
  }
  return ranges;
}
```

**The builder is naive.** It does not consult string-literal ranges, comment
ranges, or any other context — it just scans for raw `#{` text. In
parse-markup.scrml, `#{` appears 5 times, all inside comments or strings
(e.g., comment text "`${ ?{ #{ ...` sigil" at line 891). The builder treats
the rest of the source after each phantom `#{` as a CSS range until brace
depth balances. Inside those phantom ranges, every legitimate `${...}` in
the source fires W-LINT-010.

**Per-site enumeration:** all 14 fires in parse-markup.scrml at lines 891,
973, 993, 999, 1005, 1029, 1075, 1215, 1238, 1277, 1280, 1296, 1297, 1709.
Spot-checked sites (e.g., line 891) confirmed to be inside doc-comments
discussing the parser's behavior toward `${...}` syntax.

**Category breakdown.**
- **(β) compiler-side false positive: 14 of 14.** None of the 14 sites is
  actually inside a `#{...}` CSS context. The `#{...}` matches `buildCssRanges`
  detects are all phantom matches inside comments / string literals discussing
  the *language being parsed*.
- The W-LINT-010 skipIf does not even consult `commentRanges` — it only
  checks `!inRange(offset, cssRanges)`. So a `${...}` inside a `//` comment
  that the naive CSS-range builder mis-included in a phantom CSS range will
  fire regardless of comment status.

**Per-class recommendation.** Compiler-source fix. `buildCssRanges` should
either (a) skip `#{` inside comments + string literals, or (b) the W-LINT-010
skipIf should additionally check `commentRanges` and `stringRanges` to gate
the fire. Option (a) is the more conservative fix (the cssRanges output is
shared by other patterns; making the builder context-aware fixes all
downstream consumers at once).

---

### W-LINT-001 — 10 fires

**§34 catalog row** (SPEC.md:15457):
> | W-LINT-001 | §9 | A bare `<style>` block was found. CSS rules in scrml live inside the `#{ ... }` CSS context, not in a `<style>` HTML element. (Ghost-pattern lint; emitted at `compiler/src/lint-ghost-patterns.js`.) | Warning |

**Emitter locus.** `compiler/src/lint-ghost-patterns.js:354-363`. Predicate:
```js
{
  regex: /<style\b/gi,
  ghost: "<style>",
  correction: "#{ css rules }",
  code: "W-LINT-001",
  skipIf: null, // Never a valid scrml construct
},
```

`skipIf: null` — fires unconditionally regardless of comment / string /
logic / CSS context.

**Per-site enumeration:** all 10 fires in parse-markup.scrml at lines 531,
549, 551, 930, 931, 932, 934, 936, 937, 951. Every site is inside either a
doc-comment or a string literal **about the parser's handling of `<style>`
elements in the source language being parsed**:

- Line 530-531: `// P5-4 — \`<style>\` IS NOT A SCRML MARKUP ELEMENT.`
- Line 942: `if (peekTagNameLower(cursor) is "style") { ... }`
- Line 951: `"<style> blocks are not supported in scrml. Use #{} for CSS."`
  (the diagnostic the .scrml parser emits to ITS parsed program)

**Category breakdown.**
- **(δ) mirror-class artifact: 10 of 10.** The .scrml mirror is the source
  of the parser that **rejects** `<style>` in scrml. Every occurrence is
  a documentation reference, a diagnostic message string, or a comment
  describing the parser's behavior. None is an actual `<style>` element
  in the .scrml mirror.

**Per-class recommendation.** Compiler-source fix.
`skipIf: null` is wrong for the mirror class. Two viable shapes:
1. Add the standard comment-and-string skip: `skipIf: (offset, logicRanges,
   _cssRanges, commentRanges, _tildeRanges, _functionBodyRanges,
   stringRanges) => inRange(offset, commentRanges) || inRange(offset,
   stringRanges)`. Most other W-LINT-NNN patterns already use this shape.
2. Argument for keeping `skipIf: null`: a `<style>` in a string literal that
   the codegen splats into HTML output IS a real ghost. But this case is
   rare and the false-positive cost is high for documentation-class .scrml
   mirrors that implement the language.

Option (1) is the conservative recommendation. The lint's signal value on
the .scrml mirrors is currently zero (0 of 10 fires actionable).

---

### E-SCOPE-001 — 4 fires

**§34 catalog row** (SPEC.md:15175):
> | E-SCOPE-001 | §5.2 | Unquoted identifier not resolvable in scope | Error |

**Normative cross-refs** (SPEC.md:1292-1293):
> - The compiler SHALL validate unquoted identifiers against the current scope. An unquoted identifier that cannot be resolved SHALL be a compile error (E-SCOPE-001).
> - A bare identifier in an attribute value or logic expression (`${ }`) whose name matches a declared reactive variable SHALL be a compile error (E-SCOPE-001). Reactive reads require the `@` sigil — `@name` — so the compiler can wire reactivity.

**Emitter locus.** `compiler/src/type-system.ts:3265-3346` (§2a — "E-SCOPE-001
in logic expressions"). Walks every identifier in a logic-context ExprNode
and emits E-SCOPE-001 if the identifier is not in scope.

**Per-site enumeration:**

| # | File | Identifier |
|---|---|---|
| 1 | parse-expr.scrml | `makeBindingRestElement` |
| 2 | parse-expr.scrml | `makeBindingAssignmentPattern` |
| 3 | parse-expr.scrml | `makeBindingAssignmentPattern` (different site) |
| 4 | parse-expr.scrml | `makeBindingAssignmentPattern` (different site) |

Both names are **import aliases** in parse-expr.scrml lines 141-146:

```scrml
import {
    makeBindingIdent,
    makeObjectPattern, makeArrayPattern,
    makeRestElement      as makeBindingRestElement,
    makeAssignmentPattern as makeBindingAssignmentPattern,
    makeBindingPropertyKeyValue, makeBindingPropertyShorthand,
    makeBindingPropertyRest,
    makeBindingElementItem, makeBindingElementHole, makeBindingElementRest,
} from "./ast-stmt.scrml"
```

Used at parse-expr.scrml:1701, 1722, 3051, 3130 (matches the 4 fires).

**Minimal repro** (5-line):

```scrml
${
    import { foo as fooAlias } from "./tmp-other.scrml"
    export function check() {
        return fooAlias(42)
    }
}
```

Fires `E-SCOPE-001: Undeclared identifier \`fooAlias\` in logic expression.`
The import alias name `fooAlias` is NOT registered in scope; the only name
registered is `foo` (the original export name).

**Category breakdown.**
- **(β) compiler-side false positive: 4 of 4.** Per SPEC §21, the `import
  { X as Y } from "..."` form binds the imported identifier under the
  alias name `Y` in the importing file's scope. The compiler is failing to
  register the alias.

**Per-class recommendation.** Compiler-source fix.
`buildSymbolTable` / MOD's import-binding registration walker needs to
honor `as`-aliases by registering the alias name (not the original) into
the importing scope. The .scrml fires are correct under spec semantics if
fixed: drop the alias from the import OR fix the registration. The first
is a workaround on the consumer; the second is the correct fix.

---

### E-SYNTAX-042 — 2 fires

**§34 catalog row** (SPEC.md:15554):
> | E-SYNTAX-042 | §17.6, §45 | `null` or `undefined` appears in a scrml value position. scrml's absence sentinel is `not`; `null`/`undefined` are not valid scrml literals. (Catalog addition S78 audit; emitted at `compiler/src/gauntlet-phase3-eq-checks.js:519, 613`.) | Error |

**Normative cross-ref** (SPEC.md:19878-19880): "The rejection of `null` /
`undefined` (E-SYNTAX-042) SHALL apply uniformly across **every** scrml
source position."

**Emitter locus.** `compiler/src/gauntlet-phase3-eq-checks.js:626-660`
(`emitForRawLitNull`):
```js
errors.push({
  code: "E-SYNTAX-042",
  message: `E-SYNTAX-042: \`${tok}\` is not a scrml token — scrml uses \`not\` for absence (§42.7). ` + ...
});
```
Triggers on `lit-null` / `lit-undefined` / `ident-null` / `ident-undefined`
AST nodes that survive into post-parse gauntlet checks (per §42.7 reject
grammar).

**Per-site enumeration:**

| # | File:Line | Source |
|---|---|---|
| 1 | display-text-literal.scrml:491:32 | `if (bodyText is not) { return null }` |
| 2 | display-text-literal.scrml:492:44 | `if (bodyText.trim().length == 0) { return null }` |

**Category breakdown.**
- **(α) real bug in mirror: 2 of 2.** The author wrote `return null` (a JS
  return) instead of `return not` (scrml's canonical absence form per
  §42.7). The .scrml mirror is in violation of the S89 user-ratified
  absence-axiom ("null does NOT EXIST IN SCRML! and never will!").
- Confirmation: both lines use `null` in pure value position (return
  statement), which §42.7 unconditionally rejects. The companion lint
  W-ABSENCE-IN-SCRML-SOURCE (§34) is the regression-guard for any sites
  the hard-error walker misses; here the hard error correctly fires.

**Per-class recommendation.** Mechanical sweep — straightforward
`null → not` substitution at the two sites. Precedent: Wave 10-M did
exactly this for `display-text-literal.scrml` (commit `dc2473f3` —
`===`/`!==` and `null`/`undefined` migrations) but missed these two sites.
Mirrors the C3 ledger entry for `bs.scrml` (S121 corpus-sweep `980a95f4`).

---

### W-LINT-011 — 1 fire

**§34 catalog row** (SPEC.md:15466):
> | W-LINT-011 | §5 | A Vue-style `:attr=` colon-prefixed attribute binding was found (e.g., `:disabled="cond"`). scrml uses `attr=@var` for reactive attribute values; the colon-prefix form is reserved for `class:name=`, `bind:value=`, etc. (Ghost-pattern lint.) | Warning |

**Emitter locus.** `lint-ghost-patterns.js:481-488`. Predicate:
```js
{
  regex: /\s:[a-z][a-zA-Z0-9-]*\s*=/g,
  code: "W-LINT-011",
  skipIf: (offset, logicRanges) => inRange(offset, logicRanges),
},
```

The skipIf only checks `logicRanges` — it does NOT check `commentRanges` or
`stringRanges`.

**Per-site enumeration:**

| # | File:Line:Col | Source |
|---|---|---|
| 1 | parse-stmt.scrml:789:66 | string literal demonstrating Vue-style binding the parser recognizes |

**Category breakdown.**
- **(δ) mirror-class artifact: 1 of 1.** The fire is inside a string
  literal documenting / handling colon-prefix attribute syntax the parser
  needs to recognize. Spot-check: line 789 is inside a string-literal
  context.

**Per-class recommendation.** Compiler-source fix — add `commentRanges`
+ `stringRanges` to the W-LINT-011 skipIf. Many other patterns already do
this (lint-ghost-patterns.js:574, 598, 622, 647, 735, 756, 783). The fix
is a 3-line skipIf augmentation.

---

### W-LINT-007 — 1 fire

**§34 catalog row** (SPEC.md:15463):
> | W-LINT-007 | §5 | A JSX-style `<Comp prop={val}>` brace-literal attribute on a component was found (excluding `value=` which is W-LINT-005). scrml uses `<Comp prop=val>` without braces. (Ghost-pattern lint.) | Warning |

**Emitter locus.** `lint-ghost-patterns.js:433-441`. Predicate:
```js
{
  regex: /(?<!:\w*)(?<!type )\b(?!value\b|props\b)(\w+)\s*=\s*(?<!\$)\{(?!\{)/g,
  code: "W-LINT-007",
  skipIf: (offset, logicRanges, _cssRanges, commentRanges) =>
    inRange(offset, logicRanges) || inRange(offset, commentRanges),
},
```

The skipIf checks `logicRanges` + `commentRanges` but NOT `stringRanges`.

**Per-site enumeration:**

| # | File:Line:Col | Source |
|---|---|---|
| 1 | parse-css-body.scrml:391:15 | string literal containing `prop={...}` example |

**Category breakdown.**
- **(δ) mirror-class artifact: 1 of 1.** The fire is inside a string
  literal demonstrating brace-attribute syntax — likely a CSS selector or
  test fixture string. (Could also be a legitimate-looking embedded
  pattern in a CSS value; further inspection would distinguish.)

**Per-class recommendation.** Same as W-LINT-011 — add `stringRanges` to
the skipIf. The W-LINT-007 pattern already had a precedent for `props`
exclusion (S96 Bug 8 fix); adding stringRanges is in keeping with that
fix's direction.

---

### E-MU-001 — 1 fire

**§34 catalog row** (SPEC.md:15326):
> | E-MU-001 | §35 | Must-use: return value of `!` function not captured | Error |

**(Note — the catalog row description suggests this is for `!`-failable-
function return values, but the emitter actually fires for `tilde-decl`
unused-before-scope-exit. The SPEC row description is misaligned with
the implementation; see Open Questions below.)**

**Emitter locus.** `compiler/src/type-system.ts:9478-9487`:
```ts
for (const { name, span: declSpan } of mustUseTracker.unusedEntries()) {
  errors.push(new TSError("E-MU-001",
    `E-MU-001: Variable \`${name}\` was declared but never used before this scope closes. ` +
    `Either use the value somewhere ... or prefix with \`_\` to suppress this warning ...`));
}
```

`mustUseTracker.declare` (type-system.ts:8693-8694) is called ONLY for
nodes with `kind: "tilde-decl"`. Per the ast-builder.js:5797-5810 TILDE-DECL
production, **a bare `IDENT = expr` (no keyword)** is consumed as a
tilde-decl.

**Per-site enumeration:**

| # | File:Line | Source |
|---|---|---|
| 1 | tag-frame.scrml:1492 + 1541 | `let consumedRhs = false` (line 1492); `consumedRhs = true` (line 1541) — bare `consumedRhs = true` is parsed as a NEW tilde-decl |

**Category breakdown.**
- **(α) real bug in mirror: 1 of 1.** The author wrote
  `let consumedRhs = false` at line 1492 (a let-decl) and then
  `consumedRhs = true` at line 1541 (a bare assignment, which in V5-strict
  scrml is a TILDE-DECL `~consumedRhs`, NOT a reassignment of the prior
  `let consumedRhs`). The must-use tracker correctly flags the tilde-decl
  at line 1541 as unused (it is declared at 1541 and never read after
  the assignment) — its prior `consumedRhs` (the let-decl) is read at
  line 1512, but that's a different binding.

**Per-class recommendation.** Mechanical sweep. The .scrml author needs to
choose: either (a) use `let consumedRhs = false` + explicit reassignment
syntax that updates the let-binding (TBD what V5-strict allows for
imperative update of a `let` — see Open Questions); OR (b) drop the `let`
prefix at line 1492 too and use `consumedRhs = false` followed by `consumedRhs = true` consistently as bare TILDE-DECLs. Path (b) is the
canonical scrml shape (the let-prefix is JS-style; V5-strict prefers
bare TILDE-DECL).

---

## Cross-class observations

### 1. The brief's count methodology produced inflated numbers

The brief's table claimed 76 total fires across 10 classes:

```
$ scrml compile parse-markup.scrml 2>&1 | grep -oE "(E|W)-[A-Z0-9-]+" | sort | uniq -c
```

This double-counts: every diagnostic message emits the code TWICE — once in
the prefix (`error [X-CODE-N]:`) and once embedded in the message body
(`X-CODE-N: ...`). The correct grep is on the citation prefix:

```
$ scrml compile parse-markup.scrml 2>&1 \
    | grep -E "^(error|warning|lint) \[" \
    | grep -oE "\[(E|W)-[A-Z0-9-]+\]" \
    | sort | uniq -c
```

This yields the true unique-fire counts (51 here, not 76).

The 10th class (`E-STMT-FN-FOR-BINDING-INIT`) doesn't exist — the brief
likely auto-corrected `E-STMT-FOR-BINDING-INIT`. Even that real code does
not actually fire on parse-markup.scrml: the single string-match grep found
is INSIDE a string literal (`recordError(ctx, "E-STMT-FOR-BINDING-INIT", ...)` —
the .scrml parser emitting that code for the program-under-parse).

### 2. The walker-fix did NOT surface new diagnostic surface

The brief hypothesized Wave 10-P "surfaced new diagnostic surface because
code previously invisible to the walker is now visible." Empirically, this
did not happen. Comparing pre-W10-P (`6297fefc`) to post-W10-P (`498ae3e6`)
in this survey:

- W-DEAD-FUNCTION: 20 → 0 (this is the only delta)
- All 9 other classes: identical fire counts (and identical source-line
  locations) on both sides.

The W10-P diff at `route-inference.ts:1155-1205` is purely additive to
`callees.push(...)` — it does not touch trigger detection. The brief's
"some classes doubled" observation was a grep artifact (E-ROUTE-001 codes
counted 2× because each fire renders the code in both the prefix and the
message body).

### 3. Two structural compiler defects explain 26 of 51 fires (51%)

| Defect | Fires explained | Class |
|---|---|---|
| Auto-state-cell creation from undeclared `@x = v` writes | 9 | E-NAME-COLLIDES-STATE |
| `buildCssRanges` ignores string + comment context | 14 | W-LINT-010 |
| (Bonus) Import alias `x as y` not registered under alias | 4 | E-SCOPE-001 |
| **Total compiler-side** | **27 of 51 (53%)** | |

The auto-state-cell finding is the most structurally significant. It
explains why the .scrml authors have been writing `@x = @x + 1` on local
variables without errors — the compiler silently accepts the syntax and
records a phantom state cell. The phantom cell then surfaces only when
a sibling `let x` declaration appears in the same scope.

Per pa.md Rule 4 (SPEC normative) and the V5-strict §6.1 axioms, the
correct behavior is **either** a hard error on `@x = v` to an undeclared
cell, **or** explicit auto-declaration semantics in SPEC §6 that the
compiler honors consistently. The current behavior is neither — it
auto-declares without spec authority, and the auto-declaration only
surfaces through downstream collision diagnostics.

### 4. Lint skipIf misalignment — recurring pattern

Three lint codes (W-LINT-001, W-LINT-010, W-LINT-011) misfire on this
mirror set due to insufficient skipIf coverage:

| Code | Current skipIf | Missing context check |
|---|---|---|
| W-LINT-001 | `null` (always fires) | comment + string |
| W-LINT-010 | `cssRanges` only | comment + string (+ the cssRanges builder itself is naive) |
| W-LINT-011 | `logicRanges` only | comment + string |
| W-LINT-007 | `logicRanges + commentRanges` | string |

Most other patterns in `lint-ghost-patterns.js` (574, 598, 622, 647, 735,
756, 783) DO check `commentRanges`. The misaligned codes here are the
ones the .scrml documentation-class mirror exercises hardest. A single
audit pass adding `commentRanges + stringRanges` to all four skipIf
predicates would close 26 fires (W-LINT-001×10 + W-LINT-010×14 + W-LINT-011×1
+ W-LINT-007×1) AT ONCE — modulo verifying the W-LINT-010 cssRanges builder
also gets the context-aware treatment.

### 5. Real-bug fires are concentrated

11 of 51 fires (22%) are α category — real-pattern bugs in the .scrml
mirrors that the diagnostics correctly identified:

| Class | Fires | Sites |
|---|---|---|
| E-ROUTE-001 | 9 | sigil-table init + 2 incidental computed-member accesses; all spec-correct, all candidates for source rewrites |
| E-SYNTAX-042 | 2 | `return null` ×2 in display-text-literal.scrml — straightforward sweep |
| E-MU-001 | 1 | bare `consumedRhs = true` as second-binding tilde-decl — author intent ambiguous |

The mechanical α-class closure is 3 surgical fixes (2 null→not + 1
tilde-decl reshape). The 9 E-ROUTE-001 sites are author-pattern choices
that may stand as-is.

### 6. The `~` rendering in diagnostic messages — incidental artifact

In the E-ROUTE-001 fire at block-context.scrml:339, the message body
renders `table["~" + brace]` as `table["__scrml_tilde__" + brace]`. This
appears to be a `~` → `__scrml_tilde__` escape applied somewhere in the
diagnostic-rendering pipeline. Not load-bearing for this survey, but
noted as an incidental rendering artifact downstream of S118 M5-swap
Wave 2 B3 (`~`-decl production landing in §34.1; the `~` was likely
escaped for display-safety to disambiguate the sigil from the bitwise
operator).

---

## Open Questions

1. **E-MU-001 SPEC row vs implementation.** SPEC §34 row says E-MU-001 is
   "Must-use: return value of `!` function not captured" (§35 cross-ref).
   The actual emitter at type-system.ts:9478 fires for `tilde-decl` not
   `!`-failable-function returns. Two possibilities: (a) the SPEC row text
   is stale or wrong; (b) the implementation re-uses the code for a
   different purpose without updating SPEC. Per S95 user-direction
   ("don't soft-classify compiler bugs as 'doc gap'") this should be
   investigated as a bug. Out of scope for this survey to resolve.
2. **V5-strict `let` reassignment semantics.** Per §6.1 / §14, what is the
   normative way to UPDATE a `let consumedRhs = false` after declaration?
   The tag-frame.scrml site implies the author expected JS-style
   reassignment to work. If V5-strict requires re-declaration via bare
   `consumedRhs = true` (tilde-decl), the SPEC should make this explicit
   in §6.1.x or §14.x; if the author meant something else, the .scrml
   mirror needs the canonical pattern documented.
3. **Auto-state-cell creation — spec authority.** Where in SPEC does the
   semantics for `@x = v` on an undeclared cell get specified? §6.1 is
   strict about `<x> = init` being the declaration form; the silent
   auto-creation observed here has no spec backing. This is the most
   load-bearing of the open questions; if the spec is silent, the
   compiler behavior is ad-hoc and needs explicit ratification or fix.
4. **E-ROUTE-001 BS-string-workaround verification.** The .scrml author at
   block-context.scrml:332-340 wrote `table["$" + brace] = ...` to work
   around a documented BS-layer bracket-matching issue. Is that workaround
   still required at HEAD? If the BS-layer issue is closed, the 7 sigil-
   table E-ROUTE-001 warnings can be eliminated by switching to literal
   keys (`table["${"] = ...`). This is a surface question for the .scrml
   author / block-context owner; not knowable from inside this survey.

---

## Recommended Wave 11 dispatch list

Ranked by closure-value × cost ratio. Closure value = number of fires
closed. Cost = approximate dispatch complexity.

| # | Dispatch | Closure | Cost | Notes |
|---|---|---|---|---|
| 1 | **Audit `lint-ghost-patterns.js` skipIf coverage — add `commentRanges + stringRanges` to W-LINT-001 / W-LINT-010 / W-LINT-011 / W-LINT-007 + make `buildCssRanges` context-aware** | **26 fires** | Low (1 file edit; skipIf augmentation + builder context-pass) | Compiler-side; mechanical pattern audit; no SPEC impact. Largest single-dispatch closure. |
| 2 | **Fix import-alias registration in SYM/MOD — register `Y` (not `X`) for `import { X as Y } from "..."`** | 4 fires | Med (touches SYM + MOD import walkers) | Compiler-side fix. Spec-compliant per §21.2. |
| 3 | **null→not mechanical sweep on display-text-literal.scrml:491,492** | 2 fires | Trivial | Mirror-side; precedent Wave 10-M `dc2473f3`. |
| 4 | **Auto-state-cell creation — investigate + decide normative behavior** | 9 fires (+ unbounded backlog) | High (SPEC ratification + compiler fix) | Most structurally significant. Recommend dedicated deep-dive (see "Recommendations for downstream" below). Closes 9 E-NAME-COLLIDES-STATE PLUS removes the latent source of phantom state cells across the entire .scrml mirror set. |
| 5 | **E-ROUTE-001 — verify BS string-workaround still needed; if not, rewrite sigil-table to literal keys** | 7 fires | Med (requires verifying BS-layer state) | Mirror-side OR author-decision. Two of the 9 (sites #8 + #9) are JS-host computed-access patterns and remain. |
| 6 | **E-MU-001 — reshape consumedRhs declaration in tag-frame.scrml:1492-1541** | 1 fire | Trivial | Mirror-side; awaits OQ-2 resolution. |
| 7 | **(Defer) Investigate E-MU-001 SPEC row vs implementation misalignment** | 0 fires | Low | Quality issue; not a closure dispatch. |
| 8 | **(Defer) Investigate E-STMT-FOR-BINDING-INIT brief mis-count** | 0 fires | None | Already characterized — not a real fire; correct the gap-ledger if it appears anywhere else. |

**Headline.** Dispatches 1 + 2 + 3 + 6 close **33 of 51 fires (65%)** with
low-to-medium cost. Dispatch 4 alone closes another 9 but requires SPEC
ratification + a careful compiler fix; it should be a dedicated deep-dive
unit rather than a mechanical dispatch.

**Sub-deep-dive recommendation.** The "auto-state-cell creation" finding
(Dispatch 4) is a structural pattern with implications beyond the 9 fires
counted here:

- It hides genuine errors (the .scrml author wrote `@p = @p + 1` on a
  local variable for years; the compiler silently accepted it).
- It creates phantom symbol-table records that downstream walkers consult
  as if real.
- It potentially affects the route-inference walker, the dependency-graph
  walker, and the codegen reactive-cell wiring — none of which were probed
  in this survey.

Recommend `@scrml-deep-dive` re-entry with scope locked to: "What is the
normative behavior of `@x = v` when no `<x> = init` exists in scope? Spec
authority + implementation alignment + downstream walker impacts." See
Recommendation in `~/.claude/agents/scrml-deep-dive.md` for the phase
template.

---

## Files consulted

- `compiler/SPEC.md` §34 catalog rows for all 10 codes (lines 15175,
  15193, 15326, 15344, 15398, 15457, 15463, 15465, 15466, 15554, 15727)
- `compiler/SPEC.md` §6.1 V5-strict (1980-2008)
- `compiler/SPEC.md` §12.5 route inference (6726)
- `compiler/SPEC.md` §42.7 absence (19837-19898)
- `compiler/SPEC-INDEX.md` for §34 location (15102)
- `compiler/src/route-inference.ts:340-933, 1140-1216, 2674`
- `compiler/src/symbol-table.ts:760-985, 1190-1244`
- `compiler/src/type-system.ts:3265, 8339-8381, 8693-8704, 9478-9487`
- `compiler/src/lint-ghost-patterns.js:1-205, 354-498`
- `compiler/src/gauntlet-phase3-eq-checks.js:522-660`
- `compiler/src/ast-builder.js:5780-5810`
- `compiler/native-parser/parse-markup.scrml` (lines 154-249, 415-460, 520-560, 880-955, 965-1015)
- `compiler/native-parser/block-context.scrml` (lines 192-345)
- `compiler/native-parser/tag-frame.scrml:1485-1545`
- `compiler/native-parser/parse-expr.scrml:138-150`
- `compiler/native-parser/parse-css-body.scrml:391, 398-412`
- `compiler/native-parser/parse-stmt.scrml:1165-1185`
- `compiler/native-parser/display-text-literal.scrml:485-500`
- `docs/changes/m5-c2-gap-ledger/w-dead-function-survey-s121-2026-05-22.md` (parent dispatch — Unit O)
- Wave 10-P commit `498ae3e6` + Wave 10-N predecessor `6297fefc` (for pre/post compare)

## Maps consulted

None — no `.claude/maps/` resource maps were referenced in this survey.
The survey is purely a per-file investigation in the .scrml mirror set
and its emitter sources.

---

## Tags

#deep-dive #wave-11 #m5-c2 #gap-ledger #native-parser #diagnostics
#W-LINT-001 #W-LINT-007 #W-LINT-010 #W-LINT-011 #E-ROUTE-001
#E-NAME-COLLIDES-STATE #E-SCOPE-001 #E-SYNTAX-042 #E-MU-001
#auto-state-cell-bug #import-alias-bug #lint-context-bug
#S121 #read-only-survey

## Links

- Parent dispatch (Unit O): `docs/changes/m5-c2-gap-ledger/w-dead-function-survey-s121-2026-05-22.md`
- Wave 10-P fix commit: `498ae3e6` `fix(ri Wave 10-P): walkBodyForTriggers collects callees from ExprNode fields`
- Wave 10-N predecessor: `6297fefc`
- Wave 10-M precedent (display-text-literal null→not sweep): `dc2473f3`
- SPEC §34 error-codes catalog: `compiler/SPEC.md:15102+`
- SPEC §6.1 V5-strict: `compiler/SPEC.md:1980-2008`
- SPEC §42.7 absence: `compiler/SPEC.md:19837-19898`
- Ghost-pattern lint source: `compiler/src/lint-ghost-patterns.js`
- Route-inference: `compiler/src/route-inference.ts`
- Symbol-table: `compiler/src/symbol-table.ts`
- Sibling memory rule: `~/.claude/projects/-home-bryan-maclee-scrmlMaster-scrmlTS/memory/feedback_dont_soft_classify_bugs.md` (S95 — relevant to the auto-state-cell finding)
