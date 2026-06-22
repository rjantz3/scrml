---
status: current
last-reviewed: 2026-06-21
---

# PongAI — scrml compiler bug report (consolidated)

> Every scrml-compiler/stdlib defect surfaced while dog-fooding scrml to build PongAI, from project
> start through S2. Each was filed individually into the scrml master node's inbox
> (`scrmlTS/handOffs/incoming/2026-06-21-pongai-bug-c{1..5}-*.md`); **this doc is the index +
> forensic record + chronology.** A roll-up index message was also sent to the scrml inbox
> (`2026-06-21-pongai-bug-rollup-c1-c5-reverified.md`).
>
> **Scope:** scrml language/compiler defects ONLY. Harness/environment issues that were *steps* but
> are NOT scrml bugs (worktree-isolation false-negative, Windows `bun` PATH, machine-specific build
> path) are listed separately in §3 so the scrml-only picture stays clean. Per PongAI's role as a
> CONSUMER in the scrml graph, compiler bugs flow one-way into scrml's inbox.

## §0 Status snapshot — RE-VERIFIED 2026-06-21

All five re-run against the **current** scrmlTS checkout — **HEAD `8dba968e` (S212)**, pkg version
`0.7.0` — by the PongAI PA on 2026-06-21. **All 5 still reproduce; none closed by sibling work.**
(This is the §8 verify-before-claim reverse check: confirm OPEN on a current baseline, not the
filing-time artifact. The checkout moved S2→S212 since filing, so the re-run was load-bearing.)

