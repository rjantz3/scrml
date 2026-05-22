---
status: current
last-reviewed: 2026-05-22
supersedes-portions-of: phase5-triage-2026-05-22.md (post-S120 root-cause shifts)
---

# M5 C2 Gap-Ledger — Phase-5 RE-triage (S121, post-S120 nine-unit wave)

**Date:** 2026-05-22 (S121 OPEN)
**HEAD:** `a8904945` (S120 wrap)
**Scope:** read-only diagnostic. Re-derives the residual-16 root causes against
current source after the S120 P5 wave closed 36 files (gap 51 → 16, including
+1 unmasked `GAP-native-extra-block`). Live triage-scan was re-run; per-file
detail captured below.

This supersedes the unit-decomposition + several root-cause hypotheses of
`phase5-triage-2026-05-22.md` — that doc was authored pre-S120 and recorded
hypotheses that were ~50% corrected at S120 fix-time (P5-1, P5-3, P5-4, P5-10,
P5-11 all surfaced corrections). Per the §13.7 PRIMER "triage diagnosis drift"
pattern, re-triage was the right next step before Wave 4 dispatch.

---

## 1. Live histogram (HEAD `a8904945`)

```
EXACT                    953
DEFERRAL-test-block       21
LIVE-DEGENERATE           10
DIFF-deep-seq              7
DIFF-hoist-count           4
DIFF-top-seq               2
GAP-native-extra-block     1
GAP-mixed                  1
GAP-state-block            1
```

**Strict-pass = 953 + 21 + 10 = 984/1000 (98.4%).**
**Residual gap = 7 + 4 + 2 + 1 + 1 + 1 = 16.**

(15 hand-off-cited residual + 1 `GAP-native-extra-block` unmasked by P5-13 of
a pre-existing native-extra-markup divergence in `zig-buildconfig`.)

---

## 2. Per-file detail + root-cause sub-bucket

### 2.1 `DIFF-deep-seq` (7)

All seven are "one node has different kind at the diverging index" — same
length / same kind-set / one position diverges. The cause is body-mode /
sub-context recognition heuristics that disagree on a single node.

| File | Diverging-index detail | Sub-bucket | Wave |
|---|---|---|---|
| `examples/23-trucking-dispatch/pages/driver/profile.scrml` | i=63 live=text native=logic; Llen=Nlen=186 | **D-interp** (logic-over-text) | **P5-6** |
| `examples/23-trucking-dispatch/pages/driver/messages.scrml` | i=77 live=text native=logic; Llen=Nlen=127 | **D-interp** | **P5-6** |
| `examples/23-trucking-dispatch/pages/customer/profile.scrml` | i=75 live=text native=logic; Llen=Nlen=203 | **D-interp** | **P5-6** |
| `samples/compilation-tests/postgres-program-driver.scrml` | i=25 live=text native=sql; Llen=26 Nlen=28 | **D-sql** (sql-over-text) | **P5-6** |
| `samples/compilation-tests/gauntlet-s19-phase3-operators/phase3-is-in-when-guard-093.scrml` | i=5 live=text native=markup; Llen=10 Nlen=9 | **D-interp-markup** (markup-over-text) | **P5-6** |
| `samples/compilation-tests/match-002-block-form-arm-swap.scrml` | i=14 live=match-block native=markup; Llen=17 Nlen=33 | **D-match** | **P5-7** |
| `samples/compilation-tests/gauntlet-r10-bun-admin.scrml` | i=38 live=markup native=comment; Llen=480 Nlen=544 | **D-bun-admin** (P5-12-surfaced `< p`/`< db` phantom-opener) | **P5-12b** |

**Common shape (P5-6 — 5 files):** at one node, native enters a sub-context
(`logic`/`sql`/`markup`) where live keeps the surrounding `text` node. Lengths
are identical (or near-identical), so this is a classification difference at
one node, NOT structural over-segmentation. Plausible loci: `parse-markup.js`
text-context heuristic that decides whether a `${...}` / `?{...}` / `<...>`
opens a sub-context vs. is part of the surrounding text.

**D-match (1 file):** native lacks `<match>` block-form recognition (parse
flat-as-markup); deferred to **P5-7** (own assembler-pass-class unit).

**D-bun-admin (1 file):** the `< p` phantom-opener — `parse-markup.js`
`isStateTagBoundaryAfterLt` heuristic admits `< tag` (space after `<`) where
live treats it as comment / text. Deferred to **P5-12b**.

### 2.2 `DIFF-hoist-count` (4)

| File | Hoist diff | Sub-bucket | Wave |
|---|---|---|---|
| `samples/compilation-tests/gauntlet-s19-phase1-decls/phase1-type-vs-const-annotation-012.scrml` | `typeDecls live=1 native=0` | **H-type-in-logic-body** (likely P5-9 over-narrowing for `${}` body case) | **Wave 5 (investigation)** |
| `compiler/self-host/bs.scrml` | `typeDecls live=0 native=1` | **H-bs-tail** (P5-10 verified `collect-hoisted.js` clean; cause elsewhere — `parse-markup.js`?) | **Wave 5 (investigation)** |
| `stdlib/auth/jwt.scrml` | `exports live=1 native=4` | **P5-C canary** (live oracle wrong — native is correct) | **P5-C (last unit)** |
| `compiler/self-host/cg.scrml` | `imports live=5 native=0` | **P5-C canary** (live oracle wrong) | **P5-C (last unit)** |

**H-type-in-logic-body** is a candidate P5-9 regression. The file:

```
${
    const limit: number = 5
    type bound:number = 5
}
```

