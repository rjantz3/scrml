# canonical-examples-sweep — progress

Worktree: agent-a86f44f42f0576a65
Branch: main (worktree branch)
Base SHA: 13154ba (docs(v0.3.0-announce))
Template: a2f9f9b examples/14-mario-state-machine.scrml (sibling branch — proof-of-shape)

## Plan

- Tailwind-inline (7 files): 01, 02, 04, 10, 11, 13, 14[SKIP]
- Co-located scoped #{} (14 files): 03, 05, 06, 07, 08, 12, 15, 16, 17, 18, 19, 20, 21
- Multi-file: 22-multifile/, 23-trucking-dispatch/
- Tutorial: docs/tutorial.md

## Log

- 2026-05-14T23:31:41Z — startup verification PASSED (pwd, toplevel, status clean, bun install, pretest)
- 2026-05-14T23:31:41Z — required reading COMPLETE: PA-SCRML-PRIMER (partial, key sections), kickstarter v1, BRIEFING-ANTI-PATTERNS, user-voice S84/S85/S86, mario canonical template a2f9f9b
- 2026-05-14T23:31:41Z — starting sweep with 01-hello.scrml
- 2026-05-14T23:35:00Z — 01-hello already canonical; baseline 1 W-PROGRAM-SPA-INFERRED — no edit
- 2026-05-14T23:35:00Z — 02-counter already canonical; baseline 1 W-PROGRAM-SPA-INFERRED — no edit
- 2026-05-14T23:35:00Z — 03-contact-book MIGRATED — split file-top #{} into 3 co-located blocks; ${} inside <db> body retained (state-block markup ctx); commit f927f76
- 2026-05-14T23:35:00Z — next: 04-live-search
- 2026-05-14T23:50:00Z — 04-live-search MIGRATED — dropped file-top ${} wrapper; commit 37cf311
- 2026-05-15T00:10:00Z — 05-multi-step-form MIGRATED — dropped file-top ${} for state/fns; kept ${} for components (auto-lift gap); split #{} into 2 co-located blocks; replaced markup `//` with `<!-- -->`; commit 60b5b03
- 2026-05-15T00:20:00Z — 06-kanban-board MIGRATED — split #{} into 3 co-located blocks; commit d811b11
- 2026-05-15T00:20:00Z — next: 07-admin-dashboard
- LESSON LEARNED: markup-context `//` comments can cause E-TYPE-026 false-positives downstream (S05 bisect precedent); always use `<!-- -->` HTML comments in markup
- LESSON LEARNED: `const Name = <markup>` form does NOT auto-lift at `<program>` direct-child level — BS-layer splits `const Name = ` (text) from `<markup>...</markup>` (markup block) and lift can't re-pair; ALWAYS wrap component-defs in ${} despite the W-PROGRAM-REDUNDANT-LOGIC false-positive; tracked as deferred bug
- LESSON LEARNED: bare functions at `<program>` direct-child level whose bodies contain TEMPLATE-LITERAL `${ident}` interpolation (e.g. `\`${hh}:${mm}\``) trigger E-SCOPE-001 on the inner identifiers — the splitter treats `${` inside a backtick string as the start of a new logic block. WORKAROUND: wrap such functions in an explicit `${...}` block; tracked as deferred compiler bug
- LESSON LEARNED: HTML `<!-- -->` comments INSIDE a `${}`-wrapped component-def body (i.e. component internal markup) cause downstream E-COMPONENT-035; REMOVE markup comments from inside component-def bodies
- 2026-05-15T00:50:00Z — 07-admin-dashboard MIGRATED; commit 7ec8afd (auth-related diagnostics retained, out-of-scope)
- 2026-05-15T01:00:00Z — 08-chat MIGRATED; commit 50228cc
- 2026-05-15T01:10:00Z — 10-inline-tests MIGRATED (already mostly canonical); commit 3950884
- 2026-05-15T01:15:00Z — 11-meta-programming MIGRATED (originally classified as Tailwind but actually scoped-#{}); commit 2d2c320
- 2026-05-15T01:25:00Z — 12-snippets-slots MIGRATED; commit 0af82cf
- 2026-05-15T01:30:00Z — 13-worker MIGRATED (already canonical, just header + indent); commit e5f702d
- 2026-05-15T01:40:00Z — 15-channel-chat MIGRATED (template-literal workaround); commit d7396c6
- 2026-05-15T01:40:00Z — next: 16-remote-data
