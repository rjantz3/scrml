## hos.scrml restructure — survey + OQ resolution

**Filed:** 2026-05-15 (S94)
**Dispatch:** restructure `examples/23-trucking-dispatch/pages/driver/hos.scrml` from the legacy `<engine>` + `<program>` shape to the canonical non-entry-page `<page>` shape, matching the 19 sibling pages in the same corpus.
**Origin:** `docs/changes/canonical-examples-sweep/DEFERRED.md` §2.
**Baseline SHA:** `0aa2b18` (S94 mid-arc — worktree re-based onto main after the briefing-cited base `de84260` triggered a stale self-host-smoke test gate; sibling commit `1f73732 fix(codegen): v0.3.x SPA tree-shake — shared-runtime union + wire chunk + hash filename` had updated the test assertion to accept content-addressed runtime filenames between briefing and dispatch).

---

## Phase 0 — Empirical survey

### Corpus audit — wrapper shape across 23-trucking-dispatch

Non-entry files in `23-trucking-dispatch/{pages,components,channels,models}/` use TWO canonical shapes:

| Shape | Files | Notes |
|-------|-------|-------|
| `<page db= auth=>` wrapper | 19 page files under `pages/` | The canonical page shape (per SPEC §40 / §4.15 v0.3 Wave 1) |
| `${ ... }` file-top module wrapper | components/, channels/, models/auth.scrml, schema.scrml, seeds.scrml | Pure-module shape (cross-ref DEFERRED.md §1 — `types.scrml` parallel) |
| **`<engine>` then `<program>` (outlier)** | **`pages/driver/hos.scrml` ONLY** | The migration target |

The 19 sibling `<page>`-wrapped files presumably compile clean (M1-M6 ship status per README); `<page>` is the canonical per-route container in multi-page apps.

### OQ-DEF2-A — db/auth attribute inheritance

**Resolution: NO inheritance — `<page>` carries `db=` + `auth=` EXPLICITLY.**

The DEFERRED.md §2 prose framed this as "does the entry-file `<program db= auth=>` propagate the `db=` + `auth=` config to all non-entry pages?". The empirical answer is more precise:

1. Non-entry pages do NOT use a `<program>` wrapper, but they ALSO do NOT rely on silent inheritance of `db=` / `auth=` from the entry-file `<program>`.
2. Instead, the canonical sibling shape is `<page db="../../dispatch.db" auth="required">` — `<page>` is a v0.3 Wave 1 first-class structural element (SPEC §4.15 line 1000, §40) that accepts EXACTLY the four per-route attributes `{ db=, auth=, csrf=, ratelimit= }`.
3. SPEC §40.1.1 + W-AUTH-PAGE-INFERRED (catalog row 14946) explicitly states auth is NOT auto-inherited at the closure-analysis layer: *"program-level auth still enforces at the request boundary, but the closure-analyzer ships the page ungated. The lint nudges adopters to add explicit per-page `auth=` so closure analysis can classify the page accurately."*

