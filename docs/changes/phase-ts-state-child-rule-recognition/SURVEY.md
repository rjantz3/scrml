# SURVEY — TS state-child `rule=` recognition (S75 / Phase 0)

**Date:** 2026-05-09
**Session:** S75
**Worktree:** `.claude/worktrees/agent-a19a090a55016837d`
**Hand-off origin:** S74 close, open question 6 — "TS state-child rule= recognition; ~3-5h survey-first"
**Branch base:** `main` @ `72d691f` (S74 close commit, baseline 10702 / 69 / 1 / 3)

---

## §1 — Bug reproduction (CONFIRMED)

A Phase 0 reproduction harness lives at
`docs/changes/phase-ts-state-child-rule-recognition/repro.test.ts`. The harness
runs `compileScrml({ inputFiles: [<temp .scrml>], write: false, mode: "library" })`
on two minimal cases and inspects the returned `errors` list:

### 1.1 Modern form (FAILS — false-positive)

```scrml
type Phase:enum = { Idle, Loading, Done }

<engine for=Phase initial=.Idle>
  <Idle rule=.Loading></>
  <Loading rule=.Done></>
  <Done rule=.Idle></>
</>
```

Result: **`E-ENGINE-005: Machine 'phase' has no transition rules.`**

This is the bug. The body has three legitimate state-child transitions (per §51.0.B
and §51.0.F), but TS-stage `parseMachineRules` (`compiler/src/type-system.ts:2500`)
sees no `=>` arrow rules and returns `[]`. `buildMachineRegistry` then fires
E-ENGINE-005 at line 2128 of the same file.

### 1.2 Legacy form (PASSES — baseline OK)

```scrml
type Phase:enum = { Idle, Loading, Done }

< machine name=PhaseM for=Phase >
.Idle => .Loading
.Loading => .Done
.Done => .Idle
</>
```

Result: no errors. `parseMachineRules` correctly recognizes the arrow-rule grammar.

---

## §2 — Why this never surfaced before

1. **No modern-form samples.** A repo-wide search
   (`grep -rn "<engine for=" samples/`) returns ZERO hits. All existing samples
   use the legacy `<engine name=X for=Y>` keyword form with arrow-rule bodies
   (the `<engine>` keyword over a legacy body shape — accepted in P1 per §51.3.2
   amendment, line 21394-21412). Sample `samples/compilation-tests/machine-002-traffic-light.scrml`
   is representative.
2. **B15 unit tests only run SYM.** `engine-statechild-b15.test.js` defines
   `runUpToSYM(source)` which executes BS → AST → SYM only — TS is never invoked.
   So the false-positive E-ENGINE-005 is never fired in the B15 test suite even
   though all B15 tests exercise the modern form.
3. **End-to-end engine integration tests don't exist for the modern form.**
   `c12-engine-state-machine-runtime.test.js`, `c14-derived-engines.test.js`,
   `c15-cross-file-engine-mount.test.js` all use the legacy `<engine name= for=>` form.

This is exactly the structural blocker S74 hand-off flagged: the modern form
**can't be exercised end-to-end** until parseMachineRules is fixed.

---

## §3 — parseMachineRules current shape

**Location:** `compiler/src/type-system.ts:2500-2716`
**Caller:** `buildMachineRegistry` at `type-system.ts:2095, 2125`
**Inputs:** `rulesRaw` (the body text inside `<engine>...</>` — same field whether
the keyword was `<machine>` or `<engine>`), governed type, engine name.
**Grammar accepted:** legacy arrow-rule lines only:
- `.From => .To`
- `.From | .B => .To | .D` (alternation, expanded)
- `.From(bindings) => .To(bindings) given (g) [label] { effect }` (full form)
- `* => *`, `* => .X` (wildcards)
- `audit @name` (extracted before rule parsing)

