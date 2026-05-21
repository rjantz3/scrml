# Dispatch — v0.6 / F7: native-parser state / SQL / CSS sub-parsers

**Authority:** DD #27 `scrml-support/docs/deep-dives/m5-m6-scope-revision-2026-05-21.md`
(F7); SCOPE `docs/changes/m5-v0.5-compressed-ladder/SCOPE-v0.6.md`.
**Estimate:** 20-30h. **Task shape:** native-parser feature addition (BRIDGE-FULL — the
one irreducible v0.6 unit; no compression possible per DD #27).

## Goal

Teach the scrml-native parser to parse the rich payloads of three code-bearing markup
contexts that are **sketch-depth only** today (text body captured, structure not parsed
— per `M5-divergence-ledger.md`):

1. **State block bodies** — state cells, `default=`, constructors (`state-constructor-def`).
2. **SQL chained-call grammar** — the `.run()` / `.batch()` / `.get()` tail trailing a
   `?{ ... }` block (`node.chainedCalls`).
3. **CSS declaration / rule structure** + reactive-ref interpolation (`node.declarations`,
   `node.rules`).

These are genuine native-parser front-end additions — NOT legacy-pipeline artifacts.
F7 has no compression vs the M5 agent's MD.5 baseline; the dive confirms it.

## Why (DD #27)

F1-F6 retired or bridged-light the divergence inventory; F7 is what is left — the native
parser literally cannot represent these three payload shapes yet. The M5 pipeline swap
cannot happen until the native parser produces the full FileAST surface, and these three
are the gap.

## Three internal sub-steps — ONE dispatch

F7's three sub-parsers all attach to the native markup layer (`tag-frame.scrml` /
`parse-markup.scrml` — the same files), so they cannot be parallel dispatches. Do them
as **three internal sub-steps within this one dispatch**, committing each independently
(crash-recovery — a stall after sub-step 2 keeps state + sql):

- **F7.a — state block bodies**
- **F7.b — SQL chained-call grammar**
- **F7.c — CSS declaration / rule structure**

## Phase 0 — survey (MANDATORY before any edit)

For EACH of the three contexts:
1. **Target shape.** Read what the live pipeline produces — the live AST node payloads
   for state blocks (`state` / `state-constructor-def` kinds; `node.stateType`), SQL
   (`node.chainedCalls`), CSS (`node.declarations` / `node.rules`) in
   `compiler/src/types/ast.ts` + how `ast-builder.js` builds them. The native parser
   must produce the SAME payload shape — that is the behavioral contract.
2. **Native current state.** Read the sketch-depth dispatchers in the native markup
   layer (`tag-frame.scrml` / `parse-markup.scrml` / `block-context.scrml` —
   wherever the `Sql` / `Css` / state BlockKinds are emitted as text-body-only). Find
   where each captured text body is, and where the structured parse must attach.
3. The SQL chained-call tail + CSS reactive-ref `${...}` interpolation feed through the
   native `parse-expr` layer (M2-M4, already built) — do NOT re-implement expression
   parsing; delegate `${...}` / `@x` to `parse-expr`.

Report the live→native payload-shape mapping per context in your final report.

## Constraints

- **No live-pipeline wiring.** Native-parser code the M5 swap activates. Verify via the
  native-parser conformance harness — feed corpus exemplars, assert the produced
  state/sql/css payloads match the live pipeline's output for the same source. Do NOT
  wire into `compiler/src/` or the live FileAST.
- Do NOT touch `compiler/src/` except read-only (target-shape reads).
- Do NOT introduce a native↔live translation layer — produce the native shape directly.
- `.scrml`/`.js` shadow discipline — author BOTH per file; the `.js` shadow runs (it is
  what conformance tests import), the `.scrml` is the canonical Pillar-5b shape.
  **The `.scrml` canonical file must be CORRECT** even though it is not test-run today —
  M6 self-host inherits it. (F1 shipped an inverted absence predicate in its `.scrml`
  mirror — `is not` where `is some` was meant; PA caught it at review. Do not repeat:
  `is some` = present, `is not` = absent, per SPEC §42 / PRIMER §9.4.)
- Commit per sub-step (F7.a / F7.b / F7.c) immediately. Coupled code + test = one
  logical unit. NEVER `--no-verify`.

## Known reconciliation item (carry — surface, do not necessarily fix here)

F1 surfaced a native-vs-live divergence on opener-end for **single-quoted attribute
values containing `>`** (native treats single-quoted runs string-opaque per the MK2.1
contract; live `tokenizeAttributes` only recognizes double-quoted string values). If
F7's work touches the attribute/opener boundary, check the SPEC §5 attribute-quoting
rules and report whether F7 should reconcile it or leave it for M5. Do NOT silently
change the MK2.1 single-quote contract without surfacing the SPEC §5 finding.

## Deliverable / report

WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED · live→native payload-shape mapping (×3
contexts) · where each sub-parser attached (file:line) · conformance test count + result
per context (incl. parity assertions) · test delta · the SPEC §5 single-quote finding
if F7 touched that boundary · maps-consulted line.
