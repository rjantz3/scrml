---
status: in-progress
started: 2026-05-25
session: S130
phase: HU resolutions per finding
dd-source: scrml-support/docs/deep-dives/lifecycle-annotation-extension-and-flagship-scope-2026-05-25.md
findings-total: 7 (per DD)
findings-closed: 0
---

# Lifecycle Annotation — Heads-Up Resolutions

This is the running log of per-question resolution decisions for the lifecycle-annotation extension + flagship-scope arc. Each HU sub-session resolves one or more questions from the lifecycle DD (S130).

**Conventions:**
- HU-N = heads-up sub-session N. Sequentially numbered.
- Each HU section records: question discussed, decision ratified (verbatim user direction where applicable), findings closed / advanced, carry-forward open items.
- Option labels: ASCII `a` / `b` / `c` / `d` per S129 banked rule [[feedback_no_greek_chars_in_options]].
- DESIGNER-CARD axis flagged explicitly where retirement/existential-veto is on the table (per S94/S129 designer-card discipline).
- Final resolution direction reproduced here verbatim so Phase 2 (SPEC amendments + canon catch-up) work has a single source of truth.

## Prelude — DD inputs

The lifecycle DD `scrml-support/docs/deep-dives/lifecycle-annotation-extension-and-flagship-scope-2026-05-25.md` (919L) closed at S130 with:

- **PA lean Approach C** — extend lifecycle to non-engine cell positions; carve out engine cells explicitly.
- **7 HU questions** surfaced (4 with PA lean; 3 flagged GENUINE DESIGN QUESTION).
- **Critical compiler finding** — `compiler/src/type-system.ts:1444` resolves `(A -> B)` to type B but does NOT track per-access transition state; E-TYPE-001 fire promised in SPEC §14.3 line 7106 is **unimplemented**. The article publish-twin already acknowledges this with an explicit status banner. Affects HU-Q2 sequencing regardless of HU-Q1 choice.

User-voice S129 anchor (verbatim) carrying into this arc: *"yes a. this was part of the basis. when I first envistioned the scrml type-system, this was my first real novel (at least to me (truck driver(no knowledge of specific prior art))) idea for scrmls type system"* — lifecycle annotation is FOUNDATIONAL to scrml's type-system identity. F-023 ratified FLAGSHIP treatment for PRIMER + kickstarter (not footnote).

---

## HU-1 — 2026-05-25 — opening

### Q1 RATIFICATION — (c) extend to non-engine cells; carve out engine cells explicitly

**User direction:** `c` (Recommended).

**Decision:** Lifecycle annotation `(A to B)` extends beyond struct fields to non-engine cell positions. Engine cells (variant-graph progression already covered by `rule=` / `initial=` / `<onTransition>`) are explicitly excluded — lifecycle there would be redundant noise.

**Extension scope (subject to subsequent Q ratifications):**
- ✓ Struct fields (current SPEC §14.3 scope — preserved)
- ✓ Shape 1 plain reactive cells (`<status>: (Idle to Active) = .Idle`)
- ✓ Function parameters (`fn process(x: (A to B))` — subject to Q3 for function-return)
- ✓ Schema fields (subject to Q4 — placement decision: §14.3 vs §39)
- ✓ Channel cells (subject to Q7 — extend or defer)
- ✗ Engine cells (carved out — engines own variant-graph progression)

**Cohesion rule (one-sentence teachable):** "Lifecycle annotation goes anywhere a type goes, except engine cells."

**Composition:** confirmed clean with V-kill, Shape 1/2/3, match block-form, bare-variant inference, `lin`, predicates per DD §composition-analysis.

**New error code (subject to Q5):** `E-TYPE-LIFECYCLE-ON-ENGINE-CELL` (PA mild lean) — fires when adopter writes `<phase>: (Idle to Active) = .Idle` where `<phase>` is an engine cell. Diagnostic surface that explains the carve-out.

**Designer-card NOT invoked.** PA recommendation respected.

### Q2 RATIFICATION — (b) land §14.3 E-TYPE-001 fire FIRST, then extend

**User direction:** `b` (Recommended).

**Decision:** Two-landing sequence.

**Landing 1 — `type-system.ts` per-access transition-state tracking (bug-fix sized):**
- Implement per-access transition-state tracking in `compiler/src/type-system.ts:1444` so E-TYPE-001 fires per SPEC §14.3 line 7106
- Test surface: per-access transition cases against current §14.3 worked example (`passwordHash: (not -> string)`) — both the missing-transition case (fires) AND the post-transition case (passes)
- Article publish-twin status banner can drop once fire lands
- File-disjoint with extension work; can dispatch independently
- Estimated size: small (per-access transition-state tracking is bounded by existing resolver scope at line 1444)

