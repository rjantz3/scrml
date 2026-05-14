/**
 * Reachability Record — Determinism + Canonical-Ordering Tests
 *
 * A-2.8 (S91) — `--emit-reachability` JSON serializer hardening per
 * SPEC §40.9.8 (Determinism preservation) + §47 (Output Name Encoding)
 * + PIPELINE Stage 7.6 line 2391 ("Determinism: same input produces
 * identical ReachabilityRecord").
 *
 * **Bit-identical invariant:** for any logically-equal pair of
 * `ReachabilityRecord` values, `serializeReachabilityRecord` returns
 * byte-identical UTF-8 strings — regardless of Map/Set insertion order
 * in the inputs, JS-engine version, or host Map iteration semantics.
 *
 * Test coverage (mapped to A-2.8 brief sub-task 2):
 *   §1  Bit-identical across two solver runs on identical input.
 *   §2  Bit-identical across ten solver runs — defence-in-depth.
 *   §3  Mixed-shape Set sort stability — numbers vs strings vs composite.
 *   §4  Diagnostic canonical sort — insertion-order-independent.
 *   §5  Worked-example replay × 5 — pipeline-level determinism.
 *   §6  `--emit-reachability` CLI file-write determinism (two-dir diff).
 *   §7  Empty record canonical shape — stable across factory invocations.
 *   §8  Empty-string-as-absent-sentinel ordering — diagnostic optionals.
 *   §9  Numeric NodeId vs string NodeId stratification.
 *   §10 Map-vs-object key order independence — same input via two Maps
 *       constructed with reversed insertion order.
 *
 * Spec authority:
 *   - SPEC §40.9.8 (line 17794) — determinism preservation
 *   - SPEC §47 — output name encoding (depends on §40.9.8)
 *   - PIPELINE Stage 7.6 line 2391-2396 — determinism invariant
 *   - docs/changes/a-2-8-emit-reachability-canonical/BRIEF.md
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  runReachabilitySolver,
  serializeReachabilityRecord,
} from "../../src/reachability-solver.ts";
import { emptyReachabilityRecord } from "../../src/types/reachability.ts";
import { compileScrml } from "../../src/api.js";
import { spawnSync } from "node:child_process";
import {
  writeFileSync,
  readFileSync,
  mkdtempSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

/**
 * Build a synthetic ReachabilityRecord with the supplied entry-point /
 * role / ChunkContents shape. Used by §3, §4, §7-§10 to exercise the
 * serializer directly without invoking the full pipeline (which would
 * couple determinism tests to upstream solver behaviour).
 */
function makeRecord(spec) {
  const record = emptyReachabilityRecord();
  for (const [epId, byRoleSpec] of spec.closures ?? []) {
    const byRole = new Map();
    for (const [role, plan] of byRoleSpec) {
      byRole.set(role, plan);
    }
    record.closures.set(epId, { byRole });
  }
  for (const d of spec.diagnostics ?? []) {
    record.diagnostics.push(d);
  }
  return record;
}

function emptyChunkContents() {
  return {
    componentNodeIds: new Set(),
    reactiveCellNodeIds: new Set(),
    serverFnNodeIds: new Set(),
    vendorUnitNames: new Set(),
  };
}

function chunkPlanWith(initialMembers) {
  const ic = emptyChunkContents();
  for (const m of initialMembers.componentNodeIds ?? []) ic.componentNodeIds.add(m);
  for (const m of initialMembers.reactiveCellNodeIds ?? []) ic.reactiveCellNodeIds.add(m);
  for (const m of initialMembers.serverFnNodeIds ?? []) ic.serverFnNodeIds.add(m);
  for (const m of initialMembers.vendorUnitNames ?? []) ic.vendorUnitNames.add(m);
  return {
    initialChunk: ic,
    prefetchTier1: emptyChunkContents(),
    prefetchTier2: emptyChunkContents(),
    prefetchTierN: [],
  };
}

// ---------------------------------------------------------------------------
// §1 — Bit-identical across two runs (synthetic-record path)
// ---------------------------------------------------------------------------

