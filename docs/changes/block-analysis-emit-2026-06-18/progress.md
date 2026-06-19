# D1 progress — block-analysis-footprint.ts (the BREAK-1 fix, ADD-ALONGSIDE)

2026-06-18 — D1 start. Worktree-absolute writes (S126). body-dg-builder.ts MUST stay zero-diff.

- Startup verified: pwd under worktrees/agent-, toplevel == WORKTREE_ROOT, status clean, bun install, bun run pretest OK.
- Read SCOPE-AND-DECOMPOSITION.md (main path; created ahead of worktree base 83ac74a3) §1/§2/§4/§7.
- Read primary.map.md (codegen task-shape routing). Load-bearing: dotted resolution ALREADY BUILT in reactive-deps.ts (_deepSetLeafKey via stampCompoundDeepSetTargets) — D1 READS it, does not re-resolve.
- Read reactive-deps.ts (collectCompoundLeafTargets / stampCompoundDeepSetTargets / extractReactiveDepsFromExprNode), body-dg-builder.ts (addAssignTargetWrites 534-553, reactive-nested-assign 398-417, index-reads 409-416), types/ast.ts node shapes.
- PROBE (R26): real BS+TAB compile of a quoteForm fixture → after stampCompoundDeepSetTargets, the two RNA nodes carry DISTINCT _deepSetLeafKey (quoteForm.originCity != quoteForm.weightLbs), residual []. Stamp works post-buildAST (relies on compound `children`, no SYM needed). function-decl bodies hold the RNA nodes directly.
- NOTE: brief filename is block-analysis-footprint.ts (not SCOPE's block-analysis.ts); brief is the dispatch wrapper + names D2's import path ./block-analysis-footprint.ts — following the brief.

2026-06-18 — D1 COMPLETE.
- Wrote compiler/src/block-analysis-footprint.ts (450L). footprintForBlock(node, fileAST?) -> {reads, writes}. Committed 07c3f762.
- Wrote compiler/tests/unit/block-analysis-footprint.test.js (328L, 13 tests / 40 assertions). Committed 17e59808.
- Both commits passed the full pre-commit gate (17274 tests / 944 files).
- R26 verify: new test 13 pass / 0 fail; body-dg-builder.ts diff EMPTY (add-alongside invariant held); BREAK-1 canary on a REAL compiled quote-form AST asserts quoteForm.originCity != quoteForm.weightLbs (distinct dotted grain, not root-cell collapse).
- Export contract for D2: footprintForBlock(node, fileAST?) -> {reads: string[]; writes: string[]} from ./block-analysis-footprint.ts. STABLE.

2026-06-18 — D2 start (RE-DISPATCH; first D2 stalled at the starting line, zero work lost).
- Worktree branched off 83ac74a3 (pre-D1); D1 module ABSENT at startup → `git merge main` (FF to 696a53d0) pulled block-analysis-footprint.ts + the S112 stale-base guard. bun install + bun run pretest OK. Status clean.
- Read SCOPE §1/§3/§4/§7, the REAL D1 module (footprintForBlock contract: walks node.body, returns sorted/deduped no-@ reads/writes), engine-graph.ts + engine-graph.test.js (template), ast.ts node shapes (FunctionDeclNode.name/.body, ComponentDefNode.name/.raw, EngineDeclNode + _record.engineMeta.varName, TypeDeclNode.name, ChannelDeclNode tag:"channel" + attrs name=), emit-engine.ts collectors (return real AST nodes carrying .span), emit-channel.ts readChannelMeta (channel name attr extraction mirrored).
- Maps: primary.map.md codegen/new-feature/test-authoring task-shape routing. Load-bearing: D1's dotted resolution is consumed via footprintForBlock(node, fileAST) — D2 does NOT re-resolve; node discovery reuses FileAST collections + collectC12/C14EngineDecls (no re-walk), mirroring engine-graph.ts discipline.
- Wrote compiler/src/block-analysis.ts (428L). buildBlockAnalysisForFile / buildBlockAnalysis / serializeBlockAnalysis / buildBlockAnalysisJson. Source-order (span.start asc), honest-empty, fixed key order, JSON.stringify(_,null,2)+"\n". Channel name mirrors emit-channel. endLine derived from newline count in span slice (source-threaded), falls back to opener line.

2026-06-18 — D2 test + discovery fix.
- R26 PROBE (real compile): functions do NOT sit on FileAST.nodes — even a module-level fn is wrapped in a `logic` node (decls in logic.body); page-embedded `${…}` is a logic node under markup children. Initial top-level-only filter MISSED all fns. FIXED: collectFunctionDecls walks markup.children + logic.body (mirrors D1 test's functionDecls walker + engine-graph's markup walk); does NOT descend a fn's own body (top-level defs only, no anchor collision).
- R26 PROBE: engine `_record.engineMeta` is a SYM-pass product — buildAST alone leaves machineDecls empty / engineMeta absent, so collectC12EngineDecls returns nothing on a raw AST. Block-analysis runs at metaFiles (post-TS) where it IS populated. Unit test feeds a synthetic engineMeta-bearing engine-decl on machineDecls (engine-graph.test.js precedent); the real-engine path is D3's integration test.
- R26 PROBE: type-decl canonical form is `type Name:enum = { ... }` (the `type` keyword) — `Name: enum = a | b` does NOT register on typeDecls.
- Wrote compiler/tests/unit/block-analysis.test.js (16 tests / 69 assertions). All 5 kinds, id=<relpath>::<name>, span shape, SOURCE-ORDER (type→fn→channel→component→engine), REAL D1 footprint populated (bump writes counter + quoteForm.weightLbs dotted — NOT root-collapsed), honest-empty (type/channel + no-block file), endLine fallback, multi-file, fixed-key-order serialize, BYTE-DETERMINISM (single + multi-file).
- R26 verify: 16 pass / 0 fail. Footprint sample: fn `bump` writes ["counter","quoteForm.weightLbs"] (dotted grain end-to-end through real footprintForBlock).

# D3 progress — emit wiring (--emit-block-analysis flag + per-file sidecar)

2026-06-18 — D3 start. Worktree pwd: /home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-a2806a039d1651b47
- Startup: worktree base was 83ac74a3 (pre-D1/D2). `git merge main` → HEAD d12fdef7 (has D1+D2). bun install + bun run pretest OK. Status clean. D1+D2 files present.
- Read primary.map.md (codegen task-shape). Map STALE (watermark 359a1d83, ~20 commits behind d12fdef7; no block-analysis entries). Engine-graph anchors (cli.js:55, api.js:2551, compile.js:586) confirmed via grep against live source, NOT map.
- Read SCOPE §3 schema / §4 v1.3 / §7 D3. Read block-analysis.ts (buildBlockAnalysis / buildBlockAnalysisForFile / serializeBlockAnalysis / relativeFilePath). Read engine-graph wiring sites in api.js + compile.js + cli.js.
- DIVERGENCE confirmed empirically: gather pass (api.js:783-821) adds imported .scrml files to the file SET, so metaFiles can be a SUPERSET of inputFiles AND order differs → order-zip inputFiles[i]↔analyses[i] is UNSAFE. Using IDENTITY match (relPath suffix) — proof in report.
- api.js: import buildBlockAnalysis from ./block-analysis.ts; added `blockAnalyses: () => buildBlockAnalysis(metaFiles)` next to engineGraphJson. PER-FILE (returns BlockAnalysis[], each carrying .file relpath + only that file's blocks). Committed.
- compile.js: emitBlockAnalysis flag (decl 100, parse 173, return-destructure 283, runOnce-destructure 413); import serializeBlockAnalysis from ../block-analysis.ts; PER-FILE write-loop after the engine-graph loop (~616). Match = IDENTITY: exact .file===absNorm, else absNorm.endsWith("/"+a.file) (the common case — relPath is a suffix), else basename. Honest-empty fallback {version:1,file:base,blocks:[]}.
- cli.js: --emit-block-analysis registered in help (line 56).
- R26 (real CLI, examples/22-multifile 3-file): app + components honest-empty blocks:[]; types.scrml ONLY its own blocks (UserRole type + badgeColor fn, id=<relpath>::<name>, span.line/endLine present). Three sidecars DISTINCT (per-file proof, no merged blob).
- R26 BREAK-1 (real CLI, trucking load-new.scrml): setOriginCity writes ["loadForm.originCity"], setOriginState writes ["loadForm.originState"], setDestinationCity writes ["loadForm.destinationCity"] — DISTINCT dotted grain, NOT root-collapsed. 13 blocks.
- R26 byte-determinism: app/components/types + load-new each byte-IDENTICAL across two compiles (diff clean).
- Wrote compiler/tests/integration/emit-block-analysis-integration.test.js (9 tests / 106 assertions). In-process content (mario: 3 type/4 fn/2 engine, eatPowerUp footprint, engine-via-SYM, source-order); BREAK-1 dotted-grain on real load-new (loadForm.originCity != loadForm.originState; gather→5 analyses>1 input proves identity-match needed); CLI write-loop end-to-end via Bun.spawn of compiler/src/cli.js (written + parses + only-own-blocks; honest-empty <program><page> markup-only blocks:[]; multi-file mario+triage DISTINCT sidecars (merged-blob guard: DragPhase in triage NOT mario); byte-determinism + trailing-newline). 9 pass / 0 fail.
