/**
 * (d)-A batch 3 — schemaFor enum-subset CHECK (§41.15.6) + nullable subset
 * (§41.15.8a) + validator `.OneOfFailed(set)` carries the subset (§55.9).
 *
 * batch 1 (bfc50545) materialized `PredicatedType.subsetVariants`/`enumBase`;
 * batch 2 (7a3c018f) consumed it for match exhaustiveness. THIS batch reads the
 * subset for the schemaFor SUBSET CHECK + confirms the validity-surface set.
 *
 * Coverage:
 *   §A  — classifyFieldForSql pure-function: subset PredicatedType → bare-enum
 *         with the SUBSET variants + `enumSubset:true`; notIn complement; nullable
 *         subset union; payload-enum subset still rejects; full-enum unchanged.
 *   §B  — lowerFieldToSharedCore pure-function: enumSubsetRefinement drops the
 *         variant-literal clause + emits the §41.15.6 string-literal subset form;
 *         nullable subset drops `req`.
 *   §C  — END-TO-END (the load-bearing tests): compile a struct with a subset-
 *         refined enum field → extract the <schema> body → parseSchemaBlock →
 *         diffSchema → assert `CHECK (col IN ('Admin', 'Editor'))` (subset, NOT
 *         all base variants). Covers no-req / req / nullable / notIn / conflict.
 *   §D  — full-enum NON-REGRESSION (all base variants still emitted).
 *   §E  — Deliverable 3 CONFIRM — the state-cell validator form carries the
 *         subset; refinement-type cell is §53.4 three-zone (no validity surface).
 *
 * SPEC: §41.15.6, §41.15.8a, §39.5.8, §53.15.5, §55.1/§55.9 notes (L30142-30154).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runCE } from "../../src/component-expander.ts";
import { runRI } from "../../src/route-inference.ts";
import { runPA } from "../../src/protect-analyzer.ts";
import { runTS } from "../../src/type-system.ts";
import { parseSchemaBlock, diffSchema } from "../../src/schema-differ.js";
import {
  classifyFieldForSql,
  lowerFieldToSharedCore,
} from "../../src/codegen/emit-schema-for.ts";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "enum-subset-sf-b3-"));
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

function compileToTS(source, filePath) {
  const abs = fx(filePath, source);
  const split = splitBlocks(abs, source);
  const built = buildAST(split);
  const ceInputFile = {
    filePath: built.filePath || abs,
    ast: built.ast,
    errors: built.errors || [],
  };
  const ceResult = runCE({ files: [ceInputFile] });
  const ceFiles = ceResult.files;
  const paResult = runPA({ files: ceFiles });
  const riResult = runRI({ files: ceFiles, protectAnalysis: paResult.protectAnalysis });
  const tsResult = runTS({
    files: ceFiles,
    protectAnalysis: paResult.protectAnalysis,
    routeMap: riResult.routeMap,
  });
  return { tsResult, ceFiles, abs };
}

function findSchemaChildren(input) {
  let nodes;
  if (Array.isArray(input)) nodes = input;
  else if (input && typeof input === "object") {
    if (Array.isArray(input.nodes)) nodes = input.nodes;
    else if (input.ast && Array.isArray(input.ast.nodes)) nodes = input.ast.nodes;
    else return null;
  } else {
    return null;
  }
  function walk(arr) {
    if (!Array.isArray(arr)) return null;
    for (const n of arr) {
      if (!n || typeof n !== "object") continue;
      if (n.kind === "state" && n.stateType === "schema") return n.children || [];
      const r = walk(n.children) || walk(n.body);
      if (r) return r;
    }
    return null;
  }
  return walk(nodes);
}

function extractSchemaBodyText(input) {
  const children = findSchemaChildren(input);
  if (!children) return "";
  let text = "";
  for (const c of children) {
    if (c && c.kind === "text" && typeof c.value === "string") text += c.value;
  }
  return text;
}

function realErrors(result) {
  return (result.errors || []).filter(e => e && e.severity !== "warning");
}

// ---------------------------------------------------------------------------
// §A — classifyFieldForSql pure-function (subset materialization → bare-enum).
// ---------------------------------------------------------------------------

const ROLE_ENUM = {
  kind: "enum",
  name: "Role",
  variants: [{ name: "Admin" }, { name: "Editor" }, { name: "Viewer" }],
};

function subsetPredicated(setNames) {
  return {
    kind: "predicated",
    baseType: "enum",
    enumBase: ROLE_ENUM,
    subsetVariants: new Set(setNames),
  };
}

describe("§A classifyFieldForSql — enum-subset PredicatedType", () => {
  test("oneOf subset → bare-enum with SUBSET variants + enumSubset flag", () => {
    const r = classifyFieldForSql(subsetPredicated(["Admin", "Editor"]));
    expect(r.kind).toBe("bare-enum");
    expect(r.enumName).toBe("Role");
    expect(r.variants).toEqual(["Admin", "Editor"]); // NOT all 3
    expect(r.enumSubset).toBe(true);
  });

  test("variant order follows base-enum declaration order (stable DDL)", () => {
    // subset set built in reverse insertion order; result must follow base order.
    const r = classifyFieldForSql(subsetPredicated(["Editor", "Admin"]));
    expect(r.variants).toEqual(["Admin", "Editor"]);
  });

  test("notIn-complement subset → bare-enum with the IN-set names", () => {
    // batch-1 already complements notIn at materialization time — `notIn([.Viewer])`
    // arrives here as subsetVariants {Admin, Editor}.
    const r = classifyFieldForSql(subsetPredicated(["Admin", "Editor"]));
    expect(r.kind).toBe("bare-enum");
    expect(r.variants).toEqual(["Admin", "Editor"]);
  });

  test("nullable subset union [predicated-subset, not] → bare-enum nullable + enumSubset", () => {
    const field = {
      kind: "union",
      members: [subsetPredicated(["Admin", "Editor"]), { kind: "not" }],
    };
    const r = classifyFieldForSql(field);
    expect(r.kind).toBe("bare-enum");
    expect(r.variants).toEqual(["Admin", "Editor"]);
    expect(r.nullable).toBe(true);
    expect(r.enumSubset).toBe(true);
  });

  test("payload-enum subset STILL rejects (§53.15.5 — rejection is about payload)", () => {
    const payloadEnum = {
      kind: "enum",
      name: "Result",
      variants: [
        { name: "Ok", payload: new Map([["v", { kind: "primitive", name: "int" }]]) },
        { name: "Err", payload: new Map([["m", { kind: "primitive", name: "string" }]]) },
      ],
    };
    const field = {
      kind: "predicated",
      baseType: "enum",
      enumBase: payloadEnum,
      subsetVariants: new Set(["Ok"]),
    };
    const r = classifyFieldForSql(field);
    expect(r.kind).toBe("payload-enum");
    expect(r.enumName).toBe("Result");
  });

  test("full-enum field (no subset) unchanged — all base variants", () => {
    const r = classifyFieldForSql(ROLE_ENUM);
    expect(r.kind).toBe("bare-enum");
    expect(r.variants).toEqual(["Admin", "Editor", "Viewer"]); // all 3
    expect(r.enumSubset).toBeFalsy();
  });

  test("non-enum predicated (string predicate) still maps to its base type", () => {
    const r = classifyFieldForSql({ kind: "predicated", baseType: "string" });
    expect(r.kind).toBe("ok");
    expect(r.columnType).toBe("text");
  });
});

// ---------------------------------------------------------------------------
// §B — lowerFieldToSharedCore pure-function (drop literal clause → string form).
// ---------------------------------------------------------------------------

describe("§B lowerFieldToSharedCore — enum-subset refinement field", () => {
  test("subset+req field emits string-literal oneOf, drops variant-literal clause", () => {
    const line = lowerFieldToSharedCore({
      name: "role",
      columnType: "text",
      // the struct-body parser surfaces the user's refinement clause as a
      // validator with variant-LITERAL args — it must be dropped.
      validators: [{ name: "req", argsRaw: null }, { name: "oneOf", argsRaw: "[.Admin, .Editor]" }],
      bareVariantNames: ["Admin", "Editor"],
      enumSubsetRefinement: true,
    });
    expect(line).toBe(`role: text req oneOf(['Admin', 'Editor'])`);
    expect(line).not.toContain(".Admin"); // variant-literal form gone
    // exactly one oneOf
    expect((line.match(/oneOf\(/g) || []).length).toBe(1);
  });

  test("nullable subset drops req (no NOT NULL) + emits string subset form", () => {
    const line = lowerFieldToSharedCore({
      name: "role",
      columnType: "text",
      validators: [{ name: "req", argsRaw: null }, { name: "oneOf", argsRaw: "[.Admin, .Editor]" }],
      bareVariantNames: ["Admin", "Editor"],
      nullable: true,
      enumSubsetRefinement: true,
    });
    expect(line).toBe(`role: text oneOf(['Admin', 'Editor'])`);
    expect(line).not.toContain("req");
  });

  test("full-enum field (no enumSubsetRefinement) still injects all variants", () => {
    const line = lowerFieldToSharedCore({
      name: "status",
      columnType: "text",
      validators: [{ name: "req", argsRaw: null }],
      bareVariantNames: ["Pending", "Active", "Archived"],
    });
    expect(line).toBe(`status: text req oneOf(['Pending', 'Active', 'Archived'])`);
  });
});

// ---------------------------------------------------------------------------
// §C — END-TO-END: subset enum field → DDL CHECK (col IN (subset)).
// ---------------------------------------------------------------------------

function ddlFor(source, file) {
  const { tsResult } = compileToTS(source, file);
  const sfErrs = realErrors(tsResult).filter(e => e.code && e.code.startsWith("E-SCHEMAFOR-"));
  const body = extractSchemaBodyText(tsResult.files[0]);
  const parsed = parseSchemaBlock(body);
  const { sql } = diffSchema(parsed, { tables: [] }, { driver: "sqlite" });
  const createStmt = sql.find(s => s.startsWith("CREATE TABLE") && s.includes('"posts"'));
  return { sfErrs, body, parsed, createStmt };
}

describe("§C end-to-end — subset enum field → CHECK (col IN (subset))", () => {
  test("subset (no req) → CHECK (role IN ('Admin', 'Editor')) — NOT all 3", () => {
    const source = `\${
  import { schemaFor } from 'scrml:data'
  type Role:enum = { Admin, Editor, Viewer }
  type Post:struct = {
    role:  Role oneOf([.Admin, .Editor])
    title: string req
  }
}
<program db="./db.sqlite">
  <schema>
    \${ schemaFor(Post) }
  </>
</program>
`;
    const { sfErrs, body, createStmt } = ddlFor(source, "c1/post.scrml");
    expect(sfErrs).toEqual([]);
    expect(body).toContain(`oneOf(['Admin', 'Editor'])`);
    expect(body).not.toContain("Viewer"); // subset wins
    expect(createStmt).toBeDefined();
    expect(createStmt).toMatch(/CHECK \("?role"? IN \('Admin', 'Editor'\)\)/);
    expect(createStmt).not.toContain("Viewer");
  });

  test("subset WITH req → NOT NULL + CHECK (role IN ('Admin', 'Editor'))", () => {
    const source = `\${
  import { schemaFor } from 'scrml:data'
  type Role:enum = { Admin, Editor, Viewer }
  type Post:struct = {
    role:  Role oneOf([.Admin, .Editor]) req
    title: string req
  }
}
<program db="./db.sqlite">
  <schema>
    \${ schemaFor(Post) }
  </>
</program>
`;
    const { sfErrs, createStmt } = ddlFor(source, "c2/post.scrml");
    expect(sfErrs).toEqual([]);
    expect(createStmt).toBeDefined();
    expect(createStmt).toMatch(/CHECK \("?role"? IN \('Admin', 'Editor'\)\)/);
    // `req` → NOT NULL on the role column.
    expect(createStmt).toMatch(/"role"[^,]*NOT NULL/);
  });

  test("notIn-complement subset → CHECK (role IN ('Admin', 'Editor'))", () => {
    const source = `\${
  import { schemaFor } from 'scrml:data'
  type Role:enum = { Admin, Editor, Viewer }
  type Post:struct = {
    role:  Role notIn([.Viewer])
    title: string req
  }
}
<program db="./db.sqlite">
  <schema>
    \${ schemaFor(Post) }
  </>
</program>
`;
    const { sfErrs, createStmt } = ddlFor(source, "c3/post.scrml");
    expect(sfErrs).toEqual([]);
    expect(createStmt).toBeDefined();
    expect(createStmt).toMatch(/CHECK \("?role"? IN \('Admin', 'Editor'\)\)/);
    expect(createStmt).not.toContain("Viewer");
  });

  test("nullable subset (no req) → nullable CHECK (NO NOT NULL on role)", () => {
    const source = `\${
  import { schemaFor } from 'scrml:data'
  type Role:enum = { Admin, Editor, Viewer }
  type Post:struct = {
    role:  Role oneOf([.Admin, .Editor]) | not
    title: string req
  }
}
<program db="./db.sqlite">
  <schema>
    \${ schemaFor(Post) }
  </>
</program>
`;
    const { sfErrs, createStmt } = ddlFor(source, "c4/post.scrml");
    expect(sfErrs).toEqual([]);
    expect(createStmt).toBeDefined();
    expect(createStmt).toMatch(/CHECK \("?role"? IN \('Admin', 'Editor'\)\)/);
    // nullable: the role column must NOT carry NOT NULL.
    const roleSegment = createStmt.match(/"role"[^,]*/)?.[0] ?? "";
    expect(roleSegment).not.toContain("NOT NULL");
  });

  test("nullable subset WITH req (conflict) → nullable wins; req dropped; subset CHECK", () => {
    const source = `\${
  import { schemaFor } from 'scrml:data'
  type Role:enum = { Admin, Editor, Viewer }
  type Post:struct = {
    role:  Role oneOf([.Admin, .Editor]) req | not
    title: string req
  }
}
<program db="./db.sqlite">
  <schema>
    \${ schemaFor(Post) }
  </>
</program>
`;
    const { sfErrs, body, createStmt } = ddlFor(source, "c5/post.scrml");
    // §41.15.8a conflict resolution — nullable wins, no E-SCHEMAFOR-NO-SQL-MAPPING.
    expect(sfErrs).toEqual([]);
    expect(body).toContain(`oneOf(['Admin', 'Editor'])`);
    expect(createStmt).toBeDefined();
    expect(createStmt).toMatch(/CHECK \("?role"? IN \('Admin', 'Editor'\)\)/);
    const roleSegment = createStmt.match(/"role"[^,]*/)?.[0] ?? "";
    expect(roleSegment).not.toContain("NOT NULL");
  });
});

