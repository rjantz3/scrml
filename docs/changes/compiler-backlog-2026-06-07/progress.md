# Progress — compiler-backlog-2026-06-07

2026-06-08T02:20:53Z start at /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ac370ae19bfca0917
2026-06-08T02:27:24Z investigation complete. Item A: parseStructBody+inline-struct (type-system.ts), disambiguate via startsWith(()&&!endsWith()) for fn-type arrow. Item B: buildImportGraph export loop (module-resolver.js), key on state-decl name-set; native @count form has a PRE-EXISTING native gap (raw="export", no name) — braced forms fire on both pipelines.
2026-06-08T02:35:42Z Item A complete: source committed 409734c6, SPEC §14.3+§34 + unit test (11 pass).
2026-06-08T02:39:45Z Item B source: module-resolver.js E-EXPORT-001 (collectStateCellNames + exportedLocalNames + check in buildImportGraph). Empirical: export{count} default+native, export@count default, export{total} derived all fire; export function/const/component/channel all clean. Corpus grep clean (all braced exports are re-exports; zero export@cell).
2026-06-08T02:43:18Z Item B complete: source committed, SPEC §21.2+§21.6+§34 + unit test (10 pass, both pipelines).
2026-06-08T02:48:38Z DONE. 4 feature commits (409734c6/589f2932/56d1a8df/b9419214). Full suite 23443/0; within-node 1006/0; new tests 21/0. Native export@count is a pre-existing native gap (surfaced not fixed). Corpus grep clean.
