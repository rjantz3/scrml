# Progress: s6-const-sweep

Goal: align §6 of `compiler/SPEC.md` with canonical L15 form for derived-cell declarations.
- Old: `const @x = expr`
- New: `const <x> = expr` (declaration site uses structural `<>`; reads stay `@x`)

§6 line range per SPEC-INDEX: 1675-4909.

## Initial discovery

- Total `const @<id>` mentions in SPEC.md: 99 (matches brief's "~99").
- With `=` (declaration form): 59
- Without `=` (prose form-references like "the `const @name` form"): 40
- Within §6 (1675-4909): the bulk; outside §6 instances:
  - L12994, L13040, L13086 — §22/§23 metaprogramming/foreign code examples (with `g{}`/`r{}` RHS)
  - L13945, L13946, L13999, L14090 — §34 error-code table (E-REACTIVE-002/003, W-DERIVED-001, E-DERIVED-WRITE)
  - L6180 — §11 inheritance/cross-section prose
  - L22145, L22301, L22387, L22501, L22509 — §52 state authority (`@todoCards`, `@derived` mentions)
- Within §6 only (the dispatch's scope): 99 - (out-of-§6 listed above) ≈ 87

## Plan

1. Sweep §6 (lines 1675-4909) only. Convert `const @x = ...` → `const <x> = ...` and prose
   references `const @name`/`const @derived` → `const <name>`/`const <derived>`.
2. Leave RHS `@x` reads intact.
3. Outside §6 mentions become a follow-up note.

## Execution log

- Batch 1 (commit 38015b0) — §6.2 / §6.4.1 / §6.4.3 / §6.5.11 — 7 edits.
- Batch 2 (commit f8d9854) — §6.6.1-§6.6.10 normative + diamond + cycle examples — 25 edits.
- Batch 3 (commit 31ecb53) — §6.6.11-§6.6.17 worked examples + interaction notes — 17 edits.
- Batch 4 (commit e36394a) — §6.7 when/derived contrast + TOC heading — 13 edits.

Edits applied: ~62 unique Edit calls across SPEC.md (96 line-changes per `git diff -c '^-'`).

## Verification

After sweep: `grep -nE "const @[a-zA-Z_][a-zA-Z0-9_]*" compiler/SPEC.md` returns 0 hits in §6
range (1675-4909). Pre-commit hook (`bun test`, 8028 tests) passes on every batch commit.

## Out-of-§6 instances preserved (follow-ups, NOT fixed by this dispatch)

Per dispatch scope (§6 only). Logged here for a follow-up cleanup pass:

- **L19** — `Status:` changelog header mentions "const @name" historically. Pure history,
  arguably leave as-is.
- **L6182** — §11 / §12 prose: "function that reads a `const @name` derived reactive value".
  Cross-section reference; should track §6 form.
- **L12996, L13042, L13088** — §22 / §23 metaprogramming + foreign-code examples
  (`const @spectrum = g{...}`, `const @filtered = r{...}`). These are derived-cell
  declarations using the `^{}` / foreign-code RHS forms — they need updating to `const <x>`.
- **L13947, L13948, L14001, L14092** — §34 error-code summary table (E-REACTIVE-002,
  E-REACTIVE-003, W-DERIVED-001, E-DERIVED-WRITE). The §34 table mirrors §6 wording; it's
  out of sync now until updated.
- **L22147, L22303** — §52 examples (`const @todoCards = @cards.filter(...)`). Real
  declarations using the obsolete form.
- **L22389, L22503, L22511** — §52 prose using "`const @derived`" as a form-name.

Recommend a tiny follow-up dispatch `s34-s52-const-cleanup` to harmonize these references
once this dispatch lands.

## Cross-section teaching examples — verification

The brief asked: confirm sections that *teach* the canonical derived-cell form by example
already use `const <x> =`. Spot-check:

- `docs/PA-SCRML-PRIMER.md` §3 / §4 — not modified by this dispatch; not verified in detail.
  Recommend the follow-up dispatch include kickstarter + primer cross-checks.

## STATUS: COMPLETE

- Branch: `changes/s6-const-sweep`
- HEAD on §6 sweep: e36394a (final summary commit added by spec(s6-sweep) message).
- §6 (1675-4909): 0 remaining `const @<id>` declarations or form-references.
- Out-of-§6 instances: 13 (logged above as follow-ups).
- bun test: passing (pre-commit hook ran on every batch).

