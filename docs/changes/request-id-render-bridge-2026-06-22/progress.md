# request-id-render-bridge-2026-06-22 — progress

change-id: request-id-render-bridge-2026-06-22
bug: g-request-id-render-bridge-unwired (HIGH)
base: main acec6c10 ; worktree HEAD ca712295 (moved per S213 landings)
worktree: /home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-a7ebad43cb09db70f
pre-commit-gate baseline (clean): 17538 pass / 68 skip / 1 todo / 0 fail / 966 files

## Phase 0 — scope finding (clean bridge, NOT architectural)

The fix is a CLEAN BRIDGE, not architectural. Three lowering seams + a reactivity
primitive already present in the runtime (_scrml_deep_reactive).

### Root cause (confirmed by reproducer, worktree HEAD)
A <#id> markup ref is parsed UNCONDITIONALLY into an input-state-ref ExprNode
(expression-parser.ts:329, :1712-1715) with no knowledge of whether id names a
<request> (par 6.7.7) or an input-state element (par 36). All three lowering seams
emit the par 36 registry lookup _scrml_input_state_registry.get("id"):
  1. emit-expr.ts:1957 emitInputStateRef (structured node — the interpolation path)
  2. emit-expr.ts:529-533 emitIdent bare _scrml_input_<id>_ recovery (TAB-preprocessed)
  3. rewrite.ts:544 rewriteInputStateRefs (string pipeline)
The request never .set("id", ...) into that registry, so the read is undefined.

rewriteRequestRefs (rewrite.ts:500, Pass 6) WAS the intended bridge (rewrites
<#id>.loading|data|error|stale|refetch -> _scrml_request_id.<m>) but it only runs on
the STRING pipeline; the structured-AST interpolation/if=/match-on= path never reaches
it. So ${<#id>.data} hits seam 1, not the string rewriter.

### Three additional defects found
- _scrml_request_<id> is a PLAIN object; mutating .data/.loading triggers no effect
  re-render (no reactivity). Bridging alone would still not re-render.
- The binding-effect-wrap decision keys on varRefs.length > 0 (@var refs only); a
  request-ref produces NO @var, so ${<#id>.data} falls to the non-reactive one-shot
  path (binding dropped/static).
- _scrml_notify(id) is emitted 4x by emitRequestNode (url= and api=) but DOES NOT
  EXIST in runtime-template.js — a latent ReferenceError on fetch resolve.

### Chosen fix shape — CLEAN BRIDGE
1. Make _scrml_request_<id> reactive via the existing _scrml_deep_reactive(...) Proxy
   (runtime-template.js:2973) — reads inside _scrml_effect auto-track at property
   granularity; .data=/.loading=/.error= writes auto-trigger. Drop the dead
   _scrml_notify(...) calls (the Proxy set-trap replaces them).
2. Thread the set of <request> ids to codegen; route <#id> refs whose id is a request
   to _scrml_request_<id> in all three seams (emitInputStateRef, emitIdent recovery,
   rewriteInputStateRefs); keep par 36 input-state lowering UNCHANGED for non-request
   ids (render-once non-reactive by design, par 36.6).
3. Recognize a request-ref as a reactive dep so the binding takes the effect-wrapped
   path (interpolation / if= / match-on=).

Keeps par 36 render-once semantics intact (only <request> ids become reactive).

## Log
- Phase 0 complete; scope = clean bridge. Beginning impl.
