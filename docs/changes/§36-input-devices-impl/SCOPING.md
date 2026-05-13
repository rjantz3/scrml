# §36 Input Devices — Implementation Scoping

**Date:** 2026-05-13 (S89 open).
**Source dispatch:** hand-off-88 §"§36 keyboard+mouse impl" — `~12-25h`, ratified S88.
**Source insight:** `scrml-support/design-insights.md` Insight 31 (DESIGN-AND-SHIP, 49.5 / 40.0 / 29.0).
**Source debate:** `scrml-support/docs/debates/debate-04-live-input-element-retention-2026-05-12.md`.
**SPEC:** §36 lines 15389–15743 (`compiler/SPEC.md`).

## §0 Important framing — implementation is ~70% landed

The pre-S88 codebase already contains a substantial `<keyboard>` / `<mouse>` / `<gamepad>` implementation:

| Component | File | Status |
|---|---|---|
| Runtime — keyboard | `compiler/src/runtime-template.js` 1502–1574 | LANDED |
| Runtime — mouse | `compiler/src/runtime-template.js` 1576–1637 | LANDED |
| Runtime — gamepad (rAF polling) | `compiler/src/runtime-template.js` 1639–1703 | LANDED |
| Runtime — `_scrml_input_state_registry` | `compiler/src/runtime-template.js` (top of §35 group) | LANDED |
| Codegen — `emitInputStateNode` | `compiler/src/codegen/emit-reactive-wiring.ts` 824–879 | LANDED |
| HTML silencing — `INPUT_STATE_TAGS` | `compiler/src/codegen/emit-html.ts` 155 | LANDED |
| Validators — E-INPUT-001 / -002 / -003 / -004 | `compiler/src/codegen/emit-html.ts` 713–754 | LANDED |
| Tokenizer — `<#id>` recognition | `compiler/src/tokenizer.ts` 421–454 | LANDED |
| Expr-parser — `InputStateRefExpr` AST kind | `compiler/src/expression-parser.ts` 277–943 | LANDED |
| Rewrite — `<#id>` → `_scrml_input_state_registry.get("id")` | `compiler/src/codegen/rewrite.ts` 445–453 | LANDED |
| Component-expander — `input-state-ref` passthrough | `compiler/src/component-expander.ts` 816 | LANDED |
| Validator-arg-parser — `input-state-ref` arm | `compiler/src/validator-arg-parser.ts` 353 | LANDED |
| Tests | `compiler/tests/unit/input-state-types.test.js` (585 LOC, 47 pass / 0 fail) | LANDED |

**Load-bearing finding:** the §36 dispatch is NOT a green-field implementation — it is a **gap-closure + DESIGN-AND-SHIP-gate completion** dispatch. The hand-off-88 `~12-25h` estimate ASSUMES green-field; the actual remaining surface is materially smaller and the estimate should be revised downward (see §5).

The four gaps the scoping below addresses are:

1. **E-INPUT-005 (duplicate-id) is unimplemented** — SPEC §36.7 normative, no source / no test.
2. **SPEC §36.5/§36.7 OQ-input-1/2/3 normative text is missing** — three open questions that Insight 31 ratification flagged as "require SPEC §36 normative additions before implementation lands."
3. **No conformance test file** — no `conf-INPUT-NNN.test.js` exists. SPEC §34 conformance hooks for E-INPUT-* are unbacked.
4. **No DESIGN-AND-SHIP-gate sample app** — debate-04 conclusion 4 mandates a canvas sprite-movement demo as the gate-completion artifact. Without it the DESIGN-AND-SHIP verdict has no shipped evidence.

A fifth, smaller item — frame-accurate-edge-detection integration test (the empirical-gate finding in Insight 31) — has no harness in the existing 47-test suite. Sub-phase 4.B addresses it.

---

## §1 Surface Inventory

### §1.1 What §36 ratifies (cite spec lines)

SPEC §36.1 (lines 15389–15411) ratifies three built-in state types — `<keyboard>`, `<mouse>`, `<gamepad>` — that share the lifecycle pattern of `<timer>` and `<poll>`:

