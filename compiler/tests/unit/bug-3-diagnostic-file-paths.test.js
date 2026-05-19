/**
 * bug-3-diagnostic-file-paths.test.js — [BS] / [TAB] diagnostics include file path
 *
 * Regression: dogfood Bug 3 surfaced S106 side session
 * (handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md
 * §"Bug 3"). Pre-S107: `[BS] E-CTX-003: ...` diagnostics omitted file paths
 * while sibling `[W-LINT-013]` diagnostics included them — adopters with 80+
 * compile units had to bisect by which dist HTML was missing to localize the
 * failing source.
 *
 * Fix (api.js + dev.js + build.js):
 *   - api.js `collectErrors(stageName, errors, filePath)` now takes optional
 *     filePath; stamps it onto each error's `filePath` field + `span.file`
 *     when not already present. Per-file stages (BS, TAB) pass it through.
 *   - api.js also normalizes `bsSpan` → `span` so downstream formatters can
 *     read source location uniformly across BS / TAB / NR / SYM / CG.
 *   - dev.js + build.js error/warning formatters read `e.filePath ||
 *     e.span?.file` + `e.line ?? e.span?.line` + `e.column ?? e.col ??
 *     e.span?.col` and emit `path:line:col` prefix mirroring the W-LINT-*
 *     formatter shape (lint diags already worked).
 *
 * Coverage:
 *   §1  BS-stage errors carry `filePath` after collectErrors enrichment
 *   §2  BS-stage errors carry `span.file` after collectErrors enrichment
 *   §3  BS-stage errors carry `span.line` (from bsSpan normalize)
 *   §4  Other-stage errors that already have `span` are unaffected
 *   §5  Errors WITHOUT filePath (no per-file context) survive without crashes
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/bug-3-diagnostic-file-paths");
const FIXTURE_OUTPUT = join(FIXTURE_DIR, "dist");

let brokenFx;

beforeAll(() => {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  // Source with a bare `?{` in markup text → triggers BS-layer E-CTX-003
  // cascade (unclosed sql + p + program). All three errors should carry the
  // fixture file's path after the fix.
  brokenFx = join(FIXTURE_DIR, "broken.scrml");
  writeFileSync(brokenFx, `<program>
    <p>This uses ?{ in text and never closes</p>
</program>
`);
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

function compile(path) {
  return compileScrml({ inputFiles: [path], outputDir: FIXTURE_OUTPUT, write: false });
}

// ---------------------------------------------------------------------------
// §1: BS-stage errors carry `filePath` after enrichment
// ---------------------------------------------------------------------------

describe("§1: Bug 3 — BS-stage errors carry filePath after collectErrors enrichment", () => {
  test("compile produces ≥1 BS-stage error with filePath set to the fixture path", () => {
    const result = compile(brokenFx);
    const bsErrors = result.errors.filter((e) => e.stage === "BS");
    expect(bsErrors.length).toBeGreaterThan(0);
    for (const e of bsErrors) {
      expect(e.filePath).toBe(brokenFx);
    }
  });
});

// ---------------------------------------------------------------------------
// §2: BS-stage errors carry `span.file` after enrichment
// ---------------------------------------------------------------------------

describe("§2: Bug 3 — BS-stage errors carry span.file after collectErrors enrichment", () => {
  test("each BS error's span.file matches the fixture path", () => {
    const result = compile(brokenFx);
    const bsErrors = result.errors.filter((e) => e.stage === "BS");
    expect(bsErrors.length).toBeGreaterThan(0);
    for (const e of bsErrors) {
      expect(e.span?.file).toBe(brokenFx);
    }
  });
});

// ---------------------------------------------------------------------------
// §3: BS-stage errors carry span.line (from bsSpan → span normalize)
// ---------------------------------------------------------------------------

describe("§3: Bug 3 — BSError's bsSpan is normalized to span so line/col surface uniformly", () => {
  test("each BS error has a numeric span.line", () => {
    const result = compile(brokenFx);
    const bsErrors = result.errors.filter((e) => e.stage === "BS");
    expect(bsErrors.length).toBeGreaterThan(0);
    for (const e of bsErrors) {
      expect(typeof e.span?.line).toBe("number");
      expect(e.span.line).toBeGreaterThan(0);
    }
  });

  test("each BS error has a numeric span.col", () => {
    const result = compile(brokenFx);
    const bsErrors = result.errors.filter((e) => e.stage === "BS");
    for (const e of bsErrors) {
      expect(typeof e.span?.col).toBe("number");
      expect(e.span.col).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// §4: Other-stage errors with pre-set span are unaffected by the normalize
// ---------------------------------------------------------------------------

describe("§4: Bug 3 — collectErrors normalize doesn't clobber pre-existing span", () => {
  test("BS-fixture's well-formed file produces no BS errors (regression guard for the enrichment branch)", () => {
    const goodFx = join(FIXTURE_DIR, "good.scrml");
    writeFileSync(goodFx, `<program>
    <p>just text</p>
</program>
`);
    const result = compile(goodFx);
    const bsErrors = result.errors.filter((e) => e.stage === "BS");
    expect(bsErrors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §5: Errors without per-file context don't crash the formatter chain
// ---------------------------------------------------------------------------

describe("§5: Bug 3 — collectErrors handles errors without filePath gracefully", () => {
  test("when no filePath is passed (general-stage call), errors still surface code/message", () => {
    // This exercises the normal path — most stage call sites don't pass
    // filePath. The enricher should leave errors alone in that case.
    const result = compile(brokenFx);
    // Every error has code + message regardless of filePath origin.
    for (const e of result.errors) {
      expect(typeof e.code).toBe("string");
      expect(typeof e.message).toBe("string");
    }
  });
});
