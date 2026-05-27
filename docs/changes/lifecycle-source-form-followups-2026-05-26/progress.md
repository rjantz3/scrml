# B-prereq orthogonal #1 + #3 — source-form Shape 1 variant-progression

Closes follow-ups #1 + #3 surfaced by B-prereq (S134) + Q6-narrow (S135).
Goal: the canonical adopter form `<phase>: (.Draft to .Published) = .Draft`
end-to-end with variant-progression lifecycle tracking.

## Phase 0 — startup verification (PASS)

- `pwd` → `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-acd9cb4de49606d54`
- `git rev-parse --show-toplevel` matches.
- `git status --short` clean.
- Base SHA: `3a660c7c` (S134 close, post B-prereq).
- `bun install` — 204 packages OK.
- `bun run pretest` — 13 test samples compiled.

## Phase 0 — empirical verification (DONE)

Probes at `/tmp/b-prereq-followups-probes/`. Driver = `compileScrml({inputFiles, write:false})`.

### Probe #1 — bare-dot variant lifecycle annotation source-form

```scrml
type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }
<phase>: (.Draft to .Published) = Article.Draft
${ @phase.publishedAt }
```

**Empirical (today): 0 errors, 0 warnings.** SHOULD fire E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED.

**Root cause traced via temporary instrumentation:** the parser delivers the
typeAnnotation string as `(.Draft to.Published)` — NO whitespace between `to`
and `.`. `findTopLevelArrow` requires whitespace boundary on BOTH sides of
`to`; `.` is non-whitespace; match fails; `isLifecycleAnnotation` returns
false → no binding registered in `buildCellValueLifecycleMap` → no tracker
fire path.

Cause confirmed at `compiler/src/ast-builder.js:3520-3534`: the type-annotation
joiner inserts a single space between two consecutive tokens ONLY when both
adjacent characters are word-chars (`[A-Za-z0-9_$]`). The token boundary
`to` (word-char) / `.` (non-word-char) does NOT get the inserted space,
collapsing `to .Published` → `to.Published`.

### Probe #2 — qualified-enum variant lifecycle annotation source-form

```scrml
type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }
<phase>: (Article.Draft to Article.Published) = Article.Draft
${ @phase.publishedAt }
```

**Empirical (today): 1 error E-TYPE-001 fires** but the diagnostic text is buggy:

```
E-TYPE-001: binding `phase` has lifecycle annotation `(asIs to asIs)` ...
  Resolution: discriminate the source variant via `if (phase is .Article.Draft)`,
  then call `transition(phase)` before this read.
```

`(asIs to asIs)` because `resolveTypeExpr("Article.Draft")` doesn't find
`Article.Draft` in the type registry (the registry stores enum `Article`,
not its individual variants) → returns `asIs`. Then
`formatTypeForDiagnostic(asIs)` → `"asIs"`.

`.Article.Draft` because `parseLifecycleReturnAnnotation` strips ONLY the
leading `.` (variant-progression case); the qualified form passes through
with the `Article.` prefix intact → `preVariantName = "Article.Draft"`.

Worse: the variant-progression tracker's discrimination regex looks for
`\bphase\b\s+is\s+\.<preVariantName>\b`. With preVariantName =
`Article.Draft`, the regex tries to match the literal string `.Article.Draft`
in the user's `if (phase is Article.Draft)` source. It can match the
qualified source form, but NOT the canonical bare-dot discrimination form
`if (@phase is .Draft)` — which is what adopters would write per §14.10
bare-variant inference.

### Probe #5 — fn-return path regression baseline

```scrml
const a = publish(42)
if (a is .Draft) {
    print(a.publishedAt)  // fires today via fn-return tracker
}
```

Existing fn-return tests in `type-system-lifecycle-landing-2-5.test.js`
use DIRECT-AST construction with manually-spaced `(.Draft to .Published)`
strings, so they bypass the parser whitespace-collapse. They MUST still
pass after Fix #1 (whitespace tolerance can only ADD inputs, not subtract).
Fix #3 (qualified-name stripping) does affect them indirectly only if the
test text uses qualified form — current tests don't.

## Phase 1 — architecture decision

### Fix #1 — whitespace tolerance for `to` glyph

**Option chosen: (b) `findTopLevelArrow` tolerance.** Relax the regex to
require word-boundary on the `t` side only (not whitespace boundary on the
`o` side). I.e., `to` is recognized when `next` is whitespace OR a
non-word-char that cannot extend `to` into a longer identifier.

Concretely:
- `prev` boundary check unchanged (whitespace or string-start). This
  prevents `auto` / `into` / `pizzato` from matching.
