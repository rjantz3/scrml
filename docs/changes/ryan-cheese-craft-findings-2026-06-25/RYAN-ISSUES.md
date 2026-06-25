# Upstream issues — bryanmaclee/scrml

10 paste-ready issue bodies (findings 01–09, 11). Finding 10 is omitted — it is
already fixed in v0.7.0 (`<schema>` feeds pre-analysis; see ISSUE-VALIDATION.md).

Each finding below was reproduced against scrml v0.7.0. To file: copy a `## NN`
block's title + body into the upstream tracker, or run `./file-issues.sh` (needs
`gh` + write access to bryanmaclee/scrml).

---

## 01
**Title:** v0.7.0: server-only stdlib import (scrml:auth/crypto/store) is emitted into the client bundle and crashes the page at load

**Body:**
Environment: scrml v0.7.0 · Bun 1.3.11

**Summary.** A page that imports a server-only stdlib module (`scrml:auth`,
`scrml:crypto`, `scrml:store`) and uses it only inside a server function still
emits the import into the client bundle as `const { x } = _scrml_stdlib.<mod>`.
The client runtime defines `const _scrml_stdlib = {}` (empty), so
`_scrml_stdlib.<mod>` is `undefined` and the destructure throws at module load —
taking down the whole page (blank/dead, no reactive wiring runs).

**Repro.**
```
<program db="m.db">
<db src="m.db" tables="items">
  ${
    import { createSessionStore } from 'scrml:store'
    <ids> = []
    function load() {
      const store = createSessionStore("sess.db") // server-only stdlib
      return ?{`SELECT id FROM items`}.all()
    }
    on mount { @ids = load() }
  }
  <ul><each in=@ids key=@.id as it><li>${it.id}</li><empty><li>none</li></empty></each></ul>
</>
</program>
```
`scrml compile A.scrml -o /tmp/A` then inspect `A.client.js`.

**Observed.** Client bundle contains `const { createSessionStore } =
_scrml_stdlib.store;` and the client runtime defines `const _scrml_stdlib = {};`.
`createSessionStore` is referenced only on the import line. At runtime:
`Cannot destructure property 'createSessionStore' of '_scrml_stdlib.store' as it
is undefined`.

**Expected.** A stdlib binding used only in server-classified functions should be
tree-shaken from the client bundle, or `_scrml_stdlib.<mod>` should be stubbed
client-side so the destructure yields `undefined` without throwing.

**Notes.** Reproduces in `examples/23-trucking-dispatch` (e.g.
`pages/customer/loads.client.js`). Blocks the entire scrml-stdlib auth pattern.

---

## 02
**Title:** v0.7.0: protect= on a `<db>` overrides `<page auth="optional">` and force-injects auth="required"

**Body:**
Environment: scrml v0.7.0 · Bun 1.3.11

**Summary.** A `<page auth="optional">` whose `<db>` declares `protect="<col>"`
gets auth middleware auto-injected as `auth="required"`, ignoring the page's
explicit `auth="optional"`. The `W-AUTH-001` warning even says *"File has
protect= fields but no explicit auth= attribute"* — but the page DID declare
`auth="optional"`, so the warning text is wrong and the page-level setting is
silently overridden.

**Repro.** `pages/login.scrml`:
```
<page auth="optional">
  <db src="../m.db" protect="label" tables="items">
    ${
      <email> = ""
      function loginServer(e) {
        const row = ?{`SELECT id FROM items WHERE label = ${e}`}.get()
        return { ok: row is some }
      }
      function submit() { const r = loginServer(@email) }
    }
    <form onsubmit=submit()><input bind:value=@email/></form>
  </>
</page>
```

**Observed.**
- Without `protect=`: `login.server.js` has **0** `_scrml_auth_check` calls —
  `auth="optional"` correctly exempts the page.
- With `protect="label"`: `W-AUTH-001` fires and `login.server.js` has **1**
  `_scrml_auth_check` — the page is gated despite `auth="optional"`.

**Expected.** `protect=` should respect an explicit `<page auth="optional">`
(protect the column from client serialization without forcing an auth gate), and
`W-AUTH-001` should not claim "no explicit auth= attribute" when one is present.

