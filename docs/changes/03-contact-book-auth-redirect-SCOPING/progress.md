# 03-contact-book auth-redirect SCOPING — progress

Change-id: `03-contact-book-auth-redirect-SCOPING`
Worktree: `main` (research-only; PA-direct write per scrml-deep-dive convention).

## Log (timestamps America/Denver MDT)

- 2026-05-14 — start. Read `examples/03-contact-book.scrml` + `e2e/tests/03-contact-book.spec.ts` to confirm symptom set.
- 2026-05-14 — could not compile via Bash (permission denied on `bun run`); pivoted to source-code inspection of `compiler/src/codegen/emit-server.ts` lines 398-453 + 661-754 to determine emitted auth-handler shape.
- 2026-05-14 — read `compiler/src/route-inference.ts` lines 134-148 + 2429-2488 — confirmed `loginRedirect` defaults to `/login` per SPEC §40.4; W-AUTH-001 emits when `protect=` present without explicit `auth=`.
- 2026-05-14 — read `compiler/src/auth-graph.ts` lines 414-507 (crossRefRedirects) — confirmed I-AUTH-REDIRECT-UNRESOLVED is the existing compile-time surface for the gap. Severity: info; per OQ-A2-E + OQ-A3-B (a) S90 ratification it MUST NOT escalate to error.
- 2026-05-14 — read `compiler/src/commands/dev.js` lines 350-444 — confirmed dev server has NO PAGE-LEVEL auth check (only registered server-fn routes carry the auth check, and only when `isStateMutating`). Plain "Not found" 404 is the fallback for any unrouted path including `/login`.
- 2026-05-14 — read `examples/23-trucking-dispatch/pages/auth/login.scrml` + `app.scrml` — canonical adopter pattern: separate `pages/auth/login.scrml` with `auth="optional"` override on `<page>` (overrides the `<program auth="required">` global gate).
- 2026-05-14 — read `examples/23-trucking-dispatch/FRICTION.md` — F-AUTH-001 / F-AUTH-002 / F-AUTH-003 prior auth friction. UVB-W1 closed the silent-acceptance window for `auth="role:X"` via W-ATTR-002; F-AUTH-002 is the inline-duplication blocker that forced trucking-dispatch to inline `login()` into `app.scrml` plus copy into login.scrml.
- 2026-05-14 — read `compiler/SPEC.md` §40 + §40.1.1 + §52.13 — normative auth pipeline + recognized attribute values. §52.13 normatively defines `auth="required"` → "unauthenticated requests are redirected to loginRedirect= (default /login)". No SPEC clause anywhere mandates the adopter author a /login page (only catalog row §34 I-AUTH-REDIRECT-UNRESOLVED hints).
- 2026-05-14 — read `scrml-support/docs/deep-dives/session-auth.md` (2026-03-28 — 7-dev panel) + `protect-auth-csrf-terminology-2026-05-11.md`. Session-auth deep-dive recommended A/C (`<program>` attributes); no prior decision on login-page-scaffolding.
- 2026-05-14 — confirmed OQ-A2-E ratified S89 (`docs/changes/a2-reachability-solver-scoping/SCOPING.md:448`): A-3 does NOT synthesize entry-points from auth-redirect targets. This is a HARD constraint on Proposal B (compiler-scaffolded /login) — auto-generation would synthesize a new entry-point, violating the ratified disposition unless explicitly walked back.
- 2026-05-14 — WebSearch prior art: Rails Devise (`rails g devise:views`), Phoenix (`mix phx.gen.auth`), Laravel (`php artisan ui --auth`), ASP.NET Core Identity (Scaffold-Identity), SvelteKit (adopter-authored `+page.server.ts` redirect logic). Pattern: every mature ecosystem ships a GENERATOR, never compile-time auto-injection. Adopter owns the page code; the framework provides the boilerplate via codegen at adopter request.
- 2026-05-14 — drafted SCOPING.md §1-§7. Committed as research output.