// ---------------------------------------------------------------------------
// §D — full-enum NON-REGRESSION (subset fix must not narrow full-enum fields).
// ---------------------------------------------------------------------------

describe("§D full-enum field non-regression", () => {
  test("full-enum field still emits ALL base variants", () => {
    const source = `\${
  import { schemaFor } from 'scrml:data'
  type Role:enum = { Admin, Editor, Viewer }
  type Post:struct = {
    role:  Role req
    title: string req
  }
}
<program db="./db.sqlite">
  <schema>
    \${ schemaFor(Post) }
  </>
</program>
`;
    const { sfErrs, body, createStmt } = ddlFor(source, "d1/post.scrml");
    expect(sfErrs).toEqual([]);
    expect(body).toContain(`oneOf(['Admin', 'Editor', 'Viewer'])`);
    expect(createStmt).toMatch(/CHECK \("?role"? IN \('Admin', 'Editor', 'Viewer'\)\)/);
  });

  test("payload-enum subset field still fires E-SCHEMAFOR-VARIANT-PAYLOAD-ENUM-V1", () => {
    // §53.15.5 — a subset over a payload-bearing enum STILL rejects SQL lowering;
    // the rejection is about the payload, orthogonal to the subset. Uses the
    // named-payload syntax (`Ok(value: string)`) — the canonical payload-variant
    // form the existing §8 schema-for test exercises.
    const source = `\${
  import { schemaFor } from 'scrml:data'
  type Result:enum = {
    Ok(value: string)
    Err(reason: string)
  }
  type Post:struct = {
    outcome: Result oneOf([.Ok])
    title:   string req
  }
}
<program db="./db.sqlite">
  <schema>
    \${ schemaFor(Post) }
  </>
</program>
`;
    const { tsResult } = compileToTS(source, "d2/post.scrml");
    const codes = realErrors(tsResult).map(e => e.code);
    expect(codes).toContain("E-SCHEMAFOR-VARIANT-PAYLOAD-ENUM-V1");
  });
});

