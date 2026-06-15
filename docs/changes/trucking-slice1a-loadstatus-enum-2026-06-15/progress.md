# trucking-slice1a-loadstatus-enum-2026-06-15 — progress

Append-only, timestamped. Slice 1a: wire the existing LoadStatus:enum into
examples/23-trucking-dispatch/, store variant names, match directly (no mapper).

## 2026-06-15 — Phase 0: startup + recon

- Startup verified: pwd == worktree (agent-a1c357ef09689accc), toplevel matches,
  tree clean, `bun install` ok, `bun run pretest` ok. HEAD 23fbca78.
- Read kickstarter v2 (match §18.0/§18.2, fn forms §3.3), 06-kanban, schema.scrml,
  all target files.

### LOAD-BEARING EMPIRICAL CORRECTION (probed before writing)
The brief's empirical fact #1 ("keep params `status: string`; `for=LoadStatus`
supplies exhaustiveness on the value-return match") is WRONG for the JS-style
value-return form:
- Probe B: JS-style `match status { ... }` over `status: string` with a MISSING
  arm compiles CLEAN — NO exhaustiveness. (`for=` does not exist on JS-style match
  per §18.2 grammar; it is a block-form-only attribute.)
- Probe C: JS-style `match status { ... }` over `status: LoadStatus` with a MISSING
  arm fires E-TYPE-020 (exhaustiveness). So the PARAM must be typed `LoadStatus`.
- Probe D: block-form `<match for=LoadStatus on=@stringCell>` over a string cell with
  a missing arm fires E-MATCH-NOT-EXHAUSTIVE. (THIS is what PA actually probed —
  the markup block-form, not value-return.)
- Probe E: a `string` value flows into a `LoadStatus`-typed fn param with NO type
  error (DB returns strings; no mapper needed). W-LIFECYCLE-CANDIDATE fires only on
  string-discriminator STATE CELLS, not fn params.

RESOLUTION (honors ratified decision: store variant name, match directly, no mapper):
type the value-return helper PARAMS as `LoadStatus` (param, not row field) and use
JS-style value-return `match status { .Variant :> value }`. Exhaustiveness via
E-TYPE-020. The author's own comment in load-status-badge.scrml ("match makes adding
new statuses a compile-time forcing function") REQUIRES this — `string` params defeat
the forcing function. Surfaced to PA in final report.

