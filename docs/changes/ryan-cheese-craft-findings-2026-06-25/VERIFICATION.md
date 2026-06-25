# PA verification — Ryan (rjantz3) Cheese-Craft findings on HEAD `26ffea4e` (v0.7.0)

**S215 doctrine** (don't trust external validation blindly — PA dual-verify before flipping to OPEN). Verified S220 (2026-06-25) by an independent diagnostic agent reproducing each finding on our current HEAD `26ffea4e` and inspecting emitted codegen. Repros under `/tmp/ryan-verify/`. Ryan's own validation (revalidated against our `2a4bf8af`) is in `RYAN-VALIDATION.md`; his paste-ready issues in `RYAN-ISSUES.md`.

**Result: all 10 active findings CONFIRMED on our HEAD. PA verdict matches Ryan on all 11 — no verdict differs.** Finding 10 stays RESOLVED.

| # | short | verdict | root-cause locus (hypothesis) | repro |
|---|-------|---------|-------------------------------|-------|
| 01 | server-only stdlib import leaks into CLIENT bundle → `_scrml_stdlib.store` undefined → throws at load, blanks page | **CONFIRMED** HIGH | `codegen/emit-client.ts` — server-classified stdlib import not stripped from client bundle | `01-stdlib-client-leak.scrml` |
| 02 | `protect=` on `<db>` overrides `<page auth="optional">`, injects auth=required + false `W-AUTH-001` ("no explicit auth=") | **CONFIRMED** MED-HIGH | `route-inference.ts`/`auth-graph.ts` — protect-derived auth-injection overrides explicit page `auth=` | `proj-auth/pages/login.scrml` |
| 03 | login page's own RPC auth-gated (`_scrml_auth_check`→302 /login) → can't authenticate | **CONFIRMED** HIGH | `codegen/emit-server.ts` — per-handler auth prologue on the login RPC; no redirect-target exemption (**downstream of #02**) | same project |
| 04 | pure `fn` exposed as RPC → `async`; in-process caller compares UNAWAITED Promise (`_scrml_structural_eq(x, tag(name))`, no `await`) | **CONFIRMED** HIGH | `route-inference.ts`/`emit-server.ts` — peer-callable emitted async, caller lowering omits `await` | `04-pure-fn-async-unawaited.scrml` |
| 05 | `<db src>` file-relative at compile, cwd-relative at runtime (`sqlite:./m.db` vs `sqlite:../m.db` verbatim) | **CONFIRMED** MED | db-resolver: `src` resolved file-relative in PA but emitted literal into `new SQL("sqlite:…")` | `proj-auth/` |
| 06 | compound `bind:value=@form.field` not two-way — writes DERIVED parent, source sub-field stays null, isValid stuck | **CONFIRMED** HIGH | `codegen/emit-bindings.ts:513-520` — dotted-path bind picks root token (derived cell) as write target, not source sub-field | `06-compound-form-bind.scrml` |
| 07 | `if=(@x is some)` guard only toggles `el.style.display`; inner `${@x.field}` effect runs on mount with `x===null` → null crash | **CONFIRMED** HIGH | `codegen/emit-html.ts` — `if=` emits display-toggle only; inner interpolation effects not gated on the guard condition | `07-if-guard-effect.scrml` |
| 08 | `?{}` SQL inside an arrow-function body → `E-CODEGEN-INVALID-JS` | **CONFIRMED** MED | emit-server / `?{}` SQL-lowering inside arrow-fn body | `08-arrow-sql.scrml` |
| 09 | local `const` collides with `<state>` cell name → `E-NAME-COLLIDES-STATE` | **CONFIRMED** LOW/DX (as-intended) | SYM — intentional V5-strict shadow ban (§6.1.3) | `09-name-collides-state.scrml` |
| 10 | `<schema>` doesn't feed PA | **RESOLVED (stays)** — `protect-analyzer.ts:471` walks `<schema>` | (see nuance below) | `10-schema-pa.scrml` |
| 11 | `scrml generate auth` scaffolds `/auth/login` but default redirect is `/login` → `I-AUTH-REDIRECT-UNRESOLVED` + `W-AUTH-LOGIN-MISSING` | **CONFIRMED** MED | `commands/generate` writes `pages/auth/login.scrml` vs `auth-graph.ts` default `loginRedirect=/login` | `proj-gen/` |

## Load-bearing PA findings beyond Ryan's report

- **#02 → #03 are one causal chain.** The `protect=`-derived `auth="required"` injection (#02) is what installs the `_scrml_auth_check` prologue on the login RPC (#03). **Fixing #02's precedence (don't override an explicit `<page auth="optional">`) closes both.** Sequence #02 first.
- **Finding-10 nuance (new follow-up).** The `<schema>`→PA resolution holds only for the canonical declarative form (`users { id: integer primary key … }`). Raw `CREATE TABLE … (…)` inside `<schema>` is NOT recognized by `parseSchemaBlock` → silently yields zero tables → `E-PA-002` fires on the missing DB. → file `g-schema-block-raw-ddl-silent-noop` (LOW/MED): either parse `CREATE TABLE` inside `<schema>` or diagnose the unrecognized form instead of falling through to E-PA-002.

## Severity rollup
- **HIGH (5):** #01, #03, #04, #06, #07 — together: *you cannot build a working login on v0.7.0 today.*
- **MED-HIGH (1):** #02 (root of #03).
- **MED (3):** #05, #08, #11.
- **LOW/DX (1):** #09.
- **RESOLVED:** #10 (+ the raw-DDL follow-up).

Provenance: verification agent `acf456cb`, dispatched S220 per pa.md S215 addendum. Branch: `ryan/claude/file-issue-validation-i350df`.
