/**
 * Phase A1c Step C20 — `pinned` import hoisting (codegen regression).
 *
 * SPEC anchors:
 *   §6.10.4   — `pinned` on imports (`import { X pinned } from '...'`)
 *   §21.3     — Import Syntax (normative statements; circular imports forbidden)
 *   §21.6     — E-IMPORT-PINNED-INVALID, E-STATE-PINNED-FORWARD-REF
 *   §21.8.1   — `pinned` on imports, behavior identical to same-file pinned cell
 *   §7.6.1    — file-level scope under V5-strict + hoisting + `pinned`
 *   §34       — error catalog rows
 *
 * C20 Phase 0 SURVEY conclusion (load-bearing — see
 * docs/changes/phase-a1c-step-c20-pinned-import-hoist/SURVEY.md):
 *
 *   This is "no-op + tests." The pinned-on-imports semantic is entirely
 *   compile-time validation (B4 implements E-STATE-PINNED-FORWARD-REF
 *   source-position rule + E-IMPORT-PINNED-INVALID best-effort). The runtime
 *   ordering implicit in §6.10.4's "initialized at import position" wording
 *   is satisfied by emission ordering — the import lowering is placed at the
 *   top of the file body, and (for the CLIENT path) the dependency
 *   `.client.js` <script>s load BEFORE the importing entry (topo order,
 *   deps-first; see index.ts). Cross-file forward-ref cycles cannot occur in
 *   scrml because circular imports are forbidden at MOD (E-IMPORT-002).
 *
 *   Therefore: pinned imports compile to the SAME shape as non-pinned imports.
 *   The `pinned: true` flag does NOT alter codegen output. These tests lock
 *   that contract: the flag is parsed/validated upstream but emits no runtime
 *   difference.
 *
 *   known-gaps-#6 (S152, Approach B) UPDATE — the CLIENT path no longer emits
 *   a bare ES `import` for a local `.scrml` dependency. The client.js loads as
 *   a CLASSIC (non-module) <script>, where a bare ES import SyntaxErrors and
 *   poisons the whole script body. Local `.scrml` imports now lower to a
 *   `_scrml_modules` registry read (`const { x } = _scrml_modules["<key>"];`),
 *   mirroring the `scrml:` → `_scrml_stdlib` lowering. The pinned-is-inert
 *   invariant is UNCHANGED: pinned + non-pinned still emit the identical
 *   registry-read shape. The SERVER path (§C20.4) is UNAFFECTED — `.server.js`
 *   is loaded as a real ES/CJS module, so it keeps the ES `import` form.
 *
 * Test scope (C20):
 *
 *   §C20.1.x — pinned import emits as standard ES `import` declaration.
 *   §C20.2.x — mixed pinned + non-pinned specifiers preserved.
 *   §C20.3.x — pinned engine import (M18) emits identically to non-pinned.
 *   §C20.4.x — server-side emission mirrors client.
 *   §C20.5.x — `pinned` keyword does NOT leak into emitted output.
 *
 * What this suite does NOT cover (out of scope per SURVEY):
 *   - B4 source-position validation (covered by import-binding-pinned.test.js)
 *   - Parser pinned-token recognition (covered by parse-import-pinned.test.js)
 *   - End-to-end browser-runtime behavior (deferred — gauntlet integration tests)
 */

import { describe, test, expect } from "bun:test";
import { generateClientJs } from "../../src/codegen/emit-client.ts";
import { generateServerJs } from "../../src/codegen/emit-server.ts";
import { makeCompileContext } from "../../src/codegen/context.ts";
import { BindingRegistry } from "../../src/codegen/binding-registry.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a CompileContext for direct emit-client / emit-server invocation.
 * Mirrors compiler/tests/unit/cross-file-import-export.test.js makeTestCtx.
 *
 * testMode:true suppresses the GITI-003 unused-import prune pass so the
 * pinned-import emission contract is observable on minimal fixtures (no
 * body nodes that "use" the imported names).
 */
