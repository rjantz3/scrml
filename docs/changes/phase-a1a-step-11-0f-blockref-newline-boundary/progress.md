# Phase A1a Step 11.0f — `<x> = ?{SQL}\n<y>` BLOCK_REF newline-as-separator boundary fix — Progress

Branch: `phase-a1a-step-11-0f-blockref-newline-boundary`
Parent baseline HEAD: `713c843` (S61-extension-2 doc bundle wrap commit).
Test baseline: 8,886 pass / 44 skip / 0 fail / 8,930 across 439 files (verified 2026-05-05).

**Tier:** T2 — single-subsystem, parser-internal extension to Step 11.0b's
`collectExpr` ASI-NEWLINE branch. Mirrors Step 11.0e's pattern (1-LOC value-classifier
extension). Sample restoration + tests ride alongside.

## Survey

[step-11-0f startup] Worktree clean (`pwd` /
`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a2fda5fa64c5a861b`),
parent HEAD `713c843` matches BRIEF expectation. `bun install` → 113 packages.
`bun run pretest` → 12 samples compiled. `bun run test` first run flake (2
ECONNREFUSED), retry → **8,886 pass / 44 skip / 0 fail / 8,930 across 439
files** — matches BRIEF baseline. Branch
`phase-a1a-step-11-0f-blockref-newline-boundary` created.

[step-11-0f survey-locus-Q1] Locus per Step 11.0e progress.md confirmed.
File: `compiler/src/ast-builder.js`. The `collectExpr` ASI-NEWLINE branch
at L1959-2030. The `lastEndsValue` predicate at L1980-1987:
```
const VALUE_KEYWORDS = new Set(["true", "false", "null", "undefined", "this", "not"]);
const lastEndsValue = (
  lastKind === "IDENT" ||
  lastKind === "NUMBER" ||
  lastKind === "STRING" ||
  lastKind === "AT_IDENT" ||
  (lastKind === "KEYWORD" && VALUE_KEYWORDS.has(lastText)) ||
  (lastKind === "PUNCT" && (lastText === ")" || lastText === "]" || lastText === "}"))
);
```
**`BLOCK_REF` is NOT in any disjunct.** So when RHS ends in `?{SQL}`,
`lastKind === "BLOCK_REF"` → `lastEndsValue=false` → ASI-NEWLINE branch
doesn't fire → Step 11.0b's universal `<` IDENT lookahead at L2020-2030
also doesn't fire (it gates on `lastEndsValue`) → sibling `<y>` greedily
consumed into init.

[step-11-0f survey-Q2-block_ref-token-mechanics] BLOCK_REF tokens are
constructed at `compiler/src/tokenizer.ts` L796 with `tok.text = child.raw`
(the raw block content, e.g. ``?{`SELECT 1`}``). They represent embedded
child blocks (logic/sql/css/error-effect/meta children — per L20 spec).
A BLOCK_REF IS a value-producing terminal — semantically it's the
in-place result of the embedded child block. SPEC §6 establishes
`?{SQL}` as a SQL passthrough block expression — fully a value.

[step-11-0f survey-Q3-collectExpr-handling] Pre-fix trace for `<x> = ?{SQL}\n<y> = 0`:
- RHS collection enters via `tryParseStructuralDecl` after `=`.
- L1808 first iter: `tok=BLOCK_REF`, `parts.length=0`, L1817 doesn't fire
  (guard requires `parts.length > 0`). BLOCK_REF is consumed at L2164.
  After: `lastTok.kind="BLOCK_REF"`, `lastTok.text="?{...}"`,
  `parts=["?{...}"]`.
- L1808 next iter: `tok=PUNCT "<"`, on next line. depth=0, angleDepth=0,
  parts.length=1, line increased.
- L1959 ASI-NEWLINE branch entered. `lastKind="BLOCK_REF"`. The
  `lastEndsValue` disjuncts don't include BLOCK_REF → `false`.
- L1993 fast break gated on `lastEndsValue` → skipped.
- L2020 Step 11.0b `<` IDENT lookahead also gated on `lastEndsValue` → skipped.
- L1934 `IDENT =` boundary doesn't fire (tok.kind=PUNCT, not IDENT).
- Falls through to L2164 → `<` is consumed into parts.
- Cascading: `< y > = 0` all consumed into init string.
- Result: 1 state-decl with mangled init. Sibling lost.