**Impact.** Direct cause of #03: to protect `password_hash` you add `protect=`,
which gates the login RPC itself.

---

## 03
**Title:** v0.7.0: a login page's own server-fn RPC is auth-gated → impossible to authenticate (chicken-and-egg)

**Body:**
Environment: scrml v0.7.0 · Bun 1.3.11

**Summary.** When a login page is auth-gated (via `<page auth="required">`, or —
more insidiously — via `protect=` force-injecting it, see #02), the compiler emits
`_scrml_auth_check` → `302 Location: /login` at the top of the page's own
server-fn handlers, including `loginServer`. The request meant to **create** the
session is rejected because there is no session yet. You can never log in.

**Observed.** The generated handler begins:
```
async function _scrml_handler_loginServer_NN(_scrml_req) {
  ...
  const _scrml_authResult = _scrml_auth_check(_scrml_req);
  if (_scrml_authResult) return _scrml_authResult; // 302 to /login, no session
  ...
}
```
and `_scrml_auth_check` returns `{ status: 302, headers: { Location: "/login" } }`.

**Expected.** The login/authentication RPC on the redirect-target page must be
reachable without a session — otherwise auth can never be bootstrapped. (Either
fix #02 so `protect=` doesn't gate an `auth="optional"` page, or exempt the
handlers of the loginRedirect page from the auth check.)

**Notes.** Reproduces in `examples/23-trucking-dispatch` —
`pages/auth/login.server.js`'s `loginServer` handler also starts with the
`_scrml_auth_check` → 302 guard, so the reference auth flow is itself
non-functional.

---

## 04
**Title:** v0.7.0: a pure fn exposed as an RPC compiles to async; server-side callers compare the unawaited Promise → silent wrong result

**Body:**
Environment: scrml v0.7.0 · Bun 1.3.11

**Summary.** A pure `fn` called from a server function gets an RPC route generated
and is emitted as `async function`. A server-side caller that uses its return
value synchronously (e.g. in a comparison) then operates on a `Promise`, not the
value. No `await` is inserted, no diagnostic fires → silently wrong result.
Especially nasty for auth: `storedHash != hashPw(input)` compares a string
against a Promise, always unequal, so login always fails with a correct password.

**Repro.**
```
<program db="m.db">
<db src="m.db" tables="items">
  ${
    fn tag(s: string) -> string { return `t${s}` }
    function check(name) {
      const row = ?{`SELECT id, label FROM items WHERE label = ${name}`}.get()
      if (row is not) return { miss: true }
      if (row.label != tag(name)) return { mismatch: true } // tag() is a Promise here
      return { ok: true }
    }
  }
  <button onclick=check("x")>go</button>
</>
</program>
```

**Observed.** Server bundle emits `async function tag(s) { ... }` and inside
`check()`: `if (!_scrml_structural_eq(row.label, tag(name))) { ... }` with no
`await`. `_scrml_structural_eq("t...", Promise)` is always false → the `!=` branch
always taken. (A standalone RPC call to `tag` returns the right value; the bug is
only on the in-process server-to-server call path.)

**Expected.** Either (a) a pure fn used purely in-process stays sync/inlined (no
RPC, no `async`), or (b) the caller must `await` it. Silently comparing against an
unawaited Promise should never happen.

---

## 05
**Title:** v0.7.0: `<db src>` resolves file-relative at compile time but cwd-relative at runtime (multi-dir projects can't share one path)

**Body:**
Environment: scrml v0.7.0 · Bun 1.3.11

**Summary.** A `<db>` `src=` path is interpreted file-relative during compile-time
pre-analysis (E-PA-002 resolves it against the `.scrml` file's directory) but is
emitted verbatim into the server bundle and opened cwd-relative at runtime
(`new SQL("sqlite:<src>")`). For a project where the entry file and pages live in
different directories, no single literal satisfies both, so pages silently open a
different (empty) database than the one the compiler validated against.

**Repro / evidence.** Entry `app.scrml` at root uses `src="./cheese_craft.db"`;
`pages/login.scrml` (one dir down) uses `src="../cheese_craft.db"` so both resolve
to the same file at compile time. Emitted:
```
app.server.js:   new SQL("sqlite:./cheese_craft.db")
login.server.js: new SQL("sqlite:../cheese_craft.db")
```
Run dev from project root (cwd = root):
- app opens `./cheese_craft.db` → `root/cheese_craft.db` ✅
- login opens `../cheese_craft.db` → `root/../cheese_craft.db` ❌ (parent dir; a
  fresh empty DB is created) → `Error: no such table: users` at login.

Using bare `src="cheese_craft.db"` everywhere makes runtime correct but compile
fails for the subdir page: `E-PA-002: Database file .../pages/cheese_craft.db does
not exist`.

**Expected.** Resolve `<db src>` consistently — ideally project-root-relative (or
relative to the compiled bundle location) in both phases.

**Notes.** `examples/23-trucking-dispatch` has the same latent issue
(`pages/*/*.scrml` use `../../dispatch.db`, `app.scrml` uses `./dispatch.db`).

---

## 06
**Title:** v0.7.0: compound validated-form bind:value=@form.field does not establish two-way binding (input stays empty, isValid stuck false)

**Body:**
Environment: scrml v0.7.0 · Bun 1.3.11

**Summary.** With a compound validated form (`<form>` declaring sub-fields with
`req`/`pattern` validators), binding an `<input>` via `bind:value=@form.field`
does not wire two-way binding to the sub-field. Typing leaves both the input's
value and the bound cell empty, so the synthesized `@form.isValid` stays false and
a `disabled=!@form.isValid` submit button never enables.

**Repro shape.**
```
${
  <loginForm>
    <email req pattern(/^[^@]+@[^@]+$/)> = <input type="email"/>
    <password req> = <input type="password"/>
  </>
}
...
<form onsubmit=submit()>
  <input id="login-email" type="email" bind:value=@loginForm.email/>
  <errors of=@loginForm.email/>
  <button type="submit" disabled=!@loginForm.isValid>Sign in</button>
</form>
```

**Observed (root cause in codegen).** The source cell is `loginForm.email`
(`_scrml_reactive_set("loginForm.email", null)`), and `loginForm` is a **derived**
cell (`() => ({ email: get("loginForm.email"), ... })`). The generated `input`
handler writes to the derived parent, never to the source sub-field:
```
addEventListener("input", (e) =>
  _scrml_reactive_set("loginForm", _scrml_deep_set(get("loginForm"), ["email"], e.target.value)))
```
So `loginForm.email` stays `null`, `errors`/`isValid` never recompute, and the
value-effect `el.value = get("loginForm").email` pins the input back to empty.

**Expected.** `bind:value=@loginForm.email` should two-way bind the input to the
compound sub-field (write the source `loginForm.email`), updating the value and the
synthesized validity surface as the user types.

---

## 07
**Title:** v0.7.0: if=(@x is some) does not stop inner ${@x.field} reactive effects from running on first mount → null-access crash

**Body:**
Environment: scrml v0.7.0 · Bun 1.3.11

**Summary.** A cell initialized to `not` (absence) and populated asynchronously
(e.g. `on mount { @x = fetchServer(...) }`) cannot be safely guarded with
`<div if=(@x is some)> ... ${@x.field} ... </div>`. The compiler wires and runs
the inner text-interpolation effects on first mount — before the data loads — so
`${@x.field}` evaluates `null.field` and throws.

**Repro shape.**
```
${
  <batch> = not
  function refresh() { @batch = fetchBatchDetail(...) } // server fn, async
  on mount { refresh() }
}
...
<div if=(@batch is some)>
  <h1>Batch #${@batch.batch_number} — ${@batch.recipe_name}</h1>
</div>
```

**Observed (codegen).** On first render with `batch === null`, the client emits
and runs synchronously:
```
_scrml_render_value(el, _scrml_reactive_get("batch").batch_number);          // throws
_scrml_effect(() => _scrml_render_value(el, _scrml_reactive_get("batch").batch_number));
```
The `if` guard only drives `el.style.display = ... ? "" : "none"`. Browser throws
`Cannot read properties of null (reading 'batch_number')`.

**Expected.** An `if=` guard should gate its subtree's reactive effects — inner
expressions should not evaluate while the guard condition is false. (Same class as
the documented match-arm-body reactive-effect gaps.)

---

## 08
**Title:** v0.7.0: ?{} SQL block inside an arrow-function body → E-CODEGEN-INVALID-JS

**Body:**
Environment: scrml v0.7.0 · Bun 1.3.11

**Summary.** Placing a `?{}` SQL block inside an arrow-function body (a local
helper closure) makes the compiler emit JavaScript it cannot itself parse, failing
with `E-CODEGEN-INVALID-JS`.

**Repro.**
```
<program db="m.db">
<db src="m.db" tables="items">
  ${
    function doit() {
      const ins = (x) => { ?{`INSERT INTO items (id) VALUES (${x})`}.run() }
      ins(1)
    }
  }
  <button onclick=doit()>go</button>
</>
</program>
```

**Observed.**
```
error [E-CODEGEN-INVALID-JS]: the compiler emitted JavaScript it cannot itself parse.
  artifact: B-arrow-sql.server.js
FAILED — 1 error
```
The emitted server fragment mangles the arrow body around the `?{}` lowering.

**Expected.** `?{}` inside an arrow body should lower correctly, or be rejected
with a precise, actionable diagnostic (not "please report a compiler bug").

---

## 09
**Title:** v0.7.0 (DX): common local names (batches, recipes) collide with `<state>` cells inside server fns — is the shared namespace intended?

**Body:**
Environment: scrml v0.7.0 · Bun 1.3.11

**Summary.** A local `const` inside a server function cannot reuse the name of any
`<state>` cell declared in the same `${}` block — it errors with
`E-NAME-COLLIDES-STATE` (V5-strict, §6.1.3). Likely working-as-intended, but a
recurring papercut: a list page naturally has a `<batches>` render cell and a
server fn that builds `const batches = ?{...}.all()`.

**Repro shape.**
```
${
  <batches> = []
  function fetchBatchesServer(tok) {
    const batches = ?{`SELECT ... FROM batches`}.all() // E-NAME-COLLIDES-STATE
    return { batches: batches }
  }
}
```

**Question / suggestion.** If intended, consider scoping the prohibition to the
render/markup context rather than the interior of server functions (where the
local can't be confused with the reactive cell), since natural naming (`batches`,
`recipes`, `steps`) collides constantly. If kept as-is, a one-line note in the
error suggesting the `Rows`-suffix convention would help. (Lowest priority.)

---

## 11
**Title:** v0.7.0 (DX): `scrml generate auth` scaffolds pages/auth/login.scrml, but the default loginRedirect is /login (routes don't match)

**Body:**
Environment: scrml v0.7.0 · Bun 1.3.11

**Summary.** The default auth redirect target (`loginRedirect`) is `/login`, and
`W-AUTH-LOGIN-MISSING` / `I-AUTH-REDIRECT-UNRESOLVED` fire unless a page resolves
to exactly `/login`. But `scrml generate auth` scaffolds the login page at
`pages/auth/login.scrml`, which routes to `/auth/login`, not `/login`. Following
the generator produces an app whose auth gate redirects to a route no page serves
(runtime 302 → 404), and the lint nudges you toward the very file the generator
created.

**Repro / evidence.** `scrml generate auth` prints `login route: /login` and
`created pages/auth/login.scrml`. Compiling with `<program auth="required">`:
```
info [I-AUTH-REDIRECT-UNRESOLVED] Auth gate redirect target "/login" does not match
  any page URL pattern ... Run `scrml generate auth` to scaffold a working login
  page at `pages/auth/login.scrml`.
warning [W-AUTH-LOGIN-MISSING] ... no page matches ... "/login". ... 302 to a 404.
  Run `scrml generate auth` ...
```
Moving the file to `pages/login.scrml` (route `/login`) resolves it.

**Expected.** Make these consistent: either `scrml generate auth` should scaffold
`pages/login.scrml` (matching the default redirect), or the default
`loginRedirect` should be `/auth/login` (matching the generator), or the `auth/`
segment should be special-cased so `pages/auth/login.scrml` serves `/login`.
(Lowest priority; convention mismatch on the documented "generate auth → add
auth=required" path.)
