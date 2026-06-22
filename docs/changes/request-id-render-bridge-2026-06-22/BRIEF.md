# g-request-id-render-bridge-unwired — wire the `<request>` `<#id>` render bridge (S213 dispatch brief)

> Archived per pa.md S136. change-id: `request-id-render-bridge-2026-06-22`. Agent: `scrml-js-codegen-engineer`, `isolation:"worktree"`, `model:opus`. Base: main `acec6c10`. Gap: `g-request-id-render-bridge-unwired` (HIGH) in `docs/known-gaps.md`.

## The bug (HIGH, pre-existing, affects `<request url=>` AND `<request api=>`)

A `<request id="x" ...>` (§6.7.7) emits a fetch into `var _scrml_request_<id> = { loading, data, error, stale }` and correctly mutates `.data`/`.loading`/`.error` on resolve — BUT the markup `<#id>` ref does NOT read that object. The fetch+decode half is correct (A2 W4, R26-verified); the RENDER bridge is unwired. Confirmed on HEAD `acec6c10`:

- **`${<#id>.data}` interpolation** emits `_scrml_input_state_registry.get("<id>").data` — but the request NEVER `.set("<id>", _scrml_request_<id>)` into `_scrml_input_state_registry` (input-state §36 nodes DO register there; `<request>` nodes are classified separately and don't). So `.get(...)` is `undefined` → runtime throw / silent static shell (compiles GREEN, `node --check` OK — the dangerous "compiled-green ≠ runs" class).
- **`<match for=T on=<#id>.data>`** → `E-CODEGEN-INVALID-JS` (the bare `<#id>` token leaks into the match dispatch call). `on=${<#id>.data}` (wrapped) compiles but reads the empty registry.
- **`if=<#id>.X`** → `E-SCOPE-001` (the ref lowers to a bare unresolvable `_scrml_input_<id>_` ident).
- **`const <x> = <#id>.data`** at file scope → broken (parse / module-init level).
- **No reactivity** — `_scrml_request_<id>.data = …` is a plain object mutation (no reactive cell, no `_scrml_effect` subscription on the markup binding), so even once bridged the render would not update on fetch-resolve.

**Net:** `<request>` can fetch+decode but the result cannot be reactively rendered — the canonical "fetch → `<match>`/`<engine>` over loading/data/error" flow is dead. This blocks the whole `<api>` arc (the §60 banner flip + worked example + B-docs are HELD pending this fix; once this lands, the held A2-W5 example/docs/banner can be landed honestly).

## THE WORK — SCOPE-FIRST (the fix may be architectural; investigate before band-aiding)

**Phase 0 — scope + report BEFORE writing the fix.** Read SPEC §6.7.7 (`<request>` state model: `.loading`/`.data`/`.error`/`.stale`) + §36.1/§36.6 (input-state `<#id>` refs are render-once NON-reactive BY DESIGN — `<request>` is the OPPOSITE: its data MUST be reactive). Map the three seams in `compiler/src/codegen/emit-reactive-wiring.ts`:
  1. **How `<#id>` markup refs lower** (the `_scrml_input_state_registry.get("id")` path, ~line 489-519) — across interpolation, `if=` attr, and `<match on=>` contexts (the `if=`/`match-on=` lowering is also broken — bare-ident / token-leak).
  2. **How `<request>` emits** (`emitRequestNode` ~line 1129 + the §6.7.7 fetch-init ~line 716) — `_scrml_request_<id>` is created but never registered into the input-state registry.
  3. **How input-state nodes register** (the `inputStateNodes` loop ~line 690) + how a markup binding `_scrml_effect`-subscribes for reactive re-render.
Then REPORT the chosen fix shape (is it a clean bridge — register `_scrml_request_<id>` into the registry + lower `<#id>` refs to it + effect-wrap the binding — or genuinely architectural, e.g. the request state must become a reactive cell / `_scrml_deep_reactive`?). Surface scope before the fix; do NOT band-aid one symptom.

**The fix** (per your Phase-0 scoping) SHALL make ALL of these work end-to-end:
- `${<#id>.data}` / `${<#id>.loading}` / `${<#id>.error}` interpolation → reads the live request state AND re-renders reactively when the fetch resolves (loading→data transition).
- `<match for=T on=<#id>.data>` (bare AND `${...}`-wrapped) → lowers correctly (no E-CODEGEN-INVALID-JS), dispatches over the decoded variant, re-renders on resolve.
- `if=<#id>.loading` / `if=<#id>.X` → resolves (no E-SCOPE-001), reactive.
- `const <x> = <#id>.data` → resolves (no module-init throw).
- `url=` AND `api=` modes both wired (test both).

Keep the input-state §36 render-once semantics UNCHANGED (don't make `<#cursor>.x` reactive — that's by-design per §36.6; only `<request>` refs become reactive). If you need new §34 codes, land them WITH the impl (Rule 4); prefer reusing existing ones.

## R26 EMPIRICAL VERIFICATION (S138 — before DONE)
Compile a `<program>`-wrapped `<request api=>` (variant ResponseT) + a `<request url=>` flow that renders `.loading`/`.data`/`.error` via `<match>` + `${<#id>.data}` + `if=<#id>.loading`. Verify the emitted JS: the `<#id>` ref reads the live `_scrml_request_<id>` (NOT an unpopulated registry); the binding is `_scrml_effect`-wrapped (reactive); no E-SCOPE-001 / E-CODEGEN-INVALID-JS / module-init throw; `node --check` clean. Paste grep/shape evidence. DO NOT mark DONE without R26 passing.

## MANDATORY (S198 / S138 / S83 / S99-S126 / F4)
- Run the FULL `bun run --cwd "$WORKTREE_ROOT" test` (within-node parity canary + browser/lsp live ONLY in the full suite) before DONE. Re-baseline the `M6.5.b.0` within-node allowlist for any over-budget fixture IN THE SAME LANDING (set per-class to the printed `raw`, in-place, key order preserved).
- F4 startup verification (pwd MUST start with `…/scrml/.claude/worktrees/agent-`; `bun install --cwd`; `bun run --cwd pretest`).
- Path discipline: ALL edits via Bash (`perl`/`python3`/heredoc) on worktree-absolute paths (the `.claude/worktrees/agent-<id>/` segment); NEVER `cd` into main; NEVER Edit/Write-tool (they have leaked 15+ times). First commit message includes verbatim `pwd`. Commit per sub-bucket; `git status` clean before DONE; NEVER `--no-verify`.
- Write incremental progress to `$WORKTREE_ROOT/docs/changes/request-id-render-bridge-2026-06-22/progress.md`.

## REPORT BACK
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED (worktree-absolute) · Phase-0 scope finding (clean bridge vs architectural) · per-sub-bucket commits · within-node result · full-suite pass/skip/fail · R26 evidence (the emit shape proving the bridge) · Maps feedback line. PA lands via S67 file-delta.