So the correct restructure pattern is `<page db="../../dispatch.db" auth="required">` — matching every sibling driver/* page.

**Compiler-side note (pre-existing, NOT introduced by this restructure):** when a `<page>` page is compiled STANDALONE (`bun run compile pages/driver/messages.scrml`), the compiler fires `W-PROGRAM-001` ×2 and `W-ATTR-001` on `db=`. Per SPEC §4.15 line 1000 the `<page db=>` attribute IS canonical — the W-ATTR-001 fire is a BS-layer attribute-validation gap. The W-PROGRAM-001 fire mirrors the deferred-1 pure-module file issue (Issue 1B in DEFERRED.md §1). These warnings are reproduced uniformly across all 19 sibling pages — they are pre-existing standalone-compile artifacts, NOT migration regressions.

### OQ-DEF2-B — `<engine>` placement in non-entry pages

**Resolution: `<engine>` placement INSIDE `<page>` body is the natural composition; SPEC permits it implicitly.**

SPEC anchors:
- §51.0.K Machine Cohesion footnote (S67 ratification, lines 21823-21844): *"Engines MAY be declared at **file scope**. Engines MAY be declared inside **another engine's state-child body** (composite state-children — see §51.0.Q)."* Engines MAY NOT be declared inside component bodies, function bodies, snippet bodies, or scopes without a singleton-ownership chain to file load.
- §4.15 line 1000: `<page>` body is "default-logic body (mode-equivalent to `<program>` body in v0.3)" — `<page>` body IS the file-scope-extension for a route; its singleton-ownership chain to file load is direct (file → `<page>`).
- §51.0.D line 21480-21484 shows `<MarioMachine/>` mounted INSIDE `<page>` body — that example is cross-file-mount, but it demonstrates that engine elements (singletons) are grammatical inside `<page>` body.
- §38 line 16059 invokes the "engine-parity precedent (§21.8 / B14)" for file-top engines in pure-module files, but the parity is about ALLOWED-AT-FILE-TOP, not FORBIDDEN-INSIDE-PAGE. There is NO SPEC text forbidding `<engine>` inside `<page>` body.

**Open spec-prose gap (NOT a blocker for this restructure):** the §51.0.K footnote enumerates the allowed loci ("file scope" + "composite state-child body") but does not explicitly include `<page>` body. Since `<page>` body is mode-equivalent to `<program>` body, and both are file-scope-extensions for the runtime app, the natural reading is that `<page>` body counts as "file scope" for engine cohesion purposes. The SPEC could clarify this with one sentence in §51.0.K — surfaced as a spec-prose follow-up.

**Practical decision for this restructure:** place `<engine>` INSIDE `<page>` body (in the v0.3 logic-default region above the markup body). Two rationales:
1. Same-file engine `decl=mount` (§51.0.D): the engine's body is the rendered output at its declared position. The HOS engine ISN'T being rendered as page content here — it's a logical state-machine with effects + transitions consumed via `@driverStatus`. The actual page-rendered HOS UI is custom markup (`<section>` blocks). Placing the engine declaration above the markup (early in the page body) makes the auto-declared `@driverStatus` cell available to the rest of the body via the hoisting model (§6.9).
2. File-top placement OUTSIDE `<page>` would force the engine to live in module-file shape (per §51.0.K + §38.12 parity precedent). But hos.scrml is NOT a pure-module file — it has a route (renders at `/driver/hos`) — so wrapping the engine declaration in a file-top sibling of `<page>` would mix two architectural shapes in one file (file-top module-shape + `<page>` route-shape).

**Bonus simplification observed:** in the current `hos.scrml`, the `<engine>` declaration's auto-declared `@driverStatus` cell is NEVER READ by the file's logic. The state machine is defined but the actual state tracking is done via `@currentDriver.current_status` (DB-derived). The `<engine>` is documentary/aspirational. So whether it goes inside `<page>` body or at file-top, the runtime effect is identical (no code path reads `@driverStatus`). The restructure picks "inside `<page>` body" for SPEC alignment (single-architecture-per-file).

### OQ-DEF2-C — pre-existing E-CG-006 + I-AUTH-REDIRECT-UNRESOLVED

**E-CG-006: NOT firing at HEAD.** The DEFERRED.md §2 text says *"`E-CG-006`: server-only pattern in client JS output (security violation; pre-existing, NOT migration regression per S93 verify)"*. At HEAD `de84260` (S93 close), compiling `examples/23-trucking-dispatch/app.scrml` surfaces ONLY:

```
info [I-AUTH-REDIRECT-UNRESOLVED]: ... "/login" does not match any page URL pattern ...
warning [W-AUTH-LOGIN-MISSING]: ... no page in the compilation unit matches any of these paths ...
```

The S93 patch arc closed E-CG-006 (per primary.map.md S93 bug #1) — the 3-layer fix in route-inference.ts + emit-logic.ts + collect.ts caught the `return ?{...}.method()` shape. So this restructure has no pre-existing E-CG-006 to worry about.

**I-AUTH-REDIRECT-UNRESOLVED: pre-existing; expected.** Fires because no `<page>` in the compiled set has URL `/login`. The `pages/auth/login.scrml` file IS in the corpus but is not compiled as a sibling-page in the single-file `compile app.scrml` invocation (the per-route splitter only sees app.scrml as the entry). This is a downstream concern of multi-file route resolution under per-route splitter; out of scope for this restructure.

**`bun run compile examples/23-trucking-dispatch/app.scrml --emit-per-route` baseline (HEAD, pre-restructure):**

```
info [I-AUTH-REDIRECT-UNRESOLVED] x1   (app.scrml)
warning [W-AUTH-LOGIN-MISSING] x1     (app.scrml)
warning [W-CG-CHUNK-EMPTY] x1         (per-route splitter — app.scrml entry produces empty per-role chunks)
warning [W-CG-CHUNK-PREFETCH-UNRESOLVED] x1   (per-route splitter — 4 RouteMap.pages entries, but app.scrml's own internal links don't resolve to them)
```

`bun run compile examples/23-trucking-dispatch/pages/driver/hos.scrml` (HEAD, standalone — pre-restructure):

```
warning [W-PROGRAM-REDUNDANT-LOGIC] x1  (the inner `${ import {...} }` under <program>)
info [W-PROGRAM-SPA-INFERRED] x1        (because hos.scrml is treated as its own entry)
warning [E-DG-002] x1                   (@currentUser declared but never consumed)
info [I-AUTH-REDIRECT-UNRESOLVED] x1
warning [W-AUTH-LOGIN-MISSING] x1
```

---

## Phase 1+2 — Restructure plan

**Target shape (matches sibling `pages/driver/messages.scrml` exactly):**

```scrml
// (comments preserved verbatim)

<page db="../../dispatch.db" auth="required">

  ${
      import { DriverStatus } from '../../schema.scrml'
      import { driverStatusClasses, driverStatusLabel } from '../../components/driver-card.scrml'
      import { createSessionStore } from 'scrml:store'
      import { SESSION_DB_PATH } from '../../models/auth.scrml'
  }

  <engine for=DriverStatus initial=.OffDuty>
      <OffDuty      rule=(.OnDuty | .SleeperBerth)></>
      <OnDuty       rule=(.OffDuty | .Driving)></>
      <Driving      rule=(.OffDuty | .OnDuty)></>
      <SleeperBerth rule=(.OnDuty | .OffDuty)></>
  </>

  <db src="../../dispatch.db" protect="password_hash" tables="users, drivers, log_entries">
    ${ /* server functions + state cells + markup-rendering helpers */ }
    <div class="min-h-screen ..."> /* page markup */ </div>
  </>

