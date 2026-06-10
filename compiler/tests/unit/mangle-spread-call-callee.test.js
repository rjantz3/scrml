/**
 * mangle-spread-call-callee.test.js — Regression test for g-spread
 * (2026-06-10): the client fnNameMap rename pass leaked the user fn name
 * for a SPREAD-call callee.
 *
 * Bug: the post-emit rename pass in emit-client.ts rewrites local
 * `function`/`fn` call references from the user-source name to the
 * codegen-mangled name (`makeList` -> `_scrml_makeList_2`). Its negative
 * lookbehind `(?<!\.\s*)` was meant to skip member-access positions
 * (`obj.makeList()` must NOT rename). But the spread operator `...` ends
 * in a `.`, so in `[...makeList()]` the callee `makeList` is preceded by
 * the third spread dot — the lookbehind rejected it and the rename was
 * skipped. The emitted client then referenced the bare `makeList` (which
 * is undefined; only `_scrml_makeList_2` exists) -> runtime ReferenceError.
 * It compiled clean and passed `node --check` (the leaked name is a valid
 * bare identifier), so it was a SILENT runtime failure with no diagnostic.
 *
 * Fix: tighten the lookbehind to reject ONLY a genuine member-access dot —
 * a `.` itself preceded by an identifier-char / `)` / `]` — so `...foo`
 * (dot preceded by a dot) renames while `x.foo` / `f().foo` / `a[0].foo`
 * (dot preceded by an ident-char / `)` / `]`) do not. Lookbehind:
 *   (?<![A-Za-z0-9_$)\]]\s*\.\s*)
 *
 * Related: Bug D (6nz, 2026-04-20) member-access skip; Bug I (adopter,
 * 2026-04-22) spaced `.`; Bug Z (6nz, S144) string-literal opacity.
 *
 * Coverage:
 *   §1  spread-call callee in a derived-RHS IS renamed (was leaked)
 *   §2  spread-call callee in a markup interp IS renamed (was leaked)
 *   §3  member-access of the same name is NOT renamed (negative control)
 *   §4  a string literal containing the name is NOT renamed (Bug Z preserved)
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/mangle-spread-call-callee");
const FIXTURE_OUTPUT = join(FIXTURE_DIR, "dist");

// R1 — spread callee in a derived-RHS (was BROKEN: leaked `makeList`)
const DERIVED_FIXTURE = join(FIXTURE_DIR, "derived-spread.scrml");
const DERIVED_SRC = `<program>
    \${
        function makeList() -> int[] { return [1, 2, 3] }
        const <items> = [...makeList()]
    }
    <p>\${@items}</p>
</program>
`;

// R2 — spread callee in a markup interpolation (was BROKEN: leaked `makeList`)
const INTERP_FIXTURE = join(FIXTURE_DIR, "interp-spread.scrml");
const INTERP_SRC = `<program>
    \${ function makeList() -> int[] { return [1, 2, 3] } }
    <p>\${[...makeList()]}</p>
</program>
`;

// R3 — member-access NEGATIVE control: a local fn `tag()` is spread-called
// (rename) AND also appears as a member-access `.tag()` on a runtime value
// (must NOT rename). The member call on `el` is a DOM/string method position;
// asserting the bare/spread occurrence renames while the member does not.
const MEMBER_FIXTURE = join(FIXTURE_DIR, "member-control.scrml");
const MEMBER_SRC = `<program>
    \${
        function tag() -> string[] { return ["a", "b"] }
        const <joined> = [...tag()].join("-")
    }
    <p>\${@joined}</p>
</program>
`;

// R4 — string-literal control (Bug Z): a string literal containing
// "makeList()" must stay literal, not rename.
const STRING_FIXTURE = join(FIXTURE_DIR, "string-control.scrml");
const STRING_SRC = `<program>
    \${
        function makeList() -> int[] { return [1, 2, 3] }
        const <items> = [...makeList()]
        const <label> = "calls makeList() to build"
    }
    <p>\${@items}</p>
    <p>\${@label}</p>
</program>
`;

beforeAll(() => {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  writeFileSync(DERIVED_FIXTURE, DERIVED_SRC);
  writeFileSync(INTERP_FIXTURE, INTERP_SRC);
  writeFileSync(MEMBER_FIXTURE, MEMBER_SRC);
  writeFileSync(STRING_FIXTURE, STRING_SRC);
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// §1: spread callee in a derived-RHS is renamed
// ---------------------------------------------------------------------------

describe("§1: derived-RHS spread callee renames", () => {
  test("`const <items> = [...makeList()]` renames the spread callee", () => {
    const result = compileScrml({
      inputFiles: [DERIVED_FIXTURE],
      outputDir: FIXTURE_OUTPUT,
      write: false,
    });

    expect(result.errors).toEqual([]);
    const clientJs = result.outputs.get(DERIVED_FIXTURE).clientJs;

    // The mangled declaration must exist.
    expect(clientJs).toMatch(/function _scrml_makeList_\d+/);
    // The spread call must use the MANGLED name.
    expect(clientJs).toMatch(/\[\.\.\._scrml_makeList_\d+\(\)/);
    // The bare user name must NOT appear in a spread-call code position
    // (this is the leak the bug produced).
    expect(clientJs).not.toMatch(/\[\.\.\.makeList\(\)/);
  });
});

// ---------------------------------------------------------------------------
// §2: spread callee in a markup interpolation is renamed
// ---------------------------------------------------------------------------

describe("§2: markup-interp spread callee renames", () => {
  test("`${[...makeList()]}` renames the spread callee", () => {
    const result = compileScrml({
      inputFiles: [INTERP_FIXTURE],
      outputDir: FIXTURE_OUTPUT,
      write: false,
    });

    expect(result.errors).toEqual([]);
    const clientJs = result.outputs.get(INTERP_FIXTURE).clientJs;

    expect(clientJs).toMatch(/function _scrml_makeList_\d+/);
    expect(clientJs).toMatch(/\[\.\.\._scrml_makeList_\d+\(\)/);
    expect(clientJs).not.toMatch(/\[\.\.\.makeList\(\)/);
  });
});

// ---------------------------------------------------------------------------
// §3: member-access negative control — `.join(...)` on the spread result is
// NOT renamed, while the spread callee `tag` IS.
// ---------------------------------------------------------------------------

describe("§3: member access is NOT renamed; spread callee IS", () => {
  test("`[...tag()].join(...)` renames `tag` but leaves `.join` intact", () => {
    const result = compileScrml({
      inputFiles: [MEMBER_FIXTURE],
      outputDir: FIXTURE_OUTPUT,
      write: false,
    });

    expect(result.errors).toEqual([]);
    const clientJs = result.outputs.get(MEMBER_FIXTURE).clientJs;

    // The spread callee `tag` renames.
    expect(clientJs).toMatch(/function _scrml_tag_\d+/);
    expect(clientJs).toMatch(/\[\.\.\._scrml_tag_\d+\(\)/);
    expect(clientJs).not.toMatch(/\[\.\.\.tag\(\)/);
    // The `.join(...)` member call on the spread RESULT is a runtime array
    // method — it must NOT be touched (it is a member-access position). The
    // method name stays a bare `join` (never mangled to `_scrml_join_*`).
    expect(clientJs).toContain(".join(");
    expect(clientJs).not.toMatch(/\._scrml_join_/);
  });
});

// ---------------------------------------------------------------------------
// §3b: regex-unit negative control — the EXACT production lookbehind skips a
// member-access occurrence of the SAME name while renaming bare + spread
// occurrences. This pins the lookbehind directly (a scrml shape that places a
// LOCAL fn name in member position is awkward — the brief authorizes a
// regex-unit assertion here). The regex is the live one from emit-client.ts.
// ---------------------------------------------------------------------------

describe("§3b: production lookbehind skips member access of the same name", () => {
  // Mirror emit-client.ts:escapeRegex + the live combined rename regex.
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fnNameMap = new Map([["makeList", "_scrml_makeList_2"]]);
  const sortedNames = [...fnNameMap.keys()].sort((a, b) => b.length - a.length);
  const alternation = sortedNames.map(escapeRegex).join("|");
  const combinedRegex = new RegExp(
    `(?<![A-Za-z0-9_$)\\]]\\s*\\.\\s*)\\b(${alternation})\\b(?=\\s*[(;,}\\]\\n)]|$)`,
    "g",
  );
  const rename = (code) =>
    code.replace(combinedRegex, (m, name) => fnNameMap.get(name) ?? m);

  test("bare call renames", () => {
    expect(rename("makeList();")).toBe("_scrml_makeList_2();");
  });
  test("spread call renames (the bug)", () => {
    expect(rename("[...makeList()]")).toBe("[..._scrml_makeList_2()]");
  });
  test("member access does NOT rename", () => {
    expect(rename("obj.makeList();")).toBe("obj.makeList();");
  });
  test("spaced member access does NOT rename", () => {
    expect(rename("n . makeList();")).toBe("n . makeList();");
  });
  test("call-result member access does NOT rename", () => {
    expect(rename("f().makeList();")).toBe("f().makeList();");
  });
  test("index-result member access does NOT rename", () => {
    expect(rename("a[0].makeList();")).toBe("a[0].makeList();");
  });
  test("spread of a member access does NOT rename the member", () => {
    expect(rename("[...obj.makeList()]")).toBe("[...obj.makeList()]");
  });
});

// ---------------------------------------------------------------------------
// §4: string-literal control (Bug Z preserved)
// ---------------------------------------------------------------------------

describe("§4: string literal containing the name is NOT renamed", () => {
  test('a literal "calls makeList() to build" stays verbatim', () => {
    const result = compileScrml({
      inputFiles: [STRING_FIXTURE],
      outputDir: FIXTURE_OUTPUT,
      write: false,
    });

    expect(result.errors).toEqual([]);
    const clientJs = result.outputs.get(STRING_FIXTURE).clientJs;

    // The spread callee in CODE position still renames.
    expect(clientJs).toMatch(/\[\.\.\._scrml_makeList_\d+\(\)/);
    // The string-literal occurrence of `makeList()` must remain verbatim
    // (it lives inside a "..." literal — Bug Z fencing via rewriteCodeSegments).
    expect(clientJs).toContain("calls makeList() to build");
    expect(clientJs).not.toContain("calls _scrml_makeList_");
  });
});
