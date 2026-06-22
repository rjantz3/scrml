---
from: sPA ss16 (pongai-type-system-codegen)
to: PA
type: re-integration
date: 2026-06-22
needs: action  # PA re-integrate spa/ss16 → main + push
---

# sPA ss16 re-integration — PongAI cluster C5/C4/C3 LANDED

**Branch:** `spa/ss16` · **tip:** `6650f1eb` · **base:** `1ce8de34` (origin/main at sPA boot).
Divergence vs origin/main = `0 1` (0 behind, 1 ahead). Main checkout UNTOUCHED (no leak; verified
`git -C scrml status` clean except pre-existing `?? docs/graph/` + an unrelated inbound giti message).

**ACTION:** re-integrate `spa/ss16` → main (single-writer, S147 coherence-gated) + push. One sPA-authored
commit `6650f1eb` carries all three fixes + tests + SPEC + bookkeeping (file-delta of agent
`a58f1b208605f9779`'s 3 per-item commits).

## Items — all 3 landed-on-branch (R26-reproduced AND R26-verified by the sPA)

| item | sev | agent commit (provenance) | SPEC | sPA R26 verify |
|------|-----|---------------------------|------|----------------|
| C5 pongai-c5-ctor-arg-contextual-typing | med | `75bcf670` | §14.10 pos-3 | `.OnePlayer(.Easy)` compiles CLEAN; typo `.OnePlayer(.Nope)` → `E-TYPE-063` vs **Difficulty** (payload enum), not Mode |
| C4 pongai-c4-eq-vs-payload-variant-ctor | med | `0cf70072` | §45.7/§45.8/§34 | `@phase == Phase.Serving` fires `W-EQ-PAYLOAD-VARIANT` (warning → result.warnings); NO false-pos on unit-variant `==` / `is .Serving` |
| C3 pongai-c3-render-builtin-shadowing | high | `3f6fa0c8` | §20.3a/§34 | `c3.client.js`: def AND call both `_scrml_render_1()` (MATCH); `node --check` clean; `W-RENDER-SHADOWED` (info) fires; no-user-render still hijacks to builtin |

**Files (9 source/test/SPEC + 3 bookkeeping):** `compiler/src/type-system.ts` (+449: `inferBareVariantsAtVariantCtorArgs`,
`checkEqPayloadVariantOperands`, `checkRenderShadowing`), `compiler/src/codegen/emit-expr.ts` (render-shadow flag+guard),
`compiler/src/codegen/log-loc.ts` (`fileDeclaresFn`/`fileDeclaresRender`), `compiler/src/codegen/index.ts` (2-site wiring),
`compiler/SPEC.md` (§14.10/§45.7/§45.8/§20.3a + 2 §34 rows), 3 new test files
(`bare-variant-nested-context-inference`, `eq-payload-variant-lint-ss16-c4`, `render-shadowing-ss16-c3`).

## Verification

- **Pre-commit GATE (gating, excludes browser by design):** `17588 pass / 0 fail / 68 skip` across 970 files. ✓ green on the landing commit.
- **R26 independent recompile** of all 3 repros against the file-delta'd working tree (NOT the agent narrative) — all 3 behaviors confirmed (table above). Repros preserved in `spa/ss16` worktree `.repro-ss16/` (untracked scratch).
- **Browser-suite ENV-GAP (NOT a regression):** the post-commit broader run showed 140 fails, ALL browser-suite
  (`browser-conditionals` control-001/002 etc.) — the fresh sPA worktree lacked the gitignored
  `samples/compilation-tests/dist`. Symlinked dist + re-ran `browser-conditionals.test.js` → `11 pass / 0 fail`.
  Diagnosed ENV-GAP per the S209 ss9 precedent; my diff (variant typing / eq-lint / render-shadow) cannot affect
  if/else browser mounts. Re-integration into main (which has dist) is unaffected.

## Parked: none. All 3 landed.

## NEW residuals to file (out-of-scope, surfaced not fixed)

1. **Typer `E-SCOPE-001` on bare `render()` with NO user `function render`.** The call-form `render` builtin is
   not registered as a typer global (the typer's scope-checker fires `E-SCOPE-001`), even though codegen lowers
   it fine. Orthogonal to C3 (the PongAI/adopter cluster always has a user `function render` in scope, so it
   never hit this). Pre-existing diagnostic-coverage gap — candidate for a follow-up (register `render` in the
   typer's builtin allowlist, mirroring the C1/`animationFrame` allowlist class).
2. **C4 lint home vs the gauntlet eq-checks.** The new `W-EQ-PAYLOAD-VARIANT` is homed in `type-system.ts`;
   the sibling `E-EQ-001`/`E-EQ-003`/`W-EQ-001` live in `compiler/src/gauntlet-phase3-eq-checks.js` (map-key
   only). If the PA wants the equality diagnostics consolidated, that gauntlet file is the alternative home.
   No action required — just flagging the split for the diagnostics-catalog owner.

## Lifecycle

sPA run complete — list ss16 fully dispositioned (3 landed, 0 parked, 0 dropped). No wrap performed (sPA owns
no durable main-state). The branch + `spa-lists/ss16.progress.md` + this message ARE the handoff. User closes
the instance after this; PA owns re-integration + push + any residual filing.
