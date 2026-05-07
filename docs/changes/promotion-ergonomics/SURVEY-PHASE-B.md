---
title: Promotion ergonomics — Phase 0 (Tier B) survey-phase-b
date: 2026-05-06
session: S66
phase: 0 (Tier B re-survey)
parent: SCOPE.md, SURVEY-NOTE.md
verdict: STOP — material scope corrections; PA/Bryan must re-scope before Tier B implementation
---

# Tier B survey-phase-b — findings

Per the Tier B dispatch brief's mandate (and primer §12 depth-of-survey discipline), this
sub-phase walked every named Tier B touchpoint at the actual code at `HEAD = 7334fb0` and
re-validated the SCOPE/SURVEY-NOTE assumptions. The original SURVEY-NOTE landed S65
together with Tier A docs; this document re-checks against the post-Tier-A code state.

**Verdict: STOP and re-scope.** Three findings are material — one of them is a
source-language gap that the SCOPE assumes is already shipped but is not.

---

## §1 Finding A — `@cell == .Variant` IS NOT A PARSEABLE EXPRESSION TODAY (BLOCKER)

### What the SCOPE/SPEC assume

SPEC §56.2 #2 (the I-MATCH-PROMOTABLE fire-condition list) names FOUR canonical condition
shapes:

1. `@cell == .Variant`
2. `@cell.is(.Variant)`
3. `@cell == .Variant(payload)` — payload destructure
4. `@cell == .Variant msg` — single-field bind syntax

The CLI per-branch rewrite table at §56.5.2 is even more explicit:

| Source branch condition | Target arm |
|---|---|
| `if (@cell == .X) { body }` | `<X>{body}</>` |
| `if (@cell == .X(payload)) { body }` | `<X payload>{body}</>` |
| `if (@cell == .X msg) { body }` | `<X msg>{body}</>` |
| `if (@cell.is(.X)) { body }` | `<X>{body}</>` |

### What the code actually does

The expression preprocessor at `compiler/src/expression-parser.ts:686+`
(`preprocessForAcorn`) registers placeholders ONLY for `is .Variant` and
`is TypeName.Variant` (lines 719-727). There is NO preprocessor entry for
`== .Variant`.

Acorn cannot parse `.Idle` as a primary expression — it's a `MemberExpression` with no
object. Without the preprocessor rewrite, `@phase == .Idle` would become a parse error.

### Evidence search

Every form of the dot-prefix `==` pattern was searched across the entire repo
tree (`compiler/`, `samples/`, `examples/`, `self-host/`, `stdlib/`):

```
grep -rEn '== \.[A-Z]'  →  ZERO matches in code; only SPEC.md prose hits
```

Compare to the established `is` form:

```
grep -rEn 'is \.[A-Z]'  →  6+ test files, multiple compiler internal uses
```

Test file `compiler/tests/unit/if-is-variant.test.js` exercises `if=` attributes
with `is .Variant` ONLY — there is no analogous coverage for `== .Variant`.

### Why this matters for Tier B

Per SPEC §56.5.2, the `--match` CLI must rewrite `if (@cell == .X)` chains. If the
source language can't parse `if (@cell == .X)` to begin with, the Tier B implementation
has nothing to rewrite. Two paths forward:

**A) Reduce Tier B SCOPE to the supported predicate set.**
- I-MATCH-PROMOTABLE fires ONLY on `.is(.Variant)` and `is .Variant` chains.
- `bun scrml promote --match` rewrite table covers ONLY those forms.
- SPEC §56.2 #2 + §56.5.2 are amended to drop the `==` rows.
- Pro: ships within original 25-41h envelope; doesn't regress source language.
- Con: docs / kickstarter article promised four shapes; we ship two. Marketing
  beat is weakened. Future expansion still has the door open.

**B) Add `== .Variant` to the preprocessor first (a separate dispatch).**
- New work item: `preprocessForAcorn` gets a `== .Variant` placeholder rule
  symmetric to the existing `is .Variant` rule.
- Type-system gets the corresponding `==`-to-variant typing path (likely small —
  same downstream as `is`).
- Tests, primer docs, kickstarter all updated.
- Estimate: 4-8h preceding Tier B.
- Then Tier B per current SCOPE proceeds with all four shapes.
- Pro: SPEC §56 stays as written; marketing surface shipped intact.
- Con: pushes Tier B further out; introduces a new pre-dispatch.