- Declared as markup elements in the program body.
- Emit no HTML.
- Compiler emits JS runtime setup that registers event listeners / starts polling on mount.
- Listeners and polling loops are torn down on scope destruction.
- Expose a named state object accessible via `<#id>` reference syntax.

Decision provenance is recorded inline (SPEC §36.1 lines 15409–15411): "Ratified by debate verdict (gaming-canvas-primitives-2026-04-01 deep-dive). Asset loading and audio are stdlib-first."

### §1.2 User-facing scrml surface

Per SPEC §36.2 (15415–15490), §36.3 (15494–15552), §36.4 (15556–15624):

**`<keyboard id="X"/>`** — emits no HTML; exposes `.pressed(key)`, `.justPressed(key)`,
`.justReleased(key)`, `.modifiers`, `.lastKey`, `._clearFrameState()` via `<#X>`.

**`<mouse id="X" target?=@el/>`** — exposes `.x`, `.y`, `.buttons`, `.pressed(button)`, `.wheel`,
`._clearFrameState()` via `<#X>`. `target=` is optional; defaults to `document`.

**`<gamepad id="X" index?={0|1|2|3}/>`** — exposes `.connected`, `.axes`, `.buttons`,
`.pressed(idx)` via `<#X>`. `index=` defaults to `0`. rAF-polled (Gamepad API has no events).

**`<#X>` is the existing input-state-ref AST kind** — already in `expression-parser.ts` as
`InputStateRefExpr` and rewritten in `rewrite.ts` to `_scrml_input_state_registry.get("X")`.
No new surface here.

### §1.3 What gets emitted at runtime

Per SPEC §36.2/§36.3/§36.4 normative statements + runtime-template.js evidence:

- **`<keyboard>`**: `document.addEventListener("keydown"/"keyup", ...)` pair; `pressedSet` +
  `justPressedSet` + `justReleasedSet` + `modifiers` + `lastKey` captured. `_clearFrameState()`
  resets both just-sets — this is the frame-accurate-edge-detection mechanism (Insight 31 Gate 1).
- **`<mouse>`**: `target.addEventListener("mousemove"/"mousedown"/"mouseup"/"wheel", ...)` quad; `x`,
  `y`, `buttons`, `wheel` captured. `_clearFrameState()` zeros `wheel`.
- **`<gamepad>`**: `requestAnimationFrame(poll)` loop calling `navigator.getGamepads()[index]`;
  `connected`, `axes`, `buttons` captured.

All three register cleanup via `_scrml_register_cleanup(...)` per SPEC §36.5 (lines 15628–15643). The
normative statement is binding: "The compiler SHALL emit a `_scrml_register_cleanup` call for every
`<keyboard>`, `<mouse>`, and `<gamepad>` element. Failure to emit this call is a compiler bug, not
a user error."

### §1.4 What is deferred (per hand-off + per debate)

- **`<gamepad>`** — per hand-off-88 line 211: "keyboard + mouse first; gamepad deferred". The runtime
  + codegen for gamepad ARE already landed (see §0 table); deferral concerns the **DESIGN-AND-SHIP-
  gate sample app** (debate-04 conclusion 4 mentions canvas sprite-movement; gamepad-driven sample
  blocked until canvas sample app ships).
- **Touch / pointer events** — not in SPEC §36. Surface as open question (§4 OQ-D).
- **Pointer Lock** — not in SPEC §36. Not a §36 sub-surface; if needed, separate proposal.

---

## §2 Compiler Touchpoints

For each pipeline stage, what changes (or what is verified-already-present):

### §2.1 BS / TAB / AST builder — VERIFIED LANDED

- `<keyboard>` / `<mouse>` / `<gamepad>` already parse as `MarkupNode` with their tag string. No
  new AST kind is required. (SPEC §36.1 explicitly chooses the "no new node kind" path.)
- `<#id>` already parses as `InputStateRefExpr` per `expression-parser.ts:1946` + `:940-943`.
- **No changes needed.** Verified by `input-state-types.test.js` §1, §2, §3 (6 tests).

