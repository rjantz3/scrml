# TASK — fix the spread-call fnNameMap rename escape: `[...localFn()]` leaks the user fn-name (runtime ReferenceError)

Change-id: `g-spread-fnname-rename-2026-06-10`
Dispatched S178 (2026-06-10), agent `a35a4e5c6030894bf`, isolation:worktree, model:opus, background.
Worktree base HEAD `7c41cad2` (does NOT include main's staged bug-16 emit-functions.ts fix → baseline 23,734).

## MAPS — REQUIRED FIRST READ
primary.map.md full; §Task-Shape Routing (compiler-source codegen). Watermark c48c4f71 (2026-06-09), HEAD 7c41cad2 (+1 docs-only). Report maps load-bearing finding.

## STARTUP + PATH DISCIPLINE (S42/S90/S99/S126)
pwd MUST start with worktree prefix (STOP if elsewhere — S90); git rev-parse --show-toplevel == WORKTREE_ROOT; status clean; bun install; bun run pretest; use `bun run test`. ALL edits via Bash on worktree-absolute paths (NOT Edit/Write — S126); NEVER cd into main; first commit msg includes verbatim pwd.

## BUG (surveyed)
Client fnNameMap rename pass rewrites local fn call refs (makeList → _scrml_makeList_2) but MISSES spread-call callees: `[...makeList()]` emits `[...makeList()]` (user name) → runtime ReferenceError; compiles clean + node --check valid (canary class, no diagnostic).
Root (verify): emit-client.ts:1757 combinedRegex `(?<!\.\s*)\b(${alternation})\b(?=\s*[(;,}\]\n)]|$)`. The lookbehind `(?<!\.\s*)` skips member-access (obj.makeList — see comment ~1696-1710) but the spread `...` ends in `.`, so the callee is rejected. Cannot distinguish member-`.` from spread-`...`.
NOT generator-specific, NOT derived-specific: plain `function makeList()` spread in derived-RHS AND markup-interp both leak; plain non-spread call renames fine. Do NOT use generators in reproducers (worktree base lacks the separate bug-16 star fix; a function* would fail unrelated).
Fix: tighten lookbehind to reject ONLY genuine member-access (`.` preceded by identifier-char/`)`/`]`), allow spread `...`. Candidate `(?<![A-Za-z0-9_$)\]]\s*\.\s*)`; AUTHORIZED to determine precise form (validate vs negative control). Also check sibling regex emit-client.ts:2054 `(?<![.\w$])` for same escape. Preserve 6nz Bug Z string/comment fencing (rewriteCodeSegments).

## REPRODUCERS (plain functions only)
R1 derived-RHS spread (broken): `${ function makeList() -> int[] { return [1,2,3] } const <items> = [...makeList()] }` + `<p>${@items}</p>`.
R2 markup-interp spread (broken): `${ function makeList() -> int[] { return [1,2,3] } }` + `<p>${[...makeList()]}</p>`.
R3 member-access NEGATIVE control: a local fn name in member position (obj.tag()) must NOT rename while bare/spread DOES; minimal scrml or regex-unit assertion.
R4 string-literal control: `"makeList()"` must NOT rename (6nz Bug Z).

## PHASES
0 survey-confirm (emit-client.ts ~1696-1785 + :2054); report locus before editing.
1 fix lookbehind (+ :2054 if affected); Bash-edit; commit per unit.
2 tests (spread renames in both positions; member-access NOT; string NOT); `bun run test` 0-regression vs **23,734/0/220/1** (worktree base — NOT main's staged 23,746); pre-commit NO --no-verify.
3 R26 EMPIRICAL (node --check INSUFFICIENT — passed on broken output): compile R1+R2; emitted spread MUST show `_scrml_makeList_N` (renamed), MUST NOT show bare `makeList`; report before/after per reproducer + control results.

## COMMIT DISCIPLINE (S83)
Diff-verify+commit per edit; status clean before DONE; append-only progress.md.

## FINAL REPORT
WORKTREE_PATH + pwd-in-first-commit; FINAL_SHA + BRANCH; FILES_TOUCHED; Phase-0 locus (+ :2054?); regex before→after; R26 table (per repro pre/post emitted spread + renamed y/n) + member-access + string controls; full-suite vs 23,734/0/220/1; maps feedback; deferrals.
