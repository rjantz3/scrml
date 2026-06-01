# Progress — each-in-block-form-match-2026-06-01

## S153 (2026-06-01)
- Startup verify: worktree OK; base was 4e1f9492 (S152 wrap) — S153 fix 54d54d4d NOT an ancestor.
  Fast-forward-merged 54d54d4d into worktree (linear descendant; brief expects this base).
  HEAD now 54d54d4d, _scrml_remount_each present.
- bun install + pretest done.
- Created reproducers repro-1-sigil.scrml (@.name sigil) + repro-2-alias.scrml (as t alias).
- CONFIRMED bug at HEAD: repro-1 -> E-CODEGEN-INVALID-JS (`el.textContent = .name` leak);
  repro-2 -> compiles (alias path produces valid JS).
- Next: survey the malformed JS (neutralize validate-emit gate), find the exact emit path.

## ROOT CAUSE (empirically locked, S153)
Ground-truth malformed emit (validateEmit:false):
  _scrml_match_match_7_render_Browsing() returns LITERAL "<each in=...>...</each>" string
  + wire fn `el.textContent = .name;` (@. resolved to nothing -> .name leak).

Chain:
  1. BS treats <match> as STRUCTURAL_RAW_BODY: match.children = ONE text node
     (the whole arm body raw). Arms live only in armsRaw raw text, NOT walkable.
  2. ast-builder match-block: bodyChildren = [text] (just whitespace text node);
     arms NOT in walkable bodyChildren.
  3. emit-match buildMatchArms re-parses each arm bodyRaw via nativeParseFile ->
     produces `markup tag=each` (generic markup), NOT `each-block`. The each-block
     transform lives in ast-builder.js (buildAST), NOT in the native parser.
  4. generateHtml each-block branch (emit-html.ts:2030) needs kind==="each-block";
     gets `markup tag=each` -> renders literal <each> text. ${@.name} inside becomes
     unscoped logic binding -> `.name` leak.
  5. emit-each collectEachBlocks(ctx.fileAST) finds 0 each-blocks for match repro
     (vs 1 for engine repro, whose arm body IS walkable in fileAST).

Engine works b/c engine state-children ARE descended by BS into walkable children
-> each-block transform applies -> collectEachBlocks finds it -> render fn w/ @. rewrite.

PA hypothesis: directionally correct. Precise root: match-arm each is raw-text-only
(armsRaw); the nativeParseFile re-parse yields markup tag=each not each-block.

## FIX DESIGN (next)
Make re-parsed match-arm each become a real each-block reachable from ctx.fileAST so
(a) emit-each collectEachBlocks emits its render fn w/ @. rewrite, and
(b) generateHtml emits only the mount div (not inline render).

## FIX IMPLEMENTED (S153)
Two coupled codegen fixes:

### Fix 1 — emit-match.ts buildMatchArms (commit 4478ce09)
- bare-body arm re-parse: when armsRaw contains `<each`, re-parse via
  splitBlocks+buildAST (each-block transform applies) instead of nativeParseFile
  (which yields generic `markup tag=each`). This is the pre-M6.3 synthesis route,
  scoped to the each case only (every other arm body keeps the M6.3 native route).
- restampEachBlockIds(): re-stamps each-block ids (recursive, incl nested) to a
  globally-unique namespace = matchId*1e6 + armHash*1e3 + localIdx. Returns the
  lifted each-blocks.
- Attach lifted each-blocks to matchBlock.bodyChildren so emit-each's
  collectEachBlocks(fileAST) emits their render fn (with @.->iter-var rewrite).
- Memoize arms on the node (__scrmlCachedArms) so the HTML-mount pass + the
  client-render pass share the same each-block ids/refs.

### Fix 2 — emit-client.ts detectRuntimeChunks (commit 4be02d94)
- NEW match-block case: when armsRaw contains `<each`, add reconciliation +
  deep_reactive chunks (ships _scrml_reconcile_list + _scrml_remount_each +
  _scrml_each_renderers + _scrml_effect_static). Without this the arm-render code
  CALLS those helpers but the runtime tree-shakes them out -> ReferenceError on arm
  mount (compile-clean, node --check-clean; the S153 engine-arm Mode-3 class).
- Cheap raw-text probe (runs before emit-match attaches bodyChildren); defensively
  also descends into bodyChildren if already attached.

### Test (commit 6d70a870)
- compiler/tests/browser/each-in-block-form-match.browser.test.js — 12 tests,
  R26 runtime proof: loads compiled client.js AS-IS, asserts the <li> list
  populates on arm entry. Covers @. sigil + `as t` alias + real-onclick-path +
  ongoing reactivity + idempotent re-entry. §1 emit-shape guards (no leak, mount
  div, helpers ship).

## VERIFIED
- repro-1 (sigil) + repro-2 (alias) both compile (no E-CODEGEN-INVALID-JS),
  node --check clean, render via mount div (not literal <each>), no `.name` leak.
- The alias form, which PRE-FIX "compiled" but rendered as literal <each> text
  (never populated), now actually renders.
- Edge cases (manual): 2 eaches in one arm -> distinct ids; each in <_> wildcard
  arm; each-in-match + match-in-each(R28-1b) + deep nest all node-check clean.
- R28-1b (match INSIDE each) preserved — independent path; 46/46 match+each+R28-1b
  +engine-gated-each tests pass.
- S153 forward-correction: the engine-gated-each commit claimed its dispatcher
  hook "covers block-form <match>". The hook WAS wired into the shared
  emitVariantGuardedRender (emit-match calls it) but an each-in-arm never reached
  it because of THIS pre-existing compile bug. The fix makes that coverage real.
