/**
 * Tests for `scrml migrate --program-shape` Wave 3.5 BUNDLE (S87).
 *
 * Covers the three `${...}` unwrap-path bugs surfaced by Wave 3 RECON-S87
 * (Categories B, C, D):
 *
 *  Bug A — container-aware unwrap. `${...}` blocks inside nested markup
 *          containers (`<db>`, `<ul>`, `<channel>`, etc) must NOT unwrap.
 *          The pre-fix `isTopLevel` heuristic looked backward for the
 *          previous `>` and false-fired when `>` closed a container opener.
 *
 *  Bug B — scope-preservation. `${...}` blocks containing `lin` decls,
 *          embedded `lift <markup>${expr}</>` template literals (which
 *          confuse the brace-tracker), or top-level non-decl control-flow
 *          (`for`, `match`, `while`, `if`, `try`, `do`) must NOT unwrap.
 *
 *  Bug C — match-in-markup post-unwrap. `${...}` blocks containing `//`
 *          line comments OR block comments must NOT unwrap. BS-layer
 *          recognizes those as block-separators outside logic context.
 *
 *  §1  Container-aware: `${...}` inside `<db>` → preserved
 *  §2  Container-aware: `${...}` inside `<ul>` (any markup) → preserved
 *  §3  Container-aware: `${...}` inside `<channel>` → preserved
 *  §4  Container-aware: nested-then-top-level → only top-level unwrapped
 *  §5  Scope-safe: `lin` declaration → preserved
 *  §6  Scope-safe: `lift` keyword → preserved
 *  §7  Scope-safe: top-level `for` loop → preserved
 *  §8  Scope-safe: top-level `match` statement → preserved
 *  §9  Comment-safe: `//` line comment inside → preserved
 *  §10 Comment-safe: block comment inside → preserved
 *  §11 Regression-guard: `${...}` containing only state-decls (no
 *      comments) still unwraps cleanly
 *  §12 Regression-guard: `${...}` containing function decl with `match`
 *      INSIDE function body but no comments still unwraps (function body
 *      survives the brace nesting; `match` is depth>0)
 */

import { test, expect, describe } from "bun:test";
import { applyProgramShapeRewrite } from "../../src/commands/migrate.js";

const ENTRY = { bucket: "entry", evidence: [] };

// ---------------------------------------------------------------------------
// §1  Container-aware — `${...}` inside `<db>` must NOT unwrap
// ---------------------------------------------------------------------------

describe("§1 container-aware: `${...}` inside <db> body is preserved", () => {
  test("Bug A — `${...}` inside `<db>` is left wrapped", () => {
    const src = [
      `<program auth="required">`,
      ``,
      `<db src="contacts.db">`,
      ``,
      `  \${`,
      `    <name> = ""`,
      `    <email> = ""`,
      `  }`,
      ``,
      `  <div/>`,
      `</>`,
      `</program>`,
    ].join("\n");
    const r = applyProgramShapeRewrite(src, ENTRY);
    // The `${...}` is INSIDE `<db>` body — must remain wrapped, no unwrap.
    expect(r.rewritten).toContain("${");
    expect(r.rewritten).toContain("<name>");
    // The `<db>` opener is preserved verbatim.
    expect(r.rewritten).toContain(`<db src="contacts.db">`);
  });

  test("Bug A — `${...}` inside `<db>` with state-decls + functions stays wrapped", () => {
    const src = [
      `<program>`,
      `  <db src="x.db">`,
      `    \${`,
      `      <count> = 0`,
      `      function persistThing(name) {`,
      `        ?{\`INSERT INTO things (name) VALUES (\${name})\`}.run()`,
      `      }`,
      `    }`,
      `    <div/>`,
      `  </db>`,
      `</program>`,
    ].join("\n");
    const r = applyProgramShapeRewrite(src, ENTRY);
    // Block must remain wrapped.
    expect(r.rewritten).toContain("${");
    expect(r.rewritten).toContain("function persistThing");
  });
});

// ---------------------------------------------------------------------------
// §2  Container-aware — `${...}` inside any non-`<program>` markup is preserved
// ---------------------------------------------------------------------------

