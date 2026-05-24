# M6.7-D6 — FIX-NATIVE: string-literal import specifier (`import { "kebab-name" as alias }`)

Worktree: /home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-ad2812a39926abdaa
Branch:   worktree-agent-ad2812a39926abdaa
Startup pwd: /home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-ad2812a39926abdaa
SHAs: Phase-0/WIP 7cf3ed6c · FINAL 69f2e3ea (fix + load-bearing test + same-commit allowlist regen)

Maps consulted: primary.map.md (full) → Task-Shape Routing "Native-parser bug fix" row
(structure/schema/domain/test). Load-bearing finding: the bridge (translate-stmt.js
makeImportDecl) + native node (ast-stmt.js makeImportNamed) ALREADY carry `imported`/`local`
verbatim into the live import-decl `names[]`/`specifiers[]` shape — so the gap is PURELY in
the import-clause token-recognition in parse-stmt.js, no node/bridge change needed. (The map's
"native-parser sources UNCHANGED" watermark note was correct only up to S128; this unit changes
parse-stmt.js — treated as starting-hypothesis-to-verify per the brief's staleness warning.)

## Phase 0 — VERIFIED ROOT CAUSE (pinned BEFORE any fix)

### The PA pre-check claim was FALSE (as the brief flagged the label has been wrong 5×).
The PA pre-check asserted "a SIMPLE file-top `import { "x" as y } from "..."` ALREADY parses
clean under the native parser." Direct dual-pipeline probe (scratch-d6/phase0-probe.mjs)
DISPROVED this: the bare file-top string import FAILS native identically to the `${ }` and
multi-specifier variants — all 12+ errors starting `E-STMT-IMPORT-NAME` then
`E-STMT-UNCLOSED-IMPORT` → `E-STMT-EXPECT-FROM` → `E-EXPR-UNEXPECTED:KwAs/KwFrom` → the
`no statement begins here` tail. **The gap is UNIVERSAL to the string-literal specifier,
NOT a positional/variant subset.** Live (splitBlocks+buildAST = Acorn oracle) accepts the form
in EVERY position.

| Form (live = OK in all) | NATIVE before | NATIVE after |
|---|---|---|
| `import { "dispatch-board" as db } from '...'` (file top)     | FAIL (12-err cascade) | OK |
| same, inside `${ }` (SPEC §17503 corpus shape)               | FAIL (same cascade)   | OK |
| `import { foo, "x" as a, bar } from '...'` (multi-specifier)  | FAIL (same cascade)   | OK |
| `import { dispatchBoard } from '...'` (bare ident — baseline) | OK                    | OK (unchanged) |

### The precise divergence point.
`parseNamedImportSpecifiers` (compiler/native-parser/parse-stmt.js:2271) required the
imported-name token to be `TokenKind.Ident` (`if (currentKind(cursor) !== TokenKind.Ident)
{ recordError("E-STMT-IMPORT-NAME"); break; }`). A `StringLit` token (`"dispatch-board"`) hit
that arm. The deferral was EXPLICIT in the source comment: "an identifier (or, e.g., a
string-name form; M3.3 takes the identifier form, the corpus shape)." So this is a known,
deliberately-deferred parity gap — NOT corpus-stale.

### Parity target pinned (live oracle AST, scratch-d6/phase0-shape.mjs + postfix-parity.mjs).
The live import-decl for `import { "dispatch-board" as dispatchBoard } from './c.scrml'`:
```
names:      ["dispatch-board"]                                  // UNQUOTED (SPEC §17562)
specifiers: [{ imported:"dispatch-board", local:"dispatchBoard", pinned:false }]
source:     "./c.scrml"
isDefault:  false
```
Edge behaviors (all matched): quoted WITHOUT alias → `local` defaults to the cooked string;
multi-specifier mixed → per-specifier; single-quote → identical (cooked is quote-agnostic).
SPEC §38.12.5 / §12821 confirm the form is CURRENT scrml; §17561-§17562 confirm the stored
imported name SHALL be the UNQUOTED form. The native StringLit token carries `tok.cooked` =
the unquoted value — exactly what `imported`/`names[]` must hold.

### Cluster decomposition — ONE root cause.
A single missing token-recognition arm. Both quoted-with-alias and quoted-without-alias, in
all positions, are the SAME fault (StringLit not accepted as an import name). No N-sub-bug
split inside the cluster.

## The fix (compiler/native-parser/parse-stmt.js only — minimal, bounded)
`parseNamedImportSpecifiers`: accept `TokenKind.StringLit` in addition to `TokenKind.Ident`
as the imported-name token. When the token is a StringLit, the imported name is its UNQUOTED
cooked value (`importedTok.cooked`, "" guard); for an Ident it stays `importedTok.name`.
`local` defaults to the imported name (the cooked string for a bare quoted specifier — live
parity) and is overridden by an `as` alias (existing path, unchanged). NO node change
(makeImportNamed) and NO bridge change (translate-stmt.js makeImportDecl) — they already
thread `imported`/`local` verbatim. NOT codegen — codegen stays parser-agnostic; the bridged
AST byte-matches the live import-decl.

Subset-philosophy: parity-COMPLETENESS for a form live already accepts (SPEC-blessed
quoted-import); no JS-superset surface, no new semantics — a leaf token-kind admission.

## Mandatory gates (numbers, baseline in THIS worktree)