**Behavior on a state-children body:** Lines like `<Idle rule=.Loading></>` don't
match any of the regexes (no `=>`, no `* =>`). They fall through and are silently
skipped (line 2630 `// skip unparseable lines`). `rules` stays empty → caller fires
E-ENGINE-005.

**Downstream consumers of `MachineType.rules` (the array parseMachineRules builds):**

| Consumer | File | Purpose | What happens with empty rules? |
|---|---|---|---|
| `validateDerivedMachines` | type-system.ts:2235 | exhaustiveness check for projection machines | OK (only iterates rules) |
| `emitTransitionTable` | codegen/emit-machines.ts:96 | emit `__scrml_transitions_<Name>` lookup table | Emits an empty `{}` table — runtime guard rejects every transition |
| `emitProjectionFunction` | codegen/emit-machines.ts:192 | emit `_scrml_project_<N>(src)` function for derived machines | Emits empty body |
| `emitReactiveWiring`'s `buildMachineBindingsMap` | codegen/emit-reactive-wiring.ts:212 | bind `@var = X` writes to transition guards | Threads `rules: []` into the binding info |
| Self-host parity tests | various | ensure compiled compiler matches TS reference | Should be unaffected (parity over output, not over `rules`) |

**Net:** if E-ENGINE-005 fires, compilation halts and codegen is never reached.
If we suppress E-ENGINE-005 alone (Option A-naive), codegen would emit an empty
transition table for the modern engine — but the modern engine ALSO has an
independent codegen path through `emit-engine.ts` keyed on
`engineMeta.stateChildren` (already populated by SYM B15). So the empty legacy
table is harmless dead code IF both paths coexist.

---

## §4 — B15's parser (engine-statechild-parser.ts)

**Location:** `compiler/src/engine-statechild-parser.ts`
**Caller:** SYM PASS 11 at `compiler/src/symbol-table.ts:4496` via
`validateEngineStateChildrenAndRules`.
**Grammar accepted:** modern state-child form, including:
- `<Variant rule=.Next>...</>`, `<Variant rule=(.A | .B)>...</>`, `<Variant rule=*>...</>`
- `:`-shorthand body, self-closing form
- `internal:rule=` (§51.0.O)
- `effect=${...}` (§51.0.H)
- `<onTimeout>`, `<onTransition>`, nested `<engine>` inside body
- `history` bare attr, `.Variant.history` target form (§51.0.N)

**Detection of legacy bodies:** `isLegacyArrowRulesBody(rulesRaw)` heuristic — true
iff the body has `=>` AND no `<` followed by an uppercase letter. When true, the
parser returns `[]` (delegates to TS-stage parseMachineRules).

**Output:** `EngineStateChildEntry[]` written to `engineMeta.stateChildren` on the
state-cell record — already consumed by `emit-engine.ts` for codegen.

**Diagnostics fired by SYM PASS 11 (NOT by parseMachineRules):**
`E-ENGINE-STATE-CHILD-MISSING`, `E-ENGINE-STATE-CHILD-INVALID-VARIANT`,
`E-ENGINE-RULE-INVALID-VARIANT`, `E-ENGINE-RULE-LEGACY-SYNTAX`,
`W-ENGINE-INITIAL-MISSING`, `E-ENGINE-INITIAL-INVALID-VARIANT`.

---

## §5 — Discriminator: legacy vs modern

The AST `engine-decl` node (built in `ast-builder.js:8983-9017`) carries the
field `legacyMachineKeyword: boolean` (line 9015). This is true iff the source
opener used `<machine>`, false iff it used `<engine>`. **This is the cleanest
keyword-level discriminator available today.**

However, per §51.3.2 amendment (P1), `<engine>` keyword is allowed over
**either** body shape (legacy arrow OR modern state-children). All existing
"engine" samples in fact use the legacy body shape under the new keyword. So
keyword alone is NOT sufficient — body shape detection is required. B15 already
uses `isLegacyArrowRulesBody(rulesRaw)` for this; we can re-use it.

