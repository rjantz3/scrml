# BRIEF — §59 Value-Native Maps: apply reviewer rev-2 + land in SPEC.md (Nominal) (S168)

change-id: `map-spec-section-59-2026-06-06`. SPEC-TEXT-ONLY landing (no compiler code — §59 is a
Nominal/spec-ahead section, mirroring §58 Build Story). The phase-c build implements it later.

## What this is
The §59 value-native-map SPEC section passed the reviewer-gate **READY-WITH-CHANGES**. Your job:
apply the reviewer's **rev-2** changes to produce the final §59, then **land it into
`compiler/SPEC.md`** + the cross-section amendments + the §34 rows + regenerate SPEC-INDEX.

## Inputs (read first)
- The REVIEWED DRAFT (the §59 body + cross-section amendments + open-Q resolutions):
  `/home/bryan-maclee/scrmlMaster/scrml-support/archive/spec-drafts/value-native-map-S168-DRAFT.md`
  (committed scrml-support `2127c00`). The draft's §59 subsections + the "Cross-section amendments"
  block are the base text you land — AFTER applying rev-2 below.
- SPEC.md sections you touch (grep to confirm exact lines — they drift):
  §6.5 arrays (`#### 6.5`), §14 type system, §34 error codes (`## 34`), §42 `not` (`## 42`),
  §45 equality (`## 45`, §45.2 ~comparability), §47 codec (§47.1.4/§47.1.5 ~lines 21668-21716),
  §57 wire format (`## 57`), §58 Build Story (the LAST top-level section — §59 inserts AFTER it),
  the Table of Contents (~lines 20-102).

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; follow the Task-Shape Routing for a spec amendment.
Maps reflect HEAD `75431e9e` as of 2026-06-06; HEAD is at `23ef9907` (cycles-prereq + README +
docs since — no SPEC.md content change since the watermark beyond those commits). Report maps feedback.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (isolation: worktree)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-` — else STOP
   (S90 wrong-repo). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. `git merge main` (S112 — inherit `23ef9907`).
4. `git status --short` clean.
5. `bun install` ; 6. `bun run pretest`.
7. Baseline `bun run test` — record counts (contract: 0 fail).
- **Apply ALL edits via Bash** (`perl`/`python3`/heredoc) on worktree-absolute paths incl. the
  `.claude/worktrees/agent-<id>/` segment; echo path before each write; `git diff`/`grep` after. Do NOT
  use Edit/Write tools. NEVER `cd` into main; use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`,
  worktree-absolute paths only. First commit: `WIP(map-spec-59): start at $(pwd)`.
- Commit per logical unit; update `$WORKTREE_ROOT/docs/changes/map-spec-section-59-2026-06-06/progress.md`
  per step. `git status` clean before reporting DONE.

# REV-2 — apply these to the draft text BEFORE landing

## BLOCKING (must apply)
- **B1 (§59.3 grammar bug):** the depth-1-colon disambiguation must EXCLUDE the ternary alt-colon.
  Restate the rule as: "a bracket is a map literal iff it is `[:]` OR contains an entry-colon at
  bracket-depth 1 **that is NOT the alternative-separator of a ternary** (i.e. not preceded at the same
  bracket-depth by an unmatched `?`)." Add `[ @cond ? a : b ]` to the worked-disambiguation block as an
  ARRAY case (the ternary `:` is depth-1 but excluded).
- **B2 (§59.3 Acorn note):** add a phase-c implementation note — "A map literal is not valid JS (Acorn
  rejects `:` inside `[...]`). The Acorn-path expression parser (`compiler/src/expression-parser.ts`)
  requires a pre-Acorn rewrite or a plugin to admit the depth-1 entry-colon (precedent: `preprocessForAcorn`,
  §45.9); the native-parser path applies the depth-1 + ternary-exclusion discipline directly. The `[:]`
  empty form may be tokenized specially before Acorn (as `::` is)."
- **B3 (§59.6 + the §42 amendment — citation fix):** the draft cites a "`not|not ≡ not` idempotence of
  §42" that §42 does NOT contain. Fix BOTH sites: (a) the §42 cross-section amendment now INTRODUCES a
  NEW normative micro-statement — "A union type SHALL be normalized so that duplicate `not` members
  collapse: `(T | not) | not` is `T | not`." (b) Reword §59.6's `.has` rationale to ground it directly:
  "The map read type is `ValT | not` regardless of whether `ValT` itself admits `not` (union-`not`
  normalization, §42 amendment); therefore a bare bracket-read on a `[K: V|not]` map cannot distinguish a
  stored `not` value from an absent key — `.has(k)` decides it." Do NOT cite a pre-existing §42 idempotence.

## MISSING (add)
1. Add `W-MAP-STRUCT-KEY-LITERAL` (Info) to §59.11 + §34 — fires on a struct/enum-key map literal in v1
   (parse-accepted, codegen-deferred to `.insert`; cross-ref §59.3/§59.12).
2. Nested maps: the VALUE type may itself be a map (`[string: [int: Money]]`); only the KEY type may not
   (§59.4). Add a §59.7 worked nested-map update example (reassignment-canonical: rebuild the inner map +
   `.insert` it into the outer) and state the bracket-write ban (`E-MAP-BRACKET-WRITE`) applies at every level.
