/**
 * lint-undefined-interpolation.test.js — M-7C-D-12 Track 3 (D-12.3c).
 *
 * Tests for the W-CG-UNDEFINED-INTERPOLATION regression guard lint added in
 * S90 (OQ-5(a) ratified). Validates that:
 *
 *   §1  Scanner detects bare `undefined` JS-keyword usage in compiled output
 *   §2  Scanner exempts the canonical paired-absence-check idiom
 *       (`x !== null && x !== undefined`)
 *   §3  Scanner exempts the environment-detection idiom
 *       (`typeof X !== "undefined"`) via string-literal masking
 *   §4  Scanner exempts comments + string literals + template literals
 *   §5  Scanner masks the embedded runtime block (between
 *       `// --- scrml reactive runtime ---` and `// --- end ...`) — that JS
 *       is hand-written, not emitter output, and tracked by M-7C-D-14.
 *   §6  Integration: real scrml programs that exercise the migrated emitter
 *       paths (init-fallback / fail-no-args / reactive-nested-assign / guarded
 *       expressions / scheduled fn return-init) compile WITHOUT firing the
 *       lint.
 *   §7  Negative integration: a synthetic JS string with the legacy
 *       `?? "undefined"`-style emission pattern triggers the lint.
 *
 * SPEC anchor: §42.5 (Codegen) + §42.8 (Runtime Representation — "Rationale
 * for null over undefined"). Catalog row to be added by Track 4 (D-12.4)
 * pending; see docs/changes/m-7c-d-12-runtime-sentinel-scoping/.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join, resolve } from "path";
import {
  scanForUndefinedInterpolation,
  lintCompiledForUndefined,
} from "../../src/codegen/lint-undefined-interpolation.ts";
import { compileScrml } from "../../src/api.js";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/lint-undefined-interpolation");
const FIXTURE_OUTPUT = join(FIXTURE_DIR, "dist");

beforeAll(() => { mkdirSync(FIXTURE_DIR, { recursive: true }); });
afterAll(() => { rmSync(FIXTURE_DIR, { recursive: true, force: true }); });

function compileSource(source, filename = "lint-undef.scrml") {
  const filePath = resolve(join(FIXTURE_DIR, filename));
  writeFileSync(filePath, source);
  const result = compileScrml({ inputFiles: [filePath], outputDir: FIXTURE_OUTPUT, write: true });
  return result;
}

// ---------------------------------------------------------------------------
// §1 Scanner — fires on bare `undefined` JS-keyword usage
// ---------------------------------------------------------------------------

describe("§1 W-CG-UNDEFINED-INTERPOLATION scanner — fires on bare keyword usage", () => {
  test("let x = undefined; → fires", () => {
    const js = "function f() { let x = undefined; }";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(1);
    expect(findings[0].outputKind).toBe("client");
    expect(findings[0].line).toBe(1);
  });

  test("return undefined → fires", () => {
    const js = "function f() {\n  return undefined;\n}";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(1);
    expect(findings[0].line).toBe(2);
  });

  test("data: undefined → fires", () => {
    const js = "const e = { __scrml_error: true, data: undefined };";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "server");
    expect(findings).toHaveLength(1);
    expect(findings[0].outputKind).toBe("server");
  });

  test("undefined as function arg → fires", () => {
    const js = "doThing(undefined);";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(1);
  });

  test("undefined inside template-literal interpolation → fires", () => {
    const js = "const s = `prefix-${undefined}-suffix`;";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(1);
  });

  test("multi-line: multiple sites produce multiple findings", () => {
    const js = "let x = undefined;\nlet y = 1;\nlet z = undefined;";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(2);
    expect(findings[0].line).toBe(1);
    expect(findings[1].line).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// §2 Scanner — exempts canonical paired-absence-check idiom
// ---------------------------------------------------------------------------

describe("§2 W-CG-UNDEFINED-INTERPOLATION scanner — paired-check exemption", () => {
  test("if (x !== null && x !== undefined) → does NOT fire", () => {
    const js = "if (x !== null && x !== undefined) { go(); }";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(0);
  });

  test("if (x === null || x === undefined) → does NOT fire", () => {
    const js = "if (x === null || x === undefined) { absent(); }";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(0);
  });

  test("if (longIdentifierName !== null && longIdentifierName !== undefined) → does NOT fire", () => {
    const js = "if (longIdentifierName !== null && longIdentifierName !== undefined) { yes(); }";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(0);
  });

  test("multi-variable paired check (§42.5/§42.8) → does NOT fire", () => {
    const js = "if (x !== null && x !== undefined && y !== null && y !== undefined) { go(); }";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(0);
  });

  test("solo !== undefined (no null companion) → DOES fire", () => {
    const js = "if (x !== undefined) doSomething();";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(1);
  });

  test("solo === undefined (no null companion) → DOES fire", () => {
    const js = "if (x === undefined) absent();";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// §3 Scanner — exempts typeof environment-detection idiom (via string masking)
// ---------------------------------------------------------------------------

describe("§3 W-CG-UNDEFINED-INTERPOLATION scanner — typeof exemption", () => {
  test("typeof globalThis !== \"undefined\" → does NOT fire (quoted)", () => {
    const js = "if (typeof globalThis !== \"undefined\") { x(); }";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(0);
  });

  test("typeof process !== \"undefined\" && process.env → does NOT fire", () => {
    const js = "const x = typeof process !== \"undefined\" && process.env?.X === \"1\";";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §4 Scanner — exempts comments + string literals
// ---------------------------------------------------------------------------

describe("§4 W-CG-UNDEFINED-INTERPOLATION scanner — comment + string exemption", () => {
  test("undefined in line comment → does NOT fire", () => {
    const js = "// scrml absence is null, not undefined\nlet x = null;";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(0);
  });

  test("undefined in block comment → does NOT fire", () => {
    const js = "/* undefined here\n   and also undefined here */\nlet x = null;";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(0);
  });

  test("undefined inside double-quoted string → does NOT fire", () => {
    const js = "throw new Error(\"x is undefined\");";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(0);
  });

  test("undefined inside single-quoted string → does NOT fire", () => {
    const js = "console.log('value is undefined now');";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(0);
  });

  test("undefined inside template literal text (not interpolation) → does NOT fire", () => {
    const js = "const s = `the word undefined appears here`;";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §5 Scanner — masks the embedded scrml runtime block
// ---------------------------------------------------------------------------

describe("§5 W-CG-UNDEFINED-INTERPOLATION scanner — runtime-block masking", () => {
  test("undefined inside runtime block is NOT flagged", () => {
    const js =
      "// --- scrml reactive runtime ---\n" +
      "function _scrml_machine_clear_timer(name) {\n" +
      "  const id = _scrml_machine_timers[name];\n" +
      "  if (id !== undefined) { clearTimeout(id); }\n" +
      "}\n" +
      "// --- end scrml reactive runtime ---\n" +
      "// user code below\n" +
      "function userFn() { return null; }";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(0);
  });

  test("undefined OUTSIDE runtime block is still flagged", () => {
    const js =
      "// --- scrml reactive runtime ---\n" +
      "function _scrml_helper(x) { if (x !== undefined) return x; }\n" +
      "// --- end scrml reactive runtime ---\n" +
      "function userFn() { return undefined; }";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    expect(findings).toHaveLength(1);
    expect(findings[0].line).toBe(4);
    expect(findings[0].lineText).toContain("function userFn() { return undefined; }");
  });

  test("Missing end-marker → fail-open (still scan everything)", () => {
    const js =
      "// --- scrml reactive runtime ---\n" +
      "function userFn() { return undefined; }";
    const findings = scanForUndefinedInterpolation(js, "test.scrml", "client");
    // Without end marker, masking falls through and scans the whole input.
    expect(findings).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// §6 Integration — real scrml programs do NOT trigger the lint
// ---------------------------------------------------------------------------

describe("§6 W-CG-UNDEFINED-INTERPOLATION integration — migrated emitter paths produce no warnings", () => {
  test("fail Variant (no args) → no W-CG-UNDEFINED-INTERPOLATION (was data: undefined)", () => {
    const source = `\${
  type E:enum = { Empty }
  function f()! -> E {
    fail E.Empty
  }
}
<p>x</>`;
    const result = compileSource(source, "fail-no-args.scrml");
    const undefLint = (result.errors ?? []).filter(
      (e) => e.code === "W-CG-UNDEFINED-INTERPOLATION",
    );
    expect(undefLint).toHaveLength(0);
  });

  test("let x = \"\" → no W-CG-UNDEFINED-INTERPOLATION (empty string is a defined value, §42.1.1)", () => {
    const source = `\${
  function f() {
    let x = ""
    return x
  }
}
<p>x</>`;
    const result = compileSource(source, "let-emptystr.scrml");
    const undefLint = (result.errors ?? []).filter(
      (e) => e.code === "W-CG-UNDEFINED-INTERPOLATION",
    );
    expect(undefLint).toHaveLength(0);
  });

  test("guarded-expr with empty arm body → no W-CG-UNDEFINED-INTERPOLATION", () => {
    const source = `\${
  type E:enum = { Bad }
  function failable()! -> E { fail E.Bad }
  function consumer() {
    let result = failable() !{ | _ -> { } }
    return result
  }
}
<p>x</>`;
    const result = compileSource(source, "guarded-empty.scrml");
    const undefLint = (result.errors ?? []).filter(
      (e) => e.code === "W-CG-UNDEFINED-INTERPOLATION",
    );
    expect(undefLint).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §7 Negative integration — legacy `?? "undefined"` emission shape fires
// ---------------------------------------------------------------------------

describe("§7 W-CG-UNDEFINED-INTERPOLATION integration — synthetic regression triggers warning", () => {
  test("lintCompiledForUndefined fires on a synthetic JS string with bare undefined", () => {
    const syntheticClientJs =
      "// emitted user code (post-runtime)\n" +
      "function userInit() {\n" +
      "  let x = undefined;\n" +
      "  return x;\n" +
      "}\n";
    const errors = lintCompiledForUndefined("synthetic.scrml", syntheticClientJs, null);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("W-CG-UNDEFINED-INTERPOLATION");
    expect(errors[0].severity).toBe("warning");
    expect(errors[0].message).toContain("W-CG-UNDEFINED-INTERPOLATION");
    expect(errors[0].message).toContain("§42.5");
    expect(errors[0].message).toContain("§42.8");
  });

  test("lintCompiledForUndefined fires separately on client + server", () => {
    const clientJs = "let cx = undefined;";
    const serverJs = "let sx = undefined;";
    const errors = lintCompiledForUndefined("dual.scrml", clientJs, serverJs);
    expect(errors).toHaveLength(2);
    const kinds = errors.map((e) => e.message.match(/compiled (\w+) JS/)?.[1]);
    expect(kinds.sort()).toEqual(["client", "server"]);
  });

  test("lintCompiledForUndefined returns [] when both inputs are clean", () => {
    const clientJs = "let cx = null;\nlet cy = 0;\nlet cz = \"\";";
    const serverJs = "let sx = null;\nfunction noop() { return null; }";
    const errors = lintCompiledForUndefined("clean.scrml", clientJs, serverJs);
    expect(errors).toHaveLength(0);
  });
});
