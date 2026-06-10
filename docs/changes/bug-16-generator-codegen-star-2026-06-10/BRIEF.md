# TASK — fix non-SSE generator codegen: the client function emitter drops the `function*` star (bug-16 implementation half)

Change-id: `bug-16-generator-codegen-star-2026-06-10`
Dispatched: S178 (2026-06-10), agent `ac41cf752717f04cb`, isolation:worktree, model:opus, background.
Worktree base: HEAD `7c41cad2`.

## MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full first; follow §Task-Shape Routing (compiler-source bug fix / codegen). Map watermark `c48c4f71` 2026-06-09 (HEAD `7c41cad2` is +1 docs-only). Verify map content vs current source; report load-bearing finding (or "not load-bearing").

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S42/S90/S99/S126)
Worktree under `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-<id>/`.
Startup (before any other tool call): (1) `pwd` MUST start with the worktree prefix — STOP if under another repo (S90); save as WORKTREE_ROOT. (2) `git rev-parse --show-toplevel` == WORKTREE_ROOT. (3) `git status --short` clean. (4) `bun install` (no inherited node_modules). (5) `bun run pretest` (browser-test dist). Use `bun run test` not `bun test` for full-suite.
Path discipline: ALL edits via Bash (perl/python3/heredoc) on worktree-absolute paths incl. the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write (S126 leak class). NEVER `cd` into main; use `git -C "$WORKTREE_ROOT"`, `--cwd "$WORKTREE_ROOT"`. First commit msg includes verbatim `pwd`: `WIP(bug-16-gen): start at $(pwd)`.

## THE BUG (surveyed — verify then fix)
Generators ratified full vocabulary S131 (SPEC §13.6). §37 SSE `server function*` works (dedicated codegen). A non-SSE `function*` in a `${ }` logic block FAILS: `E-CODEGEN-INVALID-JS` "The keyword 'yield' is reserved" — emitted JS is `function fibonacci() { ... yield a ... }`, the generator `*` DROPPED → yield in a plain function = invalid JS (S141/S142 emit-validation gate catches it).
Root cause (verify): `compiler/src/codegen/emit-functions.ts` (~line 952) emits `${asyncPrefix}function ${generatedName}(...) {` with NO generator-star branch despite the node's `isGenerator` flag (`compiler/src/types/ast.ts:836`). `emit-library.ts:428-430` ALREADY does it right: `const generatorStar = stmt.isGenerator ? "*" : ""; ... function${generatorStar} ${name}(...)`. Client emitter missing the branch.
Fix: mirror emit-library.ts:428 generatorStar into the emit-functions.ts plain-client-fn path; confirm isGenerator reaches that site. AUTHORIZED to correct the locus if survey is off (symptom+reproducers are ground truth). Also check object-literal generator-method `{ *m(){} }` (§13.6) — fix if same star-drop, else note deferral. Do NOT touch §36 SSE path (~491-540). generatorStar + asyncPrefix computed independently (generators don't go through CPS).

## REPRODUCERS (both FAIL today, must PASS after)
A — SPEC §13.6 Fibonacci:
```scrml
<program>
    ${
        function* fibonacci() {
            let a = 0
            let b = 1
            while (true) {
                yield a
                let next = a + b
                a = b
                b = next
            }
        }
        function firstN(n: int) -> int[] {
            let out = []
            let i = 0
            for (let v of fibonacci()) {
                if (i >= n) { break }
                out = [...out, v]
                i = i + 1
            }
            return out
        }
    }
    <p>First 8 Fibonacci: ${firstN(8)}</p>
</program>
```
B — minimal:
```scrml
<program>
    ${
        function* counts() {
            yield 1
            yield 2
            yield 3
        }
        const <nums> = [...counts()]
    }
    <p>${@nums}</p>
</program>
```

## PHASES
- Phase 0 survey-confirm: read emit-functions.ts ~952 + emit-library.ts:428-430 + ast.ts:836; confirm star-drop locus + isGenerator reaches it; report locus (corrected if survey wrong).
- Phase 1 fix: add generatorStar branch (Bash-edit, worktree-absolute); commit per logical unit.
- Phase 2 tests: focused unit test (non-SSE function* emits `function*` + node --check valid); `bun run test` full-suite 0-regression vs baseline 23,734/0/220/1; pre-commit hook NO --no-verify.
- Phase 3 R26 (MANDATORY, do NOT mark DONE without passing): re-compile BOTH reproducers post-fix; per emitted client JS `grep function*`/`yield` (star PRESERVED) + `node --check` (exit 0); both clean-compile + valid + function* present. Report before/after per reproducer.

## COMMIT DISCIPLINE (S83 two-sided)
Diff-verify + commit immediately per edit (no batching). `git status` clean before DONE. Update progress.md append-only per step. Crash-recovery via commits + progress.md.

## FINAL REPORT
WORKTREE_PATH + pwd-in-first-commit; FINAL_SHA + BRANCH; FILES_TOUCHED (worktree-absolute); Phase-0 confirmed locus; Phase-3 R26 table (per reproducer: pre-fix symptom / post-fix compile / function* preserved / node --check); full-suite count vs 23,734/0/220/1; object-literal gen-method fixed/deferred; maps feedback; deferrals/anomalies.