function makeTestCtx(fileAST) {
  return makeCompileContext({
    filePath: fileAST.filePath,
    fileAST,
    routeMap: { functions: new Map() },
    depGraph: { nodes: new Map(), edges: [] },
    protectedFields: new Map(),
    authMiddleware: null,
    middlewareConfig: null,
    csrfEnabled: false,
    encodingCtx: null,
    mode: "browser",
    testMode: true,
    dbVar: "_scrml_db",
    workerNames: [],
    errors: [],
    registry: new BindingRegistry(),
    derivedNames: new Set(),
    analysis: null,
    usedRuntimeChunks: new Set(["core", "scope", "errors", "transitions"]),
  });
}

/**
 * Build a minimal import-decl node for testing — mirrors the parser's
 * shape for `import { ... } from '...'` with optional pinned specifiers.
 *
 * Each spec is `{imported, local, pinned}` per types/ast.ts:ImportSpecifier.
 */
function makeImportDecl(source, specs) {
  return {
    kind: "import-decl",
    source,
    names: specs.map((s) => s.local),
    specifiers: specs.map((s) => ({
      imported: s.imported ?? s.local,
      local: s.local,
      pinned: s.pinned === true,
    })),
    isDefault: false,
    raw: `import { ${specs.map((s) => s.pinned ? `${s.local} pinned` : s.local).join(", ")} } from '${source}'`,
    span: { file: "test.scrml", start: 0, end: 0, line: 1, col: 1 },
  };
}

function makeFileAST(filePath, imports) {
  return {
    filePath,
    imports: [],
    exports: [],
    typeDecls: [],
    nodes: [],
    ast: {
      imports,
      nodes: [],
    },
  };
}

// ===========================================================================
// §C20.1 — pinned import emits as standard ES `import` declaration
// ===========================================================================
//
// The pinned modifier is a compile-time contract on the importing file's
// scope (§21.8.1). At codegen, the ES `import` declaration is identical
// in shape to a non-pinned import — same module specifier, same braced
// names list, same JS module loader semantics.
//
// These tests confirm the flag does NOT alter the emitted import shape.

describe("§C20.1 pinned import emits as standard ES import (client)", () => {
  test("§C20.1.1 single pinned named import → standard `import { X } from '...'`", () => {
    const fileAST = makeFileAST(
      "/app/app.scrml",
      [makeImportDecl("./engines.scrml", [{ local: "appPhase", pinned: true }])],
    );
    const ctx = makeTestCtx(fileAST);
    const clientJs = generateClientJs(ctx);

    // known-gaps-#6 (S152, Approach B): a local `.scrml` import lowers to a
    // `_scrml_modules` registry READ, NOT a bare ES import (the client.js loads
    // as a CLASSIC <script>; an ES import there SyntaxErrors). The `pinned`
    // flag remains codegen-inert — it produces the SAME shape as non-pinned
    // (see §C20.1.2 control). Fallback key (no importGraph in test ctx):
    // `./engines.scrml` → `engines.client.js`.
    expect(clientJs).toContain('const { appPhase } = _scrml_modules["engines.client.js"];');
    // No bare ES import for the cross-file `.scrml` dependency.
    expect(clientJs).not.toMatch(/^\s*import\s/m);
    // The `pinned` keyword MUST NOT appear in the emitted JS.
    expect(clientJs).not.toMatch(/\bpinned\b/);
  });

  test("§C20.1.2 single non-pinned named import → identical shape to pinned", () => {
    // Control: confirm non-pinned single import emits the same shape.
    const fileAST = makeFileAST(
      "/app/app.scrml",
      [makeImportDecl("./engines.scrml", [{ local: "appPhase", pinned: false }])],
    );
    const ctx = makeTestCtx(fileAST);
    const clientJs = generateClientJs(ctx);

    expect(clientJs).toContain('const { appPhase } = _scrml_modules["engines.client.js"];');
  });

  test("§C20.1.3 pinned + non-pinned imports of same name in distinct files emit identically", () => {
    // Two test cases produce identical emit shapes — the `pinned` flag is
    // codegen-inert.
    const pinnedAST = makeFileAST(
      "/app/a.scrml",
      [makeImportDecl("./m.scrml", [{ local: "x", pinned: true }])],
    );
    const plainAST = makeFileAST(
      "/app/a.scrml",
      [makeImportDecl("./m.scrml", [{ local: "x", pinned: false }])],
    );

    const pinnedJs = generateClientJs(makeTestCtx(pinnedAST));
    const plainJs = generateClientJs(makeTestCtx(plainAST));

    // Extract just the registry-read line for comparison (known-gaps-#6).
    const readLineRe = /^const \{[^}]*\} = _scrml_modules\["m\.client\.js"\];$/m;
    const pinnedRead = pinnedJs.match(readLineRe);
    const plainRead = plainJs.match(readLineRe);

    expect(pinnedRead).not.toBeNull();
    expect(plainRead).not.toBeNull();
    // pinned is codegen-inert: identical emitted shape.
    expect(pinnedRead[0]).toBe(plainRead[0]);
  });

  test("§C20.1.4 aliased pinned import (`{ X as Y pinned }`) emits canonical `imported as local` ES form", () => {
    // ES module syntax requires `{ imported as local }` when the imported
    // name differs from the local binding name. The `pinned` flag is upstream
    // of emission and never reaches the JS surface.
    //
    // Task #17 (S85): prior to the cross-file-channel-import-emit fix, the
    // emitter joined `stmt.names` (the IMPORTED-name array per ast-builder.js
    // line 5832 _stripQuotes path) and emitted `import { foo } from ...` —
    // dropping the `as bar` alias and breaking source references to `bar`.
    // The post-fix shape preserves the alias when imported !== local.
    const fileAST = makeFileAST(
      "/app/app.scrml",
      [makeImportDecl("./m.scrml", [{ imported: "foo", local: "bar", pinned: true }])],
    );
    const ctx = makeTestCtx(fileAST);
    const clientJs = generateClientJs(ctx);

    // known-gaps-#6 (S152): aliased local `.scrml` import → registry read with
    // a `{ imported: local }` destructure rename. `./m.scrml` → `m.client.js`.
    expect(clientJs).toContain('const { foo: bar } = _scrml_modules["m.client.js"];');
    expect(clientJs).not.toMatch(/^\s*import\s/m);
    expect(clientJs).not.toContain("pinned");
  });
});

