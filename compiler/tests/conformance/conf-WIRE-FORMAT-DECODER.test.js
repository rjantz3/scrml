/**
 * CONF-WIRE-FORMAT-DECODER | §57.4 dual-decoder (M-7C-D-12 Track 2, OQ-4 (b))
 *
 * Validates the runtime behavior of `_scrml_wire_decode`:
 *
 *   - Canonical envelope `{ __scrml_absent: true }` → JS `null` (scrml `not`)
 *   - Raw JSON `null` → JS `null` (legacy / pre-v0.3 / foreign-client)
 *   - Any other value passes through unchanged (string / number / boolean /
 *     array / object / 0 / "" / false — all DEFINED values per §42.1.1)
 *
 * The dual-decoder retires at v1.0 (OQ-4 (a)); for the v0.x scaffold lifetime
 * it accepts BOTH envelope and raw null. Source-of-truth helper lives in
 * `compiler/src/codegen/wire-format.ts` and is emitted into both the server
 * module (via inlined `SERVER_WIRE_ENCODER_HELPER`) and the client runtime
 * (via `compiler/src/runtime-template.js` core chunk).
 *
 * This test imports the helper source string from `wire-format.ts` and
 * evaluates it directly to validate the canonical behavior end-to-end.
 */

import { describe, test, expect } from "bun:test";
import { CLIENT_WIRE_DECODER_HELPER, SERVER_WIRE_ENCODER_HELPER } from "../../src/codegen/wire-format.ts";

// Evaluate the helper sources to obtain live function references.
// Pattern: helper sources are inlined JS source strings; we wrap them in a
// returning IIFE and `new Function` to bring the functions into scope.
const _scrml_wire_decode = new Function(`${CLIENT_WIRE_DECODER_HELPER}\nreturn _scrml_wire_decode;`)();
const _scrml_wire_encode = new Function(`${SERVER_WIRE_ENCODER_HELPER}\nreturn _scrml_wire_encode;`)();

describe("§57.4 dual-decoder — envelope shape", () => {
  test("canonical envelope `{ __scrml_absent: true }` → null", () => {
    expect(_scrml_wire_decode({ __scrml_absent: true })).toBe(null);
  });

  test("raw JSON null → null (legacy / pre-v0.3 / foreign-client)", () => {
    expect(_scrml_wire_decode(null)).toBe(null);
  });
});

describe("§57.4 dual-decoder — defined-value passthrough (§42.1.1)", () => {
  test("non-empty string passes through", () => {
    expect(_scrml_wire_decode("hello")).toBe("hello");
  });

  test('empty string "" passes through (DEFINED value per §42.1.1, NOT absence)', () => {
    expect(_scrml_wire_decode("")).toBe("");
  });

  test("zero (number) passes through", () => {
    expect(_scrml_wire_decode(0)).toBe(0);
  });

  test("non-zero number passes through", () => {
    expect(_scrml_wire_decode(42)).toBe(42);
  });

  test("false passes through (DEFINED value)", () => {
    expect(_scrml_wire_decode(false)).toBe(false);
  });

  test("true passes through", () => {
    expect(_scrml_wire_decode(true)).toBe(true);
  });

  test("empty array [] passes through (DEFINED value)", () => {
    const arr = [];
    expect(_scrml_wire_decode(arr)).toBe(arr);
  });

  test("empty object {} passes through (DEFINED value)", () => {
    const obj = {};
    expect(_scrml_wire_decode(obj)).toBe(obj);
  });

  test("populated object passes through", () => {
    const obj = { name: "alice", age: 30 };
    expect(_scrml_wire_decode(obj)).toBe(obj);
  });

  test("object with `__scrml_absent: false` passes through (NOT canonical envelope)", () => {
    const obj = { __scrml_absent: false };
    expect(_scrml_wire_decode(obj)).toBe(obj);
  });

  test('object with `__scrml_absent: "true"` (string, not boolean) passes through', () => {
    const obj = { __scrml_absent: "true" };
    expect(_scrml_wire_decode(obj)).toBe(obj);
  });
});

describe("§57.3 encoder — round-trip with dual-decoder", () => {
  test("encode(null) → envelope; decode(envelope) → null (round-trip)", () => {
    const encoded = _scrml_wire_encode(null);
    expect(encoded).toEqual({ __scrml_absent: true });
    expect(_scrml_wire_decode(encoded)).toBe(null);
  });

  test('encode("hello") → "hello"; decode("hello") → "hello"', () => {
    const encoded = _scrml_wire_encode("hello");
    expect(encoded).toBe("hello");
    expect(_scrml_wire_decode(encoded)).toBe("hello");
  });

  test('encode("") → "" (empty string DEFINED, not absence)', () => {
    expect(_scrml_wire_encode("")).toBe("");
  });

  test("encode(0) → 0", () => {
    expect(_scrml_wire_encode(0)).toBe(0);
  });

  test("encode(false) → false", () => {
    expect(_scrml_wire_encode(false)).toBe(false);
  });

  test("encode(undefined) → envelope (foreign-code interop boundary, §42.9)", () => {
    // Scrml programs never produce raw `undefined`; this case covers foreign-
    // code interop (`^{}` / `_{}` / `?{}`) that might leak an `undefined`
    // through a `T | not` server fn. Encoder normalises both null/undefined
    // to the canonical envelope (mirrors §42.9 interop boundary semantics).
    expect(_scrml_wire_encode(undefined)).toEqual({ __scrml_absent: true });
  });
});
