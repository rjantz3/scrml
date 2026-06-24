# Escalation-#2 BUILD — author `route=` on a `server function*` (SSE) honored in APPLICATION mode + §12.3/§12.6 carve-out
change-id: `escalation-2-sse-author-route-app-mode-2026-06-23`

> **Archived per S136** (BRIEF.md = the verbatim dispatch prompt). Dispatched S217 (2026-06-23) to `scrml-js-codegen-engineer`, isolation:worktree, opus, background. Agent `a08dc0f5064594ed3`. Base main `7c01b22a`.

---

This is a NARROW, RATIFIED compiler-source + SPEC-amendment build. Stay inside the scope. The design is settled — do NOT redesign, do NOT widen.

# MAPS — REQUIRED FIRST READ
Before any other context, read `.claude/maps/primary.map.md` in full (~100 lines). Its §"Task-Shape Routing" tells you which additional maps to consult for a compiler-source codegen change — follow it.
Map currency: maps reflect HEAD `a2137214` as of 2026-06-23. **CAVEAT: `compiler/src/codegen/emit-server.ts` has had a HEAVY S216 rewrite AFTER that watermark** (Bug-51 enum emission, E-CG-016 collision guard, `generateValueOnlyServerJs`, §52 Pattern-C server-load routes). Treat the maps as a starting hypothesis ONLY for emit-server; grep/Read the live source as ground truth. In your final report, state whether the maps were load-bearing.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S42/S88/S90/S99/S126)
Your worktree is under `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-<id>/`.
## Startup (BEFORE any other tool call):
1. `pwd` — output MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If it's under any OTHER repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that's the S90 CWD-routing failure. Save it as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT. `git merge main` at startup (your base may be a session-start commit; pull current main into your worktree). Expected base ≈ `7c01b22a`.
3. `git status --short` clean. `bun install`. `bun run pretest` (populates `samples/compilation-tests/dist/` for browser tests).
## Path discipline (EVERY edit):
- **Apply file edits via Bash** (`perl`/`python3`/heredoc) on WORKTREE_ROOT-ABSOLUTE paths that include the `.claude/worktrees/agent-<id>/` segment — NOT the Edit/Write tools (S126 interim mitigation; Edit/Write have leaked to MAIN). Echo the target path before each write; re-verify with `git diff`/`grep` after.
- NEVER `cd` into the main repo or anywhere else; use `git -C "$WORKTREE_ROOT"`, `--cwd "$WORKTREE_ROOT"` for bun, and worktree-absolute paths exclusively (S126 #14/#15).
- First commit message MUST include the verbatim `pwd` output: `WIP(escalation-2): start at $(pwd)`.

# CONTEXT — what is RATIFIED (prerequisites, not conclusions)
Ratification: `~/.claude/design-insights.md` `[S216/escalation-2]` + DD `~/scrmlMaster/scrml-support/docs/deep-dives/serve-side-raw-route-2026-06-23.md` (Approach B + the OQ-1 carve-out). READ both before editing.

The ruling: scrml HONORS an author-declared `route="/path"` on a **`server function*` (SSE generator, §37.3)** — and the `handle()` escape hatch — in **APPLICATION (browser) mode**, as a stable foreign-consumer-known URL. The reason: an SSE that a NON-scrml client subscribes to has no scrml client to receive a compiler-internal route hash, so it needs the author's stable contract URL. This is the serve-side mirror of the `<api>` consume-side BYOB ratification (S210).

The plumbing already exists (verified in the DD): `ast-builder.js` parses `route=`/`method=`; `route-inference.ts` reads them into `explicitRoute`/`explicitMethod`; `emit-server.ts` honors the path at L1302 (`route.explicitRoute ? route.explicitRoute : routePath(routeName)`). Today an explicit `route=` is a RETENTION signal only in `--mode library` (§12.6, the gate at emit-server L850 `if (effectiveMode === "library" && isBodyOnlyEscalation(...)) continue;`). The build makes it a recognized **emission trigger in application mode** for `server function*` SSE.

# SCOPE — NARROW. What is OUT (ratified deferrals — do NOT touch):
- NO full Approach-A `raw` primitive / `rawResponse()` builder / `raw` keyword.
- NO per-route `csrf=` keyword — 7/8 personas: JSON+bearer is CSRF-exempt by construction; SSE GET is already CSRF-exempt (§37.8). NO auth/CSRF change.
- NO route-path collision detection (OQ-2 — explicitly DEFERRED as a flip-condition for revisiting Approach A).
- NO JSON-RPC POST dispatch primitive (that's a docs recipe over the already-shipped `handle()` — NOT this build).
- Do NOT change the client-fetch behavior for SSE that scrml ITSELF consumes — the carve-out is additive (honor the author path on the SERVER side in app mode).

# THE BUILD

## Phase 0 — empirically determine current app-mode behavior (do this FIRST, report findings)
Compile a minimal `server function*` SSE with an author `route="/fsp/deltas"` in DEFAULT (browser/app) mode — both (a) with another server trigger (e.g. yields from `?{}`) and (b) with route= as the ONLY signal. For each, inspect the emitted `*.server.js`:
- Does a handler emit at the author path `/fsp/deltas` (vs a compiler-internal `/_scrml/<hash>`)?
- Is `route=`-alone enough to ESCALATE the SSE to server + EMIT in app mode, or does it need another trigger?
- What, if anything, gates it to library-mode-only?
Report the empirical answer. The build is whatever MINIMAL change makes app-mode honor the author path; it may be smaller than expected (possibly just the SPEC amendment + a test if it already works, or a one-line escalation-trigger/emission-gate change).

## Phase 1 — compiler change (MINIMAL, per Phase 0)
Make an author `route=` on a `server function*` a recognized escalation + emission trigger in application mode, emitting the SSE handler at the author path. Likely sites: `route-inference.ts` (explicit `route=` as an app-mode escalation reason) and/or `emit-server.ts` (the emission gate around L850 / the SSE branch L1310). Keep it surgical. Do NOT regress library-mode behavior or non-author-route SSE behavior.

## Phase 2 — SPEC amendments (Rule 4 — land WITH the impl)
- **§12.3** (the "Route names are compiler-internal. The developer SHALL NOT reference, configure, or even observe the generated route names" axiom, ~L7017): SCOPE it to compiler-internal routes (those paired with a generated scrml client fetch); CARVE OUT author-declared foreign-facing endpoints — an explicit `route=` on a `server function*` SSE (and `handle()`) is an author-controlled, stable, observable contract URL, NOT a compiler-internal name. Cite the BYOB serve-side mirror of `<api>` (S210) + the no-scrml-client rationale.
- **§12.6** (Library-mode Emission, ~L7094): the explicit-`route=` retention now ALSO fires in APPLICATION mode for `server function*` SSE (a foreign-facing endpoint), not only library mode. Keep the existing library-mode statements intact; add the app-mode carve-out.
- §34: likely NO new codes (this is a carve-out, not a new error surface). Add one only if Phase 0/1 genuinely surfaces a needed diagnostic — and flag it for review if so.
- Regenerate the SPEC-INDEX Sections table if line ranges shift: `bun run scripts/regen-spec-index.ts`.

## Phase 3 — tests + EMPIRICAL R26 verification (S138 — MANDATORY, this touches emit-server codegen)
- Add unit/integration tests: a `server function*` SSE with author `route="/fsp/deltas"` in app mode → handler mounts at `/fsp/deltas`; node-check the emitted server.js; confirm NO regression for (a) library-mode SSE, (b) non-author-route SSE (still compiler-internal path), (c) a regular (non-SSE) server fn (unchanged).
- Run the relevant existing SSE/route tests; then the FULL `bun run test` (NOT just the pre-commit subset — the parity canary + browser/lsp live only in the full suite). Report pass/skip/fail.
- **DO NOT mark DONE without empirical verification passing** (compile a real SSE-author-route reproducer + node-check + the full suite green).

# COMMIT DISCIPLINE (S83 — two-sided)
After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>` to verify, `git add`, commit IMMEDIATELY (per-phase, don't batch). WIP commits expected. Coupled code+test = one commit. Do NOT use `--no-verify`. Before reporting DONE: `git status` MUST be clean. "work in worktree, no commits" is NOT an acceptable terminal report.
Write/update `docs/changes/escalation-2-sse-author-route-app-mode-2026-06-23/progress.md` after each phase (timestamped append-only: what done / what next / blockers).

# REPORT FORMAT (your final message IS the return value — raw data, not prose)
- WORKTREE_PATH, FINAL_SHA, BRANCH, FILES_TOUCHED list.
- Phase-0 empirical findings (the current app-mode behavior — this determines how small the build was).
- The exact compiler change made (file:line, before→after intent).
- The §12.3/§12.6 amendment text added.
- R26 empirical result: the SSE-author-route reproducer's emitted path + node-check; full-suite pass/skip/fail.
- Maps load-bearing? (one line.)
- Any sub-decision you hit + how you resolved it (or STOPPED on).
- Deferred items.
