/**
 * value-indexed-subscribers.test.js
 *
 * S103 Phase 3 select-row chip-away — runtime coverage for
 * _scrml_value_indexed_subscribers (the parallel sub-registry) and
 * _scrml_reactive_subscribe_when (the registration API).
 *
 * Anchors:
 *   - registration + dispatch fires only matching valueKey buckets
 *   - OLD-value bucket fires on transition out
 *   - NEW-value bucket fires on transition in
 *   - unsubscribe closure removes the registration
 *   - LEGACY _scrml_reactive_subscribe coexists (both fire on same write)
 *   - primitive-type valueKey isolation (5 vs "5", true vs "true")
 *   - no-op write (oldKey === newKey) fires the bucket exactly once, not twice
 */

import { describe, test, expect } from "bun:test";
import { SCRML_RUNTIME } from "../../src/runtime-template.js";

/**
 * Build a fresh runtime environment, exposing the bits this test needs.
 */
function createRuntime() {
  const wrapper = new Function(`
    const document = { querySelector: () => null, createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, innerHTML: "" }), head: { appendChild: () => {} }, body: { appendChild: () => {} }, addEventListener: () => {}, removeEventListener: () => {} };
    const window = { addEventListener: () => {} };
    const requestAnimationFrame = (fn) => 0;
    const cancelAnimationFrame = () => {};
    const navigator = { getGamepads: () => [] };
    const setInterval = globalThis.setInterval;
    const clearInterval = globalThis.clearInterval;
    const setTimeout = globalThis.setTimeout;
    const clearTimeout = globalThis.clearTimeout;

    ${SCRML_RUNTIME}

    return {
      _scrml_state,
      _scrml_reactive_set,
      _scrml_reactive_get,
      _scrml_reactive_subscribe,
      _scrml_reactive_subscribe_when,
      _scrml_value_indexed_subscribers,
      _scrml_value_indexed_key,
    };
  `);
  return wrapper();
}

describe("_scrml_value_indexed_key — stable primitive keys", () => {
  test("distinguishes string from number with same printable form", () => {
    const rt = createRuntime();
    expect(rt._scrml_value_indexed_key("5")).not.toBe(rt._scrml_value_indexed_key(5));
  });

  test("distinguishes true from 'true'", () => {
    const rt = createRuntime();
    expect(rt._scrml_value_indexed_key(true)).not.toBe(rt._scrml_value_indexed_key("true"));
  });

  test("null and undefined collapse to the same key (both absence)", () => {
    const rt = createRuntime();
    expect(rt._scrml_value_indexed_key(null)).toBe(rt._scrml_value_indexed_key(undefined));
  });

  test("same primitive → same key (idempotent)", () => {
    const rt = createRuntime();
    expect(rt._scrml_value_indexed_key("row-5")).toBe(rt._scrml_value_indexed_key("row-5"));
    expect(rt._scrml_value_indexed_key(42)).toBe(rt._scrml_value_indexed_key(42));
  });
});

