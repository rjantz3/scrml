# M6.7-D1 — FIX-NATIVE: `no statement begins here` cluster — root cause + fix

Worktree: /home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a15b52bb077a2734d
Branch:   worktree-agent-a15b52bb077a2734d
Startup pwd: /home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a15b52bb077a2734d
Maps consulted: primary.map.md (full) + Task-Shape Routing "Native-parser bug fix" row.

## Phase 0 — VERIFIED ROOT CAUSE (pinned BEFORE any fix)

### The bucket label was WRONG (as the brief predicted).
Candidate forms (object-literal concise body `x => ({...})`, block-body call-arg
`foo(() => { ... })`, nested arrows, `arr.map(x => ({...}))`) ALL parse CLEAN under the
native `parseProgram` AND under the full `nativeParseFile` assembler. Arrows are NOT the
trigger. (scratch/phase0-parse.mjs — every arrow candidate native.ok=true.)

### The REAL trigger: `null` / `undefined` literal keywords in EXPRESSION position.
Pinpointing the actual fire sites in the corpus (scratch/phase0-corpus.mjs +
scratch/phase0-pinpoint.mjs over the 1001-file .scrml corpus through `nativeParseFile`)
showed the dominant line-texts are null-comparison ternaries:
  `decl.raw != null ? decl.raw : ""`
  `stmt.span != null ? stmt.span : n.span`
  `return null`, `let renders = null`, `{ name: x, error: null }`
The fire COLUMN lands on the `null` / `undefined` token, not the arrow.

