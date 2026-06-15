# BRIEF — Trucking slice 1a: LoadStatus enum-wiring spine

**Change-id:** `trucking-slice1a-loadstatus-enum-2026-06-15`
**Dispatched:** S198 (2026-06-15), PA → `scrml-js-codegen-engineer`, `isolation: "worktree"`, base HEAD `23fbca78`.
**Task shape:** corpus rewrite (writing canonical scrml in `examples/23-trucking-dispatch/`). NOT a compiler-source change — do NOT touch `compiler/src/**`.

---

## WHAT YOU ARE DOING (the one-paragraph mission)

`examples/23-trucking-dispatch/` stores load status as snake_case text (`"in_transit"`) and threads it through ~the whole app as **string if-chains** (`if (status == "in_transit") ...`). The shared `LoadStatus:enum` (`Tendered, Booked, Dispatched, Loaded, InTransit, Delivered, Invoiced, Paid, Cancelled`) is ALREADY DECLARED in `schema.scrml` but never used. Your job: **wire the existing enum in** — replace the string if-chains with `match for=LoadStatus`, collapse the DUPLICATE transition/grouping tables to one, and migrate the stored representation to the **variant name** (`"InTransit"`) so the DB string IS the enum and `match` dispatches directly. This is the S193 corpus directive made concrete: *show real scrml — exhaustive enum state, not stringly-typed React-grammar.* This is slice 1a (LoadStatus). A separate slice 1b will do DriverStatus/HOS — **do NOT touch driver-status, the HOS engine, `driver-card.scrml`, or `drivers.current_status`.**

## THE RATIFIED DECISION (do not re-litigate — user ruled S198)

**Store the variant name; match directly; no mapper.** (User picked this over cast-at-boundary and over a schemaFor-flagship variant.)
- Seeds + all writes store the **variant name** string: `"InTransit"` (was `"in_transit"`), `"Tendered"` (was `"tendered"`), etc.
- `match for=LoadStatus on=<status-string-expr>` dispatches directly against the variant names. **No snake↔Pascal mapper function anywhere.**
- An enum-typed cell binds into SQL as its variant-name string natively, so writes need no mapper either.

## EMPIRICAL FACTS — already verified by PA (do not re-derive; rely on these)

1. **`match for=LoadStatus on=@statusStringCell` COMPILES and exhaustiveness FIRES** even when the on-expr is `string`-typed (holding a variant name). PA probe: dropping `.Delivered` from the arms fired `E-MATCH-NOT-EXHAUSTIVE: missing arm(s) for variant(s): .Delivered`. So you get full exhaustiveness on a `text`-column-derived string. **You do NOT need to type the row field as `LoadStatus`** — keep helper params `status: string` (the stored variant-name string); the `for=LoadStatus` on the match supplies the exhaustiveness.
2. **The emitted runtime dispatch compares against the variant-name strings** (`"Tendered"`, `"InTransit"`, ...). Therefore the DB MUST store the variant name for the match to hit.
3. **An enum-typed cell binds into SQL as its variant-name string** — `<status>: LoadStatus = .Booked` → SQL bind emits `"Booked"`. So `?{ UPDATE loads SET status = ${@statusEnumCell} }` writes `"Booked"` natively.
4. **`06-kanban-board.scrml`** is your landed reference for `type Card:struct = { ..., status: Status }` + derived-grouping over an enum field (the per-card multi-instance status pattern = exactly the load-status shape per S194-2C: per-entity state = match/components, NOT a singleton engine). **`29-engine-vs-flags.scrml`** is the "flags→make-impossible-states-impossible" lesson. **`05-multi-step-form.scrml`** is the engine+validators reference.

## CONSISTENCY GATE (load-bearing — compile-clean is NECESSARY BUT NOT SUFFICIENT)

This is a data-representation migration. A `match` expecting `"InTransit"` against a DB row still holding `"in_transit"` COMPILES CLEAN but breaks at runtime. So after the rewrite:
- **Grep the whole `examples/23-trucking-dispatch/` tree for residual snake_case LOAD-status literals** (`"tendered"`, `"booked"`, `"dispatched"`, `"loaded"`, `"in_transit"`, `"delivered"`, `"invoiced"`, `"paid"`, `"cancelled"`) — in `.scrml` code, SQL strings, AND channel payloads. After migration this grep MUST return ZERO load-status occurrences (variant names `"InTransit"` etc. only). Report the before/after counts.
- **Out of scope — DO NOT migrate:** tractor `status` (`"active"`/`"maintenance"` — a different domain), customer `account_status` (`"active"`/`"on_hold"`/`"closed"` — the `AccountStatus` enum, a later slice), driver `current_status` (`"off_duty"` etc. — slice 1b). Only the **load** status (the `LoadStatus` variant set) migrates in 1a.

