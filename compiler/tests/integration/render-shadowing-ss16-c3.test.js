/**
 * ss16 C3 — `function render` mis-encoded (def `_scrml_render_N` vs call
 * `_scrml_render`). Full-compile integration.
 *
 * `emit-expr.ts` UNCONDITIONALLY hijacked any `render(...)` call → `_scrml_render`
 * (the client component-render builtin). A user `function render` def is emitted
 * as `_scrml_render_1` via §47 name-encoding; a normal user-fn call (`loop()`)
 * emits as plain `loop()` and a POST-PASS rewrites `\bloop\b` → `_scrml_loop_N`
 * via fnNameMap. But the render hijack emitted `_scrml_render` directly, which
 * the post-pass's word-boundary regex `\b(render)\b` CANNOT match (no boundary
 * before `render` after `_`) → call never repaired → def/call mismatch →
 * ReferenceError.
 *
 * C3 mirrors the §20.6 log-shadowing precedent: a `_renderShadowedInFile` flag
 * (set per-file via `fileDeclaresRender`) makes the hijack yield to the generic
 * call path, which the fnNameMap post-pass repairs to `_scrml_render_1`. An
 * info-level `W-RENDER-SHADOWED` fires at the declaration.
 *
 * Cross-stream assertions per the diagnostic-partition rule (W- code → warnings).
 *
 * Spec authority: §20.3a (render() built-in shadowing) · §34 (W-RENDER-SHADOWED) ·
 * §47 (user-fn name encoding the post-pass repairs).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let TMP;
beforeAll(() => { TMP = mkdtempSync(join(tmpdir(), "render-shadow-")); });
afterAll(() => { if (TMP) rmSync(TMP, { recursive: true, force: true }); });

function compile(src, extraOpts = {}) {
  const fp = join(TMP, `f-${Math.random().toString(36).slice(2)}.scrml`);
  writeFileSync(fp, src);
  const res = compileScrml({
    inputFiles: [fp],
    outputDir: join(TMP, "dist"),
    write: false,
    log: () => {},
    ...extraOpts,
  });
  const out = res.outputs.get(fp);
  return { res, out, fp };
}

// Cross-stream diagnostic helper (W-/I- codes partition to result.warnings).
function diags(res, code) {
  return [...(res.errors || []), ...(res.warnings || [])].filter((d) => d.code === code);
}

// Client JS is a classic-script IIFE — `new Function` is a valid syntax gate.
function validClientJs(js) {
  expect(() => new Function(js)).not.toThrow();
}

// ---------------------------------------------------------------------------
// §A — user `function render`: call resolves to the user fn + lint fires
// ---------------------------------------------------------------------------

describe("ss16 C3 — user `function render` shadows the render() builtin", () => {
  const SRC = `<title>App</title>

\${
  function render() {
    log("drawing")
  }
  function loop() {
    render()
  }
}

<button onclick=loop()>Go</button>`;

  test("compiles + the call site resolves to the user fn's encoded name (def/call match)", () => {
    const { res, out } = compile(SRC);
    expect((res.errors || []).length).toBe(0);
    expect(out?.clientJs).toBeTruthy();
    // The def is emitted as a §47-encoded name (`_scrml_render_<N>`); the call
    // MUST be the SAME name (not the bare `_scrml_render` builtin).
    const defMatch = out.clientJs.match(/function (_scrml_render_\d+)\s*\(/);
    expect(defMatch).toBeTruthy();
    const encoded = defMatch[1];
    // The call site uses the encoded name.
    expect(out.clientJs).toContain(`${encoded}(`);
    // And there is NO bare `_scrml_render(` builtin call (the hijack yielded).
    expect(/(?<![\w])_scrml_render\(/.test(out.clientJs)).toBe(false);
    validClientJs(out.clientJs);
  });

  test("W-RENDER-SHADOWED fires (info, partitioned to warnings)", () => {
    const { res } = compile(SRC);
    const hits = diags(res, "W-RENDER-SHADOWED");
    expect(hits.length).toBe(1);
    expect(hits[0].severity).toBe("info");
    // Partition: lands in warnings, not errors.
    expect((res.errors || []).some((e) => e.code === "W-RENDER-SHADOWED")).toBe(false);
    expect((res.warnings || []).some((e) => e.code === "W-RENDER-SHADOWED")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §B — NO user render: render(...) still lowers to the _scrml_render builtin
// ---------------------------------------------------------------------------

describe("ss16 C3 — no user `render`: the component-render builtin is unchanged", () => {
  const SRC = `<title>App</title>

const Card = <div>card</div>

\${
  function draw() {
    render(Card)
  }
}

<button onclick=draw()>Draw</button>`;

  test("render(...) lowers to the _scrml_render builtin (no W-RENDER-SHADOWED)", () => {
    const { res, out } = compile(SRC);
    expect(diags(res, "W-RENDER-SHADOWED").length).toBe(0);
    expect(out?.clientJs).toBeTruthy();
    // The builtin call form is preserved exactly.
    expect(out.clientJs).toContain("_scrml_render(");
    validClientJs(out.clientJs);
  });
});
