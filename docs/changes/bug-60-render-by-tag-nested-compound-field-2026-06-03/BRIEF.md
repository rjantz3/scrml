# BRIEF — Bug 60 (render-by-tag nested-compound-field emits literal tags; input never renders)

**Dispatched:** S158, 2026-06-03 · **Agent:** `scrml-js-codegen-engineer` (opus, isolation:worktree, bg) · **Worktree base:** HEAD `3707e212` (Bug 72 already landed this session — branch from current HEAD; no merge needed) · **Change-id:** `bug-60-render-by-tag-nested-compound-field-2026-06-03`

PA pre-dispatch: Rule-4 spec-checked (§6.3.5 line 2209 declares the form valid + §6.4.2 Shape-2 expansion) + R26 **reverse-direction** re-verified at HEAD `3707e212` (reproduces: literal `<signupForm>`/`<userName />`/`<email />` tags, zero `<input>`, zero `data-scrml-render-by-tag`, spurious E-DG-002 on `@signupForm`) + root-cause re-confirmed at HEAD (drifted line numbers vs the S140 c4d5ef96 baseline, mechanism intact).

---

(Verbatim `prompt:` text passed to the Agent call follows.)

---

You are fixing **Bug 60** in the scrml compiler (a TypeScript/JS codegen bug). Localized render-by-tag codegen + symbol-resolution fix. Change-id: `bug-60-render-by-tag-nested-compound-field-2026-06-03`.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (BEFORE any other tool call)
1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo, STOP and report (S90 CWD-routing failure). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` — MUST equal WORKTREE_ROOT.
3. `git rev-parse HEAD` — your base IS main HEAD `3707e212` (Bug 72 already landed this session; no prior-landing merge needed — Bug 60's files were NOT touched by Bug 72).
4. `git status --short` — confirm clean.
5. `bun install` (worktrees don't inherit node_modules — pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise).
6. `bun run pretest` (populates gitignored `samples/compilation-tests/dist/`; without it ~130 browser-test ECONNREFUSED failures). Use `bun run test` (chains pretest), NOT bare `bun test`, for baselines.

If ANY check fails: STOP and report.

## Path discipline (EVERY edit — S99/S126)
- **Apply ALL file edits via Bash** (`perl -i`, `python3`, heredoc, `cp`) on **worktree-absolute paths including the `.claude/worktrees/agent-<id>/` segment** — NOT the Edit/Write tools (they've leaked into MAIN 15+ times — the filesystem-divergence class). Echo the path before each write; re-verify via `git diff`/`grep` after.
- **NEVER `cd` into the main repo or anywhere outside WORKTREE_ROOT.** Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full (~100 lines). §"Task-Shape Routing" → "compiler-source bug fix" → `error.map.md` (E-DG-002 / render-by-tag fix notes — the S139 Bug-51 render-by-tag family is the pattern template), `domain.map.md` (codegen stage + emit-* file ownership + symbol-table resolution), `structure.map.md`.

**Map currency: maps reflect HEAD `57edc794`.** They are ~9 commits stale GENERALLY — BUT your two primary files, `compiler/src/codegen/emit-html.ts` and `compiler/src/symbol-table.ts`, are **UNCHANGED since the map cut** (PA-verified: `git log 57edc794..HEAD -- <files>` is empty), so the map view of THEM is current. Read current source anyway for line numbers. Report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing."

# THE BUG (PA-verified at HEAD 3707e212 — Rule-4 spec-checked + R26 reverse-reproduced)

A nested compound-field render-by-tag use-site emits the tags VERBATIM as browser-ignored literal markup, and the bound `<input>` never renders.

**Reproducer (PA-confirmed FAILS at HEAD — at `$WORKTREE_ROOT/docs/changes/bug-60-render-by-tag-nested-compound-field-2026-06-03/repro-bug60.scrml`, recreate if needed):**
```scrml
<signupForm>
    <userName req length(>=2)> = <input type="text"/>
    <email req email>          = <input type="email"/>
</>

<div>
  <signupForm>
    <userName/>
    <email/>
  </signupForm>