**Boundary table (the 2x2):**

| Keyword | Body shape | Parser to use |
|---|---|---|
| `<machine>` | legacy arrow | `parseMachineRules` (current) |
| `<engine>` | legacy arrow | `parseMachineRules` (current) — covers all existing samples |
| `<machine>` | modern state-children | impossible? Spec doesn't forbid; B15 will parse it; TS would currently fire E-ENGINE-005 |
| `<engine>` | modern state-children | **the bug** — B15 parses, TS shouldn't fire E-ENGINE-005 |

For the 3rd row (legacy keyword + modern body): per §51.0 line 20249 ("§51.0
is authoritative for v0.next"), this combination is in spec compliance — the
keyword is the surface form, the body shape governs grammar. The fix should
treat it the same as row 4.

---

## §6 — Option matrix

### Option A — body-shape dispatch in parseMachineRules / buildMachineRegistry

**Shape:** in `buildMachineRegistry`, before calling `parseMachineRules`, check
`isLegacyArrowRulesBody(rulesRaw)`. If FALSE (i.e., the body looks like modern
state-children OR is empty / ambiguous), skip the legacy parser entirely:
- Don't call `parseMachineRules`
- Build a `MachineType` registry entry with `rules: []` (or omit rules entirely)
- Don't fire E-ENGINE-005 for empty `rules` (B15 fires the modern-form errors —
  E-ENGINE-STATE-CHILD-MISSING and friends — at SYM time)

Optionally also skip the call when `decl.legacyMachineKeyword === false` AND the
body has any `<` opener (defense-in-depth).

**Pros:**
- Smallest blast radius. Single conditional in `buildMachineRegistry`.
- Preserves `MachineType` as the registry shape (no type churn for downstream).
- Codegen for legacy machines unchanged. Codegen for modern engines already uses
  `engineMeta.stateChildren` via `emit-engine.ts`, so the empty-rules entry is
  effectively harmless / dead.
- B15 already does the keyword-agnostic body detection; we re-use that proven
  helper.

**Cons:**
- The `machineRegistry` map will contain entries with empty rules for modern
  engines. Downstream code that iterates rules and emits things SHOULD already be
  no-op (it iterates an empty list), but every consumer needs spot-check
  verification.
- `emitTransitionTable` will emit `__scrml_transitions_<Name> = {}` for every
  modern engine — clutter, but harmless. Could add a guard to skip emission when
  the entry is from a modern-form engine; orthogonal.

**Estimated effort:** ~1.5h implementation + tests. ~5-10 tests added.

### Option B — full modern-form parser inside parseMachineRules

**Shape:** extend `parseMachineRules` to detect state-children, parse them via
`parseEngineStateChildren`, convert each `EngineStateChildEntry` to a
`TransitionRule` (one per `rule=` target — multi-target expands to N rules).

**Pros:**
- Single registry contains real rules for all engines. Downstream codegen could
  potentially share a unified path (some day).
- Diagnostics like exhaustiveness would have a single source of truth (TS stage).

**Cons:**
- Duplicates B15's parser work — the conversion shape is non-trivial because
  EngineStateChildEntry ≠ TransitionRule (different fields, different validation
  semantics, no `effectBody` mapping for `effect=` attrs, etc.).
- Re-fires SYM-stage diagnostics at TS stage as duplicates (unless we suppress).
- Bigger blast radius: new TS-stage validation paths can introduce regressions
  in existing tests.
- Violates Pillar-5 (per-kind code paths) by collapsing two grammars into one
  TS-stage function.

**Estimated effort:** ~4-6h. ~+15-20 tests, possible regressions in existing
E-ENGINE-* tests.

### Option C — refactor to read engineMeta directly in TS

**Shape:** TS stage's `buildMachineRegistry` reads `engineMeta.stateChildren`
(populated by SYM PASS 11) for modern engines and falls back to
`parseMachineRules` for legacy engines.

