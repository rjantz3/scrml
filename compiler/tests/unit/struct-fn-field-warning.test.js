/**
 * W-TYPE-FN-FIELD — function-typed struct field nudge (§14.3 / §34).
 *
 * A `:struct` field (or inline-struct annotation field) whose TYPE is a
 * function type (`() -> void`, `fn()`, `(x: int) => string`) resolves to an
 * opaque `asIs` value and surfaces the info-level lint `W-TYPE-FN-FIELD`.
 * Whether function-typed struct fields are a first-class supported feature is
 * an open question (deferred); the lint surfaces the construct without deciding.
 *
 * W- prefix → result.warnings (never result.errors). Tests assert via the
 * CROSS-STREAM helper so a stream-partition regression is caught (a W- code
 * silently moving into result.errors would be a partition bug).
 *
 * Ratified S171 (item) + S173 (severity/code/scope). SHARED fire site
 * (type-system.ts) — covers BOTH the default BS+Acorn pipeline AND the
 * scrml-native parser (native defers all type decomposition to the same stage).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let TMP;
beforeAll(() => { TMP = mkdtempSync(join(tmpdir(), "struct-fn-field-")); });
afterAll(() => { if (TMP) rmSync(TMP, { recursive: true, force: true }); });

function compile(src, parser) {
  const fp = join(TMP, `f-${Math.random().toString(36).slice(2)}.scrml`);
  writeFileSync(fp, src);
  const opts = { inputFiles: [fp], outputDir: join(TMP, "dist"), write: false, log: () => {} };
  if (parser) opts.parser = parser;
  return compileScrml(opts);
}

// Cross-stream helper: W- codes partition to result.warnings, but assert over
// BOTH streams so a partition regression (W- code landing in result.errors)
// is caught rather than silently passing.
function fnFieldDiags(res) {
  return [...(res.errors || []), ...(res.warnings || [])]
    .filter((d) => d.code === "W-TYPE-FN-FIELD");
}

// ---------------------------------------------------------------------------
// POSITIVE — each function-type shape fires W-TYPE-FN-FIELD
// ---------------------------------------------------------------------------

describe("W-TYPE-FN-FIELD — positive (named struct decl)", () => {
  test("fn() field fires", () => {
    const res = compile(`<ul>
\${ type T:struct = { cb: fn(), label: string } }
<li>x</li>
</ul>`);
    const hits = fnFieldDiags(res);
    expect(hits.length).toBe(1);
    expect(hits[0].message).toContain("cb");
    // Routes to warnings, never errors.
    expect((res.errors || []).some((e) => e.code === "W-TYPE-FN-FIELD")).toBe(false);
    expect((res.warnings || []).some((e) => e.code === "W-TYPE-FN-FIELD")).toBe(true);
  });

  test("(x) => T fat-arrow function-type field fires", () => {
    const res = compile(`<ul>
\${ type T:struct = { transform: (x: int) => string, label: string } }
<li>x</li>
</ul>`);
    const hits = fnFieldDiags(res);
    expect(hits.length).toBe(1);
    expect(hits[0].message).toContain("transform");
  });

  test("() -> void thin-arrow function-type field fires", () => {
    const res = compile(`<ul>
\${ type T:struct = { onClick: () -> void, label: string } }
<li>x</li>
</ul>`);
    const hits = fnFieldDiags(res);
    expect(hits.length).toBe(1);
    expect(hits[0].message).toContain("onClick");
  });

  test("all three shapes in one struct fire exactly three times", () => {
    const res = compile(`<ul>
\${ type T:struct = { a: () -> void, b: fn(), c: (x: int) => string, d: string } }
<li>x</li>
</ul>`);
    expect(fnFieldDiags(res).length).toBe(3);
  });

  test("inline-struct annotation function field fires", () => {
    const res = compile(`<ul>
\${ <h>: { f: fn(), label: string } = { f: someHandler, label: "" } }
<li>x</li>
</ul>`);
    const hits = fnFieldDiags(res);
    expect(hits.length).toBe(1);
    expect(hits[0].message).toContain("f");
  });
});

// ---------------------------------------------------------------------------
// NEGATIVE — lifecycle annotations + plain scalar/struct/enum/array/map fields
// fire NOTHING
// ---------------------------------------------------------------------------

describe("W-TYPE-FN-FIELD — negative (lifecycle + plain fields)", () => {
  test("(not to string) lifecycle field does NOT fire", () => {
    const res = compile(`<ul>
\${ type T:struct = { passwordHash: (not to string), label: string } }
<li>x</li>
</ul>`);
    expect(fnFieldDiags(res).length).toBe(0);
  });

  test("(Idle to Done) lifecycle field does NOT fire", () => {
    const res = compile(`<ul>
\${ type T:struct = { status: (Idle to Done), label: string } }
<li>x</li>
</ul>`);
    expect(fnFieldDiags(res).length).toBe(0);
  });

  test("(A -> B) legacy-arrow lifecycle field does NOT fire W-TYPE-FN-FIELD", () => {
    const res = compile(`<ul>
\${ type T:struct = { legacy: (Draft -> Published), label: string } }
<li>x</li>
</ul>`);
    // It DOES fire W-LIFECYCLE-LEGACY-ARROW (existing behavior), but NOT W-TYPE-FN-FIELD.
    expect(fnFieldDiags(res).length).toBe(0);
  });

  test("plain scalar / struct / enum / array / map fields fire nothing", () => {
    const res = compile(`<ul>
\${
  type Inner:struct = { x: number }
  type E:enum = { Red, Green }
  type T:struct = { n: number, s: string, b: bool, inner: Inner, e: E, arr: number[], m: [string: number] }
}
<li>x</li>
</ul>`);
    expect(fnFieldDiags(res).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// SHARED — fires identically on the native parser (defers to same type-system)
// ---------------------------------------------------------------------------

describe("W-TYPE-FN-FIELD — native parser parity", () => {
  test("fires on --parser=scrml-native for each shape", () => {
    const src = `<ul>
\${ type T:struct = { a: () -> void, b: fn(), c: (x: int) => string, d: string } }
<li>x</li>
</ul>`;
    expect(fnFieldDiags(compile(src, "scrml-native")).length).toBe(3);
  });

  test("does NOT fire on a lifecycle field under --parser=scrml-native", () => {
    const src = `<ul>
\${ type T:struct = { passwordHash: (not to string), label: string } }
<li>x</li>
</ul>`;
    expect(fnFieldDiags(compile(src, "scrml-native")).length).toBe(0);
  });
});
