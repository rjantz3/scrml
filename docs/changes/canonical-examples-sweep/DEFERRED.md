# Canonical-examples sweep — deferred items

**Filed:** 2026-05-14 (S93)
**Origin:** S93 canonical-examples sweep recovery — two files surfaced shape concerns that the sweep did NOT migrate fully. Filed here for follow-up work.

Adjacent to the BS-layer corpus-friction bug batch at `docs/changes/bs-layer-corpus-friction-bugs/SCOPING.md` — both deferred items below are downstream consequences of similar BS-layer / parser surface-area gaps.

---

## S93 follow-up — 3 residual BS-batch edge cases (`${ }` wrappers that still can't be dropped)

After the BS-batch fixes landed (commit `cb1d48c`), the Phase 3 workaround-drop pass attempted to remove `${ }` wrappers from 9 example files. **5 dropped cleanly**, **1 was filed in DEFERRED 1+2 above (09-error-handling)**, and **3 residual cases failed when dropped and were reverted** during the S93 bug-hunt:

### Residual 1 — `examples/12-snippets-slots.scrml` — component-def with `${children}` spread

Component-def `const Card = <div class="card" props={...}> ${children} ... </>` at `<program>` direct-child level. Bug 2 fix handles `const Name = <markup>` LIFT pairing, BUT when the markup body contains `${children}` spread interpolation, dropping the outer `${ }` wrapper produces E-COMPONENT-031 on EVERY component use-site. The spread + slot-render combination trips a downstream pass.

Workaround: keep the outer `${ }` wrapper (W-PROGRAM-REDUNDANT-LOGIC false-positive).

### Residual 2 — `examples/19-lin-token.scrml` — function body with template-literal `${ident}` and `lin` parameter

Function `redeem(lin ticket: string, ...) { return \`Redeemed ticket=${ticket} ...\` }` at `<program>` direct-child level. Bug 3 fix handles template-literal `${ident}` in plain function bodies, BUT the `lin`-parameter binding combined with the template-literal consumption pattern fails — drop produces E-SCOPE-001 on `ticket`. The `lin` declaration's scope-tracking interacts with the BS-layer differently than a normal parameter.

Workaround: keep the outer `${ }` wrapper.

### Residual 3 — `examples/20-middleware.scrml` — multi-line `server function` body

`server function handle(request, resolve) { ... }` with multi-line body containing `const reqId = crypto.randomUUID(); const start = Date.now(); ...` at `<program>` direct-child level. Drop produces E-PARSE-001 on the function body's closing `}` + E-SCOPE-001 on body-local identifiers. Distinct shape from the template-literal Bug 3 — the body has no template literals, just multi-line statements.

Workaround: keep the outer `${ }` wrapper.

### Recommendation

These three residual shapes are siblings of the BS-batch bugs but distinct enough that the existing 18-test regression suite didn't catch them. Worth a follow-up dispatch ("BS-batch v2") with:

1. Regression-test fixtures for each residual shape
2. Survey of BS-layer + downstream pass interactions for the three patterns
3. Per-shape fix

Aggregate est: ~6-12h (the surface is now narrow + well-mapped from the S93 BS-batch experience).

---

## Deferred 1 — `22-multifile/types.scrml` non-entry pure-type file requires `${}` wrapper

### Symptom

S85 Q2 canonical shape says: *"non-entry files (modules) have NO `<program>` wrapper at all, just imports + exports + declarations at file-top."*

`22-multifile/types.scrml` currently uses:

```scrml
${
  export type UserRole:enum = {
    Admin
    Moderator
    Member
    Guest
  }

  export function badgeColor(role: UserRole) -> string {
    match role {
      .Admin     => "red"
      ...
    }
  }
}
```

The `${}` wrapper is NOT canonical per S85 Q2. The expected shape per S85 + the in-file `§21.5 pure-type file` comment is:

```scrml
export type UserRole:enum = { ... }

export function badgeColor(role: UserRole) -> string { ... }
```

### Verification of current compiler behavior (S93 test)

Compiling the canonical bare-export shape fires:

```
warning [W-PROGRAM-001]: No <program> root element found. Consider wrapping your file content in <program> ... </program> for explicit configuration of database connections, protection, and HTML spec version.

error [E-IMPORT-001]: `export` declaration is placed outside a `${ }` logic block. All `export` statements must appear inside a `${ }` logic context. Wrap the declaration: `${ export type }`.
```

### Two distinct compiler issues

**Issue 1A — E-IMPORT-001 forces `${}` wrapper for file-top `export` declarations.** This is a direct contradiction of S85 Q2: non-entry files MUST be able to declare bare-top `export type` / `export function` without a `${}` wrapper. The current rule treats `export` as logic-context exclusive, but in a pure-module (no `<program>`) file, the entire file IS logic-context — there's no markup mode to switch into.

