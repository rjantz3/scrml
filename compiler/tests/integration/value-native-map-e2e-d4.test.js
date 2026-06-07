/**
 * D4 — value-native map (§59) END-TO-END integration.
 *
 * Compiles a real .scrml file using a `[string: number]` map cell with .insert
 * (reassignment-canonical), a bracket-read `@m[k]` (-> V | not), `.size`, and
 * `<each in=@m.entries() as e>` iteration. Asserts:
 *   - NO codegen errors (the first real map compile)
 *   - emitted client JS is valid JS (node --check via vm)
 *   - all map operations lower to the `_scrml_map_*` runtime
 *   - the 'map' runtime chunk SURVIVES tree-shaking (helpers present in runtime)
 *   - the map operations produce CORRECT results when executed against the
 *     emitted runtime (insert + read-back + iterate + non-map degrade)
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import vm from "vm";

let TMP;

beforeAll(() => { TMP = mkdtempSync(join(tmpdir(), "map-e2e-")); });
afterAll(() => { if (TMP) rmSync(TMP, { recursive: true, force: true }); });

const SRC = `<div class="fare-board">
    \${
        <fareByLane>: [string: number] = [:]
        function addFare() {
            @fareByLane = @fareByLane.insert("DAL-001", 4500)
            @fareByLane = @fareByLane.insert("HOU-002", 3800)
        }
        function clearFares() {
            @fareByLane = [:]
        }
    }
    <h1>Fares by lane</>
    <p>Lanes: \${@fareByLane.size}</>
    <p>DAL-001: \${@fareByLane["DAL-001"]}</>
    <ul>
        <each in=@fareByLane.entries() as e>
            <li>\${e.key}: \${e.value}</li>
        </each>
    </ul>
    <button onclick=addFare()>Add</>
    <button onclick=clearFares()>Clear</>
</div>`;

function compileSample() {
  const filePath = join(TMP, "fares.scrml");
  writeFileSync(filePath, SRC);
  const outDir = join(TMP, "dist");
  const result = compileScrml({ inputFiles: [filePath], outputDir: outDir, write: true, log: () => {} });
  const errors = (result.errors || []).filter(e => e.severity == null || e.severity === "error");
  const clientJs = readFileSync(join(outDir, "fares.client.js"), "utf8");
  const runtimeFile = readdirSync(outDir).find(f => f.startsWith("scrml-runtime."));
  const runtimeJs = readFileSync(join(outDir, runtimeFile), "utf8");
  return { errors, clientJs, runtimeJs };
}

describe("§59 value-native map — END-TO-END", () => {
  let out;
  beforeAll(() => { out = compileSample(); });

  test("compiles with NO codegen errors", () => {
    expect(out.errors).toEqual([]);
  });

  test("emitted client JS is syntactically valid", () => {
    expect(() => new vm.Script(out.clientJs)).not.toThrow();
  });

  test("emitted runtime JS is syntactically valid", () => {
    expect(() => new vm.Script(out.runtimeJs)).not.toThrow();
  });

  test("map literal [:] lowers to _scrml_map_from_entries", () => {
    expect(out.clientJs).toContain("_scrml_map_from_entries([], false)");
  });

  test(".insert lowers to _scrml_map_insert via _scrml_reactive_set (reassignment-canonical)", () => {
    expect(out.clientJs).toMatch(/_scrml_reactive_set\("fareByLane", _scrml_map_insert\(_scrml_reactive_get\("fareByLane"\), "DAL-001", 4500\)\)/);
  });

  test("@m[k] bracket-read lowers to _scrml_map_get", () => {
    expect(out.clientJs).toContain('_scrml_map_get(_scrml_reactive_get("fareByLane"), "DAL-001")');
  });

  test("@m.size lowers to _scrml_map_size", () => {
    expect(out.clientJs).toContain('_scrml_map_size(_scrml_reactive_get("fareByLane"))');
  });

  test("<each in=@m.entries()> lowers to _scrml_map_entries", () => {
    expect(out.clientJs).toContain('_scrml_map_entries(_scrml_reactive_get("fareByLane"))');
  });

  test("the 'map' runtime chunk SURVIVES tree-shaking (helpers present)", () => {
    expect(out.runtimeJs).toContain("function _scrml_map_from_entries");
    expect(out.runtimeJs).toContain("function _scrml_map_get");
    expect(out.runtimeJs).toContain("function _scrml_map_entries");
    expect(out.runtimeJs).toContain("function _scrml_value_canonical");
  });

  test("map operations produce CORRECT results at runtime (insert + read-back + iterate + non-map degrade)", () => {
    // Extract each `function NAME(...) {...}` block (brace-matched) from the
    // emitted runtime and assemble a sandbox with the map helpers.
    function extractFn(src, name) {
      const i = src.indexOf("function " + name + "(");
      if (i < 0) return "";
      let depth = 0, k = src.indexOf("{", i);
      for (; k < src.length; k++) {
        if (src[k] === "{") depth++;
        else if (src[k] === "}") { depth--; if (depth === 0) { k++; break; } }
      }
      return src.slice(i, k) + "\n";
    }
    const names = [
      "_scrml_fnv1a", "_scrml_value_canonical", "_scrml_map_empty", "_scrml_map_clone",
      "_scrml_map_from_entries", "_scrml_map_set_inplace", "_scrml_map_get", "_scrml_map_size",
      "_scrml_map_key_order", "_scrml_map_insert", "_scrml_map_entries",
    ];
    let bundle = "";
    for (const n of names) bundle += extractFn(out.runtimeJs, n);
    bundle += "return { " + names.join(", ") + " };";
    const h = new Function(bundle)();

    let m = h._scrml_map_from_entries([], false);
    expect(h._scrml_map_size(m)).toBe(0);
    m = h._scrml_map_insert(m, "DAL-001", 4500);
    m = h._scrml_map_insert(m, "HOU-002", 3800);
    expect(h._scrml_map_size(m)).toBe(2);
    expect(h._scrml_map_get(m, "DAL-001")).toBe(4500);
    expect(h._scrml_map_get(m, "HOU-002")).toBe(3800);
    // key-miss -> null (= `not`)
    expect(h._scrml_map_get(m, "NOPE")).toBe(null);
    // iterate
    const seen = h._scrml_map_entries(m).map(e => `${e.key}=${e.value}`).sort();
    expect(seen).toEqual(["DAL-001=4500", "HOU-002=3800"]);
    // Q1 — non-map receiver degrades safely (no throw, returns null)
    expect(h._scrml_map_get(42, "k")).toBe(null);
    expect(h._scrml_map_get(undefined, "k")).toBe(null);
    // reassignment-canonical: overwrite produces a NEW map; original immutable
    const m2 = h._scrml_map_insert(m, "DAL-001", 9999);
    expect(h._scrml_map_get(m2, "DAL-001")).toBe(9999);
    expect(h._scrml_map_get(m, "DAL-001")).toBe(4500);
  });
});
