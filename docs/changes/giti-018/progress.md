# Progress: giti-018

- Started at worktree /home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-ab24dfdb49e5dd697
- Startup discipline OK: pwd == git toplevel == worktree; merged main; clean tree; bun install.
- Mailbox: empty (seed line only) at startup + commit checkpoint.
- Root cause: rewriteStdlibImports regex `^import...` (gm) had NO leading-whitespace
  allowance. Only the FIRST library import is de-indented to col 0; subsequent imports
  keep source indentation -> never matched -> stayed bare `scrml:NAME`. Leading comment
  also defeated even the first. The regex already had /g; the brief's "no /g" hypothesis
  was wrong — it was the `^`-anchor vs indentation.
- Fix: api.js rewriteStdlibImports — capture optional leading `[ \t]*` indent (group 1),
  shift backref to \3, allow optional trailing ws before `$`, round-trip the indent.
  Pinned to rewriteStdlibImports only (no broader api.js regions touched).
- Test: emit-library.test.js §11 — 4 tests (unit on rewriteStdlibImports: indented multi-import,
  leading-comment, unbundled-left-bare; + full disk-write integration with 3 stdlib imports).
- Repro before fix: scrml:path rewritten, scrml:fs + scrml:process stay bare.
- Repro after fix: all 3 -> ./_scrml/*.js, zero bare scrml:, ESM node --check clean.
- bun test emit-library.test.js: 32 pass / 0 fail.
