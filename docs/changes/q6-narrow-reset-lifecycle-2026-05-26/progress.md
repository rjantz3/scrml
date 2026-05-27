# Q6-narrow — `reset(@cell)` × lifecycle (SPEC §6.8.3)

**Scope.** Extend the B-prereq Shape 1 per-access lifecycle tracker so that `reset(@cell)` and `reset(@cell.field)` calls revert / maintain per-access transition state per the symmetric reset semantic ratified in SPEC §6.8.3.

**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a4e2d60c93cd06bd2`
**Branch:** `worktree-agent-a4e2d60c93cd06bd2`
**Base SHA:** `3a660c7c` (S134 close, B-prereq landed).

---

## 2026-05-26 — Phase 0 startup verification (PASS)

- `pwd` → `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a4e2d60c93cd06bd2`
- `git rev-parse --show-toplevel` matches.
- `git status --short` clean.
- `bun install` — 204 packages installed.
- `bun run pretest` — 13 test samples compiled.

## 2026-05-26 — Phase 0 mandatory reading (DONE)

1. `.claude/maps/primary.map.md` (full) — route is "Lifecycle annotation work"; error.map + schema.map + structure.map identified as load-bearing maps for new diagnostics. Watermark on map content acknowledged STALE (B-prereq landings are post-watermark).
2. `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` (full) — Ghost-pattern table covers `null`/`undefined`-eradication; `default=not` canonical; lifecycle `to` glyph (not `->`); use `not` for absence. Important for synthetic reproducers.
3. `docs/articles/llm-kickstarter-v2-2026-05-04.md` — NOT read (Q6-narrow does not generate idiomatic samples; tests use direct-AST construction or minimal canonical sources per B-prereq pattern). [DEFERRED — read if a reproducer-shape question arises.]
4. SPEC §6.8.3 (lines 5177-5222) — DESIGN CONTRACT. Three normative bullets:
   - Written value satisfies pre-type A → revert per-access state to `pre`
   - Written value satisfies post-type B → set/keep per-access state to `post`
   - Neither → existing type error from §14.12 (no NEW diagnostic from Q6-narrow)
   - Cancel-then-apply ordering: revert applies AFTER the write.
   - Worked examples: presence (`(not to User)` + `reset` writes `not`); composition w/ default= matching pre-type; composition w/ default= matching post-type (unusual but legal — stays post).
5. SPEC §14.12 (lines 7921-8210, FULL) — Lifecycle annotation surface. §14.12.10 normative bullet 5 (line 8206) ratifies §6.8.3 reset reciprocally. §14.12.6 hybrid mechanism: presence-progression discrimination IS transition; variant-progression requires explicit `transition()`.
6. SPEC §6.8.1 (5115-5139) — `default=` attribute. Evaluated at RESET TIME, not declaration time. `default=not` canonical absence; cell may carry arbitrary expressions including cross-cell refs.
7. SPEC §6.8.2 (5140-5176) — `reset(@cell)` keyword semantics. RESERVED IDENTIFIER. E-RESET-INVALID-TARGET for non-canonical shapes. Multi-level compound nav (`reset(@a.b.c)`) per B22 ratification. Cancel-then-apply ordering precedent (vs `debounced=`/`throttled=` pending timers).
8. `docs/changes/b-prereq-shape1-lifecycle-tracker-2026-05-26/progress.md` (FULL, 374 lines) — B-prereq architecture + handoff. The closing handoff (lines 359-373): "Q6-narrow just adds the reset-recognition path (likely `reset-call` AST node detection in the walker, similar to the `transition(x)` call detection in checkLifecycleBindingAccess)."
9. `compiler/src/type-system.ts` line anchors (POST-B-prereq, current SHA):
   - line 13447 — `checkLifecycleFieldAccess` (struct-field tracker; load-bearing for multi-level `reset(@u.field)` on struct-typed Shape 1)
   - line 13774 — `collectStructBindings` (state-decl-aware per B-prereq Sub-Pass 2.a)
   - line 13913 — `collectStateDeclStructBindings` (B-prereq new)
   - line 14299 — `checkLifecycleBindingAccess` (the unified walker; the cell-value tracker reuses this)
   - line 14339 — `TRANSITION_CALL_RE` (call-recognition regex SHAPE template for RESET_CALL_RE)
   - line 14385 — `classifyWriteAgainstSpec` (load-bearing; classifies a written value against the lifecycle spec; returns "pre" / "post" / null) — exactly what we want for the reset-value classification
   - line 14412 — `readNodeInitText` (init-text extractor, local to checkLifecycleBindingAccess)
   - line 14455 — `processStatementText` (per-statement walker; transition is Pass 1)
   - line 14965 — `buildCellValueLifecycleMap` (cell-value tracker, B-prereq Sub-Pass 2.b)
   - line 15021 — `readNodeInitText` (module-scope variant used by buildCellValueLifecycleMap)
   - line 15088 — `runCellValueLifecycleAccessCheck` (orchestrator)
10. `compiler/tests/unit/lifecycle-shape1-tracker.test.js` — 25-test scaffold; same direct-AST construction pattern Q6-narrow tests will follow.


## 2026-05-26 — Phase 0 empirical verification (DONE — gap CONFIRMED, no STOPs)

Probes at `/tmp/q6-narrow-probes/`. Two driver layers:
- `probe.js` — drives `compileScrml({write:false})` end-to-end over a .scrml file.
- `test-style-probe.js` — calls `checkLifecycleBindingAccess` directly with hand-crafted AST (mirrors `lifecycle-shape1-tracker.test.js` pattern, the same fixture surface Q6-narrow tests will use).

### Probe 1 — presence-progression reset reverts (HEADLINE GAP) — CONFIRMED

```scrml
type User:struct = { id: number, name: string }
<state>: (not to User) = not
${ @state = { id: 1, name: "Alice" } }   // pre → post
${ @state.name }                          // OK (post)
${ reset(@state) }                        // SHOULD revert to pre per §6.8.3
${ @state.name }                          // SHOULD fire E-TYPE-001
```

**Empirical: 0 errors, 0 warnings.** Per §6.8.3 bullet 1: reset writes `not` (re-evaluated init since no `default=`), the value satisfies pre-type → revert to pre → second read SHOULD fire E-TYPE-001. **CONFIRMED HEADLINE GAP.**

Direct-walker confirmation via `test-style-probe.js` Test Case 1: 0 errors today; expected 1 error after Q6-narrow.

### Probe 2 — presence-progression reset to post-type value stays post

```scrml
type User:struct = { id: number, name: string }
<state default={id:2, name:"Default"}>: (not to User) = not
${ @state = { id: 1, name: "Alice" } }   // pre → post
${ reset(@state) }                        // writes default ({id:2,name:"Default"} → post-type) → stays post
${ @state.name }                          // SHOULD NOT fire (post)
```

**Empirical (today): 0 errors.** After Q6-narrow: SHOULD STILL be 0 errors (reset value is User-shaped → stays post). Verifies no false-fire from Q6-narrow on the post-to-post case.

Note: today the read after a write-then-reset already shows 0 because reset is a no-op for the tracker. Post-Q6-narrow this exact case stays 0 because the reset value matches post-type — different reason, same outcome.

### Probe 3 — variant-progression reset (qualified enum) — qualified-stripping gap surfaces

```scrml
type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }
<phase>: (Article.Draft to Article.Published) = Article.Draft
${ @phase = Article.Published("body", 1234); transition(@phase); @phase.publishedAt }
${ reset(@phase) }
${ @phase.publishedAt }
```

**Empirical (today): 2 E-TYPE-001 fires with `(asIs to asIs)` annotation.** The qualified-enum stripping bug (B-prereq's surfaced follow-up #3) defeats the variant tracker on Shape 1. The walker today reports pre/post types as `asIs` (placeholder) — variant-progression reset cannot be empirically verified through the .scrml driver path. **Per B-prereq scope inheritance, Q6-narrow tests for variant-progression use direct-AST construction (bypassing the qualified-stripping gap).**

This is OUT OF SCOPE for Q6-narrow — surfaced for follow-on.

### Probe 4 — struct-typed Shape 1 with lifecycle on FIELD, multi-level `reset(@u.field)`

```scrml
type User:struct = { id: number, email: string, passwordHash: (not to string) }
<u>: User = { id: 1, email: "a@b.com", passwordHash: not }
${ @u.passwordHash = "hashed" }            // field transition: pre → post (B-prereq path)
${ @u.passwordHash }                       // OK (post)
${ reset(@u.passwordHash) }                // SHOULD revert field state to pre (re-eval init = not)
${ @u.passwordHash }                       // SHOULD fire E-TYPE-001
```

**Empirical (today): 0 errors.** Multi-level reset on a struct field with lifecycle annotation is unrecognized by the struct-field walker too. **CONFIRMED MULTI-LEVEL GAP.**

### Probe 5 — regression baseline (B-prereq tracker still fires correctly)

Probe 5a (cell-value presence, no reset): 1 E-TYPE-001 ✓
Probe 5b (struct-typed Shape 1 field, no reset): 1 E-TYPE-001 ✓

B-prereq tracker confirmed working as-shipped. Q6-narrow MUST NOT regress.

### Reset AST shape

Per `expression-parser.ts:1645-1705` (read in full), `reset(@cell)` parses to:
```
{ kind: "reset-expr", target: ExprNode, span, [diagnostic?: { code, message }] }
```

Wrapped in a `bare-expr` carrying `expr: "reset(@cell)"` and `exprNode: ResetExpr`.

The text-level walker `processStatementText` sees the `expr` string `"reset(@cell)"` or `"reset(@cell.field)"`. The Q6-narrow detection layer can be text-based via a `RESET_CALL_RE` regex mirroring `TRANSITION_CALL_RE`:

```js
const RESET_CALL_RE = /\breset\s*\(\s*@([A-Za-z_$][A-Za-z0-9_$]*)((?:\s*\.\s*[A-Za-z_$][A-Za-z0-9_$]*)*)\s*\)/g;
```

Regex probe (`probe-stmt-text.js`) verified matches for all canonical shapes:
- `reset(@state)` → `cellName=state, fieldPath=[]`
- `reset(@u.passwordHash)` → `cellName=u, fieldPath=["passwordHash"]`
- `reset(@a.b.c)` → `cellName=a, fieldPath=["b","c"]`
- `reset(  @state  )` → whitespace-tolerant
- Multi-statement single bareExpr: `{ reset(@state); @state.name }` matches at correct index.

### STOP gate check — NO STOPs triggered

- Headline gap is empirically confirmed.
- Plumbing layer (processStatementText, classifyWriteAgainstSpec, readNodeInitText) is in place per B-prereq's handoff.
- Reset AST shape is structured (`reset-expr` with `target` ExprNode); text-level detection via regex works for all canonical shapes; structural-level detection via `kind === "reset-expr"` is an option.
- Multi-level case for struct-typed Shape 1 (Probe 4) — also confirmed gap; tracker is the struct-field tracker at line 13447 (`checkLifecycleFieldAccess`), NOT the cell-value tracker (the cell `u` is User-typed; lifecycle is on the FIELD `passwordHash`). Q6-narrow must touch BOTH trackers.

**PROCEED to Phase 1 architecture.**

## 2026-05-26 — Phase 1 architecture proposal

### Choice: Option α — Additive Pass in `processStatementText` + Multi-level Field Pass in struct-field walker

Per PA lean. Mirrors the existing `TRANSITION_CALL_RE` Pass 1 shape. Two trackers must be touched (different concerns, different decision rules).

#### Tracker 1 — Cell-Value-Typed Shape 1 (`<state>: (A to B) = ...`)

This is the B-prereq Sub-Pass 2.b tracker (`runCellValueLifecycleAccessCheck` → `checkLifecycleBindingAccess` walker at line 14299).

**Change site**: `processStatementText` (line 14455). Add a new Pass BEFORE the existing Pass 1 (TRANSITION_CALL_RE) — sequencing rationale: §6.8.3 cancel-then-apply ordering says state revert applies AFTER the reset value is written. Within a single statement text containing multiple semicolon-separated calls (e.g., `reset(@s); transition(@t)`), they fire left-to-right anyway because regex iteration is positional. The ordering only matters for the per-call semantics — each reset writes a value then updates state, sequenced within the call. Pass order between RESET_CALL_RE and TRANSITION_CALL_RE within the SAME statement does not change observable behavior; we run RESET first because it provides the more aggressive (revert) semantic, then transition fires on the same statement if also present (rare but legal).

**New regex (RESET_CALL_RE)**:
```js
const RESET_CALL_RE = /\breset\s*\(\s*@([A-Za-z_$][A-Za-z0-9_$]*)((?:\s*\.\s*[A-Za-z_$][A-Za-z0-9_$]*)*)\s*\)/g;
```

Captures cell name (group 1) and optional dotted field path (group 2). The full match consumes `reset(@cell)` or `reset(@cell.field)` so the subsequent FIELD_ACCESS_RE Pass 3 does not re-match the cell-name-with-dot pattern as a phantom read.

**Wait — FIELD_ACCESS_RE re-match issue.** The current Pass 3 (FIELD_ACCESS_RE) scans `<bindingName>.<fieldName>` for reads. For text `reset(@u.passwordHash)`, FIELD_ACCESS_RE would match `u.passwordHash` (treating it as a read of field `passwordHash` of binding `u`). With the cell-value Shape 1 walker, `u` is NOT in `bindings` (since `u` is struct-typed, not cell-value-typed) so the match is harmless — `bindings.get("u")` returns undefined; the loop continues.

But for variant-progression cell-value Shape 1 where binding `phase` is in `bindings`, a `reset(@phase.publishedAt)` text would FIELD_ACCESS_RE-match `phase.publishedAt`, treating it as a pre-transition read of `phase.publishedAt`. **This would create a FALSE FIRE.**

**Mitigation**: When the RESET_CALL_RE matches, record the match position range; the FIELD_ACCESS_RE Pass 3 SKIPS matches that fall within a reset call's text range. (Same shape as how the existing FIELD_WRITE_RE skips LHS-of-write positions.)

This is the architecturally clean shape. Pass ordering becomes:
1. **NEW** Pass 0 — RESET_CALL_RE: detect reset calls, record (cellName, fieldPath, matchStart, matchEnd). Classify the reset value and update localStates. Compute resetSpans for later suppression.
2. Pass 1 — TRANSITION_CALL_RE: detect transition() calls (unchanged).
3. Pass 2 — FIELD_WRITE_RE: detect writes (unchanged).
4. Pass 3 — FIELD_ACCESS_RE: detect reads (UPDATED to skip positions inside resetSpans).

**Reset value classification**:

For each reset match against a tracked cell binding (`bindings.has(cellName)`):

- Resolve the reset value text:
  - If the state-decl has `default=<expr>`, use that expression text.
  - Else, use the state-decl's init expression text (re-evaluate).
- Call `classifyWriteAgainstSpec(resetValueText, spec)` (the existing helper at line 14385).
- The result is `"pre"` / `"post"` / `null` (null → no change).
- If non-null: `localStates.set(cellName, newState)`.

**How does the walker access the state-decl's `default=` attribute?** The walker today doesn't have direct access to the original state-decl AST node. The cell binding map (`buildCellValueLifecycleMap`) needs to be extended to carry the `default=` expression text + the init expression text, so the walker can consult those when a reset fires.

**Plumbing extension**: Add two optional fields to the cell binding spec carrier (or to a separate parallel map):
- `resetValueText: string` — the resolved reset value text (preferring `default=` attr if present, else the init expression).
- (Optional shortcut) `resetValueState: "pre" | "post" | null` — pre-computed via classifyWriteAgainstSpec at map-build time.

Pre-computing at map-build time is the right call — the reset value is fixed per cell (a `default=` expression evaluated symbolically, or the init expression re-evaluated). The walker doesn't need to re-classify on every reset call.

Actually, **but** the spec says (§6.8.1):
> "The `default=` expression SHALL be evaluated AT RESET TIME, not at declaration time."

This means the runtime value depends on cross-cell references that may have changed since declaration. For type-system per-access tracking purposes, however, the **type** of the reset value is static (the expression's type doesn't change at runtime). The classification logic (presence: is it the literal "not"? variant: which variant name?) is purely textual on the expression form, not the runtime value. So pre-computing classification at map-build time is sound.

Edge case: `default=@otherCell` (cross-cell reference per §6.8.1). The reset value text is `@otherCell` — what's its type? At impl level: `classifyWriteAgainstSpec("@otherCell", presenceSpec)` returns "post" (anything not literally "not" is treated as "transition" per the existing heuristic). That's conservative-correct: we assume cross-cell refs produce post-type values; the actual type checks happen at the cross-cell assignment site.

**Per the Phase 1 simplification rule**: keep this conservative. If adopters use `default=@otherCell` with a pre-type-shaped other cell, the tracker would mis-classify as post; surface as a known limitation (file as follow-up).

#### Tracker 2 — Struct-Typed Shape 1 with Lifecycle on FIELD (`<u>: User = {...}` where User has `(A to B)` field)

This is the B-prereq Sub-Pass 2.a tracker (`checkLifecycleFieldAccess` at line 13447).

**Change site**: The walker's `walk` function (around line 13601). Add a new branch BEFORE the text-extraction step that detects `reset(@cell.field)` reset-expr nodes (via structured AST recognition — different shape than Tracker 1).

The walker today recognizes `reactive-nested-assign` as a structured write (line 13618). The reset is analogously a structured action. Two detection forms:

**Form A — Structured (preferred)**: detect `kind === "bare-expr"` whose `exprNode?.kind === "reset-expr"`. The `exprNode.target` is an ExprNode tree; extract the cell name + field path from it. This is parallel to how reactive-nested-assign is recognized structurally.

**Form B — Text-based fallback**: if structured detection isn't always populated, fall back to text-level regex inside `extractAccesses` (the function that extracts FIELD_REF_RE / FIELD_WRITE_RE matches at line 13536).

Recommend Form A (structured) — exprNode is populated by the parser (`safeParseExprToNode` at every bare-expr emission site per ast-builder.js); the structured form is canonical.

**Multi-level field reset logic**:

For `reset(@u.passwordHash)` where:
- `u` is a tracked struct-typed binding (`structInstances.get("u") === "User"`)
- `passwordHash` is a lifecycle field on User (`lifecycleRegistry.get("User").has("passwordHash")`)

Action: classify the FIELD's reset value:
- The struct field doesn't carry `default=` (struct field defaults are in the struct definition, e.g., `passwordHash: (not to string) = not` — wait, that's not how struct fields are declared. Let me verify.)
- Actually: struct field defaults come from the struct definition's field-init expression. Or from the cell's init `{passwordHash: not}`.

**Read of struct field defaults.** For struct field `passwordHash: (not to string)` declared in `type User:struct = { ... passwordHash: (not to string) }`, there's no per-field default at the type level — the LIFECYCLE annotation is `(not to string)`, meaning "starts as `not`, transitions to `string`". The init expression for the field is whatever appears in the constructor: `<u>: User = { ..., passwordHash: not }` — here, `not` is the init.

`reset(@u.passwordHash)` per §6.8.2 multi-level:
- "Reset uses the resolved leaf's reset rule (its `default=` if present, else its init expression)."
- For a struct-field leaf without `default=` (struct fields don't carry `default=` attributes — that's a state-decl-level feature), the init expression is the field's init from the struct's constructor `{passwordHash: not}`.
- So reset writes `not` → satisfies pre-type → revert per-access state.

**Where does the walker get the init expression text for a struct field?** Two options:
1. From the `recordInitialFromAttrs` / state-decl init text — parsed at binding-collection time.
2. From the cell's full init text (the object literal `{passwordHash: not, ...}`).

Option 1 is the cleaner data path: extend the `initialFieldStates` map (or a parallel map) to carry the original init text per field. Then on reset detection, look up the init text, classify via the field's lifecycle spec, and update state.

But this requires plumbing — the existing `initialFieldStates` is just `binding → field → "pre"|"post"`. To support reset, we need `binding → field → initText` so reset can re-classify after writes have changed state.

**Cleanest implementation**: at binding-collection time (`collectStructBindings` / `collectStateDeclStructBindings`), extract per-field init text from the cell's struct constructor (the object literal {passwordHash: not, ...}) and store in a parallel `initialFieldTexts: Map<binding, Map<field, string>>`. The walker consults this on reset detection to compute the reset value's classification.

For struct fields with `default=` attribute: there's no such concept today (struct fields don't have `default=`; that's state-decl-level). So the field reset always re-evaluates the init.

#### Decision matrix

|  | Cell-value Shape 1 | Struct-typed Shape 1 (field lifecycle) |
|---|---|---|
| Tracker | `checkLifecycleBindingAccess` (line 14299) | `checkLifecycleFieldAccess` (line 13447) |
| Reset detection | Text-based RESET_CALL_RE in `processStatementText` | Structured `exprNode?.kind === "reset-expr"` in `walk` |
| Reset value source | `default=` attr OR init text | Field init from struct constructor object literal |
| Classify via | Existing `classifyWriteAgainstSpec` | NEW `classifyFieldWriteAgainstSpec` (analogous) |
| Read suppression | resetSpans in processStatementText | Skip access at reset-expr's exprNode target |

#### Out-of-scope (deferred; preserve B-prereq's follow-ups)

1. **Qualified-enum variant name stripping** (B-prereq follow-up #3): doesn't block Q6-narrow's variant tests (use direct AST). Surfaced for follow-on.
2. **Reset on schema field** (lifecycle in `<schema>` field — §14.12.7): out of scope; Q6-narrow targets Shape 1 cells (`<state>: ...`) only.
3. **Reset on channel cell** (§14.12.8): out of scope; same reason.
4. **Reset on fn-return binding** (`const u = loadUser(); reset(u)`): reset is for cells (`@cell`); a non-`@` identifier reset target hits E-RESET-INVALID-TARGET upstream. Q6-narrow does not need to handle fn-return reset.
5. **`reset(@compound)` (whole compound, multi-field)** per §6.8.2: a single reset call zeros all fields of the compound. For struct-typed Shape 1 cell with lifecycle on multiple fields, `reset(@u)` would need to revert each lifecycle field separately. Architecturally Tracker 2 (struct-field) can handle this: when the reset target is `@u` (no field path), iterate every lifecycle field of `u` and apply each field's init-based reset.
6. **`default=` on state-decl carrying complex expressions** (e.g., `default=computeDefault()`): the classification is conservative-text-based; complex expressions classify as "post" by default (the heuristic in `classifyWriteAgainstSpec` returns post for anything not literally "not"). Adopters who write `default=` with a value that doesn't classify cleanly may see surprising-but-conservative behavior. Document; surface if it bites in practice.

#### Implementation order

1. **Step 1 — Cell-Value-Typed Tracker (Tracker 1)** — RESET_CALL_RE in processStatementText. Extend buildCellValueLifecycleMap to capture defaultValueText + initValueText. Wire localStates update from reset. Add resetSpan suppression to Pass 3.
2. **Step 2 — Tests for Tracker 1** — direct-AST tests mirroring lifecycle-shape1-tracker.test.js. 6-8 tests.
3. **Step 3 — Struct-Typed Field Tracker (Tracker 2)** — recognize `reset-expr` in walk(). Extract cell+field path from target. Look up field init. Classify. Update fieldStates.
4. **Step 4 — Tests for Tracker 2** — 3-4 tests for multi-level field reset on struct-typed cells.
5. **Step 5 — Whole-compound reset `reset(@u)`** — Tracker 2 extension to iterate all lifecycle fields of the compound. 2-3 tests.
6. **Step 6 — Composition examples from §6.8.3** — verbatim test cases (presence reset to pre, reset to post-type stays post). 2-3 tests.
7. **Step 7 — Variant-progression cell-value reset** — direct-AST, qualified or bare per existing test pattern. 3-4 tests.
8. **Step 8 — Discrimination interaction** — `given @state => { reset(@state) }`, `if (@phase is .Draft) { reset(@phase) }`, etc. 2-3 tests.
9. **Step 9 — Cancel-then-apply ordering** — test reset followed by read in same statement vs subsequent statement. 1-2 tests.
10. **Step 10 — Regression sweep** — full test suite; baseline 21,701 → expected ~21,723 (with ~22 new tests).

Total: 15-25 new tests across `lifecycle-shape1-reset.test.js`. Zero regressions.

### Decision: PROCEED with α

No exotic edge case requires β. α is additive — extends two existing trackers via parallel passes; preserves all existing behavior; matches B-prereq's contract.

## 2026-05-26 — Phase 2 implementation log

### Step 1 (commit `62de0d64`) — Tracker 1: cell-value Shape 1 reset awareness — DONE

**Files touched:** `compiler/src/type-system.ts` (+180/-9 lines)

- Added `RESET_CALL_RE` regex near `TRANSITION_CALL_RE` (line ~14371). Whitespace-tolerant; matches `reset(@cell)` and `reset(@cell.field.field...)`.
- Extended `checkLifecycleBindingAccess` signature with optional 7th param `resetValueStates?: Map<string, "pre" | "post" | null>`.
- Added Pass 0 in `processStatementText` BEFORE Pass 1 (TRANSITION_CALL_RE). For each `reset()` match: record span + apply `localStates.set(cellName, newState)` from `resetValueStates`.
- Extended Pass 3 (FIELD_ACCESS_RE) to skip matches inside `resetSpans` — prevents `reset(@phase.publishedAt)` from being matched as a phantom read of `phase.publishedAt`.
- Added two module-scope helpers: `readDefaultExprText(node)` and `classifyResetValueAgainstSpec(text, spec)`. The former extracts `node.defaultExpr` text via `emitStringFromTree` (defensive raw-text preference). The latter classifies via the same heuristic as `classifyWriteAgainstSpec` (presence: literal "not" → pre; variant: matches pre/post variant names).
- Extended `buildCellValueLifecycleMap` to add `resetState` field to the carrier. Computed at map-build time from `defaultExpr` text (if present) or init text (otherwise) via `classifyResetValueAgainstSpec`.
- Extended `runCellValueLifecycleAccessCheck` to derive the `resetValueStates` map from the cell map and thread through to the walker.

**Probe outcomes:**
- Probe 1 (presence reset reverts): 0 → 1 E-TYPE-001 ✓ (gap closed)
- Probe 2 (presence reset to post stays post): 0 → 0 ✓
- Probe 5a (regression baseline): 1 → 1 ✓

**Tests passing post-Step 1:** 78 existing lifecycle tests pass (lifecycle-shape1-tracker + landing-2 + landing-2-5).

### Step 3 (commit `7fc73b04`) — Tracker 2: struct-typed Shape 1 field reset awareness — DONE

(Skipped explicit "Step 2" — testing was deferred to Phase 3.)

**Files touched:** `compiler/src/type-system.ts` (+175/-1 lines)

- Added structured reset-expr detection in `checkLifecycleFieldAccess`'s `walk` function. Recognizes `bare-expr` nodes whose `exprNode?.kind === "reset-expr"` and extracts `(cellName, fieldPath)` from the target ExprNode via the new `extractResetTarget` helper.
- Added text-based fallback `handleResetTextMatches(bareText)`. Returns the matched span list so the caller can suppress phantom-read matches via `extractAccesses` excludeSpans.
- Added `applyResetToCellField(cell, fieldPath)`: routes whole-compound (`fieldPath.length === 0`) vs single-field reset. Re-applies the field's initial state from `initialFieldStates` (per §6.8.2 "init expression" semantics for struct fields without `default=`).
- Extended `extractAccesses` with optional `excludeSpans` parameter. When provided, `FIELD_WRITE_RE` and `FIELD_REF_RE` matches inside any exclude span are skipped — prevents `reset(@u.passwordHash)` from being matched as a phantom write/read.
- Walker now computes `resetSpans` from the text-fallback path and passes them to `extractAccesses` when the bare-expr text contains a reset call.

**Probe outcomes:**
- Probe 4 (multi-level reset on struct field): 0 → 1 E-TYPE-001 ✓ (gap closed)
- Probe 5b (regression baseline struct-field): 1 → 1 ✓

**Tests passing post-Step 3:** 78 existing lifecycle tests still pass.

### Architectural note (Phase 2 retrospective)

The Phase 1 architecture proposed 10 steps; Phase 2 collapsed Steps 1+3 (Tracker 1 + Tracker 2 code changes) into 2 commits before authoring tests. Steps 2/4/5/6/7/8/9/10 became a single test file (Step "test" — commit `50b5d6e5`) per the brief's "15-25 new tests" target. Test coverage breakdown by step is documented in the test file's describe blocks.

## 2026-05-26 — Phase 3 tests (commit `50b5d6e5`) — DONE

**New test file:** `compiler/tests/unit/lifecycle-shape1-reset.test.js` (693 lines)

Coverage (25 tests):

- **§6.8.3 cell-value Shape 1 presence-progression** (8 tests, Tests 1-8):
  - Test 1: reset(@state) after write reverts; subsequent read fires
  - Test 2: default=not classification → pre revert
  - Test 3: default= matching post-type stays post (§6.8.3 unusual-but-legal example verbatim)
  - Test 4: reset(@state) at start (state already pre) is idempotent
  - Test 5: multiple resets cycle pre/post per write/reset
  - Test 6: phantom-read sanity (reset(@state) is not a read)
  - Test 7: reset inside given-guard affects inner state (block-scoped)
  - Test 8: cancel-then-apply ordering (reset + next statement)

- **§6.8.3 cell-value Shape 1 variant-progression** (4 tests, Tests 9-12):
  - Test 9: variant reset to pre-variant reverts; post-shape access fires
  - Test 10: variant reset to post-variant stays post
  - Test 11: variant reset re-fires VARIANT-NOT-TRANSITIONED inside source-discrim
  - Test 12: reset(@phase.publishedAt) doesn't phantom-fire (suppression test)

- **§6.8.3 struct-typed Shape 1 field reset (Tracker 2)** (7 tests, Tests 13-19):
  - Test 13: reset(@u.passwordHash) structured form (exprNode reset-expr) reverts
  - Test 14: reset(@u.passwordHash) text-fallback form reverts
  - Test 15: reset(@u) whole-compound reset reverts every lifecycle field
  - Test 16: reset with initial post stays post
  - Test 17: multi-field — reset of one field doesn't affect others
  - Test 18: reset suppression (text inside reset() not phantom-read)
  - Test 19: reset on non-lifecycle field is no-op

- **§6.8.3 end-to-end via compileScrml** (6 tests, Tests 20-25):
  - Test 20: Probe 1 verbatim (presence reset reverts)
  - Test 21: composition default=not example verbatim
  - Test 22: composition default=post-shaped example
  - Test 23: Probe 4 verbatim (multi-level struct field reset)
  - Test 24: whole-compound reset(@u)
  - Test 25: regression baseline

### Test outcomes (commit `50b5d6e5`)

```
bun test compiler/tests/unit/lifecycle-shape1-reset.test.js
→ 25 pass / 0 fail / 32 expect() calls

