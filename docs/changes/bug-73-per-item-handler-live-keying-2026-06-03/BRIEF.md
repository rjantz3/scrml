# BRIEF — Bug 73 per-item handler live-keying (Phase-0 survey-STOP dispatch)

> Archived verbatim per S136 (every `isolation:worktree` dispatch archives its `prompt:` text).
> Dispatched S159 (2026-06-03) to `scrml-js-codegen-engineer`, model opus, isolation:worktree, background.
> change-id: `bug-73-per-item-handler-live-keying-2026-06-03`. This is the PHASE-0 (survey+STOP) brief;
> the Phase-1 implementation brief will be archived separately when greenlit (SendMessage agent-resume
> unavailable in this env → fresh dispatch carrying the analysis).

---

You are fixing **Bug 73** in the scrml compiler: per-item EVENT HANDLERS in a reconciled list close over the CREATE-TIME item, not the live one. This is the sibling-gap #2 of Bug 64 (which made per-item DISPLAY bindings live-keyed in S158). change-id: `bug-73-per-item-handler-live-keying-2026-06-03`.

This dispatch has a **PHASE-0 SURVEY + STOP gate** — you survey + report BEFORE the heavy edit, and WAIT for greenlight. Do NOT implement the fix until Phase 0 is reviewed.

# MAPS — REQUIRED FIRST READ

Before consuming any other context (SPEC sections / source files), read `.claude/maps/primary.map.md` in full (~149 lines). Its §"Task-Shape Routing" tells you which additional maps to consult — this is a compiler-source codegen bug fix, so consult the codegen / domain / schema maps it routes you to.

