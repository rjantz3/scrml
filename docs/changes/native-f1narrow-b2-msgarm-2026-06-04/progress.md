# progress — native-f1narrow-b2-msgarm-2026-06-04

F1-narrow + B2: native parser §51.0.S engine message-arm end-to-end (parity-closer).

## 2026-06-04 — startup + survey
- Startup verification PASSED. WORKTREE_ROOT=/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a47ba0b97f71c6a04
- Base HEAD f11db672 (origin/main S163 wrap; brief said 154a1799 but origin advanced — f11db672 INCLUDES the F1 engine-substrate fix, ancestor of 154a1799? No — 154a1799 is ancestor of f11db672). Tree clean, bun install + pretest OK.
- R26 BASELINE reproduced (confirms PA findings):
  - default exit 0, client.js 3470 B, 4 `_scrml_engine_dispatch_message|_msg_arms` hits.
  - native exit 1, client.js 2231 B (silent miscompile — file emitted despite exit 1), 0 dispatch hits, 2x E-UNQUOTED-DISPLAY-TEXT on arm lines (stage TAB).
- TRACE (reverted): the E-UNQUOTED fires in `parse-markup.js` `emitCodeDefaultRun`; runText = the WHOLE leading-`|` arm region per state-child (scanCodeDefaultRunExtent only breaks on `<`/`"`/`${`/`//`, so the arm `{...}` braces don't split the run). Single fire site in native parser; live has NONE.

## Phase-0 (Part 1) finding — PROCEED (no STOP)
- Injection point IS context-aware: `dispatchCodeDefaultBody` runs only when `isCodeDefault(currentBodyMode(ctx))` (parse-markup.js:1039), i.e. inside engine state-child / match-arm / `:`-shorthand code-default bodies (body-mode established per-TagFrame via `bodyModeForChildOf`). Scoping the leading-`|` arm-region recognition there is correctly NARROW — does not globally permit leading-`|`.
- Localized scoped recognition, NOT a multi-stage architecture fork → proceed.

## Plan
- Part 1: in `dispatchCodeDefaultBody`, before `emitCodeDefaultRun`, recognize a leading-`|` message-arm region (mirror live `parseMessageArms` skipTrivia + first-char-`|` + per-arm extent) and consume it as raw bytes (NO E-UNQUOTED). Render body after arm region keeps normal treatment.
- Part 2a: walker engine-statechild-walker.ts:516 `messageArms: []` -> `(isColonShorthand||isSelfClose)?[]:parseMessageArms(readBodyRaw(...)).arms`.
- Part 2b: collect-hoisted.js synthEngineDecl -> add `acceptsType: readAttrName(attrs,"accepts")` (null when absent, matching live ast-builder.js:12622).

## 2026-06-04 — Part 1 + Part 2 landed; R26 root-causes a SEPARATE family
### Part 1 (F1-narrow) — committed 49c63d1b
- parse-markup.js `dispatchCodeDefaultBody`: added leading-`|` message-arm recognition + `scanMessageArmRegionExtent` (mirrors live parseMessageArms extent). Consumes the arm region verbatim, no E-UNQUOTED. After Part 1: native E-UNQUOTED count = 0 (was 2).
- Intermediate state confirmed: with arms consumed but NOT walked, codegen hit E-CODEGEN-INVALID-JS on `@dragPhase.advance(...)` (the silent miscompile is now correctly CAUGHT, not emitted).

### Part 2 (B2 walker + acceptsType) — committed (this step)
- engine-statechild-walker.ts:491/516: hoist bodyRaw local; messageArms = (isColonShorthand||isSelfClose)?[]:parseMessageArms(bodyRaw).arms.
- collect-hoisted.js synthEngineDecl: acceptsType = readAttrName(attrs,"accepts") (read + node field).
- PROBE (reverted) — `collectEnginesWithMessageArms`/`collectEngineMessageVariants` now return BYTE-IDENTICAL engineMeta native-vs-default:
    varName="dragPhase" acceptsType="DragMsg" messageVariants=["Start","Drop","End"] stateChildren=[Idle:2arms, Dragging:3arms]
  => the message-dispatch SUBSTRATE (__scrml_engine_dragPhase_msg_arms, 4 hits) emits identically. The B2 plumbing is COMPLETE + CORRECT.

### R26 RESIDUAL — a DIFFERENT native-parser family (NOT F1/B2): attribute-value exprNode
- After Part 1+2, native STILL exit 1: E-CODEGEN-INVALID-JS on `@dragPhase.advance({variant:...})` in the BUTTON onclick handlers (lines 45-47), byte 2622.
- PROBE (reverted) — root cause: on the NATIVE path, `emitCall` is NEVER reached for `@dragPhase.advance(...)` (default reaches it 3x with member-callee). The native parser captures the `onclick=@x.advance(...)` ATTRIBUTE VALUE as `{kind:"expr", raw, refs}` WITHOUT `exprNode` (tag-frame.js L1079-1445). Live ast-builder.js L1834/1857/1878 sets `exprNode: safeParseExprToNodeGlobal(raw,...)`.
- Consequence: emit-event-wiring.ts reads `binding.handlerExprNode = val.exprNode` (emit-html.ts:1735). Absent exprNode → string-fallback path (`rewriteExprWithDerived`) which does NOT detect `.advance` on engine vars → raw `@` leaks → E-CODEGEN-INVALID-JS.
- This is the NATIVE-PARSER attribute-value-exprNode population gap. It affects ALL structured-expr event handlers (`@x.advance()`, `@x = .Y`, etc.), NOT just message dispatch. The fixture's own header flags `.advance` handler wiring as "a SEPARATE pre-existing codegen gap."
- VERDICT: F1-narrow + B2 (this dispatch's SCOPED task) are COMPLETE. The R26 byte-identical gate is blocked by an ORTHOGONAL native family (attr-value exprNode) the brief did NOT scope (brief scoped parse-markup arm recognition + 2 walker/collect-hoisted wirings; typer/codegen parser-agnostic — R26 confirmed the gap is NOT there). SURFACING to PA per the brief's "if R26 still shows drift, the gap is structural — report it, do NOT claim closed."

## 2026-06-04 — within-node rebump (in-scope) + final disposition
- Within-node parity: BASE 1005/0; MY changes 1001/4 (engine-009/010/011/012 over-budget +2 EXTRA-FIELD each). Root cause (exact-signature `nativeParseFile(path,src).ast` diff): synthEngineDecl now stamps `acceptsType:null` on every engine-decl (live parity — live ALSO sets acceptsType:null). 4 NESTED-engine fixtures have a PRE-EXISTING nested-engine pairing offset; the classifier mis-pairs native's nested engine-decl vs a live text node, so its acceptsType counts EXTRA-FIELD. TOP-level engine-decls pair fine (no divergence). BENIGN convergence-toward-live; rebumped allowlist +2 each (40→42, 40→42, 44→46, 94→96; 4-line minimal diff). Re-run: 1005/0. No non-benign mismatch.
- FINAL R26: default exit0/4 dispatch hits; native E-UNQUOTED=0 (F1-narrow CLOSED) but exit1 E-CODEGEN-INVALID-JS at the `@x.advance` BUTTON handler (attr-exprNode gap). NOT byte-identical.
- DISPOSITION: F1-narrow + B2 = COMPLETE (message-dispatch substrate byte-identical, engineMeta byte-identical). R26 byte-gate BLOCKED by the orthogonal native attribute-value-exprNode family (~162 corpus files, consumed by if=/show=/bool-attr/props/handlers). Surfaced as DEFERRED follow-on; not closing the R26 gate, per brief.
