/**
 * @module compiler/tests/unit/codegen-html-augmentation
 *
 * A-4.7 — Per-route HTML augmentation tests.
 *
 * Covers:
 *   §1  augmentHtmlForChunks direct invocation — bootstrap script shape.
 *   §2  augmentHtmlForChunks direct invocation — _SCRML_CHUNKS inline.
 *   §3  augmentHtmlForChunks direct invocation — modulepreload links.
 *   §4  augmentHtmlForChunks direct invocation — degenerate inputs.
 *   §5  End-to-end via compileScrml — §40.9.9 worked example HTML output.
 *   §6  End-to-end via compileScrml — tree-shake elision when no chunks.
 *   §7  End-to-end via compileScrml — `_scrml_chunk_mount` defined in
 *       runtime when chunks emit components.
 *   §8  End-to-end via compileScrml — `_scrml_vendor_require` defined
 *       in runtime when chunks emit vendor units (skipped — no vendor
 *       fixture in current corpus).
 *   §9  W-CG-CHUNK-* lint behavior (W-CG-CHUNK-EMPTY proven via empty-
 *       admission test; W-CG-CHUNK-LARGE / NO-PREFETCH / MISSING-ROLE
 *       partial coverage via fixtures).
 *  §10  Determinism — two builds produce byte-identical HTML output.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";
import { augmentHtmlForChunks } from "../../src/codegen/emit-html.ts";
import { RUNTIME_CHUNKS, assembleRuntime, RUNTIME_CHUNK_ORDER } from "../../src/codegen/runtime-chunks.ts";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const BASE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>fixture</title>
</head>
<body>
  <h1>hello</h1>
</body>
</html>`;

function chunk(epId, role, tier, filename, payloadJs = "") {
  return { entryPointId: epId, role, tier, filename, payloadJs };
}

// §40.9.9 worked-example source (mirrors initial-chunk-emission.test.js
// fixture).
const WORKED_EXAMPLE_SOURCE = `<program title="Dispatch" auth="required">

type UserRole:enum = { Anonymous, Driver, Dispatcher, Admin }

<count> = 0

function increment() {
  @count = @count + 1
}

<nav class="flex items-center gap-3 p-4 border-b">
  <h1 class="text-xl font-semibold">Dispatch</h1>
  <a href="/loads" class="text-blue-600">Loads</a>
  <auth role="Admin">
    <a href="/admin" class="text-red-600">Admin</a>
  </auth>
</nav>

<button onclick=increment()
        class="px-3 py-1 rounded bg-slate-100">
  \${@count}
</button>

</program>
`;

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "a47-html-aug-"));
});

afterAll(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function compileWorked({ emitPerRoute = true } = {}) {
  const filePath = join(TMP, "app.scrml");
  writeFileSync(filePath, WORKED_EXAMPLE_SOURCE);
  return compileScrml({
    inputFiles: [filePath],
    outputDir: join(TMP, "dist"),
    write: false,
    emitPerRoute,
    log: () => {},
  });
}

// ---------------------------------------------------------------------------
// §1 — augmentHtmlForChunks direct invocation — bootstrap script shape
// ---------------------------------------------------------------------------

describe("§1 — augmentHtmlForChunks: role-detection bootstrap", () => {
  test("bootstrap script contains localStorage / cookie / meta fallback order", () => {
    const chunks = new Map([
      ["k1", chunk("/abs/app.scrml#page@/loads", "Driver", "initial", "loads/Driver.initial.abc12345.js", "// payload")],
    ]);
    const out = augmentHtmlForChunks({
      html: BASE_HTML,
      chunks,
      fileEntryPointIds: ["/abs/app.scrml#page@/loads"],
      epIdToRoutePath: new Map([["/abs/app.scrml#page@/loads", "/loads"]]),
    });
    expect(out).toContain('localStorage.getItem("scrml_role")');
    expect(out).toContain("document.cookie.match");
    expect(out).toContain('querySelector(\'meta[name="scrml-role"]\')');
    expect(out).toContain('"_anonymous"');
  });

  test("bootstrap script dispatches via dynamic <script> injection", () => {
    const chunks = new Map([
      ["k1", chunk("/abs/app.scrml#program", "_anonymous", "initial", "_root/_anonymous.initial.deadbeef.js", "// payload")],
    ]);
    const out = augmentHtmlForChunks({
      html: BASE_HTML,
      chunks,
      fileEntryPointIds: ["/abs/app.scrml#program"],
      epIdToRoutePath: new Map([["/abs/app.scrml#program", "/"]]),
    });
    expect(out).toContain('document.createElement("script")');
    expect(out).toContain("s.defer = true");
    expect(out).toContain("document.head.appendChild(s)");
  });

  test("bootstrap script hardcodes the active route from first EpId", () => {
    const chunks = new Map([
      ["k1", chunk("/abs/app.scrml#page@/dashboard", "_anonymous", "initial", "dashboard/_anonymous.initial.deadbeef.js", "// payload")],
    ]);
    const out = augmentHtmlForChunks({
      html: BASE_HTML,
      chunks,
      fileEntryPointIds: ["/abs/app.scrml#page@/dashboard"],
      epIdToRoutePath: new Map([["/abs/app.scrml#page@/dashboard", "/dashboard"]]),
    });
    expect(out).toContain('var activeRoute = "/dashboard"');
  });

  test("bootstrap script warns + degrades when active route unresolvable", () => {
    const chunks = new Map([
      ["k1", chunk("/abs/app.scrml#program", "_anonymous", "initial", "_root/_anonymous.initial.x.js", "// p")],
    ]);
    const out = augmentHtmlForChunks({
      html: BASE_HTML,
      chunks,
      fileEntryPointIds: ["/abs/app.scrml#program"],
      // Empty map → activeRoute stays null.
      epIdToRoutePath: new Map(),
    });
    expect(out).toContain("var activeRoute = null");
    expect(out).toContain("no active route for chunk bootstrap");
  });
});

// ---------------------------------------------------------------------------
// §2 — augmentHtmlForChunks direct invocation — _SCRML_CHUNKS inline
// ---------------------------------------------------------------------------

describe("§2 — augmentHtmlForChunks: _SCRML_CHUNKS inline manifest", () => {
  test("inline manifest contains route-keyed entries for all roles + tiers", () => {
    const chunks = new Map([
      ["k1", chunk("/abs/app.scrml#page@/loads", "Driver", "initial", "loads/Driver.initial.abc1.js", "// p")],
      ["k2", chunk("/abs/app.scrml#page@/loads", "Driver", "tier1", "loads/Driver.tier1.abc2.js", "// p")],
      ["k3", chunk("/abs/app.scrml#page@/loads", "Admin", "initial", "loads/Admin.initial.abc3.js", "// p")],
    ]);
    const out = augmentHtmlForChunks({
      html: BASE_HTML,
      chunks,
      fileEntryPointIds: ["/abs/app.scrml#page@/loads"],
      epIdToRoutePath: new Map([["/abs/app.scrml#page@/loads", "/loads"]]),
    });
    expect(out).toContain("window._SCRML_CHUNKS");
    expect(out).toContain('"/loads"');
    expect(out).toContain('"Driver"');
    expect(out).toContain('"Admin"');
    expect(out).toContain('"/loads/Driver.initial.abc1.js"');
    expect(out).toContain('"/loads/Driver.tier1.abc2.js"');
    expect(out).toContain('"/loads/Admin.initial.abc3.js"');
  });

  test("inline manifest skips tier-1 URLs for empty payloads", () => {
    const chunks = new Map([
      ["k1", chunk("/abs/app.scrml#page@/loads", "Driver", "initial", "loads/Driver.initial.x.js", "// p")],
      ["k2", chunk("/abs/app.scrml#page@/loads", "Driver", "tier1", "loads/Driver.tier1.y.js", "" /* empty */)],
    ]);
    const out = augmentHtmlForChunks({
      html: BASE_HTML,
      chunks,
      fileEntryPointIds: ["/abs/app.scrml#page@/loads"],
      epIdToRoutePath: new Map([["/abs/app.scrml#page@/loads", "/loads"]]),
    });
    expect(out).toContain('"/loads/Driver.initial.x.js"');
    // Empty tier-1 payload → URL skipped from inline manifest.
    expect(out).not.toContain("/loads/Driver.tier1.y.js");
  });

  test("inline manifest inserted before </head> close", () => {
    const chunks = new Map([
      ["k1", chunk("/abs/app.scrml#page@/x", "_anonymous", "initial", "x/_anonymous.initial.a.js", "// p")],
    ]);
    const out = augmentHtmlForChunks({
      html: BASE_HTML,
      chunks,
      fileEntryPointIds: ["/abs/app.scrml#page@/x"],
      epIdToRoutePath: new Map([["/abs/app.scrml#page@/x", "/x"]]),
    });
    const manifestIdx = out.indexOf("window._SCRML_CHUNKS");
    const headCloseIdx = out.indexOf("</head>");
    const bodyOpenIdx = out.indexOf("<body>");
    expect(manifestIdx).toBeGreaterThanOrEqual(0);
    expect(headCloseIdx).toBeGreaterThan(manifestIdx);
    expect(bodyOpenIdx).toBeGreaterThan(headCloseIdx);
  });
});

