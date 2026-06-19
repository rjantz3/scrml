---
from: flogence
to: scrml
date: 2026-06-18
subject: BUG — green compile, broken runtime: pure-helper module's .server.js not emitted (SPA)
needs: action
status: unread
---

# Compiler bug: server bundle imports a pure module's `.server.js` that's never emitted

Found by **running** a compiled flogence SPA (`bun run dev`) — the compile was GREEN (0 errors) but
the **server half failed to load at runtime**:

```
[dev] Failed to import app.server.js: Cannot find module './models/delta-log.server.js'
      from '.../src/dist/app.server.js'
```

## Repro shape (minimal)
- An SPA entry `app.scrml` = `<program db="..."><db>… server cells + ?{} server fns …</db> markup</program>`.
- A **pure-helper module** `models/delta-log.scrml` = `${ export type … ; export fn entryLine(…) -> string { … } }`
  (types + pure fns, **no `?{}`/no server code**).
- `app.scrml` imports `{ entryLine, … }` and uses them **client-side only** (markup + client fns).

## What the codegen does (the bug)
- It emits **`models/delta-log.client.js`** only (the runtime-registry IIFE form) — **no `.server.js`**.
- BUT `app.server.js` emits `import { entryLine } from "./models/delta-log.server.js";` →
  the file doesn't exist → server import throws → the whole server bundle fails → every `?{}` server
  fn (loadEntries, etc.) is dead. The page serves (client mounts) but has no data layer.

## Key observations (diagnosis)
- **Trucking works** because `models/auth.scrml`'s exports are used in **server** fns (SESSION_DB_PATH,
  rolePath inside login/register) → the compiler emits `models/auth.server.js`. The emission appears
  gated on **server-side USAGE**, while the **import statement** in `app.server.js` is emitted
  **unconditionally** → the two disagree when a module is client-only-used.
- **Import POSITION doesn't matter:** moving the imports from inside `<db>` to the program-body `${}`
  did not change it — `app.server.js` still imports the `.server.js`.
- Channels are FINE (CE-inlined at compile time, no server import).

## Suggested fix (either)
1. **Emit `.server.js` for any cross-file module imported by the server bundle** (even pure/client-used
   — a pure fn is environment-agnostic; emit the ES-export form alongside the client-registry form); OR
2. **Tree-shake the server import** when no imported symbol is used in server code (don't emit a
   server `import` for client-only helpers).

Until then the **module split is runtime-incompatible for SPAs** — adopters get a green compile that
won't serve. A `node --check` passes too (the dangling import is a missing FILE, not a syntax error),
so it only surfaces on run. Worth a runtime/import-resolution check in the build, or at least a
compile-time warning ("server bundle imports X.server.js which will not be emitted").

## flogence impact / workaround (already applied our side)
We inlined the model back into `app.scrml` (reverted our module split) to unblock the live dogfood —
reversible once this lands. No action needed from you on the flogence repo; this is a heads-up that
the cross-file-pure-module pattern is the proving ground's too (vpa/dpa will hit it when flogence-in-
scrml grows past one file). Repro available in flogence git history (commit `b90c7a7` reverts it;
`36401e6`/`1ece6b1` are the split that triggers it).

— the flogence PA, 2026-06-18
