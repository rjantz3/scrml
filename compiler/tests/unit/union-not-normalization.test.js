/**
 * §42.3.1 — Union-`not` normalization (map-build phase-c).
 *
 * Normative rule (SPEC §42.3.1): "A union type SHALL be normalized so that
 * duplicate `not` members collapse: `(T | not) | not` is `T | not`. There is
 * exactly one `not` member in a normalized optional union; re-optionalizing an
 * already-optional type is idempotent."
 *
 * `tUnion(members)` wires in `normalizeUnion()` which (a) flattens nested-union
 * members and (b) collapses duplicate `not` to exactly one. SCOPE is flatten +
 * dedup-`not` ONLY — non-`not` members are NOT reordered or deduped.
 *
 * The load-bearing blast-radius concern: the schemaFor (§41.15.8) and tableFor
 * (§41.16.6) nullable-union recognizers match an EXACTLY-2-member
 * `{kind:"union", members:[T, {kind:"not"}]}` by hand. Normalization must
 * collapse a re-optionalized union to that exact shape so those recognizers
 * STILL fire (column stays nullable). These tests prove both the type-system
 * collapse AND that the two codegen recognizers continue to recognize the
 * collapsed result.
 */

import { describe, test, expect } from "bun:test";
import {
  tUnion,
  tNot,
  tPrimitive,
  resolveTypeExpr,
} from "../../src/type-system.js";
import { nullableUnionBase } from "../../src/codegen/emit-schema-for.ts";
import { classifyFieldForCell } from "../../src/codegen/emit-table-for.ts";