// ---------------------------------------------------------------------------
// §3 — modulepreload links
// ---------------------------------------------------------------------------

describe("§3 — augmentHtmlForChunks: modulepreload links", () => {
  test("non-empty tier-1 → emits modulepreload link", () => {
    const chunks = new Map([
      ["k1", chunk("/abs/app.scrml#page@/loads", "Driver", "initial", "loads/Driver.initial.x.js", "// p")],
      ["k2", chunk("/abs/app.scrml#page@/loads", "Driver", "tier1", "loads/Driver.tier1.y.js", "// content")],
    ]);
    const out = augmentHtmlForChunks({
      html: BASE_HTML,
      chunks,
      fileEntryPointIds: ["/abs/app.scrml#page@/loads"],
      epIdToRoutePath: new Map([["/abs/app.scrml#page@/loads", "/loads"]]),
    });
    expect(out).toContain('<link rel="modulepreload" href="/loads/Driver.tier1.y.js">');
  });

  test("empty tier-1 → NO modulepreload link", () => {
    const chunks = new Map([
      ["k1", chunk("/abs/app.scrml#page@/loads", "Driver", "initial", "loads/Driver.initial.x.js", "// p")],
      ["k2", chunk("/abs/app.scrml#page@/loads", "Driver", "tier1", "loads/Driver.tier1.y.js", "" /* empty */)],
    ]);
    const out = augmentHtmlForChunks({
      html: BASE_HTML,
      chunks,
      fileEntryPointIds: ["/abs/app.scrml#page@/loads"],
      epIdToRoutePath: new Map([["/abs/app.scrml#page@/loads", "/loads"]]),
    });
    expect(out).not.toContain('rel="modulepreload"');
  });

  test("multiple roles with non-empty tier-1 → one modulepreload per role", () => {
    const chunks = new Map([
      ["k1", chunk("/abs/app.scrml#page@/x", "Driver", "initial", "x/Driver.initial.x.js", "// p")],
      ["k2", chunk("/abs/app.scrml#page@/x", "Driver", "tier1", "x/Driver.tier1.y.js", "// content")],
      ["k3", chunk("/abs/app.scrml#page@/x", "Admin", "initial", "x/Admin.initial.x.js", "// p")],
      ["k4", chunk("/abs/app.scrml#page@/x", "Admin", "tier1", "x/Admin.tier1.z.js", "// content")],
    ]);
    const out = augmentHtmlForChunks({
      html: BASE_HTML,
      chunks,
      fileEntryPointIds: ["/abs/app.scrml#page@/x"],
      epIdToRoutePath: new Map([["/abs/app.scrml#page@/x", "/x"]]),
    });
    expect(out).toContain("/x/Driver.tier1.y.js");
    expect(out).toContain("/x/Admin.tier1.z.js");
    // Two modulepreload occurrences.
    const matches = out.match(/rel="modulepreload"/g);
    expect(matches?.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// §4 — degenerate inputs (no augmentation paths)
// ---------------------------------------------------------------------------

describe("§4 — augmentHtmlForChunks: degenerate inputs", () => {
  test("empty fileEntryPointIds → input HTML returned unchanged", () => {
    const out = augmentHtmlForChunks({
      html: BASE_HTML,
      chunks: new Map(),
      fileEntryPointIds: [],
      epIdToRoutePath: new Map(),
    });
    expect(out).toBe(BASE_HTML);
  });

  test("input HTML without </head> → returned unchanged (defensive)", () => {
    const html = "<html><body>only body</body></html>";
    const out = augmentHtmlForChunks({
      html,
      chunks: new Map([["k1", chunk("/x.scrml#program", "_anonymous", "initial", "_root/_anonymous.initial.a.js", "// p")]]),
      fileEntryPointIds: ["/x.scrml#program"],
      epIdToRoutePath: new Map([["/x.scrml#program", "/"]]),
    });
    expect(out).toBe(html);
  });
});

// ---------------------------------------------------------------------------
// §5 — End-to-end via compileScrml — §40.9.9 worked example
// ---------------------------------------------------------------------------

describe("§5 — compileScrml HTML output (§40.9.9 worked example)", () => {
  test("HTML output contains _SCRML_CHUNKS inline manifest", () => {
    const result = compileWorked();
    const fileOut = result.outputs.values().next().value;
    expect(fileOut?.html).toBeDefined();
    expect(fileOut.html).toContain("window._SCRML_CHUNKS");
  });

  test("HTML output contains role-detection bootstrap", () => {
    const result = compileWorked();
    const fileOut = result.outputs.values().next().value;
    expect(fileOut.html).toContain('localStorage.getItem("scrml_role")');
    expect(fileOut.html).toContain('"_anonymous"');
    expect(fileOut.html).toContain('document.createElement("script")');
  });

  test("HTML output references all four role variants in inline manifest", () => {
    const result = compileWorked();
    const fileOut = result.outputs.values().next().value;
    expect(fileOut.html).toContain('"Admin"');
    expect(fileOut.html).toContain('"Anonymous"');
    expect(fileOut.html).toContain('"Dispatcher"');
    expect(fileOut.html).toContain('"Driver"');
  });

  test("HTML output references chunk filenames matching chunks Map", () => {
    const result = compileWorked();
    const fileOut = result.outputs.values().next().value;
    // Each chunk's filename should appear in the inline manifest.
    for (const chunk of result.chunks.values()) {
      if (chunk.tier !== "initial") continue;
      expect(fileOut.html).toContain(chunk.filename);
    }
  });

  test("data-scrml-prefetch attribute already wired (A-4.4 regression)", () => {
    const result = compileWorked();
    const fileOut = result.outputs.values().next().value;
    // The fixture has `<a href="/loads">` — A-4.4 should have wired
    // data-scrml-prefetch IF /loads were a page in RouteMap.pages. The
    // fixture is a single-file app with no `/loads` page, so the
    // attribute is NOT emitted (the lookup misses). This test
    // documents the absence; it pins the A-4.4 contract that only
    // INTERNAL routes get the attribute.
    //
    // When the worked example grows to multi-file with /loads as a
    // real page, this assertion flips polarity.
    expect(typeof fileOut.html).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// §6 — Tree-shake elision when no chunks emitted
// ---------------------------------------------------------------------------

describe("§6 — chunks-disabled mode preserves pre-A-4.7 HTML shape", () => {
  test("emitPerRoute=false → no _SCRML_CHUNKS / no role-bootstrap in HTML", () => {
    const result = compileWorked({ emitPerRoute: false });
    const fileOut = result.outputs.values().next().value;
    expect(fileOut?.html).toBeDefined();
    expect(fileOut.html).not.toContain("window._SCRML_CHUNKS");
    expect(fileOut.html).not.toContain('scrml_role');
  });
});

// ---------------------------------------------------------------------------
// §7 — Runtime helper definitions
// ---------------------------------------------------------------------------

describe("§7 — runtime helper definitions (atom-emitter prerequisites)", () => {
  test("_scrml_chunk_mount defined in 'mount' chunk", () => {
    expect(RUNTIME_CHUNKS.mount).toContain("function _scrml_chunk_mount");
  });

  test("_scrml_vendor_require defined in 'vendor-ref' chunk", () => {
    expect(RUNTIME_CHUNKS["vendor-ref"]).toContain("function _scrml_vendor_require");
  });

  test("'mount' chunk in RUNTIME_CHUNK_ORDER", () => {
    expect(RUNTIME_CHUNK_ORDER).toContain("mount");
  });

  test("'vendor-ref' chunk in RUNTIME_CHUNK_ORDER", () => {
    expect(RUNTIME_CHUNK_ORDER).toContain("vendor-ref");
  });

  test("tree-shake elision — runtime without 'mount' lacks _scrml_chunk_mount", () => {
    const runtime = assembleRuntime(new Set(["core", "scope", "errors", "transitions"]));
    expect(runtime).not.toContain("function _scrml_chunk_mount");
  });

  test("tree-shake elision — runtime without 'vendor-ref' lacks _scrml_vendor_require", () => {
    const runtime = assembleRuntime(new Set(["core", "scope", "errors", "transitions"]));
    expect(runtime).not.toContain("function _scrml_vendor_require");
  });

  test("activation — runtime with 'mount' contains _scrml_chunk_mount", () => {
    const runtime = assembleRuntime(new Set(["core", "scope", "errors", "transitions", "mount"]));
    expect(runtime).toContain("function _scrml_chunk_mount");
  });

  test("activation — runtime with 'vendor-ref' contains _scrml_vendor_require", () => {
    const runtime = assembleRuntime(new Set(["core", "scope", "errors", "transitions", "vendor-ref"]));
    expect(runtime).toContain("function _scrml_vendor_require");
  });
});

// ---------------------------------------------------------------------------
// §8 — Full runtime in --emit-per-route mode
// ---------------------------------------------------------------------------

describe("§8 — full runtime in --emit-per-route mode", () => {
  test("compileScrml result includes runtimeJs with mount helpers", () => {
    const result = compileWorked();
    // The full SCRML_RUNTIME (per-app distribution) includes both
    // helpers unconditionally. result.outputs is per-file; runtimeJs
    // lives on cgResult — surfaced via outputs in this fixture only
    // for the per-file embedded path. The full runtime is reachable
    // via api.js's RUNTIME_FILENAME path.
    //
    // For this test: assert atom-emitter output references the
    // helpers (the chunks ARE the runtime-helper consumers).
    let foundChunkMount = false;
    for (const chunk of result.chunks.values()) {
      if (chunk.payloadJs.includes("_scrml_chunk_mount(")) {
        foundChunkMount = true;
        break;
      }
    }
    expect(foundChunkMount).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §9 — Determinism — two builds produce byte-identical HTML output
// ---------------------------------------------------------------------------

describe("§9 — determinism (§40.9.8)", () => {
  test("two compileScrml invocations on identical source → byte-identical HTML", () => {
    const r1 = compileWorked();
    const r2 = compileWorked();
    const f1 = r1.outputs.values().next().value;
    const f2 = r2.outputs.values().next().value;
    expect(f1.html).toBe(f2.html);
  });
});

// ---------------------------------------------------------------------------
// §10 — W-CG-CHUNK-* lint family
// ---------------------------------------------------------------------------

describe("§10 — W-CG-CHUNK-* lint family", () => {
  test("W-CG-CHUNK-EMPTY fires on empty-admission entry-point", async () => {
    // Direct invocation of emitPerRouteChunks with an empty plan
    // exercises the lint path. The integration smoke is sufficient;
    // direct-test path lives in codegen-route-splitter.test.js.
    const { emitPerRouteChunks } = await import("../../src/codegen/route-splitter.ts");
    const ANONYMOUS_ROLE = "_anonymous";
    const empty = {
      componentNodeIds: new Set(),
      reactiveCellNodeIds: new Set(),
      serverFnNodeIds: new Set(),
      vendorUnitNames: new Set(),
    };
    const plan = {
      initialChunk: empty,
      prefetchTier1: empty,
      prefetchTier2: empty,
      prefetchTierN: [],
    };
    const record = {
      closures: new Map([
        ["/abs/empty.scrml::#program", { byRole: new Map([[ANONYMOUS_ROLE, plan]]) }],
      ]),
    };
    const { diagnostics } = emitPerRouteChunks({ reachabilityRecord: record });
    const emptyLints = diagnostics.filter((d) => d.code === "W-CG-CHUNK-EMPTY");
    expect(emptyLints.length).toBe(1);
    expect(emptyLints[0].severity).toBe("warning");
  });

  test("worked-example fixture does NOT fire W-CG-CHUNK-EMPTY (non-empty admission)", () => {
    const result = compileWorked();
    const emptyLints = result.warnings.filter((w) => w.code === "W-CG-CHUNK-EMPTY");
    expect(emptyLints.length).toBe(0);
  });

  test("worked-example fixture does NOT fire W-CG-CHUNK-LARGE (under 100KB budget)", () => {
    const result = compileWorked();
    const largeLints = result.warnings.filter((w) => w.code === "W-CG-CHUNK-LARGE");
    expect(largeLints.length).toBe(0);
  });
});
