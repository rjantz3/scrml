/**
 * ss19 #12 (g-sql-in-arrow-body-invalid-js) — a `?{}` SQL block inside an
 * arrow / lambda body must raise a PRECISE, actionable diagnostic, NOT the
 * generic E-CODEGEN-INVALID-JS ("this is a compiler defect ... please report it").
 *
 * REPRO (/tmp/ryan-verify/08-arrow-sql.scrml):
 *   function doit() {
 *     const ins = (x) => { ?{`INSERT INTO items (id) VALUES (${x})`}.run() }
 *     ins(1)
 *   }
 *
 * ROOT CAUSE. SQL `?{}` blocks are lowered at the STATEMENT level of a server-
 * function body (the per-statement sqlNode pass). An arrow / lambda body parses
 * as an OPAQUE escape-hatch whose raw text is emitted VERBATIM
 * (rewriteServerExprArrowBody) — the `?{...}` never reaches the SQL-lowering
 * pass, so it leaks into the emitted JS as invalid syntax. Pre-fix this surfaced
 * as E-CODEGEN-INVALID-JS, telling the user to report a compiler bug for what is
 * actually a fixable source shape.
 *
 * FIX (Option B — diagnostic; correct lowering would require the unimplemented
 * structured-lambda-block-body feature + async propagation + caller-await, well
 * beyond this bug's locus). emit-server.ts detects a `?{`...`}` SQL block inside
 * an arrow / function-expression escape-hatch and raises E-SQL-009 with a
 * migration hint. The fatal error also suppresses the emitted-JS parse gate
 * (api.js Bug 70), so exactly ONE actionable diagnostic surfaces.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { resolve, dirname, join } from "path";
import { writeFileSync, rmSync, existsSync, mkdirSync } from "fs";
import { Database } from "bun:sqlite";
import { compileScrml } from "../../src/api.js";

const testDir = dirname(new URL(import.meta.url).pathname);
const TMP_ROOT = resolve(testDir, "_tmp_sql_in_arrow");
let counter = 0;

beforeAll(() => {
  if (!existsSync(TMP_ROOT)) mkdirSync(TMP_ROOT, { recursive: true });
});
afterAll(() => {
  if (existsSync(TMP_ROOT)) rmSync(TMP_ROOT, { recursive: true, force: true });
});

function compileSrc(src, tag) {
  const dir = resolve(TMP_ROOT, `${tag}-${++counter}`);
  mkdirSync(dir, { recursive: true });
  const input = join(dir, "app.scrml");
  writeFileSync(input, src);
  const db = new Database(join(dir, "m.db"), { create: true });
  db.exec("CREATE TABLE items (id INTEGER PRIMARY KEY, label TEXT)");
  db.close();
  const result = compileScrml({ inputFiles: [input], write: true, outputDir: join(dir, "dist") });
  return { codes: (result.errors ?? []).map((e) => e.code), errors: result.errors ?? [] };
}

const WRAP = (body) => `<program db="m.db">
<db src="m.db" tables="items">
  \${
${body}
  }
  <button onclick=doit()>go</button>
</>
</program>`;

describe("ss19 #12 — SQL inside an arrow body diagnoses precisely (not a compiler-defect leak)", () => {
  test("block-body arrow with ?{} → E-SQL-009, NOT E-CODEGEN-INVALID-JS", () => {
    const { codes, errors } = compileSrc(
      WRAP(`    function doit() {
      const ins = (x) => { ?{\`INSERT INTO items (id) VALUES (\${x})\`}.run() }
      ins(1)
    }`),
      "block-arrow",
    );
    expect(codes).toContain("E-SQL-009");
    // The whole point: the generic "report a compiler bug" diagnostic must NOT
    // fire — the cause is a fixable source shape, surfaced by E-SQL-009 alone.
    expect(codes).not.toContain("E-CODEGEN-INVALID-JS");
    const msg = errors.find((e) => e.code === "E-SQL-009")?.message ?? "";
    // The message must be actionable (name the move-to-server-function fix).
    expect(msg).toContain("server function");
  });

  test("migration: hoisting the SQL into a server function compiles clean", () => {
    const { codes } = compileSrc(
      WRAP(`    function ins(x) { ?{\`INSERT INTO items (id) VALUES (\${x})\`}.run() }
    function doit() { ins(1) }`),
      "migrated",
    );
    expect(codes.filter((c) => !c?.startsWith("W-"))).toEqual([]);
  });

  test("no false positive: ?{} at the STATEMENT level of a regular fn still works", () => {
    const { codes } = compileSrc(
      WRAP(`    function doit() {
      const rows = ?{\`SELECT id FROM items\`}.all()
      return { rows: rows }
    }`),
      "regular-fn",
    );
    expect(codes).not.toContain("E-SQL-009");
    expect(codes.filter((c) => !c?.startsWith("W-"))).toEqual([]);
  });

  test("no false positive: a SQL-free arrow callback compiles clean", () => {
    const { codes } = compileSrc(
      WRAP(`    function doit() {
      const rows = ?{\`SELECT id FROM items\`}.all()
      const ids = rows.map((r) => r.id)
      return { ids: ids }
    }`),
      "sql-free-arrow",
    );
    expect(codes).not.toContain("E-SQL-009");
    expect(codes.filter((c) => !c?.startsWith("W-"))).toEqual([]);
  });
});