[step-11-0f survey-Q4-probe-confirmation] Probe `_probe_step11_0f.mjs`
exercises 8 scenarios. Confirmed:

| Probe | Source pattern | Pre-fix result |
|---|---|---|
| T1 | `<x> = ?{SQL}\n<y> = 0` | **BROKEN** — 1 decl; init=`"?{SQL}\\n< y > = 0"` |
| T2 | `<x> = ?{SQL}\n@y = 0` | OK — 2 decls (BUG-R14 `AT_IDENT =` boundary doesn't gate on lastEndsValue) |
| T3 | `@x = ?{SQL}\n@y = 0` | OK — 2 decls (legacy path differs; `@x = …` parses via legacy `@`-form) |
| T4 | 3 V5-strict siblings, all `?{SQL}` | **BROKEN** — 1 decl (cascading) |
| T5 | `<x> = ?{SQL}\nconst <y>` | OK — 2 decls (`const` is STMT_KEYWORD; L1902 breaks) |
| T6 | `<x> = ?{SQL}\n<y>: T = init` | **BROKEN** — 1 decl (typed-decl Shape 2 sibling lost) |
| T7 | `<x> = ?{SQL}\n<formRes>\n…</>` | **BROKEN** — 1 decl (Variant C compound sibling lost) |
| T9 | `<x> = ?{SQL}; <y> = 0` | OK — 2 decls (semicolon explicit boundary) |

**Locus isolated to a SINGLE LINE: `lastEndsValue` predicate at L1980-1987
(specifically the disjunct list).**

[step-11-0f survey-coverage-Q5] Per BRIEF §3.4, probed other expression-shape
forms in `_probe_step11_0f_coverage.mjs`:

| Probe | Pattern | Result | Why |
|---|---|---|---|
| C1 | `<x> = `hello`\n<y>` | OK — 2 decls | template literal tokenizes as STRING |
| C2 | `<x> = obj.prop\n<y>` | OK — 2 decls | `prop` IDENT covered |
| C3 | `<x> = fn()\n<y>` | OK — 2 decls | `)` PUNCT covered |
| C4 | `<x> = arr[0]\n<y>` | OK — 2 decls | `]` PUNCT covered |
| C5 | `<x> = {a:1}\n<y>` | OK — 2 decls | `}` PUNCT covered |
| G1 | `<x> = <input value=?{...}/>\n<y>` | OK — 2 decls | markup-RHS via parseLiftTag, BLOCK_REF inside attr is consumed there |
| G3 | lift expr with BLOCK_REF interpolation | OK — 1 decl (no siblings) | uses collectLiftExpr (L2247) — different path |

**No P-FUP-4 surfaced.** Coverage is complete after BLOCK_REF is added.
The `lastEndsValue` disjunct list will then exhaustively cover ALL
value-producing trailing token kinds at this locus.

[step-11-0f survey-design-decision] **Approach: extend `lastEndsValue`
to recognize `BLOCK_REF`.** This is a 1-LOC semantic correction with
universal applicability:
- BLOCK_REF semantically IS a value-producing terminal (the in-place
  result of an embedded child block — sql, error-effect, meta, etc.).
  SPEC §6 establishes `?{SQL}` as a SQL passthrough block expression.
- The fix is symmetric with the existing `PUNCT")", PUNCT"]", PUNCT"}"`
  disjunct (closing-bracket terminals): BLOCK_REF, like a closing
  bracket, terminates an expression with a value.
- No `BLOCK_REF`-specific branch — just adding a new disjunct to the
  existing list. Mirrors Step 11.0e's pattern (1-character extension to
  a value-classifier list).

The fix slots into Step 11.0b's universal-fix infrastructure WITHOUT
introducing a BLOCK_REF-specific branch — it just teaches `lastEndsValue`
that BLOCK_REF is a value (which it semantically is).
**Universality preserved.**

