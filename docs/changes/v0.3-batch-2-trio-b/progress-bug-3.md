# Bug 3 — 03-contact-book auth-cookie 404 + missing /login page

## Dispatch

S87 Trio B Bug 3. Worktree: `agent-a8bf255e2362d359c`. Branch: `main`.

## Surface analysis

- `examples/03-contact-book.scrml` is a **single-file example** at top-level
  `examples/`. The compiler/dev-server compiles each `.scrml` to flat output
  files (`03-contact-book.html`, `03-contact-book.client.js`,
  `03-contact-book.server.js`) under `examples/dist/`.
- `<program auth="required">` (combined with `protect="password_hash"` on `<db>`)
  triggers `_scrml_auth_check` injection on every emitted server-fn route.
- Auth check looks for `scrml_sid=` cookie; if absent it returns
  `302 → /login`.
- `/login` does NOT exist as a route in the dev server (no `login.html` in
  `examples/dist/`), so the redirect target 404s.
- All three server fns (`persistContact`, `deleteContact`, `loadContacts`)
  emit POST handlers — the auth check fires for ALL of them, not only
  state-mutating ones (the `isStateMutating` boolean evaluates true since
  the default method is POST).
- Page HTML is served as a static file, so the page itself loads. The
  `loadContacts()` call from the for-loop fires immediately on page mount
  and 302→/login→404; the form submit also 302→/login→404.

## Plan — revised after reference-source survey