3. `.insertAll(pairs)` (§59.7): specify the `pairs` shape. scrml has no tuples → `pairs` is **another
   `[K: V]` map** (insert all its entries) — spec it as that (cleanest; composes with `.entries()`).
4. Iteration positional-correspondence (§59.8): for a given map value, `.keys()[i]` / `.values()[i]` /
   `.entries()[i]` SHALL share ONE consistent (if unspecified) ordering — add a normative sentence.
5. `==` cross-type (§45.2 amendment + §59.9): `@m == @arr` / `@m == 5` is `E-EQ-001` (cross-type) — one sentence.
6. Duplicate literal keys (§59.3): `[ "DAL": 3, "DAL": 5 ]` is **last-wins** (matches `.insert` overwrite);
   optionally surface `W-MAP-DUPLICATE-LITERAL-KEY` (Info) — add the code to §59.11 + §34.

## NON-BLOCKING (apply)
1. §59.5: note that value-level key-hash collisions are EXPECTED-and-resolved by a bucket `==` check —
   the OPPOSITE disposition from §47.1.5's E-CG-010 type-codec hard-error (so a reader doesn't import the
   halt reflex). In the §47.x new subsection, add a normative micro-statement: the value-canonical key
   codec is deterministic and injective-modulo-collision (bucket `==` is the injectivity backstop).
2. §59.10: one sentence — a `[K: V|not]` map whose stored values include `not` round-trips losslessly by
   encoding the stored `not` via the §57 absence-envelope inside the entries array.
3. §59.8: note the `W-MAP-ITERATION-ORDER` Info code partitions into `result.warnings` (not `errors`) —
   the cross-stream partition phase-c tests must assert on.
4. §59.2: one line — `@ordered` is a postfix TYPE affix (like `[]`), not an attribute and not the `@`-sigil.
5. §59.6 (Q7): note the decided `.size` (map) vs `.length` (array, §6.5.4) divergence — intentional, mirrors
   JS `Map.size`/`Array.length`; not an oversight.

(Open-Qs Q1/Q2/Q3/Q4/Q5 land as already drafted — no change. Q6 = the W-MAP-STRUCT-KEY-LITERAL of MISSING #1.)

# LANDING into SPEC.md
1. **Insert §59** (the rev-2'd §59.1–§59.13 body) as a new top-level section AFTER §58 (the current last
   section). Keep the Nominal banner (mirror §58's banner shape). Do NOT carry the draft's frontmatter /
   "locks mapping" / "open questions" / "reviewer note" meta — those are draft-only; land the §59.x
   normative body + the Nominal banner only.
2. **Cross-section amendments** (from the draft's "Cross-section amendments" block, rev-2'd): §45.2 (+maps
   comparable, order-independent, key must be comparable, +the cross-type E-EQ-001 sentence); §47 (NEW
   subsection §47.x "Value-Canonical Key Hashing (Maps)" after §47.1.5, with the determinism/collision-
   policy micro-statement); §42 (the NEW union-`not`-normalization micro-statement per B3); §57 (lossless-
   map note + the stored-`not`-envelope sentence); §6.5 (one-line COW/reassignment-canonical sibling note);
   §14 (the `[KeyT:ValT]` grammar-registration note).
3. **§34 rows:** add `E-MAP-KEY-NOT-COMPARABLE`, `E-MAP-KEY-IS-MAP`, `E-MAP-BRACKET-WRITE`,
   `E-MAP-LITERAL-MALFORMED`, `W-MAP-ITERATION-ORDER` (Info), `W-MAP-STRUCT-KEY-LITERAL` (Info),
   `W-MAP-DUPLICATE-LITERAL-KEY` (Info). `E-EQ-003` is REUSED (no new row). Follow the §34 row format exactly.
4. **TOC:** add the §59 entry (and the appendix list is unaffected).
5. **Regenerate SPEC-INDEX:** run `bun --cwd "$WORKTREE_ROOT" run scripts/regen-spec-index.ts` (or
   `bun "$WORKTREE_ROOT"/scripts/regen-spec-index.ts` — confirm the script path; the index footer notes
   the canonical regen command). Add a §59 Sections-table row + Quick-Lookup topic rows (value-native map,
   `[KeyT:ValT]`, bracket-read map, `.insert`/`.remove`/`.update`, map iteration, map equality, map
   serialization). Update the SPEC-INDEX footer line-count + a one-line S168 change note.

# GATE + REPORT
- This is SPEC-text only; no R26 (no codegen). But the pre-commit hook runs `bun test` — a new §34 code +
  a new section may trip a SPEC↔§34 consistency test, a section-count test, or a SPEC-INDEX-freshness test.
  Run `bun run test`; if a test asserts on SPEC structure/§34-code-set/section-count, update that test to
  match the new truth (a Nominal §59 + the new codes ARE the new truth) — note any such test edit in the
  report. Do NOT `--no-verify`.
- Report: WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED (SPEC.md + SPEC-INDEX.md + any test), the rev-2 items
  applied (checklist), test deltas, maps feedback, SPEC.md line-count before/after.

# DONE = rev-2 applied → §59 + amendments + §34 rows + TOC landed in SPEC.md → SPEC-INDEX regenerated → 0 test regressions → clean git status.
