# sPA ss16 — pongai-type-system-codegen

**Launch:** `read spa.md ss16` · **Branch:** `spa/ss16` · **Worktree:** `../scrml-spa-ss16`
**Built:** S214 (2026-06-22) from the PongAI adopter cluster (C3/C4/C5 — all root-caused S213).

> **Reproduce-first, always.** Each item was PA-root-caused S213 but no fix has landed — confirm each
> still reproduces on current HEAD before briefing (R26). The repro corpus is the PongAI app +
> `handOffs/scrml-bug-report-pongai-s213.md` (the PongAI consolidated report; relocated from the project root S214).

## Shared ingestion
The PongAI adopter cluster — three bugs root-caused together (S213), all in the **type-system + codegen-expr
+ lint/shadowing** layer. The shared foundation: how `emit-expr.ts` lowers expressions (builtin-name
hijacking + `==`/`!=` structural-eq), how `type-system.ts` does contextual/variant typing, and the
**`log`-shadowing precedent** (the canonical "yield to a user function of a reserved builtin name + fire a
shadow lint" pattern) which item 3 mirrors. A dev who reads the log-shadowing implementation + the
type-system variant-typing path scopes all three.

## Core files
`compiler/src/codegen/emit-expr.ts` · `compiler/src/type-system.ts` · `compiler/src/codegen/log-loc.ts` (the `log`-shadowing precedent) · `handOffs/scrml-bug-report-pongai-s213.md` (PongAI repro corpus)

## Items (least-ingestion-first)

1. **`pongai-c5-ctor-arg-contextual-typing`** `[open]` bug MED · tier med — *(least ingestion — pure type-system)* `Outer::Variant(.Inner)` types the ctor-arg `.Inner` against the OUTER enum → spurious `E-TYPE-063`. **files:** `compiler/src/type-system.ts` (variant ctor-arg typing). **specSections:** §14.10 bare-variant inference + §53 contextual typing — *read the section the footprint names before encoding (R4).* **briefSeed:** the ctor-arg position must supply the param's declared type as the context for inferring `.Inner` — the SAME rule that makes `<x>: T = .V` resolve. Affects match-bound payloads too. **R26:** root-caused S213; confirm `E-TYPE-063` still fires on `Outer::Variant(.Inner)`.

2. **`pongai-c4-eq-vs-payload-variant-ctor`** `[open]` bug MED · tier med — `@cell == Type::Variant` (a PAYLOAD variant) emits `_scrml_structural_eq(@cell, P.B)` where `P.B` is the constructor FUNCTION → always-false, and NO lint fires (silent). **files:** `compiler/src/type-system.ts` (variant detection) + the lint surface + `emit-expr.ts` (the `==`/`!=` structural-eq emission). **specSections:** §45 equality + §18 variants/match. **briefSeed:** the type-system/lint must detect `==`/`!=` against a payload-variant CONSTRUCTOR (not a unit variant) and fire a lint (W-/I- — decide partition per the diagnostic-stream rule) steering to `is .Variant` / `match`. **R26:** root-caused S213 (confirmed always-false, no lint); confirm.

3. **`pongai-c3-render-builtin-shadowing`** `[open]` bug HIGH · tier high — *(highest ingestion — mirrors the log precedent)* `emit-expr.ts:1726` UNCONDITIONALLY hijacks `render(...)` → the `_scrml_render` builtin, so a user `function render` called from a fn body mis-encodes (definition `_scrml_render_4` vs call `_scrml_render` → ReferenceError). Silent. **files:** `compiler/src/codegen/emit-expr.ts:1726` (the hijack) + the `log`-shadowing precedent at `emit-expr.ts:1747-1758` + `_logShadowedInFile`/`setLogShadowing` + `checkLogShadowing` in `type-system.ts` + `log-loc.ts`. **priorArt:** the `log`-shadowing implementation IS the model — read it first. **briefSeed:** mirror `log` shadowing — when a user `function render` exists in scope, yield to it (emit its §47-encoded call, NOT the builtin) and fire a NEW info-lint `W-RENDER-SHADOWED` (§34, Rule 4 — add the §34 row WITH the impl). (`reset` is the hard-reserved alternative; `log` is the right model — shadowable-with-lint, not reserved.) **R26:** root-caused S213 (HIGH, silent); confirm the def/call name mismatch on a user `function render`.

---

## Disposition
*(filled by the sPA during the run — per-item: landed-on-branch SHA / parked + reason / NOT-REPRODUCED / dropped.)*

## Progress
`ss16.progress.md`. Land on `spa/ss16`; ping the PA inbox (`scrml/handOffs/incoming/`) when a batch is ready. Do not advance main / do not push.