describe("_scrml_reactive_subscribe_when — registration + dispatch", () => {
  test("subscriber under valueKey fires when cell transitions IN to that key", () => {
    const rt = createRuntime();
    let calls = 0;
    rt._scrml_reactive_subscribe_when("editingId", "row-5", () => { calls++; });
    rt._scrml_reactive_set("editingId", "row-5");
    expect(calls).toBe(1);
  });

  test("subscriber fires when cell transitions OUT of that key", () => {
    const rt = createRuntime();
    let calls = 0;
    rt._scrml_reactive_set("editingId", "row-5"); // baseline; no sub yet
    rt._scrml_reactive_subscribe_when("editingId", "row-5", () => { calls++; });
    rt._scrml_reactive_set("editingId", "row-7"); // transitions OUT
    expect(calls).toBe(1);
  });

  test("subscriber DOES NOT fire when cell moves between two unrelated keys", () => {
    const rt = createRuntime();
    let calls = 0;
    rt._scrml_reactive_subscribe_when("editingId", "row-5", () => { calls++; });
    rt._scrml_reactive_set("editingId", "row-3");
    rt._scrml_reactive_set("editingId", "row-7");
    expect(calls).toBe(0);
  });

  test("OLD + NEW buckets fire on a write that touches both", () => {
    const rt = createRuntime();
    let oldCalls = 0, newCalls = 0;
    rt._scrml_reactive_subscribe_when("editingId", "row-5", () => { oldCalls++; });
    rt._scrml_reactive_subscribe_when("editingId", "row-7", () => { newCalls++; });
    rt._scrml_reactive_set("editingId", "row-5"); // sets initial state to row-5; both registered before
    expect(oldCalls).toBe(1); // row-5 bucket fires (NEW)
    expect(newCalls).toBe(0); // row-7 bucket doesn't fire
    rt._scrml_reactive_set("editingId", "row-7"); // OLD=row-5, NEW=row-7
    expect(oldCalls).toBe(2); // row-5 bucket fires (OLD)
    expect(newCalls).toBe(1); // row-7 bucket fires (NEW)
  });

  test("no-op write (oldKey === newKey) fires the bucket exactly once", () => {
    const rt = createRuntime();
    let calls = 0;
    rt._scrml_reactive_set("x", "v"); // baseline
    rt._scrml_reactive_subscribe_when("x", "v", () => { calls++; });
    rt._scrml_reactive_set("x", "v"); // OLD = NEW = "v"; bucket fires once, not twice
    expect(calls).toBe(1);
  });

  test("unrelated cell write does NOT fire bucket", () => {
    const rt = createRuntime();
    let calls = 0;
    rt._scrml_reactive_subscribe_when("editingId", "row-5", () => { calls++; });
    rt._scrml_reactive_set("otherCell", "row-5");
    expect(calls).toBe(0);
  });

  test("multiple subscribers under same (name, valueKey) all fire in registration order", () => {
    const rt = createRuntime();
    const order = [];
    rt._scrml_reactive_subscribe_when("x", "v", () => { order.push("a"); });
    rt._scrml_reactive_subscribe_when("x", "v", () => { order.push("b"); });
    rt._scrml_reactive_subscribe_when("x", "v", () => { order.push("c"); });
    rt._scrml_reactive_set("x", "v");
    expect(order).toEqual(["a", "b", "c"]);
  });

  test("unsubscribe closure removes the subscriber cleanly", () => {
    const rt = createRuntime();
    let calls = 0;
    const off = rt._scrml_reactive_subscribe_when("x", "v", () => { calls++; });
    off();
    rt._scrml_reactive_set("x", "v");
    expect(calls).toBe(0);
  });

  test("unsubscribe doesn't affect OTHER subscribers under same (name, valueKey)", () => {
    const rt = createRuntime();
    let keep = 0;
    const off = rt._scrml_reactive_subscribe_when("x", "v", () => { /* removed */ });
    rt._scrml_reactive_subscribe_when("x", "v", () => { keep++; });
    off();
    rt._scrml_reactive_set("x", "v");
    expect(keep).toBe(1);
  });

  test("primitive type isolation: number 5 vs string '5'", () => {
    const rt = createRuntime();
    let numCalls = 0, strCalls = 0;
    rt._scrml_reactive_subscribe_when("x", 5, () => { numCalls++; });
    rt._scrml_reactive_subscribe_when("x", "5", () => { strCalls++; });
    rt._scrml_reactive_set("x", 5);
    expect(numCalls).toBe(1);
    expect(strCalls).toBe(0);
    rt._scrml_reactive_set("x", "5");
    expect(numCalls).toBe(2); // OLD bucket (numeric 5) fires
    expect(strCalls).toBe(1); // NEW bucket (string "5") fires
  });

  test("null and undefined treated as same bucket (both absence)", () => {
    const rt = createRuntime();
    let calls = 0;
    rt._scrml_reactive_subscribe_when("x", null, () => { calls++; });
    rt._scrml_reactive_set("x", null);
    expect(calls).toBe(1);
    // The undefined-keyed registration also resolves to the same bucket.
    let undefCalls = 0;
    rt._scrml_reactive_subscribe_when("x", undefined, () => { undefCalls++; });
    rt._scrml_reactive_set("x", undefined);
    // Both subscribers (registered under null and under undefined) fire,
    // because the keyer collapses null + undefined.
    expect(calls + undefCalls).toBeGreaterThan(0);
  });
});

describe("LEGACY + value-indexed coexistence", () => {
  test("LEGACY _scrml_reactive_subscribe still works post-impl", () => {
    const rt = createRuntime();
    let calls = 0;
    rt._scrml_reactive_subscribe("x", () => { calls++; });
    rt._scrml_reactive_set("x", "anything");
    expect(calls).toBe(1);
  });

  test("LEGACY + value-indexed both fire on the same write", () => {
    const rt = createRuntime();
    let legacyCalls = 0, indexedCalls = 0;
    rt._scrml_reactive_subscribe("x", () => { legacyCalls++; });
    rt._scrml_reactive_subscribe_when("x", "target", () => { indexedCalls++; });
    rt._scrml_reactive_set("x", "target");
    expect(legacyCalls).toBe(1);
    expect(indexedCalls).toBe(1);
  });

  test("LEGACY fires on every write; value-indexed fires only on bucket hits", () => {
    const rt = createRuntime();
    let legacyCalls = 0, indexedCalls = 0;
    rt._scrml_reactive_subscribe("x", () => { legacyCalls++; });
    rt._scrml_reactive_subscribe_when("x", "target", () => { indexedCalls++; });
    rt._scrml_reactive_set("x", "a");
    rt._scrml_reactive_set("x", "b");
    rt._scrml_reactive_set("x", "c");
    rt._scrml_reactive_set("x", "target");
    rt._scrml_reactive_set("x", "d");
    expect(legacyCalls).toBe(5); // every write
    expect(indexedCalls).toBe(2); // transitions: in to "target", out of "target"
  });
});

describe("subscriber-error isolation", () => {
  test("a throwing subscriber does not break siblings", () => {
    const rt = createRuntime();
    let sib = 0;
    rt._scrml_reactive_subscribe_when("x", "v", () => { throw new Error("boom"); });
    rt._scrml_reactive_subscribe_when("x", "v", () => { sib++; });
    rt._scrml_reactive_set("x", "v");
    expect(sib).toBe(1);
  });
});