### §2.2 TS / typer — UNVERIFIED; LIKELY MINIMAL

- `<#id>` already has a type-checker arm (`input-state-ref` case in
  `validator-arg-parser.ts:353`, `meta-checker.ts:489`, `emit-validators.ts:417`).
- Sub-phase 2 must verify that `<#X>.pressed("Space")` is accepted as `boolean`, `<#X>.x` as
  `number`, etc. — i.e. the property/method shapes on the registry-resolved object are typed.
- **Touchpoint (if gap found):** `compiler/src/type-checker.ts` (a new TS arm for `input-state-ref`
  member-access shape).

### §2.3 DG — NO CHANGE EXPECTED

- Input state reads are imperative (read in animationFrame loops per SPEC §36.6). No reactive
  subscription is set up. SPEC §36.6 line 15680–15682: "Input state is read at the moment of the
  `animationFrame` callback — no reactive subscriptions are set up. This is intentional: input
  drives imperative game logic, not reactive state updates."
- DG should NOT credit `<#X>` reads as reactive deps. **Touchpoint (verify only):**
  `compiler/src/dependency-graph.ts` — confirm `input-state-ref` is excluded from dep collection.

### §2.4 CG / Codegen — TWO GAPS

**Gap A — E-INPUT-005 (duplicate-id within scope) emission**
File: `compiler/src/codegen/emit-html.ts` near lines 713–754 (INPUT_STATE_TAGS branch).
Currently: id absence + gamepad index range are checked. Duplicate-id is not.
SPEC §36.7 (15724–15732) and §34 catalog line 14900 both normatively require E-INPUT-005.
Implementation: scope-walk + per-scope `Set<id>` accumulator across all three tags
(`<keyboard>`, `<mouse>`, `<gamepad>` share one id namespace per SPEC §34 line 14900).

**Gap B — SSR / server-side emission must be no-op (OQ-input-3)**
Files: `compiler/src/codegen/emit-server.ts` (verify the emitter never references input runtime
helpers); `compiler/src/codegen/emit-reactive-wiring.ts:529–537` (verify the input-state init block
is only emitted into the client IR, never into server IR). Currently the input init block runs
through `emit-reactive-wiring.ts` which feeds the client side only — SPOT CHECK CONFIRMS no
server-side leak, but a normative SPEC statement and a test guard are needed.

### §2.5 Runtime — VERIFIED LANDED

- `_scrml_input_keyboard_create` / `_destroy` (runtime-template.js 1505–1574).
- `_scrml_input_mouse_create` / `_destroy` (1580–1637).
- `_scrml_input_gamepad_create` / `_destroy` (1643–1703).
- `_scrml_input_state_registry` Map for `<#id>` lookup.
- **No changes needed for the core runtime functions.** Sub-phase 3 verifies a specific behavioral
  question: does `keydown`'s `pressedSet.has(key)` guard match SPEC §36.2's normative
  description (lines 15463–15466: "edge-based — fires once per keydown event")? The current
  implementation does `if (!pressedSet.has(key)) { justPressedSet.add(key); }` — this prevents
  keyboard auto-repeat from firing `justPressed` more than once per physical press, which matches
  spec intent. Add a regression test.

### §2.6 Tests — FOUR DELTAS

- Existing unit tests: 47 pass / 0 fail in `input-state-types.test.js`.
- **Delta 1:** E-INPUT-005 unit tests + per-scope behavior (3–5 tests).
- **Delta 2:** Conformance tests `conf-INPUT-001.test.js` through `conf-INPUT-005.test.js`
  (5 files; mirrors `conf-AUTH-003.test.js` / `conf-LOOP-005.test.js` pattern from
  `compiler/tests/conformance/`).
- **Delta 3:** Frame-accurate-edge-detection integration test (Insight 31 Gate 1 verification:
  the empirical claim that "trio + on*= cannot cover justPressed/justReleased frame-accurate edge
  detection without 10-15 LOC per-app boilerplate" must be backed by a positive test that
  `<keyboard>` DOES cover it). Likely uses a mocked `requestAnimationFrame` harness.