| ID | Title | Sev | Component | Found during | Verified today |
|----|-------|-----|-----------|--------------|----------------|
| **C1** | `animationFrame()` builtin → spurious `E-SCOPE-001` (canonical §6.7.9 game-loop idiom broken; compiler's OWN fixture fails) | high | `type-system.ts` (`LOGIC_SCOPE_GLOBAL_ALLOWLIST`) | core-slice authoring (the game loop) | **OPEN** — `E-SCOPE-001` ×2, fixture `…091.scrml` FAILS |
| **C2** | `scrml:` stdlib unresolvable on Windows (doubled drive letter `C:\C:\…` in `STDLIB_ROOT`) | high | `module-resolver.js:703` | core-slice authoring (serve randomness) | **OPEN** — `E-IMPORT-006`, path `C:\C:\…\stdlib\random.scrml` |
| **C3** | `function render()` emits call to undefined `_scrml_render()` (def is `_scrml_render_N`) — compiles clean, `ReferenceError` at runtime | high | codegen (name mangling / call-site) | core-slice play-test (game compiled but didn't run) | **OPEN** — def `_scrml_render_2()`, call `_scrml_render()` |
| **C4** | `==` vs a payload-variant constructor (`Type::Variant`) → compares value to a function → always false, no lint | medium | type-system / lint (equality) | core-slice play-test (stuck in `Serving`) | **OPEN** — emits `structural_eq(get("p"), P.B)`, clean, no lint |
| **C5** | Bare dot-variant as a payload-constructor arg type-checked against the OUTER enum (`E-TYPE-063`) | medium | type-system (variant-literal contextual typing) | ai-slice (`Mode::OnePlayer(.Easy)`) | **OPEN** — `E-TYPE-063: .A is not a variant of M` |

Severity legend: **high** = blocks a canonical idiom / silently breaks a compiled app; **medium** =
silent footgun with a clean workaround.

## §1 Chronology — the steps that hit each bug

PongAI is greenfield; the scrml encounters, in order:

1. **S1 — radical-doubt audit (D1).** Before any code, the audit asked "is scrml even viable for a
   real-time game?" Verdict: yes — `<canvas>` + `animationFrame()` fixed-timestep loop (scrmlTS SPEC
   §6.7). This put the game loop and `scrml:random` on the critical path — the two surfaces C1/C2
   would later break.
2. **S2 — build wiring (`g-no-build`).** `bun install` the scrml checkout; wire `package.json` to the
   scrml CLI by absolute path. No compiler bug here — but it's the step that made compiling possible.
3. **S2 — core-slice authoring → C1, C2.** The dev agent authored `src/pong.scrml` (the canvas +
   `animationFrame` loop + a `scrml:random` serve cone). Compiling surfaced **C1** (the
   `animationFrame` idiom won't compile) and **C2** (`scrml:random` won't resolve on Windows). Both
   worked around in source (host `requestAnimationFrame`; host `Math.random` in the impure launch fn).
   The slice landed compile-CLEAN at `e67df01`.
4. **S2 — core-slice play-test → C3, C4.** Compile-clean ≠ runs. Playing it surfaced two runtime
   breakages: **C3** (the draw function was named `render()` → `ReferenceError` on tick 1, so the
   canvas never drew and input never registered — renamed `drawFrame()`) and **C4** (the loop tested
   `@gamePhase == GamePhase::Serving`, silently always false → game stuck in `Serving`, serve never
   launched — switched to `@gamePhase is .Serving`). Fixed in `2d1c576`; USER-confirmed playable.
5. **S2 — ai-slice → C5.** Adding the AI + mode menu needed `Mode::OnePlayer(difficulty: Difficulty)`
   built as `@mode = .OnePlayer(.Easy)` — **C5**: `.Easy` was type-checked against `Mode`, not
   `Difficulty` (`E-TYPE-063`). Worked around by routing the inner variant through an
   explicitly-typed `<menuDiff>: Difficulty` cell first. Landed `d4ad343`.

**Pattern worth noting (for scrml).** Two of the five (C3, C4) **passed the compile gate silently and
broke only at runtime** — the most dangerous class for an adopter: "it compiled, why is the page
dead?" C3 is a hard `ReferenceError`; C4 is an always-false comparison. Both argue for a codegen/lint
guard (see each bug's suggested fix).

## §2 Per-bug detail

Each bug's authoritative filing (with the full minimal reproducer + root-cause hypothesis +
suggested fix) is the individual message in the scrml inbox. Condensed here:

### C1 — `animationFrame()` → spurious `E-SCOPE-001`  · high · `type-system.ts`
- **Symptom:** any `<canvas>`-scope `animationFrame(loop)` fails `E-SCOPE-001: Undeclared identifier
  'animationFrame'` at the type-system stage. Breaks the documented §6.7.9 game-loop idiom outright.
- **Root cause (hypothesis):** `LOGIC_SCOPE_GLOBAL_ALLOWLIST` (`type-system.ts` ≈ 6207–6258) lists raw
  `requestAnimationFrame`/`cancelAnimationFrame` but OMITS the scrml builtin `animationFrame`, even
  though the tokenizer (`tokenizer.ts:86`) registers it and the §6.7.9 lifecycle checker handles it.
- **Reproducer:** the compiler's OWN fixture
  `samples/compilation-tests/gauntlet-s19-phase2-control-flow/phase2-animationframe-in-element-091.scrml`
  (its `.expected.json` says `expectedOutcome: clean`) — now FAILS with 2× `E-SCOPE-001`.
- **Suggested fix:** add `animationFrame` to the allowlist; re-run the fixture to restore `clean`.
- **PongAI workaround:** host `requestAnimationFrame(loop)` (loses scrml's auto scope-cancellation).

### C2 — `scrml:` stdlib unresolvable on Windows  · high · `module-resolver.js:703`
- **Symptom:** any `import { … } from 'scrml:<name>'` → `E-IMPORT-006` resolving to a DOUBLED drive
  letter (`C:\C:\…\stdlib\random.scrml`). Blocks the whole `scrml:` stdlib on Windows.
- **Root cause (hypothesis):** `STDLIB_ROOT = resolve(dirname(new URL(import.meta.url).pathname), …)`.
  On Windows `new URL(...).pathname` is `/C:/Users/…` (leading-slash, drive inline); `path.resolve`
  treats it as relative and prepends the cwd drive → `C:\C:\…`. Secondary: only `<name>.scrml` tried,
  never `<name>/index.scrml`.
- **Suggested fix:** `fileURLToPath(import.meta.url)` (from `node:url`) instead of `new URL(...).pathname`
  — yields a correct native Windows path on both platforms.
- **PongAI workaround:** host `Math.random()` in the impure serve-launch `function`.

### C3 — `render()` name-mangling mismatch  · high · codegen
- **Symptom:** a user `function render()` compiles CLEAN but the DEFINITION emits as `_scrml_render_N`
  while the CALL site emits `_scrml_render()` (defined nowhere) → `ReferenceError` on first call.
  Inside an `animationFrame` loop it throws on tick 1 and kills the loop; page loads, nothing runs.
- **Re-verified emit today:** def `function _scrml_render_2()` (line 5) vs call `_scrml_render()` (line
  10). Other functions (`loop`) mangle consistently — only `render` mismatches → a name-specific
  codegen special-case.
- **Suggested fix:** namespace user functions so they can't collide with an internal `render`/`_scrml_render*`
  concept, OR at minimum emit a compile error if a user name resolves to a reserved/duplicated symbol.
- **PongAI workaround:** renamed `render()` → `drawFrame()`.

### C4 — `==` vs payload-variant constructor → always false, no lint  · medium · type-system/lint
- **Symptom:** `@cell == Type::Variant` where `Variant(payload)` carries data compiles to
  `structural_eq(value, Type.Variant)` where `Type.Variant` is the constructor FUNCTION → always
  false, no error, no lint. UNIT variants work (the variant is a string), so only PAYLOAD variants bite.
- **Re-verified emit today:** `structural_eq(_scrml_reactive_get("p"), P.B)`, where `P.B = function(n){…}`.
  Compiles clean, single warning (SPA inference), no equality lint.
- **Suggested fix:** lint/error when `==`/`!=` compares a value to a payload-variant constructor (point
  at `is .Variant` / `match`), OR define `==` against a bare payload tag to mean a tag check.
- **PongAI workaround:** the variant-tag operator `@gamePhase is .Serving`.

### C5 — nested dot-variant arg typed against the OUTER enum  · medium · type-system
- **Symptom:** `Outer::Variant(.Inner)` resolves `.Inner` against the OUTER enum's variant set, not the
  constructor parameter's type → `E-TYPE-063`. Same root affects `match`-bound payloads. Bare
  dot-variant literals take their expected type from the wrong context in constructor-arg position.
- **Reproducer:** `type D = {A,B}; type M = {One(d:D),Two}; @m = .One(.A)` → `E-TYPE-063: .A is not a
  variant of M`. Re-verified today.
- **Suggested fix:** the argument position of `One(...)` should supply expected type `D` to the bare
  dot-variant (the same contextual-typing rule that makes `<m>: M = .Two` work).
- **PongAI workaround:** route through an explicitly-typed cell (`<menuDiff>: Difficulty = .Easy`),
  then `@mode = .OnePlayer(@menuDiff)`.

## §3 NOT scrml-compiler bugs (env/harness — listed for completeness)

These were *steps* on the journey but are NOT scrml language/compiler defects; tracked elsewhere, not
filed to the scrml inbox:

- **Harness worktree-isolation false-negative** — the Claude Code harness reports "not a git
  repository" at boot and caches it, so `isolation:"worktree"` dispatch fails though git works.
  Worked around with manual `.worktrees/`. Fix = WorktreeCreate hooks in `.claude/settings.json`.
- **`bun` not on the bash PATH** — `C:\Users\poliv\.bun\bin` must be prepended. Local environment.
- **Machine-specific build path** — `package.json` hard-codes the absolute scrml CLI path; parameterize
  before cross-machine use.

## §4 Provenance

- Individual filings (authoritative reproducers): `scrmlTS/handOffs/incoming/2026-06-21-pongai-bug-c1…c5-*.md`.
- Roll-up index sent to scrml: `scrmlTS/handOffs/incoming/2026-06-21-pongai-bug-rollup-c1-c5-reverified.md`.
- PongAI commits referencing fixes/workarounds: `e67df01` (core-slice land), `2d1c576` (C3/C4 play-test
  fixes), `d4ad343` (ai-slice land / C5 workaround).
- Re-verification run: 2026-06-21, scrmlTS HEAD `8dba968e` (S212), by the PongAI PA — all 5 OPEN.