bun test compiler/tests/unit/lifecycle-shape1-tracker.test.js \
         compiler/tests/unit/type-system-lifecycle-landing-2.test.js \
         compiler/tests/unit/type-system-lifecycle-landing-2-5.test.js
→ 78 pass / 0 fail (regression: zero)

bun test compiler/tests/unit
→ 12,321 pass / 0 fail / 40 skip (regression: zero)

bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance
→ 14,796 pass / 0 fail / 88 skip / 1 todo (regression: zero)

bun run test (full project test suite)
→ 21,726 pass / 0 fail / 170 skip / 1 todo / 799 files
```

Baseline expected per brief: 21,701 → 21,726 = +25 new tests. Matches exactly. **Zero regressions.**

Pre-existing flake noted: `trucking-dispatch — chunks.json structure > manifest.compiler field is stable across two compiles` times out at 5000ms (test ran ~9300ms in `--bail` mode). Verified pre-existing by stashing Q6-narrow changes and re-running — same flake fires from pre-Q6-narrow baseline. Not a Q6-narrow regression; same `trucking-dispatch` 5s-timeout pattern noted in B-prereq's progress doc.

---

## Final report

**Status:** COMPLETE. SPEC §6.8.3 reset × lifecycle semantic landed (impl-deferred bullet closes).

**WORKTREE_PATH:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a4e2d60c93cd06bd2`
**FINAL_SHA:** `79d88fad04c0a5df72075f38f01239846598c9d4`
**BRANCH:** `worktree-agent-a4e2d60c93cd06bd2`