</page>
```

Changes from current shape:
- DROP outer `<program db= auth=>` opener + closer.
- ADD `<page db= auth=>` wrapper (canonical sibling shape).
- MOVE the file-top imports `${ import { DriverStatus } from '../../schema.scrml' }` into the `<page>` body's first logic block (consolidating with the other imports — single `${}` import wrapper at the top of `<page>` body, matching messages.scrml).
- MOVE the `<engine>` declaration INSIDE `<page>` body (placed BEFORE the `<db>` block — engine declares before the SQL surface uses it).
- PRESERVE all server functions, state cells, lifecycle hooks, markup verbatim.

Note: per W-PROGRAM-REDUNDANT-LOGIC, v0.3 `<page>` / `<program>` body is logic-default — the `${ ... }` wrappers around `function` declarations + state cells should drop. However, per DEFERRED.md §S93-residuals (BS-layer Bug 3/3-adj edge cases), some bodies cannot drop the wrapper without firing E-SCOPE-001 / E-PARSE-001 — so the migration KEEPS those wrappers where they exist in sibling messages.scrml (one outer `${}` around the imports block; another around the server-fn / state-cell block). The corpus shape is: imports-`${}` + decls-`${}`, with markup outside. This restructure matches that shape.

---

## Phase 3 — Compile verification (planned)

After restructure, baseline comparison:

| Diagnostic | Pre (HEAD baseline, app.scrml) | Post (restructure, app.scrml) | Verdict |
|------------|---------------------------------|-------------------------------|---------|
| `I-AUTH-REDIRECT-UNRESOLVED` | 1 | expect 1 (unchanged) | pre-existing |
| `W-AUTH-LOGIN-MISSING` | 1 | expect 1 (unchanged) | pre-existing |
| (per-route splitter) `W-CG-CHUNK-EMPTY` | 1 | expect 1 (unchanged) | pre-existing |
| (per-route splitter) `W-CG-CHUNK-PREFETCH-UNRESOLVED` | 1 | expect 1 (unchanged) | pre-existing |
| New errors introduced by restructure | — | 0 (target) | success criterion |

For standalone `compile pages/driver/hos.scrml`:

| Diagnostic | Pre | Post | Verdict |
|------------|-----|------|---------|
| `W-PROGRAM-REDUNDANT-LOGIC` x1 | 1 | expect 0 (the inner `${import}` will fold into outer page-body logic-default) | improvement |
| `W-PROGRAM-SPA-INFERRED` x1 | 1 | expect 0 (file no longer has `<program>` at all → SPA inference doesn't fire) | improvement |
| `E-DG-002` x1 (`@currentUser` unused) | 1 | expect 1 (orthogonal to restructure; pre-existing dead state) | pre-existing |
| `I-AUTH-REDIRECT-UNRESOLVED` x1 | 1 | expect 1 | pre-existing |
| `W-AUTH-LOGIN-MISSING` x1 | 1 | expect 1 | pre-existing |
| `W-PROGRAM-001` x2 (new — `<page>` standalone) | 0 | expect 2 | uniform with sibling pages |
| `W-ATTR-001` on `db=` (new — `<page db=>` not recognized by BS) | 0 | expect 1 | uniform with sibling pages; BS-layer gap |
| `W-AUTH-001` (auth-mw auto-inject — new) | 0 | expect 1 | uniform with sibling pages |

Net result for standalone compile: shifts from "treated-as-SPA-program-with-redundant-logic" to "treated-as-pure-non-entry-page". Multiple new warnings appear, but they all reproduce uniformly across the 18 other sibling pages, so they are not regressions from this restructure — they are the canonical-non-entry-page-standalone-compile-noise pattern, which is a separate BS-layer concern (cross-ref DEFERRED.md §1).

---

## Spec-prose follow-ups surfaced

1. **§51.0.K Machine Cohesion footnote** does NOT explicitly enumerate `<page>` body as an allowed engine declaration locus. The current text says "file scope" + "composite state-child body"; since `<page>` body is mode-equivalent to `<program>` body (per §4.15 line 1000), the natural reading is that `<page>` body counts as a file-scope-extension for engine cohesion. The footnote could be amended to read: *"Engines MAY be declared at file scope, OR inside `<program>` / `<page>` body (both are logic-default file-scope-extensions per §4.15 + §40)."* Filed for spec-team review; not part of this dispatch.

2. **BS-layer attribute validation gap for `<page>` attributes**: `db=`, `auth=`, `csrf=`, `ratelimit=` are canonical per SPEC §4.15 / §40 but the BS-layer attribute validator does not recognize them, firing W-ATTR-001 on every `<page db=>`. Fix surface: attribute-slot catalog for `<page>` in the relevant validation pass. Outside this dispatch scope per "DO NOT modify compiler source"; cross-ref DEFERRED.md sibling concern.

3. **W-PROGRAM-001 on `<page>`-only files** (standalone compile): the lint should suppress when the file declares a `<page>` element, since `<page>` is the canonical non-entry-page wrapper. Currently fires twice on every sibling page (uniform pre-existing artifact). Cross-ref DEFERRED.md §1 Issue 1B (analogous suppression need for pure-module files).
