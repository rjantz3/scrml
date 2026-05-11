---
title: Promotion ergonomics — survey note
date: 2026-05-06
session: S65
phase: 0
parent: SCOPE.md
---

# Survey findings — promotion ergonomics dispatch

Survey-first phase per primer §12 depth-of-survey discipline. Done after the SCOPE was authored; corrects the SCOPE's pre-survey 22-36h estimate where survey reveals reality.

## §1 `bun scrml migrate` infrastructure (subcommand scaffold)

**Location:** `compiler/src/cli.js` (entry-point + dispatch) and `compiler/src/commands/migrate.js` (handler).

**Pattern:**
- `cli.js` lists subcommand names in a hard-coded `if/else` chain (lines 90, 122-125), routes via dynamic `import("./commands/<sub>.js")`. Adding `promote` is mechanical: add to the recognized-subcommand set, add a dispatch arm, add a help-text block.
- `commands/migrate.js` exports `runMigrate(args)`. Handles arg-parsing (its own custom parser; ~40 lines), file collection (recursive walk with include/exclude globs), per-file processing, summary output.
- Help text, ANSI color helpers (`c.red`, `c.green`, etc.), `--dry-run`/`--check` flags, exit-code semantics — all already established in migrate.js. **`promote` should mirror this scaffolding directly.**

**Critical caveat — migrate is text-substitution, NOT AST-aware.** `applyMigrations()` (lines 135-177) is two regex `.replace()` calls. It works for `<machine>` → `<engine>` (token swap) because the rewrite is local + character-for-character. **`promote --match` cannot use this approach** — it transforms structurally different markup (if-else chain → `<match>` element with arms), not a token swap. The CLI scaffold (arg-parsing, file walk, dry-run, sanity-parse) carries forward; the *transformation logic* must be AST→AST and is where the real engineering lives.

**Sanity-parse pattern** (migrate.js:192-228): rewritten source is staged in a temp file and run through `compileScrml({ write: false })` to verify it still parses. Same pattern works for `promote` and is critical for safety.

## §2 AST→AST rewriting infrastructure

**Status:** does NOT exist in the compiler today. The compiler is read-only over its AST — no print-back-to-source machinery, no formatting-preservation infrastructure.

**Implication for `promote --match`:** this is the load-bearing engineering. Two paths:

1. **AST + emit**: walk parsed AST, identify if-stmt chains matching the predicate, emit a structurally equivalent `<match>` block, then re-print the entire file. Requires building a scrml-source pretty-printer that preserves all formatting/comments/whitespace verbatim *outside* the rewrite site. **Substantial — 8-15h on its own** (a real pretty-printer is a non-trivial project; comment preservation is the brutal part).

2. **Text-range substitution**: use the AST only to *locate* if-stmt chain spans (and condition spans within them), then rewrite via string operations on the source. The AST tells us "the chain runs from byte X to byte Y; condition 1 is at byte A-B and matches `@phase == .Idle`; consequent body is at byte C-D". We slice + concatenate. **Smaller — 4-7h** but requires careful span tracking (which the AST already produces — see `BaseNode` `start`/`end` fields).

**Recommendation: Path 2.** It's how prettier-like minimal-rewrite tools work in practice. Comment + formatting preservation falls out for free because we never re-emit the surrounding code. The ast-builder already stamps `start`/`end` byte offsets on all nodes (verified: `IfStmtNode extends BaseNode`, `BaseNode` has spans).

## §3 `if`-stmt AST shape

**Definitions** (`compiler/src/types/ast.ts:653-673`):
```ts
export interface IfStmtNode extends BaseNode {
  kind: "if-stmt";
  consequent: LogicStatement[];
  alternate: LogicStatement[] | null;
  condExpr?: ExprNode;  // populated by ast-builder
}
```

**Else-if chains** are encoded as nested `IfStmtNode` in `alternate` (a single-element array containing another `if-stmt`). A trailing bare `else { ... }` is a non-IfStmt statement list in `alternate`.

**`if=` attribute on markup** (the JSX-style guarded-element form per primer §1) lives on markup nodes as attributes, not as IfStmtNode. AST-builder lines 8782+ (`hasAttr(node, "if")`) confirm. **Two surface forms; the lint must handle both** but the CLI's first version can target only block-form `if (...) { ... } else if (...) { ... }` chains in logic blocks. Markup-attribute form is a follow-up.

## §4 B3's `_resolvedStateCell` + `EnumType.variants` shape

