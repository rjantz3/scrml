# Auth-redirect-tightening — Phase 0 Survey

Dispatch: Tighten `I-AUTH-REDIRECT-UNRESOLVED` + `W-AUTH-LOGIN-MISSING` messages, plus `scrml generate auth` UX.
Baseline HEAD: de84260 (S93 close). Worktree: agent-a55bbe8bbc21ac395.

## 1. Diagnostic message current text

### I-AUTH-REDIRECT-UNRESOLVED  (auth-graph.ts:515-527)

```
Auth gate redirect target "/login" does not match any page URL pattern
in the route map. The redirect target's own entry-point must exist
independently (per OQ-A2-E — no entry-point synthesis). Add a page at
this path, or correct the redirect target. (SPEC §40.1.1.)
```

Tone audit:
- Does NOT name `scrml generate auth`. (W-AUTH-LOGIN-MISSING does — but the per-gate INFO does not.)
- Cites internal disposition code "OQ-A2-E" — meaningless to adopters.
- "Add a page at this path, or correct the redirect target" is correct but generic.
- No copy-pasteable command.

Tightening candidates:
- Drop the OQ-A2-E parenthetical (internal jargon).
- Add the concrete `scrml generate auth` fix-path when the redirect is exactly `/login` (the default).
- When the redirect is non-default (e.g., `/signin`), suggest `scrml generate auth --target-dir=./pages/<redirect-derived>` OR point at correcting the redirect.
- Keep the SPEC §40.1.1 reference.

### W-AUTH-LOGIN-MISSING  (auth-graph.ts:543-554)

```
Auth gates declare redirect target(s) "/login" but no page in the
compilation unit matches any of these paths. The runtime auth-check
will 302 to a 404. Author a login page at the redirect path, or run
`scrml generate auth` to scaffold one. (SPEC §40.1.1.)
```

Tone audit:
- DOES name `scrml generate auth`. Good.
- Says "scaffold one" but doesn't tell the adopter what file gets written or where.
- Generic "Author a login page" alternative is fine.

Tightening candidates:
- Specify the exact path the scaffold lands at: `pages/auth/login.scrml`.
- For single-target cases (the common one), simplify the prose: "Run `scrml generate auth` — this scaffolds a working login page at `pages/auth/login.scrml`."
- For multi-redirect cases, list each unresolved target and indicate that the scaffold targets the default (`/login`).
- Drop "SPEC §40.1.1" inline — keep it as a trailing reference, not embedded.

## 2. `scrml generate auth` current behaviour

**Surface (parseArgs):**
- `scrml generate auth` — writes `pages/auth/login.scrml`
- `--target=<path>` — explicit file path
- `--target-dir=<dir>` — explicit directory; appends `login.scrml`
- `--help` / `-h`

**Project-root discovery (findProgramRoot):**
1. `app.scrml` at CWD
2. `src/app.scrml`
3. Recursive scan (depth ≤ 4) for any `.scrml` containing `<program`
4. Returns null if none found

**Smart-defaults today:**
- Auto-detects `<db src="...">` from program root → substituted into template.
- Auto-detects `<program loginRedirect="...">` → uses as the resolved login route (logged but NOT used to pick output path; output path is hard-coded to `pages/auth/login.scrml` unless `--target` / `--target-dir` overrides).

**Idempotency:**
- `existsSync(outAbs)` check before write → never clobbers.
- Skips with a yellow warning + "Delete the existing file first if you want to regenerate." message.

**Template contents (stdlib/auth/templates/login.scrml — 128 lines):**
- Working `<page auth="optional">` (the auth=optional override is load-bearing — without it the global `<program auth="required">` would loop on /login).
- Form with email/password inputs, submit handler.
- Server-side login fn using `?{}` SQL block + `verifyPassword` from `scrml:auth`.
- Error display path via `@errorMessage`.
- Successful redirect via `window.location.href`.
- Tailwind classes for working-out-of-box styling.
- `is not` for absence checks (canonical scrml; no null/undefined per S89).
- No try/catch / throw (canonical scrml).

**Pre-existing tests:**
- `compiler/tests/commands/generate-auth.test.js` (~248 lines, 6 sections, 12 tests):
  - §1 trivial generate writes default path
  - §2 idempotency (re-run preserves adopter edits)
  - §3 --target / --target-dir overrides
  - §4 DB src= detection + propagation
  - §5 error paths (unknown type, --help)
  - §6 template content quality (no try/catch, no null/undefined, uses `verifyPassword`)

## 3. Smoke-test of the adopter-facing UX

Set up `/tmp/scrml-survey/app.scrml`:
```scrml
<program auth="required">
  ${
    <count> = 0
  }
  <div>
    <h1>Hello protected</h1>
  </div>
</program>
```

Compile (`scrml compile app.scrml`) yields the diagnostic pair verbatim.

Run `scrml generate auth` — successfully writes `pages/auth/login.scrml`. Output:
```
Generating auth scaffold in .
  project root: app.scrml
  no <db> declaration detected — template ships with default 'app.db' placeholder
  login route: /login
  created pages/auth/login.scrml
```

**SURPRISING FINDING (outside scope — flagging as deferred):** After running `scrml generate auth`, re-compiling JUST `app.scrml` (single-file invocation) STILL fires both diagnostics. This is because `compileScrml` operates on the input file set; the scaffold at `pages/auth/login.scrml` is not auto-discovered when the user passes a single file arg. The adopter must invoke `scrml compile .` (directory mode) — at which point route-inference scans `pages/` and picks up the scaffold, resolving the redirect.