// ---------------------------------------------------------------------------
// §E — Deliverable 3 CONFIRM — validator `.OneOfFailed(set)` carries the subset.
//
// Form (a) — state-cell validator `<role oneOf([.Admin, .Editor])>` — the arg
// IS the set; the emitted validity surface carries the SUBSET. (Confirmed via
// the empirical client-JS probe in the dispatch; here we assert the runtime
// fire function carries whatever set is passed.) Form (b) — a cell whose
// declared TYPE is a subset refinement — is enforced by §53.4 three-zone
// (E-CONTRACT-001), NOT the validity surface (§55 notes L30150-30154; "§53.15
// introduces no change to the validity surface"). No wiring needed — by design.
// ---------------------------------------------------------------------------

describe("§E validator .OneOfFailed(set) carries the subset (§55.9 — CONFIRM)", () => {
  test("fireOneOf carries the exact set passed (the subset, not the base enum)", async () => {
    const rv = await import("../../src/runtime-validators.js");
    // Out-of-subset value → OneOfFailed carrying the SUBSET that was passed.
    const fail = rv.fireOneOf("Viewer", ["Admin", "Editor"]);
    expect(fail).toEqual({ tag: "OneOfFailed", set: ["Admin", "Editor"] });
    // In-subset value → no error.
    expect(rv.fireOneOf("Admin", ["Admin", "Editor"])).toBeNull();
  });
});