**Issue 1B — W-PROGRAM-001 fires misleadingly on pure-type / pure-module files.** Per SPEC §21.5 pure-type files are a canonical shape (no markup, no `<program>`). The W-PROGRAM-001 lint should suppress on files whose content is exclusively `export type` / `export function` / `import` declarations (the SPEC §21.5 shape). It currently fires regardless, encouraging adopters back toward `<program>` wrappers in pure-module files.

### Suspected root cause

**Issue 1A:** parser/pre-processor enforces `export` statements live inside a `${ }` logic block. The rule was authored when `${ }` was the only logic-context-bearing construct; post-S84 (program-as-container) introduced `<program>` body as logic-default, but the file-top non-entry case wasn't extended. Pure-module files need the same "default mode = logic" rule that `<program>` body now has.

**Issue 1B:** W-PROGRAM-001 emission site doesn't classify the file by content shape. Should detect "pure-module file" (no markup, only export/import/decl statements) and suppress.

### Workaround applied

22-multifile/types.scrml retained the `${}` wrapper from pre-v0.3. The agent's progress.md LESSON LEARNED #2 (the component-def auto-lift bug) covers the related case for `22-multifile/components.scrml`; this types.scrml case is a sibling concern with a distinct root cause (E-IMPORT-001 vs component-def lift gap).

### Spec references

- S85 Q2 ratification — non-entry files have NO `<program>` wrapper
- SPEC §21.5 — pure-type files
- SPEC §34 — E-IMPORT-001 catalog entry
- SPEC §34 — W-PROGRAM-001 catalog entry

### Est: 4-6h (split: parser export-context rule extension ~2-3h + W-PROGRAM-001 emission-site classifier ~2-3h)

### Test

Add `compiler/tests/unit/non-entry-file-bare-exports.test.js`:
- Pure-type file with bare `export type` + `export function` at file-top compiles clean
- W-PROGRAM-001 suppressed on pure-module shape
- Cross-file `import { UserRole } from './types.scrml'` resolves the bare-export

---

## Deferred 2 — `examples/23-trucking-dispatch/pages/driver/hos.scrml` non-entry page with stray `<program>` wrapper

**STATUS: CLOSED (S94, 2026-05-15 — commit `6c2e561`).** hos.scrml migrated to canonical `<page db= auth=>` shape; OQ-A/B/C resolved per `docs/changes/hos-restructure/SURVEY.md`. The 19-sibling-page corpus shape under `pages/{auth,customer,dispatch,driver}/` is now uniform. Restructure landed surgically — 0 new compile errors, the trucking-dispatch-smoke-integration regression test baseline updated to reflect the histo shift (counts mechanically explained in the test header). Spec-prose follow-ups surfaced in SURVEY §"Spec-prose follow-ups" (one §51.0.K wording clarification; two BS-layer attribute-validator + W-PROGRAM-001 suppression gaps — out of scope for this dispatch; cross-ref DEFERRED §1 for the W-PROGRAM-001 suppression sibling concern).

### Symptom

S85 Q2 canonical shape: non-entry files have NO `<program>` wrapper. `23-trucking-dispatch/` is the canonical multi-file app, with `app.scrml` as the entry file carrying the program-level config (`<program db= auth=>`). Every other file under `pages/`, `components/`, `channels/`, `models/` should be a non-entry file — no `<program>` wrapper.

**Audit during S93 sweep** confirmed all 23-trucking-dispatch subdir files are clean of `<program>` wrappers EXCEPT one outlier:

`examples/23-trucking-dispatch/pages/driver/hos.scrml` has:

```scrml
${
    import { DriverStatus } from '../../schema.scrml'
}

<engine for=DriverStatus initial=.OffDuty>     // engine OUTSIDE <program>
    ...
</>

<program db="../../dispatch.db" auth="required">  // ← redundant <program> wrapper

  ${
      import { driverStatusClasses, driverStatusLabel } from '../../components/driver-card.scrml'
      ...
  }

  <db src="../../dispatch.db" protect="..." tables="...">
    ${
        function getCurrentUser(sessionToken) { ... }
        ...
    }
    ...
  </>

</program>
```

The file is 424 lines, mostly server functions + markup. The `<program db="../../dispatch.db" auth="required">` wrapper is REDUNDANT with `examples/23-trucking-dispatch/app.scrml`'s `<program db="./dispatch.db" auth="required">`.

### Why it wasn't migrated in the S93 sweep

Substantial restructure required — not a simple wrapper drop:
- Engine declaration is currently file-top OUTSIDE the redundant `<program>` (legacy pre-v0.3 placement)
- `<db>` declaration is nested INSIDE the redundant `<program>`
- Multiple `${...}` wrappers nested at varying levels
- Server functions reference state cells declared inside the `<db>` body

