# Trucking Dispatch — example 23

A multi-file scrml example app for an NE Utah oil-and-gas trucking dispatcher.
Built as a **language stress test** — its purpose is to surface real friction
across scrml's full-stack feature surface (auth, schema/migrations, multi-file
imports, real-time channels, lin tokens, state machines, role gating).

> **Status: M1-M6 shipped.** All 6 milestones complete. Schema + auth scaffold,
> dispatcher / driver / customer slices, real-time integration, lin tokens,
> README + final friction summary. See
> `scrml-support/archive/changes/dispatch-app/scoping.md` for the original roadmap (moved from `docs/changes/dispatch-app/` in S61 curation pass) and
> `FRICTION.md` for the load-bearing artifact: **26+ entries** logged across
> M1-M6 documenting validation-principle violations, silent-failure patterns,
> and DX gaps surfaced while building this app.

## What this app does

Three personas share a single SQLite database (`dispatch.db`). Each persona
has its own portal mounted under a per-role prefix:

- **Dispatcher** (`/dispatch/*`) — books loads, assigns drivers/tractors/
  trailers, manages customers, runs billing.
- **Driver** (`/driver/*`) — sees current load, advances status (loaded → in
  transit → delivered), uploads BOL/POD, logs fuel stops + breakdowns,
  tracks HOS.
- **Customer** (`/customer/*`) — sees their loads + tracking + invoices,
  signs rate confirmations, marks invoices paid.

The app exercises:

- **`<program auth="required">`** — global gate.
- **`<channel>`** × 4 — real-time per-channel pub/sub (dispatch-board,
  driver-events, load-events, customer-events).
- **`<machine>`** × 1 — driver HOS state machine (off-duty / on-duty /
  driving / sleeper-berth).
- **`lin` tokens** × 3 — single-use idempotency keys for acceptance
  (rate confirmation), BOL submission, and invoice payment.
- **Multi-file imports** per §21 (helper fns only — see F-COMPONENT-001).
- **`< schema>`** — 10 tables declared in `app.scrml`.

## File layout

```
examples/23-trucking-dispatch/
├── README.md                  this file
├── FRICTION.md                friction log (26+ entries)
├── app.scrml                  <program> root + <schema> + <db> + nav shell
├── schema.scrml               shared enum types + DDL reference comment
├── seeds.scrml                runSeeds() — INSERT-with-conflict-skip dataset
├── dispatch.db                bootstrap SQLite (schema applied, seed data ready)
├── models/
│   └── auth.scrml             cookie helpers + role helpers + constants
├── components/
│   ├── address-form.scrml     (NOTE: components dir exists for type/helper
│   ├── assignment-picker.scrml exports only — F-COMPONENT-001 blocks
│   ├── customer-card.scrml    cross-file component RENDERING; consumer
│   ├── driver-card.scrml      pages import helpers + inline markup)
│   ├── invoice-card.scrml
│   ├── load-card.scrml
│   ├── load-status-badge.scrml
│   └── status-picker.scrml
└── pages/
    ├── auth/
    │   ├── login.scrml        /login
    │   └── register.scrml     /register
    ├── dispatch/
    │   ├── board.scrml        /dispatch — kanban
    │   ├── billing.scrml      /dispatch/billing
    │   ├── customers.scrml    /dispatch/customers
    │   ├── drivers.scrml      /dispatch/drivers
    │   ├── load-detail.scrml  /dispatch/loads/:id
    │   └── load-new.scrml     /dispatch/loads/new
    ├── driver/
    │   ├── home.scrml         /driver
    │   ├── hos.scrml          /driver/hos
    │   ├── load-detail.scrml  /driver/loads/:id
    │   ├── load-log.scrml     /driver/loads/:id/log
    │   ├── messages.scrml     /driver/messages
    │   └── profile.scrml      /driver/profile
    └── customer/
        ├── home.scrml         /customer
        ├── invoices.scrml     /customer/invoices
        ├── load-detail.scrml  /customer/loads/:id
        ├── loads.scrml        /customer/loads
        ├── profile.scrml      /customer/profile
        └── quote.scrml        /customer/quote
```

LOC tally: ~8,200 across 33 .scrml files (M1: ~850, M2: ~2,200, M3: ~2,260,
M4: ~1,800, M5: ~600, M6: ~500).

## Setup

