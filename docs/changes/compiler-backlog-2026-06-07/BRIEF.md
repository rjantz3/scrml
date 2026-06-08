# DISPATCH BRIEF — compiler-source backlog (S173): function-typed-struct-field warning + export-plain-state-cell reject

change-id: `compiler-backlog-2026-06-07`
Two ratified, independent, SMALL compiler-source fixes. Both are SHARED-pipeline (one fire site each covers the legacy BS+Acorn pipeline AND the scrml-native parser — the native parser defers all type/export decomposition to the shared stages). Design ratified by the user S171 (items) + S173 (severity/code/scope). A read-only context-sweep (PA, S173) located every fire site; this brief encodes it. Verify against current source as you go.

---

# MAPS — REQUIRED FIRST READ

Before consuming any other context, read `.claude/maps/primary.map.md` in full (~100 lines). Its §"Task-Shape Routing" tells you which additional maps to consult for a compiler-source bug fix (route: error map + domain map + structure map).

Map currency: maps reflect HEAD `e05dbb17` as of 2026-06-07. HEAD is now a few commits ahead (`6d355723`), BUT the two files you touch — `compiler/src/type-system.ts` and `compiler/src/module-resolver.js` — were NOT modified since the watermark (verified), so the map content is accurate for your work. Treat anything you grep/Read in current source as ground truth regardless.

Feedback: in your final report include either "Maps consulted: [list]; load-bearing finding: <one sentence>" or "Maps consulted but not load-bearing." Both are valuable signal.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

**S99 leak-history: this project has had path-discipline leaks (agent Edit/Write landing in MAIN instead of the worktree) across S42–S126. Do NOT become the next incident.**

Your worktree path is: `<WORKTREE_ROOT>` (the harness assigns it; capture it).

## Startup verification (BEFORE any other tool call)
1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it's under any other repo, STOP and report (S90 CWD-routing failure). Save as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` MUST equal `WORKTREE_ROOT`.
3. `git status --short` — confirm clean.
4. `bun install` — worktrees don't inherit `node_modules`; the pre-commit `bun test` fails without it.
5. `bun run pretest` — populates `samples/compilation-tests/dist/` (gitignored; the full suite needs it).

If ANY check fails: STOP, report, exit.

