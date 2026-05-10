# Phase A7 Step A5-5b — Legacy `<machine>` Body `${...}` Preservation

**Authored:** S77 — 2026-05-10
**Authorization:** S77 user direction — "do 3, 4. parralel, sequence, pa. whatevers best" — item 3 of S77 Tier 1 next-step ranking.
**Roadmap reference:** A5-5 SHIP commit `7b5744d` (S77) deferred this as the legacy-`<machine>`-half of the computed-delay surface; the engine `<onTimeout>` half (S67-recommended) works end-to-end already.
**Estimated effort:** ~1-2h chore-tier (per A5-4+5 dispatch agent's Q2 estimate).
**Dispatch shape:** PA-direct OR small `scrml-dev-pipeline` agent dispatch — implementation is mechanical.

---

## §1 The bug

The legacy `<machine>` form (`<machine name=Foo for=T> .From after Ns => .To </>`) supports a body-level rules grammar. SPEC §51.12.3.1 (S67 amendment) extended `after` durations to accept `${expr}<unit>` computed form. Codegen for the legacy-machine computed-delay path is fully in place since A5-5 SHIPPED at `7b5744d` (S77):

- `parseMachineRules` (`compiler/src/type-system.ts` ~line 2596-2617) now calls `parseAfterDuration` and populates `TransitionRule.afterExpr` for computed cases.
- `emitDurationLiteral` in `compiler/src/codegen/emit-machines.ts` emits an IIFE-wrapped clamp+round expression at the 2 fire-sites (lines ~491, ~711).
- `emit-logic.ts` machine-init path arms computed-form rules inline alongside literal-form rules.

**What's missing:** the block-splitter's handling of the `<machine>` body fragments `${expr}` substrings into separate `logic` child blocks. The ast-builder's `rulesRaw` concatenation (`compiler/src/ast-builder.js` lines 9082-9095) iterates `block.children`, but the `if (child.raw) rulesRaw += child.raw + "\n"` guard skips `logic` children (whose `raw` field is empty — the content lives in `body`/children of the logic block itself). Result: `rulesRaw` arrives at `parseMachineRules` with the `${...}` text DROPPED, and `parseAfterDuration` never sees a computed-form rule.

**Concrete example.** Source:

```scrml
<machine name=Backoff for=Phase>
  .Connecting after ${@backoffDelay}ms => .Open
</>
```

After block-split + ast-builder rules-raw concat, `rulesRaw` becomes (approximately):

```
.Connecting after ms => .Open
```

The `${@backoffDelay}` substring is gone. `parseMachineRules` sees `after ms` (no number/expr), `parseAfterDuration` returns `{kind: "invalid"}`, the rule is treated as non-temporal (afterMs=null, afterExpr=null), and the codegen emits no `_scrml_machine_arm_timer` call.

**Why this didn't fire as a regression in A5-5 testing.** The A5-5 unit tests (`computed-delay.test.js`) construct `TransitionRule` records directly via type-system call paths or invoke `parseMachineRules` with synthetic `rulesRaw` strings that already contain `${...}` text (bypassing the block-splitter). The integration test (`engine-ontimeout-end-to-end.test.js`) covers the engine `<onTimeout>` form, which DOES work end-to-end. There is no integration test that drives a legacy `<machine>` `.From after ${expr}<unit> => .To` source through the full `compileScrml` pipeline. **A5-5b adds that coverage.**

---

## §2 What ships

### A5-5b

End-to-end `<machine>` `.From after ${expr}<unit> => .To` source flow through `compileScrml`. The block-splitter's child-iteration in `<machine>` body handling preserves the original source text of `${...}` substrings so `parseMachineRules` sees the computed-form expression intact.

**Behavioral contract:** for every legal scrml source where the engine `<onTimeout after=${expr}<unit> to=.X/>` form works end-to-end, the equivalent legacy `<machine> .From after ${expr}<unit> => .X </>` form SHALL also work end-to-end with bit-identical runtime semantics (fire timing, clamp behavior, chained-rearm opt-out per SPEC §51.12.4 S77 amendment).

---

## §3 Decomposition

### Phase 0 — Survey (~10-20 min)

- Read `compiler/src/ast-builder.js` lines 9082-9095 (the `rulesRaw` concat loop).
- Read `compiler/src/block-splitter.js` to understand how `<machine>` body children are produced (which block kinds appear; what fields carry their text).
- Trace what `child.raw` contains for each child kind: text/comment/logic/sql/css/etc.
- Confirm: does any other `<machine>`-body or `<engine>`-body code path already preserve `${...}` correctly? (engine state-children DO get parsed via `parseEngineStateChildren` which works against `bodyRaw` — check if its derivation is different from machine's `rulesRaw`.)

**STOP gate:** if Phase 0 reveals the block-splitter assigns `${...}` text to a field other than `raw` on the logic-child block (e.g., `text`, `body`, or a span-derived slice), the fix may simply be "use that other field." If the text is genuinely lost in BS, the fix is harder — likely "slice from parent's `machineRaw` using span offsets to recover." Surface either case to PA before implementing.

### Phase 1 — Implementation (~30-60 min)

**Approach A (preferred, if Phase 0 finds the text in a child field):** Extend the `rulesRaw` concat loop to handle each child kind. For `logic` children, wrap the recovered text in `${...}` and append. For `text`/`comment` children, current `child.raw` behavior is correct. For other kinds, do the safe thing (skip with a defensive comment, or fail-fast if unexpected).

**Approach B (fallback, if Phase 0 finds text genuinely lost):** Switch the `rulesRaw` derivation from child-iteration to span-slicing of the parent `machineRaw`. The parent block's span covers the full `<machine>...</>` source; the children's spans give the offsets of any `logic` children. Reconstruct by slicing parent text between the body opener and closer, OR (simpler) slice from `machineRaw` between `firstLineEnd + 1` and the closer offset (the existing fallback path at line 9090-9094 does something similar — extend it as the primary path).

Either approach: ensure NO regression in non-computed `<machine>` cases (the existing 4 child-iteration semantics test fixtures must continue to pass).

### Phase 2 — Tests (~20-30 min)

Add to `compiler/tests/unit/computed-delay.test.js` OR create `compiler/tests/integration/machine-computed-delay-end-to-end.test.js`:

1. **Source-level:** parse a `<machine>` with `.From after ${expr}<unit> => .To` body; assert `parseMachineRules` receives a `rulesRaw` containing `${...}` substring.
2. **Codegen:** compile the source via `compileScrml`; assert the emitted JS contains an IIFE-wrapped runtime computation for the duration.
3. **End-to-end (optional):** mirror `engine-ontimeout-end-to-end.test.js` style — compile + spawn emitted JS under fake timers; verify timer fires after the computed delay.

**Test invariant target:** all new tests pass; full-suite delta is 0 hard-fail beyond the 6 known-environmental fails (3 self-host artifacts; 3 test-bind A6-5 hard-coded cwd).

### Phase 3 — Documentation (~10 min)

- Update `docs/PA-SCRML-PRIMER.md` §7.1 — remove the "legacy machine body-parser limitation" note (the limitation is closed).
- Update `docs/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md` §2.5 — mark A5-5b SHIPPED alongside the existing A5-4 + A5-5 SHIPPED markers.
- Optional: brief progress.md in this dispatch dir documenting the chosen approach.

---

## §4 Authorized Decisions

1. **Approach A is preferred over B if Phase 0 finds the text in a child field.** Span-slicing is more invasive (changes the primary derivation path); child-iteration extension is a small additive change. Default to A; B is the fallback only if A is not feasible.

2. **Existing non-computed `<machine>` test fixtures MUST continue to pass.** The fix is additive — preserves `${...}` AND keeps the existing literal-only path correct. No behavioral change for `.From after 30s => .To`-style rules.

3. **No SPEC.md changes.** The spec text for §51.12.3.1 already covers both surfaces; this dispatch closes the implementation gap on the legacy-machine half. The S77 SPEC §51.12.4 chained-rearm-skips-computed amendment (commit `7d8de4a`) already covers the runtime constraint.

4. **No new error codes.** `parseAfterDuration` already returns `{kind: "invalid", reason: ...}` for malformed durations; the existing E-ENGINE-021 fire path (currently triggered by literal-only invalid durations like `after 30` or `after Xs`) extends naturally to malformed `${...}` shapes.

5. **Test-fixture approach:** prefer adding to `computed-delay.test.js` over creating a new integration file — keeps the computed-delay test surface unified. Create a separate integration file only if the end-to-end fake-timer harness from `engine-ontimeout-end-to-end.test.js` needs to be reused (which would justify the file-level separation).

---

## §5 Files expected to change

- `compiler/src/ast-builder.js` (~+10-20 LOC at the `rulesRaw` concat loop, lines 9082-9095)
- `compiler/tests/unit/computed-delay.test.js` (or NEW integration test, ~20-50 LOC)
- `docs/PA-SCRML-PRIMER.md` (~-2 LOC — remove the limitation note)
- `docs/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md` (~+1 LOC — A5-5b SHIPPED marker)

**No changes needed to:**
- `compiler/src/type-system.ts` (`parseMachineRules` already correct)
- `compiler/src/codegen/emit-machines.ts` (`emitDurationLiteral` already correct)
- `compiler/src/codegen/emit-logic.ts` (machine-init computed-arm already correct)
- `compiler/src/codegen/parse-after-duration.ts` (helper already correct)

---

## §6 Out-of-scope (DEFERRED)

- **Re-debating the legacy `<machine>` deprecation timeline.** The S67-recommended surface is `<engine>` + `<onTimeout>`. Legacy `<machine>` is preserved for projects already using it; A5-5b closes a parity gap, not a new feature.
- **Adding more elaborate computed-delay forms** (e.g., per-rule cleanup callbacks, observable timing). Not in spec; not in scope.
- **Multi-line `${...}` expressions** spanning multiple source lines. Block-splitter already handles brace-balanced multi-line `${...}` blocks; A5-5b inherits that capability via Approach A or B.

---

## §7 Risks

1. **Risk:** child block kinds may include something Approach A's loop doesn't anticipate (e.g., `sql` or `css` children inside a `<machine>` body — semantically nonsensical but parseable). **Mitigation:** Phase 0 enumerates the kinds; defensive default for unexpected kinds is "skip with comment."
2. **Risk:** span-slicing (Approach B) may include trailing whitespace or the closing `/` differently than the current concat path. **Mitigation:** `rulesRaw.trim()` at line 9095 already normalizes; A5-5b inherits.
3. **Risk:** the existing 4 child-iteration test fixtures may have been written assuming `child.raw` IS the source-of-truth. **Mitigation:** Phase 0 reads them; Approach A is additive (logic children only — non-logic still uses `child.raw`).

---

## §8 Dispatch shape

**Recommended:** PA-direct (~1-2h is small enough that agent dispatch overhead exceeds benefit). Alternative: small `scrml-dev-pipeline` agent dispatch with worktree isolation if PA context is constrained at execution time.

**File-disjoint from any in-flight work:** A5-5b touches `ast-builder.js` only (the fix point) plus tests + 2 doc files. Compatible with any other in-flight dispatches.
