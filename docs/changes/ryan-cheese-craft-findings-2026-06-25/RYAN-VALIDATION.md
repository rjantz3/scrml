# Issue Validation — ALL-FINDINGS (scrml v0.7.0 port findings)

Validation of the 11 findings in `ALL-FINDINGS.md` (authored during the Cheese
Craft port, `rjantz3/cheese_craft`) against this repository's compiler.

- Compiler: scrml v0.7.0 (`package.json`). Originally validated at `2111f9a`;
  **revalidated after rebasing onto upstream-synced `origin/main` `2a4bf8a`**
  (adds s219 `<endpoint>` SPEC §61 + bookkeeping). All 11 verdicts below are
  unchanged on the new base — the new commits do not touch any finding area.
- Method: each finding re-reproduced from its standalone repro (or an equivalent
  minimal one) using `bun run compiler/src/cli.js compile|generate …` and
  inspecting the emitted artifacts / diagnostics. Browser-runtime findings (06,
  07) were validated by inspecting the generated client codegen, which is
  conclusive on its own.

## Summary

| # | Finding (short) | Verdict | How confirmed |
|---|-----------------|---------|---------------|
| 01 | server-only stdlib import leaks into client bundle, crashes page | **VALID** | client bundle emits `const { createSessionStore } = _scrml_stdlib.store;` while client runtime defines `const _scrml_stdlib = {};` (empty) |
| 02 | `protect=` overrides `<page auth="optional">`, forces `auth="required"` | **VALID** | with `protect=`: W-AUTH-001 fires (wrong "no explicit auth=" text) + 1 `_scrml_auth_check`; without: 0 |
| 03 | login page's own RPC is auth-gated → can't authenticate | **VALID** | `loginServer` handler begins with `_scrml_auth_check` → `302 Location:/login` (static codegen) |
| 04 | pure `fn` exposed as RPC → `async`; server caller compares unawaited Promise | **VALID** | server emits `async function tag(...)` + `_scrml_structural_eq(row.label, tag(name))` with no `await` |
| 05 | `<db src>` file-relative at compile, cwd-relative at runtime | **VALID** | emitted verbatim: `app.server.js → sqlite:m.db`, `login.server.js → sqlite:../m.db` |
| 06 | compound validated-form `bind:value=@form.field` not two-way | **VALID** | input handler writes to derived `loginForm` cell, never to source `loginForm.email`; value-effect pins input back to empty |
| 07 | `if=(@x is some)` doesn't gate inner `${@x.field}` effects → null crash | **VALID** | inner `_scrml_render_value(el, get("batch").batch_number)` runs synchronously on mount while `batch === null`; guard only toggles `el.style.display` |
| 08 | `?{}` SQL inside arrow-function body → E-CODEGEN-INVALID-JS | **VALID** | reproduces exactly: `error [E-CODEGEN-INVALID-JS]` |
| 09 | local `const` collides with `<state>` cell name (E-NAME-COLLIDES-STATE) | **VALID** (DX / as-intended) | reproduces exactly; finding itself flags it lowest-priority |
| 10 | `<schema>` doesn't satisfy pre-analysis; physical `.db` still required | **RESOLVED / NOT REPRODUCIBLE** | with `<schema>`, E-PA-002 is suppressed and compile succeeds; source `protect-analyzer.ts:452-461` walks `<schema>` blocks to feed PA |
| 11 | `scrml generate auth` scaffolds `pages/auth/login.scrml` but default redirect is `/login` | **VALID** | generator prints "login route: /login" + "created pages/auth/login.scrml"; compile emits I-AUTH-REDIRECT-UNRESOLVED + W-AUTH-LOGIN-MISSING for `/login` |

**10 of 11 reproduce on the current tree. Finding 10 is already fixed here** —
`<schema>` now feeds compile-time pre-analysis, exactly the feature it requested.

## Details

### 01 — stdlib leak into client bundle — VALID
Client bundle: `const { createSessionStore } = _scrml_stdlib.store;` (only
reference is the import line; no client code uses it). Client runtime defines
`const _scrml_stdlib = {};` so `_scrml_stdlib.store` is `undefined` and the
destructure throws at module load, blanking the page. Reproduced with
`repros/A-stdlib-leak.scrml`.

### 02 — protect= overrides auth="optional" — VALID
Control (no `protect=`): `login.server.js` has **0** `_scrml_auth_check` calls —
`auth="optional"` correctly exempts the page. With `protect="label"`:
`W-AUTH-001` fires claiming *"no explicit auth= attribute"* (false — the page
declares `auth="optional"`) and `login.server.js` gains **1** `_scrml_auth_check`.

