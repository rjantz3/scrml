/**
 * data-set-algebra — value-correct set-algebra helpers in scrml:data (S170).
 *
 * Covers the "defer the set type, ship the helpers" disposition (deep-dive
 * scrml-support/docs/deep-dives/set-warrant-and-shape-2026-06-06.md, RATIFIED
 * S170):
 *
 *   §1 — union/intersection/difference value-correctness over PRIMITIVE arrays.
 *   §2 — union/intersection/difference value-correctness over STRUCT arrays
 *        (value-equal structs treated as ONE element — the struct-membership
 *        value-semantics hole the helpers close; JS Set / Array.includes are
 *        reference-keyed and would be wrong).
 *   §3 — member(arr, x) value-safe membership (finds value-equal structs;
 *        `.includes` does not).
 *   §4 — the `unique` struct-safety fix: `unique([{id:1},{id:1}])` → length 1
 *        (no-key path now dedups by the §59.5 value-canonical key, not JS Set
 *        reference identity). The keyed form `unique(arr,"id")` still works.
 *   §5 — the optional keyOrFn arg (field-name + projection-fn) mirrors the
 *        `unique(array, keyOrFn)` family convention.
 *   §6 — field-order independence (the §45 / §59.5 keystone): {a:1,b:2} and
 *        {b:2,a:1} are ONE value.
 *   §7 — the helpers resolve cleanly through an `import ... from 'scrml:data'`
 *        at MOD stage (no E-MOD-* / E-NAME-* / E-IMPORT-* errors).
 *
 * The §1-§6 assertions import the runtime shim directly (the value-correct
 * surface). §7 round-trips through compileScrml to guard the re-export wiring.
 *
 * Cross-references:
 *   - SPEC §59.5    — value-canonical key codec (the codec the helpers replicate)
 *   - SPEC §59.12   — set deferral / set-algebra-helpers disposition
 *   - SPEC §45      — structural equality (value-correctness basis)
 *   - compiler/runtime/stdlib/data.js — union/intersection/difference/member + unique
 *   - stdlib/data/transform.scrml — source-level mirror
 *   - stdlib/data/index.scrml — re-export
 */

import { describe, test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  unique,
  union,
  intersection,
  difference,
  member,
} from "../../runtime/stdlib/data.js";
import { compileScrml } from "../../src/api.js";

describe("scrml:data set-algebra — primitive arrays (§1)", () => {
  test("union — distinct elements in a OR b", () => {
    expect(union([1, 2], [2, 3])).toEqual([1, 2, 3]);
    expect(union([], [1, 1, 2])).toEqual([1, 2]);
    expect(union(["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
  });

  test("intersection — distinct elements in BOTH", () => {
    expect(intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
    expect(intersection([1, 2], [3, 4])).toEqual([]);
  });

  test("difference — distinct elements in a but NOT b", () => {
    expect(difference([1, 2, 3], [2])).toEqual([1, 3]);
    expect(difference([1, 1, 2], [])).toEqual([1, 2]);
  });
});

describe("scrml:data set-algebra — struct arrays, value-correct (§2)", () => {
  test("union treats value-equal structs as one element", () => {
    const r = union([{ id: 1 }], [{ id: 1 }, { id: 2 }]);
    expect(r.length).toBe(2);
    expect(r).toEqual([{ id: 1 }, { id: 2 }]);
  });

  test("intersection matches structs by value", () => {
    const r = intersection([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }]);
    expect(r.length).toBe(1);
    expect(r).toEqual([{ id: 2 }]);
  });

  test("difference matches structs by value", () => {
    const r = difference([{ id: 1 }, { id: 2 }], [{ id: 2 }]);
    expect(r.length).toBe(1);
    expect(r).toEqual([{ id: 1 }]);
  });

  test("nested struct values compare structurally", () => {
    const r = union([{ a: { b: 1 } }], [{ a: { b: 1 } }, { a: { b: 2 } }]);
    expect(r.length).toBe(2);
  });
});

describe("scrml:data member — value-safe membership (§3)", () => {
  test("member finds value-equal structs (.includes does not)", () => {
    expect(member([{ id: 1 }, { id: 2 }], { id: 2 })).toBe(true);
    expect(member([{ id: 1 }], { id: 9 })).toBe(false);
    // contrast: reference-keyed .includes is value-broken for structs
    expect([{ id: 1 }].includes({ id: 1 })).toBe(false);
  });

  test("member works on primitives", () => {
    expect(member([1, 2, 3], 2)).toBe(true);
    expect(member([1, 2, 3], 9)).toBe(false);
    expect(member(["a", "b"], "b")).toBe(true);
  });
});

describe("scrml:data unique — struct-safety fix (§4)", () => {
  test("no-key path dedups value-equal structs to one element", () => {
    expect(unique([{ id: 1 }, { id: 1 }]).length).toBe(1);
    expect(unique([{ id: 1 }, { id: 2 }, { id: 1 }]).length).toBe(2);
  });

  test("primitive dedup still correct", () => {
    expect(unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
    expect(unique(["a", "a", "b"])).toEqual(["a", "b"]);
  });

  test("keyed path still works (regression guard)", () => {
    expect(unique([{ id: 1 }, { id: 2 }, { id: 1 }], "id").length).toBe(2);
    expect(unique([{ id: 1 }, { id: 1 }], (u) => u.id).length).toBe(1);
  });
});

describe("scrml:data set-algebra — keyOrFn arg (§5)", () => {
  test("field-name key (mirrors unique family)", () => {
    const r = union([{ id: 1, n: "a" }], [{ id: 1, n: "b" }], "id");
    expect(r.length).toBe(1);
    expect(r[0].n).toBe("a"); // first-seen wins
  });

  test("projection-fn key", () => {
    const r = intersection([{ id: 1 }], [{ id: 1 }], (x) => x.id);
    expect(r.length).toBe(1);
    expect(member([{ id: 5 }], { id: 5 }, "id")).toBe(true);
  });
});

describe("scrml:data value-correctness — field-order independence (§6)", () => {
  test("{a:1,b:2} and {b:2,a:1} are ONE value", () => {
    expect(unique([{ a: 1, b: 2 }, { b: 2, a: 1 }]).length).toBe(1);
    expect(member([{ a: 1, b: 2 }], { b: 2, a: 1 })).toBe(true);
    expect(intersection([{ a: 1, b: 2 }], [{ b: 2, a: 1 }]).length).toBe(1);
  });
});

describe("scrml:data set-algebra — import resolution (§7)", () => {
  test("union/intersection/difference/member resolve through scrml:data", () => {
    const dir = mkdtempSync(join(tmpdir(), "scrml-set-algebra-"));
    const file = join(dir, "app.scrml");
    writeFileSync(
      file,
      [
        "<program>",
        "${",
        "    import { union, intersection, difference, member, unique } from 'scrml:data'",
        "    export function combine(a, b) {",
        "        const u = union(a, b)",
        "        const i = intersection(a, b)",
        "        const d = difference(a, b)",
        "        const has = member(u, a[0])",
        "        return { u, i, d, has }",
        "    }",
        "}",
        "</program>",
        "",
      ].join("\n"),
    );
    try {
      const result = compileScrml(file, { outputDir: dir, emit: false });
      const importErrors = (result.errors || []).filter(
        (e) =>
          typeof e.code === "string" &&
          (e.code.startsWith("E-MOD") ||
            e.code.startsWith("E-NAME") ||
            e.code.startsWith("E-IMPORT")),
      );
      expect(importErrors).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
