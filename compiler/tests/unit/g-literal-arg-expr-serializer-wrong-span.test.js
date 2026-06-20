/**
 * g-literal-arg-expr-serializer-wrong-span.test.js
 *
 * Bug (HIGH): a regex/string LITERAL in method-call-argument position got the
 * WRONG source span when lowered to JS. Path-sensitive: SILENT for regex
 * (re-serialized the whole enclosing expression), LOUD for a string in an
 * `on mount` body (lost its quotes -> E-SCOPE-001 on the now-bare "identifiers").
 *
 * The brief assumed ONE root; investigation found TWO distinct loci:
 *
 *   Root A (expression-parser.ts esTreeToExprNode `Literal` case):
 *     ESTree represents a regex literal as a `Literal` whose `.value` is a
 *     RegExp OBJECT (typeof "object"). It fell past the number/boolean/null/
 *     string arms to the BigInt fallback `makeEscapeHatch(node, span,
 *     rawSource ?? ...)`, which carried the OUTER rawSource (the whole enclosing
 *     expression). For `s.split(/[^a-z0-9]+/)` the `.split()` argument became
 *     the re-serialized whole expression. Fix: a dedicated regex branch carries
 *     the literal's OWN source (`node.raw`); the BigInt fallback now also
 *     prefers `raw` over `rawSource`.
 *
 *   Root B (ast-builder.js collectBracedBody):
 *     The lifecycle braced-body collector pushed `lastTok.text` raw. A STRING
 *     token's `.text` is the content BETWEEN delimiters (quotes stripped by the
 *     tokenizer). So `on mount { f("a-b-c") }` reassembled as `f(a-b-c)` and the
 *     re-parse read it as the subtraction `f(a - b - c)`. Fix: re-quote STRING
 *     tokens, mirroring collectExpr / collectLiftExpr.
 *
 * PROOF the loci differ: a string arg in an onclick handler (collectExpr path)
 * and a regex arg in a fn body (Root A path) each isolate one root.
 *
 * VALUE-asserting (R26 / S138): compiles real .scrml end-to-end via
 * compileScrml and asserts the emitted client.js shape; synthetic ASTs would
 * bypass the parser/tokenizer loci that ARE the bug.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/g-literal-arg-span");
const FIXTURE_OUTPUT = join(FIXTURE_DIR, "dist");

function fix(name, src) {
  const path = join(FIXTURE_DIR, name);
  writeFileSync(path, src);
  return path;
}

let regexBodyFx, strMountFx, regexMountFx, strClickFx;

beforeAll(() => {
  mkdirSync(FIXTURE_DIR, { recursive: true });

  // Root A — regex literal in a method-call arg inside a fn body (PA reproducer
  // tmp-regex.scrml).
  regexBodyFx = fix("regex-body.scrml", `<program>
\${
  type Row:struct = { tok: text }
  <rows>: Row[] = []
  <raw> = "a b c"
  function splitLiteral(s) { return s.split(/[^a-z0-9]+/).map(t => ({ tok: t })) }
  on mount { @rows = splitLiteral(@raw) }
}
<ul><each in=@rows as r key=r.tok><li>\${r.tok}</li></each></ul>
</program>
`);

  // Root B — string literal arg at a CALL SITE inside an `on mount` body.
  strMountFx = fix("str-mount.scrml", `<program>
\${
  type Row:struct = { tok: text }
  <rows>: Row[] = []
  function splitLiteral(s) { return s.split("-").map(t => ({ tok: t })) }
  on mount { @rows = splitLiteral("a-b-c") }
}
<ul><each in=@rows as r key=r.tok><li>\${r.tok}</li></each></ul>
</program>
`);

  // Composition — regex literal at an on-mount call site (both fixes compose).
  regexMountFx = fix("regex-mount.scrml", `<program>
\${
  <out> = ""
  function f(re) { return "x" }
  on mount { @out = f(/[a-z]+/) }
}
<p>\${@out}</p>
</program>
`);

  // Root-B isolation control — a string arg in an onclick handler (collectExpr
  // path) already worked; guards against a regression there.
  strClickFx = fix("str-click.scrml", `<program>
\${
  <out> = ""
  function f(s) { return s }
}
<button onclick=f("a-b-c")>go</button>
<p>\${@out}</p>
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
// §1 — Root A: regex literal in a method-call arg (silent miscompile)
// ---------------------------------------------------------------------------

describe("§1 Root A — regex literal in a method-call argument", () => {
  test("compile succeeds", () => {
    const result = compile(regexBodyFx);
    expect(result.errors).toEqual([]);
  });

  test("the splitLiteral body emits .split(/[^a-z0-9]+/), NOT the re-serialized whole expr", () => {
    const js = compile(regexBodyFx).outputs.get(regexBodyFx).clientJs;
    const fnLine = js.split("\n").find((l) => l.includes("return s.split("));
    expect(fnLine).toBeDefined();
    // POSITIVE: the arg is exactly the regex literal.
    expect(fnLine).toMatch(/s\.split\(\/\[\^a-z0-9\]\+\/\)\.map\(/);
    // BUG ASSERTION: the whole-expr re-serialization signature must be gone.
    expect(fnLine).not.toMatch(/s\.split\(\s*s\s*\.\s*split/);
  });

  test("emitted client.js is parseable", () => {
    const js = compile(regexBodyFx).outputs.get(regexBodyFx).clientJs;
    expect(() => new Function(js)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// §2 — Root B: string literal arg in an on-mount body (loud E-SCOPE-001)
// ---------------------------------------------------------------------------

describe("§2 Root B — string literal arg at an on-mount call site", () => {
  test("compile succeeds (no E-SCOPE-001 on phantom a/b/c idents)", () => {
    const result = compile(strMountFx);
    expect(result.errors).toEqual([]);
  });

  test("the call-site arg keeps its quotes: splitLiteral(\"a-b-c\"), NOT (a - b - c)", () => {
    const js = compile(strMountFx).outputs.get(strMountFx).clientJs;
    expect(js).toMatch(/_scrml_splitLiteral_\d+\("a-b-c"\)/);
    expect(js).not.toMatch(/_scrml_splitLiteral_\d+\(a - b - c\)/);
  });

  test("emitted client.js is parseable", () => {
    const js = compile(strMountFx).outputs.get(strMountFx).clientJs;
    expect(() => new Function(js)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// §3 — composition: regex literal at an on-mount call site
// ---------------------------------------------------------------------------

describe("§3 composition — regex literal at an on-mount call site", () => {
  test("regex arg at on-mount call site survives both fixes", () => {
    const result = compile(regexMountFx);
    expect(result.errors).toEqual([]);
    const js = result.outputs.get(regexMountFx).clientJs;
    expect(js).toMatch(/_scrml_f_\d+\(\/\[a-z\]\+\/\)/);
    expect(() => new Function(js)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// §4 — regression guard: string arg in an onclick handler (collectExpr path)
// ---------------------------------------------------------------------------

describe("§4 regression guard — string arg in an onclick handler", () => {
  test("onclick string arg keeps its quotes (collectExpr path unaffected)", () => {
    const result = compile(strClickFx);
    expect(result.errors).toEqual([]);
    const js = result.outputs.get(strClickFx).clientJs;
    expect(js).toMatch(/_scrml_f_\d+\("a-b-c"\)/);
    expect(js).not.toMatch(/_scrml_f_\d+\(a - b - c\)/);
    expect(() => new Function(js)).not.toThrow();
  });
});
