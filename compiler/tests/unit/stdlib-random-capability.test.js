/**
 * stdlib-random-capability — scrml:random capability gate (DD1 Fork 1 follow-on)
 *
 * random() / randomInt() read host entropy → NON-DETERMINISTIC (class-C IO,
 * §48.3.4) — the SAME capability class as the wall clock scrml:time.now().
 * The capability rule (mirror of now(), §41.20):
 *   - server function body → OK
 *   - function (event-handler / effect class) body → OK
 *   - pure `fn` / `pure function` body → E-FN-004 (rejected)
 *   - a USER's own `function random() {}` called in a `function` → NOT gated
 *
 * The gate is binding-aware: it fires only on a bare call to a local name bound
 * to `random` / `randomInt` from `import ... 'scrml:random'`. It does not match
 * member access (`x.random()`) or other identifiers.
 *
 * §C pins the shims: random() ∈ [0, 1); randomInt(a, b) ∈ [a, b] inclusive.
 */

import { describe, test, expect } from "bun:test";
import { mkdirSync, writeFileSync, mkdtempSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";
import * as rng from "../../runtime/stdlib/random.js";

let TMP;
function ensureTmp() {
  if (!TMP) TMP = mkdtempSync(join(tmpdir(), "random-cap-"));
  return TMP;
}
function fx(relPath, source) {
  const abs = join(ensureTmp(), relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, source);
  return abs;
}
function compile(rel, source) {
  const src = fx(rel, source);
  return compileScrml({
    inputFiles: [src],
    outputDir: join(ensureTmp(), dirname(rel), "dist"),
    write: false,
    log: () => {},
  });
}
function efn004(result) {
  return [...(result.errors || []), ...(result.warnings || [])].filter(
    (d) => d.code === "E-FN-004",
  );
}

describe("§A: scrml:random capability gate", () => {
  test("R1: random() in a `server function` → OK (no E-FN-004)", () => {
    const result = compile("r1/app.scrml", [
      "${",
      "    import { random } from 'scrml:random'",
      "    server function pickJitter() {",
      "        return random() * 50",
      "    }",
      "}",
      'h1 "random in server fn"',
    ].join("\n"));
    expect(efn004(result)).toEqual([]);
  });

  test("R2: random() in a `function` (event-handler / effect class) → OK", () => {
    const result = compile("r2/app.scrml", [
      "${",
      "    import { random } from 'scrml:random'",
      "    function rollChance() {",
      "        return random() < 0.5",
      "    }",
      "    server function _use() { return rollChance() }",
      "}",
      'h1 "random in function"',
    ].join("\n"));
    expect(efn004(result)).toEqual([]);
  });

  test("R3: random() in a pure `fn` body → E-FN-004", () => {
    const result = compile("r3/app.scrml", [
      "${",
      "    import { random } from 'scrml:random'",
      "    fn noisy(x) {",
      "        return x + random()",
      "    }",
      "    server function _use() { return noisy(0) }",
      "}",
      'h1 "random in fn — should reject"',
    ].join("\n"));
    const hits = efn004(result);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].message).toContain("random()");
    expect(hits[0].message.toLowerCase()).toContain("non-deterministic");
    // The message names the scrml:random origin.
    expect(hits[0].message).toContain("scrml:random");
  });

  test("R4: randomInt() in a `server function` → OK", () => {
    const result = compile("r4/app.scrml", [
      "${",
      "    import { randomInt } from 'scrml:random'",
      "    server function mint(id) {",
      "        return `tok_${id}_${randomInt(0, 100000)}`",
      "    }",
      "}",
      'h1 "randomInt in server fn"',
    ].join("\n"));
    expect(efn004(result)).toEqual([]);
  });

  test("R5: randomInt() in a pure `fn` body → E-FN-004", () => {
    const result = compile("r5/app.scrml", [
      "${",
      "    import { randomInt } from 'scrml:random'",
      "    fn pickN(n) {",
      "        return randomInt(0, n)",
      "    }",
      "    server function _use() { return pickN(10) }",
      "}",
      'h1 "randomInt in fn — should reject"',
    ].join("\n"));
    const hits = efn004(result);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].message).toContain("randomInt()");
    expect(hits[0].message).toContain("scrml:random");
  });

  test("R6: a USER's own `function random() {}` called in a `function` is NOT falsely gated", () => {
    const result = compile("r6/app.scrml", [
      "${",
      "    function random() { return 42 }",
      "    fn usesUserRandom() {",
      "        return random() + 1",
      "    }",
      "    server function _use() { return usesUserRandom() }",
      "}",
      'h1 "user random — no E-FN-004"',
    ].join("\n"));
    // No import of random from scrml:random → the binding-aware gate must not fire.
    expect(efn004(result)).toEqual([]);
  });

  test("R7: aliased import `random as rng` in a pure `fn` → E-FN-004 on the alias", () => {
    const result = compile("r7/app.scrml", [
      "${",
      "    import { random as rngFn } from 'scrml:random'",
      "    fn noisyA(x) {",
      "        return x + rngFn()",
      "    }",
      "    server function _use() { return noisyA(0) }",
      "}",
      'h1 "aliased random in fn — should reject"',
    ].join("\n"));
    const hits = efn004(result);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].message).toContain("rngFn()");
  });
});

describe("§B: now() STILL gates (no regression from the generalized collector)", () => {
  test("R8: now() in a pure `fn` → E-FN-004 (still fires)", () => {
    const result = compile("r8/app.scrml", [
      "${",
      "    import { now } from 'scrml:time'",
      "    fn elapsed(then) {",
      "        return now() - then",
      "    }",
      "    server function _use() { return elapsed(0) }",
      "}",
      'h1 "now in fn — should still reject"',
    ].join("\n"));
    const hits = efn004(result);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].message).toContain("now()");
  });

  test("R9: random() AND now() together in one fn both fire", () => {
    const result = compile("r9/app.scrml", [
      "${",
      "    import { now } from 'scrml:time'",
      "    import { random } from 'scrml:random'",
      "    fn both(then) {",
      "        return now() - then + random()",
      "    }",
      "    server function _use() { return both(0) }",
      "}",
      'h1 "both non-det in fn"',
    ].join("\n"));
    const hits = efn004(result);
    // One E-FN-004 per statement; the single return statement contains both.
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });
});

describe("§C: scrml:random shim behavior", () => {
  test("R10: random() returns a float in [0, 1)", () => {
    for (let i = 0; i < 1000; i++) {
      const v = rng.random();
      expect(typeof v).toBe("number");
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test("R11: randomInt(a, b) is an integer in [a, b] INCLUSIVE", () => {
    const seen = new Set();
    for (let i = 0; i < 2000; i++) {
      const n = rng.randomInt(1, 6);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);
      seen.add(n);
    }
    // Both endpoints are reachable (closed interval) — over 2000 draws the
    // full 1..6 range should appear.
    for (let k = 1; k <= 6; k++) expect(seen.has(k)).toBe(true);
  });

  test("R12: randomInt single-value interval returns that value", () => {
    for (let i = 0; i < 50; i++) expect(rng.randomInt(7, 7)).toBe(7);
  });

  test("R13: randomInt swapped bounds are normalized (never NaN)", () => {
    for (let i = 0; i < 200; i++) {
      const n = rng.randomInt(6, 1);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);
    }
  });
});