- **Delta 4:** DESIGN-AND-SHIP gate canvas sample app (debate-04 conclusion 4). One `.scrml` file
  in `samples/compilation-tests/` or `examples/` + an e2e Playwright spec (or, at minimum, a
  compilation-only fixture if e2e is too heavy for the §36 scope).

---

## §3 Sub-Phase Decomposition

Ordered by dependency. Each sub-phase is 1–4h. Total per-phase estimates carry forward to §5.

### Phase 1 — SPEC normative additions (~2h)

**Sub-phase 1.A** — SPEC §36.5 nested-scope clarification (OQ-input-1) (~1h)
Add normative text answering: when `<keyboard>` is declared inside a nested `<program>`, does cleanup
fire at nested-program unmount or top-level unmount? Per existing scope-id machinery
(`emit-reactive-wiring.ts:841` `scopeVar = JSON.stringify(genVar("scope"))`), each `emitInputStateNode`
call already emits a per-call unique scope id and registers cleanup at the enclosing scope's
`_scrml_register_cleanup` hook. Normative recommendation: cleanup fires at the IMMEDIATELY ENCLOSING
SCOPE's unmount, matching `<timer>` and `<poll>` behavior (consistency with §35 / §51 lifecycle).
File: `compiler/SPEC.md` insert into §36.5.

**Sub-phase 1.B** — SPEC §36.7 E-INPUT-006 addition (OQ-input-2) (~30m)
Candidate (per debate-04 OQ-input-2): when `<mouse target=@el>` and `@el` evaluates to `not` at mount,
fire E-INPUT-006. Or alternative: silently fall back to `document` (matches runtime-template.js:1590
current behavior: `(targetFn ? targetFn() : null) || (typeof document !== "undefined" ? document : null)`).
Decision needed — see §4 OQ-A. SPEC text + error catalog entry land here.

**Sub-phase 1.C** — SPEC §36 SSR client-only normative (OQ-input-3) (~30m)
Add normative statement parallel to `<timer>` SSR behavior: "The compiler SHALL NOT emit input-state
runtime setup into server JS output. Input state types are client-only." File: `compiler/SPEC.md`
insert into §36.5 or new §36.5.1.

**Gate:** SPEC amendments land first because sub-phases 2.B, 4.A, 4.C reference them normatively.

### Phase 2 — Parser / typer verification + duplicate-id detection (~3-5h)

**Sub-phase 2.A** — Type-system verification for `<#id>` member access (~1-2h)
Read `compiler/src/type-checker.ts` (likely under `compiler/src/typer/` or similar) and confirm
`InputStateRefExpr` member access is typed. Add tests if gap found.

**Sub-phase 2.B** — E-INPUT-005 duplicate-id detection (~2-3h)
File: `compiler/src/codegen/emit-html.ts` near lines 713–754.
Walk the AST collecting `(id, tag, scope)` tuples across all three input tags; second occurrence
of same id within same scope fires E-INPUT-005. SPEC §34 line 14900 makes this a CG-stage error.
Wire in the validator pass that already runs in `emit-html.ts` (the same pass that fires
E-INPUT-001..004). Add 4–6 unit tests in `input-state-types.test.js`.

**Gate:** unit tests + pretest pass.

### Phase 3 — Codegen + runtime audit (~2-3h)

**Sub-phase 3.A** — SSR no-emit guard test (~1-1.5h)
File: new test in `compiler/tests/unit/input-state-types.test.js` §17 — assert that compiled
**server** output contains no references to `_scrml_input_*` helpers. Wire as a permanent
regression guard. No code changes expected — this is a behavior-pinning test.

**Sub-phase 3.B** — Keyboard auto-repeat suppression regression test (~30m-1h)
Add §18 to `input-state-types.test.js` — assert `justPressedSet.add` is guarded by
`!pressedSet.has(key)` (mock `keydown` event twice with same key; second should NOT add to
`justPressedSet`). This pins the SPEC §36.2 "edge-based" normative against accidental future regression.

