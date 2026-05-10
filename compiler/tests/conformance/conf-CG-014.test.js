/**
 * CONF-CG-014 | §34 / §47
 *
 * Catalog: E-CG-014 — Disambiguator overflow. A single scope contains more
 * than 1,332 bindings of the same encoded type prefix (the seq counter
 * exhausts the single-char base36 range, 0-9 + a-z, after 36*36 = 1296 + 36
 * extra slots).
 *
 * Firing site: codegen/type-encoding.ts:445 (EncodingContext.register).
 *
 * Triggering from user-source is impractical (1,300+ same-typed bindings in
 * a single scope is well beyond realistic program shape). This conformance
 * test exercises the firing API directly through EncodingContext.register,
 * confirming the documented invariant holds.
 */
import { describe, test, expect } from "bun:test";
import { EncodingContext } from "../../src/codegen/type-encoding.ts";

describe("CONF-CG-014: disambiguator overflow (direct API)", () => {
  test("POS: 1333 registrations of unique names typed as `string` throws E-CG-014", () => {
    const ctx = new EncodingContext({ enabled: true });
    const t = { kind: "primitive", name: "string" };
    let captured = null;
    try {
      // Register up to and past the seq cap (>1331 trips the guard, since
      // the check is `seq > 1331` AFTER the seq increment).
      for (let i = 0; i < 1334; i++) {
        ctx.register(`v${i}`, t);
      }
    } catch (e) {
      captured = e;
    }
    expect(captured).toBeDefined();
    expect(captured.code).toBe("E-CG-014");
  });

  test("NEG: registering 100 unique names of the same type does NOT throw E-CG-014", () => {
    const ctx = new EncodingContext({ enabled: true });
    const t = { kind: "primitive", name: "string" };
    let captured = null;
    try {
      for (let i = 0; i < 100; i++) {
        ctx.register(`v${i}`, t);
      }
    } catch (e) {
      captured = e;
    }
    expect(captured).toBeNull();
  });
});
