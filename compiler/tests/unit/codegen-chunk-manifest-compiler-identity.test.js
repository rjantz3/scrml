/**
 * Codegen Chunk-Manifest `compiler` Identity — Q-OPEN-4 (S92)
 *
 * Asserts the policy ratified at S92: the `chunks.json` manifest's
 * top-level `compiler` field is single-sourced from the scrmlTS
 * `package.json` `version` field at compile time, with shape
 * `"scrml-" + V`. A hard-coded constant previously held this value
 * (`route-splitter.ts:298` pre-S92); the helper `getCompilerIdentity()`
 * now reads `package.json` lazily and caches the result.
 *
 * Coverage:
 *   §1  Happy path — `getCompilerIdentity()` matches `"scrml-" + V`
 *       where V is the current scrmlTS package.json `version`.
 *   §2  Format invariant — the value matches `/^scrml-.+/` so future
 *       package.json edits cannot accidentally produce a malformed
 *       string (empty suffix, missing prefix, etc.).
 *   §3  Manifest emission — `emitPerRouteChunks()` surfaces the same
 *       identity string in `manifest.compiler` (Q-OPEN-4 wire-through).
 *   §4  Fallback contract — when scrmlTS `package.json` cannot be read
 *       (simulated via subprocess + mocked `node:fs.readFileSync`), the
 *       helper returns `"scrml-unknown"` and NEVER throws.
 *
 * Cross-references:
 *   - SPEC §47.5 — informational anchor for the `compiler` field
 *     (Q-OPEN-4 amendment).
 *   - SPEC §40.9.8 — the compiler version is NOT a chunk-hash input
 *     (informational only; bumping it does not invalidate content
 *     addresses).
 *   - route-splitter.ts:`getCompilerIdentity` — the source of truth.
 */

import { describe, test, expect, afterAll } from "bun:test";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getCompilerIdentity,
  _computeCompilerIdentityFromPath,
  emitPerRouteChunks,
} from "../../src/codegen/route-splitter.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");

/**
 * Read the scrmlTS package.json `version` field by re-reading the file
 * directly (NOT going through the helper). This keeps the test's
 * "expected value" path independent from the helper's "actual value"
 * path so the test can detect divergence rather than tautologically
 * agreeing with whatever the helper computes.
 */
function readPkgVersionDirect() {
  const raw = readFileSync(join(REPO_ROOT, "package.json"), "utf8");
  const pkg = JSON.parse(raw);
  return pkg.version;
}

/**
 * Build a synthetic ReachabilityRecord with one entry point + one role +
 * one tier so we can exercise the `emitPerRouteChunks()` path with
 * minimal scaffolding. Matches the shape used by the parent
 * `codegen-route-splitter.test.js` helpers.
 */
function makeTrivialRecord() {
  // Field names mirror `ChunkContents` in route-splitter.ts:168-175
  // (componentNodeIds / reactiveCellNodeIds / serverFnNodeIds /
  // vendorUnitNames). Matches the helper in
  // codegen-route-splitter.test.js:77-83.
  const emptyContents = () => ({
    componentNodeIds: new Set(),
    reactiveCellNodeIds: new Set(),
    serverFnNodeIds: new Set(),
    vendorUnitNames: new Set(),
  });
  const plan = {
    initialChunk: emptyContents(),
    prefetchTier1: emptyContents(),
    prefetchTier2: emptyContents(),
    prefetchTierN: [],
  };
  const roleMap = new Map([["_anonymous", plan]]);
  const closures = new Map([
    ["/abs/app.scrml::#program", { byRole: roleMap }],
  ]);
  return { closures, diagnostics: [] };
}

// ---------------------------------------------------------------------------
// §1 — happy path: getCompilerIdentity() == "scrml-" + pkg.version
// ---------------------------------------------------------------------------

describe("§1 happy path — identity is sourced from package.json", () => {
  test("getCompilerIdentity() equals 'scrml-' + pkg.version", () => {
    const version = readPkgVersionDirect();
    expect(typeof version).toBe("string");
    expect(version.length).toBeGreaterThan(0);
    expect(getCompilerIdentity()).toBe(`scrml-${version}`);
  });

  test("repeated calls return the same cached value", () => {
    const first = getCompilerIdentity();
    const second = getCompilerIdentity();
    const third = getCompilerIdentity();
    expect(first).toBe(second);
    expect(second).toBe(third);
  });
});

// ---------------------------------------------------------------------------
// §2 — format invariant: /^scrml-.+/
// ---------------------------------------------------------------------------

describe("§2 format invariant — identity matches /^scrml-.+/", () => {
  test("identity starts with the 'scrml-' prefix", () => {
    expect(getCompilerIdentity()).toMatch(/^scrml-/);
  });

  test("identity has a non-empty suffix after 'scrml-'", () => {
    // Defensive: a future package.json edit that accidentally produces
    // `"version": ""` (empty string) must NOT result in a malformed
    // "scrml-" identity. The helper's `pkg.version.length > 0` check
    // routes empty versions to the fallback path; the regex below
    // catches both the happy-path version-suffix and the fallback
    // "scrml-unknown" sentinel.
    expect(getCompilerIdentity()).toMatch(/^scrml-.+$/);
  });
});

