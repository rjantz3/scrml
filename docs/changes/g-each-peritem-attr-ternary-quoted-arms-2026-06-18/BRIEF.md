# TASK: fix `g-each-peritem-attr-ternary-quoted-arms` (MED) — quoted-arm ternary in a per-item interpolated attr emits INVALID JS

**Change-id:** `g-each-peritem-attr-ternary-quoted-arms-2026-06-18`. Your `progress.md` + commits reference this id (create `docs/changes/g-each-peritem-attr-ternary-quoted-arms-2026-06-18/`).

## The bug (PA-reproduced on current HEAD 7a2da79c — REAL, not a ghost)
Inside an `<each>` per-item element, an interpolated ATTRIBUTE whose value is an inline ternary with QUOTED string-literal arms mis-compiles to `E-CODEGEN-INVALID-JS`: the emitted JS truncates the ternary to `…) ? }` (BOTH quoted arms dropped) → "Unexpected token" at the CG stage; the compiler aborts (no artifacts written).

**Verified minimal repro** (compile this on HEAD → `E-CODEGEN-INVALID-JS` at the emitted `repro.client.js` byte ~843, the snippet `..._scrml_reactive_get("hi")) ? }`):
```scrml
type Row:struct = { id: int, n: int }
<rows>: Row[] = [{ id: 1, n: 5 }, { id: 2, n: 9 }]
<hi> = 9

<ul>
    <each in=@rows as r key=@.id>
        <li class="${(r.n == @hi) ? "bg-yellow" : "bg-white"}">${r.n}</li>
    </each>
</ul>
```

**Boundary already established (do NOT break these — they currently WORK):**
- A function-CALL interpolation in the same per-item attr compiles exit 0: `<li class="base ${cls(r.n)}">` (so the defect is SPECIFICALLY the inline expression with QUOTED string-literal arms in the per-item attr-interpolation path — the `"`-arms confuse the attr-string emitter).
- The per-item BODY interpolation (`${r.n}`) works.
- The same ternary in a NON-each context works (it's the `<each>` per-item attr path specifically).

## Fix locus + direction (from the gap entry — verify against live source)
- Locus: `compiler/src/codegen/emit-each.ts` — the PER-ITEM ATTRIBUTE interpolation emit path. The per-item attr-interpolation path does not lower a quoted-arm ternary through the structured expression emitter; the `"`-arms get mis-handled by the attr-string emitter (likely a naive split/scan on `"` that terminates the attr string early, dropping the ternary arms).
- Direction: route the per-item attribute interpolation through the **structured expression emitter** — the SAME direction S200 used for the sibling bug `g-each-peritem-if-predicate-not-lowered` (which routed the per-item *predicate* through the structured emitter via `lowerEachExpr`). Grep the S200 fix (`git log --oneline --all | grep -i each` / search `lowerEachExpr` in emit-each.ts) to find the structured-emit helper and mirror it for the attr-interpolation path. This is a "lower it properly, don't string-splice it" fix — the structured emitter already handles quoted literals + nested expressions correctly (it's what the body `${r.n}` and the function-call case go through).
- Per `feedback_dont_soft_classify_bugs`: emitting invalid JS is a BUG, not a best-effort limitation. The §6.3 Landing-1 "complex per-item attrs are best-effort" caveat does NOT cover a HARD `E-CODEGEN-INVALID-JS` — that's over the line. Fix it for real.

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; follow §"Task-Shape Routing" (compiler-source codegen bug fix). Maps reflect HEAD `d12fdef7` (a few commits behind `7a2da79c`); `emit-each.ts` was not touched since the watermark but verify against live source. Report: "Maps consulted: [...]; load-bearing finding: <one sentence>" OR "not load-bearing — [...]".

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
S99 had FOUR path leaks; S126 had THREE Edit/Bash-divergence leaks.
Worktree under `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-<id>/`.
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. Else STOP (S90). Save as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` == `WORKTREE_ROOT`.
3. `git log -1 --oneline` — base should descend from `7a2da79c`. If BEHIND, `git merge main`.
4. `bun install`; 5. `bun run pretest`.
6. Reproduce the bug FIRST (write the repro above to a temp .scrml, `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <repro> -o /tmp/each-tern-pre` → confirm `E-CODEGEN-INVALID-JS`). This is your before-state.
If ANY check fails: STOP and report.

## Path discipline (EVERY edit)
- Apply ALL edits via Bash (`perl`/`python3`/heredoc) on worktree-absolute paths including `.claude/worktrees/agent-<id>/` — NOT Edit/Write. Echo path before; `git diff` after.
- NEVER `cd` into main. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths.
- perl: `{}` delimiters or escape `/`; heredoc fallback.

# COMMIT DISCIPLINE (S83 + S99)
- Commit after EVERY meaningful edit. First commit message embeds startup `pwd`: `WIP(each-ternary): start at <pwd>`.
- Before DONE: `git status` clean. Update progress.md each step. Never `--no-verify`.

# DO NOT TOUCH
- `docs/known-gaps.md` — the `@gap` token is PA-owned (the PA flips open→resolved at landing). Just fix the code + add tests.
- `scripts/dock.ts` — a sibling dispatch (D4) owns it.

---

# TESTS + PHASE 3 — MANDATORY R26 EMPIRICAL VERIFICATION (do NOT mark DONE without this)
1. **Regression test** in the each codegen test file (`compiler/tests/unit/each-block.test.js` or wherever the per-item attr tests live — grep). Cover: (a) the repro shape (quoted-arm ternary in a per-item interpolated attr) → compiles + emitted JS is valid + contains BOTH arms (`bg-yellow`/`bg-white`); (b) the function-call boundary case still works; (c) the body `${...}` interpolation still works; (d) a nested/mixed case (ternary with a function-call arm, or `@cell`-ref arms) for good measure.
2. **R26 empirical:** compile the repro through the worktree CLI → exit 0, `node --check` the emitted `repro.client.js` passes, and `grep` confirms both ternary arms present (NOT `) ? }`). Paste the before (E-CODEGEN-INVALID-JS) / after (exit 0 + node --check OK + both arms) comparison.
3. **FULL suite green** (`bun --cwd "$WORKTREE_ROOT" run test`): the each codegen + browser each-tests live across unit + browser — run the FULL suite (NOT just the pre-commit subset) and confirm 0 fail. If you touched any within-node fixture (you shouldn't), re-baseline per the M6.5.b allowlist. Record pass/skip/fail.

End: DO NOT mark DONE without the before/after R26 (repro now exit-0 + node --check OK + both arms) + full suite green.

---

# FINAL REPORT (your final message IS the data)
- `WORKTREE_PATH:` / `FINAL_SHA:` / `BASE_SHA:` (+ whether you merged main)
- `FILES_TOUCHED:` (worktree-absolute) — expect `compiler/src/codegen/emit-each.ts` + the test file + `progress.md`
- Root cause (one paragraph: WHY the quoted arms dropped — the exact mis-handling in the attr-interp path) + the fix (what you routed through the structured emitter)
- R26 before/after (E-CODEGEN-INVALID-JS → exit 0 + node --check + both arms) + full suite pass/skip/fail
- Maps feedback; deferred items / surprises

Commit after each change — don't batch. Update progress.md each step. WIP commits expected. If you crash, commits + progress.md are how the next agent resumes.
