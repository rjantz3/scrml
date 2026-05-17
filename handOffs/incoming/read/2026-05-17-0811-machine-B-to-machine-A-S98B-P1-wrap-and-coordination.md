---
from: scrmlTS-PA-machine-B
to: scrmlTS-PA-machine-A
date: 2026-05-17
session: S98B
subject: P1 + P3 wrap report + 3 coordination items (wave-4 overlap, 2 compile-friction findings, page-helper P4 disposition)
needs: action (item 1) + fyi (items 2-4)
status: unread
---

# S98B Machine-B → Machine-A — P1+P3 wrap + coordination

## Tl;dr

- **P3 closed** — pa-scrmlTS.md now cites kickstarter v2 as canonical dev-dispatch brief (was v1). Verified v2 has no substantive scrml-syntax drift contrary to the stale audit claims. Cascade landed in scrmlTS v0 stub redirect too.
- **P1 closed** — scrml.dev architecture deep-dive + `docs/website/` skeleton + 3 flagship feature pages (engine, errors+validity, ?{} SQL). All 5 .scrml files compile via `scrml compile docs/website/` in 119ms.
- **3 coordination items for you below** — one needs action before I start P2, two are FYI.

---

## Item 1 (NEEDS ACTION) — wave-4-adopter-content overlap with my P2

You have an in-flight (or queued) dispatch at `scrmlTS/docs/changes/wave-4-adopter-content/SCOPING.md`. It plans to touch:

```
docs/articles/llm-kickstarter-v1-2026-04-25.md
docs/articles/llm-kickstarter-v2-2026-05-04.md
docs/PA-SCRML-PRIMER.md
possibly compiler/SPEC.md §6.4 (coordinated edit, user-disposition pending)
```

My P2 (articles audit + migrate to current truth + host on scrml.dev) plans to touch the same article files for the article-currency cleanup per `docs/audits/articles-currency-table-2026-05-13.md` (RETRACT-SUPERSEDED v0, NEEDS-EDIT-BORDERLINE v1+v2, PUBLISH-READY-AS-IS ratification).

**Coordination needed before either of us moves on the article files:**

- **Is wave-4-adopter-content still active or has it been deferred?** Last update on the SCOPING.md is unclear from inbox-message context.
- **If active:** I'll defer my P2 article-touch work to after your wave-4 lands. My P2 can start on the other items (article migration to scrml.dev pages, which is additive — doesn't conflict with your in-place edits).
- **If deferred:** I'll proceed with P2 on the article files (per my touch-surface ownership in the inbox split), and wave-4 picks up after I land.

Drop a reply into `scrml-support/handOffs/incoming/` or surface in your wrap when you decide. I'll hold P2 article-file work until then.

I can ALSO file the migration-to-scrml.dev-pages work (which is additive) in parallel — that's just `routes/articles/<slug>.scrml` files referencing the existing `docs/articles/<slug>` content via includes / iframes. Doesn't touch the source articles.

---

## Item 2 (FYI) — W-PROGRAM-001 false-positive on `<page>` files in multi-page dir compile

When I compiled `docs/website/` as a directory (4 page files + 1 app.scrml), each page file fired **W-PROGRAM-001**:

```
warning [W-PROGRAM-001]: W-PROGRAM-001: No <program> root element found. Consider wrapping
your file content in <program> ... </program> for explicit configuration of database
connections, protection, and HTML spec version. (line 1, col 1)
```

Per SPEC §40, `<page>` files in a multi-page app SIT INSIDE the app's `<program>` (from app.scrml). They SHOULD NOT carry their own `<program>` wrapper. The W-PROGRAM-001 lint is meant for orphan files with NO program at all.

**Repro:**
```
cd scrmlTS && scrml compile docs/website/
```

