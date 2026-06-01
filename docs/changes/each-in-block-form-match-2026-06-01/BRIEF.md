# BRIEF — `<each>` inside a block-form `<match>` arm emits invalid JS (codegen)

**Change-id:** `each-in-block-form-match-2026-06-01`
**Dispatched:** S153 (2026-06-01), scrmlTS PA → scrml-js-codegen-engineer, `isolation: "worktree"`.
**Severity:** MED. **Type:** pure codegen fix (NO spec change). Pre-existing bug. **Survey-then-fix.**

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is under `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-<id>/`.

## Startup verification (BEFORE any other tool call)
1. `pwd` via Bash — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report (S90 CWD-routing failure). Save as `WORKTREE_ROOT`.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` MUST equal `WORKTREE_ROOT`.
3. `git -C "$WORKTREE_ROOT" status --short` — confirm clean.
4. `bun install` (worktrees don't inherit node_modules; pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise).
5. `bun run pretest` (populates `samples/compilation-tests/dist/` for the browser tier; gitignored, empty in fresh worktrees).
6. You are branched from current main (includes the S153 engine-gated-each fix `54d54d4d`). If startup checks fail, STOP and report.

## Path discipline (S99/S126)
- **Apply ALL file edits via Bash** (`perl -i` / `python` / heredoc / `cp`) on **worktree-absolute paths** that include the `.claude/worktrees/agent-<id>/` segment. Do NOT use Edit/Write (they have leaked to MAIN). Echo the target path before each write; re-verify with `git -C "$WORKTREE_ROOT" diff` / `grep` after.
- **NEVER `cd` into the main repo** (or anywhere). Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only.
- First commit message must include the verbatim `pwd`: `WIP(each-in-match): start at <pwd>`.

## Commit discipline (S83)
- Commit per sub-bucket immediately after `git -C "$WORKTREE_ROOT" diff` + `add`. Before DONE: `git -C "$WORKTREE_ROOT" status` MUST be clean. Update `docs/changes/each-in-block-form-match-2026-06-01/progress.md` after each step.

## MAPS
`.claude/maps/` was refreshed at S153 (`efcd5536`) — current as a starting hypothesis; verify against source. Task-Shape: compiler-source bug fix (codegen).

---

# THE BUG (empirically confirmed by PA at HEAD 54d54d4d)

An `<each>` whose per-item template uses the `@.` contextual sigil, placed inside a block-form
`<match>` arm, emits INVALID JS and fails compilation with `E-CODEGEN-INVALID-JS`. The `@.name`
sigil leaks as a bare `.name`:

```
artifact: <file>.client.js  Unexpected token
  ...(el) { el.textContent = .name; } } return func...