**Sub-phase 3.C** — Nested-scope cleanup unit test (~30m)
Assert that `emitInputStateNode` emits `_scrml_register_cleanup` at the per-call scope; verify
the emitted JS calls `_scrml_input_keyboard_destroy(id, scopeId)` with the SAME scopeId used at
create time. Pins SPEC §36.5 nested-scope normative landed in 1.A.

### Phase 4 — Conformance tests + DESIGN-AND-SHIP gate (~5-9h)

**Sub-phase 4.A** — Conformance suite for E-INPUT-001..005 (~2-3h)
Create files under `compiler/tests/conformance/`:
- `conf-INPUT-001.test.js` — `<keyboard/>` (no id) fires E-INPUT-001.
- `conf-INPUT-002.test.js` — `<mouse/>` (no id) fires E-INPUT-002.
- `conf-INPUT-003.test.js` — `<gamepad/>` (no id) fires E-INPUT-003.
- `conf-INPUT-004.test.js` — `<gamepad id="p" index=7/>` fires E-INPUT-004.
- `conf-INPUT-005.test.js` — duplicate id across input tags fires E-INPUT-005.
Pattern: mirrors `conf-AUTH-003.test.js`. ~30m per file.

**Sub-phase 4.B** — Frame-accurate-edge-detection integration test (~1.5-2h)
File: new `compiler/tests/integration/input-frame-accurate.test.js`.
Compile a minimal scrml fixture that uses `<#keys>.justPressed("Space")` in an animationFrame
loop with explicit `_clearFrameState()`. Mock `requestAnimationFrame` + `document` event dispatch.
Assert that `justPressed` returns `true` for exactly one frame post-keydown. This BACKS the
Insight 31 empirical claim with a positive test.

**Sub-phase 4.C** — DESIGN-AND-SHIP gate canvas sample app (~1.5-4h)
Required by debate-04 conclusion 4. Author one canvas sprite-movement demo:
- `samples/compilation-tests/input-canvas-demo.scrml` — minimal fixture that compiles clean.
- (Optional, defer if heavy) e2e Playwright spec `e2e/tests/06-input-canvas.spec.ts` exercising
  WASD movement + Space-to-fire + mouse-driven drawing + verified-cleanup-no-leak on page
  navigation.
Decision needed — see §4 OQ-C (compile-only vs. e2e).

**Gate:** full test suite green, conformance tests green, sample app compiles, optional e2e green.

### Phase summary

| Phase | Sub-phases | Hours | Files touched (primary) | Tests that gate |
|---|---|---|---|---|
| 1 | 1.A / 1.B / 1.C | 2 | `compiler/SPEC.md` | SPEC-INDEX refresh; no code tests |
| 2 | 2.A / 2.B | 3-5 | `compiler/src/codegen/emit-html.ts`, `compiler/src/typer/*` (verify) | `input-state-types.test.js` (delta +4-6 tests) |
| 3 | 3.A / 3.B / 3.C | 2-3 | `compiler/tests/unit/input-state-types.test.js` (delta +3 tests) | unit + pretest |
| 4 | 4.A / 4.B / 4.C | 5-9 | `compiler/tests/conformance/conf-INPUT-*.test.js` (5 new), `compiler/tests/integration/input-frame-accurate.test.js` (new), `samples/compilation-tests/input-canvas-demo.scrml` (new) | full suite + optional e2e |

### Flagged: items needing deep-dive or design-debate before impl

- **Frame-callback timing semantics** (sub-phase 3.B + 4.B). SPEC §36.2 calls
  `_clearFrameState()` "optional"; SPEC §36.6 shows it inside an animationFrame loop. Question:
  does the runtime guarantee `_clearFrameState()` is a no-op if not called? Insight 31's empirical
  claim depends on `_clearFrameState()` being available; the SPEC normative status of the
  call-site discipline ("must be called once per frame") is implicit. **No deep-dive needed —**
  one paragraph in SPEC §36.6 normative is sufficient.
