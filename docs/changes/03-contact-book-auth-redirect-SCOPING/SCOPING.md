# SCOPING — `<program auth="required">` without a working /login page

**Date:** 2026-05-14 (S91-mid)
**Status:** SCOPING — fix-shape catalog + recommendation
**Filed against:** v0.2.x latent bug — `examples/03-contact-book.scrml` declares
`<program auth="required">` (line 7) but no `/login` page exists in the
compilation unit, and the runtime auth-redirect target therefore 404s.
**Surfaced by:** S86 Wave 3 D2 Playwright e2e tests
(`e2e/tests/03-contact-book.spec.ts:40-75` — tolerance scaffolding).
**Feeds into:** v0.2.x patch / Wave 3.5 triage; PA ratification of OQs.

---

## 1. Scope lock

### Question

When `<program auth="required">` is declared and no `/login` page exists in the
compilation unit, what should the compiler and runtime do?

### What's broken (confirmed via investigation)

`examples/03-contact-book.scrml:7` declares `<program auth="required">`. There
is no `/login.scrml` in the compilation unit. The compile + runtime behavior
that results:

1. **Compile-time:** `route-inference.ts:2443` sets `loginRedirect = "/login"`
   (the SPEC §40.4 / §52.13 default). `auth-graph.ts:452-491` cross-references
   the redirect target against `RouteMap.pages`; the single-file 03-contact-book
   maps to URL pattern `/` (route-inference.ts:2534), so the `/login` redirect
   target does NOT match. `I-AUTH-REDIRECT-UNRESOLVED` fires as **info-level
   lint** (auth-graph.ts:478-489). The compile succeeds with info-only
   diagnostic.
2. **Runtime — page load:** Dev server (`commands/dev.js:350-442`) serves
   `/03-contact-book.html` as a static file. NO `_scrml_auth_check` is
   inserted for static page requests. The page renders.
3. **Runtime — client render-pass server-fn fetches:** The for-loop over
   `loadContacts()` fires a fetch to the compiler-generated server-fn route
   (`_scrml/fn/loadContacts` or similar). `loadContacts` is a `GET`
   (read-only `?{SELECT}`), and `_scrml_auth_check` is ONLY inserted on
   state-mutating routes per `emit-server.ts:749`. So a GET server-fn does
   NOT enforce auth at the server. The fetch returns data normally — but the
   route registration race during cold-start can also hit the static-file
   fallback path which returns "Not found" 404.
4. **Runtime — `addContact()` POST:** State-mutating POST. `_scrml_auth_check`
   fires (emit-server.ts:751). Returns `302 Location: /login`. `fetch()`
   follows the redirect by default → dev server has no `/login` registration →
   404 "Not found" (commands/dev.js:442). The client receives `Not found` as
   the response body and attempts `JSON.parse("Not found")` → SyntaxError.

### Test scaffolding evidence (load-bearing)

`e2e/tests/03-contact-book.spec.ts:50-72` documents the symptoms verbatim:

```
//   - "Failed to load resource: ... 404" on /_scrml/__ri_route_*
//   - "_scrml_fetch_loadContacts_N is not a function..."
//   - "Unexpected token 'N', \"Not found\" is not valid JSON" (response parse)
```

The tests tolerate this noise per AC5 fallback — but per Rule 2
(production-fidelity), tolerance is not closure.

### In scope

- Behavior when `<program auth="required">` is declared without a `/login`
  page in the compilation unit (single-file or routes/-tree).
- Compile-time diagnostics (current: `I-AUTH-REDIRECT-UNRESOLVED` info).
- Runtime auth-check + redirect target resolution.
- v0.2.x patch path (compatible with the existing `_scrml_auth_check`
  emission shape and OQ-A2-E ratified S89 constraint).
- The 03-contact-book example specifically — what minimal-disruption fix
  removes the test tolerance.

### Out of scope

- **OQ-A2-E walk-back.** Compiler-side entry-point synthesis from auth-redirect
  targets is HARD-RATIFIED (S89). Any proposal that synthesizes a new
  `<page>` entry-point IS a v0.3+ design proposal, not a v0.2.x patch. We
  surface it as a proposal for completeness but flag the design-debt cost.
- **Role-based auth at `<page auth="role:X">`.** F-AUTH-001 (still P0 open
  per FRICTION.md:7 — W-ATTR-002 closed the silent-failure window S52, but
  the semantic remains unimplemented). Out of scope.
- **Session storage backend.** session-auth.md OQ-1; orthogonal.
- **CSRF behavior.** Already covered by `csrf="auto"` / W-AUTH-001 (§40.2,
  §52.13).
- **Page-load auth enforcement gap.** The dev server bug (no `_scrml_auth_check`
  on static page serve) is its own latent bug — file separately. We touch it
  only insofar as Proposals A-D interact with the redirect path.
- **Production server middleware shape.** v0.2.x dev-server scope only;
  `scrml build` + adopter-deployed-Bun server is a separate concern.

### Already known (from research)

- SPEC §52.13: `auth="required"` is normatively defined as "unauthenticated
  requests are redirected to `loginRedirect=` (default `/login`)".
- `I-AUTH-REDIRECT-UNRESOLVED` (S91 A-3.5 catalog row §34, §40.1.1) already
  surfaces missing redirect targets as **info-level** lint.
- OQ-A2-E (ratified S89): no entry-point synthesis on auth-redirect. The
  redirect target IS its own entry-point if it exists; absence is the
  page-author's concern.
- OQ-A3-B (a) (ratified S90): bare-string disposition for redirect-target
  storage; consumer (A-2.5) resolves to EntryPointId via RouteMap.pages
  lookup.
- Trucking-dispatch (`examples/23-trucking-dispatch/`) is the canonical
  adopter pattern: separate `pages/auth/login.scrml` with `<page auth="optional">`
  override + inline `loginServer()` server fn (F-AUTH-002 cross-file
  workaround).
- `stdlib/auth/` exists (`scrml:auth` module — hashPassword, verifyPassword,
  generateTotpSecret, createRateLimiter, JWT helpers) but ships NO login-page
  template / scaffold.

### Need to find out (resolved by this scoping)

1. Should the compile-time signal be info, warning, or error? (Approach C
   argues error; current state argues info.)
