# s89-null-spec-A progress

## 2026-05-13 — startup

Verified worktree + ran `bun install` + `bun run pretest` (12 samples compiled).

Maps consulted: primary.map.md, error.map.md, domain.map.md.

Load-bearing finding from domain.map.md line 85:
> "`null` / `undefined` are NOT valid scrml tokens in any context (SPEC §42,
> E-SYNTAX-042). The only non-presence value is `not`."

Canonical home for the no-null rule: SPEC §42 ("`not` — The Unified Absence
Value", lines 18219+). The task brief referenced §13.1 — that section is the
"Async Model > Developer-Visible Syntax". The canonical rule already lives at
§42; the amendment will sharpen the wording there and register
W-NULL-IN-SCRML-SOURCE in §34.

## Inventory pass

`grep -n "\bnull\b" compiler/SPEC.md` → 112 hits.

Classification:

**MIGRATE (scrml-syntax / scrml-prose describing scrml-visible value):**
- L4832, L4834: `<startTime default=null>` / `<token default=null>` — scrml-attr
  scrml-syntax position.
- L5573, L5579: §8.4 prose "category may be null" / "When `category` is `null`"
  describing a scrml parameter value flowing into SQL — the scrml variable's
  absence is `not`. SQL `IS NULL` in template strings is SQL (leave).
- L6774, L6775: scrml type-annotation `(null -> string)` / `(!null && !number)`
  in §14.3 type bodies — scrml-syntax.
- L7260: §14.9 snippet table "Evaluates to `null` when caller provides no value"
  — scrml-visible value description.
- L7264, L7268, L7271: "null guard" / "non-null-check position" prose in §14.9
  table — scrml absence-check wording.
- L7499, L7539: §15.10 prose "has value `null` when omitted" / "inside the body
  it is `null`" — scrml-visible value.
- L7587: §15.10.1 prose "as the null-literal expression (`null`)" — describes
  compiler substitution of prop into AST; should mention `not` literal.
- L8033: §15.11 worked-example heading "with null guard".
- L8581, L8584: §16.7 error table "null-check position" / "null guard".
- L8654: §16.8 worked-example heading "without null guard".
- L11916: App.D "null/empty outside" — scrml value description.
- L22072: §51.0.N "history cell is empty / null" — scrml cell prose.
- L23508, L23545, L23546, L23570, L23613: §51.11 audit-entry shape (visible to
  scrml as `@auditLog[i].label`).
- L24449, L24487, L24611, L24648: scrml-code examples inside `<program>` blocks.
- L24898: §52 prose "`getCurrentUser()` returns null" — scrml-visible value.
- L26331, L26332: §55.1 universal-core predicate table "null/undefined fail" —
  scrml predicate semantics.
- L26694: §55.12 "empty / null cell" — scrml cell prose.
- L20725, L20795, L20866, L20882, L20930, L21041, L21053, L21126, L21172: §50
  scrml-code examples `!== null` — migrate to scrml-canonical presence/absence
  forms (`is not not` / `is some`).

**LEAVE (JS-host interop / JS-host runtime / SQL DDL / explicit JS-contrast):**
- L16, L41: front-matter status changelog (historical reference).
- L1613: codegen prose "null or undefined result" describing JS arg arrival.
- L5569, L5586, L5593-5596, L5601-: §8.4 SQL `IS NULL` SQL keyword.
- L6451: §12.5 "serializes as `null`" — codegen description.
- L6966: §14.4 "In generated JS, `not` compiles to `null`" — codegen.
- L8377: TypeScript-style internal compiler type annotation.
- L13075: §22 meta API "not JavaScript `null`/`undefined`" — explicit contrast.
- L14716, L14814, L14819: §34 catalog rows describing the rejection of `null`.
- L16754, L16769-16778, L16831, L16872+, L16880, L16930, L16959: §38/§39 SQL
  DDL `not null` SQL-mirror vocabulary.
- L18198, L18221, L18225, L18348, L18350, L18372, L18376, L18398, L18414-18418,
  L18424, L18428, L18437-18456, L18465, L18469, L18473-18478, L18486: §42
  itself — canonical rule + explicit JS-contrast + JS-host runtime + reject
  list.
- L20716: §50 prose "compiler's `ast-builder.js`" — JS source reference.
- L22394: `pass null for idleEntry` — runtime ABI to compiler-emitted JS.
- L23272: emit-machines JS codegen sample.
- L23955: `_scrml_machine_try` runtime helper ABI.
- L26415, L26422: schema-column SQL-mirror `not null` (canonical SQL DDL).

## Plan

1. Commit A: SPEC §6.8 `default=not` + scrml-syntax / scrml-prose `null`
   migration across the file (single sweeping commit per task brief).
2. Commit B: §34 W-NULL-IN-SCRML-SOURCE catalog row.
3. Commit C: §42.1 canonical-rule explicit amendment + W-NULL-IN-SCRML-SOURCE
   cross-ref to §6.8 / §34.
4. Commit D: SPEC-INDEX refresh (§6.8 / §34 / §42 line ranges).

## 2026-05-13 — Commit A landed (4ca4118)

24 scrml-syntax `null` sites migrated. Tests: 11170 pass / 88 skip / 0 fail.
Pre-commit gate fired and passed.

## 2026-05-13 — Commit B landed (9bf56eb)

W-NULL-IN-SCRML-SOURCE catalog row added at §34, immediately after
W-PROGRAM-SPA-INFERRED (the precedent v0.3 info-level lint). Severity: Info.
Row cross-refs §42.1 (canonical rule), §42.7 (hard-error reject list), §6.8.1
(default=not), §42.9 (interop boundary), and E-SYNTAX-042 (hard-error pair).
Explicitly excludes JS-host interop contexts from triggering the lint.

## 2026-05-13 — Commit C landed (07ce052)

§42.1 Overview reworked: adds S89 user-voice quote, articulates the canonical
rule in strongest terms, names the W-NULL-IN-SCRML-SOURCE info lint as the
regression-guard companion to E-SYNTAX-042, and enumerates the JS-host /
SQL-DDL / wire-format / runtime ABI exclusion list. §42.6 table gains the
W-NULL-IN-SCRML-SOURCE row. §42.7 normative statements gain two new bullets:
(1) `default=not` is the canonical attribute-default absence form;
(2) compilers SHALL emit W-NULL-IN-SCRML-SOURCE on detected source-position
null/undefined excluding the enumerated interop contexts.

## 2026-05-13 — Commit D in progress

SPEC-INDEX refresh:
- `scripts/regen-spec-index.ts` run — all 62 row line-ranges refreshed.
- "Last updated" line replaced with S89 entry.
- Substantive landings list +1 entry (S89 — null eradication summary).
- "Total lines" updated to 27,003.
- §6 / §34 / §42 row summaries appended with S89 amendment notes.
- Quick Lookup: line-numbers refreshed for §42 / §42.2.4, +1 entry for
  W-NULL-IN-SCRML-SOURCE, +1 entry for `default=not`.

## Final inventory

Total scrml-syntax / scrml-prose `null` migrations: 24 sites + 9 in §50.
Total scrml-syntax / scrml-prose sites: 33.
JS-host-interop / SQL-DDL / wire-format / runtime-ABI / §42-self sites
preserved: 79 occurrences across SPEC.md.

Tests: 11170 pass / 88 skip / 1 todo / 0 fail (zero regressions).