Map currency: maps reflect HEAD `3621d6a1` as of 2026-06-03. They are CURRENT (just refreshed for the S157-S158 codegen reshaping incl. Bug 64's `_scrml_resolve_item` plumbing). Trust them as the navigation baseline; verify specific line numbers against current source via grep/Read before editing (line counts drift).

In your final report include: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing — [which you expected to help]". The second answer is fine and is signal I need.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

S99 leak-history: this project has had 15+ path-discipline leaks where a dispatched agent's edits landed in MAIN instead of its worktree. This would be the next one if you slip. A scrmlTS-local PreToolUse hook (S100) will REJECT Write/Edit tool calls that target the main checkout — so you MUST edit via Bash (below), not the Edit/Write tools, for any file under the worktree.

## Startup verification (BEFORE any other tool call)
1. Run `pwd` via Bash. Save it as WORKTREE_ROOT. It MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it is under any OTHER repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that is the S90 CWD-routing failure.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. **S112 merge-startup:** your worktree likely branched from the session-start commit `97fe2199`, NOT from current main `3621d6a1` (which added the fresh maps + the Bug 73 known-gaps entry; SOURCE files are byte-identical between the two). Run `git -C "$WORKTREE_ROOT" merge main` to fast-forward your worktree to `3621d6a1` so you read the CURRENT maps. It will ff cleanly (no divergence).
4. `git status --short` — confirm clean after the merge.
5. `bun install` — worktrees do NOT inherit node_modules; the pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise.
6. `bun run pretest` — populates `samples/compilation-tests/dist/` (gitignored; browser tests need it). For baseline checks use `bun run test` (chains pretest), NOT `bun test` directly.

If ANY check fails: STOP and report. Do not proceed.

## Path discipline (EVERY file mutation)
- **Edit via Bash only** (perl/python/heredoc), on worktree-ABSOLUTE paths that include the `.claude/worktrees/agent-<id>/` segment. Echo the target path before each write; re-verify via `git diff` / `grep` after. Do NOT use the Edit/Write tools (the S100 hook rejects main-leaking calls and you risk the Edit/Bash filesystem-divergence class — S126 incidents #12/#13).
- **NEVER `cd` into the main repo** (or anywhere outside WORKTREE_ROOT). Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively (S126 #14/#15 — `cd` leaks `bun add`/compile/run into main).
- Translate any main-rooted path you see in this brief to `$WORKTREE_ROOT/...` before writing.

## Crash-recovery (global directive)
Commit after each meaningful unit — don't batch. Your FIRST commit message must include the verbatim `pwd` output: `WIP(bug73): start at $(pwd)`. Update `$WORKTREE_ROOT/docs/changes/bug-73-per-item-handler-live-keying-2026-06-03/progress.md` after each step (append-only, timestamped). WIP commits expected. NEVER use `--no-verify`. If you crash, your commits + progress.md are how the next agent resumes.

# THE BUG (empirically verified by PA at HEAD 97fe2199, both tiers)

Bug 64 (S158) made per-item DISPLAY bindings (text / `class:` / attr) live-keyed: inside a reconciled-list per-item factory, they wrap in a `_scrml_effect` that re-resolves the CURRENT item for the node's create-time key via `_scrml_resolve_item(<wrapper-or-mount>, <keyVar>)`. Per-item EVENT HANDLERS were scoped OUT and still close over the **create-time** iter var.

Confirmed fire sites:
- **Tier-1 `<each>`** — `compiler/src/codegen/emit-each.ts`, the "(2) event handlers — inline addEventListener" branch (currently ~line 623-664). It emits `${elVar}.addEventListener(ev, function(event) { ${handlerBody} });` where `handlerBody` has been lowered (via `rewriteIterValueExpr` / `serializeCallArgs` / `rewriteIterScopeOnly`) to reference the create-time iter var (e.g. `_scrml_each_item.id`). Unlike the text/`class:`/attr branches (which call `maybeWrapEachPerItemEffect`), this handler branch does NOT re-resolve.
- **Tier-0 `${for…lift}`** — `compiler/src/codegen/emit-lift.js`, the per-item event-handler `addEventListener` sites (the ~640-1070 region; several shapes — call-form, expr-form, engine-lowered, variable-ref). The display bindings there use `maybeWrapLiftPerItemEffect`; the handlers close over the create-time `it`.

Symptom: on a same-key reconcile (array-replace where a NEW object carries the same key but changed fields; in-place field mutation) the displayed text updates to the live value (Bug 64) while the handler still acts on the STALE create-time snapshot — a visible display↔handler divergence (silent-wrong-action). Reorder where the SAME object instances are reordered does NOT trigger it (the closed-over object is still correct).

PA reproducers (read them, then build your own under $WORKTREE_ROOT/tmp or /tmp):
- `/tmp/bug64-sib2/repro.scrml` (Tier-1 `<each>`, `onclick=pick(@.id)`) — but make a handler read a NON-key field (`@.name`) + array-replace with same-id new-name objects to make the divergence bite.
- `/tmp/bug64-sib2/repro-t0.scrml` (Tier-0 `${for (it of @items) { lift ... onclick=pick(it.name) }}` + `swap()` that replaces items with same-id new-name objects).
(Compile with `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <file> --output-dir <dir>`. Note: `@.` is ONLY legal in Tier-1 `<each>`; Tier-0 uses the bare loop var `it.field` — E-SYNTAX-064 gates `@.` in Tier-0.)

# THE FIX SHAPE (your Phase 0 confirms the details)

A handler fires on USER INTERACTION, not reactively — so it MUST NOT wrap in `_scrml_effect`. Instead the handler closure re-resolves the live item AT FIRE TIME, then runs the original body:
```
elVar.addEventListener("click", function(event) {
  let <iterVar> = _scrml_resolve_item(<wrapper-or-mount>, <keyVar>);
  if (<iterVar> === null) return;   // canonical absence (SPEC §42.5); key gone → don't fire on a stale snapshot
  <original lowered handlerBody>
});
```
This is a sibling of the existing `maybeWrapEachPerItemEffect` (emit-each.ts) / `maybeWrapLiftPerItemEffect` (emit-lift.js) helpers — SAME reconcile ctx (`mountVar`/`wrapperVar` + `keyVar` + `iterVar`), SAME `_scrml_resolve_item`, SAME null-guard — but emitted INSIDE the handler closure, WITHOUT the `_scrml_effect` wrapper.

**CRITICAL correctness point your Phase 0 must nail:** the wrap is CONDITIONAL on the handler body actually REFERENCING the iter var. A handler that does NOT read the iter var (`onclick=reorder()`, `onclick=globalAction()`) must stay PLAIN — wrapping it would add a spurious null-guard that could skip a valid global-action click when that node's key happens to be gone. The existing effect-helpers wrap whenever the ctx matches because display bindings ALWAYS read the iter var; handlers do NOT always. You must determine + specify the detection signal (e.g. does the lowered handlerBody contain the iterVar token? thread a "referencedIterVar" boolean from the rewrite? check the pre-lowering source for iter-scope refs?).

The `_scrml_resolve_item` / `container._scrml_item_by_key` / create-time-key plumbing ALREADY EXISTS (Bug 64, runtime-template.js + both ctx stacks). You are NOT adding runtime; you are routing the handler emission through it.

# PHASE 0 — SURVEY + STOP (the gate; do this, then STOP and report — do NOT implement yet)

Produce a survey report covering:
1. **Tier-1 (emit-each.ts):** the exact handler-emission site(s) + current line numbers. Confirm the single `(2) event handlers` branch is the only per-item handler emitter, or enumerate others.
2. **Tier-0 (emit-lift.js):** enumerate ALL per-item `addEventListener` emission sites in the lift factory region. For EACH, classify: (a) iter-var-reading event handler → WRAP; (b) `bind:value`/`bind:checked` two-way wiring that writes a CELL (not the item) → likely EXCLUDE (confirm it doesn't read the item); (c) non-iter-var handler → EXCLUDE; (d) engine-lowered handler (`.advance`/`@engine=.X`) — does it read the item in its args? classify accordingly.
3. **The iter-var-read detection signal** you'll use to decide wrap-vs-plain, with justification it's reliable (no false-wrap on global handlers, no false-skip on iter-reading handlers).
4. **The null-guard semantics** for handlers (confirm `if (item === null) return` is correct for a fire-time handler — don't fire on a removed item).
5. **Nested `<each>` / nested lift** — how the innermost ctx is matched (mirror the `ctx.iterVar !== iterVarName` discipline in `maybeWrapEachPerItemEffect`). Confirm an OUTER-iter-var read inside an inner each resolves correctly (or flag it as out-of-scope if the existing display path already handles/defers it).
6. **The helper plan:** new `maybeWrapEachPerItemHandler` / `maybeWrapLiftPerItemHandler` (or extend existing), exact insertion points, and how the handlerBody string flows into it.
7. **Any surprises** — sites that don't fit the model, shapes you're unsure about, the `bind:value` question's answer.
8. **Test plan** — the happy-dom runtime test that PROVES the divergence is closed (render → array-replace same-key-new-field → dispatch click on reused node → assert handler received LIVE field value), plus emit-shape unit assertions + the no-regression set (existing Bug 64 each/lift tests + TodoMVC 39/0 node-reuse gate).

Then **STOP. Commit your Phase-0 survey + progress.md. Report "PHASE 0 COMPLETE — awaiting greenlight"** with the survey. Do NOT edit emit-each.ts / emit-lift.js yet.

(After I review + greenlight, you'll get a fresh dispatch to implement Phase 1-3. SendMessage agent-resume is not available in this environment — so make your Phase-0 report self-contained enough that a fresh implementer can act on it.)

# COMMIT DISCIPLINE
- Code + its coupled test = ONE commit (no transiently-red windows).
- The pre-commit hook runs unit+integration+conformance; full `bun run test` (with browser) for the final gate. NEVER `--no-verify`.
- Report at the end: WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED, and the Phase-0 survey (since you STOP at Phase 0, FILES_TOUCHED will be just progress.md + the survey doc).

Report format for Phase 0: WORKTREE_PATH · FINAL_SHA · the full survey (items 1-8) · "Maps consulted: ... load-bearing finding: ...".
