# Engine on-enter C1 arc — progress

Change-id: engine-on-enter-c1-2026-05-31
Ratification: Insight 33 (S144) "ratify C1" + S148 edge-case rulings (this session).
Base: HEAD 09f74bee (+ maps commit 189143a2).

## Edge-case rulings (S148, user-ratified via AskUserQuestion)
1. errorBoundary over a boot-effect throw → NOT caught (render-context only). Boot effects
   route typed `!` failures through their own `!{}` into the engine's error variant
   (errors-as-states); a non-`!` host throw → §19.6.8 loud-log backstop, NOT a fallback.
2. `effect=` on a `derived=` engine opener → FORBID, new code E-ENGINE-EFFECT-ON-DERIVED
   (no init→initial edge; variable read-only).
3. onIdle ordering → variant cell inits → `<onIdle>` arms (module-init = first event, full
   duration) → opener effect fires. Effect's init→initial edge does NOT reset the watchdog;
   cross-variant writes inside it reset normally per §51.0.R.
   (history-restore ordering MOOT for C1: C1 is boot-only, history is re-entry.)

## Phase 1 — SPEC normative core (PA-direct) — DONE (PA-direct)
- [x] §51.0.H Form 3 (opener effect=, boot-only Elm init) + amended Skipped note
- [x] §51.0.B opener attribute table + syntax line (+effect=)
- [x] §51.0.E (no change needed — covered by B+H)
- [x] §51.0.J E-ENGINE-EFFECT-ON-DERIVED rule row
- [x] §51.0.R ordering note (arm-then-fire; effect edge does not reset)
- [x] §51.0.F.1 self-write-vs-self-target trichotomy graft
- [x] §34 catalog: E-ENGINE-EFFECT-ON-DERIVED row
- [x] SPEC-INDEX regen + S148 header/cell notes
- [x] README Stage-3 flagship: self-target -> opener effect=
- [x] PRIMER §7 engines: opener effect= concept

## Phase 2 — compiler source (dispatched, isolation:worktree, scrml-js-codegen-engineer)
- [ ] parser: effect= on engine opener
- [ ] SYM/typer: .initial.rule check; E-ENGINE-EFFECT-ON-DERIVED; boot-only
- [ ] codegen: fire once at module-init, after onIdle arm; errorBoundary→backstop
- [ ] tests: parser + typer + codegen + happy-dom acceptance

## Phase 3 — land + verify
- [ ] R26 empirical verify; known-gaps; design-insight 33 + deep-dive status (same-landing)
