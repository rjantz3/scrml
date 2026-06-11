# DISPATCH BRIEF — E-ROUTE wire-serializability gate (return + arg directions)

**change-id:** `e-route-serializability-gate-2026-06-10`
**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **model:** opus

## MISSION (one line)
Build the wire-serializability validator that, for every server-escalated function, rejects non-JSON-serializable **return** types (wire the already-SPEC'd `E-ROUTE-003`, currently emitted NOWHERE) **and** non-JSON-serializable **parameter** types (a NEW `E-ROUTE-004`), recursing into struct fields. Land the §12.5 + §34 spec amendments + tests in the same dispatch.

## WHY THIS EXISTS (the grounded finding — do not re-derive from a stale premise)
A PA survey (S179) found `E-ROUTE-003` is **SPEC-only — emitted in ZERO source files**. SPEC §12.5 (SPEC.md:7043) says non-serializable server-fn returns *"SHALL be a compile error (E-ROUTE-003)"*, but the compiler never enforces it: it GENERATES ser/deser (§12.5 "compiler SHALL generate serialization") without VALIDATING the type is serializable. So a `server function` returning a function/markup value silently produces garbage instead of a compile error. This is a **spec-vs-impl divergence (a BUG)**, not a doc gap. The original gap `g-route-arg-fn` assumed the return gate existed and only an arg gate was missing — that premise is false; NEITHER direction is built. You are building both.

# MAPS — REQUIRED FIRST READ

Before consuming any other context, read `.claude/maps/primary.map.md` in full (~100 lines). Its §"Task-Shape Routing" tells you which additional maps to consult for a **compiler-source bug fix / new feature** task — follow that routing (expect the dependency + structure maps to be load-bearing for the RI↔TS seam).

Map currency: maps reflect HEAD `c48c4f71` as of 2026-06-09T23:35Z. HEAD is now `67789409` (4 commits ahead). Those 4 commits = S178 wrap + S179 #4 (runtime-shim clock de-leak: `compiler/runtime/stdlib/{auth,oauth,store}.js`) + S179 #3 (docs only). **None touched `route-inference.ts` or `type-system.ts`** — the maps are CURRENT for your targets. If your work touches files modified after the watermark, verify via grep/Read against current source.

Feedback (in your final report): "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing."

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S42 F4 + S90 + S99 + S126)

This session has had path-discipline leaks before. Follow exactly.