**Files touched:**
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a4e2d60c93cd06bd2/compiler/src/type-system.ts` — Tracker 1 (cell-value Shape 1 reset awareness) + Tracker 2 (struct-typed Shape 1 field reset awareness). +355/-10 lines total.
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a4e2d60c93cd06bd2/compiler/tests/unit/lifecycle-shape1-reset.test.js` — NEW, 693 lines, 25 tests.
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a4e2d60c93cd06bd2/docs/changes/q6-narrow-reset-lifecycle-2026-05-26/progress.md` — this file.

**Commits (6):**
1. `b8701a04` — WIP startup + Phase 0 mandatory reading
2. `861f0a7c` — Phase 0 empirical verification — headline gap CONFIRMED
3. `ff6459f1` — Phase 1 architecture proposal (Option α)
4. `62de0d64` — Step 1 — Tracker 1 (cell-value Shape 1) reset awareness
5. `7fc73b04` — Step 3 — Tracker 2 (struct-typed Shape 1 field) reset awareness
6. `50b5d6e5` — 25 tests for §6.8.3
7. `79d88fad` — Phase 2 + Phase 3 impl/test logs

**Test outcomes:**

| Baseline (S134 close) | Final (Q6-narrow) | Δ |
|---|---|---|
| 21,701 pass / 0 fail / 170 skip / 1 todo / 798 files | 21,726 pass / 0 fail / 170 skip / 1 todo / 799 files | +25 tests, +1 file, zero regressions |

Pre-commit gate (`unit + integration + conformance`): 14,796 pass / 0 fail / 88 skip / 1 todo — clean.

**Open follow-ups (out of Q6-narrow scope):**

1. **Qualified-enum variant name stripping** (B-prereq follow-up #3, inherited): the empirical .scrml path for variant-progression cells using `(Article.Draft to Article.Published)` doesn't correctly strip the qualifier — diagnostic messages show `(asIs to asIs)`. Variant-progression Q6-narrow tests therefore use direct-AST construction with hand-built bindings. Fix is in `parseLifecycleReturnAnnotation` variant-name extraction (likely strip both `EnumName.` prefix AND leading `.`). Q6-narrow Test 11 verifies the SEMANTIC works on properly-constructed bindings; the source-form coverage needs the upstream fix.

2. **Bare-dot variant lifecycle annotations on Shape 1 cells** (B-prereq follow-up #1, inherited): parser tokenizer collapses whitespace around `.` in `(.Draft to .Published)` → `(.Draft to.Published)` at AST level, defeating `findTopLevelArrow`. Same workaround applies: direct-AST tests bypass; source-form path needs tokenizer fix or `findTopLevelArrow` tolerance widening.

3. **Top-level `let-decl` inside `${...}` blocks with lifecycle** (B-prereq follow-up #2, inherited): pre-existing gap; orthogonal to Q6-narrow.

4. **Deep multi-level reset on nested compound** (`reset(@a.b.c)` with `b` being its own compound):  Q6-narrow's `applyResetToCellField` conservatively uses `fieldPath[0]` (the first hop after the cell). The §6.8.2 multi-level B22 ratification supports deeper nesting, but the canonical idiom is one hop deep. Filed for follow-up if real adopters exercise the deeper pattern.

5. **Cross-cell `default=@otherCell` reset value classification**: the heuristic in `classifyResetValueAgainstSpec` treats any non-`not` text as post for presence-progression. A `default=@otherCell` where `otherCell` is pre-typed would misclassify. Conservative; document as known-limitation. The actual cross-cell type-check happens at the cross-cell assignment site, not here.

6. **`E-RESET-INVALID-TARGET` interaction**: Q6-narrow does NOT touch the existing diagnostic for non-canonical reset targets (§34 row B22). If the parser emits a malformed `reset-expr` with `diagnostic.code === "E-RESET-NO-ARG"` set, the walker still applies the revert based on the synthetic absence-literal target — harmless but worth noting. The diagnostic fires separately via ast-builder.

**Maps consulted:** `.claude/maps/primary.map.md`
**Load-bearing finding:** Task-Shape Routing identified "Lifecycle annotation work" → error.map + schema.map + structure.map. The watermark on map content (`c2d3f7ae` = 2026-05-26 S132 close) was flagged STALE by the brief; verified content against current source via grep + Read against `compiler/src/type-system.ts` (which has S134 +671L B-prereq changes). Map content not load-bearing for fix decisions — the brief itself + B-prereq progress.md + SPEC sections were authoritative. The map identifies the right "neighborhood" but lacks line-anchor precision for active development.

**NOTES (additions to known-gaps or design surface):**

- The Pass 0 ordering choice (reset BEFORE transition) is structurally inconsequential for canonical scrml (no canonical idiom mixes `reset(@s)` and `transition(s)` in a single statement). Documented in source comments for future maintainers.
- The `resetValueStates` map's value is `"pre" | "post" | null` (not just `"pre" | "post"`) to support unclassifiable reset values (e.g., variant-progression where the `default=` expression isn't a recognized variant). The walker leaves state unchanged in the null case; no diagnostic fires from Q6-narrow.
- For struct-typed Shape 1 with lifecycle on field, the reset target's "initial state" doubles as the reset state. This is a §6.8.1+§6.8.2 consequence: struct fields don't carry `default=` (a state-decl-level feature); reset re-evaluates the field's init from the cell's object literal. Documented in `applyResetToCellField` source comment.
- The `extractResetTarget` member-chain walk only handles structured `kind === "member"` chains. Reactive-ref-rooted targets (`{kind: "reactive-ref", name: "cell"}`) are handled via the `name` field fallback at the chain root. Robust against either parser shape.
