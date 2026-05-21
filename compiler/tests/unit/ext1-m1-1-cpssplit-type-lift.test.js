/**
 * Ext 1 M1.1 — CPSSplit type lift to multi-batch.
 *
 * Verifies the structural type lift (EXT-1-IMPL-BRIEF.md §M1.1, scope-dive
 * §B.1): the flat `serverStmtIndices: number[]` is replaced by
 * `serverBatches: CPSBatch[]`, with `serverStmtIndices` preserved as a derived
 * back-compat getter that flattens every batch's indices.
 *
 * M1.1 is a structural type lift only — no behavior change. CLEAN at S1-S5
 * (a type lift records no semantic change).
 */

import { describe, test, expect } from "bun:test";
import { CPSSplit } from "../../src/route-inference.ts";

describe("Ext 1 M1.1 — CPSSplit.singleBatch construction", () => {
  test("singleBatch produces exactly one server batch", () => {
    const split = CPSSplit.singleBatch([0, 2, 3], [1, 4], "result");
    expect(split.serverBatches.length).toBe(1);
    expect(split.serverBatches[0].indices).toEqual([0, 2, 3]);
  });

  test("singleBatch carries clientStmtIndices + returnVarName through", () => {
    const split = CPSSplit.singleBatch([0], [1, 2], "row");
    expect(split.clientStmtIndices).toEqual([1, 2]);
    expect(split.returnVarName).toBe("row");
  });

  test("singleBatch accepts a null returnVarName", () => {
    const split = CPSSplit.singleBatch([0], [], null);
    expect(split.returnVarName).toBe(null);
  });

  test("a fresh single batch has an empty idempotencyTag (defined value, not absence)", () => {
    const split = CPSSplit.singleBatch([0], [], null);
    expect(split.serverBatches[0].idempotencyTag).toBe("");
  });

  test("a fresh single batch has no per-batch monotonicity verdict yet (M1.4 populates it)", () => {
    const split = CPSSplit.singleBatch([0], [], null);
    expect(split.serverBatches[0].monotonicity).toBeUndefined();
  });
});

describe("Ext 1 M1.1 — serverStmtIndices derived back-compat getter", () => {
  test("getter flattens a single batch — equals the source index array", () => {
    const split = CPSSplit.singleBatch([0, 1, 4], [2, 3], null);
    expect(split.serverStmtIndices).toEqual([0, 1, 4]);
  });

  test("getter flattens multiple batches in ascending order", () => {
    const split = new CPSSplit(
      [
        { indices: [4, 5], idempotencyTag: "" },
        { indices: [0, 1], idempotencyTag: "" },
      ],
      [2, 3],
      null,
    );
    expect(split.serverStmtIndices).toEqual([0, 1, 4, 5]);
  });

  test("getter is recomputed live — reflects batch mutation", () => {
    const split = CPSSplit.singleBatch([0], [], null);
    expect(split.serverStmtIndices).toEqual([0]);
    split.serverBatches.push({ indices: [3], idempotencyTag: "" });
    expect(split.serverStmtIndices).toEqual([0, 3]);
  });

  test("getter on an empty-batch plan yields an empty array", () => {
    const split = new CPSSplit([], [0, 1], null);
    expect(split.serverStmtIndices).toEqual([]);
  });
});

describe("Ext 1 M1.1 — function-level monotonicity field retained for back-compat", () => {
  test("monotonicity is undefined until Stage 5.5 attaches it", () => {
    const split = CPSSplit.singleBatch([0], [], null);
    expect(split.monotonicity).toBeUndefined();
  });

  test("monotonicity is in-place mutable (Stage 5.5 attachment surface)", () => {
    const split = CPSSplit.singleBatch([0], [], null);
    split.monotonicity = "non-monotone";
    expect(split.monotonicity).toBe("non-monotone");
  });
});