- `next` boundary check loosened: whitespace OR a non-word-char such as
  `.` / `(` / `[`. This allows `to.Published` to match while still
  rejecting `tomato` (where `m` is word-char, blocks match).

**Why (b) over (a):** lower blast radius. The tokenizer/ast-builder
joiner at `ast-builder.js:3520-3534` has the comment explicitly noting
the space-insertion is conservative — broadening it (option a) touches
every type-annotation site downstream. (b) is a single-function change
in a span-free, span-context-free helper used only for lifecycle-glyph
detection. Symmetry: the `->` legacy form already tolerates `>`
immediately after `-` with no required whitespace; the canonical `to`
should not be MORE restrictive than the legacy form.

**Correctness check:** could the relaxed boundary cause false matches?
- `prev` = word-char → already blocked by the unchanged `prev` check
  (e.g., `autoT` is blocked because `prev='T'` only matches if there's
  an additional `t` before; the standalone-`to` constraint stands).
- `next` = word-char (`o` would extend, but check is on i+2 so `tom...`
  has next=`m` which is word-char → still blocked).
- `next` = non-word-char in any of `.`, `(`, `[`, `,`, `)`, `]`, `}`, `|`
  → allowed.
- The exact set of allowed next-characters in lifecycle expression
  contexts is finite per SPEC §14.12: `to` is followed by a type
  expression which starts with an identifier-char (word) or `.` (bare
  variant) or `(` (parenthesised) or `!` (predicate). All word-char
  starts are blocked (as expected — `to T` requires whitespace). Only
  `.`/`(`/`!`/`{` are useful relaxation targets; `not to{X}` is a
  pathological case but stays a valid relaxation if it ever surfaces.

### Fix #3 — qualified-enum stripping in `parseLifecycleReturnAnnotation`

`parseLifecycleReturnAnnotation` (type-system.ts:14229) strips leading `.`
only:

```ts
const preVariant = (preExpr.startsWith(".") ? preExpr.slice(1) : preExpr).trim();
```

Extend to also strip a `EnumName.` prefix when the inner shape is
`<IDENT>.<IDENT>`. The variant-name extracted is whatever follows the
last `.` (qualified-enum form) OR whatever follows the leading `.`
(bare-dot form). The two forms yield the same variant name:
- `.Draft` → `Draft`
- `Article.Draft` → `Draft`

This is the load-bearing change for matching against discrimination
regex AND for the diagnostic message.

**Diagnostic message in the variant case** (lines 14529, 14546) uses
`.${spec.preVariantName}` — once Fix #3 lands, this becomes `.Draft`
correctly for either source form.

### Fix #3.b — diagnostic preLabel/postLabel for variant case

The buggy `(asIs to asIs)` in the E-TYPE-001 fallback at lines 14538-14549
comes from `formatTypeForDiagnostic(spec.preType)` where preType is
`asIs` (unresolved variant). For variant-progression specs, the
diagnostic should use `.<variantName>` rather than the (unresolvable)
type expression. Update the variant branch to format the variant case
using `.${preVariantName}` / `.${postVariantName}` (same as the
discrimination-scope branch already does).

This is a small companion to Fix #3 — both touch the same diagnostic
path; without it the message is still wrong even after Fix #3 strips
the prefix.

### Architecture: PROCEED with (b) for Fix #1, surgical extension for Fix #3.


## Phase 2 — implementation log

### Fix #1 (commit `0ec6fc72`) — `findTopLevelArrow` next-boundary relaxed

Changed `findTopLevelArrow` (type-system.ts:2254) to use `isIdentChar` check
(NOT in `[A-Za-z0-9_$]`) rather than whitespace-only check for the boundaries
around the `to` keyword.

Before: `prev`/`next` must be space/tab/newline. After: any non-identifier
char (so `.`, `(`, `)`, `[`, etc. all count). Symmetric with legacy `->`
glyph which already tolerated `-` immediately followed by `>` with no
whitespace.

Empirical: bare-dot source form `(.Draft to .Published)` is delivered by
the parser as `(.Draft to.Published)` (whitespace-collapse around `.` per
ast-builder.js:3520-3534). Pre-Fix #1: silent no-fire. Post-Fix #1: tracker
recognizes lifecycle annotation, classifies as variant-progression.

125/125 existing lifecycle tests pass after Fix #1.

### Fix #3 + #3.b + sigil (commit `8ce95c76`) — three coupled changes

**Fix #3** — `parseLifecycleReturnAnnotation` (type-system.ts:14229) extends
variant-name stripping to handle qualified-enum form. Now strips BOTH:
- leading `.` (bare-dot form per §14.10): `.Draft` to `Draft`
- `EnumName.` prefix (qualified per §18.5): `Article.Draft` to `Draft`