2. Is an auto-generated /login page (Approach B) viable given OQ-A2-E
   ratification?
3. Is a stdlib `scrml generate auth` CLI command (Approach E — added during
   investigation) the right "right answer per Rule 3" given that Rails,
   Phoenix, Laravel, ASP.NET, and Devise all converged on this pattern?

---

## 2. Investigation findings

### 2.1 The four layers where the bug currently surfaces

| Layer | File / line | Behavior |
|---|---|---|
| Spec | `compiler/SPEC.md` §52.13 / §40.4 | Normatively states `auth="required"` redirects to `loginRedirect=` (default `/login`). SPEC does NOT mandate the adopter author a /login page; the gap is implicit. |
| Compile-time lint | `compiler/src/auth-graph.ts:452-491` | `I-AUTH-REDIRECT-UNRESOLVED` info-lint already fires when redirect target not in RouteMap.pages. Severity: info. Per OQ-A2-E + OQ-A3-B (a): MUST stay info. |
| Server codegen | `compiler/src/codegen/emit-server.ts:398-453` | Always emits `_scrml_auth_check()` that returns `302 Location: <loginRedirect>` on missing session. Hard-codes assumption that `loginRedirect` resolves. |
| Dev server runtime | `compiler/src/commands/dev.js:442` | Returns plain text `"Not found"` 404 for any unregistered path including `/login`. No JSON shape; no body; not an HTML response. |

### 2.2 The auth-check is selectively wired (orthogonal bug)

`emit-server.ts:749` only inserts `_scrml_auth_check` on **state-mutating**
server-fn routes (POST/PUT/PATCH/DELETE). GET fns + SSE handlers carry the
auth check too (line 673-676), but the **static HTML page itself is never
auth-checked** at the dev-server layer — `commands/dev.js:399-422` serves
HTML files as static assets without consulting `_scrml_auth_check`.

This is a **separate latent bug** from the /login-page gap. We flag it as
**out of scope** for this SCOPING but note that any fix to the redirect path
should be compatible with closing it later. Filed at OQ-7.

### 2.3 The canonical adopter pattern works

`examples/23-trucking-dispatch/` is a 9-file multi-page auth-bearing app. It
authors `pages/auth/login.scrml` (138 LOC) with:

```scrml
<page db="../../dispatch.db" auth="optional">
  <db src="../../dispatch.db" protect="password_hash" tables="users">
    ${
      <email> = ""
      <password> = ""
      <errorMessage> = ""
      <submitting> = false

      function loginServer(emailArg, passwordArg) {
        const row = ?{`SELECT id, email, password_hash, role FROM users WHERE email = ${emailArg}`}.get()
        if (row is not) return { error: "Invalid email or password" }
        const ok = verifyPassword(passwordArg, row.password_hash)
        if (not ok) return { error: "Invalid email or password" }
        // ... session creation, redirect ...
      }
      // ... submit() client fn ...
    }
    // <form>+inputs+errorMessage+submit ...
  </>
</page>
```

The `<page auth="optional">` override (line 18) is the load-bearing primitive
that lets `/login` be reachable WITHOUT a session under the global
`<program auth="required">` gate declared in `app.scrml:29`. F-AUTH-002
(`FRICTION.md:46`) blocks factoring this into `models/auth.scrml` —
cross-file `?{}`-using server fns hit E-SQL-004 (partially resolved W5
2026-04-30 but the SQL-using-fns-cross-file path is still inline only). So
the canonical pattern is **page-local inline `loginServer()`**, ~50-80 LOC
of glue per adopter.

### 2.4 The bug is invisible to the adopter in 03-contact-book

03-contact-book's `<program auth="required">` was authored on the assumption
that the example file would self-contain. The author did not also write a
`/login.scrml` and did not encounter friction at compile time loud enough
to course-correct: `I-AUTH-REDIRECT-UNRESOLVED` is **info-level** (it
doesn't even print by default in many CLI configurations — info messages
are typically suppressed unless `--verbose` is passed). The first signal the
adopter sees is the e2e test tolerance scaffolding telling them to
**tolerate the symptom rather than fix it**.

This is a textbook silent-failure-window per the systemic-silent-failure-sweep
deep-dive (2026-04-30). The validation principle should apply: silent
acceptance of a compile-time configuration that cannot succeed at runtime is
itself a P0 finding.

### 2.5 Prior art — universal pattern

| Framework | Mechanism | Trigger | Adopter ownership |
|---|---|---|---|
| Rails (Devise) | `rails generate devise:views` | Explicit CLI command | Generated views land in `app/views/devise/` — adopter owns + edits |
| Phoenix | `mix phx.gen.auth` | Explicit Mix task | Generates User schema + LiveView pages + plugs — adopter owns ALL of it |
| Laravel | `php artisan ui bootstrap --auth` (was `make:auth`) | Explicit Artisan command | Bootstrap/Vue/React views generated to `resources/views/auth/` |
| ASP.NET Core | Scaffold Identity (Visual Studio CLI or VS tool) | Explicit scaffold action | `Areas/Identity/Pages/Account/Login.cshtml` etc. generated; adopter owns |
| SvelteKit (Auth.js) | Adopter writes `+page.server.ts` + `pages: { signIn: '/login' }` config | Adopter-authored | Adopter writes the entire login page; library provides API |
| Next.js (Auth.js) | Adopter writes `app/login/page.tsx` or uses default sign-in route | Adopter-authored | Same |

**Pattern that emerges from every mature ecosystem:** the framework provides
EITHER (a) a GENERATOR that writes adopter-owned source code on explicit
request, OR (b) requires the adopter to author the page from scratch. NO
framework auto-generates the login page implicitly at compile time. This is
because:

- Login form shape varies wildly (email vs. username, social, magic link, 2FA…).
- Schema-coupling: the login fn must query the user table, which the framework
  doesn't know about.
- Session-store coupling: the login fn must write to whatever session store
  the adopter chose.

scrml's situation is similar — the adopter's schema is the load-bearing input
that determines login-form shape. **Auto-injection at compile time is not
viable.** Generators-on-demand are.

### 2.6 Existing-decision constraint cascade