**Landing 2 — Approach C extension (SPEC-text + tests, no compiler-baseline change):**
- §14.3 (or new §14.X per Q6) extension prose covering non-engine cell positions
- E-TYPE-LIFECYCLE-ON-ENGINE-CELL diagnostic (per Q5) for engine-cell rejection
- Migration of `->` glyph to `to` per S129 HU-2 F-024 ratification (folds into this landing)
- Test surface: extension-position cases (Shape 1 plain cells, function parameters, schema fields per Q4, channel cells per Q7) + engine-cell rejection cases

**Sequencing rationale:**
- Pa.md Rule 4 (SPEC normative; compiler implements): closes the ~6+ week spec-vs-impl gap before extending
- Smaller-first reduces risk: fire-implementation subtleties surface independently before entangling extension semantics
- Cohesion of work-blocks: Phase 2 amendment work for extension becomes SPEC-text-only (no compiler-baseline change)

### Q5 RATIFICATION — (a) new `E-TYPE-LIFECYCLE-ON-ENGINE-CELL`

**User direction:** `a` (Recommended).

**Decision:** New error code `E-TYPE-LIFECYCLE-ON-ENGINE-CELL` in the §14.X type-system catalog. Fires when adopter writes `<phase>: (Idle to Active) = .Idle` where `<phase>` is an engine cell (carved out per Q1 = c).

**Diagnostic text** (Phase 2 amendment work; subject to refinement):
> *Lifecycle annotation `(A to B)` is not permitted on engine cells. Engine cells declare their variant-graph progression via `rule=` / `initial=` / `<onTransition>` (§51.0). For variant-graph state, use an engine. For value-shape progression (e.g., `<status>: (Idle to Active) = .Idle`), declare as a plain reactive cell (not an engine cell).*

### Q6 RATIFICATION — (a) new §14.X "Lifecycle Annotation" subsection

**User direction:** `a` (Recommended).

**Decision:** Promote lifecycle annotation from sub-content under §14.3 to its own §14.X subsection. Matches PRIMER + kickstarter flagship treatment per F-023. Easier to cross-reference; cleaner discoverability for an axis the user has named foundational.

**Section number TBD** in Phase 2 amendment work — likely §14.4 or §14.11; depends on existing §14.X numbering at landing time.

**§14.3 keeps the original struct-field worked example** (for continuity); the new §14.X is the canonical home for the full extension semantics + carve-out rule + error catalog.

### Q7 RATIFICATION — (a) extend channel cells

**User direction:** `a` (Recommended).

**Decision:** Channel cells (state declared inside `<channel>` body) are included in the Approach C extension scope. Lifecycle composes cleanly with channel cell decl shape; closes the surface in one move rather than queuing a separate decision later.

**Channel-specific consideration** for Phase 2 amendment authoring: channel cells have auto-sync semantics (state propagates to all connected clients). A lifecycle annotation on a channel cell means the per-client-replicated value follows the `(A to B)` progression. Worth a worked example showing the sync-and-lifecycle composition.

### Q3 RATIFICATION — (a) extend lifecycle to fn return types

**User direction:** `a` — extend `fn f() -> (not to User)` as valid syntax.

**Decision:** Lifecycle annotation extends to function-return position. The callee returns a lifecycle-tracked value; the caller treats accesses against the pre-transition variant as E-TYPE-001 fires.

**Open Phase 2 sub-question (folds into Landing 2 design work):** what counts as the transition-marker for a returned value? Candidates to surface during Phase 2 implementation design:
- **(α) explicit caller-side transition** — caller writes `transition(u)` or similar to mark the value as having advanced
- **(β) validator-passage transition** — running a validator (e.g., `validate(u)`) on the value transitions it to the post-state automatically (composes with §55 validators)
- **(γ) assignment-to-typed-binding transition** — `let u: User = loadUser(42)` transitions; `let u = loadUser(42)` keeps the lifecycle-tracked type
- **(δ) explicit marker function** — adopter calls `markTransitioned(u, .User)` or similar

NOT ratified at this HU. Surface as Phase 2 design-question during Landing 2 implementation; bring back to HU as needed.

**Use case ratified by Q3=a:** typestate-flavored output contracts. "This function returns a value that needs [transition-marker] before use" is a first-class expressible contract.

### Q4 RATIFICATION — (a) §14.X (type-system) placement; §39 cross-refs

**User direction:** `a` — §14.X (the new "Lifecycle Annotation" subsection per Q6) is the canonical home for the schema-field rule.

