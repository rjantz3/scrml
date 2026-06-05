# native-engine machineDecls instance-share — progress

## 2026-06-04 — startup + root-cause confirmation
- Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aaf3e8fbe1a821d5c
- S112 startup: ff-merged main (72c30b60 -> c9a458f9), bun install + pretest clean.
- Baseline byte-compare engine-modern-001-basic (default vs native):
  - DEFAULT: 4 `_scrml_engine_` / 4 `__scrml_engine_*_transitions` / 3 `_scrml_engine_direct_set`.
  - NATIVE:  0 / 0 / 0  -> entire §51.0 substrate DROPPED (confirmed S139-trap-proof; byte diff, not error-absence).
- Probe (parse-file): nodes engine-decl id=20, machineDecls engine-decl id=43, SAME-INSTANCE=false.
  ROOT CAUSE CONFIRMED: two distinct engine-decl instances; SYM stamps the nodes copy, codegen reads machineDecls copy.
- engine-009 (nested PlayMode in AppMode): DEFAULT emits BOTH appMode+playMode transition tables;
  NATIVE emits NEITHER. Native `bodyChildren` = raw native blocks (kind "Markup"), not mapped engine-decl
  AST nodes -> nested engine never reachable by SYM walkRegisterEngines (kind!=="engine-decl") AND
  the machineDecls nested copy is un-stamped.

## Fix design (recommended shape i, extended for native bodyChildren)
1. Map engine-decl bodyChildren to AST nodes (mirror live buildBlock-per-child) so nested <engine> becomes
   an engine-decl AST node reachable by SYM + codegen walkers.
2. Build machineDecls from the mapped nodes (mirror live collectHoisted(nodes)); push SAME instances;
   recurse bodyChildren. Remove the duplicate synthEngineDecl push in collect-hoisted.js.
3. Fix the misleading comment block at parse-file.js:575-583.
4. Update parse-file canary §5 dedup test: machineDecls now SHARES instances with nodes (mirrors live);
   the strict Set-dedup was locking the two-instance bug.

## Next
- Implement the fix in parse-file.js + collect-hoisted.js.

## 2026-06-04 — fix implemented + verified
- parse-file.js: synthEngineNode now maps bodyChildren (mapBlocksToNodes) + new collectMachineDeclsFromNodes
  walks mapped nodes -> machineDecls (instance-shared, mirrors live ast-builder.js L13616). FileAST machineDecls
  derived from nodes, not hoisted.machineDecls. Fixed misleading comment.
- collect-hoisted.js: removed duplicate engine synthesis from walkBlocks (was the bug).
- Probe confirms: nodes engine id == machineDecls engine id (was 20 vs 43); nested playMode now a structural
  engine-decl in bodyChildren (id shared).
- Byte-compare: engine-modern-001 + engine-009(nested) + mario transition table NOW emit under native.
  Sweep table (6 brief files) ALL BYTE-IDENTICAL: 001(4/4), 009(22/22), 005(5/5), 008(7/7), 010(26/26), 002(14/14).
- Mario residual = SEPARATE PowerUp enum-with-params parsing gap (native captures only ["Mushroom"], mis-emits
  PowerUp.Flower(3) as "Flower"(3), match-arm positional-bind fails). NOT engine-substrate; out of scope.
- Coupled test updates: parse-file canary allIds instance-dedup + 2 S163 canaries; collect-hoisted + m65-b3
  re-routed to FileAST machineDecls; m65-b56 sourceText test points at _nativeEngineBlock (real walker source);
  new native-engine-substrate-instance-share.test.js.
- Within-node canary: 18 engine/machine files improved; allowlist delta-shifted residual-preserving
  (2 benign SPAN-COORD bumps; 7 pre-existing non-engine failures preserved). Shape canary unchanged (1000/1001).

## Next
- Full pre-commit gate (unit+integration+conformance) running.