- **OQ-input-2 (`<mouse target=@el>` null at mount) → silent fallback vs. E-INPUT-006** — see §4
  OQ-A. PA disposition.
- **OQ-input-multi-key-combo** — multi-key combo handling (`Ctrl+S`, etc.). SPEC §36.2's `.modifiers`
  property exposes individual modifier booleans; SPEC does NOT specify a `.pressed("Ctrl+S")` combo
  syntax. Surface as §4 OQ-D.
- **OQ-input-key-repeat** — SPEC §36.2 normative (15463–15466) says `justPressed` is edge-based;
  current implementation guards `justPressedSet.add` with `!pressedSet.has(key)`. This suppresses
  OS-level keyboard auto-repeat from firing `justPressed` repeatedly. SPEC normative captures the
  intent ("fires once per keydown event"); the implementation matches. **Already resolved by
  source + spec consistency.** No debate needed.

---

## §4 Open Questions (need PA / user disposition before impl)

### OQ-A — `<mouse target=@el>` null-at-mount behavior (OQ-input-2 from debate-04)

When `<mouse id="cursor" target=@canvasEl>` is mounted and `@canvasEl` evaluates to `not` at mount
time, what should happen?

- **Option α (silent fallback to `document`):** matches current runtime behavior (runtime-template.js
  line 1590: `(targetFn ? targetFn() : null) || (typeof document !== "undefined" ? document : null)`).
  Pro: zero-friction; common when canvas refs aren't ready at first paint. Con: silent surprise; mouse
  events captured at document scope instead of canvas scope, which may move sprites unexpectedly.
- **Option β (E-INPUT-006 mount-time error):** debate-04 OQ-input-2 candidate. Fires when the runtime
  resolves `@canvasEl` to `not`. Pro: explicit failure; matches scrml's general "errors over surprise"
  posture (§42 no-null-tokens stance). Con: timing — `@canvasEl` may legitimately be `not` on first
  effect and populated on second; this would require a "transitional grace window" or a `defer=`
  attribute.
- **Option γ (synthesis — fall back silently + W-INPUT-001 info lint):** captures both — silent
  fallback for ergonomics, but compiler emits an info lint when it can statically prove the target
  ref is never assigned. Pro: matches Option-d engine-self-write synthesis precedent (S87) — "do
  the safe thing at runtime, surface the smell at compile time." Con: requires static-reachability
  analysis on the ref var.

**Recommendation:** **Option γ** — matches S87 synthesis-pattern methodology (frequency-3 design
signal). Implement static target-ref reachability check; emit W-INPUT-001 info-level lint when ref
is never assigned (mirrors W-ENGINE-SELF-WRITE-DETECTED). Runtime keeps silent fallback.

### OQ-B — Nested-program scope boundary (OQ-input-1 from debate-04)

Per SPEC §36.5 normative additions in sub-phase 1.A: when `<keyboard>` is declared inside a nested
`<program>`, does cleanup fire at nested-program unmount or top-level unmount?

- **Option α (immediate enclosing scope):** matches existing `genVar("scope")` per-call uniqueness
  pattern. Cleanup at nested-program unmount.
- **Option β (top-level only):** rare; would break parity with `<timer>` / `<poll>`.

**Recommendation:** **Option α** — match `<timer>` / `<poll>` lifecycle parity. No reason for
divergence; nested-program is the canonical sub-mount point.

### OQ-C — DESIGN-AND-SHIP gate sample app scope: compile-only vs. e2e

debate-04 conclusion 4 mandates a canvas sprite-movement demo. The demo can land as:

- **Option α (compile-only fixture):** `samples/compilation-tests/input-canvas-demo.scrml` only.
  Pretest compiles it; no browser verification. ~1.5h.
- **Option β (compile + e2e Playwright):** + `e2e/tests/06-input-canvas.spec.ts` with WASD
  movement, Space-fire edge, mouse drawing, cleanup-no-leak verification. ~3-4h.