</div>
```
PA observed at HEAD: emitted HTML contains literal `<signupForm>` / `<userName />` / `<email />` (browser-ignored), ZERO `<input>` for the nested fields, ZERO `data-scrml-render-by-tag`, and a spurious `E-DG-002` ("`@signupForm` declared but never consumed in a render or logic context"). The runtime cells ARE wired in client.js (`_scrml_reactive_set("signupForm.userName", ...)` + validators + derived isValid/errors) — the cells exist; no DOM element binds to them.

# SPEC AUTHORITY (Rule 4 — PA-confirmed, do not re-litigate the validity)
- **SPEC.md §6.3.5 line 2209 (V5-Strict Composition in Compound Cells):** "`<formRes><name/></>` would be valid render-by-tag for `name` if `name` has a render-spec — this is the structural form at the nested level." → the nested `<userName/>` use-site (inside the `<signupForm>` wrapper) IS valid and MUST expand to the bound input. Read §6.3.5 (lines 2205-2217) in full.
- **SPEC.md §6.4.2 (Shape 2 Expansion, lines 2233-2244):** `<userName/>` → look up render-spec → emit the render-spec markup → wire bind: per §5 dispatch → wire validators to the validity surface (§6.11). The nested case must produce the SAME expansion as a top-level Shape-2 `<userName/>`, but keyed on the QUALIFIED cell name (`signupForm.userName`). Read §6.4.1 + §6.4.2 in full.
- The top-level Shape-2 render-by-tag forms (text/checkbox/select/textarea/const-prefix/`match{}`/`${}`-wrap) already WORK (S139 Bug-51 family) — that is the WORKING path to mirror; the gap is purely the NESTED-compound-field resolution.

# ROOT CAUSE (PA-confirmed at HEAD — line numbers drifted from the S140 c4d5ef96 baseline; verify current)
`emit-html.ts` render-by-tag expansion (~line 1403: `const decl = lookupStateCell(fileScope, tag);`) resolves the BARE leaf tag (`"userName"`) via `lookupStateCell` (symbol-table.ts:11053), which only walks the parent-chain `s.stateCells.get(name)` — it **never descends into a compound parent's `_scope`**. Nested fields are resolved ONLY by `lookupQualifiedStateCell` (symbol-table.ts:11082), which `emit-html.ts` NEVER calls for render-by-tag (and the emitter tracks NO enclosing-compound context). So for a nested field, `decl === null` → the `if (decl && cellKind === "bindable")` guard fails → falls through to literal-tag emission.

# THE FIX (Phase 0 survey first; you are AUTHORIZED to correct the locus)
The render-by-tag expansion must, when expanding `<field/>` self-tags INSIDE a compound-wrapper markup element (`<signupForm>...</signupForm>` where `signupForm` is a registered compound parent):
1. **Track the enclosing-compound context** — when the markup walker enters a `<signupForm>` element whose tag resolves to a registered COMPOUND PARENT cell (via `lookupStateCell` → `getCellKind` === "compound-parent"), establish `signupForm` as the enclosing-compound for its children.
2. **Resolve the nested `<userName/>`** via `lookupQualifiedStateCell(fileScope, enclosingCompound, leafTag)` (or the arity-N variant) → get the field's StateCellRecord + cellKind.
3. **Emit the Shape-2 expansion** (render-spec markup + bind: + validators + `data-scrml-render-by-tag`) keyed on the QUALIFIED cell name `signupForm.userName` (the runtime cell IS `signupForm.userName`). Mirror the existing top-level Shape-2 expansion path (~emit-html.ts:1403-1440) — reuse it with the qualified name + qualified record, do NOT fork.
4. **The compound wrapper `<signupForm>` is a NAMESPACE wrapper, not a render-spec element** — the compound parent has no render-spec, so it SHALL NOT fire `E-CELL-NO-RENDER-SPEC` and SHALL NOT emit a DOM element of its own (HYPOTHESIS: transparent wrapper — its children's expansions are emitted directly; **survey for any existing test/precedent on compound-wrapper emission and surface your choice + any spec ambiguity** — if the spec or a sibling test implies a different wrapper-emission behavior, report it rather than guessing).
5. **Suppress the spurious `E-DG-002`** on `@signupForm` — once the nested fields render-by-tag through the wrapper, the compound IS consumed in a render context; the dependency-graph "never consumed" detection must count the wrapper render-by-tag as consumption. (Verify where E-DG-002 fires for compound cells and that the fix clears it — if E-DG-002 lives in a separate pass that the codegen fix doesn't reach, surface that as a sub-task.)

Phase-0: read the maps + SPEC §6.3.5/§6.4.1/§6.4.2 + the CURRENT emit-html.ts render-by-tag expansion + lookupStateCell/lookupQualifiedStateCell + getCellKind. Recreate + confirm the reproducer fails. Report your Phase-0 finding (exact locus + fix shape + the wrapper-emission decision) before the heavy edit if it diverges from the above.

# TESTS
Unit (`compiler/tests/unit/render-by-tag-nested-compound-bug60.test.js`) + happy-dom (`compiler/tests/browser/`): the reproducer (nested `<userName/>`/`<email/>` inside `<signupForm>` → both inputs render with correct type + bind to `signupForm.userName`/`signupForm.email`); a checkbox nested field; a NEGATIVE no-regression (top-level Shape-2 `<userName/>` still expands identically — byte-identical where possible); E-DG-002 no longer fires on the consumed compound. The happy-dom test should render the reproducer + assert `<input type="text">` + `<input type="email">` appear in the DOM and bind:value round-trips (typing updates `@signupForm.userName`).

Do NOT regress the S139 Bug-51 render-by-tag family (top-level v1-v8 forms) — full suite covers it; if you touch the shared expansion path, run the render-by-tag + Bug-51 tests explicitly.

# COMMIT DISCIPLINE (S83)
- After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>`; `git -C "$WORKTREE_ROOT" add <file>`; commit IMMEDIATELY (per fix-unit / per test-file). First commit message includes verbatim `pwd`.
- Update `$WORKTREE_ROOT/docs/changes/bug-60-render-by-tag-nested-compound-field-2026-06-03/progress.md` (append-only) after each step.
- Before DONE: `git -C "$WORKTREE_ROOT" status` MUST be clean. "HEAD unchanged — work in worktree" is NOT acceptable.
- Pre-commit hook runs `bun test {unit,integration,conformance} --bail`. **NEVER `--no-verify`** (forbidden, no authorization). Fix the cause if it fails.

