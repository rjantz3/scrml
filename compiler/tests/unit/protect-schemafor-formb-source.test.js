/**
 * protect-schemafor-formb-source.test.js — g-schemafor-pa-unrecognized:
 * the canonical §41.15 Form-B `< schema> ${ schemaFor(StructType) } </>` usage is
 * recognized by the protect-analyzer as a table-definition source.
 *
 * Before this change, PA's F-SCHEMA-001 path read only the LITERAL `text`-kind
 * children of a `< schema>` block, so the Form-B logic-escape body (a
 * `schemaFor(Driver)` call) was invisible at the early PA stage (the L22
 * schemaFor codegen expansion runs much later, in CG). Result: a FALSE E-PA-002
 * whenever the db file did not pre-exist (the common first-run / dev case),
 * even though the literal-`< schema>` equivalent compiled clean.
 *
 * Now PA resolves each `schemaFor(Struct)` call to the struct's `type-decl`,
 * pluralizes per §41.15.2, synthesizes a `< schema>`-shaped table body, and feeds
 * it through the SAME literal-path lowering — so E-PA-002 no longer false-fires
 * AND the generated table type is available downstream. The genuine
 * missing-table case still errors (no over-suppression).
 */

import { describe, test, expect } from "bun:test";
import { runPA } from "../../src/protect-analyzer.ts";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { resolve } from "path";

function paFor(scrmlSource, filePath) {
  const fp = resolve(filePath);
  const bs = splitBlocks(fp, scrmlSource);
  const ast = buildAST(bs).ast;
  return runPA({ files: [{ filePath: fp, nodes: ast.nodes }] });
}

describe("g-schemafor-pa-unrecognized — Form-B schemaFor as a PA table source", () => {
  test("Form-B `${ schemaFor(Driver) }` with no materialized DB does NOT false-fire E-PA-002", () => {
    const src = `<program>
  \${
    import { schemaFor } from 'scrml:data'
    type Driver:struct = {
      id: integer,
      email: string,
      name: string req length(>=2),
      age: number min(18) max(120)
    }
  }
  <db src="./nope-sf.db" tables="drivers"/>
  <schema>
    \${ schemaFor(Driver) }
  </>
  <p>schema generated</p>
</program>`;
    const { protectAnalysis, errors } = paFor(src, "/tmp/_sf_formb/app.scrml");
    // The bug: a FALSE E-PA-002 for `drivers`. It must be GONE.
    expect(errors.some((e) => e.code === "E-PA-002")).toBe(false);
    // The synthesized table is registered with the struct's columns (pluralized
    // per §41.15.2: Driver -> drivers).
    const view = [...protectAnalysis.views.values()][0];
    expect(view).toBeDefined();
    const drivers = view.tables.get("drivers");
    expect(drivers).toBeDefined();
    const cols = drivers.fullSchema.map((c) => c.name).sort();
    expect(cols).toEqual(["age", "email", "id", "name"]);
  });

  test("a `schemaFor` import alias is honored (`import { schemaFor as sf }`)", () => {
    const src = `<program>
  \${
    import { schemaFor as sf } from 'scrml:data'
    type Driver:struct = { id: integer, name: string }
  }
  <db src="./nope-alias.db" tables="drivers"/>
  <schema>
    \${ sf(Driver) }
  </>
  <p>x</p>
</program>`;
    const { protectAnalysis, errors } = paFor(src, "/tmp/_sf_alias/app.scrml");
    expect(errors.some((e) => e.code === "E-PA-002")).toBe(false);
    const view = [...protectAnalysis.views.values()][0];
    const drivers = view.tables.get("drivers");
    expect(drivers).toBeDefined();
    expect(drivers.fullSchema.map((c) => c.name).sort()).toEqual(["id", "name"]);
  });

  test("genuine missing table (no schema, no schemaFor, no DB) STILL fires E-PA-002 (no over-suppression)", () => {
    const src = `<program>
  <db src="./nope-ghosts.db" tables="ghosts"/>
  <p>no schema for ghosts</p>
</program>`;
    const { errors } = paFor(src, "/tmp/_sf_ghosts/app.scrml");
    expect(errors.some((e) => e.code === "E-PA-002")).toBe(true);
  });

  test("schemaFor for a DIFFERENT struct than tables= still fires E-PA-002 for the unmatched table", () => {
    // schemaFor(Driver) registers `drivers`; tables= asks for `ghosts` which has
    // no source — E-PA-002 must still fire for `ghosts`.
    const src = `<program>
  \${
    import { schemaFor } from 'scrml:data'
    type Driver:struct = { id: integer, name: string }
  }
  <db src="./nope-mismatch.db" tables="ghosts"/>
  <schema>
    \${ schemaFor(Driver) }
  </>
  <p>x</p>
</program>`;
    const { errors } = paFor(src, "/tmp/_sf_mismatch/app.scrml");
    expect(errors.some((e) => e.code === "E-PA-002")).toBe(true);
  });

  test("an unresolved struct (forward-ref / missing decl) falls through without crashing", () => {
    // `schemaFor(Missing)` references a struct with no type-decl. PA must not
    // crash; it falls through to the existing missing-table behavior (E-PA-002).
    const src = `<program>
  \${
    import { schemaFor } from 'scrml:data'
  }
  <db src="./nope-unres.db" tables="missings"/>
  <schema>
    \${ schemaFor(Missing) }
  </>
  <p>x</p>
</program>`;
    // Should not throw; the table stays unresolved -> E-PA-002 for `missings`.
    const { errors } = paFor(src, "/tmp/_sf_unres/app.scrml");
    expect(errors.some((e) => e.code === "E-PA-002")).toBe(true);
  });

  test("a `?{}`-harvested CREATE TABLE wins over the synthesized schemaFor table (precedence)", () => {
    // schemaFor(Driver) would register `drivers` with id+name; a ?{} CREATE TABLE
    // declares `drivers` with id+email. The harvested CREATE TABLE must win.
    const src = `<program>
  \${
    import { schemaFor } from 'scrml:data'
    type Driver:struct = { id: integer, name: string }
  }
  <db src="./nope-sfprec.db" tables="drivers">
    \${
      function _boot() {
        ?{\`CREATE TABLE drivers (id INTEGER PRIMARY KEY, email TEXT NOT NULL)\`}.run()
      }
    }
  </>
  <schema>
    \${ schemaFor(Driver) }
  </>
  <p>x</p>
</program>`;
    const { protectAnalysis, errors } = paFor(src, "/tmp/_sf_prec/app.scrml");
    expect(errors.some((e) => e.code === "E-PA-002")).toBe(false);
    const view = [...protectAnalysis.views.values()][0];
    const drivers = view.tables.get("drivers");
    const cols = drivers.fullSchema.map((c) => c.name).sort();
    // email present -> the ?{} CREATE TABLE (id+email) won over the schemaFor
    // synthesis (id+name).
    expect(cols).toEqual(["email", "id"]);
  });
});
