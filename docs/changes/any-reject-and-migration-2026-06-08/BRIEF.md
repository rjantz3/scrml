# DISPATCH — Enforce the "no `any`" hard line: reject `any` as a type + migrate the corpus (S174)

> Archived verbatim per pa.md S136. Dispatched S174 (2026-06-08), agent `a1e49a35375e7b266`, isolation:worktree, run_in_background, opus. Base HEAD `916b8bb3`.

Change-id: `any-reject-and-migration-2026-06-08`. **The design line (user verbatim, S174):** *"how is 'any' even being used as I have made that a hard line in scrml. There is no any. … I am only begrudgingly allowing 'asis' because I don't know everything someone might try with the language."* Today `any` compiles SILENTLY: it falls through `resolveTypeExpr`'s unknown-type path to `asIs`/`unknown`, no diagnostic. This dispatch makes `any` a hard ERROR and migrates every current `any` site so the suite stays green.

**SCOPE — strictly this, nothing else:**
- IN: reject `any` (`E-TYPE-ANY-FORBIDDEN`) + SPEC "no any" rule + §34 row + fix the SPEC's OWN `any` sites + migrate ALL corpus `any` sites + tests + R26.
- OUT (do NOT touch — these are separate, later dispatches): the function-typed-struct-field escalation (4A / `E-STRUCT-FUNCTION-FIELD`); the passed-vs-stored function-prop rule naming; the BROADER unknown-type-name leak (an arbitrary undefined type like `Frobnicate` ALSO silently asIs-es — that is a separate "must-follow-soon" arc, do NOT attempt it here; this dispatch is `any`-TOKEN-specific only).

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; follow its Task-Shape Routing for a compiler-source bug-fix + spec-amendment. **Map currency:** maps reflect HEAD `642950a2`; current main is `916b8bb3` (the S173 backlog + S174 `log()` landing came after — they touched §14.3/§21.2/§34/SPEC-INDEX + codegen/runtime/type-system-adjacent files). Treat map content as a starting hypothesis; verify against current source via grep/Read. Report a one-line maps-load-bearing note.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 leak-history — hard gate)
Worktree path: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-<id>/` = WORKTREE_ROOT.
## Startup (BEFORE any other tool call)
1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo, STOP + report (S90 CWD-routing). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. 3. `git rev-parse --abbrev-ref HEAD` + `git log --oneline -1` — confirm base `916b8bb3` (S174). If older, `git merge main` or report.
4. `git status --short` clean. 5. `bun install`. 6. `bun run pretest`. Use `bun run test` (chains pretest) for full-suite baselines.
If ANY fails: STOP + report.
## Path discipline
- Apply ALL edits via Bash (`perl`/`python`/heredoc/`cp`) on WORKTREE_ROOT-absolute paths that include the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write. Echo the path before each write; `git diff`/`grep` after.
- NEVER `cd` into the main repo. Use `git -C "$WORKTREE_ROOT"`, `--cwd "$WORKTREE_ROOT"`, worktree-absolute paths.
- First commit message includes verbatim `pwd`: `WIP(no-any): start at <pwd>`.

# COMMIT DISCIPLINE
Commit per phase (per file + its migration). Coupled code+test (and the reject + the corpus migration that keeps the suite green) = land together / no transiently-red window. Before DONE: `git status` clean. Update `$WORKTREE_ROOT/docs/changes/any-reject-and-migration-2026-06-08/progress.md` per phase. NEVER `--no-verify`.

# RULE 4 — SPEC NORMATIVE
SPEC line numbers below are post-`916b8bb3`; re-confirm by grep. The async/await hard-line (`E-ASYNC-NOT-IN-SCRML`, SPEC §19.9.8 ~line 12902/12913 + §34 row ~16563) is the ENFORCEMENT-SPIRIT template ("scrml has no X … not valid anywhere") — but note async/await is a PARSE-time keyword reject, whereas `any` is a TYPE-annotation token, so YOUR fire site is at type resolution, not the parser.

# THE TASK — 4 phases

## Phase 0 — SURVEY + CONFIRM-GATE (do, then report the migration plan, then proceed)
1. **Find EVERY `any` site** across the whole repo (not just the list below): `grep -rnE ":\s*any\b" examples samples stdlib compiler/SPEC.md docs` (+ any other `.scrml`/spec/doc). Exclude `/dist/` (generated) and TS-internal `(x as any)` casts in `compiler/src/**/*.ts` (those are TS source, NOT scrml — out of scope). Known starting set (~33 sites): examples/23-trucking-dispatch (9 files: billing, invoices, address-form, customer-card, load-card, driver-card, assignment-picker, status-picker, invoice-card), samples/debate-lin-lift-pipeline.scrml, samples/compilation-tests/gauntlet-s19-phase4-markup/phase4-event-logic-wrapper-028.scrml, stdlib/http/index.scrml, + SPEC.md §55.9 (`GtFailed/LtFailed/GteFailed/LteFailed/EqFailed/NeqFailed(expected|forbidden: any)` ~lines 30592-30594) + ~2 other SPEC sites.
2. **Locate the fire site:** `resolveTypeExpr` (type-system.ts) is documented "error-free" (~line 620) — so the reject likely fires in a type-VALIDATION pass that consumes its output, OR as a token-level check where the SOURCE token `any` is still visible BEFORE it collapses to `asIs` (you cannot distinguish `any`→asIs from a legit `asIs` downstream, so you MUST catch the literal token `any`). Find the right place; report it.
3. **Propose per-site migration targets** (the gate): for each `any` site, propose the target per the policy below. Report the plan, then PROCEED (do not wait).

## Phase 1 — the reject `E-TYPE-ANY-FORBIDDEN`
Fire `E-TYPE-ANY-FORBIDDEN` (severity Error) whenever the literal type-token `any` appears in ANY type-annotation position: struct field type, state-decl `<x>: any` annotation, `fn`/`function` param type, fn return type, lifecycle/predicate type slots — anywhere a type goes. Message: name the rule + point to the escape hatch, e.g. "`any` is not a type in scrml — there is no `any`. Use a concrete type, or `asIs` for a deliberate untyped escape hatch." Do NOT fire on `asIs` (the sanctioned escape hatch) or on legitimately-unresolved-but-real types (that broader case is the OUT-of-scope must-follow-soon arc — `any`-token-only here).

## Phase 2 — SPEC
- NEW normative "no `any`" rule in §14 (Type System), mirroring the §19.9.8 async/await form: state that `any` is not a scrml type, there is no `any`, it is rejected (`E-TYPE-ANY-FORBIDDEN`), and `asIs` is the sanctioned untyped escape hatch (the deliberate opt-out). Cite the S174 user-voice hard line.
- §34 `E-TYPE-ANY-FORBIDDEN` row.
- **Fix the SPEC's OWN `any` sites** — §55.9 `ValidationError` `GtFailed/LtFailed/GteFailed/LteFailed/EqFailed/NeqFailed(expected|forbidden: any)` → `asIs` (these payloads are genuinely polymorphic-across-predicates = the honest escape-hatch case), + any other SPEC `any`. Regen SPEC-INDEX via `bun run scripts/regen-spec-index.ts` if ranges shift.

## Phase 3 — corpus migration (the bulk; MUST be COMPLETE so the suite stays green)
Migrate EVERY `any` site found in Phase 0. **Migration policy (apply per-site):**
- **Prefer a real named type** if one exists in scope/imports — e.g. a data prop `driver: any` → `driver: Driver` if a `Driver` struct/type exists in the app (check the app's `types.scrml`/`schema.scrml`/imports). `inv: any` in a `fn` → the real invoice type. Match the value's actual shape.
- **Use `asIs`** (the sanctioned escape hatch) ONLY where genuinely untypeable: callback props (a passed function is an `asIs` escape-hatch value — do NOT invent a function signature here; that interacts with the deferred function-prop rule), polymorphic payloads (the SPEC §55.9 case), and any shape with no defined type. `asIs` is the explicit, honest fallback — the user begrudgingly allows it.
- Do NOT introduce any NEW `any`. After migration, `grep -rnE ":\s*any\b"` over the migrated corpus (excluding /dist/, TS casts) MUST be ZERO.
- The migrated files MUST still compile + the full suite MUST stay green (trucking-dispatch is compiled by the smoke + expr-parity corpus tests).

## Phase 4 — tests + S138 R26
- Unit test: `<x>: any`, a struct field `: any`, a `fn` param/return `: any` each fire `E-TYPE-ANY-FORBIDDEN`; `asIs` does NOT fire.
- Regression: the migrated trucking-dispatch + the 2 samples + stdlib/http compile clean (0 `any`).
- **S138 R26 (MANDATORY before DONE):** (a) compile a probe with `any` in 3 positions → confirm `E-TYPE-ANY-FORBIDDEN` fires (exit 1); (b) compile the migrated trucking-dispatch app → 0 `any`, 0 NEW errors, `node --check` the emitted JS; (c) `grep -rnE ":\s*any\b"` corpus-wide (excl /dist/ + TS) == 0. Report exact commands + outputs. DO NOT mark DONE without R26.
- Full-suite baseline at start; confirm 0 NEW failures at end (`bun run test`).

# FINAL REPORT
WORKTREE_PATH · FINAL_SHA · BRANCH · FILES_TOUCHED · per-phase commit SHAs · Phase-0 survey (the complete `any`-site inventory + per-site migration targets + the fire-site you chose) · the SPEC rule home (for PA review) · R26 results (commands+output) · maps note · full-suite delta · any DEFERRED/uncertain migration sites (where you were unsure real-type-vs-asIs — flag for PA).

Build incrementally; the design is locked (no `any`, `asIs` is the escape hatch); surface (don't improvise) anything ambiguous in the migration.
