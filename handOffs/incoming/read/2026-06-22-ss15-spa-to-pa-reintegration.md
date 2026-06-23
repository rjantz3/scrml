---
needs: action
from: sPA ss15 (render-collection-codegen)
to: PA
date: 2026-06-22
re: re-integrate branch spa/ss15 → main (all 5 items landed)
---

# sPA ss15 re-integration — `spa/ss15` ready to merge

**Branch:** `spa/ss15` · **tip SHA:** `8a649853d2fbac314eafbc2a175c9dcf8eafdb95` · **base:** `1ce8de34` (session-start origin/main).
All 5 list items dispositioned **landed-on-branch**. None parked, none dropped. Tree clean; every commit pre-commit-hook-gated (full suite incl. browser).

## Items landed (per-item SHA)
| # | item | SHA | notes |
|---|------|-----|-------|
| — | sPA scope+R26 checkpoint (3 BRIEFs + progress) | `5257b7f8` | bookkeeping |
| 1 | `g-tailwind-lint-false-fires-on-scoped-class` (LOW) | `6ad31d8b` | `findUnrecognizedClasses` excludes author `#{}`/`<style>` `.selectors` (text pre-pass, no AST). +8 tests. |
| 2 | `g-on-mount-bare-call-render-slot` (MED→HIGH) | `c13bbc48` | POSITIONAL fix (markupParentStack; default-logic tags {program,page,channel}) + 2 over-fix carve-outs (lift-expr renders anywhere §17.4; engine/match arm = nested markup via `nestedMarkupContext`). emit-html.ts + emit-variant-guard.ts. +11 tests; emit-html-meta §10 re-baselined. |
| 3 | `g-request-lift-nested-interp-mangle` (MED) | `8a649853` | PARSE fix: `preprocessWorkerAndStateRefs` (ast-builder.js) made span-aware (skip `<#...>` inside BLOCK_REF child ranges + re-shift). Kills the `feed_.data}` content-split leak. |
| 4 | `g-request-lift-bare-if-reads-input-registry` (LOW) | `8a649853` | requestIds threaded into emit-lift.js + emit-control-flow.ts; `<#id>` lift-body ref → `_scrml_request_<id>` (effect-wrapped, S213 Seam-2/3). §36 `<#cursor>` unchanged. +10 tests (request-id-render-bridge §7/§8). |
| 5 | `spec-677-worked-example-1-doc-migrate` (doc) | `8a649853` | SPEC §6.7.7 Examples 1+2 `${}`-wrapped (bodies verbatim). Silent raw-text ship stopped. |

R26 (sPA-independent, on the LANDED branch state) passed for every code item; evidence in each commit body + `spa-lists/ss15.progress.md`.

## Re-integration notes (READ before merge)
- **origin/main advanced to `a93223fe`** during my run (ss16 re-integration + deputy ticks 186). Merge-base with spa/ss15 is still `1ce8de34`.
- **Only one shared file: `compiler/SPEC.md`.** ss16 (`6650f1eb`) edited SPEC.md at lines 8137–22259; my §6.7.7 edits are at 4314/4336 — **>3700 lines apart, `git merge-tree` shows NO conflict markers → clean auto-merge.** No cherry-pick needed; a plain merge/file-delta is safe (verified pre-send).
- **SPEC-INDEX regen needed after merge:** my §6.7.7 edit added ~4 lines, shifting line ranges below §6.7. Run `bun run scripts/regen-spec-index.ts` (ss16's 64a5c639 already regen'd for ss16; mine stacks on top).
- All other ss15 files (tailwind-classes.js, emit-html.ts, emit-variant-guard.ts, ast-builder.js, emit-lift.js, emit-control-flow.ts, the test files) are **disjoint** from origin/main's 4 new commits → clean.

## NEW RESIDUALS to file (2 — surfaced during ss15, NOT fixed; out of list scope)
1. **`g-control-flow-in-markup-lift-body-evades-diagnostic`** (BUG, R5 — diagnostic bug). `E-CONTROL-FLOW-IN-MARKUP` (`ast-builder.js:1518`, gated `block.type==="text"` + `BARE_CONTROL_FLOW_IN_MARKUP_RE`) does NOT fire when the bare control-flow body contains `lift` (`<div> if(c){ lift <p>x</> }</>`) — it silently ships the raw `lift …` source text into the DOM. Fires correctly for bare `for(){<li>}` (no lift). Same silent-accept class the S203 diagnostic was meant to close; the `lift` keyword evades the text-block gate. Separate codegen item.
2. **`g-spec-677-example-not-and-eqnot-currency`** (doc currency — BEYOND item-5's `${}`-wrap scope). The §6.7.7 examples still don't compile clean after the wrap: Example 1 uses `not <#profile>.stale` as boolean negation → **E-TYPE-045** (canonical `!`); Example 2 uses `@appConfig == not` → **E-EQ-002** (canonical `is not`) AND a pseudo-code body `/* render using @appConfig *</>`. The `not`/`==not` swaps are mechanical (prescribed by the error messages); the pseudo-code needs real render content. Recommend a §6.7.7 example currency sweep. (Held back deliberately — item-5 brief scoped to the wrapper only; the `not`/`==not` are a distinct semantic class + the pseudo-code is a third issue.)

## Worktrees (PA-owned cleanup at re-integration)
- sPA worktree: `../scrml-spa-ss15` (branch `spa/ss15`) — sibling, outside `.claude/worktrees/`.
- 3 agent worktrees under `scrml/.claude/worktrees/agent-{a5714abce…, ae67432fc…, a184d3760…}` — left for your wrap-cleanup sweep (file-delta already extracted; agent branches `worktree-agent-*` carry the full work for crash-recovery).

— sPA ss15, done. (No wrap performed — PA owns all durable main-state per spa-scrml.md §Lifecycle.)