| Decision | Source | Constraint imposed on this scoping |
|---|---|---|
| OQ-A2-E (ratified S89) | a2-reachability-solver-scoping/SCOPING.md:448 | NO entry-point synthesis on auth-redirect. Auto-generating /login as a new `<page>` entry-point violates this unless explicitly walked back. |
| OQ-A3-B (a) (ratified S90) | a3-auth-graph-scoping/SCOPING.md:458 | Redirect target stored as bare-string path; resolution is a consumer-side LOOKUP, never synthesis. |
| I-AUTH-REDIRECT-UNRESOLVED severity = info | SPEC §34 row + §40.1.1 (S91 A-3.5) | Cannot escalate to error in v0.2.x patch without walking back the catalog row. Could plausibly upgrade to WARNING. |
| `<program auth="required">` semantic | SPEC §52.13 | Normatively redirects to `loginRedirect=` default `/login`. The semantic is fixed; only the failure-mode when target is absent is open. |
| `<page auth="optional">` override exists | trucking-dispatch pages/auth/login.scrml:18 | Adopter can suppress the global gate on a specific page — this is how /login becomes reachable. |

---

## 3. Fix-shape proposals

Investigation surfaced **5 distinct proposals** (the brief's 4 candidates
plus one new — Proposal E, generator-on-demand — which prior art unanimously
endorses).

### Proposal A — Upgrade `I-AUTH-REDIRECT-UNRESOLVED` to a WARNING + adopter writes /login

**What changes in `compiler/src/`:**
- `compiler/src/auth-graph.ts:478-489` — change `severity: "info"` to
  `severity: "warning"` (or introduce new code `W-AUTH-REDIRECT-UNRESOLVED`
  layered on top of I- so both fire). ~10 LOC.
- `compiler/src/types/auth-graph.ts:178` + similar — add the new severity
  literal to the type union. ~2 LOC.

**What changes in `examples/03-contact-book.scrml`:**
- Adopter must EITHER add a sibling `/login.scrml` (multi-file restructure
  — the example becomes a routes/-tree, not a single-file demo), OR drop
  the `<program auth="required">` opener and re-author as a demo without
  auth.

**What changes in SPEC.md:**
- §34 catalog row + §40.1.1 prose: change "Info" to "Warning" (or add the
  W- code). Adjust normative phrasing: "The compiler SHALL emit
  W-AUTH-REDIRECT-UNRESOLVED when …". ~30 LOC.
- §40.4 normative addition: "Adopters declaring `<program auth="required">`
  SHOULD provide a page whose URL pattern matches `loginRedirect=` (default
  `/login`). When absent, the auth-check emits a 302 redirect to a path that
  resolves to a 404 — the gate succeeds at the request layer but produces a
  broken UX." ~5 LOC.

**Adopter experience:**
- Adopter sees `W-AUTH-REDIRECT-UNRESOLVED` warning at compile time. The
  warning prose tells them they need to author a login page. The warning is
  loud enough that test-tolerance scaffolding goes away (the adopter fixes
  it instead of tolerating it).
- Stdlib provides NOTHING (no template, no generator). Adopter writes
  ~80-138 LOC of login.scrml from scratch, matching trucking-dispatch's
  pattern.

**v0.2.x scope:** Compile-time only. Runtime behavior unchanged. Zero
breaking changes for existing apps (warnings are non-blocking; existing
trucking-dispatch already has /login so it never trips).

**Effort estimate:** **0.5-1h** (compiler + types + SPEC + tests).

**Risks:**
- Adopter STILL has to write 80+ LOC of login boilerplate. The warning
  doesn't reduce that floor. trucking-dispatch's F-AUTH-002 friction
  (inline-duplicated login fn) is still load-bearing.
- Warning catalog grows by 1 entry. Tolerable.
- DX is still poor — Rule 3 ("right answer beats easy answer") argues
  against this as the SOLE fix.

---

### Proposal B — Compiler auto-generates a default `/login` page

**What changes in `compiler/src/`:**
- `compiler/src/auth-graph.ts` or new pass `compiler/src/codegen/emit-login-fallback.ts`:
  when `<program auth="required">` is declared and no page resolves to
  `loginRedirect=`, synthesize a default login page entry-point with a
  minimal form. ~150-250 LOC.
- `compiler/src/route-inference.ts:2429-2488` — extend RouteMap.pages with
  synthesized page. ~30 LOC.
- `compiler/src/codegen/emit-client.ts` + `emit-server.ts` — emit
  synthesized page's HTML + client + server bundle. ~80 LOC.
- Stdlib template under `stdlib/auth/login-default.scrml` — the canonical
  shape the synthesizer reproduces. ~80 LOC.

**What changes in `examples/03-contact-book.scrml`:**
- Nothing. The compiler auto-generates `/login` from the existing source.
- BUT — what does the auto-generated form POST to? The adopter has no
  declared `loginServer()` fn. The synthesizer would have to either
  (a) synthesize a default `loginServer()` that queries a "users" table
  if one exists, or (b) emit a stub that returns `{ error: "Login not
  configured" }`. Both are wrong defaults for a real app.

**What changes in SPEC.md:**
- §40.4 amendment: "When `<program auth="required">` is declared and no
  page resolves to `loginRedirect=`, the compiler SHALL synthesize a
  default login page at the redirect path." ~10 LOC.
- §40.1.1 amendment: WALK BACK OQ-A2-E ratification for the specific case
  of compiler-synthesized login. ~20 LOC + spec-amendment vote.
- §40.9 closure-analysis amendment: synthesized entry-point participates in
  the playable-surface analysis. ~15 LOC.

**Adopter experience:**
- Magic for the trivial case. 03-contact-book gets a generic `/login`
  with an email + password form for free. The 4xx noise goes away.
- BREAKS the moment the adopter wants real auth: their schema's user table
  isn't named `users` or doesn't have `password_hash` or uses a session
  store the synthesizer doesn't know about. They have to override
  EVERYTHING the synthesizer generated, AND the override path is unclear
  (do they author a `/login.scrml` that conflicts? Does an explicit-page
  override silently win?).
- The auto-generated login is a TRAP — it works in the demo, breaks in
  production, and the adopter doesn't know which they're hitting.