### SCOPE EXPANSION (consistency-grep backstop, authorized by brief)
Precise grep found load-status literals in 15 files (brief named 11). The brief's
backstop clause ("If you find a LoadStatus string if-chain in a file not listed,
migrate it too ... the consistency grep is the backstop") authorizes the additional
files: pages/customer/load-detail.scrml, pages/customer/home.scrml,
pages/customer/quote.scrml, pages/driver/load-detail.scrml, pages/driver/home.scrml.
Plus InvoiceStatus (new enum) consumers: invoices.scrml + billing.scrml (filter +
option values) — needed so the new InvoiceStatus variant flows consistently.

OUT OF SCOPE (left unchanged, verified): tractor status (active/maintenance),
customer account_status (active/on_hold/closed), driver current_status (off_duty etc.,
slice 1b), LogEntryType (pre_trip etc.). app.scrml has NO load-status value literals.

## 2026-06-15 — Phase A

- schema.scrml: added `export type InvoiceStatus:enum = { Paid, Overdue, Outstanding }`.
  Compiles clean.
- components/load-status-badge.scrml: statusBadgeClasses + statusLabel rewritten
  to JS-style value-return `match status { .Variant :> ... }` over a `status:
  LoadStatus` param (imported LoadStatus from ../schema.scrml). Dropped the
  fallthrough default. PROVED in-place: dropping .Cancelled fires E-TYPE-020
  "Non-exhaustive match over enum type LoadStatus. Missing variants: ::Cancelled."
  Real file restored + compiles clean. The forcing function the original author
  intended now actually fires.

- components/status-picker.scrml: validNextStates / pickerLabel / transitionVerb
  rewritten to JS-style match over `LoadStatus` params. validNextStates returns
  string[] of next-state VARIANT NAMES ("Booked","Cancelled",…). transitionVerb
  gained a `.Tendered :> "Re-tender"` arm (unreachable target but required for
  exhaustiveness). Compiles clean. This file owns the canonical transition table.
- components/invoice-card.scrml: invoiceStatus now returns the InvoiceStatus
  VARIANT (.Paid/.Overdue/.Outstanding) — derived, no DB. invoiceStatusClasses /
  invoiceStatusLabel take InvoiceStatus + match. Compiles clean (one pre-existing
  W-TAILWIND lint in imported load-card.scrml, not mine).

## 2026-06-15 — Phase B

- pages/dispatch/board.scrml: collapsed isLeftColumn/isMiddleColumn/isRightColumn
  (3 string if-chains) into ONE exhaustive `boardColumn(status: LoadStatus) -> string`
  match (06-kanban derived-grouping shape) returning "left"/"middle"/"right"/"hidden".
  Markup call sites updated to `boardColumn(l.status) != "left"` etc. Imported
  LoadStatus. Zero NEW diagnostics vs baseline (4 warnings / 7 lints pre-existing;
  the 3 I-FN-PROMOTABLE are from other if-chains, not the migrated helpers).

  COMPILER-FINDING (kickstarter-vs-empirical): JS-style value-return `match expr {}`
  does NOT support `|`-alternation arm patterns (`.A | .B :> v`) — fires E-SYNTAX-011
  "Match arm guard clauses (`| cond`) are not supported in v1 (§18.10)." But
  kickstarter §4.10 shows `.Small | .Big :> .Healthy` in a `derived=match` block.
  Either derived-engine match parses alternation differently, or the kickstarter
  example is non-compiling. Worked around with one-arm-per-variant (still exhaustive).

- pages/customer/loads.scrml: matchesFilter's "active" branch -> exhaustive
  isActiveLoad(status: LoadStatus) match. matchesFilter keeps loadStatus:string
  (DB string; flows into isActiveLoad's LoadStatus param) + filter:string (carries
  group keys "all"/"active" OR a variant-name). Migrated <option value> load-status
  values to variant names (Tendered/Delivered/Invoiced/Paid/Cancelled; "all"/"active"
  stay) + the stale filter-value comment block. Consumes the rewritten badge helpers.
  Zero residual lowercase load-status; zero NEW diagnostics vs baseline.

- pages/dispatch/load-detail.scrml: COLLAPSED the duplicate _validNextStatesInline
  into an imported `validNextStates` from status-picker.scrml. The F-COMPONENT-002
  friction (cross-file fn call inside a server fn -> escalation cascade) NO LONGER
  holds — compiles with ZERO new diagnostics, and the import-collapse is secure:
  load-detail.client.js has 0 _scrml_sql/UPDATE loads/lin_tokens refs; the pure
  validNextStates is shared to client (legitimate, no SQL); load-detail.server.js
  dispatches on variant names. Migrated the lin-token mint condition
  (load.status=="Tendered" && newStatus=="Booked"), the "Booked" markup gate, and
  isAssignableStatus -> exhaustive match over LoadStatus. The UPDATE SQL binds
  ${newStatus} (a variant-name target from validNextStates) + publishBoardEvent/
  publishLoadEvent pass the variant-name target — all already variant. Imported
  LoadStatus. Zero residual lowercase load-status; zero NEW diagnostics vs baseline.

## 2026-06-15 — Phase C (stored-representation migration)

- seeds.scrml: 8 `_loads` status fields snake -> variant name
  (tendered->Tendered, booked->Booked, in_transit->InTransit, delivered->Delivered).
  Tractor status ("active"/"maintenance") + driver current_status ('off_duty')
  UNCHANGED (out of scope). Compiles.
- pages/dispatch/load-new.scrml: INSERT 'tendered' -> 'Tendered';
  publishBoardEvent(..., "tendered") -> "Tendered"; file-top comment. account_status
  "active" left. Compiles.
- pages/customer/quote.scrml: INSERT 'tendered' -> 'Tendered'; publishBoardEvent
  -> "Tendered"; 2 comments. account_status left. Compiles.

- pages/customer/load-detail.scrml (consistency backstop): migrated UPDATE loads
  SET status='Dispatched'; publishLoadEvent payload "Dispatched"; load.status!="Booked"
  guard; 4 markup status gates (Tendered/Booked/Cancelled); showDriverLocation literal
  -> "InTransit"; hasInvoice -> exhaustive match over LoadStatus; 2 comments. Imported
  LoadStatus. Zero residual; zero NEW diagnostics vs baseline.

- pages/driver/load-detail.scrml (consistency backstop): migrated the 4 transition
  if-chains (Dispatched->Loaded->InTransit->Delivered) + target=="Delivered" gate;
  converted nextDriverStatus / nextDriverButtonLabel / isBolEligible / isPodEligible
  to JS-style match over LoadStatus with a `_` wildcard for the driver-irrelevant
  states (nextDriverStatus returns next variant-name string). UPDATE SQL binds
  ${newStatus} (variant-name) + payload JSON interpolates load.status (variant-name)
  — no literals there. Imported LoadStatus. DRIVER-STATUS / HOS / driver-card UNTOUCHED
  (slice 1b boundary respected — nextDriverStatus is a LOAD-status helper despite the
  name). Zero residual; zero NEW diagnostics vs baseline.

- SQL IN-clause migration: pages/customer/home.scrml (status IN (...6 variants)),
  pages/driver/home.scrml (l.status IN ('Dispatched','Loaded','InTransit')),
  pages/dispatch/billing.scrml (l.status IN ('Delivered','Invoiced','Paid')) ->
  variant names. driver/home current_status/off_duty checks UNTOUCHED (slice 1b).
- InvoiceStatus consumers — pages/customer/invoices.scrml + pages/dispatch/billing.scrml:
  matchesFilter rewritten to `match invoiceStatus(inv, today) { .Paid :> filter=="Paid"
  ... }` (exhaustive over the InvoiceStatus variant; avoids cross-type == E-EQ-001 since
  invoiceStatus now returns the variant). Migrated <option value> to variant names
  (Outstanding/Overdue/Paid). All four files exit 0.

## 2026-06-15 — Consistency cleanup + gate

- Updated state-machine-flow COMMENTS (arrow notation) to variant names across
  schema/seeds/dispatch-load-detail/board/customer-load-detail/driver-load-detail
  (e.g. "Loaded → InTransit → Delivered"). Remaining lowercase refs are genuine
  English prose / past-participle verbs ("tendered loads", "delivered load is
  invoiced") and UI column-subtitle display text ("tendered · booked") — grammatically
  correct English, NOT code literals; left as-is.

### CONSISTENCY GREP GATE (load-bearing) — PASS
- BEFORE (HEAD 23fbca78, pre-dispatch): 126 quoted load-status literals in
  examples/23-trucking-dispatch/.
- AFTER: 0 quoted load-status literals across all .scrml (code + SQL + payloads).
- account_status (on_hold/active/closed), driver current_status (off_duty), tractor
  status (active/maintenance), LogEntryType — UNCHANGED (verified out of scope).

## 2026-06-15 — Native-parser parity-canary baseline regen (coupled infra)

The full gate surfaced 9 failures, ALL in the M6.5.b.0 within-node parity canary
(parser-conformance-within-node.test.js) — the native-vs-legacy per-fixture
field-level divergence gate. Root cause: my 7 edited corpus fixtures changed AST shape
(new match exprs + typed params + enum import + new InvoiceStatus type), so their
native-vs-legacy divergence counts shifted vs the checked-in allowlist baseline
(parser-conformance-within-node-allowlist.json).

NOT a compiler bug + NOT a new native-parser gap:
- PARSE-FAILURE: 0 — the native parser parses ALL my edited files cleanly.
- The divergence CLASSES are unchanged (same KIND-NAME/FIELD-SHAPE/MISSING-FIELD/
  EXTRA-FIELD/COUNT-LENGTH/SPAN-COORD; no new class). The deltas are tiny (e.g. schema
  MISSING-FIELD 73->84 from the new enum; badge COUNT-LENGTH 2->3 from match arms).
  The dominant SPAN-COORD divergence is the PRE-EXISTING native block-local-offset vs
  live file-absolute-offset staleness (S115/S162), just re-counted against new content.
- The test's own contract: "the allowlist entries should be reduced/removed in the
  same landing" as the fixture change.

Action: regenerated the allowlist for EXACTLY the 7 changed trucking fixtures (residual
-> 0) via the test's own pipeline shape (splitBlocks+buildAST .ast / nativeParseFile
.ast + populateNativeAttrValueExprNodes + classifyDivergences().classCounts). ZERO
other fixtures touched; no keys added/removed. Parity test now 24338 pass / 0 fail.
SURFACED to PA: this is a native-parser-coupled baseline edit — PA greps .scrml on
native-parser landings; the baseline shift is corpus-content-driven, not a native fix.