**C) Defer the dot-prefix `==` shapes to a Tier B+1 dispatch.**
- Tier B ships only the `.is(.Variant)` / `is .Variant` shapes per Path A.
- A follow-up dispatch later adds the `==` preprocessor + extends the lint + extends the
  CLI rewrite. SPEC §56 keeps the four shapes as the design lock; Tier B ships TWO
  of the four.
- Pro: ships incrementally; marketing surface is "fully designed; subset shipped."
- Con: subset shipped honestly weakens the "scrml does this end-to-end" beat.

**Recommendation: Path A or Path C** — both ship a real Tier B without expanding the
parser. Path A is cleaner (no orphaned spec); Path C preserves the design lock.
Bryan + PA decide.

### Risk if we proceed without re-scoping

If Tier B is implemented per current SCOPE:
- The lint will fire on `.is(.Variant)` chains successfully but the rewrite table
  produces output the dev wrote starting from a parseable input — fine.
- The lint will NEVER fire on `== .Variant` chains because those source files don't
  parse, never reach the lint pass.
- The rewrite table's `== .X` rows are dead code at the lint AND CLI level.
- Tests for the `==` rewrite shapes can't be written using compileable input —
  test fixtures would have to construct ASTs by hand.
- Documentation describes a feature combination that doesn't exist, harming dev trust
  the moment someone tries it.

This is a hard blocker for the SCOPE-as-written. STOP and re-scope.

---

## §2 Finding B — W-MATCH-TRANSITIONS-ACCRUING does NOT exist (anywhere)

### What the SCOPE/brief assumed

SCOPE §C / Tier B Phase 3 brief: "Pairs with W-MATCH-TRANSITIONS-ACCRUING lint (SPEC §34
catalog row; per SURVEY §5 the lint is spec-only-not-implemented — you'll need to confirm;
if not implemented, this phase MAY include implementing it OR may skip and document the
dependency)."

SPEC §56.6: "Pairs with the `W-MATCH-TRANSITIONS-ACCRUING` lint."

`promote.js:65` (Tier A stub help text): "Pairs with the W-MATCH-TRANSITIONS-ACCRUING lint."

### What the code actually contains

```
grep -rn "W-MATCH-TRANSITIONS-ACCRUING" compiler/src/   →   zero matches
grep -n  "W-MATCH-TRANSITIONS-ACCRUING" compiler/SPEC.md →  ONE match (the §56.6 prose)
```

The lint is **not in the §34 catalog**, not in any compiler source file, and not
mentioned in the §28 lint-suppression configs. SCOPE §C and SPEC §56.6 cite a lint that
doesn't exist as a row in the catalog.

By contrast, `W-MATCH-RULE-INERT` (the sibling lint) IS in §34 (line 14209) and IS
referenced in §28 suppression configs (line 13563), but neither is implemented in source
either (per SURVEY-NOTE §5).

### Why this matters for Tier B Phase 3 (`--engine` mode)

Phase 3 was scoped as 6-10h "AST→AST `<match>` → `<engine>` transformation," and the
brief proposes the lint detection MAY fold in. But that detection — the lint that finds
`<match>` blocks accruing `rule=` attributes — has neither a §34 row nor an existing
implementation. Folding it in turns Phase 3 into:

- Add §34 row for W-MATCH-TRANSITIONS-ACCRUING (NEW — additive spec change)
- Add §28 suppression config row (NEW)
- Implement the lint detection (NEW; needs AST walk over `<match>` arms looking for
  `rule=` attributes)
- Implement the `<match>` → `<engine>` rewrite (the part Phase 3 was scoped for)

Estimate: 3-5h added on top of the 6-10h, to ~9-15h. Materially higher than the brief
implies.

### Recommendation

Two options for Phase 3:

**A) Drop Phase 3 from this dispatch entirely.**
- Tier B ships `--match` + I-MATCH-PROMOTABLE only.
- `--engine` and W-MATCH-TRANSITIONS-ACCRUING become a Tier C dispatch.
- Phase 3 estimate (6-10h) and follow-on lint work (3-5h) move to a future dispatch.
- Pro: Tier B narrows to a coherent ship. The flagship marketing beat (`promote --match`)
  lands cleanly.
- Con: `bun scrml promote --engine` continues to print "implementation pending."

