# BRIEF — bare-control-flow-in-markup diagnostic (S203 dispatch, agent af88c53a8985b37fb)

The (a) reject+recover fix for the reframed `g-raw-interp-channel-meta-corners`. Verbatim dispatch prompt (scrml-js-codegen-engineer · isolation:worktree · opus · background):

---

Implement the (a) reject+recover fix for `g-raw-interp-channel-meta-corners` (reframed): a bare control-flow keyword (`for`/`if`/`while`) leading a text run inside a MARKUP body is currently SILENTLY accepted and shipped as raw `for(){}` text into the DOM. Add a diagnostic + graceful recovery. change-id: `bare-control-flow-in-markup-diagnostic-2026-06-17`. User ruled (a) reject+recover over (b) tolerate.

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
1. `pwd` → WORKTREE_ROOT, MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-` (else STOP — S90).
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` == WORKTREE_ROOT.
3. `git -C "$WORKTREE_ROOT" merge main` (S112). 4. status clean. 5. `cd "$WORKTREE_ROOT" && bun install` then `bun run pretest`.
- EVERY edit via Bash on worktree-absolute paths (.claude/worktrees/agent-<id>/ segment); NOT Edit/Write; NEVER main-rooted; NEVER `cd` into main. First commit includes verbatim pwd.

## MAPS — read `.claude/maps/primary.map.md`; compiler-source bug fix routing; maps current at 60d547e1 (only doc/test-infra since). Report Maps feedback.

## THE BUG (root diagnosed prior dispatch — build the fix)
SPEC §17.4 mandates Tier-0 iteration be `${ for/lift }`. The canonical forms compile clean. Three fixtures omit the `${ }` (bare `for` in a `<ul>` body): channel-basic-001, channel-multiple-001, phase2-for-lift-outside-logic-109. Mechanism: `BARE_DECL_RE` (ast-builder.js:410) matches only decl keywords, not for/if/while; §40.8 auto-lift fires only when parentType !== "markup" (~1319/~1353), never nested markup → the whole for(){} (incl its ${...}) is classified inert [text] + emitted verbatim. The raw ${...} is a symptom; the disease is the silently-shipped control-flow.

## THE FIX (reject + recover)
1. Detect a bare `for`/`if`/`while` leading a text run inside a MARKUP body. Do NOT fire on: §40.8 roots (auto-lift), `${ }`-wrapped control-flow (canonical), `if=` attribute, `<each>`/`<match>` elements, control-flow already inside a logic block. Authorized to correct the touchpoint (block-splitter vs ast-builder).
2. NEW §34 code (Rule 4 — lands in SPEC §34 this change). Suggested `E-CONTROL-FLOW-IN-MARKUP` (confirm vs §34 conventions + the S111 E-UNQUOTED-DISPLAY-TEXT precedent). Message: wrap control-flow in `${ ... }` per §17.4 (point at the canonical form). Add the §34 row + a §17.4/§7 normative note.
3. Recover: the construct MUST NOT ship raw for(){}/${...} text. Recovery design yours; invariant = rendered DOM has NEITHER raw for(){} NOR raw ${...} for these sources.

## EXPECTED-ERROR RECLASSIFICATION (don't skip — or the suite breaks)
The 3 fixtures are deliberate non-canonical probes; after the fix they fail-to-compile. Find how each is consumed; if a conformance/compile test asserts clean-compile, convert to EXPECTED-ERROR (assert the new code) — do NOT rewrite them to canonical `${}`. Regenerate the e2e-render-map baseline (compiler/tests/e2e-render-map/e2e-render-map-baseline.json) so the 3 cells record fails-compile not S-RAW-INTERP (`node generate-baseline.js --write` — read its header).

## PHASE 3 — R26 (MANDATORY)
1. observe-one each source → S-RAW-INTERP gone (fails-compile; no raw ${ in DOM).
2. Regression: canonical `<ul>${ for (x of [1,2,3]) { lift <li>${x}</> } }</>` + `${ for (msg of @messages){...} }` compile clean, real interpolation, NO false-fire. Add a unit regression for BOTH the new diagnostic AND canonical-still-clean.
3. FULL `bun run test` (not just subset — conformance/browser/e2e live there + your reclassification touches them) → 0 fail before DONE.

## COMMIT DISCIPLINE (S83) — incremental per unit; status clean before DONE.

## FINAL REPORT — WORKTREE_ROOT, FINAL_SHA, FILES_TOUCHED, the §34 code name, Phase-3 before/after per source, canonical-still-clean confirmation, how the 3 fixtures were reclassified (which test files), baseline-regen result, FULL bun run test counts, Maps feedback. Flag any SPEC clause beyond §34/§17.4 — don't expand scope silently.
