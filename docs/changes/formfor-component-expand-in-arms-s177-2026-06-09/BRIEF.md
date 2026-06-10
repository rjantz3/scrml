# DISPATCH BRIEF — formFor + component expansion in engine state-children / match arms (S177)

You are fixing a **silent-non-render bug class** (`g-formfor-in-match-arm`, broadened S177): the markup-expansion
passes do NOT recurse into engine `<engine>` state-child bodies (`.bodyChildren`) or `<match>` block-form arm
bodies (`.arms`), so a `<formFor>` or a custom **component** placed in those contexts is emitted as a RAW tag
(`<formFor .../>` / `<Badge .../>`) that the browser silently ignores — the form/component never renders. With a
valid handler this is VALID-JS-but-silently-wrong (the emitted-JS gate cannot catch it); the empty-`onsubmit=${}`
sub-case additionally emits invalid JS (`event.preventDefault(); ();`).

The fix is the SAME SHAPE as the S177 r27-c6 fix (which patched ONE slice). The render paths are already correct —
r27-c6 proved the engine render emits the expanded `<form>` once expansion reaches it. **This is PURELY about
making the expansion walkers recurse into `.bodyChildren` + `.arms`.**

Change-id: `formfor-component-expand-in-arms-s177-2026-06-09`. Progress: `docs/changes/formfor-component-expand-in-arms-s177-2026-06-09/progress.md`.

---

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full (~100 lines); follow its §"Task-Shape Routing" for a **compiler-source
bug fix** (type-system.ts + component-expander.ts + codegen render paths).

