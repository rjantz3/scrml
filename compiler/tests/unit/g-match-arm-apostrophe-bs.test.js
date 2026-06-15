/**
 * g-match-arm-apostrophe-bs (S195 MED / S196 prereq-bug Bucket 2)
 *
 * An apostrophe (or any quote char) in `<match>`-arm FREE-TEXT PROSE broke the
 * block-splitter / arm-closer scanning at TWO pipeline stages, both treating a
 * lone markup-text `'` / `"` as a string-span DELIMITER:
 *
 *   1. block-splitter.js `findStructuralBodyEnd` (the STRUCTURAL_RAW_BODY scan
 *      for match / each bodies): a `'` in arm prose (`<Failed> <p>We'll try
 *      again later.</p> </>`) opened a phantom string that consumed the `</p>` /
 *      `</>` closers through to EOF → the body tag-stack never unwound → a
 *      misleading E-CTX-001/003 "Unclosed <match>".
 *   2. match-statechild-parser.ts `findArmCloser` / `findNextArmOpener`: the
 *      OUTER (text-level) scans tracked the same phantom string → the arm's
 *      closer was mis-consumed → a misleading E-MATCH-PARSE-001.
 *
 * Fix: per the S109 locus ruling (bug-4 deep-dive), markup-text body is TEXT
 * with no string concept — strings live in LOGIC context (`${...}`, opaque) and
 * in ATTRIBUTE VALUES (handled with local quote-state inside the opener scan).
 * Both text-level scans now leave a markup-text quote as prose. The control
 * (`We will`, no apostrophe) compiled clean before and after.
 *
 * Direct `parseMatchArms` API tests (the arm-closer scan) + full-pipeline tests
 * (the block-splitter scan) — both stages must be exercised.
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { parseMatchArms } from "../../src/match-statechild-parser.ts";
import { writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function compileSrc(src, baseName) {
  const tmp = join(tmpdir(), `scrml-g-maab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(tmp, { recursive: true });
  const srcFile = join(tmp, `${baseName}.scrml`);
  writeFileSync(srcFile, src);
  const outDir = join(tmp, "dist");
  mkdirSync(outDir, { recursive: true });
  const result = compileScrml({ inputFiles: [srcFile], outputDir: outDir });
  let clientJs = "";
  try { clientJs = readFileSync(join(outDir, `${baseName}.client.js`), "utf8"); } catch { /* compile failed */ }
  return { result, clientJs, cleanup: () => rmSync(tmp, { recursive: true, force: true }) };
}

const errorCodes = (result) => (result.errors || []).map((e) => e.code);

// ---------------------------------------------------------------------------
// §1: parseMatchArms — apostrophe in arm prose parses cleanly (arm-closer scan)
// ---------------------------------------------------------------------------

describe("g-match-arm-apostrophe-bs §1: parseMatchArms (arm-closer / opener scans)", () => {
  test("contraction `We'll` in arm prose — arm closes correctly", () => {
    const r = parseMatchArms(`<Editing> : "e"\n<Failed><p>We'll try again later.</p></Failed>`);
    expect(r.diagnostics.length).toBe(0);
    expect(r.arms.length).toBe(2);
    expect(r.arms[1].variantName).toBe("Failed");
    expect(r.arms[1].bodyRaw).toContain("We'll try again later.");
  });

  test("possessive apostrophe + double-quote prose in arm body — arm closes", () => {
    const r = parseMatchArms(`<Failed><p>The server's reply was "no".</p></>`);
    expect(r.diagnostics.length).toBe(0);
    expect(r.arms.length).toBe(1);
    expect(r.arms[0].bodyRaw).toContain(`The server's reply was "no".`);
  });

  test("apostrophe does NOT eat the next arm opener", () => {
    const r = parseMatchArms(
      `<Failed><p>Couldn't load.</p></Failed>\n<Editing><p>Didn't save.</p></Editing>`,
    );
    expect(r.diagnostics.length).toBe(0);
    expect(r.arms.length).toBe(2);
    expect(r.arms[0].variantName).toBe("Failed");
    expect(r.arms[1].variantName).toBe("Editing");
  });

  test("control: `We will` (no apostrophe) parses clean (unchanged)", () => {
    const r = parseMatchArms(`<Failed><p>We will try again later.</p></>`);
    expect(r.diagnostics.length).toBe(0);
    expect(r.arms.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §2: full-pipeline — block-splitter findStructuralBodyEnd no longer breaks
// ---------------------------------------------------------------------------

describe("g-match-arm-apostrophe-bs §2: full-pipeline (block-splitter body scan)", () => {
  const src = (failProse) => [
    "<program>",
    "  ${",
    "    type Phase:enum = { Editing, Failed }",
    "    <phase>: Phase = .Editing",
    "  }",
    "  <div>",
    "    <match for=Phase on=@phase>",
    "      <Editing>",
    "        <p>Edit your form.</p>",
    "      </>",
    "      <Failed>",
    `        <p>${failProse}</p>`,
    "      </>",
    "    </>",
    "  </div>",
    "</program>",
  ].join("\n");

  test("apostrophe arm prose compiles without E-CTX-001/003 or E-MATCH-PARSE-001", () => {
    const { result, cleanup } = compileSrc(src("We'll try again later."), "maab-pipeline-1");
    const codes = errorCodes(result);
    expect(codes).not.toContain("E-CTX-001");
    expect(codes).not.toContain("E-CTX-003");
    expect(codes).not.toContain("E-MATCH-PARSE-001");
    cleanup();
  });

  test("the Failed-arm prose (apostrophe intact) reaches the emitted output", () => {
    const { clientJs, cleanup } = compileSrc(src("We'll try again later."), "maab-pipeline-2");
    expect(clientJs).toContain("We'll try again later.");
    cleanup();
  });

  test("control `We will` compiles clean too (unchanged)", () => {
    const { result, cleanup } = compileSrc(src("We will try again later."), "maab-pipeline-3");
    const codes = errorCodes(result);
    expect(codes).not.toContain("E-CTX-001");
    expect(codes).not.toContain("E-CTX-003");
    expect(codes).not.toContain("E-MATCH-PARSE-001");
    cleanup();
  });
});

// ---------------------------------------------------------------------------
// §3: NEGATIVE — a genuinely-unclosed arm still fires E-MATCH-PARSE-001
//     (the unclosed-arm detector was NOT weakened by the quote-skip removal)
// ---------------------------------------------------------------------------

describe("g-match-arm-apostrophe-bs §3: unclosed-arm detector not weakened", () => {
  test("a genuinely-unclosed non-void arm still surfaces a diagnostic", () => {
    // `<Failed>` opened with a contraction in prose but NO closer — must still
    // be flagged (not silently swallowed by a phantom string span).
    const r = parseMatchArms(`<Failed><p>We'll keep waiting...`);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
});
