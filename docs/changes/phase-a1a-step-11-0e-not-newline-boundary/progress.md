# Phase A1a Step 11.0e — `<x> = not\n<y>` newline-as-separator boundary fix — Progress

Branch: `phase-a1a-step-11-0e-not-newline-boundary`
Parent baseline HEAD: `ff3bd72` (S61-extension doc bundle wrap commit)
Test baseline: 8,878 pass / 44 skip / 0 fail / 8,922 across 439 files (verified 2026-05-05).

**Tier:** T2 — single-subsystem, parser-internal extension to Step 11.0b's `collectExpr`
ASI-NEWLINE branch. Aligns with 11.0b precedent.

## Survey

[step-11-0e startup] Worktree clean (`pwd` / git toplevel match
`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a19529c52d0f4fccc`),
parent HEAD `ff3bd72`. `bun install` → 113 packages. `bun run pretest` → 12 samples
compiled. `bun run test` first run flake → retry: **8,878 pass / 44 skip / 0 fail /
8,922 across 439 files** — matches BRIEF baseline. Branch
`phase-a1a-step-11-0e-not-newline-boundary` created.

[step-11-0e survey-locus-Q1] Where is `not` consumed?
- `compiler/src/ast-builder.js` L1870, L4548, L4653 — match-arm forms
  (`not =>`, `not => {`). Not relevant to P-FUP-2 (different context: arms
  inside `match { }`, terminated by `}`).
- `compiler/src/ast-builder.js` L2140 — E-EQ-002 recovery (`== not` →
  `is not`). Not relevant.
- `compiler/src/tokenizer.ts` L82 — `not` is in the `KEYWORDS` set and
  tokenizes as `KEYWORD` kind.
- **NO dedicated `<x> = not` decl path.** RHS `not` is consumed as a normal
  KEYWORD token by the inner `consume()` at L2155 in `collectExpr` and
  pushed as `parts.push(lastTok.text)` at L2170. So when `not` appears
  as the entire RHS of `<x> = not`, `lastTok.kind = "KEYWORD"`,
  `lastTok.text = "not"`.

[step-11-0e survey-step-11-0b-mechanism-Q2] Step 11.0b's ASI-NEWLINE branch
(L1959-2021) gates on `lastEndsValue` (L1971-1978):
```
const VALUE_KEYWORDS = new Set(["true", "false", "null", "undefined", "this"]);
const lastEndsValue = (
  lastKind === "IDENT" || lastKind === "NUMBER" || lastKind === "STRING" ||
  lastKind === "AT_IDENT" ||
  (lastKind === "KEYWORD" && VALUE_KEYWORDS.has(lastText)) ||
  (lastKind === "PUNCT" && (lastText === ")" || lastText === "]" || lastText === "}"))
);
```
**`not` is NOT in `VALUE_KEYWORDS`.** So when RHS is just `not`,
`lastEndsValue=false` → ASI-NEWLINE branch never fires → `<y>` opener on
the next line is greedily consumed into the init string.

[step-11-0e survey-probe-Q3+Q4] Probe `_probe_step11_0e.mjs` exercises 7
scenarios. Confirmed:

| Probe | Source pattern | Pre-fix result |
|---|---|---|
| T1 | `<x> = not\n<y> = 0` | **BROKEN** — 1 decl; init=`"not\n< y > = 0"` (sibling consumed) |
| T2 | `@x = not\n@y = 0` | OK — 2 decls (legacy `@`-form path differs) |
| T3 | `<x> = not\n@y = 0` | OK — 2 decls (next-line is `@y` legacy form, hits a different boundary) |
| T4 | 3 V5-strict siblings, first 2 = `not` | **BROKEN** — 1 decl (cascading) |
| T5 | `<x> = not\n<div>...` | **BROKEN** — markup line consumed |
| T6 | `<x> = not; <y> = 0` | OK — semicolon explicit boundary |
| T7 | `<x> = pinned\n<y>` | **OK** — `pinned` tokenizes as IDENT, not KEYWORD |

T7 is the critical contrast: `pinned` is NOT in the tokenizer's KEYWORDS
list (`compiler/src/tokenizer.ts` L55-89), so it tokenizes as IDENT →
`lastEndsValue=true` (lastKind === "IDENT") → Step 11.0b's boundary fires.
`not` is in KEYWORDS → tokenizes as KEYWORD → `VALUE_KEYWORDS` doesn't
include it → `lastEndsValue=false` → boundary doesn't fire.