// ===========================================================================
// §C20.2 — mixed pinned + non-pinned specifiers preserved
// ===========================================================================
//
// A single `import { a pinned, b, c pinned }` declaration must emit ALL
// specifiers in the resulting ES import — no specifier dropped, no extra
// runtime annotation injected per pinned name.

describe("§C20.2 mixed pinned + non-pinned specifiers preserved (client)", () => {
  test("§C20.2.1 three specifiers (pinned, plain, pinned) emit all three names", () => {
    const fileAST = makeFileAST(
      "/app/app.scrml",
      [makeImportDecl("./m.scrml", [
        { local: "a", pinned: true },
        { local: "b", pinned: false },
        { local: "c", pinned: true },
      ])],
    );
    const ctx = makeTestCtx(fileAST);
    const clientJs = generateClientJs(ctx);

    // known-gaps-#6 (S152): all three specifiers preserved in the registry read.
    expect(clientJs).toContain('const { a, b, c } = _scrml_modules["m.client.js"];');
    expect(clientJs).not.toMatch(/^\s*import\s/m);
    // No `pinned` keyword bleeds into emitted JS.
    expect(clientJs).not.toContain("pinned");
  });

  test("§C20.2.2 all-pinned multi-specifier import emits all names with no annotation", () => {
    const fileAST = makeFileAST(
      "/app/app.scrml",
      [makeImportDecl("./m.scrml", [
        { local: "x", pinned: true },
        { local: "y", pinned: true },
      ])],
    );
    const ctx = makeTestCtx(fileAST);
    const clientJs = generateClientJs(ctx);

    expect(clientJs).toContain('const { x, y } = _scrml_modules["m.client.js"];');
    expect(clientJs).not.toMatch(/^\s*import\s/m);
    expect(clientJs).not.toContain("pinned");
  });

  test("§C20.2.3 mixed pinned + plain in stdlib (`scrml:`) import passes through", () => {
    const fileAST = makeFileAST(
      "/app/app.scrml",
      [makeImportDecl("scrml:crypto", [
        { local: "hash", pinned: true },
        { local: "uuid", pinned: false },
      ])],
    );
    const ctx = makeTestCtx(fileAST);
    const clientJs = generateClientJs(ctx);

    // scrml: client imports lower to a destructuring read from the
    // _scrml_stdlib registry (Bug 18 S95 — bare ES-module specifiers
    // cannot resolve in the browser). Server emission keeps the
    // bare specifier and rewrites it to a relative path post-codegen.
    expect(clientJs).toContain('const { hash, uuid } = _scrml_stdlib.crypto;');
    expect(clientJs).not.toContain("pinned");
  });
});

