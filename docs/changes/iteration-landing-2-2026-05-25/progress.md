# Iteration Landing 2 — SPEC amendment for `<each>` — progress log

Append-only timestamped record per S83 commit discipline.

## 2026-05-25 — dispatch start

- WORKTREE_PATH: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a8315841332647958
- Branch: main (worktree-local)
- Brief: SPEC amendment authoring (doc-only) for the `<each>` iteration surface shipped at S131 commit 23db318c (Landing 1, compiler-source impl).
- Scope: NEW §17.7 "Iteration (`<each>`)" + §17.4 Tier-0 amendments + §56 `--each` CLI extension + §3.4 `@.` row. NO §34 row additions (already added Landing 1). NO compiler-source changes.

### Pre-reads consulted

- `.claude/maps/primary.map.md` — informational; routing for Spec amendment points to domain.map.md; not load-bearing for SPEC text authoring.
- `docs/heads-up/iteration-design-2026-05-25.md` — full, authoritative; all 8 HU-1 questions ratified; canonical 4-shape surface + `@.` semantic + `<empty>` + `key=` inference per Q5(d).
- `compiler/SPEC-INDEX.md` — section/line map.
- `docs/PA-SCRML-PRIMER.md` — §3 V5-strict access; §6.2 match block-form precedent; Tier ladder framing.
- `compiler/SPEC.md` §17 (lines 9058-9978), §4.14 (lines 949-1013), §3.4 (lines 264-286), §51.0.I (lines 23668-23695), §18.0.1 (lines 10034-10180), §56 (lines 28861-29040).
- `compiler/src/codegen/emit-each.ts` — Landing 1 codegen. AST shape: kind="each-block" + iterShape "in"|"of"|null + inExprRaw/ofExprRaw/asName/keyExprRaw/templateChildren/emptyChild. `@.` rewrite is contextual sigil → iter var. `key=__index__` is sentinel for positional. Of-form default key = index.
- `compiler/src/ast-builder.js` lines 10960-11217 — `<each>` parser; `as name` is bareword (no `=`); `key=__index__` sentinel; both-shape and neither-shape captured for downstream PASS surface.
- `compiler/src/lint-w-each-promotable.js` + `lint-w-each-key.js` — confirmed code constants W-EACH-PROMOTABLE + W-EACH-KEY-001 fire as catalogued at §34 lines 15870-15871.

### Baseline test state

- `bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance --bail` → 14525 pass / 88 skip / 1 todo / 0 fail / 749 files / 48517 expect() calls.

### Planned sub-buckets (with commit boundaries)

1. NEW §17.7 "Iteration (`<each>`)" subsection with §17.7.1-§17.7.7 sub-subsections.
2. §17.4 amendments — mark as Tier 0; W-EACH-PROMOTABLE forward-ref; cross-ref §17.7.
3. §17.4b key clause — note carries forward as Tier-0 surface; Tier-1 inference at §17.7.5.
4. §56 amendment — `--each` CLI extension (Landing 3 PENDING).
5. §3.4 V5-strict per-locus table — `@.` contextual sigil row.
6. SPEC-INDEX.md Sections-table line range refresh + §17 summary update.

## 2026-05-25 — sub-bucket 1 (NEW §17.7) landed

- Commit `74f7dc6f`: NEW §17.7 "Iteration (`<each>`)" — 7 sub-subsections (~374L).
- Placement: §17.7 inserted between §17.6.8 (if-as-expression close) and the `---` boundary preceding §18.
- Sub-subsections: §17.7.1 Tier-ladder overview; §17.7.2 four canonical shapes + nested example + mixing legality; §17.7.3 `@.` contextual sigil semantic; §17.7.4 `<empty>` sub-element; §17.7.5 `key=` inference + W-EACH-KEY-001 fire conditions + message shape; §17.7.6 §4.14 `:`-shorthand composition (no new mechanism per Q3 RE-RATIFICATION); §17.7.7 cross-references.
- Sources verified against actual S131 impl (`emit-each.ts`, `ast-builder.js`) per pa.md Rule 4.

## 2026-05-25 — sub-buckets 2-4 landed

- Commit `d41ddc97`: §17.4 Tier-0 framing + §17.4b key disposition note + NEW §56.10 `--each` CLI extension + §3.4 V5-strict `@.` row.
- §17.4 header retitled "Iteration — Tier 0 (`${ for/lift }`)"; W-EACH-PROMOTABLE forward-ref + "Promotion to Tier 1" paragraph.
- §56.10 — 10 sub-subsections (~123L) mirroring `--match` / `--engine` patterns; Landing 3 PENDING status documented.
- §3.4 — table row 6 added for `<each>` body scope + `@.` contextual sigil; S130 amendment block argues V5-strict compatibility.

## 2026-05-25 — SPEC-INDEX refresh

- Ran `bun run scripts/regen-spec-index.ts` — all 61 section rows refreshed for line range shifts.
- Updated section summaries for §3 / §17 / §56 to reference new content.
- Masthead `Total lines:` updated 29,124 → 30,045.
- Added growth-history block `>` entry for S131 Landing 2 with full sub-bucket breakdown.

## 2026-05-25 — verification

- Tree clean.
- Post-edit test gate: 14525 pass / 88 skip / 1 todo / 0 fail / 48517 expect() calls / 749 files (UNCHANGED from baseline — pure SPEC; +0 expected per brief).
- All sub-buckets committed.

## SPEC-vs-impl discrepancies surfaced

NONE blocking. Two notes for downstream:

1. The brief named E-EACH-ITER-SHAPE / E-EACH-EMPTY-BODY / E-EACH-EMPTY-DUPLICATE / E-SYNTAX-064 / E-EACH-KEY-SENTINEL as "queued" §34 codes. They are referenced in §17.7 normative statements as `(§34, queued)`. The Landing 1 commit `23db318c` added W-EACH-PROMOTABLE + W-EACH-KEY-001 only; the additional codes are forward-referenced but not yet catalogued. This is consistent with the brief mandate "NO §34 row additions in Landing 2."

2. `compiler/src/codegen/emit-each.ts` line 547 emits a no-op `// each: iter shape unresolved` when neither `in=` nor `of=` is provided, but does NOT fire E-EACH-ITER-SHAPE. The brief intentionally defers the diagnostic-emission wiring; the SPEC text uses `(§34, queued)` everywhere to surface the gap. Landing 1 followup or a future dispatch closes the queued codes.

## SPEC-vs-HU discrepancies surfaced

NONE. The canonical four-shape surface + `@.` sigil + `<empty>` + `key=` inference + `:`-shorthand composition per HU-1 ratifications all map cleanly onto SPEC text. The HU's worked code example `<each of=@daysLeft as day>` was preserved verbatim in §17.7.2 Shape 4.