Both forms yield the same bare variant name; the walker's discrimination
regex matches canonically.

**Fix #3.b** — diagnostic preLabel/postLabel for E-TYPE-001 variant-case
fallback (type-system.ts:14577). Previously used formatTypeForDiagnostic
(spec.preType) which yields "asIs" for variant payloads. Switched to
spec.preVariantName / postVariantName when available — matches the
LIFECYCLE-VARIANT-NOT-TRANSITIONED branch above.

**Sigil fix (companion)** — TRANSITION_CALL_RE (type-system.ts:14378) now
allows optional `@` prefix on the captured argument. V5-strict source form
writes `transition(@phase)` for Shape 1 cells; pre-sigil-fix the regex
never matched.

## Phase 3 — tests (commit `69c9d065`)

NEW: `compiler/tests/unit/lifecycle-shape1-source-form.test.js` (17 tests).
Mirror of `lifecycle-shape1-tracker.test.js` end-to-end pattern using
`compileScrml({inputFiles, write:false})` — exercises the parser path.

Tests by category:
- Bare-dot variant lifecycle annotation: 6 tests
- Qualified-enum variant lifecycle annotation: 4 tests
- Presence-progression regression: 2 tests
- Legacy `->` glyph regression: 1 test
- Probe #3 end-to-end combined-fixes: 1 test
- Engine-cell carve-out regression: 1 test
- Fn-return path regression: 2 tests

All 17 pass. Lifecycle suite: 125 to 142 pass / 0 fail.

## Phase 4 — final report

### Test outcomes

```
bun test lifecycle-shape1-source-form + 6 sibling files
to 142 pass / 0 fail / 285 expect() calls

bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance --bail
to 14,699 pass / 0 fail / 88 skip / 1 todo

bun run test (full suite incl. browser)
to 21,718 pass / 0 fail / 170 skip / 1 todo
```

Baseline (per brief): 21,701 (B-prereq close baseline; my base SHA 3a660c7c
predates Q6-narrow). My +17 new tests yields 21,718.

### Files touched

- `compiler/src/type-system.ts` (+79L net) - Fix #1 + Fix #3 + Fix #3.b + sigil
- `compiler/tests/unit/lifecycle-shape1-source-form.test.js` (+487L NEW) - 17 tests
- `docs/changes/lifecycle-source-form-followups-2026-05-26/progress.md` (this file)

### PA landing note

My worktree base = `3a660c7c` (S134 close). Main has since landed `2ffe4f6a`
Q6-narrow (+355L in type-system.ts at lines 13532-15087). My patch FAILS
`git apply --check` against current main (the TRANSITION_CALL_RE region at
my line 14336 / Q6-narrow's shifted 14375 conflicts).

Per [[feedback_file_delta_vs_cherry_pick]]: wholesale `git checkout
my-branch -- compiler/src/type-system.ts` WOULD CLOBBER Q6-narrow.
Recommended landing: cherry-pick the 3 fix commits in order:
- `0ec6fc72` Fix #1 (findTopLevelArrow tolerance)
- `8ce95c76` Fix #3 + #3.b + sigil
- `69c9d065` source-form tests

Plus this progress.md commit (final).

### Open follow-ups (surfaced, out of scope)

1. **W-LIFECYCLE-LEGACY-ARROW for Shape 1 cells.** Lint emitted only at
   struct-field sites today (extractLifecycleFields:2213); Shape 1 legacy
   `->` form resolves but no lint. Pre-existing gap.
2. **Qualified-form discrim regex tolerance.** Walker's isIsVariantCheckOf
   matches `<binding> is .<VariantName>` only; qualified
   `is Article.Draft` discrim not matched. Symmetric to Fix #3 but on
   walker side.
3. **`transition()` with deeper expressions.** Today single-identifier
   only. `transition(@u.field)` / `transition(getCell())` not matched.
   First is correctly rejected by §14.12.6.3 signature; second is design
   choice.

### Status

**COMPLETE.** All deliverables landed. Pre-commit gate passes; full suite
clean.

### Maps consulted

- `.claude/maps/primary.map.md` - Task-Shape Routing for Lifecycle annotation
- `.claude/maps/error.map.md` - E-TYPE-001 + LIFECYCLE codes + diagnostic-
  stream partition rule
- `.claude/maps/schema.map.md` - LifecycleFieldSpec/Registry + findTopLevelArrow
  line cite
- `.claude/maps/structure.map.md` - type-system.ts key module section + line
  anchors for lifecycle annotation

**Load-bearing finding:** error.map's diagnostic-stream partition (W-/I- vs
E-* split) directly informed test assertions; schema.map's findTopLevelArrow
+ parseLifecycleReturnAnnotation line cites were the surgical entry points.