1. **Strict-pass EXACT — HOLDS at 964.** Baseline 964 → after 964. Histogram IDENTICAL:
   `{EXACT:964, LIVE-DEGENERATE:12, GAP-state-block:1, LIVE-PHANTOM:1, DEFERRAL-test-block:21,
   LIVE-HOIST-MISCLASSIFY:2}`. 1000/1001 strict-pass; 1019 pass / 0 fail
   (compiler/tests/parser-conformance-corpus.test.js, run directly — excluded from pre-commit).
   NOTE: the 12 trucking-dispatch import files sit in the `LIVE-DEGENERATE` class (live emits
   `W-PROGRAM-REDUNDANT-LOGIC` for a `${ }` directly inside `<page>`), so they were never EXACT
   and the fix does NOT move them across the EXACT boundary — but the EXACT count HOLDS (no
   correctness regression) which is the gate.

2. **Within-node canary GREEN + allowlist regen SAME COMMIT (targeted).** Before regen: 1
   fixture over budget (load-detail.scrml, FIELD-SHAPE +9 / SPAN-COORD +68). After targeted
   regen (only that fixture's entry rewritten to its new raw counts; all 1000 others
   byte-identical — verified via `git diff`, 6 lines): **1005 pass / 0 fail.**
   Aggregate raw total 95091 → 95143 (+52, non-monotonic — parsing MORE; expected). Per-class
   delta (the ONLY mover): KIND-NAME −2, FIELD-SHAPE +9, MISSING-FIELD −8, EXTRA-FIELD −8,
   COUNT-LENGTH −7, SPAN-COORD +68. **Content-classes NET −25 (structural-fidelity
   improvement); only FIELD-SHAPE (newly-parsed import subtrees) + cosmetic SPAN-COORD rise.**
   No content-class regression.

3. **Full `bun run test` (pre-commit hook): 14338 pass / 92 skip / 1 todo / 0 fail**
   (14431 tests / 739 files) on the FINAL commit. The hook passed on the fix commit and again
   on the same-commit allowlist amend. (This hook scope excludes browser + the
   conformance-corpus + within-node suites, which are run directly above.)

4. **New unit test — LOAD-BEARING.** compiler/tests/unit/m67-d6-string-import-parse.test.js:
   **20 pass / 0 fail (36 assertions)** WITH the fix. Against the PRE-FIX parser (git-stash of
   parse-stmt.js): **16 fail / 4 pass** — the 4 passing are the bare-identifier baseline tests
   (correctly never broken); the 16 failing are the string-literal-specifier zero-error +
   shape + parity + §17562-unquoted assertions. Fix restored byte-identical after the proof.

5. **Corpus NSBH impact (E-STMT-IMPORT-NAME).** Before: **12 first-error files / 15 total
   fires**, ALL in examples/23-trucking-dispatch (3 files have 2 channel imports). After:
   **0 first-error files / 0 fires.** Every trucking-dispatch channel import is cleared.

## Follow-on units surfaced (DISTINCT residuals, OUT OF D6 SCOPE — filed, not fixed)
Closing the import cascade UNMASKED separate downstream native gaps in the same 12 files (the
with-errors corpus count is unchanged at 296 — these files now fail LATER, on different forms,
not on the import). New first-error codes across the 12:
- **E-STMT-MISSING-SEMICOLON** (7 files: messages, dispatch/load-detail, load-new, board,
  customer/quote, loads, home) — statement-terminator detection in the page-body logic.
- **E-EXPR-PARAM** (3 files: driver/load-detail, customer/invoices, customer/load-detail) —
  a param-list form in an expression/fn position.
- **E-STMT-EXPECT-RPAREN** (2 files: driver/home, dispatch/billing).
These are genuinely separate parse paths (the import cluster is fully closed); they are future
M6.7 flip residuals. Re-measure the broader NSBH residual after each lands.

## STOP conditions
None hit. (a) firing variant is CURRENT scrml (SPEC §38.12.5/§12821/§17562) + live accepts —
not corpus-stale; (b) the cluster is ONE root cause — no dominant-vs-rest split needed;
(c) no bounded-JS-subset line crossed (SPEC-blessed quoted import, leaf token admission);
(d) the real locus IS parse (parse-stmt.js token recognition), not codegen.

## Files touched
- compiler/native-parser/parse-stmt.js — parseNamedImportSpecifiers accepts StringLit (cooked)
- compiler/tests/unit/m67-d6-string-import-parse.test.js — NEW, 20 tests (load-bearing)
- compiler/tests/parser-conformance-within-node-allowlist.json — regen, 1 fixture (same commit)
- docs/changes/m67-phase-a-flag-flip/d6-string-import.md (this doc) + progress-d6.md

## Tags
#m6-7-d6 #native-parser #parse-stmt #string-literal-import #import-specifier
#E-STMT-IMPORT-NAME #channel-import #kebab-name #within-node-canary #strict-pass-964
#parity-completeness #scrml-flip #phase-0-root-cause #trucking-dispatch #spec-38-12-5

## Links
- [parse-stmt.js](../../../compiler/native-parser/parse-stmt.js)
- [translate-stmt.js (makeImportDecl — unchanged)](../../../compiler/native-parser/translate-stmt.js)
- [ast-stmt.js (makeImportNamed — unchanged)](../../../compiler/native-parser/ast-stmt.js)
- [m67-d6 test](../../../compiler/tests/unit/m67-d6-string-import-parse.test.js)
- [within-node allowlist](../../../compiler/tests/parser-conformance-within-node-allowlist.json)
- [parser-conformance-corpus canary](../../../compiler/tests/parser-conformance-corpus.test.js)
- [parser-conformance-within-node canary](../../../compiler/tests/parser-conformance-within-node.test.js)
- [SPEC §38.12.5 / §17561-§17562](../../../compiler/SPEC.md)
- [d1-arrow-callarg.md (prior unit)](./d1-arrow-callarg.md)
- [d2-server-function.md (prior unit)](./d2-server-function.md)
- [primary.map.md](../../../.claude/maps/primary.map.md)