**Pros:**
- Cleanest separation of concerns: TS no longer owns parsing the modern form.
- Single source of truth for state-child shape (B15's parser).

**Cons:**
- **Order-of-passes problem.** SYM runs AFTER BS+AST but BEFORE TS in today's
  pipeline (per `compiler/PIPELINE.md`). TS would need to either (a) read the
  SYM annotation that's already there, or (b) wait until SYM runs. Today
  buildMachineRegistry is invoked from runTS which runs after SYM, so the
  annotation IS available — but the wiring (engine-decl AST node carries
  `_record._engineMeta.stateChildren` ONLY if SYM ran successfully) needs verifying.
- Bigger refactor — the `MachineType.rules` field would need to be made optional
  or replaced for modern engines, and downstream codegen needs a separate path
  for modern engines (which already exists via `emit-engine.ts`).
- Pulls SYM-shaped data into TS-shaped types — type cohesion concern.

**Estimated effort:** ~3-4h + audit of all `MachineType.rules` consumers. ~+10
tests.

### Option D — mark engine-decl with body shape during AST build

**Shape:** ast-builder detects body shape (using `isLegacyArrowRulesBody`-like
logic) at parse time and sets `engine-decl.bodyShape: "legacy" | "modern"`. TS
buildMachineRegistry dispatches on this field.

**Pros:**
- Single classification, surfaced once at AST time.
- Both TS and SYM can dispatch on the same field (deduplicates the heuristic).

**Cons:**
- Adds a third call-site for the same heuristic (currently in B15 only). Could
  argue this is the right unification, but it's a wider edit than Option A.
- AST-builder.js is JS; the heuristic would land there in JS form (already in
  TS in B15). Minor maintenance friction.

**Estimated effort:** ~2-3h. Strictly larger than Option A.

---

## §7 — Recommendation

**Option A — body-shape dispatch in buildMachineRegistry.**

**Justification per pa.md Rule 4 (spec is normative):**
- §51.0 (line 20249) is authoritative for `<engine>` over the modern form. B15's
  parser is the single SPEC-aligned implementation of §51.0.B + §51.0.F state-child
  parsing. TS-stage parseMachineRules is the single implementation of §51.3.2's
  legacy arrow-rule grammar.
- The two grammars are NORMATIVELY distinct: §51.0 vs §51.3 / §51.9. Body-shape
  dispatch reflects this in code; mixing them (Option B) would violate the
  normative split.
- B15 already classifies bodies via `isLegacyArrowRulesBody`. Re-using that
  helper in TS gives us one heuristic rather than two.
- All existing samples and tests are legacy-form — Option A doesn't disturb
  them. Modern-form gets new tests in Phase 1+ (we have zero today).

**Why NOT Option C:** the `MachineType.rules`-shaped registry is consumed by
multiple codegen paths (emit-machines.ts, emit-reactive-wiring.ts) that work
correctly today for legacy. Forcing a shape change for modern engines means
either type churn or code-path duplication; emit-engine.ts already covers the
modern path on `engineMeta`. Option A leaves codegen alone.

**Why NOT Option B:** duplicates B15's work, broadens the TS-stage error surface,
and violates Pillar-5. The bug is a missing dispatch, not a missing parser.

**Why NOT Option D:** the heuristic is already in B15. Centralizing into AST
builder is a cleanup ticket of its own; this dispatch is orthogonal and Option
A unblocks today's S75 work without that cleanup.

---

## §8 — Phase 1 implementation outline (subject to PA approval)

### Files to modify

1. **`compiler/src/type-system.ts`** — `buildMachineRegistry` (lines ~2012-2148):
   - Import `isLegacyArrowRulesBody` from `./engine-statechild-parser`.
   - Before each `parseMachineRules` call, check the body shape. For modern
     bodies: skip `parseMachineRules`, register a `MachineType` entry with
     `rules: []`, and DO NOT fire E-ENGINE-005 (B15 fires shape-specific
     errors at SYM stage).
   - Same logic for both the projection (`isProjection: true`) and non-projection
     paths.
   - Treat empty `rulesRaw` as legacy (current behavior — fire E-ENGINE-005)
     since an empty `<engine>` body is genuinely an error.

2. **NEW samples** under `samples/compilation-tests/`:
   - `engine-modern-001-basic.scrml` — minimal 3-variant modern engine, expects
     successful compile (no errors).
   - `engine-modern-002-multi-target.scrml` — uses `rule=(.A | .B)`.
   - Possibly `engine-modern-003-with-effect.scrml` if §51.0.H codegen is
     ready (B17.4 SHIPPED per S74 close).

3. **NEW unit test** at `compiler/tests/unit/engine-modern-form-ts.test.js`:
   - Modern-form engine through full TS pipeline → no E-ENGINE-005.
   - Modern-form engine with empty body → still fires E-ENGINE-005.
   - Legacy `<machine>` form regression: still fires E-ENGINE-005 on empty body,
     parses arrow rules correctly.
   - `<engine>`-keyword-with-legacy-body regression (existing samples): still
     parses correctly via parseMachineRules.

### Estimated test-delta

`+8 to +12` new tests passing. `0` existing-test regressions expected (Option A
only changes a guard, doesn't touch existing legacy code paths).

### Estimated time

`~1-1.5h` for the type-system.ts edit + samples + test. Below the S74 hand-off
estimate of 3-5h, due to **depth-of-survey discount**: the survey revealed B15
already does most of the work and we just need to wire one dispatch.

---

## §9 — Open items for PA decision

1. **Authorize Option A?** Or surface concerns about the empty `MachineType`
   registry entry approach?
2. **Sample placement.** New modern-form samples under
   `samples/compilation-tests/` is the standard location; happy to follow the
   `modern-NNN-*` naming convention there.
3. **`<engine>` keyword over LEGACY body shape — keep as legacy parsing path?**
   Per §5 boundary table (row 2), all existing tests/samples are this case.
   Recommend KEEP — `parseMachineRules` continues to be the home for arrow-rule
   grammar regardless of opener keyword. Body-shape, not keyword, dispatches.
4. **Codegen `__scrml_transitions_<Name> = {}` clutter for modern engines.**
   Cosmetic. If desired, `emit-reactive-wiring.ts:310-323` can be guarded to skip
   modern engines (where `machine.rules.length === 0` AND a sibling
   `engineMeta.stateChildren.length > 0`). Orthogonal — defer to follow-up.

---

## §10 — Architectural concerns surfaced (per HARDLY-EVER §3)

- **Pillar-5 (per-kind code paths) is honored, not violated.** parseMachineRules
  serves §51.3 / §51.9 legacy grammar. parseEngineStateChildren serves §51.0.B/F
  modern grammar. Today both pass through `buildMachineRegistry` because
  `engine-decl` is a single AST kind covering both keywords/forms. The fix adds
  a body-shape dispatch INSIDE that single entry-point — preserving the unified
  AST kind while routing each form to its dedicated parser. This matches the
  primer §13.7 B14/B15 specifics ("legacy form is parseMachineRules' territory;
  B15 handles the new form").

- **No Pillar violation requires SPEC amendment.** §51.0 already establishes
  authority over `<engine>` modern form; §51.3 establishes authority over the
  legacy `<machine>` form. The fix aligns code with the existing spec.

- **No spec amendments expected.** The bug is a code-side coverage gap, not a
  spec gap.

---

## §11 — Phase 0 STOP point — deliverables

- This SURVEY.md (the recommendation document)
- `progress.md` (sibling — running log)
- `repro.test.ts` (reproduction harness — diagnostic, not a regression test)

PA review the recommendation, then approve / amend / reject Option A.