## Startup verification (BEFORE any other tool call)
1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it is under any OTHER repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report (S90 CWD-routing failure). Save it as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` MUST equal `WORKTREE_ROOT`.
3. `git status --short` — confirm clean.
4. `bun install` — worktrees do NOT inherit `node_modules` (pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise).
5. `bun run pretest` — populates `samples/compilation-tests/dist/` (gitignored; full `bun test` produces ~130 ECONNREFUSED failures without it). Use `bun run test` (chains pretest) for baseline, NOT `bun test` directly.
6. Run a baseline `bun run test` and record pass/skip/fail BEFORE any change.

If ANY check fails: STOP, report, exit.

## Path discipline (EVERY edit)
- **Apply ALL file edits via Bash** (`perl -0pi`, `python3`, `cp`, heredoc) on **worktree-absolute paths that include the `.claude/worktrees/agent-<id>/` segment** — NOT the Edit/Write tools (S126: Edit/Write have leaked to MAIN while git saw the worktree). Echo the target path before each write; re-verify with `git diff`/`grep` after.
- **NEVER `cd` into the main repo** (or anywhere outside `WORKTREE_ROOT`). Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively (S126: a `cd` into main leaks `bun add` / compile / edits).
- Translate any main-rooted path from this brief (e.g. `compiler/src/type-system.ts`) to `$WORKTREE_ROOT/compiler/src/type-system.ts` before writing.
- First commit message MUST include your verified `pwd`: `WIP(e-route-serial): start at $(pwd)`.

# GROUNDED CONTEXT (verified by PA against live source — trust, but confirm in Phase 0)

**Pipeline order:** `api.js` Stage 5 = **RI** (`runRI` → `riResult.routeMap`, a Map of server-escalated fns keyed `${filePath}::${span.start}`) runs BEFORE Stage 6 = **TS** (`runTS` → resolved types / typeRegistry). The serializability check needs BOTH the server-classification (RI) AND resolved types (TS) → it CANNOT live in RI's main pass (types unresolved there). The post-TS lint band (`api.js` Stage 6.4 / 6.4b / 6.4c — I-MATCH-PROMOTABLE etc.) is the precedent home for a post-TS diagnostic pass. **Phase 0: determine the cleanest seam** — (a) a new post-TS pass (Stage 6.4x) consuming `riResult.routeMap` + the typeRegistry, OR (b) inside `runTS` if it already receives the routeMap. You are authorized to choose + correct the touchpoint (depth-of-survey discount — the brief's named files are a starting hypothesis).

**The serializability rule (per SPEC §12.5 whitelist, SPEC.md:7011-7016 + 7043):**
- **SERIALIZABLE** (allow): `primitive` (string/number/boolean), `not`, `enum` (serialize as variant-name string), `array` of serializable, `struct` where ALL fields are serializable (RECURSE), `T | not` union, value-native `map` (§59.10 lossless entries-codec).
- **NON-SERIALIZABLE** (fire): scrml type-kinds `function` (FunctionType), `html-element` (markup — this IS the "DOM nodes" of §12.5 in scrml terms), `snippet` (parameterized markup), `machine` (engine), `cssClass`. (Post-S166 there are NO class instances in scrml — `html-element`/markup is the live analog of §12.5's "class instances/DOM nodes".)
- **UNVERIFIABLE** (`asIs` / `unknown`): default ALLOW (no error) — `asIs` is the deliberate escape hatch; erroring on it would break the hatch. If you find a strong case, surface a separate `W-` (not an error) and flag it for PA — do NOT silently error on `asIs`.
- Type-kind union lives at `compiler/src/type-system.ts` (~line 198-415: `kind: "primitive" | "struct" | "enum" | "array" | "map" | "union" | "asIs" | "unknown" | "not" | "snippet" | "state" | "error" | "html-element" | "cssClass" | "function" | ...`). Confirm the exact discriminants in Phase 0.

**Error codes:**
- **Return direction → `E-ROUTE-003`** (EXISTS in spec — SPEC.md:7043 prose + §34 catalog row 17138; you are WIRING the emission, not adding the code).
- **Argument/param direction → `E-ROUTE-004`** (NEW — `E-ROUTE-004` is FREE; -001/-002/-003 are taken). Add the §34 catalog row + §12.5 normative bullet.

**SSE edge — `server function*` (§37 generators):** the wire carries serialized yielded frames, so the YIELD element type must be serializable (not the generator object). Handle it (check the yield/element type) OR defer with an explicit note in progress.md + report if the AST doesn't expose the yield type cleanly.

# THE WORK — phased

**Phase 0 — survey + confirm-gate (REPORT BACK, do not build yet if a premise is wrong).**
- Confirm the RI→TS order + how `riResult.routeMap` reaches (or can reach) a post-TS pass.
- Confirm the type-kind discriminants + how a server-fn's resolved RETURN type and PARAM types are obtained (FunctionDeclNode annotations vs typeRegistry resolution).
- Confirm `E-ROUTE-004` is unused repo-wide (`grep -rn "E-ROUTE-004"`).
- Decide the placement seam (new Stage 6.4x pass vs inside runTS). State your choice + why.
- Report Phase 0 findings before Phase 1 IF anything contradicts the grounded context above; otherwise proceed.

**Phase 1 — build the validator.**
- A serializability predicate `isWireSerializable(type, typeRegistry, seen)` — recurses into struct fields + array elements + union members + map value type; cycle-guard via `seen`.
- For every entry in `routeMap.functions`: check the resolved RETURN type → on non-serializable, fire `E-ROUTE-003` (message names the fn + the offending type/field path). Check each PARAM type → on non-serializable, fire `E-ROUTE-004` (message names the fn + param + offending type/field path).
- Emit into the diagnostics stream that flows to `result.errors` (these are Errors, severity "error", NOT W-/I- — confirm the partition per the api.js diagnostic-stream rule: E-* prefix / severity:"error" → `result.errors`).
- Tree-shake / fast-path: zero server fns → no-op.

**Phase 2 — SPEC amendment (SPEC.md is normative; you MUST amend in the same dispatch).**
- §12.5: add a normative bullet mirroring the return bullet for the ARG/param direction (param types crossing client→server must be JSON-serializable; non-serializable → `E-ROUTE-004`). Keep the existing return bullet (§12.5:7043) — it is now ENFORCED (note the wiring).
- §34 catalog: add the `E-ROUTE-004` row (next to 17138's E-ROUTE-003), severity Error, cross-ref §12.4/§12.5.
- Regenerate the spec index if your edits shift §-line ranges materially: `bun run scripts/regen-spec-index.ts`.
- `.scrml` canonical-mirror guard: this dispatch does NOT touch `compiler/native-parser/*.scrml` mirrors — N/A.

**Phase 3 — tests** (`compiler/tests/unit/` and/or `integration/`).
- Positive (no error): server fn with serializable params + return (primitive/struct-of-primitives/enum/array/`T|not`/map).
- Negative return → E-ROUTE-003: server fn returning a `function` / markup / snippet / engine value; struct-with-a-function-field return (RECURSION).
- Negative param → E-ROUTE-004: server fn with a `function`-typed / markup-typed param; struct-with-a-function-field param (RECURSION).
- `asIs` param/return → NO error (escape-hatch preserved).
- SSE `server function*` yield-type case (if handled) — else a `.skip` with the deferral reason.
- Diagnostic-stream assertion: the codes land in `result.errors` (use a cross-stream helper if unsure — see the api.js W-/I- partition rule).

**Phase 4 — EMPIRICAL VERIFICATION (mandatory before DONE; S138 doctrine).**
- Write a minimal real `.scrml` repro (a `server function` with a function-typed param AND a function-typed return) and compile it via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <repro>`; confirm BOTH `E-ROUTE-003` and `E-ROUTE-004` fire on the right spans, and a serializable-signature control compiles clean. Capture the output in progress.md.
- DO NOT mark DONE without the empirical repro firing both codes.

## COMMIT DISCIPLINE (S83 two-sided) + CRASH RECOVERY
- After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>` to verify; `git add`; commit IMMEDIATELY per sub-unit (validator / wiring / spec / tests). Don't batch. WIP commits expected.
- Update `$WORKTREE_ROOT/docs/changes/e-route-serializability-gate-2026-06-10/progress.md` after each step (append-only: what was done / what's next / blockers). If you crash, your commits + progress.md are how the next agent resumes.
- Before reporting DONE: `git -C "$WORKTREE_ROOT" status` MUST be clean (everything committed). "work in worktree, no commits" is NOT an acceptable terminal report.

## FINAL REPORT (back to PA)
`WORKTREE_PATH`, `FINAL_SHA`, `BRANCH`, `FILES_TOUCHED`, baseline-vs-final test counts, the placement-seam you chose (+ why), the Phase-4 empirical repro output (both codes firing), any deferrals (SSE / asIs-W), and the MAPS feedback line. Note any path-discipline incident.