// ---------------------------------------------------------------------------
// §3 — manifest emission wires the identity through
// ---------------------------------------------------------------------------

describe("§3 manifest emission — emitPerRouteChunks surfaces the identity", () => {
  test("manifest.compiler equals getCompilerIdentity()", () => {
    const expected = getCompilerIdentity();
    const { manifest } = emitPerRouteChunks({
      reachabilityRecord: makeTrivialRecord(),
    });
    expect(manifest.compiler).toBe(expected);
  });

  test("manifest.compiler equals 'scrml-' + pkg.version (single-source)", () => {
    const version = readPkgVersionDirect();
    const { manifest } = emitPerRouteChunks({
      reachabilityRecord: makeTrivialRecord(),
    });
    expect(manifest.compiler).toBe(`scrml-${version}`);
  });
});

// ---------------------------------------------------------------------------
// §4 — fallback contract: 'scrml-unknown' on unreadable package.json
// ---------------------------------------------------------------------------

describe("§4 fallback contract — bad/missing package.json yields 'scrml-unknown'", () => {
  // The cached `getCompilerIdentity()` populates `cachedCompilerIdentity`
  // on first call in this process (the §1–§3 tests already triggered
  // that). To exercise the fallback paths we use the un-cached internal
  // seam `_computeCompilerIdentityFromPath(path)` which takes the
  // package.json location as an explicit argument and never touches the
  // module-scope cache. We write stub package.json files into a temp
  // directory and assert each fallback branch in turn.
  //
  // Cleanup: `afterAll` removes the temp directory.
  const tmpRoot = mkdtempSync(
    join(tmpdir(), "scrml-compiler-identity-fallback-"),
  );
  afterAll(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  test("returns 'scrml-unknown' when package.json does NOT exist", () => {
    // No file written — readFileSync raises ENOENT; the helper's
    // try/catch swallows it and returns the fallback.
    const missingPath = join(tmpRoot, "no-such-package.json");
    expect(_computeCompilerIdentityFromPath(missingPath)).toBe(
      "scrml-unknown",
    );
  });

  test("returns 'scrml-unknown' when package.json is malformed JSON", () => {
    const badJsonPath = join(tmpRoot, "malformed.json");
    writeFileSync(badJsonPath, "{ not valid json ::: ");
    expect(_computeCompilerIdentityFromPath(badJsonPath)).toBe(
      "scrml-unknown",
    );
  });

  test("returns 'scrml-unknown' when package.json has no 'version' field", () => {
    // Variant: package.json is readable + parses, but lacks `version`.
    // The helper's `typeof pkg.version === "string"` guard routes to
    // the fallback.
    const noVersionPath = join(tmpRoot, "no-version.json");
    writeFileSync(
      noVersionPath,
      JSON.stringify({ name: "scrmlts" /* no version field */ }),
    );
    expect(_computeCompilerIdentityFromPath(noVersionPath)).toBe(
      "scrml-unknown",
    );
  });

  test("returns 'scrml-unknown' when 'version' is a non-string", () => {
    // Variant: package.json has a `version` field but its value is not
    // a string (e.g. accidentally a number or object).
    const nonStringVersionPath = join(tmpRoot, "non-string-version.json");
    writeFileSync(
      nonStringVersionPath,
      JSON.stringify({ name: "scrmlts", version: 0.3 }),
    );
    expect(_computeCompilerIdentityFromPath(nonStringVersionPath)).toBe(
      "scrml-unknown",
    );
  });

  test("returns 'scrml-unknown' when 'version' is the empty string", () => {
    // Variant: `version: ""` would otherwise yield the malformed
    // identity `"scrml-"` (with empty suffix). The helper's
    // `pkg.version.length > 0` guard routes empty versions to the
    // fallback.
    const emptyVersionPath = join(tmpRoot, "empty-version.json");
    writeFileSync(
      emptyVersionPath,
      JSON.stringify({ name: "scrmlts", version: "" }),
    );
    expect(_computeCompilerIdentityFromPath(emptyVersionPath)).toBe(
      "scrml-unknown",
    );
  });

  test("happy path: returns 'scrml-<v>' for a well-formed stub package.json", () => {
    // Inverse of the fallback variants — proves the helper's success
    // branch fires when given a valid stub. This is the "uncached
    // version of §1" — the cached `getCompilerIdentity()` may return
    // the worktree's own pkg.json version, but the un-cached helper
    // accepts arbitrary paths.
    const goodPath = join(tmpRoot, "good.json");
    writeFileSync(
      goodPath,
      JSON.stringify({ name: "scrmlts", version: "9.9.9-test.42" }),
    );
    expect(_computeCompilerIdentityFromPath(goodPath)).toBe(
      "scrml-9.9.9-test.42",
    );
  });

  test("fallback values still match the /^scrml-.+$/ format invariant", () => {
    // Defense-in-depth: the fallback sentinel itself MUST satisfy the
    // format invariant asserted in §2. If a future refactor changes
    // COMPILER_IDENTITY_FALLBACK to a value that does not match
    // `/^scrml-.+$/`, this test surfaces the regression.
    const missingPath = join(tmpRoot, "still-missing.json");
    expect(_computeCompilerIdentityFromPath(missingPath)).toMatch(
      /^scrml-.+$/,
    );
  });
});