Map currency: maps reflect HEAD `35172d78`; true HEAD is `b1931f02` (2 ahead — the S177 bug-tail landing touched
`type-system.ts` [r27-c6 added the `walkAndSplice` `.bodyChildren` recursion you'll extend, + r28-7b], `block-splitter.js`,
`ast-builder.js`, `emit-match.ts`, `emit-event-wiring.ts`). Treat map content as a starting hypothesis; verify the
exact loci against current source via grep/Read (line numbers below are approximate and may have drifted).

Feedback line in your report: "Maps consulted: [...]; load-bearing finding: <one sentence>" or "not load-bearing — [...]".

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup (BEFORE any other tool)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90 CWD-routing). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. `git status --short` clean.
4. `git merge main` (or confirm base == `b1931f02`). Mid-session worktrees branch stale (S112) — if your base predates `b1931f02`, merge main FIRST (you NEED r27-c6's `.bodyChildren` recursion as your starting point).
5. `bun install` (worktrees don't inherit node_modules — pre-commit hook fails on missing acorn otherwise).
6. `bun run pretest` (populates `samples/compilation-tests/dist/` — empty in fresh worktrees → ~130 browser-test failures + your render tests can't run).

## Path discipline (EVERY edit) — S126 Bash-edit + S176 hook-blindspot
- Apply ALL edits via **Bash** (`perl -0pi`/`python3`/heredoc) on **worktree-absolute paths including the
  `.claude/worktrees/agent-<id>/` segment** — NOT Edit/Write, NOT bare main-absolute paths. Echo the path before each
  write; re-verify with `git diff`/`grep` after. (S176: the PreToolUse hook does NOT catch Bash writes — self-enforce
  the worktree prefix; a main-absolute Bash write leaks silently.)
- NEVER `cd` into main or elsewhere. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths.
- First commit message embeds your startup `pwd`.

## Crash recovery
Commit after each meaningful unit. Update `progress.md` (append-only). `git status` clean before DONE (S83).

---

# THE BUG — root + the 3 broken slices

**Root (two walkers, same blind spot):**
1. **formFor walker** — `walkAndSplice` inside `walkAndExpandFormForNodes` in `compiler/src/type-system.ts` (~L15159-15195).
   It recurses `.children` + `.body` + (r27-c6, S177) `.bodyChildren`. It does NOT recurse match `.arms`.
2. **component walker** — `walkAndExpand` in `compiler/src/component-expander.ts` (~L2710), recurses `.children` (~L2755).
   It does NOT recurse `.bodyChildren` (engine state-children) OR `.arms` (match arms).
   (NOTE: the `substituteProps` clone at ~L1995 DOES list `["templateChildren","bodyChildren","arms"]` — that is for
   prop-substitution INSIDE a component's own template, a DIFFERENT concern. Confirm it does not already cover use-site
   expansion — empirically it does not.)

**The 3 broken slices (all PA-verified by raw-tag-in-emitted-output on HEAD `b1931f02`):**
| slice | symptom today |
|---|---|
| `<formFor>` in a `<match>` arm | raw `<formFor .../>` in the arm render fn; empty `onsubmit=${}` → `(); ` invalid JS (gate-caught); valid handler → silent non-render |
| custom **component** in an `<engine>` state-child | raw `<Badge .../>` in the arm render fn + html — silent non-render |
| custom **component** in a `<match>` arm | raw `<Badge .../>` — silent non-render |

**Already WORKS (do NOT regress):** `<formFor>` in an `<engine>` state-child (r27-c6 — render-verified: emits
`<form data-scrml-formfor="NewExpense">` + `_scrml_reactive_get("newExpense...")` field wiring). top-level formFor +
top-level components also work.

**Reproducers** (build minimal versions of each; the originals were in /tmp and may be gone):
- formFor-in-match-arm (loud): a `<match for=E on=@cell>` whose `.Draft` arm contains `<formFor for=T onsubmit=${} pick=[...]/>` → E-CODEGEN-INVALID-JS.
- formFor-in-match-arm (silent): same but `onsubmit=handleSubmit()` (a CLIENT `function handleSubmit(){ @cell = E.Other }` declared AFTER the `<cell>` decl) → compiles clean BUT the emitted match-arm render fn returns a raw `<formFor .../>` string (no `<form>`).
- component-in-engine: `const Badge = <span class="badge" props={ label: string }>${label}</span>` then a `<engine>` `.Draft` arm with `<Badge label="hi"/>` → raw `<Badge` in output (no `<span class="badge">`).
- component-in-match: same Badge in a `<match>` `.Draft` arm.

---

# THE FIX

1. **formFor walker** (`type-system.ts walkAndSplice`): add a `.arms` recursion arm (parallel to the `.bodyChildren`
   arm r27-c6 added). A `<match>` block stores its arms in `.arms`; each arm's body is the arm node's `.children`
   (verify the exact shape — an arm may be `{ kind, ..., children: [...] }` or carry its body under another key; grep
   the match AST builder / `stmt.arms` consumers, e.g. type-system.ts ~L17351 which iterates `stmt.arms`). Recurse into
   each arm's body array so a `<formFor>` inside it is found + spliced.
2. **component walker** (`component-expander.ts walkAndExpand`): add `.bodyChildren` AND `.arms` recursion (parallel to
   the existing `.children` recursion at ~L2755), so a component use-site inside an engine state-child or match arm is
   found + expanded. Match the existing recursion's change-detection / re-clone semantics exactly.
3. **Sweep for sibling passes** with the same `.children`-only blind spot: at minimum check the **tableFor** expansion
   (does `<tableFor>` in an engine/match arm render?) and any other markup-tree walker that splices/expands at use-sites.
   If tableFor has the same gap, fix it the same way; if a pass is correctly generic already, note it and move on. Do
   NOT widen beyond the expansion passes (event-wiring / DG / etc. are out of scope — they already work on arm bodies).
4. **Empty-`onsubmit=${}` sub-case:** after the formFor expands in the match arm, re-check the empty-handler case. If
   `onsubmit=${}` (empty interpolation) still emits `event.preventDefault(); ();` (invalid JS), that is a SEPARATE small
   bug — an empty `${}` handler body. Either make the empty interpolation emit nothing (no trailing `()`), or confirm
   the top-level path's handling and mirror it. If it self-resolves once expansion runs, just note that.

**Ordering caution:** these are markup-tree expansion passes that run at the type-system / component-expander stage,
BEFORE codegen. The fix is the walker recursion ONLY — the codegen render paths (emit-variant-guard / emit-match for
match arms, the engine render for state-children) already emit whatever AST they're given (r27-c6 is the proof). Do NOT
touch the render codegen unless a render test proves the expanded AST still mis-renders (it should not).

---

# ACCEPTANCE GATE — RENDER VERIFICATION IS MANDATORY (the canary lesson)

This whole bug CLASS hid because the existing tests are compile-only / emit-string-only — none asserted the form or
component actually RENDERS. **A compile-clean result is NOT acceptance.** For EACH of the 3 slices you must add a
**happy-dom render test** that asserts the EXPANDED output is in the DOM:

- Mirror the existing happy-dom render-test pattern: `compiler/tests/browser/browser-match-block.test.js`,
  `compiler/tests/browser/browser-components.test.js`, `compiler/tests/browser/component-each-in-prop-scope.browser.test.js`.
- formFor slices: assert the rendered DOM contains the `<form data-scrml-formfor=...>` + the expected `<input>`/`<select>`
  fields (NOT a literal `<formFor>` tag).
- component slices: assert the rendered DOM contains the component's expanded markup (e.g. `<span class="badge">…`),
  NOT a literal `<Badge>` tag.
- For the engine slices, the INITIAL arm renders at module-init (per §7 / emit-variant-guard) — assert the initial-arm
  body expanded. (A variant-swap render check is a bonus, not required.)

**Also required:**
- An emit-level assertion per slice that the raw `<formFor`/`<Badge` tag is ABSENT from the emitted client.js/html.
- A regression assertion that the WORKING cases still work: formFor-in-engine (r27-c6) + top-level formFor + top-level component all still render.
- `node --check` clean on all emitted JS for every test fixture.
- Pre-commit subset green (`bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance`).
- Parser-shape canary: these are NOT parser changes (type-system / component-expander), but run
  `bun test compiler/tests/parser-conformance-within-node.test.js` to confirm no shape drift; do NOT expect a rebump.
- Full `bun run test` (incl. browser) — report pass/skip/fail.

**Scope guard:** LIVE-pipeline fix (type-system.ts / component-expander.ts). Do NOT touch `compiler/native-parser/**`
or any `.scrml` mirror (feature-stale; S162). Do NOT touch `docs/known-gaps.md` (PA owns the re-marking).

---

# FINAL REPORT
- WORKTREE_PATH, FINAL_SHA, BRANCH.
- FILES_TOUCHED (worktree-absolute).
- Per slice (formFor-in-match · component-in-engine · component-in-match): the NEW rendered output (paste the relevant
  emitted DOM/JS line showing the EXPANSION), + the happy-dom test name + pass count.
- tableFor / sibling-pass sweep: what you found (fixed / already-generic / N/A).
- empty-`onsubmit=${}` sub-case: resolved-by-expansion / separately-fixed / still-open (with reason).
- Regression: formFor-in-engine (r27-c6) + top-level formFor + top-level component STILL render (assert).
- Parser-shape canary result. Full `bun run test` pass/skip/fail.
- Maps feedback line. Confirm git status clean + per-unit commits.