**B) Include Phase 3 BUT explicitly carve out the lint.**
- Phase 3 ships `--engine` rewrite with NO lint integration. CLI works on
  `<match>` blocks the dev pointed at directly. Discovery via lint comes in a later
  dispatch.
- Pro: --engine ships, marketing covers full tier ladder.
- Con: dev has no compiler-side discovery for "this match is accruing rules" until a
  follow-up dispatch.

**Recommendation: A.** Tier B's flagship beat is `promote --match` paired with
I-MATCH-PROMOTABLE. Shipping that cleanly is the right scope. `--engine` deserves its
own dispatch with proper lint integration, including the new §34 row, the new §28 row,
and the lint pass implementation. Splitting them honors the "one logical change per
dispatch" discipline that has worked well for scrmlTS so far.

---

## §3 Finding C — type-system already provides what the lint needs (good news)

### What the SURVEY-NOTE §4 said

> The lint can't ask "is this cell typed as enum E?" directly from the StateCellRecord.
> The path forward:
> 1. From `StateCellRecord.declNode`, read `declNode.typeAnnotation` (if `hasTypeAnnotation`).
> 2. Resolve that type annotation against the type-system's registry.

### What the code actually provides

`runTS` (`compiler/src/type-system.ts:8148-8185`) returns `stateTypeRegistry: Map<string, ResolvedType>`
on its result object. `compiler/src/api.js` already plumbs this through the pipeline. So
the lint pass plumbing is straightforward:

1. Run as a post-TS pass (sibling of `checkEnumExhaustiveness`, or a new function in
   `type-system.ts` invoked from `api.js` after `tsResult`).
2. For each `IfStmtNode` in the AST, examine `condExpr` (already populated by ast-builder
   per `types/ast.ts:660-661`).
3. For the leading `@cell` on each branch, call `getResolvedStateCell(ident)` (B3 API,
   stable from S65) → `StateCellRecord`.
