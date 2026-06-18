# BRIEF — Trucking corpus slice 2: decl-coupled validators + auto-synth validity surface
# Dispatched S205 (2026-06-18). Agent scrml-js-codegen-engineer, isolation:worktree, opus, bg.
# Agent id: aeca43607dd011a51. change-id: trucking-slice-2-decl-coupled-validators-2026-06-18.

GOAL: convert trucking forms from raw `<input bind:value=@cell required>` → Shape-2 decl-coupled
(`<field req length(>=N)> = <input/>` + `<field/>` render-by-tag) grouped into compound-state cells
for the auto-synth validity ROLLUP (§55); replace manual checks / HTML `required` with `@form.isValid`
+ `<errors of=>` + `.touched`/`.submitted`. Dog-food exercises Shape-2 + §55 codegen on the flagship.

FORM SURFACE (~13 files, input counts): quote(10) load-new(6) register(5) driver/load-detail(5)
address-form(5) driver/profile(2) login(2) + 1-input forms. Skip non-field filter `<select>`s.
Base HEAD a650619e already has slice 3's `<each>` blocks — leave intact, touch the FORM INPUTS.

Full prompt mirrors the dispatched text: F4 startup + path-discipline (S99/S126) · maps-first ·
kickstarter-v2 + anti-patterns + PRIMER §4/§8 + SPEC §6.2/§55/§39.5.7 (read §55 in full, Rule 4) ·
per-file compile-verify (NO --dry-run) + whole-app exit-0 (baseline 5 warn + 3 lints) + node --check +
grep the synth isValid/errors emit · DOG-FOOD: file (don't fix) any §55 codegen bug, keep field working ·
commit-per-file + progress.md + clean git status.

PA landing: S67 file-delta the form files + progress.md; reconcile known-gaps if bugs filed (targeted,
not wholesale — base predates other S205 landings); PA-independent app-compile + synth-emit verify;
merge-before-push gate; push. F3 bridges if PA wraps before completion.
