# DISPATCH BRIEF — Bug 58: formFor validity surface never emitted (synth compound decl spliced into markup-children)

**Change-id:** `bug-58-formfor-validity-surface-2026-05-28`
**Severity:** HIGH (silent-miscompile on the FLAGSHIP scrml.dev demo — form renders but validation is 100% dead)
**Dispatched:** S140 (2026-05-28). Baseline HEAD at dispatch: `c4d5ef96`.
**Agent:** scrml-js-codegen-engineer · isolation: worktree
**Authority:** `docs/known-gaps.md` Bug 58 · `docs/audits/bug-51-class-corpus-coverage-audit-2026-05-28.md` §3.2 (PA-verified)

---

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

**S99 leak history: this project has had repeated path-discipline leaks (sub-agent Edit/Write or `cd` leaking into the MAIN checkout). Do not become the next incident.**

Your worktree path will be reported by `pwd`. Before ANY other tool call:

1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo, STOP and report (S90 CWD-routing failure). Save as `WORKTREE_ROOT`.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` MUST equal `WORKTREE_ROOT`.
3. `git -C "$WORKTREE_ROOT" merge --no-edit main` — worktree may be branched from a stale session-start commit (S112). Merge `main` for current baseline (`c4d5ef96`). Confirm clean.
4. `git -C "$WORKTREE_ROOT" status --short` — confirm clean.
5. `cd "$WORKTREE_ROOT"` ONCE. **NEVER `cd` into the main repo** (path without `.claude/worktrees/agent-*`) for ANY command (S126 #14/#15). Use `--cwd "$WORKTREE_ROOT"` / `git -C "$WORKTREE_ROOT"` / worktree-absolute paths only.
6. `bun install`.
7. `bun run pretest`.

**Editing discipline (S126):** apply edits via Bash (`perl`/`python`/heredoc) on WORKTREE-ABSOLUTE paths including the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write tools (leaked to MAIN before). Echo target path before each write; re-verify via `git -C "$WORKTREE_ROOT" diff`/`grep` after. If you must use Edit/Write, the absolute path MUST contain `.claude/worktrees/agent-`.

If ANY startup check fails: DO NOT proceed. Report and exit.

---

## MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` (worktree) in full first. §"Task-Shape Routing" → maps for a compiler-source codegen + type-system fix. Map watermark `1fed5588` (only docs-only commits past it). Verify map content against current source via grep. Report maps feedback (load-bearing finding OR not-load-bearing).

---

## READING LIST (this fix authors a `.scrml` test fixture → kickstarter + anti-patterns mandatory)

- `docs/articles/llm-kickstarter-v2-2026-05-04.md` — canonical scrml shape (read before writing any `.scrml`).
- `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — counteract React/Vue reflexes in the test fixture.
- SPEC §41.14 (formFor) + §55 (auto-synthesized validity surface) — read IN FULL before fixing (pa.md Rule 4: SPEC normative). Especially §41.14.3 (submit handler wiring: `fn(values)` + set `submitted=true`).
- `docs/audits/bug-51-class-corpus-coverage-audit-2026-05-28.md` §3.2.

---

## THE BUG (PA-verified)

Canonical `<formFor for=Signup onsubmit=persistSignup/>` (struct with `req`/`length`/`pattern` validators) renders inputs + submit button (markup half wired: `data-scrml-formfor`, bound inputs, submit button all present in HTML) — but VALIDATION IS 100% DEAD:
- struct validators (req/length/pattern) never wired in client.js;
- the §55 validity surface (`signup.isValid`, `signup.<field>.errors/.touched`, `signup.submitted`) is READ by emitted sites (disabled-button gate reads `!_scrml_reactive_get("signup").isValid`; per-field error anchors read `_scrml_derived_get("signup.name.errors")` — 8 such reads) but NOTHING declares/backs them;
- `submitted=true` is never set before the handler runs;
- the onsubmit handler is invoked with NO `values` argument (SPEC §41.14.3 mandates `fn(values)`).

Compile exit 0; `node --check` pass; corroborating `W-DG-002` ×3 (per-field cells orphaned).

**Root cause (verified):** `compiler/src/type-system.ts:11113` `spliceFormFor` does `arr.splice(i, 1, synth.compoundDecl, synth.formElement)` — inserting the synthesized compound state-decl IN PLACE in the MARKUP-children array (where `<formFor>` lived inside `<program>`). `emit-logic.ts` (the pass that emits `_scrml_reactive_declare`/`_scrml_derived_declare`, validator runners via `emitValidatorRunnerSidecar`, and the synth validity surface via `emit-synth-surface.ts`) only walks state-decls inside `${…}` logic blocks. A state-decl among markup children is seen only by the HTML/binding emitter (→ correct inputs) but never reaches state-declaration / validity-surface emission. Additionally `compiler/src/codegen/emit-form-for.ts` `buildCompoundStateDecl` never sets `_cellKind:"compound-parent"` (grep count 0) — so even if it reached the logic pass, the synth-surface walker (which keys on `compound-parent`) might skip it.

**Reproduce it yourself first (canonical shape — the import is load-bearing; without `import { formFor } from 'scrml:data'` the element isn't recognized and you get a DIFFERENT, wrong path):**
```scrml
${
  import { formFor } from 'scrml:data'
  type Signup:struct = {
    name:  string req length(>=2)
    email: string req pattern(/^[^@]+@[^@]+$/)
    agree: boolean req
  }
  server function persistSignup(values: Signup) ! string { return "ok" }
}
<program>
  <formFor for=Signup onsubmit=persistSignup/>
