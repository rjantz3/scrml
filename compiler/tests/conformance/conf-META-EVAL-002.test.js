/**
 * CONF-META-EVAL-002 | §34 / §22.4
 *
 * Catalog: E-META-EVAL-002 — Re-parsing the code emitted by a `^{}` meta
 * block failed.
 *
 * Firing site: meta-eval.ts:375, 385 (reparseEmitted). When `emit(...)` in a
 * `^{}` meta block produces a string that the BS+TAB pipeline fails to parse,
 * each downstream parse error is mapped to a single E-META-EVAL-002.
 */
import { describe, test, expect } from "bun:test";
import { resolve, dirname } from "path";
import { writeFileSync, rmSync, existsSync, mkdirSync } from "fs";
import { compileScrml } from "../../src/api.js";

const testDir = dirname(new URL(import.meta.url).pathname);
let _tmp = 0;

function compile(source, slug) {
  const name = `${slug}-${++_tmp}`;
  const tmpDir = resolve(testDir, `_tmp_${name}`);
  const tmpInput = resolve(tmpDir, `${name}.scrml`);
  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(tmpInput, source);
  try {
    const result = compileScrml({ inputFiles: [tmpInput], write: false, outputDir: resolve(tmpDir, "out") });
    return { errors: result.errors ?? [] };
  } finally {
    if (existsSync(tmpInput)) rmSync(tmpInput);
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe("CONF-META-EVAL-002: meta-block emits invalid scrml", () => {
  test('POS: meta block emits markup with an invalid attribute value fires E-META-EVAL-002', () => {
    // emit("<p if=>broken</>") — the resulting attribute value is illegal,
    // so the downstream BS+TAB re-parse raises an attribute-shape error
    // which reparseEmitted surfaces as E-META-EVAL-002.
    const src = `^{
    emit("<p if=>broken</>")
}
<p>x</>`;
    const { errors } = compile(src, "metaeval002-pos");
    expect(errors.some(e => e.code === "E-META-EVAL-002")).toBe(true);
  });

  test("NEG: meta block emits valid scrml does NOT fire E-META-EVAL-002", () => {
    const src = `^{
    emit("<p>hello</>")
}
<p>x</>`;
    const { errors } = compile(src, "metaeval002-neg");
    expect(errors.some(e => e.code === "E-META-EVAL-002")).toBe(false);
  });
});
