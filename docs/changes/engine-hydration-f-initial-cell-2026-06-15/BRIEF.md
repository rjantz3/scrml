# BRIEF — Engine hydration primitive (Approach F): dynamic `initial=@cell`

**Change-id:** `engine-hydration-f-initial-cell-2026-06-15`
**Dispatched:** S198 (2026-06-15), PA → `scrml-js-codegen-engineer`, `isolation: "worktree"`, base HEAD `d18ac83a`.
**Task shape:** compiler-source feature (parser + SYM/typer + codegen + runtime) + a coupled SPEC §51.0.E amendment. RATIFIED design — do NOT re-litigate the surface.

---

## WHAT YOU ARE BUILDING (one paragraph)

scrml `<engine>`s (§51) boot at `initial=.Variant` — a STATIC literal only. They cannot hydrate to a PERSISTED state loaded at runtime (a DB/server column, `localStorage`) when that state may be any variant, not one `rule=`-legal step from `initial=`. The fix, ratified S198 via deep-dive + an independent F-vs-B debate (F won 48.5 vs 41.0): **widen `initial=`'s value grammar from `{static literal}` to `{static literal | runtime cell}`.** `initial=@cell` snapshots the cell's value at engine-construction and routes it through the EXISTING guard-free construction hook — NOT the transition guard. This is the **A-leg** of Approach F. The `server`-on-engine **E-leg** (§52 fetch-on-mount) is OUT OF SCOPE (deferred to the §52 program). Authority: `scrml-support/docs/deep-dives/engine-hydration-from-persisted-state-2026-06-15.md` + the design-insight "Persisted-engine hydration SURFACE … VERDICT F" in `~/.claude/design-insights.md`.

## THE SETTLED SEMANTIC (build to this — do not redesign)

**Hydration is CONSTRUCTION, not transition.** Booting a machine to a persisted state asserts the machine WAS there — guards (`rule=`) do NOT apply. scrml ALREADY builds the engine cell this way: `emitEngineVariantCellInit` (`compiler/src/codegen/emit-engine.ts:~1551-1560`) emits a bare `_scrml_reactive_set("varName", "Variant")` that bypasses the transition guard. The transition guard `_scrml_engine_direct_set` (`runtime-template.js:~3798`) hard-`throw`s `E-ENGINE-INVALID-TRANSITION` on a disallowed move — which is why hydration must NOT route through it. `initial=@cell` just feeds a runtime value into the construction hook the static literal already uses.

**`initial=@cell` = snapshot-at-construction, boot-only.** The engine cell is set to whatever `@cell` holds at engine-construction (module-init). The dev is responsible for `@cell` holding the intended value at construction (SSR/server-side `?{}` resolves before render; a synchronous read). An async-fetch-on-mount source not ready at construction is the deferred E-leg (`<engine server>`), NOT this. There is NO re-hydration after construction (boot-only by construction — `initial=` fires once; there is no anytime restore verb, and you SHALL NOT add one — that was Approach B, which LOST).

## THE SEAMS (PA-located — verify, then build)