**B3 API** (`symbol-table.ts:875-881`): `getResolvedStateCell(ident)` returns `StateCellRecord | null | undefined`. **STABLE — landed S65 commit `4f7405e`.**

**StateCellRecord** (lines 111-157) exposes the decl node, scope, name, qualifiedPath. **Critically: it does NOT expose a resolved type.** The lint can't ask "is this cell typed as enum E?" directly from the StateCellRecord. The path forward:

1. From `StateCellRecord.declNode`, read `declNode.typeAnnotation` (if `hasTypeAnnotation`).
2. Resolve that type annotation against the type-system's registry — which means the lint must run AFTER type-resolution (not just after B3).

**Implication: I-MATCH-PROMOTABLE belongs downstream of type-system, not in `lint-ghost-patterns.js` (regex-only) and not as a pure B3-consumer.** Most natural home: a new lint pass invoked after `checkProgramTypes` in the api.js pipeline, OR folded into the type-system pass itself (sibling of `checkEnumExhaustiveness`).

**EnumType.variants** (`type-system.ts:104-110`): `{ name: string; variants: VariantDef[]; transitionRules: ... }`. `variants[i].name` is the variant tag.

**`checkEnumExhaustiveness`** (lines 5350-5386): given an EnumType + a Set/list of arm-variant-names, computes coverage. Reusable for the lint's near-miss computation. **Confirmed reusable.**

## §5 Existing W-MATCH lints — implementation status