### Mechanism (scratch/phase0-pin2.mjs — minimal isolation, Acorn = oracle):
The native lexer DOES lex `null`→`KwNull` and `undefined`→`KwUndefined`
(token.js:197-198) and even treats them as value-terminals for regex disambiguation
(lex-in-code.js:240-241,300-301). But `parsePrimary` (parse-expr.js:1809) has arms for
`KwTrue`/`KwFalse`/`KwThis`/`KwSuper`/`KwNot` and NO arm for `KwNull`/`KwUndefined`.
They fall through to the `E-EXPR-UNEXPECTED` default ("unexpected token in expression
position: KwNull") at parse-expr.js:1960. The bailed expression strands the cursor, which
cascades to `E-STMT-UNEXPECTED-TOKEN` "no statement begins here" at the statement loop
(parse-stmt.js:457). So `no statement begins here` is the DOWNSTREAM cascade; the
PRIMARY fault is the missing `parsePrimary` arm.

Minimal proof: `const x = a != null ? b : c` — acorn.ok=true, native.ok=FALSE, first
error `E-EXPR-UNEXPECTED: KwNull`. `const x = a != b ? a : c` (no null) — both ok.

### Cluster decomposition — ONE root cause, not N sub-bugs.
Both `null` and `undefined` are the SAME missing-primary-arm fault (same fall-through).
This single cause accounts for the cluster. No separate arrow/object-literal sub-bug
exists — those were red herrings in the diagnostic bucket label.

### Live oracle AST shape (parity target):
expression-parser.ts:1397-1405 — Acorn `Literal{value:null}` → live
`lit { raw:"null", value:null, litType:"not" }` (the `raw:"null"` preserves provenance so
the gauntlet E-SYNTAX-042 user-forbidden-token detector still fires; canonical absence
discriminator is `litType:"not"`).
expression-parser.ts:1349-1384 — Acorn `Identifier{name:"undefined"}` → live
`ident { name:"undefined" }` (undefined is NOT an Acorn literal; it is a plain identifier).

## The fix (pinned divergence point)
1. parse-expr.js `parsePrimary`: add `KwNull` arm → native lit-shaped node with raw "null";
   add `KwUndefined` arm → native lit-shaped node with raw "undefined".
2. ast-expr.js: `makeNullValue(raw, span)` reusing the existing `NotValue` ExprKind but
   carrying the source `raw` (so the bridge can emit raw "null"/"undefined" for provenance).
3. translate-expr.js NotValue arm: pass through `nativeExpr.raw` (default "not") so
   `null`→`lit{raw:"null",value:null,litType:"not"}` and the canonical `not`→raw "not"
   are both preserved. `undefined` bridges to `ident{name:"undefined"}` to match Acorn.

Consistent with the bounded-subset philosophy: this is parity-COMPLETENESS for a form
LIVE already accepts (Acorn parses it), not a JS-superset expansion. No full-semantic
parse added — `null`/`undefined` are leaf atoms.

## Cluster decomposition — the ~103 was N DISTINCT sub-bugs at the corpus level
Running the full 1001-file .scrml corpus through `nativeParseFile`:
  BEFORE fix: 820 `no statement begins here` fires across 181 files.
  AFTER  fix: 474 fires across 176 files.  (-346 fires, ~42% cleared.)
The entire self-host corpus null-trigger is eliminated (ts.scrml 157->0,
ast.scrml 90->0, ri.scrml 51->0, dg.scrml 28->0, pa.scrml 20->0 for the null
trigger). The null/undefined category VANISHES from the residual — proving this
unit fully closes its single root cause.

The 474 RESIDUAL fires are DISTINCT parse paths, NOT this trigger. Classified:
  [185] `server function` decl form — scrml structural-decl/markup seam
  [154] "other" — mostly `${ server function ... }` logic-escape + server-fn
        combo, and type-annotation forms (`amount: number,`)
  [ 59] bare-brace cascades downstream of the above
  [ 42] `:>` transition-arm form (match/transition arm syntax)
  [ 32] object-literal-in-call-arg (`x.send({ k: v })`, `return { error: "..." }`)
  [  2] `match { ... }` form

## STOP CONDITION HIT (per brief scope rule)
Phase-0 found the cluster is N distinct sub-bugs. This unit fixed the DOMINANT
single root cause (null/undefined — the largest single trigger, clearing the
entire self-host corpus). The residuals are GENUINELY separate parse paths
(scrml-language-extension forms), filed as named follow-on units:
  M6.7-D2  `server function` declaration form (native) — ~185+ fires (largest residual)
  M6.7-D3  `:>` transition-arm statement form (native) — ~42 fires
  M6.7-D4  object-literal-in-call-arg parse path (native) — ~32 fires
  (the "other"/bare-brace buckets are mostly cascades of D2; re-measure after D2.)
Did NOT attempt to close all N — they are separate parse paths, per the brief's
explicit STOP-and-report instruction.

NO subset-philosophy line crossed: null/undefined are leaf atoms captured to match
live's existing AST (lit/ident), not a full-semantic JS-form expansion.

## MANDATORY VERIFICATION (final)
1. New unit test: compiler/tests/unit/m67-d1-arrow-callarg-parse.test.js — 23 pass,
   0 fail, 53 assertions (native parse + bridge parity vs Acorn oracle).
2. Within-node canary: 1005 pass / 0 fail. Allowlist regenerated SAME COMMIT
   (0a5a236a) — exactly 6 files moved (all null/undefined-bearing). +30/-34 lines.
   BEFORE total 89812 -> AFTER 94411 (+4599). Per-class deltas:
     SPAN-COORD +3957 (pre-existing span-coord noise on newly-parsed null subtrees)
     FIELD-SHAPE +560, MISSING-FIELD +47, KIND-NAME +30, COUNT-LENGTH +9,
     EXTRA-FIELD -4. The two phase3-eq-null/undefined fixtures IMPROVED
     (KIND-NAME/MISSING-FIELD/EXTRA-FIELD decreased — native now emits the proper
     node instead of a truncated fragment). PARSE-FAILURE 0 -> 0 (nativeParseFile
     never threw; it escape-hatched, so failures showed as missing subtrees that
     now appear).
3. Strict-pass canary: 1000/1001 (99.9%) BEFORE and AFTER — HOLD.
4. Full `bun run test` (pre-commit hook, live default): 14274 pass, 92 skip,
   1 todo, 0 fail (14367 tests / 735 files). No live-pipeline regression.
5. D1-impact spot-check: corpus NSBH 820 -> 474 (-346) — the fix clears the
   dominant trigger across the whole corpus, not just test fixtures.

## FILES TOUCHED
- compiler/native-parser/parse-expr.js   (parsePrimary: KwNull + KwUndefined arms)
- compiler/native-parser/ast-expr.js     (makeNotValue carries `raw`)
- compiler/native-parser/translate-expr.js (NotValue bridge passes `raw` through)
- compiler/tests/parser-conformance-within-node-allowlist.json (regen, same commit)
- compiler/tests/unit/m67-d1-arrow-callarg-parse.test.js (NEW, 23 tests)

## Tags
#m6-7-d1 #native-parser #parse-expr #null-undefined #no-statement-begins-here
#within-node-canary #parity-completeness #scrml-flip #phase-0-root-cause

## Links
- [parse-expr.js](../../../compiler/native-parser/parse-expr.js)
- [ast-expr.js](../../../compiler/native-parser/ast-expr.js)
- [translate-expr.js](../../../compiler/native-parser/translate-expr.js)
- [m67-d1 test](../../../compiler/tests/unit/m67-d1-arrow-callarg-parse.test.js)
- [within-node allowlist](../../../compiler/tests/parser-conformance-within-node-allowlist.json)
- [primary.map.md](../../../.claude/maps/primary.map.md)
