/**
 * A9 Ext 5 — SPEC amendments doc-only verification (S76 dispatch).
 *
 * Verifies that the spec text amendments landed at D0 are present:
 *   - §19.9.6 (Static Monotonicity Classification + Idempotency-Key Replay)
 *   - §19.9.7 (`.idempotent()` Function Modifier)
 *   - §39.2.6 (`idempotency-store=` attribute)
 *   - §40.2 attribute table includes `idempotency-store=` row
 *   - §34 catalog includes 6 new codes (3 errors + 3 diagnostics)
 *   - PIPELINE.md Stage 5.5 (Monotonicity Classifier) section exists
 *
 * Mirror of D4 SPEC-amendments verification block in
 * a9-ext4-cps-failable-wiring.test.js.
 */

import { describe, test, expect } from "bun:test";

describe("A9 Ext 5 SPEC amendments — §19.9.6 + §19.9.7 + §39.2.6 + §34", () => {
  test("§19.9.6 (Static Monotonicity Classification + Idempotency-Key Replay) section exists", async () => {
    const spec = await Bun.file("compiler/SPEC.md").text();
    expect(spec).toContain("#### 19.9.6 Static Monotonicity Classification + Idempotency-Key Replay");
  });

  test("§19.9.6 documents the (a)-(f) classification rules", async () => {
    const spec = await Bun.file("compiler/SPEC.md").text();
    const idx = spec.indexOf("#### 19.9.6 Static Monotonicity Classification");
    expect(idx).toBeGreaterThan(-1);
    const section = spec.slice(idx, idx + 8000);
    expect(section).toContain("S5 (replay safety)");
    expect(section).toContain("monotone");
    expect(section).toContain("non-monotone");
    // Rules a-f
    expect(section).toContain("SELECT");
    expect(section).toContain("INSERT");
    expect(section).toContain("UPDATE");
    expect(section).toContain("DELETE");
    expect(section).toContain("`<machine>`");
    expect(section).toContain(".advance()");
  });

  test("§19.9.6 documents the shadow-table schema with INTEGER timestamps", async () => {
    const spec = await Bun.file("compiler/SPEC.md").text();
    const idx = spec.indexOf("#### 19.9.6 Static Monotonicity Classification");
    expect(idx).toBeGreaterThan(-1);
    const section = spec.slice(idx, idx + 8000);
    expect(section).toContain("_scrml_idempotency_keys");
    expect(section).toContain("response_body");
    expect(section).toContain("response_status");
    expect(section).toContain("created_at");
    expect(section).toContain("expires_at");
    expect(section).toContain("INTEGER");
  });

  test("§19.9.6 documents Idempotency-Key header (IETF draft)", async () => {
    const spec = await Bun.file("compiler/SPEC.md").text();
    const idx = spec.indexOf("#### 19.9.6 Static Monotonicity Classification");
    expect(idx).toBeGreaterThan(-1);
    const section = spec.slice(idx, idx + 8000);
    expect(section).toContain("`Idempotency-Key`");
    expect(section).toContain("UUIDv4");
  });

  test("§19.9.6 documents channel-skip note", async () => {
    const spec = await Bun.file("compiler/SPEC.md").text();
    const idx = spec.indexOf("#### 19.9.6 Static Monotonicity Classification");
    expect(idx).toBeGreaterThan(-1);
    const section = spec.slice(idx, idx + 8000);
    expect(section).toContain("`<channel>`");
    expect(section).toContain("out of scope");
  });

  test("§19.9.7 (`.idempotent()` Function Modifier) section exists", async () => {
    const spec = await Bun.file("compiler/SPEC.md").text();
    expect(spec).toContain("#### 19.9.7 The `.idempotent()` Function Modifier");
  });

  test("§19.9.7 documents D-CPS-IDEMPOTENT-OVERRIDE diagnostic", async () => {
    const spec = await Bun.file("compiler/SPEC.md").text();
    const idx = spec.indexOf("#### 19.9.7 The `.idempotent()`");
    expect(idx).toBeGreaterThan(-1);
    const section = spec.slice(idx, idx + 5000);
    expect(section).toContain("D-CPS-IDEMPOTENT-OVERRIDE");
    expect(section).toContain("developer assertion");
  });

  test("§40.2 attribute table includes `idempotency-store=` row", async () => {
    const spec = await Bun.file("compiler/SPEC.md").text();
    const idx = spec.indexOf("### 40.2 Compiler-Auto Middleware");
    expect(idx).toBeGreaterThan(-1);
    const section = spec.slice(idx, idx + 5000);
    expect(section).toContain("`idempotency-store=`");
  });

  test("§39.2.6 (`idempotency-store=`) sub-section exists", async () => {
    const spec = await Bun.file("compiler/SPEC.md").text();
    expect(spec).toContain("#### 39.2.6 `idempotency-store=`");
  });

  test("§39.2.6 documents the 5+default value space", async () => {
    const spec = await Bun.file("compiler/SPEC.md").text();
    const idx = spec.indexOf("#### 39.2.6 `idempotency-store=`");
    expect(idx).toBeGreaterThan(-1);
    const section = spec.slice(idx, idx + 5000);
    expect(section).toContain('"auto"');
    expect(section).toContain('"sqlite"');
    expect(section).toContain('"postgres"');
    expect(section).toContain('"mysql"');
    expect(section).toContain('"redis"');
    expect(section).toContain('"none"');
  });

  test("§34 catalog contains 3 new error codes", async () => {
    const spec = await Bun.file("compiler/SPEC.md").text();
    // Each code appears in BOTH §19.13 local table AND §34 master registry,
    // plus narrative refs — so >=2 occurrences each.
    expect((spec.match(/E-CPS-NONIDEM-NO-STORAGE/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((spec.match(/E-CPS-IDEMPOTENCY-STORE-DRIVER-MISMATCH/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((spec.match(/E-CPS-IDEMPOTENCY-STORE-MISSING-IMPORT/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  test("§34 catalog contains 3 new diagnostic codes", async () => {
    const spec = await Bun.file("compiler/SPEC.md").text();
    expect((spec.match(/D-CPS-MACHINE-INTRINSIC-MONOTONE/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((spec.match(/D-CPS-IDEMPOTENT-OVERRIDE/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((spec.match(/D-CPS-MONOTONE/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  test("PIPELINE.md Stage 5.5 (Monotonicity Classifier) section exists", async () => {
    const pipeline = await Bun.file("compiler/PIPELINE.md").text();
    expect(pipeline).toContain("## Stage 5.5: Monotonicity Classifier (MC)");
    expect(pipeline).toContain("SPEC §19.9.6");
  });

  test("PIPELINE.md Stage Index includes Stage 5.5 row", async () => {
    const pipeline = await Bun.file("compiler/PIPELINE.md").text();
    const idx = pipeline.indexOf("## Stage Index");
    expect(idx).toBeGreaterThan(-1);
    const indexSection = pipeline.slice(idx, idx + 2000);
    expect(indexSection).toContain("5.5");
    expect(indexSection).toContain("Monotonicity Classifier");
  });
});