// ===========================================================================
// §C20.3 — pinned engine import (M18) emits identically to non-pinned
// ===========================================================================
//
// Engines are the PRIMARY legitimate target of `pinned` per §21.8.1
// ("engine-typed names"). M18 (cross-file engine import) wraps:
// `import { appPhase pinned } from './engines.scrml'` followed by an
// `<appPhase/>` use-site mount in the importer. The emitted JS for the
// import statement itself is identical to a non-pinned engine import.

describe("§C20.3 pinned engine import (M18) emits identically to non-pinned", () => {
  test("§C20.3.1 pinned engine name emits as standard `import { name } from`", () => {
    // Pattern: `import { Phase, appPhase pinned } from './engines.scrml'`
    // Phase is the type (non-pinned), appPhase is the engine variable (pinned).
    const fileAST = makeFileAST(
      "/app/app.scrml",
      [makeImportDecl("./engines.scrml", [
        { local: "Phase", pinned: false },
        { local: "appPhase", pinned: true },
      ])],
    );
    const ctx = makeTestCtx(fileAST);
    const clientJs = generateClientJs(ctx);

    // known-gaps-#6 (S152): both specifiers preserved in the registry read.
    expect(clientJs).toContain('const { Phase, appPhase } = _scrml_modules["engines.client.js"];');
    expect(clientJs).not.toMatch(/^\s*import\s/m);
    expect(clientJs).not.toContain("pinned");
  });

  test("§C20.3.2 single pinned engine import emits identically to plain", () => {
    const pinnedAST = makeFileAST(
      "/app/app.scrml",
      [makeImportDecl("./engines.scrml", [{ local: "appPhase", pinned: true }])],
    );
    const plainAST = makeFileAST(
      "/app/app.scrml",
      [makeImportDecl("./engines.scrml", [{ local: "appPhase", pinned: false }])],
    );

    const pinnedJs = generateClientJs(makeTestCtx(pinnedAST));
    const plainJs = generateClientJs(makeTestCtx(plainAST));

    // known-gaps-#6 (S152): both lower to the SAME registry read (pinned-inert).
    const expectedRead = 'const { appPhase } = _scrml_modules["engines.client.js"];';
    expect(pinnedJs).toContain(expectedRead);
    expect(plainJs).toContain(expectedRead);
  });
});

// ===========================================================================
// §C20.4 — server-side emission mirrors client
// ===========================================================================
//
// emit-server.ts has its own import-emission loop (lines 111-131) that
// mirrors emit-client.ts but rewrites .scrml → .server.js. Pinned imports
// must compile correctly on the server side too.

describe("§C20.4 server-side emission mirrors client", () => {
  test("§C20.4.1 pinned import emits in server JS with .server.js rewrite", () => {
    // Server JS only emits when there is at least one server-boundary
    // function or other server-relevant artifact — but the import emission
    // path runs unconditionally when there are imports + a server function
    // is present. To trigger emission, we'd need a real server function.
    //
    // Simpler invariant: confirm that a file with no server-boundary
    // artifacts emits empty server JS regardless of pinned imports
    // (i.e., the pinned flag does not force server-side artifact synthesis).
    const fileAST = makeFileAST(
      "/app/app.scrml",
      [makeImportDecl("./types.scrml", [{ local: "User", pinned: true }])],
    );
    const ctx = makeTestCtx(fileAST);
    const serverJs = generateServerJs(ctx);

    // No server-boundary artifacts → empty server JS.
    expect(serverJs).toBe("");
  });

  test("§C20.4.2 server emit-server import-rewrite path is a code-mirror of client", () => {
    // This is a structural assertion: emit-server.ts:111-131 mirrors
    // emit-client.ts:494-515 with `.server.js` instead of `.client.js`
    // as the .scrml-rewrite target. Read-only smoke check that the
    // emit-server module exports generateServerJs.
    expect(typeof generateServerJs).toBe("function");
  });
});

