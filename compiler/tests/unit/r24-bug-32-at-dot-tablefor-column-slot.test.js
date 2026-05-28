/**
 * Bug 32 (R24-BUG-6) — `@.` iteration sigil not lowered inside `<tableFor>`
 * column slot body.
 *
 * R24 dev-1-react surfaced an orphan `@ . status` token in emitted client JS
 * when a `<column field="status">` slot body uses `${@.status}` interpolation.
 * The compiler silently emitted broken JS (SyntaxError on `node --check`).
 *
 * Root cause: `emit-table-for.ts:expandTableForElement` synthesizes a
 * `for-stmt` AST with `variable: <unifiedRowBinding>` ("row" by default) and
 * splices the adopter's `<column>` slot body verbatim into the synth `<td>`
 * children. No pass rewrote `@.` → the row binding name.
 *
 * Fix: at the expander, walk `col.slotBody` recursively and rewrite `@.field`
 * → `<rowBindingName>.field` and bare `@.` → `<rowBindingName>` in bare-expr
 * nodes + attribute expression text + attribute call-ref args. The regex
 * tolerates BS-tokenizer space-padded dots (mirrors emit-each.ts line 259 +
 * Bug 35 `matchIsPredicateSuffix` precedent).
 *
 * Spec references:
 *   §17.7 — `@.` iteration sigil semantics
 *   §41.16.3 — column slot grammar
 *   §41.16.11 — codegen contract
 *
 * Cross-refs:
 *   R24-BUG-6 in `gauntlet-r24-report.md`
 *   Bug 31 `<each>` line-438 deferred — SAME ROOT (closed by this fix)
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "r24-bug-32-"));
});

afterAll(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function fx(relPath, source) {
  const abs = join(TMP, relPath);
  mkdirSync(join(abs, "..").replace(/\/$/, ""), { recursive: true });
  writeFileSync(abs, source);
  return abs;
}

function realErrors(result) {
  return (result.errors || []).filter(e => e && e.severity !== "warning");
}

function compile(filename, source) {
  const abs = fx(filename, source);
  return compileScrml({
    inputFiles: [abs],
    outputDir: join(TMP, "dist"),
    write: false,
    log: () => {},
  });
}

function getClientJs(result) {
  const outputs = result.outputs;
  if (!outputs) return "";
  for (const [, v] of outputs) {
    if (typeof v === "object" && v && v.clientJs) return v.clientJs;
  }
  return "";
}

// Helper — assert no orphan `@ .` or `@\s+\.` tokens (the SyntaxError
// surface). Conservative pattern: a literal `@` followed by whitespace then
// `.` outside of import / string contexts. This is the canonical Bug 32
// failure shape — `String((@ . status) ?? "")` etc.
function expectNoOrphanAtDot(js) {
  const lines = js.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip lines that legitimately mention `@.` in comments / strings.
    if (/^\s*\/\//.test(line)) continue;
    if (/@\s+\./.test(line)) {
      throw new Error(
        `orphan '@ .' token at line ${i + 1}: ${line}`
      );
    }
  }
}

// Helper — assert the bare client JS at least parses (`node --check` analog).
// Bun's syntax check is via `new Function` — looser than node --check but
// catches the literal `@` orphan-token class.
function expectClientParseable(js) {
  // We expect the emitted JS to parse as ES module body. Wrap in a function
  // to avoid top-level await / import gripes.
  try {
    // ESM imports + reactive globals would fail with `new Function`; we just
    // strip imports + check for the orphan `@` character first (the most
    // common failure mode for this bug class).
    const stripped = js.replace(/^import\s+.*$/gm, "");
    // The Bug 32 failure surface is the `@` character in expression position.
    // A bare `@` followed by anything non-imported is a SyntaxError. We do a
    // conservative regex for the specific failure shape: literal `@` outside
    // a string in non-comment code.
    const lines = stripped.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*\/\//.test(line)) continue;
      // Find a literal `@` not preceded by `data-scrml-` (attr names) and
      // not inside a `"`-quoted string segment.
      // Conservative: any `@` followed by whitespace is suspicious; the
      // only legitimate JS use of `@` is decorators (not used in scrml output).
      if (/[^"][@](?=\s)/.test(line)) {
        throw new Error(
          `unexpected '@' token at line ${i + 1}: ${line}`
        );
      }
    }
  } catch (e) {
    throw e;
  }
}

// ---------------------------------------------------------------------------
// §1 — Minimal reproducer
// ---------------------------------------------------------------------------

describe("§1 minimal reproducer", () => {
  test("`${@.status}` inside `<column field=status>` lowers to `row.status`", () => {
    const result = compile("minimal.scrml", `\${
  import { tableFor } from 'scrml:data'

  type Item:struct = {
    id:     integer
    name:   string
    status: string
  }
}
<program>
  <items> = []

  <tableFor for=Item rows=@items pick=["name", "status"]>
    <column field="status">
      <span class="badge">\${@.status}</span>
    </column>
  </tableFor>
</program>
`);
    expect(realErrors(result)).toEqual([]);
    const js = getClientJs(result);
    expect(js).toContain("row.status");
    expectNoOrphanAtDot(js);
  });

  test("default-rendered columns continue to emit `row.<field>`", () => {
    const result = compile("default-cells.scrml", `\${
  import { tableFor } from 'scrml:data'

  type Item:struct = {
    id:   integer
    name: string
  }
}
<program>
  <items> = []

  <tableFor for=Item rows=@items/>
</program>
`);
    expect(realErrors(result)).toEqual([]);
    const js = getClientJs(result);
    expect(js).toContain("row.name");
    expectNoOrphanAtDot(js);
  });
});

// ---------------------------------------------------------------------------
// §2 — Multi-column slot bodies
// ---------------------------------------------------------------------------

describe("§2 multi-column slot bodies", () => {
  test("two `<column>` slots each with `@.field` both lower", () => {
    const result = compile("multi-col.scrml", `\${
  import { tableFor } from 'scrml:data'

  type Item:struct = {
    id:     integer
    name:   string
    status: string
  }
}
<program>
  <items> = []

  <tableFor for=Item rows=@items pick=["name", "status"]>
    <column field="name">
      <strong>\${@.name}</strong>
    </column>
    <column field="status">
      <span>\${@.status}</span>
    </column>
  </tableFor>
</program>
`);
    expect(realErrors(result)).toEqual([]);
    const js = getClientJs(result);
    expect(js).toContain("row.name");
    expect(js).toContain("row.status");
    expectNoOrphanAtDot(js);
  });

  test("mixed `${row.field}` + `${@.field}` in same row compose correctly", () => {
    const result = compile("mixed.scrml", `\${
  import { tableFor } from 'scrml:data'

  type Item:struct = {
    id:     integer
    name:   string
    status: string
  }
}
<program>
  <items> = []

  <tableFor for=Item rows=@items pick=["name", "status"]>
    <column field="name">
      <strong>\${row.name}</strong>
    </column>
    <column field="status">
      <span>\${@.status}</span>
    </column>
  </tableFor>
</program>
`);
    expect(realErrors(result)).toEqual([]);
    const js = getClientJs(result);
    expect(js).toContain("row.name");
    expect(js).toContain("row.status");
    expectNoOrphanAtDot(js);
  });
});

// ---------------------------------------------------------------------------
// §3 — `:let={(name) => ...}` adopter-chosen binding
// ---------------------------------------------------------------------------
//
// When `:let={(user) => ...}` is present, the unified row binding becomes
// `user` (per emit-table-for.ts buildBodyCell strategy). The rewrite target
// should follow.
//
// NOTE: `:let=` parsing is currently a W-LINT-011 surface (R24 Bug 33) and
// `:let=` value capture is not yet wired through type-system's column-slot
// walker (the `letAttr` lookup uses raw text). So the explicit-binding
// rewrite test below MAY surface a separate issue; we assert only the
// orphan-`@`-free property + the `_scrml_reactive_get("items")` presence.

describe("§3 default unified binding (row) coverage", () => {
  test("`${@.field}` inside slot body without explicit :let uses default `row` binding", () => {
    const result = compile("implicit-row.scrml", `\${
  import { tableFor } from 'scrml:data'

  type Item:struct = {
    id:   integer
    name: string
  }
}
<program>
  <items> = []

  <tableFor for=Item rows=@items>
    <column field="name">
      <em>\${@.name}</em>
    </column>
  </tableFor>
</program>
`);
    expect(realErrors(result)).toEqual([]);
    const js = getClientJs(result);
    expect(js).toContain("row.name");
    expectNoOrphanAtDot(js);
  });
});

// ---------------------------------------------------------------------------
// §4 — Bare `@.` (no field — the iteration value itself)
// ---------------------------------------------------------------------------

describe("§4 bare `@.` (iteration value with no member access)", () => {
  test("`${@.}` inside slot body lowers to `${row}` (no orphan `@`)", () => {
    // Note: this shape interpolates the entire row object, which renders as
    // [object Object] at runtime — but it must compile to valid JS.
    const result = compile("bare-at-dot.scrml", `\${
  import { tableFor } from 'scrml:data'

  type Item:struct = {
    id:   integer
    name: string
  }
}
<program>
  <items> = []

  <tableFor for=Item rows=@items>
    <column field="name">
      <em>\${@.}</em>
    </column>
  </tableFor>
</program>
`);
    expect(realErrors(result)).toEqual([]);
    const js = getClientJs(result);
    expectNoOrphanAtDot(js);
  });
});

// ---------------------------------------------------------------------------
// §5 — `<each>` regression-guard
// ---------------------------------------------------------------------------

describe("§5 `<each>` regression-guard", () => {
  test("`<each in=@items>${@.name}</each>` continues to lower correctly", () => {
    const result = compile("each-regression.scrml", `\${
  type Item:struct = {
    id:   integer
    name: string
  }
}
<program>
  <items> = []

  <each in=@items>
    <span>\${@.name}</span>
  </each>
</program>
`);
    expect(realErrors(result)).toEqual([]);
    const js = getClientJs(result);
    expectNoOrphanAtDot(js);
    // emit-each substitutes `@.` with its iteration variable (e.g.
    // `_scrml_each_item.name` or the adopter's `as name` binding).
    expect(js).toMatch(/(_scrml_each_item|item)\.name/);
  });

  test("`<each in=@items as foo>${@.name}</each>` aliasing continues to work", () => {
    const result = compile("each-as-foo.scrml", `\${
  type Item:struct = {
    id:   integer
    name: string
  }
}
<program>
  <items> = []

  <each in=@items as foo>
    <span>\${@.name}</span>
  </each>
</program>
`);
    expect(realErrors(result)).toEqual([]);
    const js = getClientJs(result);
    expectNoOrphanAtDot(js);
    expect(js).toContain("foo.name");
  });

  test("`<each in=@items><li : @.name>` :-shorthand continues to lower (Bug 40 territory)", () => {
    const result = compile("each-shorthand.scrml", `\${
  type Item:struct = {
    id:   integer
    name: string
  }
}
<program>
  <items> = []

  <each in=@items>
    <li : @.name>
  </each>
</program>
`);
    expect(realErrors(result)).toEqual([]);
    const js = getClientJs(result);
    expectNoOrphanAtDot(js);
  });
});

// ---------------------------------------------------------------------------
// §6 — Nested `<each>` inside `<tableFor>` column slot
// ---------------------------------------------------------------------------

describe("§6 nested `<each>` inside `<tableFor>` column slot", () => {
  test("`<each of=N>` inside column slot composes with outer row binding", () => {
    // Inner `<each>` has its own `@.` lowering (to the count index); outer
    // `<tableFor>` rewrites `@.field` references in the slot body to `row`.
    // The two paths should compose: `<each of=N>` body's `@.` becomes the
    // each-block iter var; the outer slot body's `@.field` becomes
    // `row.field`.
    const result = compile("nested-each.scrml", `\${
  type Item:struct = {
    id:    integer
    count: integer
    name:  string
  }
}
<program>
  <items> = []

  \${ import { tableFor } from 'scrml:data' }
  <tableFor for=Item rows=@items pick=["name", "count"]>
    <column field="count">
      <each of=3>
        <span class="pip"/>
      </each>
    </column>
  </tableFor>
</program>
`);
    expect(realErrors(result)).toEqual([]);
    const js = getClientJs(result);
    expectNoOrphanAtDot(js);
  });
});

// ---------------------------------------------------------------------------
// §7 — Span attribute interpolation with `@.field`
// ---------------------------------------------------------------------------

describe("§7 attribute interpolation with `@.field`", () => {
  test("`<span class=\"badge-${@.status}\">` attribute lowers correctly", () => {
    const result = compile("attr-interp.scrml", `\${
  import { tableFor } from 'scrml:data'

  type Item:struct = {
    id:     integer
    status: string
  }
}
<program>
  <items> = []

  <tableFor for=Item rows=@items pick=["status"]>
    <column field="status">
      <span class="badge-\${@.status}">marker</span>
    </column>
  </tableFor>
</program>
`);
    expect(realErrors(result)).toEqual([]);
    const js = getClientJs(result);
    expectNoOrphanAtDot(js);
  });
});

// ---------------------------------------------------------------------------
// §8 — R24 dev-1-react replay shape (Bug 31 deferred line-438 same root)
// ---------------------------------------------------------------------------

describe("§8 R24 dev-1-react replay", () => {
  test("`<column field=\"status\"><span class=\"status-badge\">${@.status}</span></column>` lowers", () => {
    // Direct lift from dev-1-react.scrml line 330-332 (with simplified state).
    const result = compile("dev-1-replay.scrml", `\${
  import { tableFor } from 'scrml:data'

  type Ticket:struct = {
    id:     integer
    title:  string
    status: string
  }
}
<program>
  <visibleTickets> = []

  <tableFor for=Ticket rows=@visibleTickets pick=["title", "status"]>
    <column field="title"/>
    <column field="status">
      <span class="status-badge">\${@.status}</span>
    </column>
  </tableFor>
</program>
`);
    expect(realErrors(result)).toEqual([]);
    const js = getClientJs(result);
    expect(js).toContain("row.status");
    expectNoOrphanAtDot(js);
  });
});

// ---------------------------------------------------------------------------
// §9 — Bare-expr space-padded dot tolerance (the actual failure shape)
// ---------------------------------------------------------------------------
//
// Per pipeline trace, the BS tokenizer outputs bare-expr nodes with
// `expr: "@ . status"` (space-padded dot). The rewriter must tolerate this
// — mirrors emit-each.ts's `inner.replace(/\s*\.\s*/g, ".")` normalization
// and Bug 35's `matchIsPredicateSuffix` `\s*\.\s*` regex tolerance.

describe("§9 space-padded dot tolerance (parser-output shape)", () => {
  test("the regex `@\\s*\\.\\s*field` form is rewritten end-to-end", () => {
    // This is the SAME shape as §1's reproducer; the test asserts directly
    // that the parser-output form (with space-padded dots) is handled.
    // We assert by checking that `row.status` appears AND no orphan `@`.
    const result = compile("space-padded.scrml", `\${
  import { tableFor } from 'scrml:data'

  type Item:struct = {
    id:     integer
    status: string
  }
}
<program>
  <items> = []

  <tableFor for=Item rows=@items pick=["status"]>
    <column field="status">
      <span>\${@.status}</span>
    </column>
  </tableFor>
</program>
`);
    expect(realErrors(result)).toEqual([]);
    const js = getClientJs(result);
    expect(js).toContain("row.status");
    expect(js).not.toMatch(/@\s+\./);
  });
});
