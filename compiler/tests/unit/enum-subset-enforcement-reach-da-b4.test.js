/**
 * enum-subset-enforcement-reach-da-b4.test.js
 *
 * S156 (d)-A batch 4 (CLOSING) — enum-subset bare-variant enforcement reaches
 * the canonical adopter call sites that batches 1-3 left unenforced.
 *
 * Deliverable (b) — struct-CONSTRUCTOR form `Type { field: value }`
 *   (SPEC §53.15.2 canonical worked example). The constructor form carries no
 *   `:Type` annotation and acorn drops the brace body, so it bypassed the
 *   field-typed object-literal descent that the annotated form
 *   (`const x: Post = { role: .V }`) uses. Now recovered from raw init text.
 *     - out-of-subset variant      → E-CONTRACT-001 (names variant + subset)
 *     - in-subset variant          → clean
 *     - plain-enum typo at a field → E-TYPE-063 / E-VARIANT-AMBIGUOUS
 *     - non-constructor decls       → unchanged (no false fire)
 *
 * Deliverable (a) — fn-return subset annotation. The CANONICAL `->` return-type
 *   syntax (SPEC §7.3 line 5761: "`->` is the sole return-type annotation
 *   syntax") ALREADY enforces the subset via batch 1. These tests LOCK that
 *   behavior so the closing arc has explicit coverage:
 *     - `fn f() -> Role oneOf([…])` returning out-of-subset → E-CONTRACT-001
 *     - returning in-subset → clean
 *     - plain `-> Role` returning a typo → E-TYPE-063
 *
 * Deliverable (c) — member-access `<match for=Role on=@p.role>` block-form
 *   subset reach (§18.0.1 / §53.15.4). batch 2 keyed block-form subset
 *   narrowing by top-level CELL name only; a struct-field member-access subject
 *   fell through to full-enum exhaustiveness. Now resolved via struct-field +
 *   cell-struct-type SYM collectors.
 *     - subset field, exactly subset variants, no `<_>` → clean (exhaustive)
 *     - dead-variant arm (excluded by subset)          → E-MATCH-SUBSET-DEAD-ARM
 *     - missing a subset variant                       → narrowed E-MATCH-NOT-EXHAUSTIVE
 *     - plain-enum field member-access                 → full-enum exhaustiveness (no regression)
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/enum-subset-reach-da-b4");
const FIXTURE_OUT = join(FIXTURE_DIR, "dist");

function fix(name, src) {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  const p = join(FIXTURE_DIR, name);
  writeFileSync(p, src);
  return p;
}

function compile(src, name = "test.scrml") {
  const p = fix(name, src);
  return compileScrml({ inputFiles: [p], outputDir: FIXTURE_OUT, write: false });
}

// Cross-stream lookup — W-*/I-* land in result.warnings, errors in
// result.errors. A code-presence assertion MUST scan both streams.
function findDiagnostic(result, code) {
  for (const d of [...(result.errors || []), ...(result.warnings || [])]) {
    if (d.code === code) return d;
  }
  return null;
}

function codes(result) {
  return [...(result.errors || []), ...(result.warnings || [])].map((d) => d.code);
}

const ROLE = `type Role:enum = { Admin, Editor, Viewer }`;
const POST_SUBSET = `type Post:struct = { title: string req, role: Role oneOf([.Admin, .Editor]) }`;
const POST_PLAIN = `type Post:struct = { title: string req, role: Role }`;

// ---------------------------------------------------------------------------
// Deliverable (b) — struct-CONSTRUCTOR form `Type { … }`
// ---------------------------------------------------------------------------

describe("(b) struct-constructor form reaches subset enforcement", () => {
  test("out-of-subset .Viewer → E-CONTRACT-001 naming variant + subset", () => {
    const r = compile(`${ROLE}
${POST_SUBSET}
\${
  const bad = Post { title: "x", role: .Viewer }
}
<program><p>ok</></>
`);
    const d = findDiagnostic(r, "E-CONTRACT-001");
    expect(d).not.toBeNull();
    expect(d.message).toContain(".Viewer");
    expect(d.message).toContain("oneOf");
  });

  test("in-subset .Admin → no E-CONTRACT-001", () => {
    const r = compile(`${ROLE}
${POST_SUBSET}
\${
  const ok = Post { title: "x", role: .Admin }
}
<program><p>ok</></>
`);
    expect(findDiagnostic(r, "E-CONTRACT-001")).toBeNull();
  });

  test("plain-enum typo .Bogus at a constructor field → E-TYPE-063", () => {
    const r = compile(`${ROLE}
${POST_PLAIN}
\${
  const bad = Post { title: "x", role: .Bogus }
}
<program><p>ok</></>
`);
    const hasTypo =
      findDiagnostic(r, "E-TYPE-063") || findDiagnostic(r, "E-VARIANT-AMBIGUOUS");
    expect(hasTypo).not.toBeNull();
  });

  test("non-constructor decls (call / arithmetic / plain object) do not false-fire", () => {
    const r = compile(`${ROLE}
\${
  function makeRole() -> Role { return .Admin }
  const a = makeRole()
  const b = 1 + 2
  const c = { x: 1 }
}
<program><p>ok</></>
`);
    expect(findDiagnostic(r, "E-CONTRACT-001")).toBeNull();
    expect(codes(r)).not.toContain("E-TYPE-063");
  });

  test("SPEC §53.15.2 canonical example — ok clean, bad fires", () => {
    const r = compile(`${ROLE}
${POST_SUBSET}
\${
  const ok  = Post { title: "x", role: .Admin }
  const bad = Post { title: "x", role: .Viewer }
}
<program><p>ok</></>
`);
    const d = findDiagnostic(r, "E-CONTRACT-001");
    expect(d).not.toBeNull();
    expect(d.message).toContain(".Viewer");
  });
});