[step-11-0f survey-Q6-no-regression-guards] Guards verified by survey:
1. **L1817 BLOCK_REF break guard at depth 0:** when a NEW BLOCK_REF
   follows existing parts at depth 0 outside markup, the `tok.kind ===
   "BLOCK_REF" && parts.length > 0 && tagNesting==0` check breaks
   BEFORE entering the ASI-NEWLINE branch. So `?{A} ?{B}` (two
   adjacent BLOCK_REFs) does NOT depend on the new disjunct — it
   breaks earlier via L1817. Adding BLOCK_REF to lastEndsValue does
   not change L1817 semantics.
2. **L1817 exception when `tagNesting > 0`:** BLOCK_REFs inside markup
   tags (e.g. `<input value=?{...}/>`) are consumed by parseLiftTag
   not collectExpr. Verified by G1 probe.
3. **collectLiftExpr (L2247) is a separate function** with its own
   boundary logic. Not affected by changes to collectExpr.

[step-11-0f survey-Q7-self-host-parity] Per Step 4-7 policy: deferred.
No codegen change. AST shape unchanged (state-decl `init` field still
strings; downstream stages handle the AST node uniformly whether init
contains a BLOCK_REF placeholder or not — that's already handled).

[step-11-0f survey-discount-9-status] **NOT discount #9.** Survey
confirms genuine source change required (1-line addition to the
`lastEndsValue` disjunct list). However, the source change is minimal:
adding `lastKind === "BLOCK_REF"` to the disjunct chain at L1980-1987.
Tests + sample restoration carry the lift.

## Plan

1. Edit `compiler/src/ast-builder.js` L1980-1987: add `lastKind === "BLOCK_REF"`
   disjunct to `lastEndsValue` predicate.
2. Re-run probe → confirm T1, T4, T6, T7 fixed; T2, T3, T5, T9 unchanged.
3. Run full `bun run test` → 0 regressions expected.
4. Restore `samples/compilation-tests/combined-007-crud.scrml` to V5-strict canon.
5. Verify decl-count parity vs legacy form.
6. Add §S11F test block to `parse-shapes-v0next.test.js` (~7 cases per
   BRIEF §4.2 including legacy regression test §S11F.7).
7. Final commit.

## Implementation log

[step-11-0f path-discipline-near-miss] **Path discipline violation
caught + corrected before any commit landed.** First edit attempt
modified `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/ast-builder.js`
(MAIN repo path) instead of
`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a2fda5fa64c5a861b/compiler/src/ast-builder.js`
(WORKTREE path). Probe runs against the worktree (because cwd is the
worktree and bun resolves imports via cwd-relative paths), so the fix
appeared not to fire. Diagnosed by `find ... ast-builder*` showing two
distinct files with different mtimes. Reverted main repo's
`compiler/src/ast-builder.js` via `git checkout -- compiler/src/ast-builder.js`
in the main worktree. Re-applied the SAME edit (now clean — no debug
prints) to the worktree's `compiler/src/ast-builder.js`. This is the
exact pitfall flagged in the BRIEF startup-verification protocol:
"NEVER use absolute paths starting with the main repo root directly.
ALWAYS use ABSOLUTE paths under WORKTREE_ROOT." Surfaced explicitly
here for future agents.

[step-11-0f impl-patch] Edited
`compiler/src/ast-builder.js` L1980-1988: added `lastKind === "BLOCK_REF" ||`
disjunct to `lastEndsValue` predicate inside `collectExpr`'s ASI-NEWLINE
branch. 1-character semantic correction with universal applicability.
21 LOC of explanation comments + 1 LOC change to the disjunct chain.

Probe re-run confirms:

| Probe | Pre-fix | Post-fix | Status |
|---|---|---|---|
| T1 (V5-strict + sibling) | 1 decl | 2 decls ✓ | **Fixed** |
| T2 (V5-strict + legacy mix) | 2 ✓ | 2 ✓ | Unchanged (regression preserved) |
| T3 (legacy regression `@x = ?{}`) | 2 ✓ | 2 ✓ | **Preserved** |
| T4 (3 V5-strict siblings) | 1 decl | 3 decls ✓ | **Fixed** (cascading restored) |
| T5 (V5-strict + const derived) | 2 ✓ | 2 ✓ | Unchanged (`const` STMT_KEYWORD breaks earlier) |
| T6 (V5-strict + typed-decl) | 1 decl | 2 decls ✓ | **Fixed** (Step 11.0c interaction) |
| T7 (V5-strict + Variant C compound) | 1 decl | 3 decls ✓ | **Fixed** (Step 11.0a interaction) |
| T9 (semicolon explicit) | 2 ✓ | 2 ✓ | Unchanged |

Coverage probe re-run (C1-C5, G1, G3) — all unchanged, all still
correct. No regression in template literal / member access / call /
index / object literal / markup-attr-RHS / lift-expr paths.

Full test (after patch alone): **8,886 pass / 44 skip / 0 fail / 8,930
across 439 files** — identical to baseline. **0 regressions.**

[step-11-0f impl-sample-restoration] Restored
`samples/compilation-tests/combined-007-crud.scrml` to V5-strict canon
via `git checkout d93690d -- samples/compilation-tests/combined-007-crud.scrml`.

The restored file uses BOTH Step 11.0e-fixed `<x> = not` patterns AND
the Step 11.0f-fixed `<x> = ?{SQL}\n<y> = ...` patterns:
```
<users> = ?{`SELECT id, name, email FROM users`}
<editingId> = not
<newName> = ""
<newEmail> = ""
```

Decl-count parity (vs reverted-legacy form at HEAD~1):

| Form | state-decl count | function-decl count | errors |
|---|---|---|---|
| Legacy `@`-form (HEAD before restoration) | 7 | 3 | 1 (W-PROGRAM-001 only) |
| V5-strict (post-restoration) | 7 | 3 | 1 (W-PROGRAM-001 only) |

**PARITY OK** (Step 11.0e diagnosed pre-fix V5-strict form gave only 1
state-decl due to BLOCK_REF eating siblings — 6 sibs lost. Now post-
11.0f, full 7 V5-strict decls restored).

`bun run pretest` confirms 12 test samples (including
combined-007-crud) compile cleanly post-restoration. No new errors.

[step-11-0f impl-tests] Added 7 cases in
`compiler/tests/integration/parse-shapes-v0next.test.js` in a new
§S11F describe block (§S11F.1-§S11F.7):

- §S11F.1 — `<x> = ?{SQL}\n<y> = 0` (V5-strict structural, two siblings)
- §S11F.2 — `<x> = ?{SQL}\n@y = 0` (V5-strict + legacy mix)
- §S11F.3 — `<x> = ?{SQL}\nconst <y>` (BLOCK_REF + derived sibling)
- §S11F.4 — `<x> = ?{SQL}\n<y>: T = init` (BLOCK_REF + typed-decl, Step 11.0c)
- §S11F.5 — `<x> = ?{SQL}\n<formRes>...</>` (BLOCK_REF + Variant C compound, Step 11.0a)
- §S11F.6 — anti-html-fragment guard (cascade prevention)
- §S11F.7 — REGRESSION: legacy `@x = ?{SQL}\n@y = 0` STILL parses

Every positive case fires `assertNoHtmlFragmentMatching` per BRIEF
§5 DoD pattern.

[step-11-0f impl-test-final] `bun run test` after all changes:
**8,893 pass / 44 skip / 0 fail / 8,937 across 439 files**.
Delta from baseline 8,886 → 8,893 = **+7 pass** (the 7 §S11F cases).
**0 regressions. 0 fails. 44 skip stable.**

## Final summary

**Files modified:**
- `compiler/src/ast-builder.js` — 1-line `lastEndsValue` extension
  (`lastKind === "BLOCK_REF" ||` at L1985) + 21 LOC of explanation
  comments.
- `compiler/tests/integration/parse-shapes-v0next.test.js` — 7 new
  positive + regression cases (§S11F.1-§S11F.7) in a new §S11F
  describe block. 194 LOC added.
- `samples/compilation-tests/combined-007-crud.scrml` — restored to
  V5-strict canon (V5-strict decl form for `<x> = ?{SQL}` patterns).

**Tier classification:** T2 (single-subsystem, parser-internal,
1-character correction to Step 11.0b's universal-fix infrastructure;
sample restoration + test additions ride alongside).

**Survey verdict — depth-of-survey discount status:** **NOT a
discount.** Fix is genuine source change (1-char addition to a
disjunct list), but survey confirmed Step 11.0e's diagnosis precisely:
no other expression-shape gap surfaced (template literals, member
access, call, index, object literals, markup-attr-RHS, lift-expr all
already work). **No P-FUP-4 surfaced** — coverage of value-producing
trailing tokens at this locus is now exhaustive.

**Step 11.0b/11.0e interaction:** `BLOCK_REF` as `lastEndsValue`
member preserves Step 11.0b's universal-fix property. By adding
`BLOCK_REF` to the disjunct list, we correctly classify BLOCK_REF as
a value-producing trailing token — which it semantically is per
SPEC §6 (and the symmetry with closing-bracket terminals `)`, `]`,
`}` already in the list). Step 11.0b's `<` IDENT lookahead
(L2020-2030) and ASI break (L1993) now also fire correctly because
`lastEndsValue=true`.

**Universality:** preserved. No `BLOCK_REF`-specific branch added.
Mirrors Step 11.0e's pattern.

**P-FUP-3 closure:** combined-007-crud now compiles in full V5-strict
canon. Step 11.0e's status table for combined-007-crud (7 legacy / 1
V5-strict / STILL BROKEN) becomes (7 legacy / 7 V5-strict / **PARITY
OK**) post-Step-11.0f.