**Survey finding:** the brief proposes converting 03-contact-book to a
multi-file directory with `login.scrml`. This conflicts with the
kickstarter §11 example role of 03-contact-book ("Full-stack with `<db>` +
`?{}` + server fns" — NOT auth) and the example's own docstring intent.

The auth canonical is `examples/23-trucking-dispatch/` (multi-file, has
real auth pages, FRICTION ledger documents F-AUTH-001/002).

The original `<program auth="required">` + `protect="password_hash"` on
03-contact-book is misconfiguration:
- `password_hash` IS a column in `contacts` table but the example never
  reads/writes it — pure cargo-cult.
- No /login fixture was ever provisioned, so auth gates 404 on every fn.
- Kickstarter §11 lists 03-contact-book as the "first full-stack app"
  reference. Auth doesn't belong in a "first" example.

Brief gives flexibility: "PARTIAL with surfaced findings if blocked on
real auth-flow design issue." Surfaced finding: **the dispatch's premise
(03-contact-book as auth canonical) conflicts with example role &
kickstarter index**.

**Approach A (chosen):** Strip `auth="required"` + `protect="password_hash"`
from `examples/03-contact-book.scrml`. Surgical 2-attribute edit. E2e
passes. Add a docstring note pointing to 23-trucking-dispatch for the
auth canonical. NO multi-file restructure (preserves the kickstarter
example index, README, e2e path stability).

## Steps

- [x] Startup verification + map read + reference-source survey
- [ ] Edit `examples/03-contact-book.scrml`: drop `auth="required"` from
      `<program>`, drop `protect="password_hash"` from `<db>`. Update
      docstring to reflect the simplification + cross-reference 23 for auth.
- [ ] Re-compile + verify no auth wires emitted
- [ ] Run e2e for 03-contact-book — expect AC1-AC5 to pass on Chromium
- [ ] Run full e2e (3 browsers) for 03-contact-book — verify
- [ ] Run unit + integration + conformance test suite — verify 0 regressions
- [ ] Final commit + clean status

## Progress log

### Step 1 — baseline reproduction (original example, unmodified)

Ran `bun run e2e 03-contact-book --project=chromium`. Result:
- AC1 PASSED (157ms). Page heading "Contact Book" visible. Empty `ul.contacts`
  attached. Console errors all match the spec's known-noise patterns
  ("Failed to load resource: 404" — from the 302→/login→404 redirect chain).
- AC2 FAILED (10.2s timeout): `li.contact-row` count expected 1, received 0.
  Server-fn `persistContact` POST → 302 → /login → 404. Nothing persisted.
- AC3-AC5 DID NOT RUN (test.describe.configure mode "serial").

This is the auth-gate symptom Wave 3 D2 surfaced. Matches the brief
exactly.

### Step 2 — strip-auth approach (later reverted)

Attempted: drop `auth="required"` from `<program>`, drop `protect="..."`
from `<db>`. Goal: bypass the auth gate so server fns reach the SQL layer
directly.

Result: e2e fails harder. Console errors:
- "Failed to load resource: 403 (Forbidden)" — baseline CSRF mint-on-403
  on first POST (expected; the client retry wrapper handles it).
- "Failed to load resource: 500 (Internal Server Error)" — the server-fn
  handler crashed because **`_scrml_sql is not defined`**.

Dev server log:
```
[dev] Route handler error for POST /_scrml/__ri_route_loadContacts_3:
       _scrml_sql is not defined
```

This is a **separate, latent compiler bug** that the auth gate had been
masking. Reverted to baseline (clean tree, no example edit).

### Surfaced finding — SECOND compiler bug, blocks Bug 3 progress

**Bug:** server-fn codegen references `_scrml_sql` as a free variable
but neither the codegen, the dev-server runtime, nor build.js emits a
`_scrml_sql` definition (`const _scrml_sql = new SQL(...)` or similar
shape with `import { SQL } from "bun"`). Every server-fn that uses
`?{...}` SQL syntax produces broken JS.

**Reproduction (independent of Bug 3 fixture work):**
1. Pick any example using `<db>` + `?{}` SQL — e.g. 03, 17, 23.
2. Inspect the generated `examples/dist/03-contact-book.server.js` and
   grep for `_scrml_sql\s*=` or `new SQL(` or `import.*SQL.*"bun"`. None
   exist. Only references like
   `await _scrml_sql\`INSERT INTO contacts ...\`` appear.
3. With auth gate removed, the runtime ReferenceError surfaces; with
   auth gate present, the 302→/login chain short-circuits before the
   handler is reached.

**Why never previously surfaced:**
- The compiler's unit/integration/conformance tests assert
  the emit shape (substring matches like `_scrml_sql\``) but never
  RUN the generated server.js end-to-end with actual SQL queries.
- The pre-S86 Puppeteer browser harness checked "page renders something"
  only — never round-tripped server fns.
- Wave 3 D2 is the FIRST e2e suite that actually exercises a server-fn
  round trip + DB persistence (03-contact-book + TodoMVC). Both are
  flagged in the W3 D2 hand-off as "latent bugs surfaced for first time
  by faithful AC tests."

**Surface analysis:**
- `compiler/src/codegen/index.ts:337-388` annotates `<program db="..."> `
  children with `_dbScope = { dbVar, connectionString, driver }` but
  this annotation has **no downstream consumer**. The dbVar is wired
  through `emit-control-flow.ts:261` + `emit-logic.ts:2079,2428` +
  `rewrite.ts` as a fallback default `_scrml_sql`, but no emitter
  produces a `const _scrml_sql = ...` declaration anywhere.
- `compiler/src/codegen/emit-server.ts` (the file that produces
  `*.server.js`) emits zero SQL setup. No imports, no constructor, no
  module-level `_scrml_sql` binding.
- `<db src="contacts.db">` (the `<db>` element with src=) is also
  completely ignored by codegen (no `kind === "db"` handler in any
  emit-*.ts file).
- Looks like the design was: at build/dev time, **something** injects
  `_scrml_sql` into the module scope (perhaps via global). But neither
  `compiler/src/commands/dev.js` nor `compiler/src/commands/build.js`
  does this — they just `await import(fileUrl)` and let module-init
  fail silently (since `_scrml_sql` is only referenced INSIDE handler
  bodies, the ReferenceError fires at first invocation, not at import).

**This is OUT OF SCOPE for Bug 3** per the brief:
> "If you find a real auth-gate compiler bug during the fixture build,
> STOP and surface — that becomes a separate sub-dispatch."

It's not strictly an "auth-gate" bug, but it's a compiler bug surfaced
DURING the auth-gate fixture work, and fixing it requires designing
the SQL-injection mechanism end-to-end (driver kind → `import { SQL }
from "bun"` → constructor call → scope name routing for `<program
db=>` nested scopes vs file-level default). That's a 5-10h compiler
dispatch with SPEC-level alignment, not a fixture dispatch.

### Decision — PARTIAL with surfaced findings

Reverted all changes to `examples/03-contact-book.scrml`. The fixture is
back to its original (Bug 3 brief) shape. Returning the dispatch as
PARTIAL — the Bug 3 fixture work CANNOT complete to passing-e2e without
the SQL-emission fix landing first.

**Recommended PA follow-on dispatches:**
1. **Bug 3a — SQL emission compiler fix** (NEW sub-dispatch). Surface
   the missing `_scrml_sql` binding. Wire `<program db=>` connection
   string through `emit-server.ts` to produce
   `import { SQL } from "bun";` + `const _scrml_sql = new SQL(<connStr>);`
   at the top of each `*.server.js`. Handle SQLite path resolution
   relative to the source file. Match the `_dbScope` annotation already
   produced at `index.ts:367`. Bug 3 (fixture work) is gated on this.
2. **Bug 3 continuation** — once 3a lands, the original brief plan
   (multi-file conversion + add /login + scrml:auth + scrml:store) can
   land. The fixture work itself is straightforward; the compiler bug
   is the actual blocker.

### Final state

- No code changes to `examples/03-contact-book.scrml` or any compiler
  source. Tree clean except for `docs/changes/v0.3-batch-2-trio-b/progress-bug-3.md`.
- E2e for 03-contact-book remains in its prior state: AC1 passes (via
  known-noise allow-list); AC2-AC5 fail (auth gate AND latent SQL bug).
- Pre-test suite unchanged at 10,851 pass / 0 fail.

Maps consulted: `primary.map.md`, `structure.map.md` (via primary index
references). Load-bearing finding: maps had no SQL-emission entry, and
the absence of `auth.map.md` matches the briefing note ("auth lives in
stdlib/auth and user .scrml programs"). The SPEC.md §40.2 + §52.13 + §44.2
references + `compiler/src/codegen/index.ts:337` annotation site were the
actual load-bearing reads.
