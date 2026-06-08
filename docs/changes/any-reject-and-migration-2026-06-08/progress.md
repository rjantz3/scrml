# Progress — any-reject-and-migration-2026-06-08 (S174)

## Phase 0 — survey + fire-site (DONE)
- Full `any`-token inventory (scrml/spec/doc): see report.
- scrml corpus: 23 `any`-type sites across trucking-dispatch (18), 2 samples, 1 stdlib comment.
- SPEC: §55.9 ValidationError (6× `expected|forbidden: any`), §36.4.2 (`{event,data: any}` inline), stdlib/http comment.
- Fire site CHOSEN: `checkAnyTypeForbidden` in type-system.ts, wired at the type pass alongside
  `checkFunctionTypedStructFields`/`checkLogShadowing` (resolveTypeExpr is span-free/error-free; the
  literal `any` token is caught BEFORE it collapses to asIs at the span-bearing decl-binding pass).

## Phase 1 — reject E-TYPE-ANY-FORBIDDEN (DONE)
- type-system.ts: `typeTextMentionsAnyToken` + `checkAnyTypeForbidden` (struct/error field types,
  cell typeAnnotation, fn-decl params + return type). Wired in processFile type pass.
- Probe: `any` ×3 fires E-TYPE-ANY-FORBIDDEN; `asIs`/`string`/`number` do NOT fire. Confirmed.

## Phase 3 — corpus migration (DONE)
Complete inventory (23 sites). The reject SURFACED 2 `-> any` return sites my first
`:\s*any` grep missed (status-picker validNextStates, load-detail _validNextStatesInline).
Migration targets:
- status-picker.scrml: validNextStates() -> string[]; nextStates: string[]; onTransition: asIs
- load-detail.scrml: _validNextStatesInline() -> string[]
- billing.scrml / invoices.scrml: matchesFilter(inv: asIs) — invoice SQL-row, no named struct
- invoice-card.scrml: invoiceStatus(inv: asIs); invoice: asIs; onMarkPaid: asIs
- assignment-picker.scrml: drivers/tractors/trailers: asIs (row-arrays, no struct); onAssign: asIs
- driver-card / customer-card / load-card: driver/customer/load: asIs (DB rows); onToggle: asIs
- address-form.scrml: onAddressInput/onCityInput/onStateInput: asIs (callbacks)
- samples/debate-lin-lift-pipeline.scrml: buildOrderRow(order: asIs) — SQL row
- samples/.../phase4-event-logic-wrapper-028.scrml: handle(e: asIs) — event object
- stdlib/http/index.scrml: comment `data: asIs`
Rationale: app exports only ENUMS (schema.scrml) — NO named struct types for invoice/driver/
load/customer rows (only DDL comments). Those props receive SQL-query-result row objects =
genuinely untyped = asIs (sanctioned escape hatch). string[] used where the value is a concrete
array-of-strings. NO new `any` introduced; corpus-wide `any`-token scan == 0.
