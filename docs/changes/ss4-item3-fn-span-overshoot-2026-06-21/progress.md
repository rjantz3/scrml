# ss4-item3: function-decl span overshoot fix (2026-06-21)

## Context
Worktree base SHA: 8569f774 (brief expected 3d311fc9; 3d311fc9 IS an ancestor of
8569f774 — 2 commits ahead: match-arm reactive bindings + a merge; parser path
unaffected). HEAD == main (0/0 divergence). Noted; proceeded.

## Bug
Local function-decls inside `${...}` logic bodies get span.end pointing at the
END of the NEXT token (next decl's opener), so endLine lands on the next fn's
opening line. Adjacent fns share a boundary line. Breaks block-analysis.ts
per-block spans.

## Root cause
parseRecursiveBody() consumes the closing `}` (_parseRecursiveBodyInner line
~4862 `consume(); break;`). After it returns, peek() is the token AFTER `}`
(next decl opener). Both function-decl creation sites used
`span: spanOf(startTok, peek())` → overshoot. peek(-1) = the consumed `}`.

## Brief line-number discrepancy (IMPORTANT)
Brief named sites at ~7870 (fnKind:"function") + ~8120 (fnKind:"fn"). Those are
the NESTED handlers inside parseRecursiveBody (fns declared INSIDE another fn
body). The messages.scrml repro functions are TOP-LEVEL within the ${...} logic
body — parsed by the MAIN-LOOP sites at 10817 (fnKind:"function") + 11035
(fnKind:"fn"), which the brief did NOT name. All 4 have the IDENTICAL bug shape
(parseRecursiveBody() then spanOf(startTok, peek()), nothing consumed between).
Fixed all 4 function-decl sites — the 2 the brief named PLUS the 2 the repro
actually exercises. (Site 9859 = export form, uses a precomputed span, NOT the
overshoot pattern — left untouched.)

## Steps
- [done] F4 startup verification + dep symlinks
- [done] reproduced bug over messages.scrml (raw AST + block-analysis projection)
- [done] read & verified all 4 function-decl sites (7878, 8120, 10817, 11035)
- [done] applied peek() -> peek(-1) at all 4 function-decl sites
- [done] verified overshoot gone (raw span.end now lands on each fn's own `}`;
         block-analysis endLine now == own closing-brace line, no shared boundary)
- [next] regression test through REAL buildAST(splitBlocks) path
- [next] full pre-commit gate

## DONE (2026-06-21)
- [done] regression test added (3 tests in block-analysis.test.js); drives REAL
         splitBlocks->buildAST->buildBlockAnalysisForFile path; >=3 adjacent fns
         (function + fn forms). VERIFIED test FAILS on pre-fix peek() form.
- [done] full pre-commit gate: 17538 pass / 0 fail / 68 skip / 1 todo (966 files).
         NO span-dependent tests broke broadly. No locked-test expectations needed
         correcting (the only fn-span consumers asserting concrete endLines are the
         new tests + the messages.scrml repro, both now correct).
- Commit: 53623066 (coupled code+test+progress, hook passed incl. browser validation)

## NOTE — out-of-scope overshoot left untouched (per scope guard)
The ~40 other spanOf(startTok, peek()) decl sites (let/const/state/lin/bare-expr)
ALSO overshoot but are NOT block-analysis-projected; per brief they are a separate
blast-radius concern — NOT fixed here. Site 9859 (export form) uses a precomputed
span, not the overshoot pattern — also untouched.