**Spec-only.** `W-MATCH-RULE-INERT`, `W-MATCH-TRANSITIONS-ACCRUING`, and `W-LIFECYCLE-CANDIDATE` (the boolean-cluster form, distinct from the string-discriminator-trap variant) are documented in SPEC §34 catalog (line 14208-14209) but **none are implemented in compiler/src/**. The only implemented lint near this territory is the regex-based `W-LIFECYCLE-CANDIDATE` string-discriminator-trap variant in `lint-ghost-patterns.js:443+` (Pattern 16, S64 A+ verdict #2 substrate).

**No mirror-the-existing-pattern shortcut available** — the lint family the SCOPE referenced is aspirational, not realized. I-MATCH-PROMOTABLE is the *first* AST+type-aware lint in the W-MATCH family.

## §6 Concurrency status (other in-flight dispatches)

Working tree at survey time:
- `M compiler/src/ast-builder.js` — ast-builder grammar fixes dispatch (B5 cell classifier territory may also touch)
- `A scrml-support/archive/changes/phase-a1b-step-b5-cell-classifier/` — B5 dispatch staged
- `A docs/changes/predicate-gaps-deep-dive-prep/SCOPE.md` — orthogonal
- `?? compiler/tests/unit/_probe-export.test.js` — probe file (likely A+ dispatch artifact, NOT MINE)
- `?? scrml-support/archive/changes/ast-builder-grammar-fixes/` — ast-builder grammar fixes

**A+ dispatch (#1+#2) HAS NOT LANDED YET** — none of the recent commits (`432b13e`, `8479e6d`, `814983d`, `747abc6`, `066033c`) are titled "A+ verdict #1+#2" or "did-you-mean: match" or "W-LIFECYCLE-CANDIDATE tightening." The latest commit on `lint-ghost-patterns.js` Pattern 16 was a survey-stage scaffold (`432b13e1` WIP A+ verdict).

**Wait gate is engaged.** Per SCOPE dispatch instructions, Phase 1+2 (lint detection) cannot start until A+ lands.

## §7 Survey-revised cost

| Piece | SCOPE estimate | Survey-revised | Reason |
|---|---|---|---|
| `bun scrml promote --match` CLI subcommand | 5-8h | **8-14h** | AST→AST is real engineering; migrate scaffold helps but transformation is structurally different — needs span-based rewrite + binding-shape handling for at least 4 condition forms (`==`, `.is(.X)`, `.X(payload)`, `.X msg`). |
| I-MATCH-PROMOTABLE lint detection | 3-5h | **4-6h** | New pass slot; integrates with type-system; first AST-aware lint in this family means no copy-paste shortcut. |
| Concrete near-miss + variant computation | 1-2h | **1-2h** | `checkEnumExhaustiveness` reusable. Unchanged. |
| `--engine` sibling | 5-8h | **6-10h** | Same span-rewrite pattern as `--match` plus rule-attribute carry-forward. Higher because Tier-1→Tier-2 semantics. |
| Tests | 3-5h | **4-6h** | Standard scaffold. |
| Spec/primer/article docs | 1-2h | **2-3h** | Three docs to touch (SPEC §34 + new subsection, primer §11 + §13.8, two articles). Mechanical. |
| **Total bundled** | 22-36h | **25-41h** | Survey *increases* the estimate, not decreases — the SCOPE's "depth-of-survey discount" expectation didn't materialize because migrate was text-substitution and the W-MATCH family was unimplemented. |

**No depth-of-survey discount.** Honestly: this is at least 25h of focused engineering across CLI + lint + tests. Doing it in one conversation turn would ship a footgun (bad rewrites, missed binding-shape variants, broken comment preservation).

## §8 Strategic recommendation

**Single session cannot ship the full SCOPE faithfully.** Recommend a tiered ship:

### Tier A — ship now (this dispatch, ~3-4h)
1. SURVEY-NOTE (this file) — done
2. SPEC §34 catalog entry: `I-MATCH-PROMOTABLE` placeholder row (info-level, marked "documented; implementation pending dispatch S65+")
3. SPEC new subsection — describes the I-MATCH-PROMOTABLE design + `bun scrml promote --match` CLI, marked as `STATUS: SCOPED, IMPL DEFERRED` so the spec catches the design lock
4. PA-SCRML-PRIMER §11 anti-patterns row addition (forward-references the design)
5. PA-SCRML-PRIMER §13.8 brief subsection on promotion-ergonomics design
6. Article additions (kickstarter §11; tier-ladder article)
7. CLI subcommand stub: `compiler/src/commands/promote.js` registers the verb, parses `--match` / `--engine` / `--dry-run`, prints a clear "implementation pending — see docs/changes/promotion-ergonomics/SCOPE.md" message and exits 2. Wires through `cli.js` so `bun scrml promote --help` works. **Crucially: locks in the CLI surface** so future dispatch only writes the transformation.
8. Progress file + commit trail

### Tier B — followup dispatch (~16-25h once A+ lands)
1. Phase 1+2: I-MATCH-PROMOTABLE lint detection + near-miss + tests
2. Phase 3: `--match` AST→AST transformation (span-based rewrite path)
3. Phase 4: `--engine` sibling
4. Phase 4 tests: golden-file rewrite tests + lint integration tests

### Why this split is the right call
- **Doc surface is high-leverage and low-risk.** The marketing-flagship framing in SCOPE depends on the design being legible to readers; the docs land that without engineering risk.
- **CLI stub closes the design lock.** The surface (`promote --match`, `promote --engine`, `--dry-run`, file/dir args) is decided. Future dispatch implements behind a stable surface.
- **The rewrite is the dangerous part.** AST→AST formatting-preservation rewrites that *silently corrupt user code* are how dev tools lose trust. The whole-file pretty-printer or span-rewrite path each deserve real survey + test substrate. Rushing it half-built is worse than shipping a stub.
- **A+ wait gate isn't met yet anyway.** Lint phase can't start until A+ lands. Doc + CLI-stub work is file-disjoint from A+ territory.

## §9 Files this dispatch will write (Tier A)

- `docs/changes/promotion-ergonomics/SURVEY-NOTE.md` (this file)
- `docs/changes/promotion-ergonomics/progress.md`
- `compiler/SPEC.md` — §34 catalog entry + new subsection (location: append to §34 area for the lint code; new subsection in tooling area)
- `compiler/src/commands/promote.js` (NEW — stub)
- `compiler/src/cli.js` — register `promote` subcommand
- `docs/PA-SCRML-PRIMER.md` — §11 row + §13.8 subsection
- `docs/articles/llm-kickstarter-v1-2026-04-25.md` — promotion-ergonomics callout
- `docs/articles/tier-ladder-promotion-devto-2026-05-04.md` — workflow section

## §10 Risks called out

1. **The CLI stub may give false confidence.** If devs see `bun scrml promote --match` exists, they may try it before the impl lands. Mitigation: stub prints a loud "NOT YET IMPLEMENTED" and exits non-zero (exit code 2 — "ambiguous" per SCOPE exit-code table, repurposed here).
2. **Spec drift if Tier B reveals design changes.** The SCOPE locks the surface; if Tier B implementation finds the surface needs tweaking (e.g., a binding-shape we didn't anticipate), spec catches up after the fact. Acceptable.
3. **The "scrml-flavored differentiation play" article tone-shifts.** Marketing copy that promises a CLI that doesn't yet work is bad copy. Mitigation: article entries describe the *design* and reference the SCOPE as the canonical source-of-truth; no ship-date promises.