```

## What's confirmed
- **`repro-1-sigil.scrml`** (`@.name` in the per-item template inside a `<match>` arm) → `E-CODEGEN-INVALID-JS` (`.name` leak). FAILS.
- **`repro-2-alias.scrml`** (same, but `<each in=@todos as t key=t.id>` + `${t.name}`) → COMPILES. (NB: "compiles" is NOT "works" — the alias likely renders through the wrong path too and may be runtime-broken; verify at runtime. The point is the `@.` sigil specifically produces *invalid* JS, the alias merely produces *valid* JS.)
- The SAME `<each in=@todos key=@.id><li>${@.name}</li></each>` compiles AND populates correctly inside an **engine** state-child arm (S153 `54d54d4d` reproducers `docs/changes/engine-gated-each-populate-2026-06-01/repro-1-button.scrml`). So the engine path resolves `@.`; the block-form match path does not.
- **Pre-existing.** `compiler/src/codegen/emit-match.ts` was last touched at S143 (`1d227a74`), NOT by the S153 engine-gated-each fix. This bug predates it.

## PA's root-cause hypothesis (VERIFY — do not take as fact)
Engine arm bodies are walkable AST in the original fileAST, so `collectEachBlocks(fileAST)` (emit-each.ts) finds the engine-arm each and `emitEachBodyRenderForFile` emits its render fn WITH the `@.`→iter-var rewrite (`rewriteContextualSigil`, emit-each.ts:172). Block-form `<match>` arm bodies are stored as RAW TEXT (`bodyRaw`); `emit-match.ts` RE-PARSES that raw text per arm (`nativeParseFile`, ~line 644-649) and renders it via `emitVariantGuardedRender` → `generateHtml`. The match-arm each is therefore NOT in the fileAST `collectEachBlocks` walked, so it never gets emit-each's render fn / `@.` rewrite; the re-parsed each's per-item template renders inline (where `@.` has no iteration scope) → `.name` leaks. The engine works because its each IS in the walkable fileAST.

**Survey this empirically — get the rejected JS.** The `E-CODEGEN-INVALID-JS` gate (`compiler/src/codegen/validate-emit.ts`) suppresses artifact output. To see the malformed emit: temporarily neutralize the gate IN YOUR WORKTREE (e.g. comment the throw / add a debug dump of the client.js string before validation), compile `repro-1-sigil.scrml`, read the emitted `.client.js`, and determine the EXACT emit path that produced `el.textContent = .name` (is it emit-each's render fn? emit-match's inline generateHtml of the re-parsed templateChildren? the `${@.name}` interpolation reactive-binding path?). Restore the gate before finishing. The rejected JS is the ground truth; the hypothesis above is a starting point.

---

# THE FIX (shape — confirm via survey)

Route the match-arm each through the SAME mount-div + file-wide render-fn mechanism the engine uses, so `@.` resolves and the S153 `_scrml_remount_each` arm-entry hook (already in `emitVariantGuardedRender`, which emit-match DOES call at ~line 794) re-renders the each when the arm mounts. The likely shape (confirm): ensure the re-parsed match-arm each-block is seen by `collectEachBlocks`/`emitEachBodyRenderForFile` (so its render fn with `@.` rewrite is emitted) AND that `generateHtml` emits only the mount div for it (emit-html.ts:2030 `emitEachMountHtml`) — NOT an inline render of its template. The end state: an each in a match arm compiles, `@.` resolves to the iter var, and the list populates when the match dispatches to that arm.

## Constraints
1. **Do NOT break R28-1b (the OPPOSITE nesting: a `<match>` INSIDE an `<each>`).** `emit-match.ts:collectMatchBlocks` threads `enclosingEachIterVar` so a match's `on=@.field` lowers to the each's iter var (S143 `1d227a74`); `emitVariantGuardedRender` has an `itemScopedDispatch` mode for it. Your fix is the other direction (each inside match) — keep both working. Run the existing match + each + R28-1b tests.
2. **`@.` AND the `as` alias must both work** at runtime inside a match arm (currently the alias only compiles; verify it actually renders, and fix if it doesn't).
3. **Don't regress the engine-arm each** (S153 fix) or plain top-level each.
4. **The S153 `_scrml_remount_each` hook is already wired** into `emitVariantGuardedRender` for every arm — your fix should make it actually fire for match-arm eaches (it currently can't because the each never compiles).

## Note for your commit message (PA will fold this)
The S153 engine-gated-each commit (`54d54d4d`) claimed its dispatcher hook "covers ... block-form `<match>`." That was aspirational — the hook IS wired into the shared `emitVariantGuardedRender` (emit-match calls it), but an each-in-match-arm never reached it because of THIS pre-existing compile bug. Your fix makes the match coverage real. State that the S153 claim is now satisfied (forward-correction; #1 is local-only/unpushed).

---

# VERIFICATION (S138 R26 — runtime proof required)

1. **Compile both reproducers** on your post-fix baseline:
   ```
   bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$WORKTREE_ROOT"/docs/changes/each-in-block-form-match-2026-06-01/repro-1-sigil.scrml --output-dir /tmp/eim-r1
   bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$WORKTREE_ROOT"/docs/changes/each-in-block-form-match-2026-06-01/repro-2-alias.scrml --output-dir /tmp/eim-r2
   ```
   Confirm: both compile (no E-CODEGEN-INVALID-JS); emitted client.js has NO bare `.name`; the each renders via the mount-div + render-fn path (not inline); `node --check` clean on both.
2. **Add a happy-dom test** (mirror `compiler/tests/browser/engine-gated-each-populate.browser.test.js` from the S153 fix). It MUST load the compiled client.js in real module-init order, transition `@phase` Loading→Browsing (button click), and assert the `<li>` items (`alpha`, `beta`) appear in the DOM. Test BOTH the `@.` sigil form and the `as` alias form.
3. **Full suite:** `bun --cwd "$WORKTREE_ROOT" run test` (chains pretest; full suite incl. browser + within-node parity). 0 regressions. If a within-node rebump is needed for benign emitted-shape drift, do it + note it. DO NOT mark DONE without the happy-dom test passing and the full suite green.

---

# REPORT BACK
- WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED.
- The empirically-determined ROOT (the exact emit path that leaked `.name`; whether the PA hypothesis held).
- The fix mechanism + why; how you preserved R28-1b (match-inside-each).
- Empirical results: both reproducers compile + render; happy-dom test pass (both `@.` and alias); full-suite counts; within-node rebump y/n.
- Maps line (consulted / load-bearing?).
- Any further follow-ups (other inline-render paths with the same `@.` gap? component slots? lift-guarded blocks?).