</program>
```
Compile → grep client.js: `_scrml_reactive_declare` count 0, validator-runner refs 0, `signup.*.errors`/`.isValid` reads present-but-unbacked (8), `submitted` 0; compile log shows W-DG-002 ×3.

---

## THE FIX (deeper — bounded to the routing + synth-surface emission)

The synthesized compound state-decl MUST reach the state-declaration / validity-surface emission pass:
1. Route the synth compound decl (and its per-field children) so `emit-logic.ts` / `emit-synth-surface.ts` / `emit-validators.ts` process it — either by NOT splicing it into the markup-children array (emit it as a logic-pass decl instead and keep only the `formElement` in markup), OR by making the emission passes also walk markup-positioned state-decls. Read how `emit-logic.ts` discovers state-decls and how `emit-synth-surface.ts` + the validator-runner emitter are invoked; pick the approach that reuses the existing synth/validator machinery (do NOT reimplement validity-surface emission).
2. Tag the synth compound decl with `_cellKind:"compound-parent"` in `emit-form-for.ts` `buildCompoundStateDecl` so the synth-surface walker recognizes it (and per-field children get their per-field surface per §55.6 / B12).
3. Submit wiring (§41.14.3): the onsubmit handler must be invoked with the collected `values` (the compound cell's value) AND `@<cell>.submitted = true` must be set before invocation.

**Scope discipline:** reuse `emit-synth-surface.ts` + `emit-validators.ts` (the §55 machinery already exists and works for `${…}`-declared compounds — confirm by compiling a hand-written `${ <signup><name req length(>=2)>=<input/>...</> }` compound and observing the surface IS emitted). The fix is making formFor's synth decl take the SAME path. Verify the markup half (inputs/submit button) STILL renders after the routing change. This touches `type-system.ts` + `emit-form-for.ts` and possibly `emit-logic.ts`/`emit-synth-surface.ts` wiring — keep each change minimal + justified.

---

## ACCEPTANCE GATE (both required)

New test file (model happy-dom portion on an existing happy-dom/browser test; check where formFor + validity-surface tests live — likely `compiler/tests/browser/` for the runtime part):
1. **Targeted emit-regression** (FAIL pre-fix, PASS post-fix): compile the canonical formFor source; assert client.js DECLARES the `signup` compound cell + emits the validator runners + the validity surface (`isValid`/per-field `errors`); assert the onsubmit emit passes `values` + sets `submitted`. Prove it fails before your fix.
2. **happy-dom runtime drive:** mount the emitted form; assert `signup.isValid` is false until validators pass; type an invalid `name` (< 2 chars) → per-field error renders + submit button disabled; fill valid values → isValid true + button enabled; submit → handler receives `values` + `submitted` set true.

---

## R26 EMPIRICAL VERIFICATION (Phase 3 — mandatory; pa.md S138 doctrine)

HIGH codegen fix relying on emit. Before DONE: re-compile the canonical formFor source AND any `<formFor` adopter source in `samples/`/`examples/` on the post-fix baseline. For each: `node --check` the emitted JS; grep client.js confirming the validity surface + validators ARE emitted; confirm W-DG-002 orphan warnings are GONE. **DO NOT mark DONE without empirical R26 verification passing.**

---

## COMMIT DISCIPLINE (two-sided, S83)

- First commit message includes `pwd` verbatim: `WIP(bug-58): start at <pwd>`.
- Commit per edit; don't batch. `git -C "$WORKTREE_ROOT" status` clean before DONE.
- **NEVER `--no-verify`.** Env-race hook failure → STOP and report.
- Run the FULL pre-commit suite at each step. The type-system splice routing is delicate — adjacent formFor/synth-surface/compound-state tests catch regressions. Zero regressions required.
- Update `docs/changes/bug-58-formfor-validity-surface-2026-05-28/progress.md` after each step (append-only).

## FINAL REPORT SHAPE

`WORKTREE_PATH` · `BRANCH` · `FINAL_SHA` · `FILES_TOUCHED` (worktree-absolute) · pre-fix-repro-confirmed (surface dead) · post-fix (surface emitted + happy-dom passes) · markup-half-still-renders confirmed · targeted-regression fails-before/passes-after · R26 results (W-DG-002 gone) · full-suite counts · maps feedback · deferred items.