- **Option γ (compile + integration test, no Playwright):** + `compiler/tests/integration/
  input-canvas-integration.test.js` using JSDOM + mocked `requestAnimationFrame`. ~2h.

**Recommendation:** **Option γ** (compile + JSDOM integration). Heavier than α; lighter than β.
JSDOM-driven integration is the dominant pattern in the existing compiler test suite (e.g.,
`emit-server-sql-emission.test.js` integration tier). e2e Playwright (Option β) can land separately
post-§36 close as a "browser-confidence" deferred wave.

### OQ-D — Multi-key combo + touch / pointer-event scope

SPEC §36.2 does NOT define a combo syntax (e.g. `<#keys>.pressed("Ctrl+S")`). SPEC §36 does NOT
include touch / pointer events.

- **Option α (defer both to v0.next):** matches hand-off-88 gamepad-deferral posture. Keep §36
  scope tight.
- **Option β (include combo, defer touch):** combo is a syntactic-sugar layer over existing
  `.modifiers.ctrl && .pressed("s")` — implementable in ~1h, but expands §36 surface.

**Recommendation:** **Option α** — defer both. §36 is already shipping a 3-element trio; combo
sugar and touch are scope creep.

### OQ-E — `_clearFrameState()` normative status

SPEC §36.2 calls it "optional" but SPEC §36.6 (animationFrame integration) implies it's the
discipline-of-record. Should SPEC §36.2 be amended to normatively say "`_clearFrameState()` SHALL
be called at the top of each animation frame to obtain frame-accurate `justPressed` /
`justReleased` semantics"?

- **Option α (clarify normatively):** yes, add SHOULD/SHALL language.
- **Option β (leave optional):** keep flexibility for non-animation-loop consumers.

**Recommendation:** **Option α (SHOULD, not SHALL)** — frame-loop consumers should call it;
event-driven consumers (rare but valid) can skip it. SHOULD-level normative.

---

## §5 Estimated Total

### Per-phase summary

| Phase | Hours (low) | Hours (high) | Notes |
|---|---|---|---|
| Phase 1 — SPEC normative additions | 2 | 2 | 3 small SPEC edits + SPEC-INDEX |
| Phase 2 — Parser / typer / E-INPUT-005 | 3 | 5 | Gap-closure (E-INPUT-005 is the meat) |
| Phase 3 — Codegen + runtime audit | 2 | 3 | All 3 are pinning tests on existing behavior |
| Phase 4 — Conformance + DESIGN-AND-SHIP gate | 5 | 9 | Depends on OQ-C disposition (α=4h, β=7h, γ=5h) |
| **Total** | **12** | **19** | Range narrows on OQ-A and OQ-C dispositions |

### Compare to hand-off-88 estimate

- **hand-off-88:** `~12-25h`.
- **This scoping:** `12-19h`.

The lower-end matches; the upper-end is **6h lower** because the runtime + most of codegen is
already landed (see §0). The hand-off-88 upper bound likely assumed green-field implementation of
the runtime helpers; the actual remaining work is gap-closure + DESIGN-AND-SHIP-gate completion.

**If OQ-A picks Option γ (synthesis with W-INPUT-001 lint):** add ~2h for static reachability
analysis. New range: **14-21h**.
**If OQ-C picks Option β (e2e Playwright):** add ~2h for browser e2e infrastructure. New range:
**14-21h**.
**If both:** **16-23h** (still within hand-off-88 envelope).

---

## §6 Test Strategy

### §6.1 Frame-accurate edge detection (unit)

Mock `requestAnimationFrame` + `document.addEventListener` to deterministically dispatch keydown,
clear-frame, query-justPressed sequences. Pattern reference: any existing unit test in
`engine-ontimeout-end-to-end.test.js` that mocks `setTimeout` is a useful precedent.

Concrete shape:
```
test("justPressed clears after _clearFrameState", () => {
  // mock document.addEventListener to capture keydown handler
  // dispatch fake keydown { key: "Space" }
  // call <#keys>._clearFrameState()
  // dispatch second keydown (no key change)
  // assert <#keys>.justPressed("Space") returns true once, false after
});
```