4. Look up the cell's declared type via `stateTypeRegistry.get(record.qualifiedPath)` OR
   walk `record.declNode.typeAnnotation` and resolve via the type-system's lookup
   (which `runTS` exposes; the path needs a small bridge but it's a real path).
5. Branch-by-branch coverage via existing `checkEnumExhaustiveness` (verified reusable
   in SURVEY-NOTE §4).

This is unchanged from SURVEY-NOTE §4 — confirmed accurate. Phase 1 cost estimate
(4-6h survey-revised) is unchanged.

### Implication

Lint pass plumbing is straightforward IF Findings A and B are resolved. The actual
Phase 1 work, scoped to whatever predicate forms are in scope, is real engineering
but not blocked by infrastructure.

---

## §4 Finding D — SPEC §34 catalog row for I-MATCH-PROMOTABLE was NOT landed

### What progress.md (S65 Tier A) claimed

> ## 2026-05-06 — Tier A in progress
> Next steps:
> - [x] CLI stub: commands/promote.js + cli.js wiring
> - [x] SPEC §34 catalog entry (I-MATCH-PROMOTABLE row)
> - [x] SPEC §56 — new normative section (Promotion Ergonomics design lock)
> ...

### What the code actually shows

```
grep -n "I-MATCH-PROMOTABLE" compiler/SPEC.md
```

All hits are inside §56 (lines 24729-24911). There is NO row in the §34 catalog (lines
13874-14126). The progress.md checkbox claimed it landed but the commit (`bc42547`)
landed §56 only.

This is a documentation/coverage drift. It is NOT a blocker for Tier B implementation —
the §56 normative spec is sufficient. But Tier B's Phase 4 (docs touch-up) should add
the §34 catalog row as part of the closing docs landing.

---

## §5 Finding E — Phase 0 confirms cost estimate, conditional on Path A

If Findings A and B are resolved by reducing scope to:
- Two predicate forms (`.is(.Variant)`, `is .Variant`) — Phase 1 + 2 unchanged
- `--match` only (drop Phase 3) — saves 6-10h
- I-MATCH-PROMOTABLE lint with three message shapes — Phase 1 unchanged

Then survey-revised cost becomes:

| Piece | SCOPE estimate | Re-scoped estimate |
|---|---|---|
| `bun scrml promote --match` (two predicate forms) | 8-14h | **6-10h** (smaller predicate matrix) |
| I-MATCH-PROMOTABLE lint detection (two predicate forms) | 4-6h | **4-6h** (unchanged) |
| Near-miss + variant computation | 1-2h | **1-2h** (unchanged) |
| `--engine` sibling | 6-10h | **DROPPED** (Tier C) |
| Tests | 4-6h | **3-5h** (smaller surface) |
| Spec/primer/article docs | 2-3h | **2-3h** (smaller surface) |
| **Total — re-scoped Tier B** | 25-41h | **16-26h** |

A 16-26h dispatch is materially smaller and correspondingly more shippable in one
session — closer to the upper bound of typical scrmlTS dispatches.

---

## §6 Recommendation

Per the Tier B dispatch brief: "If Phase 0 reveals new information that materially
changes scope: STOP after Phase 0, report findings, exit. PA + Bryan will re-scope."

This sub-phase reveals THREE material findings (A blocking, B reducing Phase 3 viability,
D requiring docs catch-up). The right action is STOP.

### Proposed re-scoped Tier B (for Bryan + PA review)

1. **Predicate matrix:** I-MATCH-PROMOTABLE fires only on chains where every branch's
   condition is one of:
   - `if (@cell.is(.Variant))` — method-call form
   - `if (@cell is .Variant)` — operator form
   These are the two parseable forms today. The `==` forms in SPEC §56.2 #2 + §56.5.2
   are deferred (Path C from §1) OR removed (Path A from §1).
2. **Phase 3 deferred:** `bun scrml promote --engine` and W-MATCH-TRANSITIONS-ACCRUING
   become Tier C. The `--engine` flag stays in the locked CLI surface (`promote.js`
   already validates it) but continues to print "implementation pending" until Tier C.
3. **Docs catch-up included:** Tier B Phase 4 adds the §34 catalog row for
   I-MATCH-PROMOTABLE (caught by Finding D).
4. **Re-scoped estimate:** 16-26h (down from 25-41h). Within range for a single
   focused dispatch.

### Spec-amendment work the new Tier B brief would include

- Either drop `==` rows from SPEC §56.2 #2 + §56.5.2 (Path A), OR mark them as
  "deferred to Tier C — requires preprocessor extension" (Path C).
- Add §34 catalog row for I-MATCH-PROMOTABLE (Finding D catch-up).
- Update SCOPE.md / SURVEY-NOTE.md to reflect the re-scoped Tier B / new Tier C split.

### Why I am not proceeding with implementation

The brief explicitly authorizes STOP-after-Phase-0 when material new information
surfaces. Finding A is exactly that: the SCOPE assumes a source-language form is
parseable; it isn't. Implementing Tier B per current SCOPE would either:
- Ship dead-code rewrite paths for `==` forms that can never fire (silent
  half-implementation), OR
- Get blocked at Phase 1 / Phase 2 the moment a test fixture for `==` is needed.

Both outcomes erode dev trust in the very tier-ladder marketing flagship this dispatch
exists to land cleanly.

Stopping. Awaiting PA/Bryan re-scope decision.

---

## Tags

#promotion-ergonomics #tier-b-survey #phase-0 #stop-and-rescope
#blocker-equality-variant-not-parseable #blocker-w-match-transitions-accruing-missing
#docs-catchup-i-match-promotable-§34

## Links

- [SCOPE.md](./SCOPE.md) — Tier A/B design lock (S65)
- [SURVEY-NOTE.md](./SURVEY-NOTE.md) — original survey (S65, Tier A landing)
- [progress.md](./progress.md) — append-only progress log (Tier A + Tier B Phase 0)
- `compiler/SPEC.md` §56 (lines 24729-24911) — Promotion Ergonomics normative spec
- `compiler/SPEC.md` §34 (lines 13874-14126) — Error/warning/info catalog
- `compiler/src/expression-parser.ts:686+` — `preprocessForAcorn` (the dot-prefix gap)
- `compiler/src/expression-parser.ts:719-727` — established `is .Variant` preprocessor
- `compiler/src/type-system.ts:8148+` — `runTS` (provides `stateTypeRegistry`)
- `compiler/src/type-system.ts:5350-5386` — `checkEnumExhaustiveness` (reusable)
- `compiler/src/symbol-table.ts:1065-1071` — `getResolvedStateCell` (B3 API)
- `compiler/src/commands/promote.js` — Tier A CLI stub (locked surface)
- `compiler/tests/unit/if-is-variant.test.js` — `is .Variant` test reference
