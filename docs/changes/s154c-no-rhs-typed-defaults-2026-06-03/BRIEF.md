# BRIEF — s154c-no-rhs-typed-defaults (S160 dispatch, verbatim prompt: text per S136)

> Dispatched S160 2026-06-03 to `scrml-js-codegen-engineer`, `isolation: "worktree"`, model opus, background. Agent `abf20cc2c8cb31d53`. Worktree base = `b3ba8925` (S160 docs + (c) SPEC landing). SPEC ruling (c) is LANDED in the base.

---

# MAPS — REQUIRED FIRST READ

Before consuming any other context, read `.claude/maps/primary.map.md` in full (~150 lines). Its §"Task-Shape Routing" tells you which additional maps to consult for a compiler-source bug fix / feature (type-system + ast-builder + error maps are relevant here). Map currency: maps reflect HEAD `f9d4b0f1` as of 2026-06-03 (just refreshed). Your worktree branches from `b3ba8925` (= f9d4b0f1 + 2 commits: the S160 docs + the S154 ruling (c) SPEC landing). The SPEC change you implement is ALREADY LANDED in your base — read it, don't re-derive it.

Feedback (in your final report): "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing."

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (BEFORE any other tool call)
1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo, STOP and report (S90 CWD-routing failure). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git merge main` (your base may be slightly behind main; ff cleanly — S112).
4. `git status --short` — confirm clean.
5. `bun install` (worktrees don't inherit node_modules).
6. `bun run pretest` (populates samples/compilation-tests/dist for browser tests).
7. Baseline: `bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance` — record pass/fail. (This is the pre-commit subset; the reliable gate.)

## Path discipline (S99/S126 — this project has had path-discipline leaks)
- ALWAYS use ABSOLUTE paths under WORKTREE_ROOT for Write/Edit. NEVER paths under the main checkout (leaks into main).
- Apply ALL file edits via Bash (perl/python/cp/heredoc on worktree-absolute paths), echoing the target path before each write + re-verifying via git diff/grep after — NOT the Edit/Write tools (S126 Edit/Bash filesystem-divergence mitigation).
- NEVER `cd` into the main repo or anywhere. Use `git -C "$WORKTREE_ROOT"`, `--cwd "$WORKTREE_ROOT"` for bun, worktree-absolute paths exclusively (S126 no-`cd`).
- First commit message includes the verbatim pwd: `WIP(s154c): start at $(pwd)`.

If ANY startup check fails: STOP, report, exit.

---

# TASK: implement S154 ruling (c) — no-RHS typed-decl canonical-empty/`not` defaults (generalize §6.2 Shape 4; retire E-DECL-NEEDS-INITIALIZER)

SPEC ALREADY LANDED in base `b3ba8925`. Read IN FULL first (normative, pa.md Rule 4):
- §6.2 "Shape 4 — Typed Declaration, No RHS (Canonical-Empty / `not` Default)" — the full rule (canonical-empty table; bare-T→not+implicit (not to T); union T|not/T?→not no-lifecycle; lifecycle-annotated A-non-not→error; refinement-violating-empty→E-REFINEMENT-NO-DEFAULT).
- §14.12.3 — "Shape 1 presence-progression — assignment OR discrimination (S160)" (implicit (not to T) + dual-transition + lifecycle-aware E-TYPE-001 message).
- §6.8.3 — "No-RHS implicit-(not to T) cell" reset note.
- §34 E-REFINEMENT-NO-DEFAULT (replaces RETIRED E-DECL-NEEDS-INITIALIZER).

## VERIFY-NOT-ASSERT before editing (R26 reverse; if any assumption WRONG, STOP + report):
1. The exact ast-builder.js branch firing E-DECL-NEEDS-INITIALIZER — expected tryParseStructuralDecl ~4286-4290.
2. Current handling of UNTYPED no-RHS `<x>` (no type AND no RHS) — confirm DIFFERENT path, unaffected.
3. Current `const <x>: T` no-RHS diagnostic — confirm its OWN error (NOT E-DECL), unaffected.
4. Engine-var collision (`<phase>: Phase` no-RHS + sibling `<engine for=Phase>`) — confirm engine-cell classification wins (E-ENGINE-VAR-DUPLICATE, §51.0.C); not-init path = non-engine plain cells only.
5. §53 predicate-eval infra in type-system.ts (checkPredicateLiteral / evaluatePredicateOnLiteral / parsePredicateExpr) for the compile-time E-REFINEMENT-NO-DEFAULT check.

## Implement
1. ast-builder.js (tryParseStructuralDecl no-RHS-typed branch ~4286-4290): REPLACE (do NOT delete — deletion re-opens the S152 silent-undefined→html-fragment hole) the E-DECL emission. Route by type: canonical-empty synth (int/integer→0, number→0, bool/boolean→false, string→"", T[]→[]); bare-T no-empty (struct/enum/date/timestamp/opaque)→not-init + mark implicit (not to T); union T|not/T?→not no-lifecycle; lifecycle-annotated (A=not→not; A non-not→error); refinement→defer SATISFIES/VIOLATES to type-system (synth base empty, let type-system fire E-REFINEMENT-NO-DEFAULT). Some routing (struct-vs-enum-vs-empty classification) may need type-system where type info is available — survey first, place each piece correctly.
2. type-system.ts: synthesize implicit (not to T) for no-RHS no-empty bare-T (per-access tracker ~1444 gates reads with E-TYPE-001); union T|not/T? get not-init NO lifecycle; Shape-1 (not to T) transitions on assignment OR presence-discrimination (verify the tracker integrates discrimination; wire if not; check docs/known-gaps.md); E-TYPE-001 message names the synthesized lifecycle; E-REFINEMENT-NO-DEFAULT (statically eval §53 predicate on the synthesized base empty — reuse evaluatePredicateOnLiteral/checkPredicateLiteral; VIOLATES→fire, SATISFIES→use; wire the new code into the catalog like sibling §53 codes).
3. Tests (COUPLED, ONE commit): INVERT compiler/tests/unit/typed-array-no-rhs-default.test.js (the ~9 toContain("E-DECL-NEEDS-INITIALIZER") assertions → expect 0/""/not-init, no error). ADD: canonical-empty synth; bare-T not-init + E-TYPE-001 read-before-assign + pass-after-assign + pass-after-discrimination; union T|not→not no-E-TYPE-001; refinement SATISFIES (number(>=0)→0) vs VIOLATES (number(>0)→E-REFINEMENT-NO-DEFAULT); lifecycle-annotated A-non-not→error; reset reverts not-init to pre.

## Phase 3 — R26 EMPIRICAL VERIFICATION (mandatory before claim-DONE)
Compile REAL .scrml through the full pipeline (probe with `<count>: int`/`<name>: string`/`<active>: bool` → emitted JS inits 0/""/false; node --check exit 0; NO E-DECL). A struct/enum no-RHS probe → not-init + read-before-assign surfaces E-TYPE-001. DO NOT mark DONE without R26 passing. Canonical V5-strict decls (primer §3).

## Commit discipline
Incremental commits; coupled code+test ONE commit; NEVER --no-verify. Before DONE: git status clean. Report WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED, baseline-vs-final test counts, R26 results, deferred items. Write docs/changes/s154c-no-rhs-typed-defaults-2026-06-03/progress.md updated each step.

---

## RECOVERY (S160) — original dispatch crashed mid-impl

Original agent `abf20cc2c8cb31d53` crashed on transient "API Error: Overloaded" after 40 tool-uses. It had committed the VERIFY-NOT-ASSERT survey + design (progress.md WIP `2150364e`) + had a syntactically-valid (node --check OK) but INCOMPLETE partial `ast-builder.js` (174 insertions, type-system not yet wired). Salvaged per S89: the old worktree is kept as the salvage source; a fresh recovery agent `accc154543a985d79` carries the survey+design (verbatim in the recovery prompt) + `cp`s the partial ast-builder.js as its starting point + completes the type-system side + tests + R26. Recovery prompt lives in the transcript (this BRIEF.md is the original dispatch).