### §6.2 Engine integration

Not applicable in normal flow — input state is read in animationFrame loops, not in engines
(SPEC §36.6 normative). One adversarial test: verify that DG does NOT credit `<#X>.pressed(...)`
as a reactive dep when used inside a `state-decl` initExpr or derived cell expression. (This is a
boundary-pinning test; the expected behavior is "no subscription set up" per SPEC §36.6.)

### §6.3 Conformance (SPEC §34 normative)

5 files in `compiler/tests/conformance/conf-INPUT-001.test.js` through `-005.test.js`. Each compiles a
minimal scrml fixture that should trigger the corresponding error and asserts the error code in the
pipeline error array. Mirrors `conf-AUTH-003.test.js` (1-test-per-file pattern). Total: 5–10 tests.

### §6.4 DESIGN-AND-SHIP gate sample app

Per OQ-C disposition. Compile-only fixture is minimum; JSDOM-integration is recommended; Playwright
e2e is stretch goal.

### §6.5 SSR no-emit regression guard

One unit test in `input-state-types.test.js` §17: compile a fixture with `<keyboard id="k"/>`,
generate server output, assert server output contains no `_scrml_input_*` substrings.

### §6.6 Test counts impact

Estimated delta to test counts (currently 11,153 pass / 85 skip / 1 todo / 0 fail per
`primary.map.md`):

- +4-6 unit tests (E-INPUT-005)
- +3 unit tests (auto-repeat / SSR guard / nested-scope cleanup)
- +5-10 conformance tests (5 files)
- +2-4 integration tests (frame-accurate)
- +0-3 e2e tests (OQ-C dependent)

Expected new count after §36 close: **~11,170-11,180 pass** (still 0 fail expected, no regressions).

---

## §7 Map content consulted

- `primary.map.md` — task-shape routing for "new language feature implementation" branch.
- `domain.map.md` — pipeline-stage ownership (BS / TAB / TS / DG / CG); confirmed §36 lives in the
  existing pipeline (no boundary creation).
- `schema.map.md` — confirmed `<#id>` is `InputStateRefExpr` ExprNode and no new AST kind is needed;
  `MarkupNode` carries `<keyboard>` / `<mouse>` / `<gamepad>` via plain tag string.
- `error.map.md` — E-INPUT-001..005 in catalog; E-INPUT-005 SPEC catalog line 14900 vs.
  source-absent gap surfaced.
- `test.map.md` — `input-state-types.test.js` already present; conformance pattern (`conf-AUTH-003.test.js`)
  identified as template for `conf-INPUT-*.test.js` series.

**Load-bearing finding:** §36 is a gap-closure dispatch, not green-field — `~70%` of the surface is
already landed. Hand-off-88's `~12-25h` envelope is generous; revised range is `12-19h`
(`14-23h` with OQ-A Option γ + OQ-C Option β).

---

## §8 Acceptance Criteria (for the implementation dispatch)

A future implementation dispatch is CLOSED when:

1. SPEC §36.5 / §36.6 / §36.7 carry normative text for OQ-input-1 / OQ-input-2 / OQ-input-3.
2. E-INPUT-005 fires on duplicate id within scope (4-6 unit tests + 1 conformance test).
3. SSR no-emit regression guard is in place.
4. Keyboard auto-repeat suppression regression guard is in place.
5. Nested-scope cleanup regression guard is in place.
6. 5 conformance test files (`conf-INPUT-001.test.js` ... `conf-INPUT-005.test.js`) exist and pass.
7. Frame-accurate-edge-detection integration test passes (Insight 31 Gate 1 backed by positive test).
8. DESIGN-AND-SHIP gate sample app compiles cleanly (compile-only fixture at minimum, per OQ-C
   disposition).
9. Full test suite green (11,170+ pass / 0 fail).
10. `master-list.md` updated with §36 close entry; `primary.map.md` refreshed.

---

## Tags
#scrml #scoping #§36 #input-devices #keyboard #mouse #gamepad #insight-31 #design-and-ship #s89 #s88-handoff