**Decision:** The lifecycle-extension-to-schema-fields rule lives in §14.X. §39 cross-references to §14.X for the schema-field case. Schema-specific implications (SQL DDL emission, migration behavior, NULL-vs-NOT-NULL transitions) get documented in §39 as cross-section addendum (the SQL-shape consequences of the §14.X type-system rule).

**Cohesion rationale:** the lifecycle semantics ARE type-system semantics (per-access transition state). Schema-specific implications are downstream consequences. The canonical rule lives where the semantics live; cross-refs handle the localized concerns.

---

## HU-1 SESSION CLOSE — Phase 2 amendment scope crystallized

**All 7 questions ratified. All findings closed.**

| Q | Topic | Ratified |
|---|---|---|
| 1 | Cluster direction | **c** — extend non-engine; carve out engine |
| 2 | Sequencing | **b** — fire first (Landing 1), then extend (Landing 2) |
| 3 | Fn-return lifecycle | **a** — extend (transition-marker mechanism: open Phase 2 sub-question) |
| 4 | Schema-field placement | **a** — §14.X canonical; §39 cross-refs |
| 5 | Engine-cell rejection code | **a** — new `E-TYPE-LIFECYCLE-ON-ENGINE-CELL` |
| 6 | SPEC section placement | **a** — new §14.X "Lifecycle Annotation" subsection |
| 7 | Channel-cell extension | **a** — extend (channel cells included in Approach C scope) |

### Phase 2 amendment scope (3 landings)

**Landing 1 — §14.3 fire FIRST (bug-fix sized, compiler-source):**
- Implement per-access transition-state tracking in `compiler/src/type-system.ts:1444`
- E-TYPE-001 fires per SPEC §14.3 line 7106 (currently unimplemented; article publish-twin acknowledges with status banner)
- Test surface: per-access transition cases against `(passwordHash: not -> string)` current §14.3 example
- File-disjoint with Landing 2; can dispatch independently
- Estimated size: small (per-access transition-state tracking is bounded by existing resolver scope)

**Landing 2 — Approach C extension (SPEC-text + tests):**
- NEW §14.X "Lifecycle Annotation" subsection (canonical home)
- Extension scope: Shape 1 plain reactive cells + function parameters + function returns + schema fields + channel cells
- Carve-out: engine cells with E-TYPE-LIFECYCLE-ON-ENGINE-CELL
- `->` → `to` glyph migration per S129 HU-2 F-024 (folds into this landing)
- §39 cross-ref to §14.X for schema-field case; SQL-shape addendum prose at §39
- Worked examples covering each extension position (5 positions × ~1 example each)
- §14.3 keeps original `passwordHash: (not to string)` worked example for continuity
- Open Phase 2 sub-question: fn-return transition-marker mechanism (α/β/γ/δ candidates) — design within Landing 2; surface back to HU if multi-way deliberation needed

**Landing 3 — canon catch-up (PRIMER + kickstarter flagship sections per F-023):**
- PRIMER new flagship section "Lifecycle Annotation" (comparable prominence to V5-strict §3)
- Kickstarter v2 new flagship section
- Worked examples
- Cross-refs to SPEC §14.X
- Author with full extension scope from Landing 2 in mind; do not author until Landing 2 prose is stable

### Sequencing for the 3 landings

1. Landing 1 (fire first) — IMMEDIATELY dispatchable; bug-fix sized
2. Landing 2 (extension SPEC + tests) — after Landing 1; depends on the working foundation
3. Landing 3 (canon catch-up) — after Landing 2; needs stable SPEC prose to reference

Each landing is its own dispatch (small/medium/medium) with its own commit + test surface.

### Carry-forward (post-HU-1)

- **Q3 fn-return transition-marker sub-question** — surface in Phase 2 Landing 2 implementation design. If multi-way deliberation needed, bring back to HU as Q3-followup.
- **state-dynamics-design DD `status: active`** — the parent DD's other open questions (beyond the extension question this HU closed) remain open. Re-evaluate post-Landing 2.

### Designer-card discipline note

Designer-card option (d on Q1) was offered + not invoked. PA did not propose retirement. Lifecycle annotation arc proceeds with the user's S129 "foundational" framing intact.

### Banked methodology from HU-1

No NEW methodology rule. Re-validation:
- [[feedback_amendment_direction_and_target_explicit]] — every Q ratification names direction + target explicitly per the brakes-pull lesson
- [[feedback_cohesion_and_falls_under_fingers]] — Q5/Q6/Q7 leveraged the cohesion lens directly
- [[feedback_no_greek_chars_in_options]] — ASCII a/b/c throughout

HU-1 closes. Phase 2 dispatch authorization pending USER (or fold into next session's work-block per pace).