describe("§2 container-aware: `${...}` inside <ul> / arbitrary markup", () => {
  test("Bug A/B — `${...}` inside `<ul>` is left wrapped", () => {
    const src = [
      `<program>`,
      `  \${ <q> = "" }`,
      `  <ul>`,
      `    \${`,
      `      const q = @q.toLowerCase()`,
      `      for (let p of items) {`,
      `        lift <li>\${p.name}</li>`,
      `      }`,
      `    }`,
      `  </ul>`,
      `</program>`,
    ].join("\n");
    const r = applyProgramShapeRewrite(src, ENTRY);
    // The TOP-LEVEL `${ <q> = "" }` should unwrap.
    expect(r.rewritten).toContain(`<q> = ""`);
    // The `${...}` inside `<ul>` must remain wrapped.
    expect(r.rewritten).toMatch(/<ul>[\s\S]*?\$\{[\s\S]*?for \(let p of items\)/);
  });
});

// ---------------------------------------------------------------------------
// §3  Container-aware — `${...}` inside `<channel>` body is preserved
// ---------------------------------------------------------------------------

describe("§3 container-aware: `${...}` inside <channel> body", () => {
  test("Bug A — `${...}` inside `<channel>` is left wrapped", () => {
    const src = [
      `<program>`,
      `  <channel name="events">`,
      `    \${`,
      `      <messages> = []`,
      `      function pushMessage(m) { @messages = [...@messages, m] }`,
      `    }`,
      `  </channel>`,
      `</program>`,
    ].join("\n");
    const r = applyProgramShapeRewrite(src, ENTRY);
    expect(r.rewritten).toContain("${");
    expect(r.rewritten).toContain("function pushMessage");
  });
});

// ---------------------------------------------------------------------------
// §4  Container-aware — mixed: top-level `${...}` unwraps, nested doesn't
// ---------------------------------------------------------------------------

describe("§4 container-aware: top-level unwraps; nested preserved", () => {
  test("Bug A — top-level `${...}` unwraps even when sibling `<db>` has its own `${...}`", () => {
    const src = [
      `<program>`,
      `  \${`,
      `    <count> = 0`,
      `    <message> = "hello"`,
      `  }`,
      `  <db src="x.db">`,
      `    \${`,
      `      <name> = ""`,
      `    }`,
      `  </db>`,
      `</program>`,
    ].join("\n");
    const r = applyProgramShapeRewrite(src, ENTRY);
    // Top-level `${...}` unwrapped.
    expect(r.rewritten).toMatch(/<count> = 0\s*\n\s*<message>/);
    // Nested `${...}` inside `<db>` preserved.
    expect(r.rewritten).toMatch(/<db[^>]*>[\s\S]*?\$\{[\s\S]*?<name>\s*=\s*""/);
  });
});

// ---------------------------------------------------------------------------
// §5  Scope-safe — `lin` declaration → preserved
// ---------------------------------------------------------------------------

describe("§5 scope-safe: `lin` declaration preserved", () => {
  test("Bug B — `${...}` containing `lin` decl is left wrapped", () => {
    const src = [
      `<program>`,
      `  \${`,
      `    <username> = ""`,
      `    function login() {`,
      `      lin ticket = mintTicket(@username)`,
      `      const message = redeem(ticket)`,
      `      @result = message`,
      `    }`,
      `  }`,
      `  <div/>`,
      `</program>`,
    ].join("\n");
    const r = applyProgramShapeRewrite(src, ENTRY);
    // Must remain wrapped — `lin` scope preservation.
    expect(r.rewritten).toContain("${");
    expect(r.rewritten).toContain("lin ticket");
  });
});

// ---------------------------------------------------------------------------
// §6  Scope-safe — `lift` keyword → preserved
// ---------------------------------------------------------------------------

describe("§6 scope-safe: `lift` keyword preserved", () => {
  test("Bug B — `${...}` containing `lift` is left wrapped (mixed-content signal)", () => {
    const src = [
      `<program>`,
      `  <ul>`,
      `    \${`,
      `      const q = @query`,
      `      for (let p of items) {`,
      `        lift <li>\${p.name}</li>`,
      `      }`,
      `    }`,
      `  </ul>`,
      `</program>`,
    ].join("\n");
    const r = applyProgramShapeRewrite(src, ENTRY);
    // Even with the container-aware fix, the inner content has `lift` —
    // either gate (markup-depth > 0 OR isUnwrapSafe=false) catches it.
    expect(r.rewritten).toContain("lift <li>");
    expect(r.rewritten).toContain("for (let p of items)");
  });
});

// ---------------------------------------------------------------------------
// §7  Scope-safe — top-level `for` → preserved
// ---------------------------------------------------------------------------

describe("§7 scope-safe: top-level `for` loop preserved", () => {
  test("Bug B/C — `${...}` with top-level `for` is left wrapped", () => {
    const src = [
      `<program>`,
      `  \${`,
      `    const items = [1, 2, 3]`,
      `    for (let x of items) {`,
      `      console.log(x)`,
      `    }`,
      `  }`,
      `  <div/>`,
      `</program>`,
    ].join("\n");
    const r = applyProgramShapeRewrite(src, ENTRY);
    expect(r.rewritten).toContain("${");
    expect(r.rewritten).toContain("for (let x of items)");
  });
});

// ---------------------------------------------------------------------------
// §8  Scope-safe — top-level `match` → preserved
// ---------------------------------------------------------------------------

describe("§8 scope-safe: top-level `match` statement preserved", () => {
  test("Bug C — `${...}` with top-level `match` is left wrapped", () => {
    const src = [
      `<program>`,
      `  \${`,
      `    <step> = .Info`,
      `    match @step {`,
      `      .Info => { console.log("info") }`,
      `      .Done => { console.log("done") }`,
      `    }`,
      `  }`,
      `  <div/>`,
      `</program>`,
    ].join("\n");
    const r = applyProgramShapeRewrite(src, ENTRY);
    expect(r.rewritten).toContain("${");
    expect(r.rewritten).toContain("match @step");
  });
});

// ---------------------------------------------------------------------------
// §9  Comment-safe — `//` line comment inside → preserved
// ---------------------------------------------------------------------------

describe("§9 comment-safe: `${...}` with line comments preserved", () => {
  test("Bug C — `${...}` with `//` inside function body is left wrapped", () => {
    // Mirror of example 05 / 09 / 19 / 20 shape.
    const src = [
      `<program>`,
      `  \${`,
      `    <count> = 0`,
      `    function next() {`,
      `      // increment`,
      `      @count = @count + 1`,
      `    }`,
      `  }`,
      `  <div/>`,
      `</program>`,
    ].join("\n");
    const r = applyProgramShapeRewrite(src, ENTRY);
    // Must remain wrapped — BS-layer would split on the `//`.
    expect(r.rewritten).toContain("${");
    expect(r.rewritten).toContain("function next");
    expect(r.rewritten).toContain("// increment");
  });
});

// ---------------------------------------------------------------------------
// §10  Comment-safe — block comment inside → preserved
// ---------------------------------------------------------------------------

describe("§10 comment-safe: `${...}` with block comments preserved", () => {
  test("Bug C — `${...}` with block comment inside function body is left wrapped", () => {
    const src = [
      `<program>`,
      `  \${`,
      `    <count> = 0`,
      `    function next() {`,
      `      /* increment counter */`,
      `      @count = @count + 1`,
      `    }`,
      `  }`,
      `  <div/>`,
      `</program>`,
    ].join("\n");
    const r = applyProgramShapeRewrite(src, ENTRY);
    expect(r.rewritten).toContain("${");
    expect(r.rewritten).toContain("function next");
  });
});

// ---------------------------------------------------------------------------
// §11  Regression-guard — clean state-decls still unwrap
// ---------------------------------------------------------------------------

describe("§11 regression-guard: clean state-decls unwrap normally", () => {
  test("simple state-decls — no comments, no lin, no lift — UNWRAPS", () => {
    const src = [
      `<program title="Demo">`,
      `  \${`,
      `    <count> = 0`,
      `    <message> = "hello"`,
      `  }`,
      `  <div>\${@message}</div>`,
      `</program>`,
    ].join("\n");
    const r = applyProgramShapeRewrite(src, ENTRY);
    expect(r.changed).toBe(true);
    expect(r.action).toBe("REWRITE");
    expect(r.rewritten).toContain(`<count> = 0`);
    expect(r.rewritten).toContain(`<message> = "hello"`);
    // Outer `${...}` stripped.
    expect(r.rewritten).not.toMatch(/\$\{\s*\n\s*<count>/);
  });

  test("function decls without comments — UNWRAPS", () => {
    const src = [
      `<program>`,
      `  \${`,
      `    <count> = 0`,
      `    function inc() { @count = @count + 1 }`,
      `  }`,
      `  <div/>`,
      `</program>`,
    ].join("\n");
    const r = applyProgramShapeRewrite(src, ENTRY);
    expect(r.changed).toBe(true);
    expect(r.action).toBe("REWRITE");
    expect(r.rewritten).toContain("function inc()");
    // Outer wrapper stripped.
    expect(r.rewritten).not.toMatch(/\$\{\s*\n\s*<count>/);
  });
});

// ---------------------------------------------------------------------------
// §12  Regression-guard — function with INNER match (no top-level match) still unwraps
// ---------------------------------------------------------------------------

describe("§12 regression-guard: function-body with inner match (no comments) unwraps", () => {
  test("`match` strictly inside function body (no top-level match, no comments) — UNWRAPS", () => {
    // The `containsTopLevelKeyword` scanner is depth-aware; a `match` strictly
    // inside `function f() { match … }` is at depth>0 and doesn't trigger.
    const src = [
      `<program>`,
      `  \${`,
      `    type Step:enum = { A, B }`,
      `    <step>: Step = .A`,
      `    function next() {`,
      `      match @step {`,
      `        .A => { @step = Step::B }`,
      `        .B => { }`,
      `      }`,
      `    }`,
      `  }`,
      `  <div/>`,
      `</program>`,
    ].join("\n");
    const r = applyProgramShapeRewrite(src, ENTRY);
    expect(r.changed).toBe(true);
    expect(r.action).toBe("REWRITE");
    expect(r.rewritten).toContain("function next()");
    // Outer wrapper stripped.
    expect(r.rewritten).not.toMatch(/\$\{\s*\n\s*type Step/);
  });
});

// ---------------------------------------------------------------------------
// §13  End-to-end smoke — REPRODUCTIONS of the 3 bug shapes from the actual
//      examples corpus (RECON-S87 affected files).
// ---------------------------------------------------------------------------

describe("§13 end-to-end reproductions (RECON-S87 affected file shapes)", () => {
  test("Bug A repro — examples/03-contact-book.scrml shape (db-wrapped state)", () => {
    // The actual example has `<program auth="required">` then `<db ...>` body
    // containing `${...}`. Pre-fix: the `${...}` was unwrapped, breaking
    // E-CTX-001 / E-CTX-003.
    const src = [
      `<program auth="required">`,
      ``,
      `<db src="contacts.db" protect="password_hash" tables="contacts">`,
      ``,
      `  \${`,
      `    <name>  = ""`,
      `    <email> = ""`,
      ``,
      `    function persistContact(name, email) {`,
      `      ?{\`INSERT INTO contacts (name, email) VALUES (\${name}, \${email})\`}.run()`,
      `    }`,
      `  }`,
      ``,
      `  <div/>`,
      ``,
      `</>`,
      ``,
      `</program>`,
    ].join("\n");
    const r = applyProgramShapeRewrite(src, ENTRY);
    // Must NOT unwrap — `${...}` is inside `<db>`.
    expect(r.rewritten).toContain("${");
    expect(r.rewritten).toContain("<name>");
    expect(r.rewritten).toContain("function persistContact");
  });

  test("Bug B repro — examples/04-live-search.scrml shape (lift-in-markup)", () => {
    const src = [
      `<program>`,
      ``,
      `\${`,
      `  <query> = ""`,
      `  const people = [`,
      `    { id: 1, name: "Ada" },`,
      `  ]`,
      `}`,
      ``,
      `<div>`,
      `  <ul>`,
      `    \${`,
      `      const q = @query.toLowerCase()`,
      `      for (let p of people) {`,
      `        lift <li>\${p.name}</li>`,
      `      }`,
      `    }`,
      `  </ul>`,
      `</div>`,
      ``,
      `</program>`,
    ].join("\n");
    const r = applyProgramShapeRewrite(src, ENTRY);
    // First `${...}` (top-level, clean state-decl + const) — UNWRAPPED.
    expect(r.rewritten).toContain(`<query> = ""`);
    // Second `${...}` (inside `<ul>` AND contains `for`+`lift`) — PRESERVED.
    expect(r.rewritten).toContain("for (let p of people)");
    expect(r.rewritten).toMatch(/<ul>[\s\S]*?\$\{[\s\S]*?for \(let p/);
  });

  test("Bug C repro — examples/05-multi-step-form.scrml shape (// inside fn-body)", () => {
    const src = [
      `<program>`,
      ``,
      `\${`,
      `  type Step:enum = { Info, Confirm }`,
      `  <step>: Step = .Info`,
      ``,
      `  function next() {`,
      `    match @step {`,
      `      .Info    => { @step = Step::Confirm }`,
      `      .Confirm => { }   // handled by submit`,
      `    }`,
      `  }`,
      `}`,
      ``,
      `<div/>`,
      ``,
      `</program>`,
    ].join("\n");
    const r = applyProgramShapeRewrite(src, ENTRY);
    // The `// handled by submit` comment inside the function body triggers
    // the comment-safe gate — block stays wrapped.
    expect(r.rewritten).toContain("${");
    expect(r.rewritten).toContain("// handled by submit");
    expect(r.rewritten).toContain("match @step");
  });
});
