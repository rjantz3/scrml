# BRIEF — `<each>` body interactivity Landing-2 (S152 dogfood #7 fix)

> Archived per pa.md S136 (BRIEF.md archival). Dispatched S152 2026-06-01 as `isolation:worktree` + `run_in_background` to `scrml-js-codegen-engineer` (model opus). Agent ID `acbb7ff3587be012b`. Verbatim `prompt:` text below.

---

# TASK: `<each>` body interactivity — Landing-2 (change-id: `each-body-interactivity-landing2-2026-06-01`)

You are fixing a CONFIRMED correctness bug in scrml's flagship Tier-1 `<each>` iteration (SPEC §17.7). Per-item element **event handlers, `class:` bindings, and `${...}` attribute interpolation are silently dropped**, and `@.` in an attribute-value expression is a HARD compile error. This is the documented "Landing-1 best-effort" deferral plus two clear bugs beyond it.

## MAPS — REQUIRED FIRST READ
Before consuming any other context, read `.claude/maps/primary.map.md` in full (~100 lines). Follow its §"Task-Shape Routing" for a compiler-source codegen/typer bug fix (consult the codegen + symbol/type maps it names).
Map currency: maps reflect HEAD **`09f74bee`** as of **2026-05-31**. Your two primary files are post-map-modified — `compiler/src/type-system.ts` was touched at S151 `cce289b4` (C4 object-literal lifecycle), and `compiler/src/codegen/emit-each.ts` should be verified against current source. Treat map content as a starting hypothesis; grep/Read current source as ground truth.
Feedback: in your final report include either "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing — [which you expected to help]".

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
**S99/S126: this leak class has bitten 15+ times. Do NOT become incident #16.**

Your worktree path is assigned by the harness. Derive it at startup; do NOT assume it.

## Startup verification (BEFORE any other tool call)
1. Run `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it is under any other repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that is the S90 CWD-routing failure. Save the output as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git status --short` — confirm clean.
4. `git merge main` (or `git log` to confirm your base) — your base may be a session-start commit; if `compiler/src/type-system.ts` or `compiler/src/codegen/emit-each.ts` look stale vs main, `git merge main` first. (S112 worktree-staleness.)
5. `bun install` (worktrees do NOT inherit node_modules — the pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise).
6. `bun run pretest` (populates `samples/compilation-tests/dist/` for browser tests; gitignored, empty in fresh worktrees).