This is a UX gap, but addressing it requires touching `commands/compile.js` (which is out of this dispatch's scope). Will surface as DEFERRED.

## 4. Tightening targets (Phase 1 implementation surface)

### Tightening A — I-AUTH-REDIRECT-UNRESOLVED message

**Before:**
> Auth gate redirect target "/login" does not match any page URL pattern in the route map. The redirect target's own entry-point must exist independently (per OQ-A2-E — no entry-point synthesis). Add a page at this path, or correct the redirect target. (SPEC §40.1.1.)

**After (proposed):**
> Auth gate redirect target "/login" does not match any page URL pattern in the route map. Either author a page at this path, or correct the redirect target. If "/login" is the intended target, run `scrml generate auth` to scaffold a working login page at `pages/auth/login.scrml`. (SPEC §40.1.1.)

(For non-`/login` targets — the `scrml generate auth` line is still useful since the scaffold can be moved with `--target-dir=`.) Simpler approach: include the CLI hint when the target is `/login`; for other targets, point at `scrml generate auth --target-dir=<dir>` form.

### Tightening B — W-AUTH-LOGIN-MISSING message

**Before:**
> Auth gates declare redirect target(s) "/login" but no page in the compilation unit matches any of these paths. The runtime auth-check will 302 to a 404. Author a login page at the redirect path, or run `scrml generate auth` to scaffold one. (SPEC §40.1.1.)

**After (proposed):**
> Auth gates declare redirect target(s) "/login" but no page in the compilation unit matches any of these paths. The runtime auth-check will 302 to a 404. Run `scrml generate auth` to scaffold a working login page at `pages/auth/login.scrml` — or author one at the redirect path manually. (SPEC §40.1.1.)

(Reordering puts the actionable command first; clarifies the scaffold target path.)

### Tightening C — `scrml generate auth` smart-defaults

Today the command already uses smart defaults — `findProgramLoginRedirect` extracts the override from the program root, but it's only logged (not used to pick output path). Two options:

1. **Option C1 (status quo + better logging):** Keep the hard-coded `pages/auth/login.scrml` default; the explicit-loginRedirect log line is informational. No behavior change.
2. **Option C2 (path-derived default):** When `<program loginRedirect="...">` is non-default, derive the scaffold output path from it (e.g., loginRedirect="/signin" → `pages/auth/signin.scrml`). Bigger blast radius — risks moving the scaffold to a path the adopter then has to remember; the `pages/auth/login.scrml` convention is sticky.

Recommended: **Option C1 + clearer hint in the "Next steps" block** noting that if `loginRedirect=` is non-default, the adopter must manually update the file's routing OR pass `--target-dir=`. Add a warning when explicit-loginRedirect ≠ "/login" but the scaffold lands at the default path.

### Tightening D — Diagnostic→scaffold link cross-ref

Both diagnostics now reference `scrml generate auth` by name AND the scaffold output path (`pages/auth/login.scrml`). The adopter can copy-paste the command verbatim. Match conventions used elsewhere in the codebase (e.g., compile.js diagnostic format) for the parenthetical reference.

## 5. Test plan (Phase 2)

Already-covered cases (pre-existing tests at unit/auth-graph-login-missing.test.ts + unit/auth-graph-redirect-crossref.test.ts):
- Total structural gap → W-AUTH-LOGIN-MISSING fires (§1 §5 §7)
- Login page present → no fire (§2)
- Per-gate typo with working /login → I-info-only (§3)
- Multi-redirect aggregation (§5)
- Null routeMap → no fire (§6)

Tightened-message-pinning additions (this dispatch):
- Assert the tightened I-AUTH-REDIRECT-UNRESOLVED message includes `scrml generate auth` substring.
- Assert the tightened W-AUTH-LOGIN-MISSING message includes `pages/auth/login.scrml` substring.
- Assert I- message no longer contains "OQ-A2-E" string (de-jargonization).

Integration test (NEW):
- Compile a synthetic project with `<program auth="required">` + no pages dir → both diagnostics fire with tightened messages.
- Compile after running `scrml generate auth` against project root (directory mode) → diagnostics resolved.

## 6. Constraints check

- DO NOT modify SPEC.md ✓
- DO NOT modify auth-graph emitter logic (200-449) — only messages at 516-527, 544-555 ✓
- DO NOT touch commands/compile.js ✓
- DO NOT add new diagnostic codes ✓
- DO NOT use --no-verify ✓

## 7. Deferred items (Phase 0 findings)

D1. **Single-file invocation doesn't pick up scaffold** — `scrml compile app.scrml` doesn't scan sibling `pages/`. Adopter must `scrml compile .` (directory mode). Cannot fix in this dispatch (would require commands/compile.js change OR route-inference scanning of CWD when no pages/ dir). Surface to PA.

D2. **`scrml generate auth` doesn't warn about non-default loginRedirect mismatch** — if `<program loginRedirect="/signin">` but scaffold lands at default `pages/auth/login.scrml`, the scaffold's `<page>` is at `/auth/login` (filesystem routing) which won't match `/signin`. Today logged but not warned. Could add a yellow warning. In-scope candidate.