- **SPEC §51.0.E** (`compiler/SPEC.md:~25246-25274`) — `initial=.Variant` defined as a static literal; REQUIRED-lint on non-derived (`W-ENGINE-INITIAL-MISSING`, defaults to first state-child), FORBIDDEN on derived (`E-DERIVED-ENGINE-NO-INITIAL`). This is the section to amend with the runtime-cell mode.
- **Capture:** `engineMeta.initialVariant: string | null` (`compiler/src/symbol-table.ts:~351`, set by B14, validated by B15) holds the variant NAME today. You need a sibling representation for the cell-ref case (e.g. `initialCell: string | null` — the cell name). The ast-builder captures `initial=` on the engine opener.
- **Codegen:** `emitInitialVariantValue(initialVariant)` (`emit-engine.ts:~1551`) → `JSON.stringify(variant)`; the construction emit is `_scrml_reactive_set("varName", <that>)` (`~1559-1560`). For `initial=@cell`, emit `_scrml_reactive_set("varName", _scrml_reactive_get("cellEncodedName"))` — the SAME bare guard-free set, reading the cell.
- **Diagnostic (PARTIALLY EXISTS — depth-of-survey discount):** `E-ENGINE-INITIAL-INVALID-VARIANT` already fires COMPILE-TIME for a static `initial=.X` not in the enum (`symbol-table.ts:~6209`). The graft needs the RUNTIME counterpart for the `@cell` case (the resolved value isn't a valid `for=T` variant at runtime). Model it on derived's `E-DERIVED-ENGINE-INITIAL-ABSENT` (the derived-engine runtime-absent parallel).

## PHASE 0 — SURVEY + STOP GATE (do this first; STOP and report if it fails)

The load-bearing risk is **construction-time init-ordering**: the engine's construction emit `_scrml_reactive_set("varName", _scrml_reactive_get("cell"))` must run AFTER `@cell`'s own declaration/init emit, or the read returns the wrong/placeholder value. VERIFY:
1. In the emitted module-init sequence, does (or can) the engine's construction emit land AFTER the `initial=`-referenced cell's init? If hoisting/ordering does not guarantee it, that's the STOP — report the ordering with the exact emit sequence and propose the fix (e.g. order engine construction after referenced-cell init, or a topological constraint) before building.
2. Confirm `emitEngineVariantCellInit` is the bare-set construction hook (not routed through `_scrml_engine_direct_set`) — quote the lines.
3. Confirm the existing compile-time `E-ENGINE-INITIAL-INVALID-VARIANT` (static-literal) fire so the runtime one is additive, not a duplicate.
If all three hold, proceed. If the ordering can't support a construction-time cell read, STOP — the semantic may need refinement (PA ruling).

## BUILD (phases 1-5)

1. **Parser/ast-builder + SYM:** recognize `initial=@cell` (a cell-ref, distinct from `.Variant`). Capture as `initialCell` (cell name) on the engine-decl + `engineMeta`. B15 validation: the referenced cell must EXIST (resolves via the state-cell registry) and be type-compatible (its resolved type is the engine's `for=T` enum OR `string` — a DB-status string holding a variant name is the canonical case, mirror the slice-1a `match for=Enum on=@stringCell` precedent). A non-existent cell → `E-STATE-UNDECLARED`-class; a type-incompatible cell → a clear diagnostic. `initial=@cell` is MUTUALLY EXCLUSIVE with `initial=.Variant` and FORBIDDEN on derived engines (same as `initial=.Variant`, `E-DERIVED-ENGINE-NO-INITIAL`).
2. **Codegen (emit-engine.ts):** when `initialCell` is set, emit the construction set reading the cell (`_scrml_reactive_set(varName, _scrml_reactive_get(cell))`), guard-free, ordered after the cell init (per Phase 0). When `initialVariant` is set, unchanged.
3. **Runtime graft — `E-ENGINE-INITIAL-INVALID-VARIANT` RUNTIME guard:** at construction, if the resolved cell value is `not`/absence/not-a-`for=T`-variant, throw `E-ENGINE-INITIAL-INVALID-VARIANT` (the "decoder boundary" — a guard-free construction must not be silently corrupt). Parallel to derived's INITIAL-ABSENT. Message names the cell + the invalid value + the `for=T` variant set.
4. **SPEC §51.0.E amendment:** add the runtime-cell mode — `initial=@cell` accepts a cell whose value is snapshotted at construction; boot-only; routes through construction (guard-free, NOT a transition); the cell's type is `for=T` or a `string` holding a variant name; the runtime `E-ENGINE-INITIAL-INVALID-VARIANT`; the snapshot-at-construction semantic + a one-line SSR note (the value must be resolved at construction; async-fetch-on-mount is the deferred `server` E-leg). Per pa.md Rule 4, the §34 row for the runtime `E-ENGINE-INITIAL-INVALID-VARIANT` extension lands in the SAME change. Keep the amendment tight (the verdict + DD are the rationale; cite them).
5. **Tests + R26:** unit tests — `initial=@cell` compiles; emits the bare construction set reading the cell (NOT `_scrml_engine_direct_set`); the runtime guard fires on an invalid value; `initial=@cell` + `initial=.Variant` mutual-exclusion; forbidden-on-derived. **R26 dog-food:** a minimal engine hydrating from a `string` cell holding a variant name (the trucking HOS shape) — compile exit 0 + `node --check` the emitted JS + confirm the emitted init reads the cell + does NOT route through the transition guard.

## OUT OF SCOPE (do NOT build)
- The `server`-on-engine E-leg (§52 fetch-on-mount) — deferred to the §52 program. (NOTE: `<engine server>` currently SILENTLY SWALLOWS the `server` flag — a separate filed gap; do NOT fix it here unless trivially adjacent, and if you do, fire a `W-`/`E-` "server-on-engine deferred" diagnostic rather than silently dropping it — but the A-leg is the deliverable, don't let this expand scope.)
- A named `restore()` verb (Approach B — LOST the debate; do NOT add any anytime restore).
- The teaching lint-hover (graft #3) — OPTIONAL/deferred; the A-leg primitive + the runtime guard are the deliverable. Skip the hover unless trivial.
- The trucking HOS corpus rewrite (slice 1b proper) — a SEPARATE downstream dispatch that consumes this primitive.

## MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; its §"Task-Shape Routing" names the maps for a compiler-source codegen/parser task (this IS a codegen+parser+typer task — maps ARE load-bearing here, unlike the corpus task). Map currency: watermark `471cbb34` (2026-06-15); HEAD is `d18ac83a` (3 commits ahead — s196 render-expr [touched codegen, a DIFFERENT emit area], s197 wrap, s198 trucking-1a [corpus only]). The engine-codegen files (`emit-engine.ts`, `symbol-table.ts`) were NOT changed by those commits, so the maps' engine-codegen content is current — but verify the exact line numbers against current source (they may have drifted ±). Report: "Maps consulted: [...]; load-bearing finding: <one sentence>" or "not load-bearing."

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
Worktree path is harness-assigned under `.claude/worktrees/agent-<id>/`. BEFORE any other tool call:
1. `pwd` MUST equal the worktree path AND start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo, STOP + report (S90). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. 3. `git status --short` clean. 4. `bun install` (worktrees don't inherit node_modules; pre-commit `bun test` fails without it). 5. `bun run pretest` (populates gitignored `samples/compilation-tests/dist/`).
Path discipline: apply ALL edits via **Bash** (`perl`/`python3`/heredoc) on **worktree-absolute paths including the `.claude/worktrees/agent-<id>/` segment** — NOT Edit/Write (S126; they've leaked to MAIN). Echo the path before each write; re-verify with `git diff`/`grep`. NEVER `cd` into the main repo; use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only. This is compiler-source — SPEC.md is huge; use `offset`+`limit` Reads, never full-file.

## COMMIT DISCIPLINE
Commit per phase (parser, codegen, runtime, spec, tests) — do NOT batch. First commit message includes verbatim `pwd`: `WIP(engine-hydration-F): start at <pwd>`. After each edit: `git -C "$WORKTREE_ROOT" diff`; `git add`; commit. Before DONE: `git status` clean. Update `docs/changes/engine-hydration-f-initial-cell-2026-06-15/progress.md` (append-only, timestamped) per phase. Coupled code+test land together (one logical unit).

## VERIFICATION (MANDATORY before DONE)
- Full pre-commit gate green (the hook runs unit+integration+conformance; the engine codegen has browser/integration tests too — run `bun run test` for the full baseline, 0 regressions).
- R26 dog-food (above) passes.
- The emitted construction reads the cell + does NOT route through `_scrml_engine_direct_set` (grep the emitted JS).

## FINAL REPORT
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED (worktree-absolute) · Phase-0 ordering finding (the load-bearing one) · per-phase results · test deltas (before/after counts) · R26 dog-food result · the SPEC §51.0.E amendment summary + §34 row · maps-consulted line · any STOP/deferral. Your final message IS the return value — data, not prose.