### 03 — login RPC auth-gated (chicken-and-egg) — VALID
The generated `_scrml_handler_loginServer_*` begins with
`const _scrml_authResult = _scrml_auth_check(_scrml_req); if (_scrml_authResult)
return _scrml_authResult;`, and `_scrml_auth_check` returns
`{ status: 302, headers: { Location: "/login" } }`. The request meant to create
the session is redirected before it runs. Confirmed statically from codegen.

### 04 — pure fn → async, unawaited Promise compare — VALID
`tag` is emitted as `async function tag(s)` and the in-process caller emits
`if (!_scrml_structural_eq(row.label, tag(name)))` with **no `await`** — a string
is compared against a `Promise`, always unequal. No diagnostic. (Auth impact: a
`storedHash != hashPw(input)` check always "mismatches".)

### 05 — db src resolution mismatch — VALID
With `src="m.db"` (entry) and `src="../m.db"` (subdir page) the server bundles
emit `sqlite:m.db` and `sqlite:../m.db` verbatim. Both resolve to the same file
at compile time (file-relative PA) but diverge at runtime (cwd-relative open):
run from project root, the subdir page opens `../m.db` (parent dir → wrong/empty
DB). No single literal satisfies both phases.

### 06 — compound-form two-way binding — VALID
Source cell is `loginForm.email` (`_scrml_reactive_set("loginForm.email", null)`)
and `loginForm` is **derived** (`() => ({ email: get("loginForm.email"), … })`).
The generated `input` handler writes to the derived parent:
`_scrml_reactive_set("loginForm", _scrml_deep_set(get("loginForm"), ["email"],
event.target.value))` — it never updates the source `loginForm.email`. So
`loginForm.email` stays `null`, `loginForm.email.errors`/`isValid` never
recompute (isValid stuck false), and the value-effect
`el.value = get("loginForm").email` pins the input back to empty.

### 07 — if-guard doesn't gate inner effects — VALID
For `<div if=(@batch is some)> … ${@batch.batch_number} … </div>` with
`<batch> = not`, the client emits, executed on first mount with `batch === null`:
```
_scrml_render_value(el, _scrml_reactive_get("batch").batch_number);          // throws
_scrml_effect(() => _scrml_render_value(el, _scrml_reactive_get("batch").batch_number));
```
The `if` guard only drives `el.style.display = … ? "" : "none"`. The inner
interpolation effect runs unconditionally → `Cannot read properties of null
(reading 'batch_number')`.

### 08 — ?{} in arrow body → E-CODEGEN-INVALID-JS — VALID
`const ins = (x) => { ?{`…`}.run() }` produces
`error [E-CODEGEN-INVALID-JS]: the compiler emitted JavaScript it cannot itself
parse.` Reproduced with `repros/B-arrow-sql.scrml`.

### 09 — name collision with state cell — VALID (DX)
`const batches` inside a server fn, with a `<batches>` cell, errors
`E-NAME-COLLIDES-STATE … shadows registered state cell <batches> (V5-strict,
SPEC §6.1.3)`. Reproduces; the finding flags it lowest-priority / likely intended.

### 10 — `<schema>` and pre-analysis — RESOLVED (not reproducible)
The finding claims `<schema>` does not satisfy PA and a seeded `.db` is still
required (E-PA-002/E-PA-004). On this tree the opposite holds:
- No `<schema>`, missing DB → `error [E-PA-002] … no CREATE TABLE … for table users`.
- **With `<schema>`**, missing DB → `Note(PA): … does not exist. Using in-memory
  schema … for compile-time validation.` and **compile succeeds**.

`protect-analyzer.ts:452-461` walks `<schema>` blocks, parses their DDL via
`schema-differ.parseSchemaBlock`, and synthesizes CREATE TABLE statements for PA
— "closing the schema-is-code promise of §39". The requested feature is
implemented. (Note: validation of bad columns/tables against `<schema>` is
lenient when the DB is absent, so the in-memory path validates table *presence*
more than column shapes — a possible follow-up, but distinct from finding 10.)

### 11 — generate-auth route mismatch — VALID
`scrml generate auth` prints `login route: /login` and `created
pages/auth/login.scrml` (route `/auth/login`). Compiling with
`<program auth="required">` then emits both
`I-AUTH-REDIRECT-UNRESOLVED: … target "/login" does not match any page URL
pattern …` and `W-AUTH-LOGIN-MISSING: … 302 to a 404. Run \`scrml generate
auth\` …` — i.e. the lint points back at the same generator that produced the
non-matching path. Mismatch confirmed.