**Self-host parity:** N/A — no codegen change. The state-decl AST
shape is unchanged (init still strings, all existing fields preserved).

**Path-discipline near-misses:** **TWO** — both caught + corrected
before any commit landed.

1. First Edit attempt on `compiler/src/ast-builder.js` modified the
   MAIN repo path (`/home/bryan-maclee/scrmlMaster/scrmlTS/...`) instead
   of the worktree path. Diagnosed by debug-print that never fired,
   then by `find ... ast-builder*` showing two distinct files with
   different mtimes/sizes. Reverted main repo via `git -C ... checkout`
   and re-applied to worktree.
2. Same issue with `compiler/tests/integration/parse-shapes-v0next.test.js`
   — Edit went to main repo path, file size/test count check caught it
   before commit. Reverted + re-applied to worktree.

Both surface the **path-discipline pitfall** flagged in the BRIEF
startup-verification protocol. Future agents working in worktrees
must explicitly use the absolute worktree-prefixed path for ALL
Edit operations — not just `compiler/src/...`. This is documented in
the brief but easy to miss when the apparent absolute path looks
correct.

The probe files (`_probe_step11_0f*.mjs` in worktree root) remained
untracked + uncommitted; they are scratch debug aids and were used
only to reproduce + verify the fix.

## Branch + commit hygiene