describe("§1 Bit-identical across two solver runs (synthetic)", () => {
  test("two solver runs on identical input → byte-identical JSON", () => {
    const input = { depGraph: { nodes: new Map(), edges: [] } };
    const json1 = serializeReachabilityRecord(runReachabilitySolver(input).record);
    const json2 = serializeReachabilityRecord(runReachabilitySolver(input).record);
    expect(json1).toBe(json2);
  });

  test("two empty-record serializations → byte-identical", () => {
    const j1 = serializeReachabilityRecord(emptyReachabilityRecord());
    const j2 = serializeReachabilityRecord(emptyReachabilityRecord());
    expect(j1).toBe(j2);
  });
});

// ---------------------------------------------------------------------------
// §2 — Bit-identical across ten runs (defence-in-depth)
// ---------------------------------------------------------------------------

describe("§2 Bit-identical across ten solver invocations", () => {
  test("10 runs on the same trivial pipeline produce 10 byte-identical JSON outputs", () => {
    const dir = mkdtempSync(join(tmpdir(), "rs-det-x10-"));
    try {
      const src = join(dir, "trivial.scrml");
      writeFileSync(src, "<program>\n  <body>\n    hello\n  </body>\n</program>\n");
      const outputs = [];
      for (let i = 0; i < 10; i++) {
        const result = compileScrml({
          inputFiles: [src],
          outputDir: dir,
          write: false,
          log: () => {},
        });
        outputs.push(result.reachabilityRecordJson());
      }
      // Every pair byte-identical — Map iteration order in V8/Bun is
      // implementation-defined; the canonical serializer must
      // neutralize it.
      for (let i = 1; i < outputs.length; i++) {
        expect(outputs[i]).toBe(outputs[0]);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// §3 — Mixed-shape Set sort stability
// ---------------------------------------------------------------------------

describe("§3 Mixed-shape Set sort stability (structured vs naive comparator)", () => {
  test("numeric NodeIds sort numerically — `7` before `42`, not lexicographic", () => {
    const record = makeRecord({
      closures: [
        [
          "ep-1",
          [
            [
              "_anonymous",
              chunkPlanWith({ componentNodeIds: [42, 7, 100, 5, 1] }),
            ],
          ],
        ],
      ],
    });
    const parsed = JSON.parse(serializeReachabilityRecord(record));
    const ids =
      parsed.closures["ep-1"].byRole["_anonymous"].initialChunk.componentNodeIds;
    expect(ids).toEqual([1, 5, 7, 42, 100]);
  });

  test("string NodeIds sort by codepoint — `app.scrml:7` before `app.scrml:42` lexicographically (string class)", () => {
    // Within the string stratum, lexicographic codepoint sort governs.
    // "7" > "4" by codepoint, so "app.scrml:42" < "app.scrml:7".
    const record = makeRecord({
      closures: [
        [
          "ep-1",
          [
            [
              "_anonymous",
              chunkPlanWith({
                componentNodeIds: [
                  "app.scrml:7",
                  "app.scrml:42",
                  "app.scrml:100",
                ],
              }),
            ],
          ],
        ],
      ],
    });
    const parsed = JSON.parse(serializeReachabilityRecord(record));
    const ids =
      parsed.closures["ep-1"].byRole["_anonymous"].initialChunk.componentNodeIds;
    // Codepoint order: "app.scrml:100" < "app.scrml:42" < "app.scrml:7"
    expect(ids).toEqual(["app.scrml:100", "app.scrml:42", "app.scrml:7"]);
  });

  test("mixed numbers + strings — numbers stratum BEFORE strings stratum", () => {
    const record = makeRecord({
      closures: [
        [
          "ep-1",
          [
            [
              "_anonymous",
              chunkPlanWith({ componentNodeIds: ["beta", 42, "alpha", 7] }),
            ],
          ],
        ],
      ],
    });
    const parsed = JSON.parse(serializeReachabilityRecord(record));
    const ids =
      parsed.closures["ep-1"].byRole["_anonymous"].initialChunk.componentNodeIds;
    // numbers 7, 42, then strings "alpha", "beta"
    expect(ids).toEqual([7, 42, "alpha", "beta"]);
  });

  test("Set insertion order does NOT affect serialized output", () => {
    const a = makeRecord({
      closures: [
        [
          "ep-1",
          [
            ["_anonymous", chunkPlanWith({ componentNodeIds: [1, 2, 3] })],
          ],
        ],
      ],
    });
    const b = makeRecord({
      closures: [
        [
          "ep-1",
          [
            ["_anonymous", chunkPlanWith({ componentNodeIds: [3, 1, 2] })],
          ],
        ],
      ],
    });
    expect(serializeReachabilityRecord(a)).toBe(serializeReachabilityRecord(b));
  });
});

// ---------------------------------------------------------------------------
// §4 — Diagnostic canonical sort
// ---------------------------------------------------------------------------

describe("§4 Diagnostic array canonical ordering", () => {
  test("diagnostics inserted out of order serialize in canonical order — keyed by (code, severity, entryPoint, role, message)", () => {
    const record = emptyReachabilityRecord();
    // Insert in reverse order — canonical serializer must reorder.
    record.diagnostics.push({
      code: "W-AUTH-RUNTIME-FALLBACK",
      severity: "info",
      message: "fallback at page B",
      entryPoint: "page-B",
      role: "admin",
    });
    record.diagnostics.push({
      code: "E-CLOSURE-001",
      severity: "error",
      message: "non-termination at ep-1",
      entryPoint: "ep-1",
      role: "user",
    });
    record.diagnostics.push({
      code: "E-CLOSURE-001",
      severity: "error",
      message: "non-termination at ep-1",
      entryPoint: "ep-1",
      role: "admin",
    });
    record.diagnostics.push({
      code: "E-CLOSURE-002",
      severity: "error",
      message: "no role enum",
    });

    const json = serializeReachabilityRecord(record);
    const parsed = JSON.parse(json);
    const codes = parsed.diagnostics.map((d) => d.code);
    // Codes ordered ascending — E-CLOSURE-001 (×2) < E-CLOSURE-002 < W-AUTH-RUNTIME-FALLBACK
    expect(codes).toEqual([
      "E-CLOSURE-001",
      "E-CLOSURE-001",
      "E-CLOSURE-002",
      "W-AUTH-RUNTIME-FALLBACK",
    ]);
    // Among the two E-CLOSURE-001 entries, role discriminates after
    // entryPoint matches — "admin" < "user" by codepoint.
    expect(parsed.diagnostics[0].role).toBe("admin");
    expect(parsed.diagnostics[1].role).toBe("user");
  });

  test("identical-content diagnostics inserted in different orders → byte-identical output", () => {
    const a = emptyReachabilityRecord();
    a.diagnostics.push(
      { code: "E-CLOSURE-001", severity: "error", message: "m1" },
      { code: "W-AUTH-RUNTIME-FALLBACK", severity: "info", message: "m2" },
      { code: "E-CLOSURE-002", severity: "error", message: "m3" },
    );
    const b = emptyReachabilityRecord();
    b.diagnostics.push(
      { code: "W-AUTH-RUNTIME-FALLBACK", severity: "info", message: "m2" },
      { code: "E-CLOSURE-002", severity: "error", message: "m3" },
      { code: "E-CLOSURE-001", severity: "error", message: "m1" },
    );
    expect(serializeReachabilityRecord(a)).toBe(serializeReachabilityRecord(b));
  });

  test("optional entryPoint/role fields only appear when present (minimal shape)", () => {
    const record = emptyReachabilityRecord();
    record.diagnostics.push({
      code: "E-CLOSURE-001",
      severity: "error",
      message: "context-free",
    });
    const parsed = JSON.parse(serializeReachabilityRecord(record));
    const d = parsed.diagnostics[0];
    expect(d).toEqual({
      code: "E-CLOSURE-001",
      severity: "error",
      message: "context-free",
    });
    expect("entryPoint" in d).toBe(false);
    expect("role" in d).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §5 — §40.9.9 worked-example replay determinism × 5
// ---------------------------------------------------------------------------

describe("§5 Worked-example replay determinism — 5 compile invocations byte-identical", () => {
  // Smaller in-line shape that exercises the full pipeline including
  // role-enum + program-auth + auth-role-block (mirrors §40.9.9 in
  // structure; collapsed inline so this test does not require external
  // fixtures and is self-contained for crash-recovery replay).
  const WORKED_SOURCE = `<program title="Dispatch" auth="required">

type UserRole:enum = { Anonymous, Driver, Dispatcher, Admin }

<count> = 0

function increment() {
  @count = @count + 1
}

<nav class="flex">
  <h1>Dispatch</h1>
  <a href="/loads">Loads</a>
  <auth role="Admin">
    <a href="/admin">Admin</a>
  </auth>
</nav>

<button onclick=increment()>
  \${@count}
</button>

</program>
`;

  test("5 compiles produce 5 byte-identical reachabilityRecordJson outputs", () => {
    const dir = mkdtempSync(join(tmpdir(), "rs-det-409-"));
    try {
      const src = join(dir, "app.scrml");
      writeFileSync(src, WORKED_SOURCE);
      const outputs = [];
      for (let i = 0; i < 5; i++) {
        const result = compileScrml({
          inputFiles: [src],
          outputDir: join(dir, `dist-${i}`),
          write: false,
          log: () => {},
        });
        outputs.push(result.reachabilityRecordJson());
      }
      for (let i = 1; i < outputs.length; i++) {
        expect(outputs[i]).toBe(outputs[0]);
      }
      // Sanity: the output isn't trivially empty — exercise of the
      // full Component 1-5 + outer-fixpoint pipeline produced
      // structured content.
      const parsed = JSON.parse(outputs[0]);
      expect(Object.keys(parsed.closures).length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// §6 — `--emit-reachability` CLI file-write determinism (two-dir diff)
// ---------------------------------------------------------------------------

describe("§6 --emit-reachability CLI file-write determinism", () => {
  let TMP;
  beforeAll(() => {
    TMP = mkdtempSync(join(tmpdir(), "rs-det-cli-"));
  });
  afterAll(() => {
    if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  });

  test("two CLI invocations into separate tmp dirs produce byte-identical .reachability.json files", () => {
    const src = join(TMP, "trivial.scrml");
    writeFileSync(src, "<program>\n  <body>\n    hello\n  </body>\n</program>\n");

    const distA = join(TMP, "dist-a");
    const distB = join(TMP, "dist-b");

    // Spawn the CLI twice — fully separate process boundaries so any
    // host-level Map iteration variance is exposed.
    const cliPath = join(import.meta.dir, "..", "..", "src", "cli.js");
    const runA = spawnSync(
      "bun",
      [cliPath, "compile", src, "-o", distA, "--emit-reachability"],
      { encoding: "utf8" },
    );
    expect(runA.status).toBe(0);
    const runB = spawnSync(
      "bun",
      [cliPath, "compile", src, "-o", distB, "--emit-reachability"],
      { encoding: "utf8" },
    );
    expect(runB.status).toBe(0);

    const fileA = join(distA, "trivial.reachability.json");
    const fileB = join(distB, "trivial.reachability.json");
    expect(existsSync(fileA)).toBe(true);
    expect(existsSync(fileB)).toBe(true);
    const contentA = readFileSync(fileA, "utf8");
    const contentB = readFileSync(fileB, "utf8");
    expect(contentA).toBe(contentB);
  });
});

// ---------------------------------------------------------------------------
// §7 — Empty record canonical shape
// ---------------------------------------------------------------------------

describe("§7 Empty record canonical shape stability", () => {
  test("emptyReachabilityRecord() serializes to a fixed canonical shape", () => {
    const json = serializeReachabilityRecord(emptyReachabilityRecord());
    expect(json).toBe(`{
  "closures": {},
  "diagnostics": []
}`);
  });

  test("trivial pipeline result serializes deterministically when re-keyed via fresh Maps", () => {
    const dir = mkdtempSync(join(tmpdir(), "rs-det-canonical-"));
    try {
      const src = join(dir, "trivial.scrml");
      writeFileSync(src, "<program>\n  <body>\n    hi\n  </body>\n</program>\n");
      const r1 = compileScrml({
        inputFiles: [src],
        outputDir: dir,
        write: false,
        log: () => {},
      });
      const j1 = r1.reachabilityRecordJson();

      // Reconstruct the record with reversed Map insertion order to
      // simulate worst-case host iteration variance — output MUST be
      // byte-identical because the serializer reorders keys.
      const reversed = emptyReachabilityRecord();
      const entries = [...r1.reachabilityRecord.closures.entries()];
      for (let i = entries.length - 1; i >= 0; i--) {
        const [ep, rps] = entries[i];
        const reversedRoles = new Map();
        const roleEntries = [...rps.byRole.entries()];
        for (let k = roleEntries.length - 1; k >= 0; k--) {
          reversedRoles.set(roleEntries[k][0], roleEntries[k][1]);
        }
        reversed.closures.set(ep, { byRole: reversedRoles });
      }
      const j2 = serializeReachabilityRecord(reversed);
      expect(j2).toBe(j1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// §8 — Empty-string-as-absent-sentinel ordering
// ---------------------------------------------------------------------------

describe("§8 Diagnostic optional-field absence sentinel", () => {
  test("a diagnostic with NO entryPoint sorts BEFORE one with entryPoint='ep' (empty-string sentinel)", () => {
    const record = emptyReachabilityRecord();
    record.diagnostics.push({
      code: "E-CLOSURE-001",
      severity: "error",
      message: "later",
      entryPoint: "ep-1",
      role: "admin",
    });
    record.diagnostics.push({
      code: "E-CLOSURE-001",
      severity: "error",
      message: "first",
    });
    const parsed = JSON.parse(serializeReachabilityRecord(record));
    // Absent entryPoint sorts before "ep-1" (empty string < "ep-1").
    expect(parsed.diagnostics[0].message).toBe("first");
    expect("entryPoint" in parsed.diagnostics[0]).toBe(false);
    expect(parsed.diagnostics[1].entryPoint).toBe("ep-1");
  });
});

// ---------------------------------------------------------------------------
// §9 — Numeric vs string-typed NodeId stratification
// ---------------------------------------------------------------------------

describe("§9 NodeId type stratification (numeric class < string class)", () => {
  test("a Set holding the number 7 sorts BEFORE the string '5' (number stratum < string stratum)", () => {
    // Counter-intuitive without the rule: codepoint of '5' (53) is less
    // than codepoint of '7' (55), so naive string-coerce would put '5'
    // first. The structured comparator places number 7 first because
    // its stratum is lower.
    const record = makeRecord({
      closures: [
        [
          "ep-1",
          [
            [
              "_anonymous",
              chunkPlanWith({ componentNodeIds: ["5", 7, "9", 3] }),
            ],
          ],
        ],
      ],
    });
    const parsed = JSON.parse(serializeReachabilityRecord(record));
    const ids =
      parsed.closures["ep-1"].byRole["_anonymous"].initialChunk.componentNodeIds;
    expect(ids).toEqual([3, 7, "5", "9"]);
  });

  test("vendor-unit-style string IDs all live in string stratum and codepoint-sort", () => {
    const record = makeRecord({
      closures: [
        [
          "ep-1",
          [
            [
              "_anonymous",
              chunkPlanWith({
                vendorUnitNames: ["scrml:zod", "scrml:auth", "scrml:fmt"],
              }),
            ],
          ],
        ],
      ],
    });
    const parsed = JSON.parse(serializeReachabilityRecord(record));
    const names =
      parsed.closures["ep-1"].byRole["_anonymous"].initialChunk.vendorUnitNames;
    expect(names).toEqual(["scrml:auth", "scrml:fmt", "scrml:zod"]);
  });
});

// ---------------------------------------------------------------------------
// §10 — Map-vs-object key-order independence
// ---------------------------------------------------------------------------

describe("§10 Closures-map and byRole-map key insertion order independence", () => {
  test("two records with reversed Map insertion order produce byte-identical output", () => {
    const planA = chunkPlanWith({ componentNodeIds: [10, 20, 30] });
    const planB = chunkPlanWith({ componentNodeIds: [40, 50, 60] });

    // Record A: insert epA first, then epB; role "admin" first, then "user".
    const recordA = emptyReachabilityRecord();
    recordA.closures.set("ep-alpha", {
      byRole: new Map([
        ["admin", planA],
        ["user", planB],
      ]),
    });
    recordA.closures.set("ep-beta", {
      byRole: new Map([
        ["admin", planA],
        ["user", planB],
      ]),
    });

    // Record B: insert epB first, then epA; role "user" first, then "admin".
    const recordB = emptyReachabilityRecord();
    recordB.closures.set("ep-beta", {
      byRole: new Map([
        ["user", planB],
        ["admin", planA],
      ]),
    });
    recordB.closures.set("ep-alpha", {
      byRole: new Map([
        ["user", planB],
        ["admin", planA],
      ]),
    });

    expect(serializeReachabilityRecord(recordA)).toBe(
      serializeReachabilityRecord(recordB),
    );

    // Sanity: the serialized output reflects sorted keys (alpha < beta).
    const parsed = JSON.parse(serializeReachabilityRecord(recordA));
    expect(Object.keys(parsed.closures)).toEqual(["ep-alpha", "ep-beta"]);
    expect(Object.keys(parsed.closures["ep-alpha"].byRole)).toEqual([
      "admin",
      "user",
    ]);
  });
});

// ---------------------------------------------------------------------------
// §11 — ChunkContents fixed key order
// ---------------------------------------------------------------------------

describe("§11 ChunkContents emission preserves fixed field order", () => {
  test("componentNodeIds → reactiveCellNodeIds → serverFnNodeIds → vendorUnitNames", () => {
    const record = makeRecord({
      closures: [
        [
          "ep-1",
          [
            [
              "_anonymous",
              chunkPlanWith({
                componentNodeIds: [1],
                reactiveCellNodeIds: [2],
                serverFnNodeIds: [3],
                vendorUnitNames: ["v"],
              }),
            ],
          ],
        ],
      ],
    });
    const json = serializeReachabilityRecord(record);
    // Verify key ORDER in the emitted JSON text (not just JSON.parse
    // semantic equality) — the bit-identical invariant depends on
    // string order in the output.
    const icIdx = json.indexOf("\"componentNodeIds\":");
    const rcIdx = json.indexOf("\"reactiveCellNodeIds\":");
    const sfIdx = json.indexOf("\"serverFnNodeIds\":");
    const vuIdx = json.indexOf("\"vendorUnitNames\":");
    expect(icIdx).toBeGreaterThan(-1);
    expect(rcIdx).toBeGreaterThan(icIdx);
    expect(sfIdx).toBeGreaterThan(rcIdx);
    expect(vuIdx).toBeGreaterThan(sfIdx);
  });

  test("ChunkPlan emission preserves fixed field order — initialChunk → prefetchTier1 → prefetchTier2 → prefetchTierN", () => {
    const record = makeRecord({
      closures: [
        [
          "ep-1",
          [["_anonymous", chunkPlanWith({ componentNodeIds: [1] })]],
        ],
      ],
    });
    const json = serializeReachabilityRecord(record);
    const ic = json.indexOf("\"initialChunk\":");
    const t1 = json.indexOf("\"prefetchTier1\":");
    const t2 = json.indexOf("\"prefetchTier2\":");
    const tn = json.indexOf("\"prefetchTierN\":");
    expect(ic).toBeGreaterThan(-1);
    expect(t1).toBeGreaterThan(ic);
    expect(t2).toBeGreaterThan(t1);
    expect(tn).toBeGreaterThan(t2);
  });

  test("top-level emission order — closures BEFORE diagnostics", () => {
    const record = emptyReachabilityRecord();
    const json = serializeReachabilityRecord(record);
    const cIdx = json.indexOf("\"closures\":");
    const dIdx = json.indexOf("\"diagnostics\":");
    expect(cIdx).toBeGreaterThan(-1);
    expect(dIdx).toBeGreaterThan(cIdx);
  });
});
