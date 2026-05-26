---
session: S133 Fire #6 — D: rewriteBunEval retirement (Cluster B-code Site 1)
started: 2026-05-26
worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a803f755db729e19a
base-sha: c5a27b7364800218d4f1a497e476cd5aece67e76
---

# Progress log

## Phase 0 — Startup verification

- [done] pwd / git-status / worktree-root identity / bun install / bun run pretest — clean
- [done] Baseline tests: 14569 pass / 88 skip / 1 todo / 0 fail (close to brief's 14576 target; minor S132/S133 drift)

## Phase 0 — Empirical verification (MANDATED STOP GATE)

Brief premise: "5 meta-eval.ts callers + 1 rewrite.ts:1985 caller are provably no-ops on cleansed user input." Per [[feedback_cookbook_vs_empirical]] — verify before deletion.

### Surface area (grep)

7 active call-sites confirmed (matches S130 progress doc):
- `compiler/src/meta-eval.ts:37` (import)
- `compiler/src/meta-eval.ts:267` (bare-expr serializer)
- `compiler/src/meta-eval.ts:272` (let-decl)
- `compiler/src/meta-eval.ts:277` (const-decl)
- `compiler/src/meta-eval.ts:326` (return-stmt)
- `compiler/src/meta-eval.ts:336` (html-fragment)
- `compiler/src/codegen/rewrite.ts:2023` (clientPasses Pass 4)
- `compiler/src/codegen/rewrite.ts:528` (function definition)

### Function contract (rewrite.ts:528-557)

Early-return at line 530: `if (!expr.includes("bun") || !/\bbun\s*\.\s*eval\b/.test(expr)) return expr;`

The function IS a no-op on input containing no literal `bun.eval` token.

### Empirical reproducer — meta-block callers

```scrml
<page>
  ^{
    const year = bun.eval("new Date().getFullYear()");
    emit(`<p>Year: ${year}</p>`);
  }
</page>
```

Result with current code (HEAD c5a27b73):
- META_BUILTINS check in meta-checker.ts:117 PASSES (still contains `"bun"`)
- meta-eval.ts:277 const-decl serializer calls `rewriteBunEval` on `bun.eval("new Date().getFullYear()")` → folds to `2026`
- bodyCode becomes `const year = 2026; emit(\`<p>Year: ${year}</p>\`);`
- `new Function("emit", "reflect", bodyCode)` runs cleanly
- Output: `<p>Year: 2026</p>`
- **NO diagnostic emitted; user code silently accepted.**

### Empirical reproducer — what happens AFTER deletion (simulated)

`bun` is NOT a Bun global (only `Bun` is — verified via `bun run` probe). So `bodyCode` containing literal `bun.eval(...)` reaching `new Function(...)` throws `ReferenceError: bun is not defined` → emits `E-META-EVAL-001`.

### Conclusion — the 5 meta-eval callers are NOT no-ops

**They are silent compile-time folders for user-written `^{ bun.eval(...) }`.** Deleting them changes user-observable behavior from "silently fold + emit literal" to "E-META-EVAL-001 compile-time failure."

This contradicts the brief's "provably no-ops on cleansed user input" premise. Per the brief's STOP directive ("If you find a call that ISN'T provably a no-op — that's a Phase-0 STOP"), proceed no further.

### Root cause — META_BUILTINS gap (S130-deferred sub-task A)

The S130 progress doc explicitly identified this dependency:
> "1. **META_BUILTINS gap** — meta-checker.ts:117 still includes `"bun"`, `"process"`, `"Bun"`, `"console"` per S114-era contents. Per SPEC §22.12 line 13826 (S130 amendment): these are NOT in the post-S130 META primitive set. Removing `"bun"` from META_BUILTINS would fire E-META-001 on any user `^{}` containing `bun.eval(...)`, neutralizing the meta-eval.ts caller paths."

SPEC §22.4 (line 14687 — S114 Approach C ratification): **"JS-host ambient globals (`bun`, `process`, `setInterval`, `fetch`, etc.) are NOT in the META_BUILTINS set and trigger `E-META-001`."**

Current `META_BUILTINS` (meta-checker.ts:117-156) violates §22.4 by including `bun` / `process` / `Bun` / `console`.

### Correct sequence (per S130 progress doc + SPEC §22.4)

- **Step A (PREREQUISITE):** amend `meta-checker.ts:117` META_BUILTINS to remove `bun` / `process` / `Bun` / `console`. After this, user-written `^{ bun.eval(...) }` fires `E-META-001` at meta-checker time. The 5 meta-eval.ts callers truly become no-ops (input never reaches them with `bun.eval` content).
- **Step B (THIS DISPATCH'S SCOPE):** retire `rewriteBunEval` function + 6 callers + 12 tests.

This brief skipped Step A.

### rewrite.ts:1985 Pass 4 caller — separate analysis

The `clientPasses` Pass 4 caller fires on the string-rewrite FALLBACK path only (`exprNode`-missing legacy AST). Tree-walker `emitExpr` does NOT call `rewriteBunEval`. Empirical reproducer:

```scrml
<page>
  <state>
    @x = ""
  </state>
  <p>Result: ${@x + bun.eval("'!'")}</p>
</page>
```

Result with current code:
- E-CG-006 server-only-pattern guard catches the residue: `bun.eval("'!'")` survives all client passes (tree-walker bypasses Pass 4) and reaches client.js emission — caught.

So **Pass 4 IS already a no-op for the §30.2 markup-interpolation path** (tree-walker bypass). It would only fire on a fallback path with `bun.eval`, which itself would be caught downstream by E-CG-006.

This Pass 4 caller IS safer to remove independently of META_BUILTINS — its deletion does NOT change observable behavior for currently-valid user input (no path reaches it with `bun.eval` content; E-CG-006 catches what survives).

However, function retirement requires ALL callers gone. Removing Pass 4 alone leaves the function definition (still importable from meta-eval.ts).

## Decision — STOP, report findings

Per brief's STOP directive: 5 of the 6 callers are NOT provably no-ops on currently-accepted user input. Proceeding would change observable user-facing behavior in a non-SPEC-compliant way (firing E-META-EVAL-001 instead of the SPEC-normative E-META-001).

No deletions performed. No tests removed. Final tree clean.

## Recommendation for follow-on dispatch

Single combined dispatch:
1. Amend `compiler/src/meta-checker.ts:117` META_BUILTINS: remove `bun`, `process`, `Bun`, `console`. Per SPEC §22.4 ratification, these should fire E-META-001.
2. Verify no existing test depends on these being in META_BUILTINS (grep test files).
3. THEN do this brief's deletion plan (6 callers + function + 12 tests).
4. Net result: E-META-001 fires at meta-checker stage on user `^{ bun.eval(...) }` (correct SPEC behavior), `rewriteBunEval` retired (correct cleanup).

Alternate (if Step A is genuinely out-of-scope for v0.6.x): leave function + callers in place as defense-in-depth until Step A lands. The current behavior (silent fold of user `bun.eval` in `^{}`) is buggy per SPEC §22.4 but at least non-leaky.
