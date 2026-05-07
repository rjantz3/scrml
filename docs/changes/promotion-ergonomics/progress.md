# promotion-ergonomics progress

Append-only timestamped log per global agent rules.

---

## 2026-05-06 — dispatch starts

- pwd verified: /home/bryan-maclee/scrmlMaster/scrmlTS
- HEAD: 432b13e1 — at-or-after 8479e6d ✓
- Working tree NOT clean: M ast-builder.js (other dispatch); A docs/changes/phase-a1b-step-b5-cell-classifier; A docs/changes/predicate-gaps-deep-dive-prep; ?? compiler/tests/unit/_probe-export.test.js; ?? docs/changes/ast-builder-grammar-fixes — these belong to other concurrent dispatches; will not touch.

## 2026-05-06 — survey done

- Read SCOPE.md in full.
- Surveyed `bun scrml migrate` infra (cli.js + commands/migrate.js): pattern model for `promote` subcommand. Migrate is regex-based — `promote --match` cannot ride that approach.
- Surveyed AST shapes: IfStmtNode at types/ast.ts:653+; BaseNode has start/end byte offsets. Span-based rewrite is viable.
- Surveyed B3's getResolvedStateCell — stable, returns StateCellRecord. StateCellRecord has declNode but NOT resolved type — lint must run after type-resolution.
- Surveyed type-system.ts: EnumType.variants, checkEnumExhaustiveness — reusable.
- Surveyed lint-ghost-patterns.js: ALL regex-based. Only Pattern 16 (W-LIFECYCLE-CANDIDATE string-trap) lives there. W-MATCH-RULE-INERT and W-MATCH-TRANSITIONS-ACCRUING are spec-only; not implemented. No mirror-the-existing-pattern shortcut.
- Survey-revised cost: 25-41h (UP from SCOPE's 22-36h, no discount). AST→AST is real engineering.

## 2026-05-06 — strategic decision

Single session cannot faithfully ship full SCOPE. Tier A (doc + CLI stub, ~3-4h) shipped now; Tier B (lint + transformation impl) deferred to followup dispatch, gated on A+ #1+#2 landing.

A+ wait gate NOT met — Phase 1+2 deferred regardless.

See SURVEY-NOTE.md §8 for tier-split rationale.

## 2026-05-06 — Tier A in progress

Next steps:
- [x] CLI stub: commands/promote.js + cli.js wiring
- [x] SPEC §34 catalog entry (I-MATCH-PROMOTABLE row)
- [x] SPEC §56 — new normative section (Promotion Ergonomics design lock)
- [x] Primer §11 anti-pattern row + §13.8 subsection
- [x] kickstarter article §6 CLI catalog addition
- [x] tier-ladder article — new "Promotion ergonomics" section before "What this is not"

## 2026-05-06 — concurrency surprise: pre-commit hook blocked

Pre-commit hook runs full bun test suite. Working tree carries uncommitted edits
from FOUR concurrent in-flight dispatches (B5 cell classifier, A+ verdict #1+#2,
ast-builder grammar fixes, predicate-gaps prep). The A+ dispatch's uncommitted
edits to symbol-table.ts/lint-ghost-patterns.js cause meta-checker.scrml self-host
test to fail under the pre-commit hook even though my changes are file-disjoint
and confirmed to pass at clean HEAD (verified by stash).

I cannot bypass --no-verify (per global rules, brief explicit prohibition).
I cannot mv/rename foreign files in the working tree (permission denied).

**Decision:** my changes are written to the working tree as untracked + edits.
PA must commit them after the in-flight dispatches land + working tree is clean.
The split-stash isolation test confirmed my files are clean at HEAD; the failure
is purely from concurrent-dispatch state. Initial WIP commit (survey + progress
scaffold) was attempted but failed pre-commit hook for the same reason.

Files written / edited (Tier A):
- compiler/src/commands/promote.js (NEW — stub with locked CLI surface)
- compiler/src/cli.js (registered promote subcommand)
- compiler/SPEC.md (added I-MATCH-PROMOTABLE row in §34 catalog; added §56)
- docs/PA-SCRML-PRIMER.md (added §11 row; added §13.8 design subsection)
- docs/articles/llm-kickstarter-v1-2026-04-25.md (extended §6 CLI catalog)
- docs/articles/tier-ladder-promotion-devto-2026-05-04.md (new section)
- docs/changes/promotion-ergonomics/SURVEY-NOTE.md (NEW)
- docs/changes/promotion-ergonomics/progress.md (NEW — this file)

## 2026-05-06 — dispatch verdict + handoff state

Tier A: SHIPPED to working tree (pending commit).
Tier B: deferred to followup dispatch — gated on A+ #1+#2 landing + working
tree clean. SCOPE/SURVEY-NOTE document the implementation path concretely.

Verdict: YELLOW — Tier A docs/CLI-stub work is complete and high-quality, but
not committed due to concurrency hazard with four in-flight dispatches. Once
they land and tree is clean, a single mechanical commit ships everything.
