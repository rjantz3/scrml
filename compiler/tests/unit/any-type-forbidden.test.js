/**
 * E-TYPE-ANY-FORBIDDEN — `any` is not a type in scrml (§14.1.1 / §34, S174 hard line).
 *
 * The literal type-token `any` in ANY type-annotation position (struct field,
 * state-cell annotation, fn/function param or return type) is a hard ERROR. The
 * sanctioned untyped escape hatch is `asIs` (a named opt-out), which does NOT
 * fire. `any`-token-specific: an arbitrary undefined type name (the broader
 * unknown-type leak) is a separate follow-on and does NOT fire THIS code.
 *
 * E- prefix → result.errors (fatal). Tests assert over BOTH streams so a
 * partition regression (an E- code silently moving to result.warnings) is caught.
 *
 * Ratified S174 (user hard line: "There is no any"). Fire site:
 * type-system.ts `checkAnyTypeForbidden`.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let TMP;
beforeAll(() => { TMP = mkdtempSync(join(tmpdir(), "any-forbidden-")); });
afterAll(() => { if (TMP) rmSync(TMP, { recursive: true, force: true }); });

function compile(src) {
  const fp = join(TMP, `f-${Math.random().toString(36).slice(2)}.scrml`);
  writeFileSync(fp, src);
  return compileScrml({ inputFiles: [fp], outputDir: join(TMP, "dist"), write: false, log: () => {} });
}

// Cross-stream: E- partitions to result.errors, but assert over BOTH streams so
// a partition regression is caught rather than silently passing.
function anyDiags(res) {
  return [...(res.errors || []), ...(res.warnings || [])]
    .filter((d) => d.code === "E-TYPE-ANY-FORBIDDEN");
}

// ---------------------------------------------------------------------------
// POSITIVE — `any` fires in every type-annotation position
// ---------------------------------------------------------------------------

describe("E-TYPE-ANY-FORBIDDEN — positive", () => {
  test("struct field `: any` fires", () => {
    const res = compile(`<ul>
\${ type T:struct = { a: any, b: string } }
<li>x</li>
</ul>`);
    expect(anyDiags(res).length).toBeGreaterThanOrEqual(1);
    // E- code → result.errors, never result.warnings.
    expect((res.warnings || []).some((d) => d.code === "E-TYPE-ANY-FORBIDDEN")).toBe(false);
    expect((res.errors || []).some((d) => d.code === "E-TYPE-ANY-FORBIDDEN")).toBe(true);
  });

  test("fn parameter `: any` fires", () => {
    const res = compile(`<ul>
\${ fn f(x: any) -> string { return "" } }
<li>x</li>
</ul>`);
    expect(anyDiags(res).length).toBeGreaterThanOrEqual(1);
  });

  test("fn return `-> any` fires", () => {
    const res = compile(`<ul>
\${ fn g() -> any { return 0 } }
<li>x</li>
</ul>`);
    expect(anyDiags(res).length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// NEGATIVE — `asIs` + real types do NOT fire; no false-fire on substrings
// ---------------------------------------------------------------------------

describe("E-TYPE-ANY-FORBIDDEN — negative", () => {
  test("`asIs` (the sanctioned escape hatch) does NOT fire", () => {
    const res = compile(`<ul>
\${ type T:struct = { a: asIs, b: string } }
<li>x</li>
</ul>`);
    expect(anyDiags(res).length).toBe(0);
  });

  test("real types (string/number/int) do NOT fire", () => {
    const res = compile(`<ul>
\${ type T:struct = { a: string, b: number, c: int } }
<li>x</li>
</ul>`);
    expect(anyDiags(res).length).toBe(0);
  });

  test("a defined type whose name CONTAINS 'any' as a substring does NOT false-fire", () => {
    // The atom check splits on non-identifier chars and tests for a BARE `any`
    // atom — `Company` is one atom, not the `any` token.
    const res = compile(`<ul>
\${ type Company:struct = { name: string } }
\${ type T:struct = { c: Company } }
<li>x</li>
</ul>`);
    expect(anyDiags(res).length).toBe(0);
  });
});
