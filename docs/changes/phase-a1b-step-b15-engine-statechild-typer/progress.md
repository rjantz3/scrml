# Phase A1b Step B15 — engine state-child exhaustiveness + rule= typer + initial= validation

## Timeline

### 2026-05-07 — Dispatch start

- WORKTREE_ROOT: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aff4e842d01a75044`
- Branch: `phase-a1b-step-b15-engine-statechild-typer`
- Base: rebased onto local `main` HEAD `556f540` (B14 brief updates; B14 SHIP `934100e`).
- Baseline tests: 9357 pass / 52 skip / 1 todo / 0 fail (after one transient ECONNREFUSED retry on serve.test.js — flaky network test, not B14-related).
- Read: BRIEF.md (full), audit `docs/audits/a1b-b15-rule4-audit-2026-05-07.md`, primer §13.7 B14 row + specifics, SPEC §51.0.B/E/F/G.

## Phase 0 — Survey

Mandatory survey gate (per BRIEF §7).

### (a) §51.0.F-vs-primer-§7 syntax reconciliation

Primer §7 was corrected at S67 (commit `53825da`) to use the canonical §51.0.F three target-only forms. SPEC amendment landed at `1de05ef` codifying the three forms. Audit was written before primer correction landed; per audit §0 + §4 the three target-only forms are CANONICAL. **Decision: B15 validates against §51.0.F three forms ONLY. Event-arrow form `event -> Variant` is legacy `<machine>` syntax (§51.3) and is rejected on `<engine>` state-children.**

### (b) §34 catalog rows (canonical naming + presence)

Existing catalog rows (verified at compiler/SPEC.md):

| Code | Row exists? | Section |
|---|---|---|
| E-ENGINE-INVALID-TRANSITION | YES (line 14230) | §51.0.F, §51.0.G — Runtime |
| E-ENGINE-EFFECT-AMBIGUOUS | YES (14231) | §51.0.H |
| E-ENGINE-VAR-DUPLICATE | YES (14232) | §51.0.C |
| W-ENGINE-INITIAL-MISSING | YES (14233) | §51.0.E |
| E-DERIVED-ENGINE-NO-RULES | YES (14234) | §51.0.J — B16 territory |
| E-DERIVED-ENGINE-NO-INITIAL | YES (14235) | §51.0.J — B16 territory |
| E-ENGINE-MOUNT-NOT-ENGINE | YES (14240) | S68 — A1b B14 |

**MISSING (B15 must add):**

| Code | Section | Purpose |
|---|---|---|
| E-ENGINE-STATE-CHILD-MISSING | §51.0.B, §51.0.F | A variant of the engine's `for=Type` has no matching state-child tag in the engine body. |
| E-ENGINE-STATE-CHILD-INVALID-VARIANT | §51.0.B | A state-child tag does not match any variant of the engine's `for=Type`. |
| E-ENGINE-INITIAL-INVALID-VARIANT | §51.0.E | `initial=.X` references a variant `.X` that is not in the engine's `for=Type` variants. |
| E-ENGINE-RULE-INVALID-VARIANT | §51.0.F | `rule=.X` (or `rule=(.X | .Y)`) references a variant not in the engine's `for=Type` variants. |
| E-ENGINE-RULE-LEGACY-SYNTAX | §51.0.F | A `rule=` value uses the legacy event-arrow form (`event -> Variant`); only §51.0.F three target-only forms are allowed on `<engine>`. |

Compile-time E-ENGINE-INVALID-TRANSITION (statically-known from-state writes) IS in §34 already; B15 fires it COMPILE-TIME when a write inside a state-child body violates the from-state's rule= set.

### (c) Compile-time E-ENGINE-INVALID-TRANSITION fire site

Per audit §1.4 + brief #5 — B15's territory. Walker checks: inside a state-child body, every direct write to the engine variable (`@engineCell = .X`) and every `.advance(.X)` MemberCall against the engine variable. Validates against the surrounding state-child's `rule=` set. Out-of-state-child writes are deferred to runtime. **Critical caveat:** state-children today are stored as raw text in `engine-decl.rulesRaw`, not walkable AST nodes. B15 must parse them out of rulesRaw to obtain (a) the state-child name (variant tag), (b) the rule= attribute, (c) the body text — which itself is not directly walkable (currently raw). For statically-known-from-state write checks, the body must contain ExprNodes; raw text is insufficient. **Decision: B15 parses rulesRaw structurally enough to extract state-child tags + rule= attributes + initial= validation. The compile-time E-ENGINE-INVALID-TRANSITION fire site for direct writes inside state-child bodies is RECORDED but not yet WALKED — body content is still raw text. For now, B15 fires E-ENGINE-INVALID-TRANSITION ONLY where the AST already exposes writes against the engine variable; that emerges from the existing `_resolvedStateCell` annotations (B3) on `@engineVar` IdentExprs. Deferred parts are documented under "DEFERRED ITEMS".**

### (d) `_engineMeta.variants` reliability

B14 left `variants: []` (empty). B14 specifics §659 explicitly says "B15 populates from type-system". B15 must look up the engine's `for=Type` in the typeRegistry to obtain variants. Two options:

- **Option A (preferred):** B15 walker reads typeRegistry for the file (passed in or resolved during walker construction). Populates `engineMeta.variants` AT THE START of B15's walker, then performs validation. Subsequent passes (B16+, A1c) read from `_engineMeta.variants` directly.
- **Option B:** B15 walker calls into typeRegistry on every check site. Less efficient.

Decision: **Option A** — populate `_engineMeta.variants` once at walker entry per engine, then validate.

### Survey close

Approach commits: B15 implements PASS 11 (next available walker pass after B14's 10.A/10.B) which:

1. Pre-populates `engineMeta.variants` from typeRegistry.
2. Validates `initial=` (W-ENGINE-INITIAL-MISSING / E-ENGINE-INITIAL-INVALID-VARIANT). Skips derived engines (B16 owns).
3. Parses rulesRaw structurally to extract state-children + rule= attributes.
4. Validates state-child exhaustiveness (E-ENGINE-STATE-CHILD-MISSING / -INVALID-VARIANT).
5. Validates rule= forms per §51.0.F (E-ENGINE-RULE-INVALID-VARIANT / -LEGACY-SYNTAX).
6. Compile-time E-ENGINE-INVALID-TRANSITION for statically-known writes — currently DEFERRED until state-child bodies are walkable AST nodes (parser limitation; same as B14's E-COMPONENT-ENGINE-SCOPE deferral pattern).

§34 catalog rows are added in this dispatch.

## Implementation

### 2026-05-07 — Implementation complete

**Commits (in order):**

1. `WIP(b15): progress.md — Phase 0 survey complete` — `d0c385b`
2. `WIP(b15): add §34 catalog rows` — `0186c26`
3. `feat(b15): PASS 11 walker — engine state-child exhaustiveness + rule= typer + initial= validation` — `21936e1`
4. `test(b15): add 43 unit tests for engine-statechild-parser + PASS 11 walker` — `28c5aea`

**Files touched:**

- `compiler/SPEC.md` — added 5 §34 catalog rows (E-ENGINE-STATE-CHILD-MISSING, E-ENGINE-STATE-CHILD-INVALID-VARIANT, E-ENGINE-INITIAL-INVALID-VARIANT, E-ENGINE-RULE-INVALID-VARIANT, E-ENGINE-RULE-LEGACY-SYNTAX).
- `compiler/src/engine-statechild-parser.ts` — NEW. Structural parser for `engine-decl.rulesRaw` extracting state-children + rule= forms. Handles single-target / multi-target / wildcard / legacy-arrow / parse-error / `:`-shorthand / explicit-closer / self-close / nested grouping with paren tracking.
- `compiler/src/symbol-table.ts` — extended `EngineMetadata` interface with `stateChildren?: EngineStateChildEntry[]` field; new types `EngineRuleForm` + `EngineStateChildEntry`. New PASS 11 walker (`walkValidateEngineStateChildrenAndRules`) wired into `runSYM` after PASS 10.B. New helpers `parseEnumVariantNamesFromRaw`, `getEnumVariantsFromTypeDecls`, `validateEngineStateChildrenAndRules`, `fireB15Diagnostic`.
- `compiler/tests/unit/engine-statechild-b15.test.js` — NEW. 43 tests covering parser unit tests + PASS 11 walker integration.

**Key implementation choices (per Phase 0 + audit):**

- **Variant lookup via `ast.typeDecls[]`** (not type-system registry — TS runs after SYM). Inline `parseEnumVariantNamesFromRaw` because `meta-checker.ts:parseEnumVariantsFromRaw` only splits on `|`, missing the canonical `,` / `\n` separators per SPEC §14.4 + `type-system.ts:parseEnumBody`. Local helper handles `transitions { ... }` block stripping.
- **State-child parser uses balanced opener/closer matching** with paren-depth + quote tracking + `${...}` interpolation skip. Self-closing tags (`<Tag/>`) recognized; explicit closers (`</>`, `</Tag>`) recognized; `:`-shorthand body recognized at parser level (BS support pending). Nested PascalCase tags increment depth correctly.
- **Legacy arrow-rule body skip** — `isLegacyArrowRulesBody` heuristic (no `<Uppercase` opener AND has `=>`) returns empty state-child list, preserving B14 test compatibility.
- **Variant set fallback** — when `engineMeta.variants === []` (type unresolved / unknown / struct), B15 SKIPS exhaustiveness + variant-membership checks but still fires structural diagnostics (legacy-arrow, parse-error). `initial=` validation runs independently of variants when initialVariant is null (W-ENGINE-INITIAL-MISSING fires regardless of variant resolution).
- **Variants populated by B15** — B14 explicitly leaves `variants: []`; B15 populates ONCE at walker entry per engine. Downstream (B16, A1c) reads from `engineMeta.variants` directly.

**Test delta:** 9357 → 9400 pass (+43). 52 skip / 1 todo / 0 fail unchanged.

## DEFERRED ITEMS (per BRIEF §6 + audit §1.4)

1. **Compile-time E-ENGINE-INVALID-TRANSITION for direct writes inside state-child bodies** (BRIEF §4 — point #4). Today's AST stores state-child bodies as raw text (per primer §13.7 B14 specifics); the body-walking dispatch needed to detect `@engineCell = .Variant` or `@engineCell.advance(.X)` writes is structurally absent. Once state-child bodies become walkable AST nodes (parser tightening — likely a B17 or A5 dispatch), the same PASS 11 walker can dispatch on the engine variable's `_resolvedStateCell` annotation inside each state-child body. The walker shape is ready — `engineMeta.stateChildren[].rule` carries the `from-state.rule` set per state-child. **NEW §34 catalog row already exists** — E-ENGINE-INVALID-TRANSITION (line 14230) is the runtime+compile-time umbrella; B15 records it in §34 as Runtime-tier; the compile-time fire would extend the existing row.

2. **`:`-shorthand body parsing in block-splitter / ast-builder** (BRIEF §1, primer §51.0.I, Move 15). The state-child parser already handles `:`-shorthand correctly (verified by parser-level tests); BS currently DROPS engine blocks containing `:`-shorthand bodies. Since BS doesn't even recognize the engine, B15 never sees these state-children. Tests in `engine-statechild-b15.test.js` use the explicit-closer form (`<X rule=.Y></>`) which BS DOES support. When BS gains `:`-shorthand support, the existing PASS 11 walker handles it without modification.

3. **`I-ENGINE-RULE-WILDCARD-USED` info-level note** (BRIEF §1, audit §1.4). Marked as optional in the brief; primer §7 doesn't require. Not implemented to avoid noise; can be added without walker changes.

4. **Effect= ambiguity / `<onTransition>` validation** (BRIEF §"OUT OF SCOPE"). B17 territory.

5. **Derived-engine specific rejections** (BRIEF §5). B16 owns E-DERIVED-ENGINE-NO-RULES, E-DERIVED-ENGINE-NO-INITIAL, E-DERIVED-ENGINE-NO-WRITE, E-DERIVED-ENGINE-CIRCULAR.

## OPEN QUESTIONS

None blocking. The §51.0.F-vs-primer-§7 reconciliation flagged in audit §4 was resolved at S67 (`53825da`); §51.0.F three target-only forms are canonical.

---

## FINAL REPORT (per BRIEF.md §"REPORTING")

### 1. WORKTREE_PATH
`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aff4e842d01a75044`

### 2. FINAL_SHA
`8e1bab7` (branch `phase-a1b-step-b15-engine-statechild-typer`)

Commits in chronological order (`main..HEAD`):
- `d0c385b` — WIP(b15): progress.md — Phase 0 survey complete
- `0186c26` — WIP(b15): add §34 catalog rows
- `21936e1` — feat(b15): PASS 11 walker
- `28c5aea` — test(b15): add 43 unit tests for engine-statechild-parser + PASS 11 walker
- `8e1bab7` — docs(b15): primer §13.7 B15 row + specifics block + SURVEY.md + progress.md

### 3. FILES_TOUCHED (full paths from repo root)
- `compiler/SPEC.md` (5 §34 catalog rows added: E-ENGINE-STATE-CHILD-MISSING, E-ENGINE-STATE-CHILD-INVALID-VARIANT, E-ENGINE-INITIAL-INVALID-VARIANT, E-ENGINE-RULE-INVALID-VARIANT, E-ENGINE-RULE-LEGACY-SYNTAX)
- `compiler/src/engine-statechild-parser.ts` — NEW, 385 lines (parseRuleAttrValue, isLegacyArrowRulesBody, parseEngineStateChildren + helpers)
- `compiler/src/symbol-table.ts` — extended (EngineMetadata new fields, EngineRuleForm + EngineStateChildEntry types, PASS 11 walker, helpers)
- `compiler/tests/unit/engine-statechild-b15.test.js` — NEW, 524 lines, 43 tests
- `docs/PA-SCRML-PRIMER.md` — §13.7 B15 row + specifics block
- `docs/changes/phase-a1b-step-b15-engine-statechild-typer/SURVEY.md` — NEW
- `docs/changes/phase-a1b-step-b15-engine-statechild-typer/progress.md` — implementation log
- `bun.lock` — unrelated dependency lock-file delta (3 lines, not a B15 file delta)

### 4. TEST_DELTA
- Pre-B15 baseline (post-rebase to `556f540`): 9357 pass / 52 skip / 1 todo / 0 fail
- Post-B15 final: 9400 pass / 52 skip / 1 todo / 0 fail
- **Delta: +43 / +0 / +0 / +0**
- Pre-commit subset: 8675 → 8718 (+43)

### 5. DEFERRED_ITEMS
1. **Compile-time E-ENGINE-INVALID-TRANSITION for direct writes inside state-child bodies** — bodies are raw text today (parser limitation per primer §13.7 B14 specifics). Walker shape ready; deferral pattern matches B14's E-COMPONENT-ENGINE-SCOPE.
2. **`:`-shorthand body parsing in block-splitter** — parser-level support already in `parseEngineStateChildren`; BS support pending.
3. **`I-ENGINE-RULE-WILDCARD-USED` info-level note** — optional per BRIEF/audit; not implemented to avoid noise.
4. **Effect= ambiguity / `<onTransition>` validation** — B17 territory.
5. **Derived-engine specific rejections** (E-DERIVED-ENGINE-NO-RULES, E-DERIVED-ENGINE-NO-INITIAL, E-DERIVED-ENGINE-NO-WRITE, E-DERIVED-ENGINE-CIRCULAR) — B16 territory.

### 6. OPEN_QUESTIONS
None blocking.

### 7. PRIMER §13.7 B15 ROW DRAFT + B15 specifics block
LANDED in this dispatch (commit `8e1bab7`). Row + 8-bullet specifics block per primer convention.

### 8. SURVEY-NOTE
LANDED at `docs/changes/phase-a1b-step-b15-engine-statechild-typer/SURVEY.md` (commit `8e1bab7`).

### 9. SPEC-PROSE FOLLOW-UPS
- 5 NEW §34 catalog rows added (commit `0186c26`); placed in §34 between E-ENGINE-MOUNT-NOT-ENGINE and E-HISTORY-NO-INNER-ENGINE.
- E-ENGINE-INVALID-TRANSITION (existing line 14230) marked Runtime-tier; compile-time coverage extends the same row when the state-child-body parser tightening lands.
- §51.0.F three target-only forms confirmed canonical (audit §4 resolution from S67).

### Methodology check (Rule 1-4)
- Rule 1 (no marketing) ✓
- Rule 2 (production fidelity) ✓ — proper diagnostics with §-references + remediation hints; NOT MVP placeholders.
- Rule 3 (right answer) ✓ — chose local `parseEnumVariantNamesFromRaw` helper to avoid SYM-vs-TS pipeline ordering issue; chose to PARSE rulesRaw structurally rather than wait for parser tightening.
- Rule 4 (spec normative) ✓ — verified §51.0.E + §51.0.F line numbers via grep; reconciled audit §1.1 drift via S67's primer correction; carried "three target-only forms" canonically through error messages, types, and tests.
- No `--no-verify` used; pre-commit passed all 5 commits.
