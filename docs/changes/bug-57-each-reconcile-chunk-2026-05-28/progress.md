# progress — bug-57-each-reconcile-chunk-2026-05-28

(append-only, timestamped. Agent updates after each step. WIP commits expected.)

- DISPATCH (S140, baseline c4d5ef96): brief at BRIEF.md. Agent has not yet started.

- 2026-05-28T20:20Z (S140 agent): startup verification PASS (worktree=/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a339f6c8811d7ae8a; merged main → HEAD 73162ef9; bun install + pretest OK). Read BRIEF.md + primary.map.md in full.
- 2026-05-28T20:20Z: REPRODUCED Bug 57. Tier-1 `<each>`-only repro (/tmp/bug57/each-only.scrml): client.js CALLS _scrml_reconcile_list (1) + _scrml_effect_static (1); runtime bundle DEFINES _scrml_reconcile_list **0** times (MISSING). Control Tier-0 ${for…lift} runtime DEFINES it (1). Confirms root cause: emit-client.ts chunk-walk has no `case "each-block"`.
- 2026-05-28T20:21Z: FIX applied — added `case "each-block"` to detectRuntimeChunks switch (emit-client.ts ~line 692) adding chunks.add("reconciliation") + chunks.add("deep_reactive"), plus explicit walkNodes(node.bodyChildren) recursion (each-block uses bodyChildren not children/body). Post-fix recompile: runtime DEFINES _scrml_reconcile_list (1) + _scrml_effect_static (1); node --check passes on client.js + runtime.js.

- 2026-05-28T20:30Z: ADDED acceptance-gate test compiler/tests/browser/each-runtime-bug-57.test.js (10 tests). §1 targeted emit-regression (compile real path → runtime bundle DEFINES function _scrml_reconcile_list + no-dangling-call) + §2 happy-dom runtime drive (mount, empty renders "none", populate renders <li> rows, reconcile add/remove, swap-back-to-empty; asserts NO ReferenceError). Models 14-mario-runtime-sim (result.runtimeFilename read + new Function mount) + browser-match-block (Tier-1 markup runtime drive).
- 2026-05-28T20:30Z: FAILS-BEFORE proven — temporarily restored pre-fix emit-client.ts (parent 73162ef9): 5 pass / 5 FAIL. Failing-before set: §1 "runtime bundle DEFINES function _scrml_reconcile_list" + §1 "no dangling call" + §2 three row/reconcile tests (verbatim symptom "scrml effect error: ReferenceError: _scrml_reconcile_list is not defined" at _scrml_each_render_11). PASSES-AFTER — restored post-fix emit-client.ts: 10 pass / 0 fail. emit-client.ts working tree now matches HEAD (commit 18881933), clean.

- 2026-05-28T20:40Z: FULL SUITE — pre-commit gate (unit+integration+conformance, excludes browser): 15076 pass / 88 skip / 1 todo / 0 fail across 781 files (unchanged from baseline; chunk-walk touches all files' chunk selection, zero regressions). Browser suite (incl. new test): 232 pass / 8 skip / 0 fail across 13 files. (Note: an early post-commit broad run showed 2 TodoMVC "dist not compiled" fails — env-ordering artifact: gauntlet compiles benchmarks/todomvc/dist/ AFTER the dist-existence browser test; gitignored dist. Re-running browser-todomvc directly with dist populated: 39 pass / 0 fail. NOT a regression.)
- 2026-05-28T20:42Z: R26 EMPIRICAL VERIFICATION. No real .scrml adopter uses <each> yet (S130 Tier-1 form; grep of samples/+examples/+repo found only docs/tests). Probed 5 shapes via real compile path:
    s1 (in=@cell key=@.id <empty>):  reconcile_list DEF-in-runtime=1 CALL-in-client=1, node-check client+runtime OK
    s2 (of=5 as n, NO @-state):      DEF=1 CALL=1, node-check OK (validates the deep_reactive pull — no state-decl to pull _scrml_effect_static otherwise)
    s3 (in=@items as it key):        DEF=1 CALL=1, node-check OK
    s4 (CONTROL Tier-0 ${for…lift}): DEF=1 (no under-pull regression — for-stmt path still works)
    s5 (NEGATIVE no iteration):      DEF=0 CALL=0 (correctly NOT over-pulled)
  Bug 57 SYMPTOM GONE across all <each> shapes.
- 2026-05-28T20:42Z: DEFERRED (out of scope, NOT Bug 57): s4 Tier-0 ${for…lift} with a `:`-shorthand body `<li : r.name>` emits malformed client JS `< li : r . name >` (raw markup in a JS expression context) -> node --check FAIL. Confirmed IDENTICAL on the pre-fix baseline (73162ef9) -> pre-existing latent for-lift `:`-shorthand codegen bug, unrelated to this chunk-gating fix. Surfaced to PA.