**v0.2.x scope:** Both compile-time AND runtime. Spec amendment required.

**Effort estimate:** **8-16h** (synthesizer + stdlib template + RI plumbing
+ SPEC amendment vote + closure-analysis interaction + 8-12 tests). Plus
significant design-debt: the synthesized-entry-point invariant is now
load-bearing in three other passes (RS Component 4, closure analysis,
codegen).

**Risks:**
- **OQ-A2-E walk-back** is the load-bearing ratification cost. Three other
  passes (RS Component 4, A-3.4, A-4) currently assume "no synthesis"; each
  must re-validate.
- Adopters get a working-looking-but-broken login that fails silently when
  they try to actually authenticate.
- The "what schema does it assume?" problem is unsolvable in the general
  case — no framework auto-generates implicitly for exactly this reason.
- Override semantics (adopter-authored /login vs. compiler-synthesized
  /login) are non-trivial and easy to get wrong.
- Prior-art universal rejection: zero mature frameworks do this implicitly.

---

### Proposal C — Hard compile error when `/login` is missing

**What changes in `compiler/src/`:**
- `compiler/src/auth-graph.ts:478-489` — change severity to `"error"` and
  rename code to `E-AUTH-REDIRECT-UNRESOLVED`. ~10 LOC.
- `compiler/src/api.js` Stage 7.55 — error must bubble to compilation
  failure. ~5 LOC.

**What changes in `examples/03-contact-book.scrml`:**
- Adopter is FORCED to provide `/login` (or drop `<program auth="required">`)
  before they can compile.

**What changes in SPEC.md:**
- §34 catalog row: change Info → Error; rename code to E-. ~5 LOC.
- §40.1.1 prose: WALK BACK "the redirect target is the page author's
  concern, not a compile error" from OQ-A2-E disposition. The OQ-A2-E
  ratification is partial — "no entry-point synthesis" stays; but "is the
  page author's concern" gets re-classified from "info" to "error". ~15 LOC.
- §40.4 normative: "Adopters declaring `<program auth="required">` SHALL
  provide a page whose URL pattern matches `loginRedirect=`." ~5 LOC.
- §52.13 cross-ref update. ~3 LOC.

**Adopter experience:**
- Loudest possible compile-time signal — the compile fails until the
  adopter authors a /login page.
- Still requires the adopter to write the 80+ LOC of login.scrml from
  scratch. Same floor as Proposal A.
- Compiler-side: the silent-failure window is GONE. The bug becomes
  impossible to introduce silently.

**v0.2.x scope:** Compile-time only.

**Effort estimate:** **1-2h** (compiler + types + SPEC amendment + 4-6
tests).

**Risks:**
- **OQ-A2-E partial walk-back.** The ratified prose says "absence is the
  page-author's concern, surfaced as INFO not ERROR" verbatim. Proposal C
  changes this. PA must escalate to user for re-ratification.
- BREAKING CHANGE: any in-tree example currently relying on the info-only
  behavior will now fail to compile. 03-contact-book is the only known one
  at S91-mid; we should verify.
- DX cost: harsh signal. The first time an adopter writes
  `<program auth="required">` they hit a compile error with no easy fix —
  they have to author the page from scratch with no guidance. Unless we
  pair this with Proposal E (generator), Proposal C alone is hostile.

---

### Proposal D — Runtime 401 with structured JSON body (status quo polish)

**What changes in `compiler/src/`:**
- `compiler/src/codegen/emit-server.ts:413-422` — change the
  `_scrml_auth_check` emission to return either:
  - Status 401 with JSON body `{ error: "unauthorized", redirectTo: "/login" }`
    when the request `Accept:` header is `application/json` (i.e., fetch
    call); OR
  - 302 redirect to `/login` when `Accept:` is `text/html` (i.e., browser
    navigation).
- ~25 LOC.

**What changes in `examples/03-contact-book.scrml`:**
- Nothing.

**What changes in SPEC.md:**
- §40.4 normative addition: behavior on content-type negotiation.
- §52.13 prose: clarify that `auth="required"` produces 302 for HTML
  requests and 401 for JSON. ~10 LOC.

**Adopter experience:**
- The "Unexpected token 'N', \"Not found\" is not valid JSON" symptom goes
  away — the client receives parseable JSON.
- Adopter STILL has no working /login page — browsers still 302 to /login
  → 404 "Not found" → blank page.
- The PROBLEM IS NOT SOLVED. The fetch-side noise improves; the
  user-facing UX is still broken. This is a "tolerate the noise better"
  fix per the brief's explicit Rule-2 prohibition.

**v0.2.x scope:** Runtime-only.

**Effort estimate:** **1-2h**.

**Risks:**
- **Violates Rule 2 (production-fidelity).** The bug is "no working /login
  page"; Proposal D makes the failure mode tidier but does not fix the bug.
- Prior art: every framework that emits 302 on auth-required-no-session
  assumes /login is real. Emitting 401 instead for JSON requests is a
  defensible polish but doesn't resolve the underlying issue.
- Per the brief: "DO NOT recommend a 'let's just tolerate the noise'
  non-fix." Proposal D is exactly that, plus a clean coat of paint.

**Inclusion in this scoping:** kept for completeness. Should NOT be the
recommended path; SHOULD be considered as an ADDITIVE polish to whichever
proposal is recommended (improves DX of the fetch error message regardless
of whether /login is real).

---

### Proposal E — Stdlib generator: `scrml generate auth` CLI command

**What changes in `compiler/src/`:**
- New file `compiler/src/commands/generate.js` — generator dispatch
  (`scrml generate auth [--target=<path>] [--with-register]`). ~80 LOC.
- `compiler/src/cli.js` — wire `generate` subcommand. ~15 LOC.
- New template file `stdlib/auth/templates/login.scrml.template` —
  parameterizable login page template (placeholders for db path, table
  name, role enum, redirect target). ~100 LOC.
- Optional template `stdlib/auth/templates/register.scrml.template` for the
  registration page. ~80 LOC.

**What changes in `compiler/src/auth-graph.ts`:**
- Update the `I-AUTH-REDIRECT-UNRESOLVED` lint MESSAGE to suggest
  `scrml generate auth` as the resolution path. ~5 LOC.