Live records `typeDecls=1` (it lifts `type bound:number = 5` out as a typeDecl
even though it's inside `${}` and likely illegal at a deeper level). Native
records 0. P5-11 added structural state-decl recognition in `${}` bodies; the
parallel `type`-decl recognition was not added. **Action:** Wave 5 unit
extending P5-11 to also pick up `type` decls inside `${}` bodies; OR a P5-9
correction if `type`-as-statement-lead in `${}` was over-restricted.

**H-bs-tail** — `parse-markup.scrml`-style root cause. P5-10 verified
`collect-hoisted.js` has no defect. Native sees 1 typeDecl where live sees 0.
Different shape than H-type-in-logic-body (native produces extra, live has
zero). Wave 5 investigation.

### 2.3 `DIFF-top-seq` (2)

Both are "native missing the trailing `text` node after the last markup
element." Same family as `GAP-mixed` below — `closeTagFrame` no-pop on
mismatched closer.

| File | Top-seq diff | Wave |
|---|---|---|
| `samples/compilation-tests/gauntlet-s19-phase4-markup/phase4-void-with-content-014.scrml` | live=[c,c,markup,text,text] native=[c,c,markup,text] (native short one trailing text) | **P5-14** |
| `samples/compilation-tests/gauntlet-s19-phase4-markup/phase4-for-markup-044.scrml` | live=[c,markup,text,text] native=[c,markup,text] | **P5-14** |

### 2.4 `GAP-mixed` (1)

Same family as DIFF-top-seq:

| File | Detail | Wave |
|---|---|---|
| `samples/compilation-tests/gauntlet-s19-phase4-markup/phase4-tag-mismatched-closer-007.scrml` | live-only-kinds=[text]; live=[c,markup,text] native=[c,markup] (native dropped trailing text after mismatched closer) | **P5-14** |

**P5-14 unit summary:** `tag-frame.js` `closeTagFrame` does not pop the frame
when the closer is mismatched / unbalanced (P5-12 closed the abort-on-
unbalanced-closer scan; P5-14 closes the no-pop sibling defect). Single locus.
3 files closed.

### 2.5 `GAP-native-extra-block` (1)

| File | Detail | Wave |
|---|---|---|
| `samples/gauntlet-r11-zig-buildconfig.scrml` | native has extra `markup` block at end; `typeDecls live=0 native=4`; hasProgramRoot live=false native=true | **Wave 5 (investigation; possibly P5-C-class)** |

Pre-existing native-extra-markup divergence unmasked by P5-13 — the brace-in-
string scanner degradation was previously hiding it. Hand-off classifies this
as not-a-regression. The 4 spurious typeDecls suggest a tokenization issue;
investigate at Wave 5.

### 2.6 `GAP-state-block` (1)

| File | Detail | Wave |
|---|---|---|
| `samples/quiz-app.scrml` | live-only-kinds=[state] native-only-kinds=[logic]; deepDiv i=35 | **NOT a parser fix — corpus-stale** |

Corpus uses `</>` at lines 60 + 148 as a JavaScript-division operator
(`x </>  y`); both parser pipelines choke. Trivial corpus edit (`</>` → `/`).
M6-prep corpus sweep work, not Wave 5 parser unit.

---

## 3. Wave 4 dispatch — composition

**Two units, parallel-dispatchable (different files).**

| Unit | Locus | Files closed | Est | Parallel-safe |
|---|---|---|---|---|
| **P5-14** | `compiler/native-parser/tag-frame.js` `closeTagFrame` | 3 (`phase4-void-with-content-014`, `phase4-for-markup-044`, `phase4-tag-mismatched-closer-007`) | 2–4h | ✓ |
| **P5-6** | `compiler/native-parser/parse-markup.js` body-mode classification heuristic (likely the `${...}` / `?{...}` / `<...>` boundary detection inside `text`-context bodies) | 5 (3× trucking-dispatch + `postgres-program-driver` + `phase3-is-in-when-guard-093`) | 4–6h | ✓ |

**After Wave 4 lands:** gap 16 → 8.

The residual 8 break down as:
- 2 P5-C canaries (jwt.scrml + cg.scrml) — not parser bugs
- 1 `< p` phantom-opener (r10-bun-admin) — **P5-12b**
- 1 `<match>` block-form (match-002) — **P5-7** (heavy)
- 1 H-type-in-logic-body (phase1-012) — Wave 5 investigation
- 1 H-bs-tail (bs.scrml) — Wave 5 investigation
- 1 zig-buildconfig — Wave 5 (possibly P5-C class)
- 1 quiz-app — corpus edit, not parser

Wave 5 plan: P5-7 (match block-form) + P5-12b + the three Wave-5-investigation
units, optionally bundled. P5-C as last unit.

---

## 4. Methodology notes

- **Re-triage shift since pre-S120 triage:** 5 of 9 S120 agents reported
  partial root-cause corrections at fix-time (the §13.7 pattern). The
  pre-S120 unit-decomposition (P5-1..P5-13) still mostly mapped, but several
  §2 root-cause hypotheses were corrected. This re-triage doc is the post-
  S120-correction snapshot.
- **P5-6 family unification:** five DIFF-deep-seq files previously slotted as
  D-interp 3 + D-sql 1 + D-match 1 + something residual now fold into one
  P5-6 unit because they share the shape "native enters sub-context where
  live keeps text" at one node, same length. **The dispatched agent will
  identify whether it's one heuristic or up to three; if separate, the agent
  splits the fix at survey-time per the depth-of-survey-discount pattern.**
- **P5-12b separated from P5-6** because the r10-bun-admin diff has Llen ≠
  Nlen (480 vs 544) — different shape than the other deep-seq files. P5-6's
  fix is unlikely to close it.

---

## Tags
#s121 #m5-c2-gap-ledger #retriage #post-s120 #wave-4-composed
#p5-14-tag-frame-no-pop #p5-6-body-mode-classification
