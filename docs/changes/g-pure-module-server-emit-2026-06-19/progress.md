# g-pure-module-server-emit-2026-06-19 — progress

## Bug
SPA imports a PURE-helper module (types + pure fns, no `?{}`). Codegen emits the module's
`.client.js` but NOT a `.server.js` (emit-server.ts early-returns "" when no server fns/auth/
channels/serverAuthority → api.js gates the write on `output.serverJs` truthiness). YET the
consumer's `app.server.js` emits `import { ... } from "./models/<mod>.server.js"` UNCONDITIONALLY
(emit-server.ts:561-580 iterates all imports, rewrites .scrml→.server.js, no usage check).
→ dangling import → server bundle throws at runtime. Green compile (node --check passes; missing
FILE not syntax error). The "compiled-green ≠ actually works" class.

## Loci found
- emit-server.ts:561-580 — UNCONDITIONAL server-import emission (the .scrml→.server.js rewrite loop)
- emit-server.ts:534-542 — early-return "" gate (no server fns → empty serverJs)
- api.js:2260-2264 — `if (output.serverJs)` write gate (skips write when serverJs is "")

## Timeline
- [step 0] Startup verified, base FF-merged to main 36e022bc, bun install + pretest OK.
  Maps read (lag HEAD, no module-split routing section — verified against live source instead).
  Loci confirmed via grep. Next: Phase 0 reproduce.

- [step 1] REPRODUCED on worktree compiler. Repro at /tmp/pure-mod-repro (models/log.scrml pure
  module + app.scrml SPA importing entryLine/Entry client-side only):
  (a) exit 0 green; (b) app.server.js:8 `import { entryLine, Entry } from "./models/log.server.js"`;
  (c) models/log.server.js ABSENT (only log.client.js); (d) `node --check app.server.js` PASS,
  but `bun -e import(app.server.js)` THROWS `Cannot find module './models/log.server.js'`.
  Also confirmed: entryLine/Entry are imported but NEVER referenced in app.server.js body (dead import).
  Trucking auth.server.js IS emitted because auth's exported fns route-infer to server handlers
  (serverFns.length>0 → no early-return); some of its imported symbols used server-side (rolePath 2x,
  SESSION_TTL_SECONDS 3x), others import-only.

- [step 2] FIX DECISION = Option 2 (tree-shake the server import). Rationale vs Option 1:
  * Client AND server emit ALL named import specifiers incl. TYPE imports (Entry). A pure module's
    .server.js (Option 1) would export the runtime fn but NOT the erased type Entry → `import {entryLine,Entry}`
    STILL link-errors on Entry. Option 1 requires ALSO type-filtering specifiers. Option 2 sidesteps:
    a client-only-used symbol (incl. a type) is simply not referenced server-side → pruned.
  * Option 2 is MINIMAL (output discipline): a dead import referencing a non-emitted file is the bug.
  Two-part fix:
    (A) emit-server.ts import loop — prune local-.scrml import specifiers not referenced in the
        emitted server body; drop the whole import line when all specifiers are unused (the bug case).
    (B) api.js write phase — NEW cross-file post-emit invariant: scan each emitted .server.js for
        `from "./*.server.js"` imports; if the target isn't in the emitted .server.js set, fire a
        Warning (W-SERVER-IMPORT-UNEMITTED). Reliable cross-file check (emit-server lacks sibling
        emission knowledge); defense-in-depth that also catches a genuinely-server-USED pure-module fn.

- [step 3] FIX (A) emit-server.ts LANDED — deferred local-`.scrml` named imports +
  post-assembly usage-prune (sentinel LOCAL_SERVER_IMPORT_SENTINEL + localServerImportNameUsed
  + pruneUnusedLocalServerImports inline). +94 lines.
  REPRO NOW SERVES: app.server.js no longer imports log.server.js (dead import dropped);
  `node --check` PASS; `bun import(app.server.js)` → IMPORT OK — routes: 1 (was: Cannot find module).
  Client unchanged (entryLine still destructured from _scrml_modules client-side).

- [step 4] SURFACED — trucking has a PRE-EXISTING (on main, before my change) DISTINCT bug:
  `rolePath` is a pure helper CALLED server-side (login() → rolePath(row.role)), but auth.scrml's
  exported pure fns ROUTE-INFER into HANDLERS (__ri_route_rolePath_4) — auth.server.js emits the
  ROUTE but NOT a `export const rolePath` value. So app.server.js `import { rolePath }` (value) →
  `SyntaxError: Export named 'rolePath' not found`. BASELINE main ALSO throws this (verified against
  the pre-fix /tmp/trucking-out compile). My change is NOT a regression — both pre/post throw on the
  SAME pre-existing missing-EXPORT issue; my change additionally PRUNES 6 of 8 dead specifiers
  (minimal output win). This missing-EXPORT case is the "genuinely-server-USED pure-module fn"
  variant — the W-SERVER-IMPORT-UNEMITTED warning (api.js, step 5) will catch BOTH the missing-FILE
  (my repro) AND missing-EXPORT (trucking) variants. Deferred: the route-mis-inference of a
  server-called pure helper is a separate gap (out of this brief's scope).