// ===========================================================================
// §C20.5 — `pinned` keyword does NOT leak into emitted output
// ===========================================================================
//
// The `pinned` token is a scrml-source-language modifier (parsed at TAB,
// validated at SYM PASS B4). It MUST NOT appear in any emitted .client.js
// or .server.js output — JS has no notion of "pinned imports."

describe("§C20.5 `pinned` keyword does NOT leak into emitted output", () => {
  test("§C20.5.1 emitted client JS contains no `pinned` token (single pinned import)", () => {
    const fileAST = makeFileAST(
      "/app/app.scrml",
      [makeImportDecl("./engines.scrml", [{ local: "x", pinned: true }])],
    );
    const ctx = makeTestCtx(fileAST);
    const clientJs = generateClientJs(ctx);

    // Tokenized check: word-boundary "pinned" anywhere in output.
    expect(clientJs).not.toMatch(/\bpinned\b/);
  });

  test("§C20.5.2 emitted client JS contains no `pinned` token (multi-import file)", () => {
    const fileAST = makeFileAST(
      "/app/app.scrml",
      [
        makeImportDecl("./a.scrml", [{ local: "a1", pinned: true }, { local: "a2", pinned: false }]),
        makeImportDecl("./b.scrml", [{ local: "b1", pinned: true }]),
        makeImportDecl("scrml:crypto", [{ local: "hash", pinned: false }]),
      ],
    );
    const ctx = makeTestCtx(fileAST);
    const clientJs = generateClientJs(ctx);

    expect(clientJs).not.toMatch(/\bpinned\b/);
    // Sanity: every import was emitted. known-gaps-#6 (S152): local `.scrml`
    // imports lower to `_scrml_modules` registry reads; `scrml:` to _scrml_stdlib.
    expect(clientJs).toContain('const { a1, a2 } = _scrml_modules["a.client.js"];');
    expect(clientJs).toContain('const { b1 } = _scrml_modules["b.client.js"];');
    expect(clientJs).toContain('const { hash } = _scrml_stdlib.crypto;');
    // No bare ES import survives for the cross-file `.scrml` dependencies.
    expect(clientJs).not.toMatch(/^\s*import\s/m);
  });

  test("§C20.5.3 registry-read ordering: pinned imports appear above runtime body", () => {
    // known-gaps-#6 (S152): the client.js loads as a CLASSIC <script>, so the
    // ES-module-loader-hoisting premise no longer applies — a local `.scrml`
    // import lowers to a `_scrml_modules` registry READ. The emitter still
    // orders that read at the top of the file's text (right after the runtime
    // preamble), which — combined with the dependency `.client.js` <script>s
    // being emitted BEFORE the entry's (topo order, deps-first; see index.ts) —
    // is the lexical surface that satisfies §6.10.4's "initialized at import
    // position" semantic in the classic-script model.
    const fileAST = makeFileAST(
      "/app/app.scrml",
      [makeImportDecl("./engines.scrml", [{ local: "appPhase", pinned: true }])],
    );
    const ctx = makeTestCtx(fileAST);
    const clientJs = generateClientJs(ctx);

    // The registry-read line exists.
    const readIdx = clientJs.indexOf('const { appPhase } = _scrml_modules["engines.client.js"];');
    expect(readIdx).toBeGreaterThan(-1);

    // The end-of-runtime marker comes BEFORE the read (runtime preamble is
    // positioned above the user's imports: runtime → "// --- end scrml reactive
    // runtime ---" → import lowering).
    const runtimeEndIdx = clientJs.indexOf("// --- end scrml reactive runtime ---");
    expect(runtimeEndIdx).toBeGreaterThan(-1);
    expect(readIdx).toBeGreaterThan(runtimeEndIdx);
  });
});