## Path + edit discipline (S99/S126 — IN FORCE)
- **Apply ALL file edits via Bash** (`perl -0pi`/`python`/`cp`/heredoc) on **worktree-absolute paths that include the `.claude/worktrees/agent-<id>/` segment** — NOT the Edit/Write tools (the Edit/Bash filesystem-divergence leak class, S126 #12/#13). Echo the target path before each write; re-verify with `git diff`/`grep` after.
- **NEVER `cd` into the main repo (or anywhere).** Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively. A `cd <main>` leaks `bun add`/compile/edit operations into MAIN (S126 #14/#15).
- If an edit target would start with the main repo root (no `.claude/worktrees/agent-X/`), STOP and re-derive from `WORKTREE_ROOT`.

## Commit discipline (S83 — two-sided rule)
- After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>` to verify → `git -C "$WORKTREE_ROOT" add <file>` → commit IMMEDIATELY. Don't batch. Commit per-item (Item A separately from Item B) for crash-recovery.
- Your FIRST commit message MUST include the verbatim `pwd` output: `WIP(backlog): start at <pwd>` (S99 echo-pwd discipline).
- Before reporting DONE: `git status` MUST be clean. "work in worktree, no commits" is NOT an acceptable terminal report.
- Never use `--no-verify` on commit or push without explicit authorization.

## Progress
- Write `docs/changes/compiler-backlog-2026-06-07/progress.md` (in your worktree) and append a timestamped line after each step. WIP commits expected.

---

# ITEM A — function-typed struct field → `W-TYPE-FN-FIELD` (WARNING)

## What
A `:struct` field whose TYPE is a function type (`onClick: () -> void`, `cb: fn()`, `handler: (x: int) => string`) currently compiles SILENTLY — `resolveTypeExpr` returns `tAsIs()` with no diagnostic. **Ratified fix: emit a WARNING** (NOT an Error — the deeper "support vs reject function fields" fork is DEFERRED; a Warning surfaces it without deciding). Code: **`W-TYPE-FN-FIELD`** (W- prefix → `result.warnings`; info/warning severity).

## Fire site (SHARED — covers both pipelines; native defers to the same type-system)
- `compiler/src/type-system.ts` — `parseStructBody` (~1259-1308): iterates `field: typeExpr`, calls `resolveTypeExpr` per field (~1286), and ALREADY stamps an additive `AsIsType.isFunctionField=true` sidecar (~1301-1303) when `isFunctionShapedAnnotation(typeExpr)` is true (that sidecar today only drives the map-key E-EQ-003 case; it emits NO field-decl diagnostic).
- `isFunctionShapedAnnotation` (~1895-1901): the function-shape recognizer. **It recognizes `fn(...)` and `(...) => ...` ONLY — it does NOT recognize the `(...) -> ...` arrow form.** So `onClick: () -> void` is not even flagged today.
- `buildTypeRegistry` (~2821-2888): calls `parseStructBody` (at ~2839/2848/2874/2882) and HOLDS the `errors` array (param ~2823) + `fileSpan` (~2824). This is where the diagnostic can be pushed without changing `parseStructBody`'s signature — OR thread `errors`+per-field `span` into `parseStructBody` for a precise span. Your call; precise field-span is preferred if low-cost.
- `inline-struct` branch in `resolveTypeExpr` (~2319-2357, sidecar at ~2343-2345): `{ f: fn() }` inline structs stamp the same sidecar. **Fire `W-TYPE-FN-FIELD` here TOO** (consistency — an inline-struct function field is the same construct).

## The one real subtlety — `->` disambiguation (the highest-risk surface)
Extending detection to the `(...) -> ...` arrow form MUST NOT mis-fire on:
- The legacy lifecycle annotation `(A -> B)` (§14.12 — supported; e.g. `field: (A -> B)`).
- The canonical lifecycle `(not to string)` / `(A to B)`.

Disambiguator: a **lifecycle** arrow is INSIDE outer parens with a type on both sides — the trimmed expr STARTS with `(` AND ENDS with `)`. A **function-type** arrow like `() -> void` has the arrow AFTER a param-paren and does NOT end with `)`. `findTopLevelArrow` already exists and handles the lifecycle case; reuse it. **Test BOTH directions:** `onClick: () -> void` (MUST fire W-TYPE-FN-FIELD) AND `passwordHash: (not to string)` + `status: (Idle to Done)` + `field: (A -> B)` (MUST NOT fire). Decide whether to extend `isFunctionShapedAnnotation` or add a sibling predicate — either is fine; keep the existing `fn(...)`/`(...)=>...` recognition intact.

## Message
Name the field + that it's function-typed → currently treated as opaque `asIs`; whether function-typed struct fields are a supported feature is unresolved (deferred). Tone: informational nudge, not a hard stop.

## SPEC
- §14.3 (struct field types): add a short normative note — a function-typed struct field surfaces `W-TYPE-FN-FIELD` and is currently resolved as opaque `asIs`; first-class support is an open question (deferred). (Read §14.3 IN FULL before editing — Rule 4.)
- §34: add the `W-TYPE-FN-FIELD` catalog row (Info/Warning; cross-ref §14.3; arm: struct/inline-struct field). Mirror the row style of the nearby W- type codes.

## Tests
- A new unit test file (e.g. `compiler/tests/unit/struct-fn-field-warning.test.js`): POSITIVE — `fn()`, `(x)=>T`, `() -> void` struct fields each fire `W-TYPE-FN-FIELD` (assert via a CROSS-STREAM helper `[...result.errors, ...result.warnings]` — W- codes land in `result.warnings`, never `result.errors`). NEGATIVE — `(not to string)`, `(A to Done)`, `(A -> B)` lifecycle fields, plain scalar/struct/enum/array/map fields fire NOTHING. Inline-struct `{ f: fn() }` also fires.

---

# ITEM B — `export <plainStateCell>` → `E-EXPORT-001` (ERROR)

## What
Exporting a reactive state cell — `export { count }` or `export @count` inside a `${ }` logic block — currently SILENTLY PASSES (the `export` is swallowed; emitted JS has no export; cross-file import resolves silently to garbage). **Ratified fix: reject loudly** with **`E-EXPORT-001`** (free slot — only E-EXPORT-002/003 exist). Applies to BOTH plain Shape-1 cells (`<count> = 0`) AND derived cells (`const <total> = @a + @b`) — same reactive-state family. Component-as-const (`export const Greeting = <markup>`), channels (`export <channel>`), and engines (§21.8) stay EXPORTABLE — untouched.

## Fire site (SHARED — MOD stage runs for both pipelines)
- `compiler/src/module-resolver.js` — `resolveModules` export-collection loop (~202-247) / `buildExportRegistry` (~395-496). MOD is invoked at `api.js:1118 _resolveModules(tabResults)` for BOTH pipelines; legacy `ast-builder` and native `collect-hoisted` both feed the SAME `file.ast.exports`. ONE check here covers both pipelines + cross-file, with no native-parser `.scrml` re-sync churn.

## The discriminator (exact predicate — do NOT key on case alone)
An export is a state-cell export iff its `exportedName` binds to a local node `n` with **`n.kind === "state-decl"`** (regardless of `shape` — both plain and `shape:"derived"` qualify, per the ratified scope). Build the name-set by walking `file.ast.nodes` AND descending into nested logic-block bodies + compound state-decl `children`, collecting every `kind:"state-decl"` name; if an exported name is in that set → push `E-EXPORT-001`.

**MUST NOT reject (verify each stays legal):** lowercase `export function formatDate`, `export const MAX = 5`, `export let x`, `export type T`, PascalCase `export const Greeting = <markup>` (component-as-const — a different kind, NOT state-decl), `export <channel name="x">`, exported engines. Case-based rejection would break these — key on the `kind:"state-decl"` binding.

## Native @-form
Leave the native `parse-stmt.js` export arm AS-IS (generic). The MOD-side check catches both `export { count }` and `export @count` (both populate `file.ast.exports`) and provides the specific `E-EXPORT-001` message — so NO native-parser source change, NO `.scrml` re-sync needed.

## SPEC
- §21.2 (Export Syntax): add a normative line — a reactive state cell (plain or derived) SHALL NOT be exported (it is not in the Form-2 exportable set `type/function/fn/const/let`); doing so is `E-EXPORT-001`. (Read §21.2 IN FULL before editing — Rule 4. The Form-2 exportable list + the "other lifecycle state-types not yet exportable" clause are the anchors.)
- §21.6 (the local Error Codes table, ~SPEC.md 14164-14210) AND §34 master catalog: add the `E-EXPORT-001` row (Error; cross-ref §21.2).

## Tests
- A new unit test file (e.g. `compiler/tests/unit/export-state-cell-reject.test.js`): POSITIVE — `${ <count>=0  export { count } }` + `${ @count=0  export @count }` + `${ const <total>=@a+@b  export { total } }` each fire `E-EXPORT-001` (in `result.errors`), on BOTH the default pipeline AND `--parser=scrml-native`. NEGATIVE — `export function`, `export const MAX=5`, `export const Greeting=<markup>`, an exported channel all compile clean (no E-EXPORT-001).

## ⚠ Mandatory pre-land corpus grep (empirical safety)
Before finalizing, grep the corpus (`samples/`, `examples/`, `stdlib/`, `compiler/self-host/`) for any EXISTING legitimate cell-export (`export {` of a lowercase name bound to a state cell, or `export @<cell>`). The PA sweep believes there are zero, but the reject would BREAK any that exist. If you find any, STOP and report them (do not silently break corpus) — surface for a PA disposition.

---

# VERIFICATION (Phase 3 — empirical; do BOTH before claiming DONE)

1. Full suite green: `bun run test` from `WORKTREE_ROOT` → 0 fail (baseline ~23,422 pass; you ADD tests, so expect +N pass). The within-node parity test must stay 0-fail — if your changes shift parser spans (they shouldn't — these are diagnostic-only additions, ZERO codegen), reconcile per the residual-preserving rebump precedent and PROVE benign (emitted JS byte-identical).
2. Empirical repro for BOTH items (write tiny `.scrml` to `/tmp`, compile via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile /tmp/<f>.scrml --output-dir /tmp/<out>` on BOTH `--parser` defaults):
   - Item A: a struct with `onClick: () -> void` + `cb: fn()` → `W-TYPE-FN-FIELD` fires (×2); a struct with `passwordHash: (not to string)` → fires NOTHING.
   - Item B: `export { count }` of a state cell → `E-EXPORT-001` fires on BOTH pipelines; `export const Greeting = <markup>` → fires NOTHING.
3. `node --check` clean on any emitted JS (no malformed output from the diagnostic additions).

DO NOT mark DONE without both items' empirical verification passing + the corpus grep clean (or surfaced).

---

# FINAL REPORT (return to PA)
- `WORKTREE_PATH`, `FINAL_SHA`, `FILES_TOUCHED` (list), per-item commit SHAs.
- Item A: the `->`-disambiguation approach taken; positive/negative test results; SPEC §14.3 + §34 deltas.
- Item B: the discriminator implementation; the corpus-grep result (zero or the list); positive/negative test results (both pipelines); SPEC §21.2 + §21.6 + §34 deltas.
- Full-suite count; within-node parity status; any deferred items.
- Maps feedback line.

This BRIEF.md is archived to main per S136. Land via S67 file-delta after PA review.