## Path discipline (EVERY edit)
- **Apply ALL file edits via Bash on WORKTREE_ROOT-absolute paths** (perl/python/heredoc/cp on paths that include the `.claude/worktrees/agent-<id>/` segment) — NOT the Edit/Write tools. The Edit/Write tools have repeatedly leaked into MAIN's checkout (S126 incidents #12/#13). Echo the target path before each write; re-verify via `git diff`/`grep` after.
- **NEVER `cd` into the main repo or anywhere else.** Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively (S126 #14/#15 cwd-leak class).
- If any startup check fails: STOP, report, exit.

# COMMIT DISCIPLINE (crash-recovery + S83)
- Commit after EACH meaningful change — do NOT batch. WIP commits expected.
- Your FIRST commit message MUST include the verbatim `pwd` output: `WIP(each-landing2): start at <pwd-output>` (S99 echo-pwd discipline — PA verifies it starts with the worktree prefix).
- Before reporting DONE: `git status` MUST be clean. "work in worktree, no commits" is NOT an acceptable terminal report.
- Write `docs/changes/each-body-interactivity-landing2-2026-06-01/progress.md` (append-only, timestamped) after each step.

# THE BUG (confirmed by PA via reverse-R26 on fresh compile)

Reproducer (`/tmp/repro/each.scrml` — recreate it in your worktree):
```scrml
<program>
type Item:struct = { id: string, name: string, done: boolean }
<items>: Item[] = [{id: "a", name: "Alpha", done: false}]
function toggle(id) {
    @items = @items.map(x => x.id == id ? {...x, done: !x.done} : x)
}
<ul>
    <each in=@items key=@.id>
        <li class:done=@.done onclick=toggle(@.id) data-id=${@.id}>
            ${@.name}
        </li>
    </each>
</ul>
</program>
```

Current (broken) behavior:
- Compile FAILS with `E-SCOPE-001: Unquoted identifier @ in attribute class:done cannot be resolved` — fired from `compiler/src/type-system.ts`. The `@.` each-item sigil is not recognized in attribute-value expression position.
- Even setting the error aside, `emit-each.ts` emits the per-item element attributes as inert literals:
  - `_scrml_el_1.setAttribute("class:done", "")`  ← class: binding dropped
  - `_scrml_el_1.setAttribute("onclick", "")`     ← event handler dropped (no addEventListener)
  - `_scrml_el_1.setAttribute("data-id", "_scrml_each_item.id")`  ← `${@.id}` interpolation literalized to a string

# NORMATIVE GROUND (SPEC — verify in full before coding; pa.md Rule 4)
- **SPEC §17.7.3** — the `@.` contextual sigil: "the current iteration value"; `@.field` is field access on the current item. It resolves **inside the `<each>` body scope** — which INCLUDES attribute-value expressions on per-item elements. `@.` outside an `<each>` body is `E-SYNTAX-064` (so inside, it MUST resolve, NOT fire E-SCOPE-001).
- **SPEC §3.4** (the per-locus access table, ~line 285) — the `<each>` body scope row: `@.` / `@.field` resolve to the current iteration value; `as name` binds an alias.
- **PRIMER §6.3** ("Implementation status, S131") — documents the Landing-1 caveat: "attribute-interpolation on per-item openers is best-effort (literal string attrs copy; complex interpolation-bearing attrs defer)." Your task is **Landing-2**: complete that deferral AND fix the class:/handler drop + the `@.`-in-attribute-value E-SCOPE-001.

Read SPEC §17.7 (starts ~line 10381, `### 17.7 Iteration (<each>)`) IN FULL via offset+limit before coding. Read §17.7.3 specifically for the `@.` semantic.

# FIX LOCI (survey-then-fix; the actual surface may differ — depth-of-survey)
**Locus 1 — `compiler/src/type-system.ts` (the E-SCOPE-001 fire).** `@.`/`@.field` must be RECOGNIZED + resolved in attribute-value expressions inside `<each>` bodies instead of firing E-SCOPE-001. Survey: where attribute-value expressions are scope-validated, and whether/how the `<each>` body scope (the iteration item) is threaded there. The non-attribute body positions (`<li : @.name>`, `${@.name}`) already work — find what makes attribute-value position different and extend the each-scope awareness to it. The fix may be additive (propagate the same each-scope the body already has).

**Locus 2 — `compiler/src/codegen/emit-each.ts:208-219` (the inert setAttribute).** Replace the Landing-1 best-effort literal-copy with real per-item attribute codegen:
- `class:NAME=expr` → conditional classList toggle (reactive per item) — same lowering the non-each codegen uses.
- event handlers (`onclick=`, `on:`, etc.) → addEventListener / the bare-form handler lowering (§5.2.2/§5.2.3), with `@.`/`as name` → iterVar rewrite so `toggle(@.id)` becomes `toggle(item.id)`.
- `${...}` attribute interpolation → the value expression (not a literal string), with `@.`→iterVar rewrite.
Reuse the existing emit-html / emit-event-wiring machinery where possible rather than re-implementing — but the per-item render-fn context differs from top-level emit (reactive subscription per item, the reconcile loop). Survey how emit-html/emit-event-wiring emit attributes/handlers and adapt within the per-item render fn. The `@.`→iterVar rewrite helper already exists in emit-each.ts (see the `@\s*\.\s*` rewrite ~line 369 and the `on=@.field` lowering ~line 340) — reuse/extend it for attribute values.

Keep `<each of=N>` (count form, `@.`=index) working. Keep `as name` aliasing working. Keep the `:`-shorthand body, `<empty>`, and inferred `key=` working (no regressions).

# PHASE 3 — EMPIRICAL R26 VERIFICATION (MANDATORY — pa.md S138; DO NOT mark DONE without it)
After the fix, recompile the reproducer on your post-fix baseline and confirm the symptom is gone:
```
bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <your-repro>/each.scrml --output-dir /tmp/r26-each-verify 2>&1 | tail
```
Then in `/tmp/r26-each-verify`:
1. **No E-SCOPE-001** — the compile exits 0 (no error on `class:done=@.done`).
2. **class: wired** — `each.client.js` per-item render fn toggles the class reactively on `@.done` (classList add/remove or equivalent), NOT `setAttribute("class:done","")`.
3. **handler wired** — `onclick` produces an addEventListener (or the bare-form lowering) that calls `toggle` with the item's id, NOT `setAttribute("onclick","")`.
4. **interpolation wired** — `data-id` carries the item's id VALUE, NOT the literal string `"_scrml_each_item.id"`.
5. **browser-faithful parse** — `node -e 'const fs=require("fs"),vm=require("vm"); new vm.Script(fs.readFileSync("each.client.js","utf8"));'` exits 0 (parses as a classic script — this is how the browser loads it; `node --check` is a FALSE oracle because Node auto-detects ESM).
6. Compile the existing examples that use `<each>` (`examples/22-multifile`, any `<each>` sample) and confirm 0 regressions.

# TESTS
- Extend `compiler/tests/unit/each-block.test.js` with cases asserting the emitted shape for: per-item event handler, `class:` binding, `${}` attribute interpolation, `@.field` in an attribute value. Assert the real JS strings (not just "compiles").
- Add a happy-dom acceptance test (mirror existing browser tests) that mounts the reproducer, clicks a per-item `<li>`, and asserts `toggle` fired + the class toggled. This is the corpus-coverage gap that let the bug ship (no browser test loads `<each>` interactivity).
- Run the full pre-commit subset (`bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance`) — 0 regressions. If you touch anything BS/scanner-adjacent, run the broader suite (adjacent shapes catch over-greedy scoping).

# REPORT (final message — raw data, this IS the return value)
- WORKTREE_PATH (your pwd) + BRANCH + FINAL_SHA.
- FILES_TOUCHED list (worktree-absolute).
- The R26 Phase-3 results (the 6 checks above, with actual emitted-JS snippets for class:/onclick/data-id).
- Test counts (before/after; new tests added).
- Maps feedback line.
- Any deferred items (e.g. nested `<each in=@.field>`, `<each of=N>` edge cases) + why.
- Any path-discipline incident (self-report honestly — recovery is cheap, hidden leaks are not).