- Consider upgrading severity to WARNING (Proposal A pair-up) so the lint
  fires loud enough that adopters notice the suggestion. ~10 LOC.

**What changes in `examples/03-contact-book.scrml`:**
- Adopter runs `scrml generate auth --target=./login.scrml` once. The
  generator writes a working `login.scrml` to the requested path, wired
  to the `contacts.db` (or asks interactively). The adopter owns the
  generated file from that point — edits it, deletes the form fields they
  don't need, customizes styling.

**What changes in SPEC.md:**
- §40.4 prose: add normative paragraph about adopter's responsibility to
  provide /login when `auth="required"` is declared, and document the
  stdlib generator as the recommended path. ~15 LOC.
- §34 catalog row: update `I-AUTH-REDIRECT-UNRESOLVED` message + cross-ref
  to the generator. ~5 LOC.
- New §40.X — "Stdlib auth generators" — documents `scrml generate auth`
  + register variants. ~50 LOC.

**Adopter experience:**
- Compile-time: WARNING fires (per Proposal A pair-up) telling the adopter
  to author /login OR run `scrml generate auth`.
- Adopter runs `scrml generate auth --target=./login.scrml`. CLI prompts
  for DB path (or reads from `<program db=>` in their root file), table
  name (defaults to `users`), columns it expects (email, password_hash,
  role). Writes the template to the target file.
- Adopter owns the result. They can edit it, delete columns, change the
  form, swap session-store, add OAuth — exactly the trucking-dispatch
  pattern but starting from a working baseline.
- Default test scaffolding tolerance goes away — the example now ships
  a real /login.

**v0.2.x scope:** New CLI command. Compile-time addition (improve the
existing info-lint message + optionally upgrade to warning). Zero runtime
changes.

**Effort estimate:** **4-7h.**
- Generator dispatch + arg parsing: 1h
- Login template authoring + test compile: 1.5h
- Register template (optional, defer to v0.2.y): 1h
- I-AUTH-REDIRECT-UNRESOLVED message tweak: 0.5h
- Severity upgrade (Proposal A pair-up): 0.5h
- SPEC §40.X authoring: 1h
- Tests (CLI integration + golden generated file): 1.5h

**Risks:**
- Template-vs-real-schema mismatch. The generator can READ the adopter's
  `<schema>` block and `<db tables=>` declarations to derive sensible
  defaults — for the common case (users table with email + password_hash
  + role) this works. For exotic schemas the generator needs prompts or
  flags. Either is solvable.
- Generator templates go stale (Phoenix's well-known caveat —
  `phx.gen.auth` output drifts from current best practice as the framework
  evolves; adopters must port forward by hand). Mitigation: maintain the
  template via gauntlet — when the generated file breaks compile, the
  template gets re-authored.
- Adopter still has to RUN the generator. Generators-on-demand are
  opt-in. The compile-time warning (Proposal A pair-up) is what signals
  the generator's existence — without that signal, adopters won't
  discover it.
- Solo. Untriggered. Generator commands are easy to forget if the lint
  doesn't loudly nudge.

---

## 4. Trade-off matrix

| Dimension | A: Warn-only | B: Auto-gen | C: Error | D: Runtime polish | E: Generator |
|---|---|---|---|---|---|
| Compiler complexity | LOW (10 LOC) | HIGH (~250 LOC + new pass + spec amendment) | LOW (10 LOC) | LOW (25 LOC) | MEDIUM (~200 LOC + template) |
| Spec complexity | LOW | HIGH (OQ-A2-E walk-back + new normative clauses) | MEDIUM (OQ-A2-E partial walk-back + severity bump) | LOW | MEDIUM (new §40.X) |
| Adopter ergonomics — first-time | LOW (still 80 LOC of login boilerplate) | HIGH (works out of the box) | LOW (hard error, no help) | LOW (broken UX, just tidier console) | HIGH (one CLI command → working baseline) |
| Adopter ergonomics — real-world | MEDIUM (adopter writes the right page from scratch) | LOW (broken when real auth is wired; trap) | LOW (same as A but harder) | LOW (no /login still) | HIGH (generated page is adopter-owned + editable) |
| Production-fidelity (Rule 2) | YES (real fix path, just hard) | NO (synthesized login is a trap) | YES (forces fix) | NO (tolerates noise) | YES (real auth page, real schema-coupling) |
| DX (Rule 3 — right answer) | OK | BAD (magic that breaks) | BAD (hostile) | BAD (cosmetic) | GOOD |
| OQ-A2-E compatibility | YES | NO (walk-back required) | PARTIAL (severity walk-back, not synthesis) | YES | YES |
| Prior-art alignment | Partial (warns only, no help) | NONE (no framework does this) | Partial (Devise has no fallback either) | NONE | UNIVERSAL (Rails, Phoenix, Laravel, ASP.NET, Devise) |
| Risk of silent failure | LOW (warning loud) | HIGH (synthesized login looks-working) | NONE (compile fails) | HIGH (broken UX unchanged) | LOW (warning + generator path) |
| Breaking-change cost | NONE | LOW (synthesized pages override-able) | HIGH (existing apps fail) | NONE | NONE |
| Stdlib surface | NONE | +1 (default template) | NONE | NONE | +2 (login + register templates) |

---

## 5. Prior art table

| Framework | Pattern | Strength | Weakness |
|---|---|---|---|
| Rails (Devise) — `rails generate devise:views` | Adopter-invoked generator | 15+ yr in production. Gold standard. Adopter owns generated views. | View generation is OPT-IN — adopter must know it exists |
| Phoenix — `mix phx.gen.auth` | Adopter-invoked generator | Generates User schema + auth plugs + LiveView pages. Adopter owns everything. | Generator output goes stale as Phoenix evolves; manual port-forward required |
| Laravel — `php artisan ui bootstrap --auth` (was `make:auth`) | Adopter-invoked generator (via ui package) | Bootstrap/Vue/React variants. | Removed default scaffolding in Laravel 8; adopter has to know to install laravel/ui |
| ASP.NET Core — Scaffold Identity | IDE/CLI scaffolder | Generates Identity UI to `Areas/Identity/Pages/Account/`. | Heavyweight; requires Microsoft.VisualStudio.Web.CodeGeneration.Design |
| SvelteKit (Auth.js) | Adopter writes everything; library provides API | Maximum flexibility. | Maximum boilerplate. Adopter writes login page from scratch every time. |
| Next.js (Auth.js) | Same as SvelteKit | Same | Same |
| Bun.serve | Manual; no auth abstraction | Zero magic | Every auth pattern handwritten |
| **scrml today** | Adopter writes everything; compiler info-lint hints at the gap | OQ-A2-E + OQ-A3-B ratifications preserve this | Info-lint is too quiet; adopter doesn't discover the gap until runtime 404s |

