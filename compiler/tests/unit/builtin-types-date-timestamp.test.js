/**
 * builtin-types-date-timestamp.test.js — formalize `date` + `timestamp` as
 * first-class primitive types in BUILTIN_TYPES (S109).
 *
 * Per docs/changes/tableFor-impl/PROGRESS.md item #6 ("Date/timestamp
 * builtin types — `date` and `timestamp` are not currently in `BUILTIN_TYPES`.
 * Affects all three structural-walk primitives (formFor + schemaFor +
 * tableFor) per §41.16.6 + §41.14.7").
 *
 * Pre-S109: `date` resolved via NAMED_SHAPES (predicated/string path);
 * `timestamp` had no formal type registration — only downstream switch
 * statements in emit-table-for.ts (`mapPrimitiveToCellKind`) +
 * emit-schema-for.ts (`mapPrimitiveToColumnType`) recognized it.
 *
 * Post-S109: both are `kind: "primitive"` types in BUILTIN_TYPES. Cell
 * renderers + DDL emitters explicitly handle them.
 *
 * Coverage:
 *   §1  struct field with `date` type compiles cleanly
 *   §2  struct field with `timestamp` type compiles cleanly
 *   §3  tableFor over struct with date/timestamp fields compiles + renders
 *   §4  schemaFor over struct with date/timestamp fields compiles + lowers to SQL
 *   §5  state cell declaration with date/timestamp type compiles cleanly
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

function compileSource(source) {
  const tmp = mkdtempSync(join(tmpdir(), "scrml-builtin-date-test-"));
  mkdirSync(join(tmp, "src"), { recursive: true });
  mkdirSync(join(tmp, "dist"), { recursive: true });
  const filePath = join(tmp, "src", "test.scrml");
  writeFileSync(filePath, source);
  try {
    const result = compileScrml(filePath, {
      outDir: join(tmp, "dist"),
      target: "browser",
    });
    return result;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// §1: `date` as struct field type
// ---------------------------------------------------------------------------

describe("§1: date as struct field type", () => {
  test("struct field `when: date` compiles cleanly", () => {
    const src = `
type Event:struct = {
    name: string,
    when: date,
}
\${
    <events>: [Event] = []
}
<page>
    <p>events</p>
</>
`;
    const result = compileSource(src);
    expect(result.errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §2: `timestamp` as struct field type
// ---------------------------------------------------------------------------

describe("§2: timestamp as struct field type", () => {
  test("struct field `expires: timestamp` compiles cleanly", () => {
    const src = `
type Event:struct = {
    name: string,
    expires: timestamp,
}
\${
    <events>: [Event] = []
}
<page>
    <p>events</p>
</>
`;
    const result = compileSource(src);
    expect(result.errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §3: tableFor with date + timestamp fields
// ---------------------------------------------------------------------------

describe("§3: tableFor with date + timestamp fields", () => {
  test("tableFor over Event struct with date + timestamp fields compiles", () => {
    const src = `
type Event:struct = {
    name: string,
    when: date,
    expires: timestamp,
}
\${
    <events>: [Event] = []
}
<page>
    <tableFor for=Event rows=@events/>
</>
`;
    const result = compileSource(src);
    expect(result.errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §4: schemaFor with date + timestamp fields
// ---------------------------------------------------------------------------

describe("§4: schemaFor with date + timestamp fields", () => {
  test("schemaFor over struct with date + timestamp lowers cleanly", () => {
    const src = `
type Event:struct = {
    name: string req,
    when: date req,
    expires: timestamp req,
}
<page>
    <schema>
        \${ schemaFor(Event) }
    </>
</>
`;
    const result = compileSource(src);
    expect(result.errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §5: state cell with date / timestamp type annotation
// ---------------------------------------------------------------------------

describe("§5: state cell declarations with date / timestamp", () => {
  test("`<startDate>: date = \"2026-01-01\"` compiles cleanly", () => {
    const src = `
\${
    <startDate>: date = "2026-01-01"
}
<page>
    <p>\${@startDate}</p>
</>
`;
    const result = compileSource(src);
    expect(result.errors).toEqual([]);
  });

  test("`<created>: timestamp = \"2026-01-01T00:00:00Z\"` compiles cleanly", () => {
    const src = `
\${
    <created>: timestamp = "2026-01-01T00:00:00Z"
}
<page>
    <p>\${@created}</p>
</>
`;
    const result = compileSource(src);
    expect(result.errors).toEqual([]);
  });
});