This isolates the locus to a SINGLE LINE: `VALUE_KEYWORDS` set at L1970.

[step-11-0e survey-design-decision] **Approach: extend `VALUE_KEYWORDS`
to include `"not"`.**

This is a 1-character semantic correction with universal applicability:
- `not` per SPEC §42.1 IS "both a value and a type." It is the absence
  primitive — value-producing.
- SPEC §42.2.1 shows `${ let x = not }` and `${ @name = not }` as
  canonical absence assignments — `not` is a legitimate trailing
  value in the RHS position.
- E-TYPE-045 (SPEC §42.6) explicitly forbids `not` as a prefix
  operator — it is always value-producing, never an opener.
- `is not` operator: when `is not` ends a sub-expression, the trailing
  `not` IS the last token. With this fix, ASI fires correctly on
  `<x> = a is not\n<y>`. (No regression — `not` ending an `is not`
  expression IS value-producing.)

The fix slots into Step 11.0b's universal-fix infrastructure WITHOUT
introducing a `not`-specific branch — it just teaches `lastEndsValue`
that `not` is a value (which the language SPEC says it is).
**Universality preserved.**

[step-11-0e survey-other-modifier-keywords] Per BRIEF §6 risk surface:
checked `pinned` (T7) — works because it's not a keyword. Other
M11-family modifiers are also not in tokenizer KEYWORDS (`req` is also
non-keyword), so they tokenize as IDENT and don't have this issue.
**`not` is unique in this class of bug** because it is the only
M11-related construct that BOTH (a) is a tokenizer KEYWORD and (b) can
appear as a complete RHS value.

Other tokenizer KEYWORDS that COULD appear as a complete RHS:
- `true`, `false`, `null`, `undefined`, `this` — already in VALUE_KEYWORDS.
- Other reserved keywords (`fail`, `transaction`, `new`, etc.) — these
  are statement openers / operators, never standalone-value-producing
  in trailing position.

Confirmed: extending VALUE_KEYWORDS with `"not"` is sufficient.

[step-11-0e survey-discount-9-status] **NOT discount #9.** Survey
confirms genuine source change required (1-line addition to the
VALUE_KEYWORDS set). However, the source change is minimal: adding
`"not"` to a Set literal at L1970. Tests + sample restorations carry
the lift.

[step-11-0e survey-self-host-parity] Per Step 4-7 policy: deferred.
No codegen change. AST shape unchanged (state-decl init field still
strings; downstream stages handle the AST node uniformly whether init
is `"not"`, `"5"`, or any other expression).

## Plan

1. Edit `compiler/src/ast-builder.js` L1970: add `"not"` to VALUE_KEYWORDS.
2. Re-run probe → confirm T1, T4, T5 fixed; T2, T3, T6, T7 unchanged.
3. Run full `bun run test` → 0 regressions expected.
4. Restore the 5 reverted Step 12 samples to V5-strict canon (per BRIEF §4.1).
5. Run `scripts/step12-validate-batch.mjs HEAD~5 HEAD` (or equivalent
   probe) on each restored sample to verify decl-count parity.
6. Add §S11E test block to `parse-shapes-v0next.test.js` (~7 cases per
   BRIEF §4.2 including legacy regression test §S11E.7).
7. Final commit + push.

## Implementation log

[step-11-0e impl-patch] Edited `compiler/src/ast-builder.js` L1970:
added `"not"` to `VALUE_KEYWORDS` set inside `collectExpr`'s
ASI-NEWLINE branch. 1-character semantic correction with universal
applicability (no `not`-specific branch). 10 LOC of explanation
comments + 1 LOC change to the Set literal. Commit `b7bc160`.