WIP commits on `phase-a1a-step-11-0f-blockref-newline-boundary`:
- `f672d58` — WIP: survey notes — locus = lastEndsValue missing BLOCK_REF
- `207366f` — WIP: blockref boundary patch — BLOCK_REF is value-producing
- (next) — final: compile(a1a-step-11-0f): `<x> = ?{SQL}` BLOCK_REF
  newline-as-separator boundary fix (sample restoration + §S11F tests)

## Tags

#phase-a1a #step-11-0f #p-fup-3 #blockref #newline-as-separator
#step-11-0b-extension #step-11-0e-extension #v5-strict #parser-only
#t2 #not-discount-9 #sample-restoration #combined-007-crud
#path-discipline-near-miss

## Links

- Brief: `docs/changes/phase-a1a-step-11-0f-blockref-newline-boundary/BRIEF.md`
- Step 11.0e predecessor: `docs/changes/phase-a1a-step-11-0e-not-newline-boundary/progress.md`
- Step 11.0b predecessor: `docs/changes/phase-a1a-step-11-0b-newline-separator/progress.md`
- Step 12 surfacing: `docs/changes/phase-a1a-step-12-existing-test-deltas/progress.md`
- SPEC §6 (`?{SQL}` passthrough): `compiler/SPEC.md`
- Touchpoint — boundary patch: `compiler/src/ast-builder.js` L1980-2008
- Tests added: `compiler/tests/integration/parse-shapes-v0next.test.js`
  §S11F.1-§S11F.7
