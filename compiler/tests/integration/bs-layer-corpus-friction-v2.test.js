/**
 * BS-layer corpus-friction v2 regression tests (S94+).
 *
 * Each test is a minimal repro for the three residual BS-batch edge cases
 * surfaced in `docs/changes/canonical-examples-sweep/DEFERRED.md` —
 * shapes that the S93 BS-batch v1 fix did NOT close because they sit at
 * adjacent surfaces (component-def body retokenization + orphan-brace
 * comment extraction):
 *
 *   Shape #12 — `const Name = <markup>` with nested `${children}` /
 *               `${render fn()}` interpolations inside the markup body.
 *               Pre-fix: E-COMPONENT-031 fires on every use-site because
 *               the Bug 2 fix's text+markup pair synth loses BS BLOCK_REF
 *               info for the inner logic blocks; tokenizeLogic produces
 *               `$ { children }` (space-separated) and parseComponentBody's
 *               `normalizeTokenizedRaw` did not collapse `$ {` back to
 *               `${`, so the inner `${children}` slot marker is invisible
 *               to component-expander.
 *
 *   Shape #19 — `function f(lin x: T) { /* comment * / return `${x}` }`
 *               at <program> direct-child level. Pre-fix: BS-layer's
 *               `//` line-comment extractor (block-splitter.js:613)
 *               fires INSIDE the function body's orphan-brace context,
 *               splitting the function body across the comment. The
 *               BARE_DECL_RE auto-lift only wraps the first text fragment,
 *               leaving the rest of the body + closing `}` orphaned as
 *               program-body siblings. Result: E-SCOPE-001 / E-LIN-001
 *               on body-local identifiers.
 *
 *   Shape #20 — `server function handle(req, resolve) { /* comment * /
 *               return resolve(req) }` at <program> direct-child level.
 *               Same root cause as Shape #19 — no template literal or
 *               `lin` involved; just multi-line `server function` body
 *               containing a `//` comment. Pre-fix: E-PARSE-001 on the
 *               body's closing `}` + E-SCOPE-001 on body-local idents.
 *
 * Bugs filed: `docs/changes/canonical-examples-sweep/DEFERRED.md`
 * "S93 follow-up — 3 residual BS-batch edge cases" section.
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { writeFileSync, mkdirSync, rmSync, mkdtempSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";

function compileSrc(srcName, src) {
  const TMP = mkdtempSync(join(tmpdir(), "bs-bug-v2-"));
  const path = join(TMP, srcName);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, src);
  const result = compileScrml({
    inputFiles: [path],
    outputDir: join(TMP, "out"),
    write: false,
    gather: false,
    log: () => {},
  });
  try {
    rmSync(TMP, { recursive: true, force: true });
  } catch {}
  return result;
}

function diagCodes(result) {
  const codes = [];
  for (const e of result.errors ?? []) codes.push(e.code);
  for (const w of result.warnings ?? []) codes.push(w.code);
  return codes;
}

function fatalErrors(result) {
  return (result.errors ?? []).filter(e => e.severity === "error" || !e.severity);
}

// ---------------------------------------------------------------------------
// Shape #12 — component-def body with ${children} / ${render fn()} slots
// ---------------------------------------------------------------------------

describe("Shape #12 — `const Name = <markup>` with nested ${children} slot", () => {
  test("`${children}` inside component-def markup body at <program> direct-child is recognized as a children-slot (no E-COMPONENT-031)", () => {
    const result = compileSrc("shape12.scrml", `<program>
  const Card = <div class="card" props={ header: snippet, body: snippet }>
    \${children}
    <div class="card__header">\${render header()}</>
    <div class="card__body">\${render body()}</>
  </>

  <div class="app">
    <Card>
      <h2 slot="header">Welcome</>
      <p slot="body">Hello</>
    </>
  </>
</program>
`);
    expect(diagCodes(result)).not.toContain("E-COMPONENT-031");
    expect(diagCodes(result)).not.toContain("E-COMPONENT-020");
    expect(diagCodes(result)).not.toContain("E-COMPONENT-035");
    expect(fatalErrors(result)).toEqual([]);
  });

  test("`${render name()}` slot-render markers inside component-def markup body resolve their slots", () => {
    // Variant: component-def with render slots + ${children} spread (handles
    // whitespace and unslotted markup). Pre-fix the `${render header()}` etc.
    // were tokenized to `$ { render header ( ) }` and normalizeTokenizedRaw
    // did not collapse `$ {` → `${`, so component-expander did not see the
    // render-slot markers; the children-spread was also lost.
    //
    // Asserts that the component compiles clean (slot wiring works). Distinct
    // from the first test by exercising render-slots specifically (rather
    // than ${children} as the primary slot).
    const result = compileSrc("shape12b.scrml", `<program>
  const Card = <div class="card" props={ header: snippet, body: snippet }>
    \${children}
    <header>\${render header()}</>
    <main>\${render body()}</>
  </>

  <div>
    <Card>
      <h2 slot="header">Hi</>
      <p slot="body">Hello</>
    </>
  </>
</program>
`);
    expect(diagCodes(result)).not.toContain("E-COMPONENT-031");
    expect(diagCodes(result)).not.toContain("E-COMPONENT-020");
    expect(diagCodes(result)).not.toContain("E-COMPONENT-035");
    expect(fatalErrors(result)).toEqual([]);
  });

  test("multiple component-def bodies with ${children} at <program> direct-child all resolve slots", () => {
    // Multi-component sibling shape — ensures the Bug 2 + normalize fix
    // doesn't disturb registration of additional component-defs at the same
    // <program> level.
    const result = compileSrc("shape12c.scrml", `<program>
  const Header = <header class="hdr" props={ title: string }>
    <h1>\${title}</>
    \${children}
  </>

  const Body = <main class="bdy" props={}>
    \${children}
  </>

  <div>
    <Header title="X"><span>extra</></Header>
    <Body><p>body content</></Body>
  </>
</program>
`);
    expect(diagCodes(result)).not.toContain("E-COMPONENT-031");
    expect(diagCodes(result)).not.toContain("E-COMPONENT-020");
    expect(fatalErrors(result)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Shape #19 — function body with template-literal + `lin` parameter + comment
// ---------------------------------------------------------------------------

describe("Shape #19 — function body with `//` comments + template-literal interpolation at <program> direct-child", () => {
  test("`//` comment inside function body with template-literal ${ident} does NOT split the function body", () => {
    // The combination that triggered the bug:
    //   1. function declared at <program> direct-child (orphan-brace lift)
    //   2. body contains a `//` line comment
    //   3. body uses template-literal `${ident}` interpolation
    //
    // Pre-fix: BS-layer's `//` comment extractor split the body text into
    // [text-before-comment, comment-block, text-after-comment]. The
    // BARE_DECL_RE auto-lift only wrapped the first text in ${...}; the
    // closing `}` and `return` ended up as program-body siblings; the body-
    // local identifiers (`ticket`) fell out of scope.
    const result = compileSrc("shape19.scrml", `<program>
  <result> = ""

  function redeem(lin ticket: string, username: string) {
    // a comment inside the body
    return \`Redeemed ticket=\${ticket} for user=\${username}\`
  }

  function login() {
    lin t = "abc"
    @result = redeem(t, "user")
  }

  <div>\${@result}</>
</program>
`);
    expect(diagCodes(result)).not.toContain("E-SCOPE-001");
    expect(diagCodes(result)).not.toContain("E-LIN-001");
    expect(diagCodes(result)).not.toContain("E-PARSE-001");
    expect(fatalErrors(result)).toEqual([]);
  });

  test("multiple `//` comments inside function body with `lin` parameter do not break scope tracking", () => {
    const result = compileSrc("shape19b.scrml", `<program>
  <result> = ""

  function consume(lin token: string) {
    // first comment
    const upper = token.toUpperCase()
    // second comment
    return \`token=\${upper}\`
  }

  function caller() {
    lin t = "abc"
    @result = consume(t)
  }

  <div>\${@result}</>
</program>
`);
    expect(diagCodes(result)).not.toContain("E-SCOPE-001");
    expect(diagCodes(result)).not.toContain("E-LIN-001");
    expect(diagCodes(result)).not.toContain("E-PARSE-001");
    expect(fatalErrors(result)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Shape #20 — multi-line `server function` body with `//` comments
// ---------------------------------------------------------------------------

describe("Shape #20 — multi-line `server function` body with `//` comments at <program> direct-child", () => {
  test("`//` comment inside `server function` body does NOT fire E-PARSE-001 / E-SCOPE-001", () => {
    // Sibling shape to Shape #19 — same root cause (orphan-brace comment
    // extraction) but with `server function` keyword and no template
    // literal involvement. Surfaced from examples/20-middleware.scrml's
    // handle() middleware function.
    const result = compileSrc("shape20.scrml", `<program>
  server function handle(request, resolve) {
    const reqId = "req-123"
    // resolve(request) runs the rest of the pipeline
    const response = resolve(request)
    return response
  }

  <count> = 0
  function bump() { @count = @count + 1 }

  <div>
    <p>Count: \${@count}</p>
    <button onclick=bump()>Bump</button>
  </div>
</program>
`);
    expect(diagCodes(result)).not.toContain("E-PARSE-001");
    expect(diagCodes(result)).not.toContain("E-SCOPE-001");
    expect(fatalErrors(result)).toEqual([]);
  });

  test("multiple `//` comments inside plain `function` body at <program> direct-child compile clean", () => {
    // Generalized variant — same surface, plain function instead of
    // server function. Confirms the fix is keyword-agnostic.
    const result = compileSrc("shape20b.scrml", `<program>
  <result> = 0

  function compute(x: number) {
    // step 1: square the input
    const squared = x * x
    // step 2: double the squared value
    const doubled = squared * 2
    return doubled
  }

  function caller() {
    @result = compute(3)
  }

  <div onclick=caller()>\${@result}</>
</program>
`);
    expect(diagCodes(result)).not.toContain("E-PARSE-001");
    expect(diagCodes(result)).not.toContain("E-SCOPE-001");
    expect(fatalErrors(result)).toEqual([]);
  });

  test("`//` comment followed by template-literal in `server function` body works", () => {
    // Hybrid: `server function` (Shape #20) + template literal (Shape #19
    // sibling). Confirms both fixes compose correctly.
    const result = compileSrc("shape20c.scrml", `<program>
  <result> = ""

  server function fmt(name) {
    // template-literal interpolation should work after a comment
    return \`hello, \${name}\`
  }

  function caller() {
    @result = fmt("world")
  }

  <div onclick=caller()>\${@result}</>
</program>
`);
    expect(diagCodes(result)).not.toContain("E-PARSE-001");
    expect(diagCodes(result)).not.toContain("E-SCOPE-001");
    expect(fatalErrors(result)).toEqual([]);
  });
});
