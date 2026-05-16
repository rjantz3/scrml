# Bug 18 — `scrml:NAME` capability imports break client runtime

## Investigation

### Reproduction confirmed

Compiled the brief's repro at `/tmp/bug18-repro/bug18.scrml`. Output:
- `bug18.client.js` line 4: `import { sortBy } from "scrml:data";` — verbatim bare specifier.
- `bug18.html` line 16: `<script src="bug18.client.js"></script>` — no `type="module"`.

Two distinct browser failures cascading:
1. Even if `scrml:data` resolved, the `<script>` tag is non-module → SyntaxError on `import`.
2. The `scrml:data` shim does not exist on disk in `compiler/runtime/stdlib/`. Only `auth.js`, `crypto.js`, `host.js`, `store.js` ship as shims today.

### Existing infrastructure

1. `compiler/src/api.js` already has `collectStdlibSpecifiers`, `bundleStdlibForRun`, and `rewriteStdlibImports`. They wire `import { x } from "scrml:auth"` → `import { x } from "./_scrml/auth.js"` and copy a hand-written shim from `compiler/runtime/stdlib/auth.js` to `<outputDir>/_scrml/auth.js`. The path-rewrite is correct.
2. The browser STILL fails because the resulting `import` is ES-module-syntax in a non-module `<script>`.
3. Server-side `import { x } from "./_scrml/auth.js"` works in Bun (loads as ESM by file ext).

### Spec scan

- **§21** is silent on stdlib bundle / runtime resolution shape; it defines source-level import semantics only.
- **§41** is normative on protocol prefixes + resolution hierarchy. Quote: "The compiler SHALL emit the import statement verbatim into the compiled JS output" applies ONLY to `bun:` / `node:` prefixes (§41.4 line 18039). For `scrml:`, §41.5 mandates resolution to compiler-bundled stdlib or vendor — the spec assumes resolution happens; it does NOT mandate the wire shape.
- §41 leaves room for any resolution mechanism that yields the correct runtime semantics.

### Decision: Approach 2 (extended) — runtime stdlib registry + import rewrite

**Chosen: Hybrid of approach 2 and 3 from the brief.**

Rationale:
- **Approach 1 (inline)** — copies every stdlib symbol per file. Bloats client.js, defeats cross-file caching. Reject.
- **Approach 4 (tree-shaken inline)** — clever but per-file emit; same cache-loss problem as #1. Reject.
- **Approach 3 (importmap + type="module")** — most "web-standards" approach, but pulls importmap into the HTML (one more emission surface, one more thing for an adopter to misconfigure), and changes the script-tag shape (`type="module"` ripples through every test that asserts the `<script>` line shape).
- **Approach 2 (bundle in runtime registry)** — minimal new emission. The pre-existing `bundleStdlibForRun` mechanism is half of approach 2 already; we just need to:
  1. Make sure a `data.js` shim exists for the bug-18 repro symbols (and that we can resolve the import via a non-ESM mechanism in the browser),
  2. Rewrite the bare `import { sortBy } from "scrml:data"` to NON-import code in client.js — a synchronous lookup against a global registry the runtime exposes.

The cleanest fit for "minimal output, readable code, no `type="module"` change" is:
- The runtime exposes a global `_scrml_stdlib` registry.
- Each `<outputDir>/_scrml/<name>.js` is loaded as a NON-module `<script src="./_scrml/<name>.js"></script>` BEFORE the client.js. Each shim is rewritten to assign its exports onto `_scrml_stdlib.<name> = { ... }`.
- `emit-client.ts` rewrites `import { sortBy, groupBy } from 'scrml:data'` → `const { sortBy, groupBy } = _scrml_stdlib.data;`.

But — that requires touching every existing shim (auth/crypto/store/host) and the test that loads them with `await import()`. Heavy.

**Final choice: Approach 3 (importmap + type="module").** Recommend Approach 3 for the long-term, but it has a meaningful blast radius.

OK reconsidering. Pure analysis of trade-offs:

| Approach | Cost | Adopter ergonomics | Cache | Spec fit |
|---|---|---|---|---|
| 1 — inline | per-file bloat | invisible | none | silent on bundling |
| 2 — runtime registry | rewrite shims to UMD-ish | invisible | runtime cached | silent on bundling |
| 3 — importmap + type=module | HTML emission delta + html-shape tests update | invisible | per-file cached natively by browser | silent on bundling, but most standards-aligned |
| 4 — tree-shaken inline | per-file bloat (smaller) + per-file analysis | invisible | none | silent |