// ---------------------------------------------------------------------------
// Deliverable (a) — fn-return subset annotation (canonical `->` syntax).
// SPEC §7.3 line 5761: `->` is the sole return-type annotation syntax.
// ---------------------------------------------------------------------------

describe("(a) fn-return subset annotation enforces via canonical -> syntax", () => {
  test("fn -> Role oneOf([…]) returning out-of-subset .Viewer → E-CONTRACT-001", () => {
    const r = compile(`${ROLE}
\${
  fn assignRole() -> Role oneOf([.Admin, .Editor]) {
    return .Viewer
  }
  function useIt() { let r = assignRole() }
}
<program><p>ok</></>
`);
    const d = findDiagnostic(r, "E-CONTRACT-001");
    expect(d).not.toBeNull();
    expect(d.message).toContain(".Viewer");
  });

  test("fn -> Role oneOf([…]) returning in-subset .Admin → clean", () => {
    const r = compile(`${ROLE}
\${
  fn assignRole() -> Role oneOf([.Admin, .Editor]) {
    return .Admin
  }
  function useIt() { let r = assignRole() }
}
<program><p>ok</></>
`);
    expect(findDiagnostic(r, "E-CONTRACT-001")).toBeNull();
  });

  test("function -> Role oneOf([…]) (not fn) returning out-of-subset → E-CONTRACT-001", () => {
    const r = compile(`${ROLE}
\${
  function assignRole() -> Role oneOf([.Admin, .Editor]) {
    return .Viewer
  }
  function useIt() { let r = assignRole() }
}
<program><p>ok</></>
`);
    expect(findDiagnostic(r, "E-CONTRACT-001")).not.toBeNull();
  });

  test("notIn complement return type narrows the same way", () => {
    const r = compile(`${ROLE}
\${
  fn assignRole() -> Role notIn([.Viewer]) {
    return .Viewer
  }
  function useIt() { let r = assignRole() }
}
<program><p>ok</></>
`);
    expect(findDiagnostic(r, "E-CONTRACT-001")).not.toBeNull();
  });

  test("plain -> Role returning a typo .Bogus → E-TYPE-063", () => {
    const r = compile(`${ROLE}
\${
  fn assignRole() -> Role {
    return .Bogus
  }
  function useIt() { let r = assignRole() }
}
<program><p>ok</></>
`);
    expect(findDiagnostic(r, "E-TYPE-063")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Deliverable (c) — member-access `<match for=Role on=@p.role>` subset reach
// ---------------------------------------------------------------------------

describe("(c) member-access block-form match narrows to the field subset", () => {
  test("subset field, exactly subset variants, no <_> → clean (exhaustive)", () => {
    const r = compile(`${ROLE}
${POST_SUBSET}
\${
  @post: Post = { title: "x", role: .Admin }
}
<match for=Role on=@post.role>
  <Admin> : "admin"
  <Editor> : "editor"
</>
`);
    expect(findDiagnostic(r, "E-MATCH-NOT-EXHAUSTIVE")).toBeNull();
    expect(findDiagnostic(r, "E-MATCH-SUBSET-DEAD-ARM")).toBeNull();
  });

  test("dead-variant arm .Viewer (excluded by subset) → E-MATCH-SUBSET-DEAD-ARM", () => {
    const r = compile(`${ROLE}
${POST_SUBSET}
\${
  @post: Post = { title: "x", role: .Admin }
}
<match for=Role on=@post.role>
  <Admin> : "admin"
  <Editor> : "editor"
  <Viewer> : "viewer"
</>
`);
    const d = findDiagnostic(r, "E-MATCH-SUBSET-DEAD-ARM");
    expect(d).not.toBeNull();
    expect(d.message).toContain("Viewer");
  });

  test("missing a subset variant → narrowed E-MATCH-NOT-EXHAUSTIVE naming subset", () => {
    const r = compile(`${ROLE}
${POST_SUBSET}
\${
  @post: Post = { title: "x", role: .Admin }
}
<match for=Role on=@post.role>
  <Admin> : "admin"
</>
`);
    const d = findDiagnostic(r, "E-MATCH-NOT-EXHAUSTIVE");
    expect(d).not.toBeNull();
    expect(d.message).toContain(".Editor");
    expect(d.message).toContain("oneOf");
  });

  test("plain-enum field member-access keeps full-enum exhaustiveness (no regression)", () => {
    const r = compile(`${ROLE}
${POST_PLAIN}
\${
  @post: Post = { title: "x", role: .Admin }
}
<match for=Role on=@post.role>
  <Admin> : "admin"
  <Editor> : "editor"
</>
`);
    const d = findDiagnostic(r, "E-MATCH-NOT-EXHAUSTIVE");
    expect(d).not.toBeNull();
    expect(d.message).toContain(".Viewer");
  });

  test("notIn complement field narrows correctly (clean over complement set)", () => {
    const r = compile(`${ROLE}
type Post:struct = { title: string req, role: Role notIn([.Viewer]) }
\${
  @post: Post = { title: "x", role: .Admin }
}
<match for=Role on=@post.role>
  <Admin> : "admin"
  <Editor> : "editor"
</>
`);
    expect(findDiagnostic(r, "E-MATCH-NOT-EXHAUSTIVE")).toBeNull();
  });

  test("top-level cell subset (batch-2 baseline) still narrows (no regression)", () => {
    const r = compile(`${ROLE}
\${
  @currentRole: Role oneOf([.Admin, .Editor]) = .Admin
}
<match for=Role on=@currentRole>
  <Admin> : "admin"
  <Editor> : "editor"
</>
`);
    expect(findDiagnostic(r, "E-MATCH-NOT-EXHAUSTIVE")).toBeNull();
  });
});