This repo uses [bun](https://bun.sh/) — install bun first if you haven't.

```bash
# from the repo root
bun install
cd compiler && bun install && cd ..
```

The `dispatch.db` is checked in with the schema applied — no manual
bootstrap step needed for a fresh checkout. If you delete `dispatch.db`
or change the schema:

```bash
# Re-bootstrap dispatch.db with the lin_tokens table + every other table.
bun -e "
const { Database } = require('bun:sqlite');
const db = new Database('examples/23-trucking-dispatch/dispatch.db');
// Run the CREATE TABLE statements from app.scrml's <schema> block here,
// or compile the example once — the F-SCHEMA-001 workaround means the
// compiler's PA pass needs a live DB to validate against.
"
```

(The `< schema>` block in `app.scrml` is the canonical declaration but
per F-SCHEMA-001, the PA pass currently requires a live DB file —
adopters can't compile from declared schema alone. See FRICTION.md.)

## Run

```bash
# Compile the example dir to dist/
bun ./compiler/src/cli.js compile examples/23-trucking-dispatch/
```

**Expected (per scoping):** `dist/` contains an HTML/JS file per .scrml
page, in a tree mirroring the source layout.

**Observed (post-W0a, 2026-04-30):** `dist/` is a tree-preserving layout —
`pages/customer/home.scrml` emits to `dist/pages/customer/home.html`,
`pages/driver/home.scrml` emits to `dist/pages/driver/home.html`, etc.
32 source `.scrml` files produce 21 HTML / 32 client.js / 21 server.js
across nested subdirs (`dist/pages/{auth,customer,dispatch,driver}/`,
`dist/components/`, `dist/models/`, `dist/`). All distinct routes are
present — F-COMPILE-001 RESOLVED (see FRICTION.md). Files without page
shape (components, models, schema, seeds) emit only the artifacts they
produce (typically `.client.js` only).

**Backstop:** if a future flag/refactor re-introduced output flattening
that caused two source files to compute to the same dist path, the
compiler would emit `E-CG-015` ("conflicting output paths") rather than
silently overwrite. See SPEC.md §47.9.

```bash
# Dev-server mode (NOT YET WORKING — per OQ-2 below):
bun ./compiler/src/cli.js dev examples/23-trucking-dispatch/
# expected: app runs at http://localhost:3000
# observed: dev-server bootstrap fails with scrml:auth import resolution error
#           (post-M6 deep-dive will diagnose)
```

The compile-only output IS readable as static HTML now that
F-COMPILE-001 is resolved (W0a, 2026-04-30), but interactive flows still
require the runtime that the dev-server provides — see OQ-2 / W0b for
the dev-server bootstrap dispatch.

## Seeded credentials

All seeded accounts share password `demo`. After login, users are
redirected by role:
- Dispatchers → `/dispatch`
- Drivers → `/driver`
- Customers → `/customer`

| Role | Email |
|---|---|
| Dispatcher | `dispatcher@dispatch.example` |
| Driver | `doyle.briggs@dispatch.example` |
| Driver | `lupe.fontes@dispatch.example` |
| Driver | `ada.king@dispatch.example` |
| Driver | `moses.tate@dispatch.example` |
| Customer | `ops@basinenergy.example` |
| Customer | `dispatch@uintahfield.example` |
| Customer | `billing@vernalops.example` |

(Brief override note: scoping doc and progress refer to
`*@dispatch.local` shorthand; actual seeds use `*@dispatch.example` /
`*.example` per the `seeds.scrml` data above.)

The seed dataset includes:
- 8 loads in varying statuses (tendered, booked, in_transit, delivered)
- 3 tractors + 4 trailers
- 1 dispatcher + 4 drivers + 3 customers

## Persona walkthrough

### Dispatcher
- Login as `dispatcher@dispatch.example`.
- `/dispatch` shows the kanban board. Click a load to open its detail page.
- On `/dispatch/loads/:id`, advance status (e.g. tendered → booked).
  When you book a load, an **acceptance lin-token** is minted; the
  page shows "Rate confirmation pending" with the token's prefix.
- `/dispatch/customers`, `/dispatch/drivers` for roster views.
- `/dispatch/billing` shows invoices, mints **payment lin-tokens**
  for newly-invoiced loads on first visit.

### Driver
- Login as any `*.dispatch.example` driver (e.g. `doyle.briggs`).
- `/driver` shows current assignment. Click into a load.
- On `/driver/loads/:id`, advance status (dispatched → loaded → in transit
  → delivered). Loading a load mints a **BOL lin-token**. The "Upload BOL"
  button is enabled only while the token is active. After first BOL
  upload, the token is consumed and the button greys out.
- Log fuel stops, breakdowns, POD via the inline forms.
- `/driver/hos` for hours-of-service.

### Customer
- Login as any `*.example` customer (e.g. `ops@basinenergy.example`).
- `/customer` shows your loads + recent invoices.
- On `/customer/loads/:id`, when status is `booked`, click **"Sign rate
  confirmation"**. This consumes the acceptance lin-token and advances
  the load to `dispatched`.
- On `/customer/invoices`, **"Mark paid"** consumes the payment
  lin-token. The button greys out if no active token (the dispatcher
  hasn't generated the invoice yet).

## Lin token semantics — single-use idempotency

The 3 lin tokens (acceptance, BOL, payment) demonstrate the canonical
"once and only once" guarantee. Two layers cooperate:

1. **Compile-time**: server fns receive `lin token: string` parameters.
   Per §35.2.1 + §35.3, the compiler enforces the value is consumed
   exactly once on every execution path within the function body. See
   `examples/19-lin-token.scrml` for the canonical pattern.

2. **Runtime**: the `lin_tokens` table provides the durable single-use
   guard. The `consume` operation is `UPDATE lin_tokens SET consumed_at
   = CURRENT_TIMESTAMP WHERE token = ? AND consumed_at IS NULL`. If
   `changes == 0`, the token was already consumed (replay or race) and
   the server fn returns an error.

The two layers are complementary: lin gives the static guarantee
(within one function call); the DB guard gives the durable guarantee
(across requests, replays, browser tabs). Together they enforce true
once-and-only-once acceptance / BOL / payment semantics.

**F-LIN-001 (M6 finding):** SQL `?{}` interpolation does NOT count as a
`lin` consume per §35.3 rule 1, even though template-literal `${var}`
does in example 19. Workaround: copy the lin var into a regular
template literal first (e.g. `const m = ` + "\\`consume:${token}\\`" +
`; ?{` + "\\`UPDATE ... WHERE token = ${m.substring(8)}\\`" + `}.run()`).

## Friction surface — what M1-M6 produced

The dispatch app is a stress test. Its load-bearing output is
`FRICTION.md` — **26+ entries** documenting validation-principle
violations and DX friction encountered while writing real scrml at
~8,200 LOC scale.

Highlights (full entries with code samples in `FRICTION.md`):

- **F-AUTH-001** (P0): `auth="role:X"` is silently inert; every page
  hand-rolls the role check.
- **F-AUTH-002** (P0): cross-file `server function` with `?{}` SQL access
  hits E-SQL-004; ~126 LOC of duplicated `getCurrentUser` across
  18 pages.
- **F-RI-001** (P0): canonical "call server fn, dispatch on result,
  update reactive" pattern doesn't always compile; specific
  workaround pattern required.
- **F-COMPONENT-001** (P0, architectural): cross-file component
  rendering is silently broken end-to-end; `examples/22-multifile/`
  demo renders blank. M2-M6 all use inline-only markup.
- **F-CHANNEL-001** (P0): channel name interpolation
  (`<channel name="driver-${id}">`) is silently inert; per-id channel
  scoping collapses to a single broadcast.
- **F-COMPILE-001** (P0, RESOLVED 2026-04-30 W0a): `scrml compile <dir>`
  used to flatten output by basename, silently overwriting collisions.
  Now preserves source-tree structure in `dist/`; cross-source collisions
  emit `E-CG-015` per SPEC §47.9. The 15 silent overwrites in M2-M6 are
  no longer present; all 32 source files produce distinct outputs.
- **F-LIN-001** (P1, new in M6): SQL `?{}` interpolation doesn't
  satisfy `lin` consume per §35.3; the example-19 template-literal
  pattern doesn't generalize.
- **F-NULL-001 / F-NULL-002** (P1): `== null` / `!= null` is rejected
  in some contexts but accepted in others; trigger is unpredictable.
- **F-SCHEMA-001** (P1): `< schema>` doesn't satisfy E-PA-002 — adopters
  must pre-create the DB before compile.

The full log + the **"Summary — what this exercise produced"** section
at the end of FRICTION.md document the systemic *silent failure*
pattern: the compiler repeatedly accepts valid-looking syntax that
produces silently-wrong output. This is the chief architectural finding
of the entire 6-milestone exercise.

## Constraints (per scoping doc §10)

- Tailwind 3 utility classes only (no custom theme, no `class={expr}`).
- bun:sqlite only (no Postgres) — single-file `dispatch.db` next to source.
- Multi-file imports per §21 (helpers; components inline-only per
  F-COMPONENT-001).
- No `--no-verify` on commits (every commit passes the test suite).
- No new compiler features during the build — work around gaps, log them.
- No real auth provider, GPS, or payment integration — all simulated.

## Links

- Scoping doc — `scrml-support/archive/changes/dispatch-app/scoping.md` — original roadmap (moved from `docs/changes/dispatch-app/` in S61 curation pass)
- [LLM kickstarter v1](../../docs/articles/llm-kickstarter-v1-2026-04-25.md) — required brief for any scrml-writing dispatch
- [Multi-file precedent](../22-multifile/) — closest precedent for §21 imports
- [Lin token reference](../19-lin-token.scrml) — canonical `lin` pattern
- [Channel reference](../15-channel-chat.scrml) — `<channel>` reference
- [State machine reference](../14-mario-state-machine.scrml) — `<machine>` reference
- [Compiler SPEC.md](../../compiler/SPEC.md) — §21 imports, §35 lin, §38 channels, §39 schema, §44 SQL