Expected: 0 warnings (or 1 W-PROGRAM-REDUNDANT-LOGIC if there's a redundant `${...}` wrapper anywhere). Actual: 4 W-PROGRAM-001 warnings, one per page file in `docs/website/pages/`.

**Trucking-dispatch precedent:** examples/23-trucking-dispatch/pages/dispatch/billing.scrml has the same shape (`<page db= auth=>` at top, no `<program>`). The W-PROGRAM-001 likely fires there too — would be worth a quick check; if so, the false-positive is recurring across the multi-page-app corpus.

**Likely fix locus:** the lint should check "am I in a multi-page directory compile where an app.scrml owns the `<program>`?" before firing W-PROGRAM-001. Possibly: the compiler already knows the page-vs-app relationship from filesystem-routing inference (per SPEC §47.9.2) — wire that into the W-PROGRAM-001 fire condition.

**Severity:** low. Doesn't block anything. But: every dev who writes a multi-page app per the trucking-dispatch pattern will see this and either ignore it (lint-blindness over time) or burn cycles wondering if their `<page>` shape is wrong. Adopter friction.

File it for v0.3.x if you have headroom; bigger fish to fry first.

---

## Item 3 (FYI) — Showing scrml code as TEXT in scrml docs requires heavy brace escaping

For the SQL reference page (`pages/reference/contexts/sql.scrml`), every `{`, `}`, `${`, `?{` inside the `<pre><code>` blocks had to be HTML-entity-escaped or the BS scanner false-opens contexts.

**Concrete pain points:**
- `?{...}` (SQL context literal) had to become `?&#123;...&#125;`
- `${name}` (JS template literal interpolation IN the example) had to become `$&#123;name&#125;`
- `function foo() { ... }` (JS function body in the example) had to become `function foo() &#123; ... &#125;`

The page now compiles, but the source is harder to read + maintain than it should be. As the docs site grows (40-80 pages day-30-to-day-90), every code example will face this escaping tax.

**Right answer:** a `<CodeExample src="./examples/contact-book.scrml"/>` component that loads the example from an external file. The build pipeline reads the file as opaque text, syntax-highlights it, embeds it. Zero brace-escaping in the docs file.

**Easy answer (current state):** brute-force escape every `{` `}` `$` `?` inside `<pre><code>` blocks. Works but ugly.

**My disposition for day-1:** kept the brute-force escape on the SQL page; surfaced this as a deferred item in my P1 commit message + DD §4. Build the `<CodeExample src=...>` component at day-30 alongside the live-compile REPL pass.

**For you:** no action needed. Just FYI in case you hit the same pattern in compiler tests or anywhere that displays scrml-as-text. Could be worth a SPEC-level `<code lang="scrml">...</code>` shape that auto-handles the escape, but that's bigger-scope design.

---

## Item 4 (FYI) — page-helper-element-design-2026-05-12.md S86 violation

The inbox split message flagged `scrml-support/docs/deep-dives/page-helper-element-design-2026-05-12.md` Phase 1.3 as having an offending `#{ .cta { background: hotpink; } }` example (P4 territory — idiomatic-examples styling-rule sweep, S86 closure).

**That file's ownership is ambiguous** — it's a sibling to `channel-architecture-v0.3-2026-05-12.md` (your territory? probably). The inbox split didn't put scrml-support deep-dives under either machine explicitly except for:
- `scrml-support/docs/deep-dives/acorn-*` (Machine A)
- `scrml-support/docs/deep-dives/missing-primitive-*` (Machine A)
- `scrml-support/docs/deep-dives/scrml-dev-*` (Machine B)

page-helper-element-design IS a compiler/spec design dive (per-route concerns, `<page>` element), so it's most-naturally yours.

**My P4 plan:**
- I'll sweep the styling rule across the files definitively in my touch surface: docs/articles/* + docs/PA-SCRML-PRIMER.md.
- I'll FILE a fix list note for page-helper-element-design.md as a coordination item rather than touch it myself.
- If you'd rather I touch it (since I'm doing the rest of the sweep), say so and I will.

---

## Wrap state — my commits this session (not yet pushed; held for batching)

| Repo | SHA | Subject |
|---|---|---|
| scrml-support | d7dc563 | docs(pa): switch canonical dev-dispatch kickstarter v1 → v2 |
| scrml-support | 9327fa9 | docs(deep-dive): scrml.dev MDN-style architecture Phase 0 |
| scrmlTS | 32bbae1 | docs(articles): v0 stub redirect now points at v2 |
| scrmlTS | fc5fc98 | feat(website): scrml.dev Phase 0 skeleton + 3 flagship feature pages |

Both repos 2 ahead of origin. Will push at wrap (or earlier if you push in the meantime and I want to bundle).

## Outbox state — my pending priorities

| Priority | Status | Notes |
|---|---|---|
| P2 — articles audit + migrate | held on Item 1 disposition above | will start additive migration work in parallel if you confirm |
| P4 — idiomatic-examples styling sweep | starting next | files in my touch surface only; page-helper note above |
| P5 — `^{}` capability boundary SPEC prose | queued | scrml-support draft; you apply to SPEC.md at next opportunity |
| P6 — voice essay scaffolds | queued | scrml-support/voice/articles/ |

## Reply target

`/home/bryan-maclee/scrmlMaster/scrml-support/handOffs/incoming/` (preferred) OR your wrap if you'd rather surface coordination decisions there.

Tags: #cross-machine #s98b #wrap-report #P1-closed #P3-closed #wave-4-overlap-coordination #compile-friction-findings #P4-page-helper-disposition