The migration needs careful per-fragment analysis to preserve scope semantics. Filed as a deferred standalone dispatch rather than risk a brittle PA-hands-on edit.

### Open questions — resolved at S94 (per SURVEY)

**OQ-DEF2-A — db/auth attribute inheritance: RESOLVED — NO inheritance; canonical is explicit `<page db= auth=>`.**

The deferred-2 framing was off by one: the 19 sibling non-entry pages do not rely on silent inheritance from the entry-file `<program>`. Instead they use the canonical v0.3 Wave 1 first-class non-entry-page container — `<page>` — which accepts EXACTLY the four per-route attributes `{ db=, auth=, csrf=, ratelimit= }` (SPEC §4.15 line 1000, §40). Per SPEC §40 + W-AUTH-PAGE-INFERRED (§34 catalog row 14946) auth is explicitly NOT auto-inherited at the closure-analysis layer; the per-page `auth=` is the canonical declaration. hos.scrml's prior `<program db= auth=>` wrapper was not just redundant with `app.scrml`'s — it was using the WRONG container element entirely (should have been `<page>`, not `<program>`).

**OQ-DEF2-B — `<engine>` placement in non-entry pages: RESOLVED — INSIDE `<page>` body is canonical.**

Per SPEC §51.0.K Machine Cohesion footnote (S67 ratification, lines 21823-21844): engines MAY be declared at file scope OR inside another engine's composite state-child. The footnote enumerates these two loci explicitly but does not enumerate `<page>` body — but `<page>` body is mode-equivalent to `<program>` body per §4.15 line 1000 ("default-logic body"), both are file-scope-extensions for the runtime app, and §51.0.D's worked example (line 21480-21484) already shows engine elements grammatical inside `<page>`. Spec-prose follow-up surfaced: §51.0.K wording could be amended to explicitly enumerate `<page>` body as an allowed locus (SURVEY §"Spec-prose follow-ups" #1).

**OQ-DEF2-C — pre-existing E-CG-006 + I-AUTH-REDIRECT-UNRESOLVED: RESOLVED — E-CG-006 NOT firing at HEAD (S93 patch arc closed it); I-AUTH-REDIRECT-UNRESOLVED is pre-existing and unchanged by the restructure.**

The DEFERRED.md text was stale on E-CG-006 — the S93 patch arc bug #1 (route-inference.ts + emit-logic.ts + collect.ts 3-layer fix per primary.map.md) closed the `return ?{...}.method()` server-only-body-leak shape. Compiling `examples/23-trucking-dispatch/app.scrml` at HEAD `0aa2b18` (S94 open) surfaces ONLY I-AUTH-REDIRECT-UNRESOLVED + W-AUTH-LOGIN-MISSING. Post-restructure: same 2 warnings, unchanged.

### Dispatched + closed (S94)

Phases executed exactly as recommended above. Outcome:
- **Phase 0** (SURVEY) — OQ-A/B/C resolved per `docs/changes/hos-restructure/SURVEY.md` (~167 lines).
- **Phase 1** — `<program>` wrapper dropped; `<page db= auth=>` opener added; engine moved into `<page>` body (above the `<db>` block).
- **Phase 2** — imports consolidated into a single `${ }` block at top of `<page>` body. Server functions + state cells + markup preserved verbatim. Post-restructure standalone compile: 5 warnings (uniform with sibling pages), 0 errors. Full multi-file compile via `compileScrml({inputFiles: [...all 23-td .scrml files], emitPerRoute: true})`: 87 warnings total, 0 errors — `trucking-dispatch-smoke-integration.test.js` baseline updated with mechanical histo-delta explanation in test header.
- **Phase 3** — spec-prose gap on `<page>` body as engine-cohesion locus surfaced for spec-team follow-up (SURVEY §"Spec-prose follow-ups"). NOT a blocker (the SPEC's existing §4.15 + §51.0.D worked-example covers the natural reading).

### Cross-refs (post-close)

- `docs/changes/hos-restructure/SURVEY.md` — full empirical survey + OQ resolutions + diagnostic delta tables.
- Commit `c8ef5e7` — SURVEY landing.
- Commit `6c2e561` — restructure + test baseline update.

---

## Cross-link

- Canonical-examples sweep landing: commits `a011a1d` + `6469e96` + `1054f22`
- BS-layer corpus-friction bug batch: `docs/changes/bs-layer-corpus-friction-bugs/SCOPING.md` (related root-cause surface)
- S85 user-voice — Q2 verdict: ONE `<program>` per app; non-entry files have NO wrapper
- S86 user-voice — corpus is artifact, not evidence of design intent
- `feedback_stated_intent_vs_corpus_migration.md` (PA auto-memory) — migration not deliberation rule
