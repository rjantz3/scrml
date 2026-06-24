# escalation-2 — author `route=` on `server function*` (SSE) honored in APPLICATION mode

change-id: escalation-2-sse-author-route-app-mode-2026-06-23

## Phase 0 — empirical app-mode behavior (2026-06-23)

DONE. Compiled `server function* fspDeltas() route="/fsp/deltas"` in DEFAULT (browser) mode,
both (a) with `?{}` SQL body trigger and (b) `route=`-only.

Findings:
1. A `server function*` SSE ESCALATES to server in app/browser mode in BOTH cases — driven
   by the `server` keyword (explicit-annotation Trigger 4) that `server function*` carries.
   `route=` alone is NOT a standalone escalation trigger, but is not needed for SSE because
   `server function*` already escalates.
2. The SSE handler DOES mount at the author path — emit-server L1302 `path = route.explicitRoute
   ? route.explicitRoute : routePath(routeName)` and L1408 `path: JSON.stringify(path)` already
   honor `explicitRoute`. So the `path:` field is correct: "/fsp/deltas", NOT "/_scrml/<hash>".
3. BUG (the real gap): the emitted server.js is INVALID JavaScript — `export const /fsp/deltas =
   {...}`. The export BINDING NAME uses the route PATH instead of a valid JS identifier.
   Root cause: route-inference.ts L3664-3666 sets `generatedRouteName = fnNode.route` (the path)
   when `hasExplicitRoute`. emit-server L1301 `routeName = route.generatedRouteName` then L1407
   `export const ${routeName}` → `export const /fsp/deltas`. node --check FAILS.
   Same bug in the non-SSE branch (L2004) and routes-array regex (L2206 only matches
   `_scrml_*`/`__ri_route_*`).
4. PRE-EXISTING + OUT OF SCOPE: `route.lastEventId` inside an SSE body fires E-SCOPE-001
   ("Undeclared identifier route") REGARDLESS of author route= (confirmed with a no-route SSE).
   The synthetic `route` object isn't in the typer's scope. Separate diagnostic gap; surfaced
   in NOTES, not fixed here.

MINIMAL build: make `generatedRouteName` ALWAYS a valid generated identifier; keep the author
path solely in `explicitRoute` (already honored downstream). This makes app-mode emit valid JS
at the author path. Smaller than "new escalation trigger" — `server function*` already escalates.

## Phase 1 — compiler change: NEXT

DONE (2026-06-23). route-inference.ts L3664-3666: `generatedRouteName` now ALWAYS
`generateRouteName(name)` (a `__ri_route_*` identifier), never the explicit path.
The author path stays in `explicitRoute` (L3715, unchanged), which emit-server L1302/L1408
already honor for the `path:` field. ONE-site fix; covers SSE + non-SSE author-route alike.

Verified:
- SSE author route="/fsp/deltas" (browser mode) -> export const __ri_route_fspDeltas_1,
  path:"/fsp/deltas", routes=[__ri_route_fspDeltas_1], node --check VALID.
- non-author-route SSE -> path:"/_scrml/__ri_route_fspDeltas_1" (unchanged), VALID.
- non-SSE author route="/api/rows" -> path:"/api/rows", method:POST, VALID.

## Phase 2 — SPEC amendments: NEXT
## Phase 3 — tests + R26 full-suite: NEXT

NOTE (locked test): route-inference.test.js §19 asserted `generatedRouteName ==
"/oauth/callback"` — it LOCKED the buggy path-as-binding behavior (S96 pattern).
Corrected to assert a valid identifier + path in explicitRoute. Coupled with the
code change in the same commit (S113).

## Phase 2 — SPEC amendments (2026-06-23)

DONE. §12.3: scoped the "route names are compiler-internal" axiom to compiler-internal
routes (those paired with a generated scrml client fetch); added the foreign-facing
carve-out (author route= on a `server function*` SSE / handle() = author-owned contract
URL; serve-side mirror of <api> BYOB S210). §12.6: added an app-mode carve-out bullet
(author route= honored in browser mode, not only library mode) — library-mode statements
kept intact. §37.3: added the author-route mounting rule + clarified route NAME (JS binding,
always __ri_route_*, distinct from PATH). §34: NO new codes (carve-out, no new diagnostic).
SPEC-INDEX regenerated (60 rows).
