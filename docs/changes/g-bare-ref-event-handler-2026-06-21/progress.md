# Progress: g-bare-ref-event-handler-2026-06-21

## 2026-06-21 15:29:20 — startup
- WORKTREE_ROOT=/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-abab18f300e83efc1
- HEAD at start: 8dba968e (== origin/main; brief's 09cc6b21 not in history — stale ref, 8dba968e is current main HEAD incl S212 W4 + fixes)
- maps read: primary.map.md (compiler-source bug-fix shape)
- Next: bun install + pretest, then locate event-binding collector / attribute classifier

## 2026-06-21 15:38:19 — fix landed
- ROOT confirmed: onclick=bump parses to {kind:'variable-ref', name:'bump'} (ATTR_IDENT, ast-builder.js:2290); emit-html.ts variable-ref else-branch emitted literal onclick="bump" → dead handler (nonexistent global).
- FIX 1 (binding-registry.ts): added bareRefHandler?:boolean to EventBinding interface.
- FIX 2 (emit-event-wiring.ts): local interface field + short-circuit — bareRefHandler binding emits handlerExpr = resolvedHandler (DIRECT, no function(event){fn();} wrap), per §5.2.2 row 5.
- FIX 3 (emit-html.ts): NEW else-if branch in variable-ref handler — on*= bare non-@ identifier routes to addEventBinding({bareRefHandler:true}) instead of literal attr emission.
- R26 emit-grep: bare-ref div → data-scrml-bind-onclick + _scrml_bump_4 DIRECT; call form + expr form unchanged; node --check clean; no literal onclick=bump.
- Next: happy-dom mount/click proof + value-asserting test (delegable click + non-delegable mousedown bare-ref).

## 2026-06-21 15:41:56 — test added + verified
- NEW compiler/tests/browser/g-bare-ref-event-handler.browser.test.js (8 tests, 15 expects, all pass).
- §1 emitted shape: no literal onclick="bump"/onmousedown="startPan"; data-scrml-bind-* present; bare-ref wired DIRECT (_scrml_bump_N, no wrap); call form still wraps function(event){fn();}; expr form arrow intact.
- §2 happy-dom runtime PROOF: click bare div → @n===1 (was dead pre-fix); mousedown bare-mouse div → @pan===1 (non-delegable, flogence case); call+expr forms fire too. No ReferenceError.
- Fix commit: 4896c70a (full pre-commit gate green).