**Pattern:** Every mature ecosystem ships a GENERATOR (Rails / Phoenix /
Laravel / ASP.NET). The frameworks without generators (SvelteKit / Next.js /
Bun) push the floor higher — adopters write more boilerplate, and the
learning curve is steeper for first-time adopters. NO mature framework
auto-generates the login page at compile time without explicit adopter
invocation; this is the universal-rejection pattern Proposal B violates.

---

## 6. Recommendation + Rule-3 justification

### Recommendation: **Proposal E (generator) + Proposal A (warning upgrade) as a paired fix.**

The pair is the minimum-cost configuration that:

1. **Closes the silent-failure window** at compile time (Proposal A —
   warning fires loudly when `<program auth="required">` declares a missing
   redirect target).
2. **Provides a discoverable, working starting point** (Proposal E — the
   warning message points at `scrml generate auth`, which writes an
   adopter-owned, schema-coupled login page).
3. **Preserves OQ-A2-E ratification** — no entry-point synthesis at compile
   time. The generator writes a real source file the adopter owns; the
   compile sees a real page.
4. **Matches universal prior art** — Rails, Phoenix, Laravel, ASP.NET
   Core all converged on this exact shape.
5. **Allows Proposal D as additive polish** later — improving the JSON-vs-HTML
   response shape on the redirect path is independent and orthogonal.

### Rule-3 justification ("right answer beats easy answer")

**The easy answers:** Proposal A alone (just warn) is 0.5-1h but leaves the
adopter writing 80+ LOC of login boilerplate they don't know how to start.
Proposal C (hard error) is 1-2h but is hostile DX — first-time-adopters
hit a wall with no exit. Proposal D (runtime polish) is 1-2h but per Rule 2
is the explicit anti-pattern.

**The right answer:** Proposal E + A is 4.5-8h (vs. 0.5-2h for the easy
fixes) but produces:

- **Compile-time signal that's loud enough to notice** (warning, not info).
- **An exit path the adopter can actually take** (generator emits a
  working baseline keyed to their schema).
