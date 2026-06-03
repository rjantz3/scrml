/**
 * enum-subset-match-exhaustiveness-da-b2.test.js
 *
 * S156 (d)-A batch 2 — match exhaustiveness narrows to the enum subset
 * (SPEC §18.8.1 JS-style + §18.0.1 block-form + §53.15.4 Option A).
 *
 * Builds on batch-1 (`bfc50545`) which materialized `PredicatedType.enumBase`
 * + `subsetVariants`. Batch 2 makes the exhaustiveness checks at BOTH match
 * loci read the SUBSET variant set when the matched value's DECLARED type is an
 * enum-subset refinement (`Enum oneOf([…])` / `notIn([…])`):
 *
 *   - A `match` / `<match>` covering exactly the subset is exhaustive — no
 *     `else`/`_` / `<_>` required.
 *   - SF-1 dead-arm: a concrete arm naming a base variant EXCLUDED by the
 *     subset → E-MATCH-SUBSET-DEAD-ARM (names the excluded variant + subset).
 *     DISTINCT from E-TYPE-023 (duplicate arm).
 *   - SF-1 vacuous-else: a wildcard over a fully-covered subset → W-MATCH-001.
 *   - Full-enum (non-subset) matches are UNCHANGED — still require all base
 *     variants (E-TYPE-020 / E-MATCH-NOT-EXHAUSTIVE).
 *
 * Coverage:
 *   §1  JS-style — subset match exhaustive WITHOUT else (clean)
 *   §2  JS-style — dead arm → E-MATCH-SUBSET-DEAD-ARM (names excluded + subset)
 *   §3  JS-style — vacuous else → W-MATCH-001
 *   §4  JS-style — full-enum still requires all variants (no regression)
 *   §5  JS-style — notIn complement narrows correctly
 *   §6  Block-form — subset <match> exhaustive WITHOUT <_> (clean)
 *   §7  Block-form — dead <Variant> arm → E-MATCH-SUBSET-DEAD-ARM
 *   §8  Block-form — vacuous <_> → W-MATCH-001
 *   §9  Block-form — full-enum still requires all variants (no regression)
 *   §10 Block-form — notIn complement narrows correctly
 *   §11 Edge cases — derived-cell / bound-value read the DECLARED subset
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/enum-subset-match-da-b2");
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
// result.errors. A code-presence assertion MUST scan both streams (the
// diagnostic-stream-partition trap).
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

// ---------------------------------------------------------------------------
// §1-§5 — JS-style match (§18.8.1). Canonical locus: `let x = match s {…}`
// inside a ${…} logic block (the form gauntlet-s19 exercises).
// ---------------------------------------------------------------------------

describe("§1 JS-style subset match exhaustive WITHOUT else", () => {
  test("oneOf([.Admin,.Editor]) covered by .Admin/.Editor → no E-TYPE-020", () => {
    const r = compile(`\${
${ROLE}
let s: Role oneOf([.Admin, .Editor]) = .Admin
let x = match s {
    .Admin :> 1
    .Editor :> 2
}
log(x)
function log(n: number) { let _ = n }
}
<program><p>ok</></>
`);
    expect(findDiagnostic(r, "E-TYPE-020")).toBeNull();
    expect(findDiagnostic(r, "E-MATCH-SUBSET-DEAD-ARM")).toBeNull();
    expect(findDiagnostic(r, "W-MATCH-001")).toBeNull();
  });
});

describe("§2 JS-style dead arm → E-MATCH-SUBSET-DEAD-ARM", () => {
  test(".Viewer arm over oneOf([.Admin,.Editor]) fires; names excluded variant + subset", () => {
    const r = compile(`\${
${ROLE}
let s: Role oneOf([.Admin, .Editor]) = .Admin
let x = match s {
    .Admin :> 1
    .Editor :> 2
    .Viewer :> 3
}
log(x)
function log(n: number) { let _ = n }
}
<program><p>ok</></>
`);
    const d = findDiagnostic(r, "E-MATCH-SUBSET-DEAD-ARM");
    expect(d).not.toBeNull();
    expect(d.message).toContain(".Viewer");
    expect(d.message).toContain(".Admin");
    expect(d.message).toContain(".Editor");
    // NOT a duplicate-arm misclassification.
    expect(findDiagnostic(r, "E-TYPE-023")).toBeNull();
  });
});

describe("§3 JS-style vacuous else → W-MATCH-001", () => {
  test("else over fully-covered subset fires W-MATCH-001", () => {
    const r = compile(`\${
${ROLE}
let s: Role oneOf([.Admin, .Editor]) = .Admin
let x = match s {
    .Admin :> 1
    .Editor :> 2
    else :> 99
}
log(x)
function log(n: number) { let _ = n }
}
<program><p>ok</></>
`);
    expect(findDiagnostic(r, "W-MATCH-001")).not.toBeNull();
  });
});

describe("§4 JS-style full-enum still requires all variants (no regression)", () => {
  test("Role (full) match missing .Viewer → E-TYPE-020", () => {
    const r = compile(`\${
${ROLE}
let s: Role = .Admin
let x = match s {
    .Admin :> 1
    .Editor :> 2
}
log(x)
function log(n: number) { let _ = n }
}
<program><p>ok</></>
`);
    const d = findDiagnostic(r, "E-TYPE-020");
    expect(d).not.toBeNull();
    expect(d.message).toContain("::Viewer");
  });
});

describe("§5 JS-style notIn complement narrows correctly", () => {
  test("notIn([.Viewer]) → {Admin,Editor}; covered → clean", () => {
    const r = compile(`\${
${ROLE}
let s: Role notIn([.Viewer]) = .Admin
let x = match s {
    .Admin :> 1
    .Editor :> 2
}
log(x)
function log(n: number) { let _ = n }
}
<program><p>ok</></>
`);
    expect(findDiagnostic(r, "E-TYPE-020")).toBeNull();
    expect(findDiagnostic(r, "E-MATCH-SUBSET-DEAD-ARM")).toBeNull();
  });

  test("notIn([.Viewer]) with a .Viewer arm → E-MATCH-SUBSET-DEAD-ARM", () => {
    const r = compile(`\${
${ROLE}
let s: Role notIn([.Viewer]) = .Admin
let x = match s {
    .Admin :> 1
    .Editor :> 2
    .Viewer :> 3
}
log(x)
function log(n: number) { let _ = n }
}
<program><p>ok</></>
`);
    const d = findDiagnostic(r, "E-MATCH-SUBSET-DEAD-ARM");
    expect(d).not.toBeNull();
    expect(d.message).toContain(".Viewer");
  });
});

// ---------------------------------------------------------------------------
// §6-§10 — Block-form `<match for=Type on=@subsetCell>` (§18.0.1).
// `for=Type` stays the BASE enum (arm-tag inference); `on=@cell`'s declared
// type carries the subset.
// ---------------------------------------------------------------------------

const BF_HEAD = `\${ ${ROLE} @role: Role oneOf([.Admin, .Editor]) = .Admin }`;

describe("§6 block-form subset match exhaustive WITHOUT <_>", () => {
  test("covered by <Admin>/<Editor> → no E-MATCH-NOT-EXHAUSTIVE", () => {
    const r = compile(`${BF_HEAD}
<program>
<match for=Role on=@role>
    <Admin> : <p>admin</p>
    <Editor> : <p>editor</p>
</match>
</>
`, "bf6.scrml");
    expect(findDiagnostic(r, "E-MATCH-NOT-EXHAUSTIVE")).toBeNull();
    expect(findDiagnostic(r, "E-MATCH-SUBSET-DEAD-ARM")).toBeNull();
    expect(findDiagnostic(r, "W-MATCH-001")).toBeNull();
  });
});

describe("§7 block-form dead <Viewer> arm → E-MATCH-SUBSET-DEAD-ARM", () => {
  test("names the excluded variant + the subset", () => {
    const r = compile(`${BF_HEAD}
<program>
<match for=Role on=@role>
    <Admin> : <p>admin</p>
    <Editor> : <p>editor</p>
    <Viewer> : <p>viewer</p>
</match>
</>
`, "bf7.scrml");
    const d = findDiagnostic(r, "E-MATCH-SUBSET-DEAD-ARM");
    expect(d).not.toBeNull();
    expect(d.message).toContain("Viewer");
    expect(d.message).toContain(".Admin");
    expect(d.message).toContain(".Editor");
  });
});

describe("§8 block-form vacuous <_> → W-MATCH-001", () => {
  test("<_> over fully-covered subset fires W-MATCH-001", () => {
    const r = compile(`${BF_HEAD}
<program>
<match for=Role on=@role>
    <Admin> : <p>admin</p>
    <Editor> : <p>editor</p>
    <_> : <p>other</p>
</match>
</>
`, "bf8.scrml");
    expect(findDiagnostic(r, "W-MATCH-001")).not.toBeNull();
    // Subset fully covered → exhaustiveness is satisfied, no missing error.
    expect(findDiagnostic(r, "E-MATCH-NOT-EXHAUSTIVE")).toBeNull();
  });
});

describe("§9 block-form full-enum still requires all variants (no regression)", () => {
  test("@role: Role (full) missing .Viewer → E-MATCH-NOT-EXHAUSTIVE", () => {
    const r = compile(`\${ ${ROLE} @role: Role = .Admin }
<program>
<match for=Role on=@role>
    <Admin> : <p>admin</p>
    <Editor> : <p>editor</p>
</match>
</>
`, "bf9.scrml");
    const d = findDiagnostic(r, "E-MATCH-NOT-EXHAUSTIVE");
    expect(d).not.toBeNull();
    expect(d.message).toContain("Viewer");
  });
});

describe("§10 block-form notIn complement narrows correctly", () => {
  test("notIn([.Viewer]) → {Admin,Editor}; covered → clean", () => {
    const r = compile(`\${ ${ROLE} @role: Role notIn([.Viewer]) = .Admin }
<program>
<match for=Role on=@role>
    <Admin> : <p>admin</p>
    <Editor> : <p>editor</p>
</match>
</>
`, "bf10.scrml");
    expect(findDiagnostic(r, "E-MATCH-NOT-EXHAUSTIVE")).toBeNull();
    expect(findDiagnostic(r, "E-MATCH-SUBSET-DEAD-ARM")).toBeNull();
  });

  test("notIn([.Viewer]) missing .Editor → narrowed E-MATCH-NOT-EXHAUSTIVE", () => {
    const r = compile(`\${ ${ROLE} @role: Role notIn([.Viewer]) = .Admin }
<program>
<match for=Role on=@role>
    <Admin> : <p>admin</p>
</match>
</>
`, "bf10b.scrml");
    const d = findDiagnostic(r, "E-MATCH-NOT-EXHAUSTIVE");
    expect(d).not.toBeNull();
    expect(d.message).toContain(".Editor");
    // The narrowed message does NOT demand the excluded .Viewer.
    expect(d.message).not.toContain(".Viewer");
  });
});

// ---------------------------------------------------------------------------
// §11 — Edge cases (§18.8.1): V always read from the matched value's DECLARED
// type. Derived-const cell + bound-value forms.
// ---------------------------------------------------------------------------

describe("§11 edge cases read the DECLARED subset type", () => {
  test("derived const cell carrying the subset → exhaustive without else", () => {
    const r = compile(`\${
${ROLE}
const s: Role oneOf([.Admin, .Editor]) = .Admin
let x = match s {
    .Admin :> 1
    .Editor :> 2
}
log(x)
function log(n: number) { let _ = n }
}
<program><p>ok</></>
`, "edge-const.scrml");
    expect(findDiagnostic(r, "E-TYPE-020")).toBeNull();
  });

  test("derived const cell — dead arm still fires (declared subset narrows)", () => {
    const r = compile(`\${
${ROLE}
const s: Role oneOf([.Admin, .Editor]) = .Admin
let x = match s {
    .Admin :> 1
    .Editor :> 2
    .Viewer :> 3
}
log(x)
function log(n: number) { let _ = n }
}
<program><p>ok</></>
`, "edge-const-dead.scrml");
    expect(findDiagnostic(r, "E-MATCH-SUBSET-DEAD-ARM")).not.toBeNull();
  });
});
