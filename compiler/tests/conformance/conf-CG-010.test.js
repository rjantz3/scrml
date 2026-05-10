/**
 * CONF-CG-010 | §34 / §47.1.5
 *
 * Catalog: E-CG-010 — Type-encoding hash collision. The CollisionChecker
 * detects two structurally different types mapping to the same encoded
 * prefix (_<kind><hash>). This is normatively a hard error (§47 line 18100).
 *
 * Firing site: codegen/type-encoding.ts:360 (CollisionChecker.check).
 *
 * Triggering from user source is not feasible — the firing condition is an
 * fnv1a hash collision between two normalizeType() outputs, which would
 * require crafted source against the hash function. This conformance test
 * exercises the firing API directly, asserting that the documented behavior
 * (CGError throw with code E-CG-010) holds when the check is invoked with a
 * known collision shape.
 */
import { describe, test, expect } from "bun:test";
import { CollisionChecker } from "../../src/codegen/type-encoding.ts";

describe("CONF-CG-010: type-encoding collision (direct API)", () => {
  test("POS: registering two distinct types under the same prefix throws E-CG-010", () => {
    const checker = new CollisionChecker();
    // First registration succeeds.
    checker.check({ kind: "primitive", name: "string" }, "_p12345678");
    // Second registration with a structurally distinct type at the same
    // prefix triggers the collision check.
    let captured = null;
    try {
      checker.check({ kind: "primitive", name: "number" }, "_p12345678");
    } catch (e) {
      captured = e;
    }
    expect(captured).toBeDefined();
    expect(captured.code).toBe("E-CG-010");
  });

  test("NEG: registering the same type twice under the same prefix is a no-op (no E-CG-010)", () => {
    const checker = new CollisionChecker();
    const t = { kind: "primitive", name: "string" };
    let captured = null;
    try {
      checker.check(t, "_p12345678");
      checker.check(t, "_p12345678");
    } catch (e) {
      captured = e;
    }
    expect(captured).toBeNull();
  });
});