- **An adopter-owned source file** preserving scrml's no-magic-just-codegen
  principle (the generator is just a sophisticated copy-paste that the
  adopter then edits — there's no hidden runtime behavior).
- **A canonical reference shape** (`stdlib/auth/templates/login.scrml.template`)
  that doubles as adopter-readable documentation of the expected pattern.
- **Compatibility with future ergonomic improvements** — when F-AUTH-001
  (role-based auth) lands, the generator template is the natural place to
  update; when F-AUTH-002 (cross-file SQL-using server fns) closes, the
  template can be simplified to import from `models/auth.scrml`.

**The 3-6h delta** over the cheap fixes buys: zero silent-failure window,
universal-prior-art alignment, real Rule-2 production-fidelity, and a
stdlib surface that scales to register, password-reset, OAuth, magic-link
templates in v0.2.y / v0.3.0 with no architectural rework.

**Proposal B is eliminated** by OQ-A2-E + prior-art universal rejection +
the synthesized-login-is-a-trap argument.

**Proposal C is eliminated standalone** as hostile DX; its severity-bump
spirit is preserved (Proposal A is a softer version — warning, not error,
which preserves the OQ-A2-E "page-author's concern" disposition with a
louder signal).

**Proposal D is deferred** as additive future polish (improves the
fetch-error JSON shape independently of /login existence).

---

## 7. Open questions for PA / user ratification

### OQ-1 — Severity of `I-AUTH-REDIRECT-UNRESOLVED` under Proposal A

Should the upgrade be info → warning, or info → error?

- **(a) info → warning** — Adopter sees the loud signal; compile still
  succeeds; pairs with Proposal E generator path; preserves OQ-A2-E
  "page-author's concern" disposition with a louder voice.
- **(b) info → error** — Compile fails; force adopter to fix before
  running. Hostile without Proposal E pair-up. Even with Proposal E,
  error-level might be too harsh.
- **(c) Two-tier: warning when `loginRedirect` is the default `/login`,
  error when adopter explicitly set `loginRedirect="/custom"` and the
  custom path is unresolved** — second case is more likely a typo and
  warrants harder signal.

**Default recommendation:** **(a) warning, single-tier.** Pair with
Proposal E. Tier-2 (b) escalation reserved for a future ergonomic wave
once the generator is established and adopters have a clear escape valve.

**Load-bearing reason:** Two-tier severity (option c) introduces
complexity in the lint catalog without a clear forcing function in
v0.2.x. Warning + generator covers both the default and explicit-typo
cases adequately.

### OQ-2 — Generator command shape: `scrml generate auth` vs `scrml new login` vs other

- **(a) `scrml generate auth`** — Aligns with Rails (`rails generate`),
  Phoenix (`mix phx.gen.X`), Laravel (`php artisan make:X`). Generator
  family with `--with-register`, `--with-reset` flags for additional
  pages.
- **(b) `scrml new login`** — Shorter; less obviously a generator
  family.
- **(c) `scrml scaffold auth`** — More verbose; "scaffold" verb is
  Rails-specific.

**Default recommendation:** **(a) `scrml generate auth`.** Most-established
prior art; sets up future generator family (`scrml generate <feature>`)
naturally.

**Load-bearing reason:** Universal prior-art convention. Adopters
arriving from Rails / Phoenix / Laravel reach for `generate` first.

### OQ-3 — Should the generator be in v0.2.x or v0.3.0?

- **(a) v0.2.x patch alongside Proposal A** — Ship both together so the
  warning message points at a real command from day 1.
- **(b) v0.2.x for Proposal A, v0.3.0 for Proposal E** — Ship the
  warning first; generator as the v0.3 ergonomic-completion ladder.
  Warning message in interim says "author /login by hand; see
  trucking-dispatch for the canonical pattern."
- **(c) v0.3.0 only — defer entirely** — accept the test tolerance for
  one more wave.

**Default recommendation:** **(a) ship together in v0.2.x.** The pair is
load-bearing — Proposal A alone is hostile (loud warning + no exit
path); Proposal E alone is undiscoverable (generator exists but adopter
doesn't know to run it).

**Load-bearing reason:** The pair is the right answer. Splitting them
across waves is exactly the "cheap fix + defer the real fix" pattern
Rule 3 prohibits. 4.5-8h is achievable within a v0.2.x patch wave.

### OQ-4 — Template parameterization: what does the generator read from the source corpus?

- **(a) Read `<schema>` + `<db tables=>` declarations** to derive the
  users table name, columns (email/password_hash/role), and emit a
  schema-keyed login fn. Falls back to canonical defaults if schema is
  absent or ambiguous.
- **(b) Generate generic template with placeholder comments** — adopter
  fills in their schema by hand.
- **(c) Interactive CLI prompts** — `scrml generate auth` asks the
  adopter at the terminal: "Users table name? Email column?
  Password-hash column?".

**Default recommendation:** **(a) read schema with (b) fallback if
ambiguous.** Match the Rails / Phoenix pattern — the generator inspects
the existing source corpus and makes intelligent defaults.
(c) interactive prompts are friction; the lint message + generator
should be one-shot.

**Load-bearing reason:** Matches universal prior art; minimum adopter
friction; ambiguity-fallback covers exotic schemas.

### OQ-5 — Should Proposal D (JSON vs HTML response shape) be bundled?

- **(a) Yes — bundle with E+A patch** — the polish improves the
  fetch-error shape immediately, even before adopters generate /login.
- **(b) No — defer as separate v0.2.x patch** — Proposal D is
  orthogonal; bundling adds scope. Defer to a later wave.

**Default recommendation:** **(b) defer.** Proposal E + A is the
load-bearing fix. Proposal D is cosmetic — file as a follow-up
content-type-negotiation patch.

**Load-bearing reason:** Scope discipline. The recommended pair
already takes 4.5-8h; D adds 1-2h on a separate concern (response
content negotiation) that doesn't gate the core fix.

### OQ-6 — Should `stdlib/auth/templates/` live in stdlib or elsewhere?

- **(a) `stdlib/auth/templates/login.scrml.template`** — Adjacent to
  the auth module; co-located with the helpers the template imports
  from (`hashPassword` etc.).
- **(b) `compiler/src/templates/auth/login.scrml.template`** — Inside
  the compiler tree alongside other compiler-side assets.
- **(c) New top-level `templates/` directory** — Indicates these are
  build-time scaffolds, not stdlib runtime.

**Default recommendation:** **(a) stdlib/auth/templates/.** The template
is a scrml-source artifact authored against stdlib/auth's helpers;
co-location with the helpers is the natural home.

**Load-bearing reason:** Adopters reading `stdlib/auth/` discover the
template naturally. Templates are scrml source, not compiler internals.

### OQ-7 — Page-level auth-check gap (out of scope, flagged for separate filing)

As noted in §2.2, `commands/dev.js:399-422` serves HTML pages as static
assets WITHOUT consulting `_scrml_auth_check`. So even with /login
existing, the `<program auth="required">` global gate is NOT actually
enforced at the page-load layer in dev — only at state-mutating
server-fn boundaries. This is a separate latent bug.

**Default recommendation:** File as `dev-server-page-auth-enforcement`
follow-up scoping. Not blocking the E+A patch.

**Load-bearing reason:** Scope discipline. Closing the redirect-target
gap is independent of closing the page-load-enforcement gap. Both must
close; both can be done sequentially.

---

## 8. Effort + sequencing

### Recommended sequence — v0.2.x patch wave

| Step | What | Estimate | Sequence |
|---|---|---|---|
| 1 | Author `stdlib/auth/templates/login.scrml.template` + integration test compile | 1.5h | First (defines the contract) |
| 2 | Implement `compiler/src/commands/generate.js` + CLI wire-up | 1.5h | Depends on step 1 |
| 3 | Update `compiler/src/auth-graph.ts:478` — severity upgrade + message rewrite to suggest generator | 0.5h | Independent |
| 4 | SPEC.md updates: §34 catalog row severity bump; §40.1.1 prose tweak; new §40.X "Stdlib auth generators" | 1h | Depends on steps 2-3 |
| 5 | Tests — CLI integration golden + lint-message regression + 03-contact-book recompile clean | 1.5h | Final |
| 6 | Update `examples/03-contact-book.scrml` workflow: add `/login.scrml` (generator output) — drop e2e test tolerance scaffolding | 1h | Final |

**Total recommended fix:** **7h** (within the 4-7h range from §3.E +
SPEC + workflow update).

### Out-of-scope follow-up sequence (separate scoping)

- Page-level auth-check enforcement in dev-server (OQ-7).
- Proposal D additive polish (content-type-negotiated 401 vs 302).
- F-AUTH-002 cross-file SQL-using server-fn closure (allows generator
  template to import from `models/auth.scrml` instead of inlining).
- F-AUTH-001 role-based auth (W-ATTR-002 closed silent-failure; semantic
  unimplemented).
- v0.2.y register / password-reset / OAuth template additions.

---

## 9. References

### Compiler source

- `compiler/src/auth-graph.ts:165-200` — `runAuthGraph` orchestrator
- `compiler/src/auth-graph.ts:414-507` — `crossRefRedirects` + `collectUrlPatterns`
- `compiler/src/auth-graph.ts:478-489` — `I-AUTH-REDIRECT-UNRESOLVED` emission site
- `compiler/src/codegen/emit-server.ts:398-453` — `_scrml_session_middleware` + `_scrml_auth_check` emission
- `compiler/src/codegen/emit-server.ts:673-676, 749-752` — auth-check insertion sites (SSE handlers + state-mutating server fns)
- `compiler/src/route-inference.ts:134-148, 2429-2488, 2523-2565` — RouteMap.authMiddleware + RouteMap.pages
- `compiler/src/route-inference.ts:2443` — `loginRedirect` default `/login`
- `compiler/src/commands/dev.js:350-444` — dev server fetch handler; static-file fallback; 404 "Not found"
- `compiler/src/api.js:1299-1322` — Stage 7.55 AG (AuthGraph) wire-up

### Spec

- `compiler/SPEC.md` §34 catalog row 14940 — `I-AUTH-REDIRECT-UNRESOLVED` Info entry
- `compiler/SPEC.md` §40.1.1 — static role classification + page-inferred / redirect-unresolved cross-refs
- `compiler/SPEC.md` §40.2 line 17183-17202 — `<program>` attribute middleware table
- `compiler/SPEC.md` §40.4 line 17399 — `handle()` + Compiler-auto interaction
- `compiler/SPEC.md` §52.13 line 24976-25030 — recognized values for `auth=` + `csrf=` (the normative definition of `auth="required"` redirect semantics)

### Examples

- `examples/03-contact-book.scrml:7` — the bug-bearing `<program auth="required">`
- `examples/03-contact-book.scrml:37-39` — `loadContacts` server fn (GET, not auth-checked)
- `e2e/tests/03-contact-book.spec.ts:40-75` — tolerance scaffolding documenting the symptoms
- `examples/23-trucking-dispatch/app.scrml:29` — canonical `<program auth="required">` adopter usage
- `examples/23-trucking-dispatch/pages/auth/login.scrml:18` — canonical `<page auth="optional">` override pattern
- `examples/23-trucking-dispatch/pages/auth/login.scrml:36-54` — canonical inline `loginServer()` shape
- `examples/23-trucking-dispatch/models/auth.scrml:1-110` — pure-fn auth helpers (rolePath, checkRole, readSessionCookie)
- `examples/23-trucking-dispatch/FRICTION.md:7-44` — F-AUTH-001 (role-based auth silently inert)
- `examples/23-trucking-dispatch/FRICTION.md:46-130` — F-AUTH-002 (cross-file `?{}`-using server fns not portable; the constraint forcing inline `loginServer()`)
- `examples/23-trucking-dispatch/FRICTION.md:189-204` — F-AUTH-003 (W-AUTH-001 false positive)

### Stdlib

- `stdlib/auth/index.scrml:14-15` — `scrml:auth` exports (hashPassword, verifyPassword, JWT helpers)
- `stdlib/auth/password.scrml`, `stdlib/auth/jwt.scrml` — leaf modules
- NO existing template directory — Proposal E adds `stdlib/auth/templates/`

### Prior scoping + design-insights

- `docs/changes/a3-auth-graph-scoping/SCOPING.md:286-291` — A-3.4 scope; OQ-A2-E + OQ-A3-B (a) ratification
- `docs/changes/a2-reachability-solver-scoping/SCOPING.md:448-456` — OQ-A2-E "no entry-point synthesis"
- `scrml-support/docs/deep-dives/session-auth.md:130-279` — 2026-03-28 Approach A (`<program>` attributes); the original verdict that pinned `auth=` to `<program>`
- `scrml-support/docs/deep-dives/protect-auth-csrf-terminology-2026-05-11.md` — terminology decisions

### External prior art

- [Rails Devise — `rails generate devise:views`](https://guides.railsgirls.com/devise)
- [Phoenix `mix phx.gen.auth`](https://hexdocs.pm/phoenix/mix_phx_gen_auth.html)
- [Laravel `php artisan ui --auth`](https://dev.to/techtoolindia/laravel-8-authentication-n40)
- [ASP.NET Core Scaffold Identity](https://learn.microsoft.com/en-us/answers/questions/1229663/authentication-tutorial-project-scaffold-register)
- [SvelteKit Auth.js — adopter-authored login](https://authjs.dev/reference/sveltekit)
- [Phoenix `phx_gen_auth` overview](https://hexdocs.pm/phx_gen_auth/overview.html)
- [Devise GitHub](https://github.com/heartcombo/devise)

---

## Tags

#scoping #auth #v0.2.x-patch #03-contact-book #stdlib-generator #spec-§40 #spec-§52.13 #i-auth-redirect-unresolved #w-auth-redirect-unresolved-proposed #rule-2-production-fidelity #rule-3-right-answer #wave-3.5 #oq-a2-e #oq-a3-b

## Links

- [examples/03-contact-book.scrml](/home/bryan-maclee/scrmlMaster/scrmlTS/examples/03-contact-book.scrml)
- [e2e/tests/03-contact-book.spec.ts](/home/bryan-maclee/scrmlMaster/scrmlTS/e2e/tests/03-contact-book.spec.ts)
- [examples/23-trucking-dispatch/app.scrml](/home/bryan-maclee/scrmlMaster/scrmlTS/examples/23-trucking-dispatch/app.scrml)
- [examples/23-trucking-dispatch/pages/auth/login.scrml](/home/bryan-maclee/scrmlMaster/scrmlTS/examples/23-trucking-dispatch/pages/auth/login.scrml)
- [examples/23-trucking-dispatch/FRICTION.md](/home/bryan-maclee/scrmlMaster/scrmlTS/examples/23-trucking-dispatch/FRICTION.md)
- [compiler/src/auth-graph.ts](/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/auth-graph.ts)
- [compiler/src/codegen/emit-server.ts](/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/codegen/emit-server.ts)
- [compiler/src/route-inference.ts](/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/route-inference.ts)
- [compiler/src/commands/dev.js](/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/commands/dev.js)
- [compiler/SPEC.md §52.13](/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/SPEC.md)
- [docs/changes/a3-auth-graph-scoping/SCOPING.md](/home/bryan-maclee/scrmlMaster/scrmlTS/docs/changes/a3-auth-graph-scoping/SCOPING.md)
- [docs/changes/a2-reachability-solver-scoping/SCOPING.md](/home/bryan-maclee/scrmlMaster/scrmlTS/docs/changes/a2-reachability-solver-scoping/SCOPING.md)
- [scrml-support/docs/deep-dives/session-auth.md](/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/session-auth.md)
- [stdlib/auth/index.scrml](/home/bryan-maclee/scrmlMaster/scrmlTS/stdlib/auth/index.scrml)
