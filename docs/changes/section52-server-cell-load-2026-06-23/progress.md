# §52 Tier-2 `<var server> = ?{}.get()` server-cell LOAD codegen — progress

change-id: section52-server-cell-load-2026-06-23
base: spa/ss1 tip 886bc178 (merged; ancestor-confirmed)

## 2026-06-23 — Phase 0 + root-cause + parser fix landed; §52 load-wiring BLOCKED

### Phase 0 — repro + root cause
- Baseline reproduced @886bc178: `<driver server> = ?{...}.get()` → E-CODEGEN-INVALID-JS,
  raw `?{}` leaked into client.js (`reactive_set("driver", await (?{ /* sql */ }.get()))`).
- ROOT CAUSE located in PARSER (ast-builder.js), NOT codegen: the V5-strict markup-form
  state-decl (`<x> = ?{}` / `<x server> = ?{}` / `const <x> = ?{}`) in tryParseStructuralDecl
  was the ONLY decl form that did not route an inline `?{}` RHS through tryConsumeSqlInit.
  Every other form (let/const 6762/6864, legacy `@x`/`server @x` 6915/6941, top-level
  10342/10514) builds a structured `sqlNode` with `init:""`. The markup form collected the
  raw `?{...}` into `init` (spaced token-join `?{ ` } . get ( )`), so safeParseExprToNode
  produced an unresolved `sql-ref` ExprNode (nodeId:-1).
  - non-server `<x> = ?{}` → codegen emitted `null /* sql-ref unresolved … upstream
    parser/AST bug, please report */` (sibling bug).
  - server `<x server> = ?{}` → leaked raw `?{}` client-side → E-CODEGEN-INVALID-JS.
  - type-system.ts:8894 ALREADY assumes this site attaches `sqlNode`; emit-expr.ts:2000
    ALREADY says "upstream parser/AST bug". The contract gap was the actual defect.

### Param disposition (Phase-0 (a)/(b) question)
- Branch (a) is FALSE: E-AUTH-001 does NOT exist in compiler source at all, and a `${@cell}`
  read-param in a `<var server>`-init SELECT does NOT fire any E-AUTH error — it fires the
  SAME E-CODEGEN-INVALID-JS leak. E-AUTH-001 per SPEC §52.11 is scoped to INSERT/UPDATE/DELETE
  (persist/write), NOT a SELECT read-param. So the param-bearing inline form is NOT deflected;
  it is the same bug, and the canonical §51.0.E example IS param-bearing.

### Fix landed (commit e1969b23)
- PARSER: tryParseStructuralDecl now calls tryConsumeSqlInit for the markup-form RHS, building
  the canonical `sqlNode` (init:"") — consistent with every other decl form.
- TESTS: §S11F.1-6 (parse-shapes-v0next) updated — they LOCKED the old buggy `init==="?{`...`}"`;
  now assert the canonical `sqlNode` shape while preserving the newline-boundary assertion.
- Effect: E-CODEGEN-INVALID-JS GONE; zero `?{` client leak; client.js `node --check` clean for
  bare-cell + engine-rides. Non-server `<cards> = ?{}.all()` sql-ref-unresolved bug fixed too.
- Full unit+integration+conformance: 17625 pass / 0 fail.

### R26 table
| repro            | E-CODEGEN-INVALID-JS | client ?{ leak | client --check | serverLoad route | notes |
|------------------|----------------------|----------------|----------------|------------------|-------|
| bare-cell        | GONE                 | 0              | OK             | not yet (blocked)| emits E-CG-006 comment; cell shows placeholder (W-AUTH-001) |
| engine-rides     | GONE                 | 0              | OK             | not yet (blocked)| §51.0.E shape compiles; engine no longer crashes on the cell |
| server-fn-call   | n/a (was always OK)  | 0              | OK             | 0 (correct)      | CONTROL: still fetch-stub form, NO regression |

## BLOCKED — §52 server-load route + client fetch (the briefed codegen half)
The server-load wiring direction depends on an UNRESOLVED SPEC conflict the brief flagged as
PA-owned:
- §52.4.3 (SPEC.md:29156): the RHS of `<var server> = expr` is "the **client placeholder** …
  It is NOT sent to the server." → an inline `?{}` RHS would be INVALID as a placeholder.
- §51.0.E (SPEC.md:25431,25450): `<driver server> = ?{...}.get()` — the `?{}` IS the server
  load, param-bearing, canonical; "the engine rides … a server `?{}`".
- §52.6.5 enumerates only Pattern A (assignment-inferred) + Pattern B (`on mount`) — NOT the
  decl-RHS-`?{}` form.
These three are mutually inconsistent. The codegen DIRECTION (load-route vs reject-as-invalid-
placeholder) cannot be chosen without the PA-owned SPEC reconciliation. Per brief: "If your fix
needs a NEW error code or a SPEC normative change, STOP and report (escalate) — do not amend SPEC."
ESCALATED. Parser fix (the unambiguous, security-relevant leak-stopper) landed; load-wiring deferred.
