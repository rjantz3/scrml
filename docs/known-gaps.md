# Known gaps — spec-vs-implementation drift

> **Honest current state.** The README describes the nominal language at the time of any version release ("does not describe what the compiler is perfectly capable of doing"). This document is the running ledger of the largest places where the compiler does NOT yet match the nominal spec. Entries are added as gaps surface (e.g., during dogfood passes, adopter bug reports, audit passes), and removed when the gap closes via a landed implementation arc.
>
> **Severity legend:** HIGH = adopter-visible breakage on a documented pillar feature. MED = silent acceptance + missing safety guarantees. LOW = ergonomic / cosmetic drift.
>
> **Per-gap status:** `spec'd` = SPEC normative + compiler does nothing · `scoping` = SCOPING.md authored, OQs open · `in-impl` = implementation arc actively in flight · `blocked` = waiting on something else
>
> Updated 2026-05-19 (S107).

---

## HIGH

### `<match>` block-form (SPEC §18.0.1 + §18.0.2 + §18.0.3) — `in-impl` (Phase 1 active)

The block-form `<match for=Type [on=expr]> ... </>` is spec'd as the Tier 1 rung of the case-analysis ladder (§17.0), but the compiler currently captures the entire block as opaque HTML pass-through. Compile succeeds, the block doesn't render in the browser, and zero of the §18.0.2 safety lints fire (no `W-MATCH-RULE-INERT`, no `E-MATCH-EFFECT-FORBIDDEN`, no `E-MATCH-ONTRANSITION-FORBIDDEN`, no `E-MATCH-NOT-EXHAUSTIVE`). The Tier 0/1/2 ladder's middle rung is unrealized.

- **Workaround:** use `<engine>` (Tier 2) instead; it's fully implemented and provides exhaustiveness + active rule= enforcement + transition handlers.
- **Impl arc:** 5-phase SCOPING at [`docs/changes/match-block-form-scoping/SCOPING.md`](./changes/match-block-form-scoping/SCOPING.md) (~12-19h aggregate); 4 OQs ratified S107; Phase 1 (parser) active.
- **Target:** v0.4 minor release.

### Bug 5 Phase 3 — `${IDENT}` constant-folding optimization + SPEC §7.4.2 normative section — `scoping`

`${VERSION}` and similar non-reactive interpolations work end-to-end as of S107 Phase 1+2 (one-shot textContent write at DOMContentLoaded), but the SPEC has no normative statement on `${expr}` in markup-body position (the existing §7.4 covers the reverse direction — markup-AS-expression in logic). Phase 3 adds the missing SPEC §7.4.2 + constant-folding optimization (compile-time inline literal values into markup) + tilde-context threading + multi-binding placeholder dedup.

- **Workaround:** none needed (Phase 1+2 closed the headline symptom; this is polish).
- **Impl arc:** SCOPING at [`docs/changes/bug-5-const-interpolation-scoping/SCOPING.md`](./changes/bug-5-const-interpolation-scoping/SCOPING.md); Q-BUG5-OPEN-1/2/3 ratified, Phases 1+2 shipped (commits `c70176e` + `a7fbfa8`).
- **Target:** v0.4 minor release.

---

## MED-HI

### Bug 1 — Tailwind arbitrary-value classes silently no-op — `spec'd`

`grid-cols-[auto_1fr_auto]`, `w-[420px]`, `text-[clamp(1rem,2vw,1.5rem)]`, etc. — every standard Tailwind arbitrary-value class is documented but the built-in Tailwind engine doesn't emit a CSS rule + doesn't warn. Layout breaks silently. Floor fix (lint unrecognized class names) is small; full fix (support standard Tailwind arbitrary-value syntax) is medium.

- **Workaround:** use named utility classes only, OR drop a `#{}` CSS shim block with the arbitrary-value rules written by hand.
- **Reproducer + analysis:** [`handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md`](../handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md) §"Bug 1".
- **Status:** not yet SCOPING'd.

### Bug 2 — Phantom `E-SYNTAX-050` on multi-line `<a>` + entity-encoded element-name body — `spec'd`

`<a href="..." \n class="...">\n &lt;program&gt;\n </a>` triggers `E-SYNTAX-050: Bare '/' is no longer a valid closer` on a line containing no `/`. The error reports a wrong line number; cascade of unrelated "unclosed" errors follows. Compile fails on apparently-valid source.

- **Workaround:** collapse the `<a>` opener onto a single line OR change attribute ordering (the exact axis isn't bisected yet).
- **Reproducer + analysis:** [`handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md`](../handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md) §"Bug 2".
- **Status:** not yet SCOPING'd; needs minimal bisecting reducer.

---

## LOW-MED

### Bug 4 — Bare `?{` / `/` in markup-text body has no docs-mode escape — `spec'd`

Writing scrml-about-scrml content (any docs site, README example, blog post about scrml syntax) hits this: bare `?{` opens an SQL context that runs to EOF; bare `/` parses as element closer. Three design options surfaced: docs hardening (entity-escape pattern documentation), docs-mode lint (warn on context-opener outside `<pre>`/`<code>`), markup-text-mode tokenizer awareness (recognize context openers only inside explicit context shapes).

- **Workaround:** wrap context-opener tokens in `<code>` + entity-encode (`<code>?&#123;</code>`, `<code>&#47;</code>`).
- **Reproducer + analysis:** [`handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md`](../handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md) §"Bug 4".
- **Status:** needs deep-dive on design space.

---

## Closed in S107 (for reference; will rotate out)

- **Bug 5 Phase 1+2** — `${IDENT}` non-reactive interpolation now wires textContent + Anomalies B+C closed (commits `c70176e` + `a7fbfa8`)
- **Bug 3** — `[BS]` / `[TAB]` diagnostics now carry `file:line:col` prefix matching `[W-LINT-*]` shape (commit `2e9f9c3`)
- **Bug 6** — 2 hallucinated error-code references in `docs/website/pages/` retired to canonical SPEC §34 names (commit `c4d1114`)

---

## Where this list comes from

- **Dogfood bug reports** filed when the user/PA hits friction on real adopter-shaped work — see `handOffs/incoming/read/` for archived reports.
- **Spec-vs-impl audit passes** when sweeping a SPEC section (e.g., the S107 §18.0 surface audit that discovered the match block-form gap).
- **Adopter bug reports** (none yet; will flow through GitHub Issues when first surfaces).
- **PA self-discovery** during implementation work when a planned fix surfaces a deeper gap (e.g., the W-MATCH-RULE-INERT lint attempt surfacing the broader §18.0.1 unparsed state).

## Where to discuss / report

- New gaps in adopter code: file a GitHub Issue (link TBD; repo at https://github.com/bryanmaclee/scrmlTS)
- Cross-reference with phase status: [`master-list.md`](../master-list.md) §0 LIVE DASHBOARD
- Per-gap implementation arcs: [`docs/changes/`](./changes/) — each gap with an active impl arc has a SCOPING.md + progress.md there
- Per-session landings: [`docs/changelog.md`](./changelog.md)
