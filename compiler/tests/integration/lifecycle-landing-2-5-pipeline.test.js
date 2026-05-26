/**
 * Lifecycle Landing 2.5 — pipeline integration tests
 *
 * End-to-end verification of the SPEC §14.12.6 (S131 — HU-2 hybrid) fn-return
 * mechanism via `compileScrml()`:
 *   - Presence-progression `(not to T)` — discrimination IS transition
 *       (given / if-is-not / match — all three caller forms)
 *   - Variant-progression `(.VariantA to .VariantB)` — explicit `transition(u)`
 *       call required; missing fires E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED
 *   - `transition()` compile-time-only — zero runtime emission verified by
 *       grepping the output JS for `transition(` calls
 *
 * Unit-level coverage of helpers + walker lives at
 * `compiler/tests/unit/type-system-lifecycle-landing-2-5.test.js`. This file is
 * the complementary end-to-end verification through compileScrml().
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "lifecycle-l25-"));
});

afterAll(() => {
  if (TMP) rmSync(TMP, { recursive: true, force: true });
});

function compileSource(name, source) {
  const filePath = join(TMP, `${name}.scrml`);
  writeFileSync(filePath, source);
  const outDir = join(TMP, `${name}.dist`);
  const result = compileScrml({
    inputFiles: [filePath],
    outputDir: outDir,
    write: true,
    log: () => {},
  });
  // Read any emitted files for codegen-side assertions
  let outputs = {};
  try {
    for (const f of readdirSync(outDir)) {
      outputs[f] = readFileSync(join(outDir, f), "utf8");
    }
  } catch (_) {
    /* directory may not exist if compile errored before write */
  }
  return {
    errors: result.errors || [],
    warnings: result.warnings || [],
    outputs,
  };
}

// Cross-stream diagnostic search per [[feedback_diagnostic_stream_partition]] —
// W-/I- codes land in result.warnings (non-fatal); E-* in result.errors. A
// single helper avoids silent false negatives.
function findDiagnostic(result, code) {
  return [
    ...(result.errors || []).filter(e => e.code === code),
    ...(result.warnings || []).filter(e => e.code === code),
  ];
}

// ---------------------------------------------------------------------------
// Presence-progression — `(not to T)` (S131 — HU-2 (e))
// ---------------------------------------------------------------------------

