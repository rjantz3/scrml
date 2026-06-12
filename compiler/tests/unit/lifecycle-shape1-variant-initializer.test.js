/**
 * S184 — Shape-1 cell variant-progression lifecycle INITIALIZER resolution
 * (change-id: shape1-variant-lifecycle-initializer-2026-06-11; option (i) INFER).
 *
 * A Shape-1 reactive cell with a VARIANT-progression lifecycle annotation
 * `<status>: (.A to .B) = .A` (or the bare `(A to B)` form) names the enum
 * VARIANTS but not the enum itself. Before this fix:
 *   - the `= .Variant` initializer fired a spurious E-VARIANT-AMBIGUOUS (B20
 *     bare-variant inference had no enum context — the lifecycle annotation
 *     `(.A to .B)` resolves to `asIs` via resolveTypeExpr), AND
 *   - the BARE annotation form `(Idle to Done)` additionally mis-classified the
 *     post-variant `Done` as a TYPE name → E-TYPE-UNKNOWN-NAME.
 * The lifecycle ANNOTATION + TRACKING already worked (a no-initializer cell was
 * clean) — only the initializer + bare-annotation-variant resolution was broken.
 *
 * Per the S184 user ruling (option (i) INFER), the enum is inferred from the
 * annotation's variant NAMES: the UNIQUE enum whose variant set contains BOTH
 * the pre and post variant of `(.A to .B)`. That inferred enum resolves both the
 * bare-annotation variants and the `.Variant` initializer.
 *
 * Disposition:
 *   - exactly one enum contains {pre, post} → resolve (clean)
 *   - two+ enums contain {pre, post}        → E-VARIANT-AMBIGUOUS (genuine)
 *   - no enum contains {pre, post}          → E-VARIANT-AMBIGUOUS (no context)
 *
 * Cross-stream diagnostic helper (S92): a W-/I- code lands in result.warnings,
 * an E- code in result.errors — assertions search BOTH streams via `allDiag`.
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let TMP;
function setup() {
  if (!TMP) TMP = mkdtempSync(join(tmpdir(), "lifecycle-variant-init-"));
  return TMP;
}

function compileSource(name, source) {
  const dir = setup();
  const filePath = join(dir, `${name}.scrml`);
  writeFileSync(filePath, source);
  const result = compileScrml({
    inputFiles: [filePath],
    outputDir: join(dir, `${name}.dist`),
    write: false,
    log: () => {},
  });
  return {
    errors: result.errors || [],
    warnings: result.warnings || [],
  };
}

// S92 cross-stream helper — a diagnostic code may land in EITHER stream
// (E- → errors, W-/I- → warnings). Always search both.
function allDiag(result) {
  return [...(result.errors || []), ...(result.warnings || [])];
}
function countCode(result, code) {
  return allDiag(result).filter((d) => d.code === code).length;
}

// ---------------------------------------------------------------------------
// Core: bare + dotted variant-progression initializer resolves clean
// ---------------------------------------------------------------------------

describe("S184 — Shape-1 variant-lifecycle initializer (option (i) INFER)", () => {
  test("Test 1 — DOTTED `(.Idle to .Done) = .Idle`: no E-VARIANT-AMBIGUOUS / E-TYPE-UNKNOWN-NAME", () => {
    const src = `type Phase:enum = { Idle, Active, Done }

<status>: (.Idle to .Done) = .Idle

\${
    @status.foo
}`;
    const result = compileSource("dotted-init", src);
    expect(countCode(result, "E-VARIANT-AMBIGUOUS")).toBe(0);
    expect(countCode(result, "E-TYPE-UNKNOWN-NAME")).toBe(0);
    // The pre-transition read `@status.foo` is a lifecycle violation — the
    // tracker still fires E-TYPE-001 (proves tracking is intact WITH the init).
    expect(countCode(result, "E-TYPE-001")).toBeGreaterThanOrEqual(1);
  });

  test("Test 2 — BARE `(Idle to Done) = .Idle`: no E-VARIANT-AMBIGUOUS / E-TYPE-UNKNOWN-NAME", () => {
    const src = `type Phase:enum = { Idle, Active, Done }

<status>: (Idle to Done) = .Idle

\${
    @status.foo
}`;
    const result = compileSource("bare-init", src);
    expect(countCode(result, "E-VARIANT-AMBIGUOUS")).toBe(0);
    expect(countCode(result, "E-TYPE-UNKNOWN-NAME")).toBe(0);
    expect(countCode(result, "E-TYPE-001")).toBeGreaterThanOrEqual(1);
  });

  test("Test 3 — QUALIFIED `(Phase.Idle to Phase.Done) = .Idle`: clean", () => {
    const src = `type Phase:enum = { Idle, Active, Done }

<status>: (Phase.Idle to Phase.Done) = .Idle

\${
    @status.foo
}`;
    const result = compileSource("qualified-init", src);
    expect(countCode(result, "E-VARIANT-AMBIGUOUS")).toBe(0);
    expect(countCode(result, "E-TYPE-UNKNOWN-NAME")).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Tracking is intact end-to-end WITH the initializer present
  // -------------------------------------------------------------------------

  test("Test 4 — DOTTED init + discrim + transition + post-read → clean (tracking works)", () => {
    const src = `type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }

<phase>: (.Draft to .Published) = .Draft

\${
    if (@phase is .Draft) {
        transition(@phase)
        @phase.publishedAt
    }
}`;
    const result = compileSource("dotted-discrim-transition", src);
    expect(countCode(result, "E-VARIANT-AMBIGUOUS")).toBe(0);
    expect(countCode(result, "E-TYPE-UNKNOWN-NAME")).toBe(0);
    expect(countCode(result, "E-TYPE-001")).toBe(0);
    expect(countCode(result, "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED")).toBe(0);
  });

  test("Test 5 — BARE init + discrim + transition + post-read → clean", () => {
    const src = `type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }

<phase>: (Draft to Published) = .Draft

\${
    if (@phase is .Draft) {
        transition(@phase)
        @phase.publishedAt
    }
}`;
    const result = compileSource("bare-discrim-transition", src);
    expect(countCode(result, "E-VARIANT-AMBIGUOUS")).toBe(0);
    expect(countCode(result, "E-TYPE-UNKNOWN-NAME")).toBe(0);
    expect(countCode(result, "E-TYPE-001")).toBe(0);
    expect(countCode(result, "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED")).toBe(0);
  });

  test("Test 6 — DOTTED init, discrim but no transition() → E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED", () => {
    const src = `type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }

<phase>: (.Draft to .Published) = .Draft

\${
    if (@phase is .Draft) {
        @phase.publishedAt
    }
}`;
    const result = compileSource("dotted-no-transition", src);
    expect(countCode(result, "E-VARIANT-AMBIGUOUS")).toBe(0);
    expect(countCode(result, "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED")).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // Disposition: genuine ambiguity + no-match
  // -------------------------------------------------------------------------

  test("Test 7 — GENUINE AMBIGUITY: two enums each containing {Idle, Done} → E-VARIANT-AMBIGUOUS", () => {
    const src = `type Phase:enum = { Idle, Active, Done }
type Other:enum = { Idle, Done, Pending }

<status>: (.Idle to .Done) = .Idle

\${
    @status.foo
}`;
    const result = compileSource("ambiguous-two-enums", src);
    expect(countCode(result, "E-VARIANT-AMBIGUOUS")).toBeGreaterThanOrEqual(1);
  });

  test("Test 8 — NO MATCH: variants in no enum → E-VARIANT-AMBIGUOUS (no context)", () => {
    const src = `type Phase:enum = { Idle, Active, Done }

<status>: (.Zorp to .Florp) = .Zorp

\${
    @status.foo
}`;
    const result = compileSource("no-match", src);
    expect(countCode(result, "E-VARIANT-AMBIGUOUS")).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // Regression: no-init annotation, presence-progression, presence-bad-type
  // -------------------------------------------------------------------------

  test("Test 9 — REGRESSION: no-init `(.Idle to .Done)` cell still clean (annotation + tracking)", () => {
    const src = `type Phase:enum = { Idle, Active, Done }

<status>: (.Idle to .Done)

\${
    @status.foo
}`;
    const result = compileSource("noinit", src);
    expect(countCode(result, "E-VARIANT-AMBIGUOUS")).toBe(0);
    expect(countCode(result, "E-TYPE-UNKNOWN-NAME")).toBe(0);
    // No-init pre-read still fires lifecycle E-TYPE-001 (tracking unchanged).
    expect(countCode(result, "E-TYPE-001")).toBeGreaterThanOrEqual(1);
  });

  test("Test 10 — REGRESSION: presence-progression `(not to User)` cell unchanged", () => {
    const src = `type User:struct = { id: number, name: string }

<state>: (not to User) = not

\${
    @state.name
}`;
    const result = compileSource("presence-good", src);
    expect(countCode(result, "E-VARIANT-AMBIGUOUS")).toBe(0);
    expect(countCode(result, "E-TYPE-UNKNOWN-NAME")).toBe(0);
    // Pre-transition read fires E-TYPE-001 (presence tracking unchanged).
    expect(countCode(result, "E-TYPE-001")).toBeGreaterThanOrEqual(1);
  });

  test("Test 11 — REGRESSION: presence-progression with an UNDEFINED post-type still fires E-TYPE-UNKNOWN-NAME", () => {
    // `(not to Frobnicate)` is presence-progression (pre-expr is `not`); the
    // post-expr Frobnicate is a REAL type position and must still RED-fire.
    const src = `<state>: (not to Frobnicate) = not

\${
    @state.foo
}`;
    const result = compileSource("presence-bad-type", src);
    expect(countCode(result, "E-TYPE-UNKNOWN-NAME")).toBeGreaterThanOrEqual(1);
  });

  test("Test 12 — REGRESSION: presence-progression write-then-read passes (no fire)", () => {
    const src = `type User:struct = { id: number, name: string }

<state>: (not to User) = not

\${
    @state = { id: 1, name: "Alice" }
}
\${
    @state.name
}`;
    const result = compileSource("presence-write-read", src);
    expect(countCode(result, "E-TYPE-001")).toBe(0);
    expect(countCode(result, "E-VARIANT-AMBIGUOUS")).toBe(0);
  });

  // -------------------------------------------------------------------------
  // PRIMER §14.12.3 / SPEC §8227 example works as-written
  // -------------------------------------------------------------------------

  test("Test 13 — PRIMER §14.12.3 / SPEC §8227 example `(Idle to Active) = .Idle` compiles clean", () => {
    // The enum is named `Idle` (containing Idle/Active) — the documented example
    // form. Option (i) makes the doc correct as-written: no E-TYPE-UNKNOWN-NAME,
    // no E-VARIANT-AMBIGUOUS.
    const src = `type Idle:enum = { Idle, Active }

<status>: (Idle to Active) = .Idle

<div>\${@status}</div>`;
    const result = compileSource("primer-as-written", src);
    expect(countCode(result, "E-TYPE-UNKNOWN-NAME")).toBe(0);
    expect(countCode(result, "E-VARIANT-AMBIGUOUS")).toBe(0);
  });
});