**Chosen: Approach 3 (importmap + `type="module"`)**. Three reasons:

1. **It's the standards-compliant mechanism browsers already provide.** Import maps were designed for exactly this case: "I want to write `import { x } from 'scrml:data'` in source and have the browser resolve it." Anything else (registry hack, inline, etc.) is fighting the platform.
2. **It leaves emitted client.js IDENTICAL to source intent.** The whole point of generating readable JS is that someone reading `bug18.client.js` should see `import { sortBy } from "scrml:data"` — not `const { sortBy } = _scrml_stdlib.data` (which is a confusing intermediate that doesn't look like ESM or like scrml).
3. **The pipeline already invokes `bundleStdlibForRun` which lands stdlib JS at `<outputDir>/_scrml/<name>.js`.** Combined with rewrite, the importmap entry `{"scrml:data": "./_scrml/data.js"}` makes the browser do exactly what Bun already does on the server.

However:
- Approach 3 requires `type="module"` on the client.js script tag, plus a defer/module-load-ordering arrangement so the runtime is ready before the client module evaluates.
- The existing runtime is loaded via classic script. Two options:
  - (a) Convert runtime to module too (large blast radius — `_scrml_*` globals are read by tests etc.).
  - (b) Keep runtime as classic; load client.js as module. The runtime's globals are written to `window.*` (since classic scripts run in non-strict global scope), so the module client.js can read them. Same as today's effective scope.

(b) is the minimal-blast-radius variant. Let me go with that.

**Concrete plan:**

1. Add the `scrml:data` shim so the bug-18 sortBy resolves. Authoring a `compiler/runtime/stdlib/data.js` mirrors what `auth.js` does — the stdlib `transform.scrml`/`validate.scrml` source is real scrml that today's compiler can't lower to library JS in the dev-server path (same M16 gap auth.js mentions). Hand-authoring a JS shim is consistent with the existing pattern.
2. In `emit-html.ts`'s page-doc-emission path, emit `<script type="importmap">` BEFORE the runtime script tag. The importmap entries are `{"scrml:<name>": "./_scrml/<name>.js"}` for each name in `bundledStdlib`. We need the bundled set to reach HTML emission — `ctx.bundledStdlibNames` probably needs threading.
3. Change the client.js script-tag emission to `<script type="module" src="..."></script>` ONLY when the file uses `scrml:` imports (preserves byte-identity for stdlib-free files).
4. Keep `rewriteStdlibImports` doing its job — it computes the correct relative path. BUT for the importmap path to work, the import statement needs to keep `scrml:NAME` form, not be rewritten to `./_scrml/NAME.js`. So the rewrite has to become: keep `scrml:NAME` in CLIENT JS, but rewrite to relative in SERVER JS.
5. Update the OQ-2 test to reflect the new client.js shape (server-side rewrite unchanged).
6. Update the misleading comment in `emit-client.ts:645`.
7. Add bug-18 regression test.

Wait — actually, the importmap approach has a subtle complication. With current `rewriteStdlibImports` doing client JS, the bare `scrml:` is rewritten to a relative path. If we keep `scrml:` for client, we need a code path that excludes the client JS from rewrite. The simplest split: `rewriteStdlibImports` continues for server JS (Bun resolves via filesystem); the client JS keeps `scrml:` bare and the browser resolves via importmap.

Hmm wait — `bundleStdlibForRun` IS necessary regardless because it puts the shim on disk for both browser AND server to load. Server's resolution is via relative path rewrite. Browser's is via importmap that maps `scrml:NAME` → `./_scrml/NAME.js`. The bundle step itself is unchanged.

The needed deltas are:
- (a) `data.js` shim: NEW FILE.
- (b) `emit-client.ts`: stop rewriting `scrml:NAME` away into a `./_scrml/...` relative path. Keep it bare so the importmap can resolve.
   - Actually wait — `rewriteStdlibImports` is invoked from `api.js` post-codegen, NOT from inside `emit-client.ts`. So the change is in `api.js`: skip the rewrite for `output.clientJs`.
- (c) `emit-html.ts`: emit an importmap if `ctx.bundledStdlibNames` is non-empty.
- (d) `codegen/index.ts`: change the script tag for client.js to `type="module"` when stdlib is imported.
- (e) Thread `bundledStdlibNames` from `api.js` (where it knows the bundled set) down to ctx so html emission can read it. OR have html emission read from the file's own imports + ctx flag — actually emit-html.ts already runs INSIDE the per-file codegen and may not know the global bundle set. Let me put a flag on the runCG input.

Let me look at how runCG is wired today to confirm the cleanest threading.

## Decision revisited — the importmap path has a fatal scope issue

Tested the importmap approach mentally against the actual runtime structure:

- The runtime is a CLASSIC script (`<script src="scrml-runtime.X.js">`). Its top-level `const _scrml_state = {}` etc. are bindings in the realm's **script declarative environment** — visible to other classic scripts in the same realm.
- A MODULE script has its OWN ModuleEnvironmentRecord whose imports are looked up against its own module-scoped bindings. A module CANNOT see classic-script `const`/`let` bindings (it can see globals on `window` / `globalThis` only).

If `client.js` becomes `type="module"`, every `_scrml_reactive_get`, `_scrml_lift`, `_scrml_deep_reactive`, etc. emitted by the client codegen FAILS because the module cannot see the classic script's `const`s. The only way to make Approach 3 work is one of:
- Make the runtime ALSO a module (large blast radius — tests, embed-mode, every emitter that assumes shared lexical scope).
- Make every runtime `const _scrml_*` also assign to `globalThis._scrml_*` (a sprawling refactor).
- Inline the runtime into every module client.js (defeats caching).

**None of these is appropriate for a single-bug fix dispatch.**

## Final choice: Approach 2 (revised) — runtime stdlib registry, classic-script-globals everywhere

Keep everything as classic scripts. Add stdlib functions as new tree-shakable runtime chunks (`stdlib-data`, etc.) that populate a global `_scrml_stdlib` registry. Rewrite client.js `import { sortBy } from 'scrml:data'` to `const { sortBy } = _scrml_stdlib.data;` at emit time.

Rationale:
- No `type="module"` change to script tags → byte-identical HTML for stdlib-free files.
- No importmap needed → no HTML emission delta.
- Runtime stays a classic script → no scope-visibility regression.
- Runtime size grows but tree-shaking keeps unused stdlib out (existing `detectRuntimeChunks` + `assembleRuntime` mechanism).
- Cross-file caching: the runtime IS the cache — `scrml-runtime.HASH.js` is shared across all files in an app, so stdlib code in it is cached once.
- Server JS continues to use `import { sortBy } from "scrml:data"` → rewritten to `./_scrml/data.js`. Bun resolves it. No server-side change needed.
- Adopter ergonomics: invisible — they keep writing `import { sortBy } from 'scrml:data'` in source; compiler handles browser vs server emission.

### Step-by-step plan

**Step 1** — Author `compiler/runtime/stdlib/data.js` (currently missing; bug-18 repro can't even bundle). Hand-port symbols from `stdlib/data/transform.scrml` + `validate.scrml` + `parse.scrml` + `messages.scrml`. Mirrors auth.js / crypto.js / host.js / store.js shape. This makes the SERVER side work today.

**Step 2** — Update `compiler/src/runtime-template.js` to include a `_scrml_stdlib` registry at module top + a stdlib chunk per stdlib module (data, auth, crypto, store, host, time, format — at least the ones with shims today). Each chunk reads its shim from the corresponding `compiler/runtime/stdlib/<name>.js` file and inlines the function definitions into a `_scrml_stdlib.<name> = { ... }` assignment.

**Step 3** — Update `compiler/src/codegen/runtime-chunks.ts` to register a new chunk per stdlib name (gated by usage detection).

**Step 4** — Update `compiler/src/codegen/emit-client.ts` to:
- Detect which `scrml:NAME` imports are used in this file.
- For each such import, mark the corresponding `stdlib-<name>` chunk as needed (via `ctx.usedRuntimeChunks`).
- Emit `const { sortBy, groupBy } = _scrml_stdlib.data;` instead of `import { sortBy, groupBy } from "scrml:data";`.

**Step 5** — Update the misleading comment in emit-client.ts.

**Step 6** — Add a bug-18 regression test under `compiler/tests/integration/`.

**Step 7** — Browser-runtime verification of the original repro.

### Scope decisions

- Only bundle stdlib modules for which a hand-written JS shim ALREADY exists OR is added in step 1. Other `scrml:NAME` imports will surface as run-time `_scrml_stdlib.X is undefined` errors at first use — loud failure, same as today's behavior. Per pa.md S86 layer-over-spec, the structural fix scope here is making the existing shims wire correctly; making MORE shims is a follow-up.
- The existing `bundleStdlibForRun` / `rewriteStdlibImports` infrastructure for SERVER JS is preserved unchanged. Bug-18 is client-side; server side already works.
- The `data.js` shim is in scope (without it, the bug-18 repro can't even server-side resolve, and the failing-fixture test would need a different stdlib name).

## Implementation log

- **commit `77d56a3`** — `compiler/runtime/stdlib/data.js` added. ~430 lines mirroring transform/validate/parse/messages exports. `not` literal lowered to `null` per emit-expr.ts convention. Bun-only references avoided (Bun.* calls are server-only in scrml's stdlib partitioning).
- **commit `c9de2d1`** — core fix landed:
  - `runtime-template.js`: `_loadStdlibChunk` helper reads + strips + IIFE-wraps each shim. Inlines auth/crypto/data/host shims at the end of SCRML_RUNTIME. `_scrml_stdlib = {}` initialized in core chunk. `store` excluded (bun:sqlite-only).
  - `codegen/runtime-chunks.ts`: 4 new `stdlib-<name>` chunks in RUNTIME_CHUNK_ORDER + matching markers (`--- chunk: stdlib-<name> ---`).
  - `codegen/emit-client.ts`: detectRuntimeChunks scans file imports, marks `stdlib-<name>` chunks. Import emission for `scrml:NAME` rewritten from `import { x } from "scrml:NAME"` to `const { x } = _scrml_stdlib.NAME;`. Misleading comment updated.
  - Tests updated: c20-pinned-import-codegen, cross-file-import-export (§I/§J), oq-2-stdlib-runtime-resolution (§2/§3), c10-error-message-resolution (chunk count 22→26), runtime-tree-shaking (chunk count + rationale).

## Verification

- **Compile**: bug-18 repro compiles cleanly (0 errors, 2 pre-existing warnings).
- **Client JS**: line 4 is `const { sortBy } = _scrml_stdlib.data;` — no bare `scrml:` left.
- **HTML**: unchanged — still classic `<script src="bug18.client.js"></script>`.
- **Runtime**: bug-18's emitted `scrml-runtime.HASH.js` includes the `stdlib-data` chunk (`_scrml_stdlib.data = (function() { ... })()`). Tree-shake confirmed — only stdlib-data is included, not auth/crypto/host (the repro doesn't import them).
- **Browser-runtime test** (via happy-dom inline-script injection mirroring the existing browser-test pattern): `<ul>` renders `<li>a</li><li>b</li>` (sorted by order ascending). No console errors.
- **Pre-commit gate**: 12054 pass / 88 skip / 1 todo / 0 fail — identical to pre-fix baseline.
- **Pre-existing browser tests** (`compiler/tests/browser/browser-todomvc.test.js` — 38 fails): confirmed pre-existing on the un-stashed main (separate tree-shake bug; out of scope per brief).

## Deferred / out-of-scope findings

- **Pre-existing tree-shake bug**: `_scrml_lift_target` and `_scrml_reconcile_list` declarations fall just BEFORE their chunk-markers (`'function _scrml_lift'`, `'function _scrml_reconcile_list'`). When the `derived`/`lift`/`reconciliation` chunks tree-shake adjacency changes (e.g. derived dropped while lift retained), the supporting `let`/`const` declarations land in dropped chunks. Symptom: `ReferenceError: _scrml_lift_target is not defined` in stripped runtimes. NOT caused by Bug 18; observable on main pre-fix. Brief-scope-bounded: surface here, file separately.
- **Other `scrml:NAME` stdlibs** not yet inline-eligible:
  - `scrml:store` excluded (bun:sqlite import at module top). Client-side use of `scrml:store` will fail with `Cannot read .createStore of undefined` at first call. Adopter migration is to NOT call store-side functions from client context (server functions only).
  - `scrml:time`, `scrml:http`, `scrml:format`, `scrml:router` have no `.js` shim today. Client-side imports of these will fail similarly. Out of scope for Bug 18; surface as backlog for the next stdlib-shim wave.