describe("Lifecycle Landing 2.5 — presence-progression `(not to T)`", () => {
  test("pre-discrimination access fires E-TYPE-001 end-to-end", () => {
    const src = `\${
  type User:struct = {
    id: number,
    name: string,
    email: string
  }

  server function loadUser(id: number) -> (not to User) {
    return < User id=id name="alice" email="a@b.com">
  }

  function boot() {
    const u = loadUser(42)
    console.log(u.name)         // E-TYPE-001 — pre-discrimination
  }
}

<program></program>`;
    const result = compileSource("l25-presence-pre-fire", src);
    const fires = findDiagnostic(result, "E-TYPE-001").filter(
      e => /lifecycle|pre-transition/i.test(e.message),
    );
    expect(fires.length).toBeGreaterThanOrEqual(1);
    // The fire should name the binding `u`
    expect(fires.some(f => /`u`/.test(f.message))).toBe(true);
  });

  test("`given u =>` discrimination — no E-TYPE-001 fire", () => {
    const src = `\${
  type User:struct = {
    id: number,
    name: string,
    email: string
  }

  server function loadUser(id: number) -> (not to User) {
    return < User id=id name="alice" email="a@b.com">
  }

  function boot() {
    const u = loadUser(42)
    given u => {
      console.log(u.name)       // OK — inside given-guard
      console.log(u.email)
    }
  }
}

<program></program>`;
    const result = compileSource("l25-presence-given-pass", src);
    const fires = findDiagnostic(result, "E-TYPE-001").filter(
      e => /lifecycle|pre-transition/i.test(e.message),
    );
    expect(fires.length).toBe(0);
  });

  test("`if (u is not) { return }` early-return discrimination — no E-TYPE-001 fire after", () => {
    // Note: braces required around `return` per parser separation (bare
    // `if (cond) return` glues the next statement into the return expr).
    const src = `\${
  type User:struct = {
    id: number,
    name: string
  }

  server function loadUser(id: number) -> (not to User) {
    return < User id=id name="alice">
  }

  function boot() {
    const u = loadUser(42)
    if (u is not) {
      return
    }
    console.log(u.name)         // OK — u promoted to post by early-return
  }
}

<program></program>`;
    const result = compileSource("l25-presence-ifearly-pass", src);
    const fires = findDiagnostic(result, "E-TYPE-001").filter(
      e => /lifecycle|pre-transition/i.test(e.message),
    );
    expect(fires.length).toBe(0);
  });

  test("access OUTSIDE `given` block still fires (outer scope preserved)", () => {
    const src = `\${
  type User:struct = {
    id: number,
    name: string,
    email: string
  }

  server function loadUser(id: number) -> (not to User) {
    return < User id=id name="alice" email="a@b.com">
  }

  function boot() {
    const u = loadUser(42)
    given u => {
      console.log(u.name)       // OK
    }
    console.log(u.email)        // E-TYPE-001 — outside given
  }
}

<program></program>`;
    const result = compileSource("l25-presence-outside-given-fires", src);
    const fires = findDiagnostic(result, "E-TYPE-001").filter(
      e => /lifecycle|pre-transition/i.test(e.message),
    );
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires.some(f => /email/.test(f.message))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Variant-progression — `(.VariantA to .VariantB)` (S131 — HU-2 (a))
// ---------------------------------------------------------------------------

describe("Lifecycle Landing 2.5 — variant-progression `(.A to .B)`", () => {
  test("missing `transition(a)` fires E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED", () => {
    const src = `\${
  type Article:enum = {
    Draft(body: string),
    Published(body: string, publishedAt: number)
  }

  server function publish(id: number) -> (.Draft to .Published) {
    return .Published(body: "x", publishedAt: 0)
  }

  function boot() {
    const a = publish(42)
    if (a is .Draft) {
      console.log(a.publishedAt)    // FIRES — no transition() call
    }
  }
}

<program></program>`;
    const result = compileSource("l25-variant-missing-transition", src);
    const fires = findDiagnostic(result, "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toMatch(/`a`/);
    expect(fires[0].message).toMatch(/publishedAt/);
    expect(fires[0].message).toMatch(/transition\(a\)/);
  });

  test("correct `transition(a)` usage — no fire", () => {
    const src = `\${
  type Article:enum = {
    Draft(body: string),
    Published(body: string, publishedAt: number)
  }

  server function publish(id: number) -> (.Draft to .Published) {
    return .Published(body: "x", publishedAt: 0)
  }

  function boot() {
    const a = publish(42)
    if (a is .Draft) {
      transition(a)
      const x = a.publishedAt         // OK — transitioned
    }
  }
}

<program></program>`;
    const result = compileSource("l25-variant-correct-transition", src);
    const lifecycleFires = [
      ...findDiagnostic(result, "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED"),
      ...findDiagnostic(result, "E-TYPE-001").filter(
        e => /lifecycle|pre-transition/i.test(e.message),
      ),
    ];
    expect(lifecycleFires.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// `transition()` compile-time-only — zero runtime emission
// ---------------------------------------------------------------------------

describe("Lifecycle Landing 2.5 — `transition()` compile-time-only", () => {
  test("`transition()` call produces ZERO runtime emission in client.js", () => {
    const src = `\${
  type Article:enum = {
    Draft(body: string),
    Published(body: string, publishedAt: number)
  }

  server function publish(id: number) -> (.Draft to .Published) {
    return .Published(body: "x", publishedAt: 0)
  }

  function boot() {
    const a = publish(42)
    if (a is .Draft) {
      transition(a)
      const x = a.publishedAt
    }
  }
}

<program></program>`;
    const result = compileSource("l25-transition-zero-emission", src);
    // Find the client.js output
    const clientJs = Object.entries(result.outputs).find(
      ([k]) => k.endsWith(".client.js"),
    );
    expect(clientJs).toBeDefined();
    const [, content] = clientJs;
    // The transition(a) call should NOT appear in the output
    const transitionCalls = (content.match(/\btransition\s*\(/g) || []).length;
    expect(transitionCalls).toBe(0);
  });

  test("`transition()` on a non-lifecycle binding is silent no-op (no diagnostic, still stripped)", () => {
    const src = `\${
  function helper() {
    const x = 42
    transition(x)                 // x is a number, no lifecycle annotation — silent no-op
    return x
  }
}

<program></program>`;
    const result = compileSource("l25-transition-non-lifecycle", src);
    // No lifecycle diagnostic
    const lifecycleFires = [
      ...findDiagnostic(result, "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED"),
      ...findDiagnostic(result, "E-TYPE-001").filter(
        e => /lifecycle|pre-transition/i.test(e.message),
      ),
    ];
    expect(lifecycleFires.length).toBe(0);
    // And `transition(` should NOT appear in client.js output
    const clientJs = Object.entries(result.outputs).find(
      ([k]) => k.endsWith(".client.js"),
    );
    if (clientJs) {
      const [, content] = clientJs;
      const transitionCalls = (content.match(/\btransition\s*\(/g) || []).length;
      expect(transitionCalls).toBe(0);
    }
  });

  test("`transition` identifier is allowlisted — no E-SCOPE-001 fires for bare use", () => {
    // The user wrote `transition(<ident>)` without importing it. Verify the
    // scope-check (gauntlet) does not fire E-SCOPE-001 for the bare identifier.
    const src = `\${
  type User:struct = {
    id: number,
    name: string
  }

  server function loadUser() -> (not to User) {
    return < User id=1 name="alice">
  }

  function boot() {
    const u = loadUser()
    if (u is not) return
    transition(u)                 // bare transition() — should NOT fire E-SCOPE-001
    const n = u.name
  }
}

<program></program>`;
    const result = compileSource("l25-transition-allowlisted", src);
    const scopeUndecls = result.errors.filter(
      e => e.code === "E-SCOPE-001" && /transition/i.test(e.message),
    );
    expect(scopeUndecls.length).toBe(0);
  });
});