# PHASE 3 — MANDATORY EMPIRICAL R26 (S138)
Before DONE, re-compile the reproducer on your post-fix baseline:
```
bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$WORKTREE_ROOT"/docs/changes/bug-60-render-by-tag-nested-compound-field-2026-06-03/repro-bug60.scrml --output-dir /tmp/r26-bug60/$(date +%s) 2>&1 | tee /tmp/r26-bug60.log
```
ALL must hold:
- Exits 0 (or warnings-only); NO spurious `E-DG-002` on `@signupForm`.
- The emitted HTML contains `<input ... type="text">` AND `<input ... type="email">` for the nested fields + `data-scrml-render-by-tag` hookpoints — and ZERO literal `<userName` / `<email` / `<signupForm` browser-ignored tags.
- `node --check` on the emitted client.js exits 0; the bind wiring keys on `signupForm.userName` / `signupForm.email`.
- The top-level Shape-2 control (a separate file with a file-scope `<userName req> = <input/>` + `<userName/>` use-site) STILL expands clean (no regression).
Paste the grep counts + node --check in your report. DO NOT mark DONE without R26 passing.

# FINAL REPORT
WORKTREE_PATH · BRANCH + FINAL_SHA · FILES_TOUCHED · ROOT CAUSE (the actual locus + the wrapper-emission decision you made + why) · FIX SUMMARY (how you reused the top-level Shape-2 expansion path; how E-DG-002 cleared) · TEST DELTA (N new; full-suite pass/fail/skip from `bun run test`) · R26 EMPIRICAL RESULTS (grep counts + node --check + top-level control clean) · MAPS feedback line · ANY SIBLING GAPS surfaced (Rule 5 — surface, don't silently fix/skip; e.g. if E-DG-002 needed a separate-pass touch, or the wrapper-emission has spec ambiguity) · DEFERRED items.