Probe re-run confirms:
- T1 (`<x> = not\n<y> = 0`): was 1 decl → now 2 decls ✓
- T4 (3 sibs all `<x> = not`): was 1 → now 3 ✓
- T9 (`is not` operator's trailing `not`): 3 decls (universality) ✓
- T10 (Variant C compound child = `not`): 3 decls ✓
- T11 (`let x = not\n<y> = 0`): 1 state-decl + 1 let-decl ✓
- T2/T3/T6/T7 (legacy / mix / semicolon / pinned): unchanged ✓
- T5b (`<x> = not\n<div>...`): still 1 decl (PRE-EXISTING 11.0b
  limitation; lookahead matches state-decl shape only — markup
  doesn't match. NOT introduced by 11.0e.)

Full test: 8,878 pass / 44 skip / 0 fail (identical to baseline).

[step-11-0e impl-sample-restoration] Restored 4 of 5 reverted Step 12
samples to V5-strict canon via `git checkout d93690d -- <file>`:
- `gauntlet-r10-go-contacts.scrml`
- `gauntlet-r10-odin-filebrowser.scrml`
- `gauntlet-r10-rails-blog.scrml`
- `integration-001-stripe-mini.scrml`

Decl-count parity (vs reverted-legacy form at e8bad5b):

| File | Legacy decl count | V5-strict (post-11.0e) | Status |
|---|---|---|---|
| gauntlet-r10-go-contacts | 56 | 56 | PARITY OK |
| gauntlet-r10-odin-filebrowser | 38 | 38 | PARITY OK |
| gauntlet-r10-rails-blog | 52 | 52 | PARITY OK |
| integration-001-stripe-mini | 13 | 13 | PARITY OK |
| **combined-007-crud** | **7** | **1** | **STILL BROKEN — left in legacy form** |

[step-11-0e impl-finding-P-FUP-3] **NEW FINDING surfaced per BRIEF §6
risk surface:** `combined-007-crud.scrml` is BLOCKED by a SEPARATE
parser bug (P-FUP-3 candidate). The file uses `<users> = ?{SQL}\n<sib>`
pattern — when a `BLOCK_REF` token (e.g., a SQL `?{...}` block) is the
last consumed token of an RHS, `lastEndsValue` (Step 11.0b
`collectExpr` ASI-NEWLINE branch) does NOT recognise BLOCK_REF as
value-producing. So `<users> = ?{SQL}\n<sib>` cascades — sibling decl
swallowed into init. Probe T12 + T13 confirm.

This is a **wider class of bug** of the same shape as P-FUP-2: a
trailing token kind that produces a value (BLOCK_REF here, KEYWORD
"not" was the original) but isn't recognised by `lastEndsValue`'s
classifier. The fix would be similar — extending `lastEndsValue` to
include `BLOCK_REF` (with appropriate `tagNesting` / depth guards).

**Decision:** scope-limit P-FUP-3 to a separate Step. Step 11.0e's
mission is the `<x> = not\n<y>` boundary (P-FUP-2). Restoring
combined-007-crud requires P-FUP-3 first. Reverted my V5-strict
restoration of combined-007-crud back to legacy form (HEAD).
Surfaced explicitly in this progress.md and in final report.

[step-11-0e impl-tests] Added 8 cases in `parse-shapes-v0next.test.js`
in a new `A1a Step 11.0e` describe block (§S11E.1-§S11E.8):

- §S11E.1 — `<x> = not\n<y> = 0` (V5-strict structural, two siblings)
- §S11E.2 — `<x> = not\n@y = 0` (V5-strict + legacy mix)
- §S11E.3 — three V5-strict siblings, first 2 = `not` (cascade)
- §S11E.4 — plain + derived sibling mixed: `<x> = not\nconst <y> = …`
- §S11E.5 — Variant C compound child = `not`
- §S11E.6 — `is not` operator's trailing `not` triggers ASI
- §S11E.7 — REGRESSION: legacy `@x = not\n@y = 0` still parses
- §S11E.8 — `let x = not\n<y>` (broader ASI-fix benefit)

Every positive case fires `assertNoHtmlFragmentMatching` per BRIEF
§5 DoD pattern.

[step-11-0e impl-test-final] `bun run test` after all changes:
**8,886 pass / 44 skip / 0 fail / 8,930 across 439 files**. Delta
from baseline 8,878 → 8,886 = **+8 pass** (the 8 §S11E cases). 0
regressions. 0 fails. 44 skip stable.

## Final summary

**Files modified:**
- `compiler/src/ast-builder.js` — 1-line VALUE_KEYWORDS extension +
  10 LOC of explanation comment.
- `compiler/tests/integration/parse-shapes-v0next.test.js` — 8 new
  positive + regression cases (§S11E.1-§S11E.8) in a new §S11E
  describe block.
- `samples/compilation-tests/gauntlet-r10-go-contacts.scrml`
- `samples/compilation-tests/gauntlet-r10-odin-filebrowser.scrml`
- `samples/compilation-tests/gauntlet-r10-rails-blog.scrml`
- `samples/compilation-tests/integration-001-stripe-mini.scrml`
  — restored to V5-strict canon (V5-strict decl form for `<x> = not`
  patterns).

**Files NOT modified (intentional):**
- `samples/compilation-tests/combined-007-crud.scrml` — left in legacy
  `@`-form due to NEW finding P-FUP-3 (BLOCK_REF lastEndsValue gap).

**Tier classification:** T2 (single-subsystem, parser-internal,
1-character correction to Step 11.0b's universal-fix infrastructure;
sample restorations + test additions ride alongside).

**Survey verdict — depth-of-survey discount status:** **NOT a
discount.** Fix is genuine source change (1 character to a Set
literal), but survey + probe was disproportionately useful — it
located the locus precisely (L1970), confirmed the universal-fix
property holds, and surfaced P-FUP-3 (BLOCK_REF lastEndsValue gap)
as a wider class of the same bug shape.

**Step 11.0b interaction:** `not` as VALUE_KEYWORDS member preserves
Step 11.0b's universal-fix property. Step 11.0b's ASI-NEWLINE branch
fires for ALL ASI gaps where `lastEndsValue && tokStartsStmt`. By
adding `"not"` to VALUE_KEYWORDS, we correctly classify `not` as a
value-producing trailing token — which it is per SPEC §42.1. The
Step 11.0b `<` IDENT + `scanStructuralDeclLookahead()` extension
(below the IDENT/KEYWORD-not-STMT branch at L1985-2021) now also
fires correctly because `lastEndsValue=true`.

**Universality:** preserved. No `not`-specific branch added.

**P-FUP-3 follow-up surfaced (NEW):** `<x> = ?{SQL}\n<sib>` (and any
trailing BLOCK_REF) doesn't trigger Step 11.0b's boundary because
`lastEndsValue` doesn't recognise BLOCK_REF as value-producing.
Affects combined-007-crud at minimum; likely broader. Suggested fix:
extend `lastEndsValue` to recognise BLOCK_REF tokens (with
`tagNesting === 0` + `depth === 0` guards). Out-of-scope for Step
11.0e per BRIEF §1 narrow scope. Suggested as Step 11.0f or
follow-on work.

**Self-host parity:** N/A — no codegen change. The state-decl AST
shape is unchanged (init still strings, all existing fields
preserved).

**Path-discipline near-misses:** None. All Reads/Writes/Edits used
absolute paths under
`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a19529c52d0f4fccc/...`.
Two `_probe_*.mjs` files were created in worktree root for AST
shape verification + decl-count parity verification, then deleted
before commits included them.

## Branch + commit hygiene

WIP commits on `phase-a1a-step-11-0e-not-newline-boundary`:
- `fae3c25` — WIP: survey notes — locus = VALUE_KEYWORDS missing "not"
- `b7bc160` — WIP: newline-boundary patch — `not` is value-producing
- (next) — WIP: sample restorations (4 of 5) + §S11E tests (8 cases)
- (next) — final: compile(a1a-step-11-0e): `<x> = not` newline-as-
  separator boundary fix

## Tags

#phase-a1a #step-11-0e #p-fup-2 #not-keyword #newline-as-separator
#step-11-0b-extension #v5-strict #parser-only #t2 #not-discount-9
#sample-restorations #step-12-followup #p-fup-3-surfaced

## Links

- Brief: `docs/changes/phase-a1a-step-11-0e-not-newline-boundary/BRIEF.md`
- Step 11.0b predecessor: `docs/changes/phase-a1a-step-11-0b-newline-separator/progress.md`
- Step 12 surfacing: `docs/changes/phase-a1a-step-12-existing-test-deltas/progress.md`
- SPEC §42 (`not` semantics): `compiler/SPEC.md` lines 16928+
- Touchpoint — boundary patch: `compiler/src/ast-builder.js` L1970
- Tests added: `compiler/tests/integration/parse-shapes-v0next.test.js`
  §S11E.1-§S11E.8