describe("§42.3.1 — union-`not` normalization", () => {
  describe("dedup `not` (programmatic)", () => {
    test("tUnion([string, not, not]) collapses duplicate not -> [string, not]", () => {
      const u = tUnion([tPrimitive("string"), tNot(), tNot()]);
      expect(u.kind).toBe("union");
      expect(u.members.length).toBe(2);
      expect(u.members[0]).toEqual({ kind: "primitive", name: "string" });
      expect(u.members[1]).toEqual({ kind: "not" });
      // exactly one `not`
      expect(u.members.filter((m) => m.kind === "not").length).toBe(1);
    });

    test("tUnion([string, not, not, not]) collapses three nots -> one", () => {
      const u = tUnion([tPrimitive("string"), tNot(), tNot(), tNot()]);
      expect(u.members.length).toBe(2);
      expect(u.members.filter((m) => m.kind === "not").length).toBe(1);
    });
  });

  describe("flatten nested unions (re-optionalize is idempotent)", () => {
    test("tUnion([ (string|not), not ]) flattens + dedups -> [string, not]", () => {
      // Re-optionalize an already-optional type: (string | not) | not.
      const inner = tUnion([tPrimitive("string"), tNot()]); // string | not
      const outer = tUnion([inner, tNot()]); // (string | not) | not
      expect(outer.kind).toBe("union");
      expect(outer.members.length).toBe(2);
      expect(outer.members[0]).toEqual({ kind: "primitive", name: "string" });
      expect(outer.members[1]).toEqual({ kind: "not" });
      expect(outer.members.filter((m) => m.kind === "not").length).toBe(1);
      // and there is no surviving nested union member
      expect(outer.members.some((m) => m.kind === "union")).toBe(false);
    });

    test("idempotent under repeated re-optionalization", () => {
      const a = tUnion([tPrimitive("string"), tNot()]); // string | not
      const b = tUnion([a, tNot()]); // (string|not)|not
      const c = tUnion([b, tNot()]); // ((string|not)|not)|not
      expect(c.members.length).toBe(2);
      expect(c).toEqual(b); // structurally identical -> idempotent
    });

    test("non-`not` members of a flattened inner union are preserved (no dedup/reorder)", () => {
      // (string | number | not) | not  -> [string, number, not]
      const inner = tUnion([tPrimitive("string"), tPrimitive("number"), tNot()]);
      const outer = tUnion([inner, tNot()]);
      expect(outer.members.length).toBe(3);
      expect(outer.members[0]).toEqual({ kind: "primitive", name: "string" });
      expect(outer.members[1]).toEqual({ kind: "primitive", name: "number" });
      expect(outer.members[2]).toEqual({ kind: "not" });
      expect(outer.members.filter((m) => m.kind === "not").length).toBe(1);
    });
  });

  describe("SCOPE — no reorder / no non-`not` dedup", () => {
    test("a normal [T, not] 2-member union round-trips UNCHANGED", () => {
      const u = tUnion([tPrimitive("string"), tNot()]);
      expect(u.members.length).toBe(2);
      expect(u.members[0]).toEqual({ kind: "primitive", name: "string" });
      expect(u.members[1]).toEqual({ kind: "not" });
    });

    test("member order is preserved — [not, string] stays [not, string]", () => {
      const u = tUnion([tNot(), tPrimitive("string")]);
      expect(u.members.length).toBe(2);
      expect(u.members[0]).toEqual({ kind: "not" });
      expect(u.members[1]).toEqual({ kind: "primitive", name: "string" });
    });

    test("duplicate NON-`not` members are NOT deduped (out of scope)", () => {
      const u = tUnion([tPrimitive("string"), tPrimitive("string"), tNot()]);
      // both string members survive; only `not` is single
      expect(u.members.filter((m) => m.kind === "primitive" && m.name === "string").length).toBe(2);
      expect(u.members.filter((m) => m.kind === "not").length).toBe(1);
    });

    test("a non-optional union (no `not`) is untouched", () => {
      const u = tUnion([tPrimitive("string"), tPrimitive("number")]);
      expect(u.members.length).toBe(2);
      expect(u.members.some((m) => m.kind === "not")).toBe(false);
    });
  });

  describe("text-annotation path (resolveTypeExpr)", () => {
    test("`string | not | not` resolves to a 2-member [string, not] union", () => {
      const reg = new Map();
      const t = resolveTypeExpr("string | not | not", reg);
      expect(t.kind).toBe("union");
      expect(t.members.length).toBe(2);
      expect(t.members[0]).toEqual({ kind: "primitive", name: "string" });
      expect(t.members[1]).toEqual({ kind: "not" });
    });

    test("`string | not` (canonical) is unchanged", () => {
      const reg = new Map();
      const t = resolveTypeExpr("string | not", reg);
      expect(t.kind).toBe("union");
      expect(t.members.length).toBe(2);
      expect(t.members[0]).toEqual({ kind: "primitive", name: "string" });
      expect(t.members[1]).toEqual({ kind: "not" });
    });
  });

  describe("BLAST-RADIUS CANARY — schemaFor + tableFor nullable recognizers still fire", () => {
    // The canonical 2-member nullable union, plus a re-optionalized union that
    // MUST normalize to the same shape so both exactly-2-member recognizers fire.
    const canonical = tUnion([tPrimitive("string"), tNot()]); // string | not
    const reoptProgrammatic = tUnion([tUnion([tPrimitive("string"), tNot()]), tNot()]); // (string|not)|not
    const reoptText = resolveTypeExpr("string | not | not", new Map()); // text path

    test("schemaFor `nullableUnionBase` recognizes canonical [string, not]", () => {
      const base = nullableUnionBase(canonical);
      expect(base).toEqual({ kind: "primitive", name: "string" });
    });

    test("schemaFor `nullableUnionBase` recognizes re-optionalized (programmatic) union", () => {
      const base = nullableUnionBase(reoptProgrammatic);
      expect(base).toEqual({ kind: "primitive", name: "string" });
    });

    test("schemaFor `nullableUnionBase` recognizes re-optionalized (text `string | not | not`) union", () => {
      const base = nullableUnionBase(reoptText);
      expect(base).toEqual({ kind: "primitive", name: "string" });
    });

    test("tableFor `classifyFieldForCell` marks canonical [string, not] nullable", () => {
      const r = classifyFieldForCell(canonical);
      expect(r.kind).toBe("string");
      expect(r.nullable).toBe(true);
    });

    test("tableFor `classifyFieldForCell` marks re-optionalized (programmatic) union nullable", () => {
      const r = classifyFieldForCell(reoptProgrammatic);
      expect(r.kind).toBe("string");
      expect(r.nullable).toBe(true);
    });

    test("tableFor `classifyFieldForCell` marks re-optionalized (text) union nullable", () => {
      const r = classifyFieldForCell(reoptText);
      expect(r.kind).toBe("string");
      expect(r.nullable).toBe(true);
    });
  });
});