## SCOPE — files (LoadStatus only)

Phase A — the helper components + the new enum:
1. `components/load-status-badge.scrml` — `statusBadgeClasses(status)` + `statusLabel(status)` if-chains → `match for=LoadStatus on=status`. Keep params `status: string`. The Tailwind class sets + labels carry over verbatim into the arms.
2. `components/status-picker.scrml` — `validNextStates(current)` (the transition state-machine living as a string if-chain; the file comment literally says "`<engine>` deferred, rules live as a pure helper") + `pickerLabel` + `transitionVerb` → `match for=LoadStatus`. `validNextStates` returns the list of next-state **variant-name strings**. This file owns the canonical transition table.
3. `schema.scrml` — ADD `export type InvoiceStatus:enum = { Paid, Overdue, Outstanding }` alongside the existing enums (it is a DERIVED status — computed from `paid_at`/`due_at`, NOT stored — so it's the cleanest match case, no DB migration for it).
4. `components/invoice-card.scrml` — `invoiceStatus(inv, today) -> InvoiceStatus` (returns the variant); `invoiceStatusClasses`/`invoiceStatusLabel` → `match for=InvoiceStatus`. Import `InvoiceStatus` from `schema.scrml`.

Phase B — collapse the DUPLICATES + the consumers:
5. `pages/dispatch/load-detail.scrml` — has its OWN copy of `validNextStates` (~lines 42-46) + status if-chains (~line 153) + a status section check (~line 461). **Collapse:** import `validNextStates` (+ label/verb helpers) from `status-picker.scrml` instead of duplicating; the inline transition-validation if-chain → reuse the picker helper or a `match`.
6. `pages/dispatch/board.scrml` — `isLeftColumn`/`isMiddleColumn`/`isRightColumn` status-grouping if-chains (~lines 102-111) → `match for=LoadStatus` (this is the 06-kanban derived-grouping pattern).
7. `pages/customer/loads.scrml` — `matchesFilter(loadStatus, filter)` (~line 126): the `"active"` group's status set → `match for=LoadStatus`. Consumes the rewritten `statusBadgeClasses`/`statusLabel`.

Phase C — the stored-representation migration (variant names):
8. `seeds.scrml` — every `loads` `status:` literal → variant name (`"tendered"`→`"Tendered"`, `"booked"`→`"Booked"`, `"in_transit"`→`"InTransit"`, `"delivered"`→`"Delivered"`, etc.). Leave tractor `status` + customer `account_status` UNCHANGED.
9. `pages/dispatch/load-new.scrml` — `publishBoardEvent(..., "tendered")` (~line 198) → `"Tendered"`.
10. Any **write/compare SQL** touching `loads.status` (`UPDATE loads SET status = '<snake>'`, `WHERE status = '<snake>'`, `INSERT ... status`) → variant names.
11. Channel payloads carrying load status (grep `channels/` + any `publishBoardEvent`/broadcast load-status payloads) → variant names.

If you find a LoadStatus string if-chain in a file not listed above, migrate it too (the list is the known set; the consistency grep is the backstop). If a file's change balloons unexpectedly or you hit a real compiler gap, STOP and report rather than forcing it.

## SHAPE TO MIRROR (the canonical form)

```scrml
// load-status-badge.scrml — string param, match body, exhaustive
export fn statusBadgeClasses(status: string) -> string {
    match status for LoadStatus {           // <- if the compiler wants `<match>` markup form here it's a fn,
        ...                                  //    so use the JS-style value-return: match status { .Tendered :> "..." ... }
    }
}
```
NOTE: these are **pure `fn` value-return** sites, so use the **JS-style value-return** `match expr { .Variant :> value ... }` (§6.2 / §18) — NOT the `<match for=Type>` markup block-form (that's for markup-tree position). The value-return form ALSO checks exhaustiveness against the enum. Verify the exact accepted syntax against `06-kanban-board.scrml` (it does exactly this — `fn withStatus(... status: Status)` + match). The markup `<match for=LoadStatus on=@cell>` block-form is for the markup-tree status-rendering positions (e.g. a load-detail status panel), if any arise.

## MAPS — REQUIRED FIRST READ

Before consuming other context, read `.claude/maps/primary.map.md` in full (~100 lines). Its §"Task-Shape Routing" tells you which maps fit a corpus/scrml-writing task. Map currency: maps reflect HEAD `471cbb34` as of 2026-06-15; HEAD is now `23fbca78` (2 commits ahead — the s196/s197 wraps + corpus examples 29/30/31 + a SPEC §13.5.6 note; none touch the trucking files). Treat map content as a starting hypothesis; this is example-writing so the kickstarter + the reference examples (06/29/05) are the load-bearing inputs, not the compiler-navigation maps. In your final report: "Maps consulted: [...]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing."

## MANDATORY READS BEFORE WRITING ANY SCRML

1. `docs/articles/llm-kickstarter-v2-2026-05-04.md` IN FULL — the canonical scrml shape, stdlib catalog, anti-pattern table. Reread before each file.
2. `../scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — the Ghost-Pattern mitigation (no React/Vue/JSX reflexes). Reread before each file.
3. `examples/06-kanban-board.scrml`, `examples/29-engine-vs-flags.scrml`, `examples/05-multi-step-form.scrml` — the landed reference shapes.
4. `examples/23-trucking-dispatch/schema.scrml` (the enum declarations) + the target files above (the current string-chain shapes).

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 has had path-discipline leaks; this would be a new incident — do not leak)

Your worktree path is the one the harness assigned (`.claude/worktrees/agent-<id>/` under the scrmlTS main checkout).

Startup verification (BEFORE any other tool call):
1. `pwd` — MUST equal your worktree path AND start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it's under any other repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report (S90 CWD-routing failure). Save it as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git status --short` — confirm clean.
4. `bun install` — worktrees do NOT inherit `node_modules`; the pre-commit hook's `bun test` fails ("cannot find package 'acorn'") without it.
5. `bun run pretest` — populates `samples/compilation-tests/dist/` (gitignored; empty in fresh worktrees) so the full suite doesn't ECONNREFUSED.

Path discipline (EVERY edit):
- Apply ALL file edits via **Bash** (`perl`/`python3`/heredoc/`cp`) on **worktree-absolute paths that include the `.claude/worktrees/agent-<id>/` segment** — NOT the Edit/Write tools (the S126 interim mitigation; Edit/Write have leaked to MAIN). Echo the target path before each write; re-verify with `git diff`/`grep` after.
- NEVER `cd` into the main repo (or anywhere outside WORKTREE_ROOT). Use `git -C "$WORKTREE_ROOT"`, `--cwd "$WORKTREE_ROOT"` for bun, and worktree-absolute paths exclusively. A `cd` into main leaks installs/compiles/edits (S126 #14/#15).
- If you ever construct a path starting with the main repo root (no `worktrees/agent-` segment), STOP and re-derive from WORKTREE_ROOT.

## COMMIT DISCIPLINE (crash-recovery — commit early + often)

- Commit after EACH file (or each coherent sub-bucket) — do NOT batch. WIP commits fine: `WIP(trucking-1a): load-status-badge → match`. The first commit message MUST include your verbatim `pwd` output: `WIP(trucking-1a): start at <pwd>`.
- After every edit: `git -C "$WORKTREE_ROOT" diff <file>` to verify; `git add`; commit immediately.
- Before reporting DONE: `git status` MUST be clean (no uncommitted changes). "work in worktree, no commits" is NOT an acceptable terminal report.
- Update `docs/changes/trucking-slice1a-loadstatus-enum-2026-06-15/progress.md` (append-only, timestamped) after each file: what was done, what's next, blockers.
- The code rewrite + its seed/write migration are ONE logical unit (a half-migrated app breaks at runtime) — keep them coherent across your commits; the whole slice lands as one PA-authored commit, but your incremental commits are the crash-recovery checkpoints.

## VERIFICATION — R26 empirical (MANDATORY before reporting DONE)

1. **Per-file compile** as you go: `bun --cwd "$WORKTREE_ROOT" compiler/bin/scrml.js compile "$WORKTREE_ROOT/examples/23-trucking-dispatch/<file>" --output-dir /tmp/t1a/<file>` — exit 0, no NEW errors. (Components/pages may have pre-existing warnings; compare against a baseline compile of the file BEFORE your edit so you only own NEW diagnostics.)
2. **Whole-example compile** at the end — compile the entry `examples/23-trucking-dispatch/app.scrml` (and any page that's a route entry) clean; `node --check` the emitted JS where applicable.
3. **The consistency grep gate** (above) — ZERO residual snake_case LOAD-status literals across the tree. Report before/after counts.
4. Report: per-file compile results (exit codes + new-vs-pre-existing diagnostics), the consistency-grep before/after, FINAL_SHA, FILES_TOUCHED, and any deferred items / compiler gaps you hit.

## FINAL REPORT SHAPE

WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED (worktree-absolute) · per-file compile results · consistency-grep before/after counts · maps-consulted line · any compiler gaps found (filed-candidate shape) · deferred items. Your final message IS the return value — return the data, not a human-facing summary.
