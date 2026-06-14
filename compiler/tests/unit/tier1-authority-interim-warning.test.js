/**
 * W-AUTH-002 — Tier-1 server-authority interim honesty warning (§52.6.1 / §52.3.3)
 *
 * change-id g1-server-sync-codegen-2026-06-14 (Q1=C / Q2=WF, ratified 2026-06-14).
 *
 * Before this warning, a Tier-1 `< Type authority="server" table=>` state type
 * compiled CLEAN with ZERO sync codegen and ZERO diagnostic — a SILENT no-op
 * (SCOPING §7): a developer declares server authority and silently gets a
 * client-local app. The full Tier-1 read-authority codegen (the `SELECT *`
 * initial load + SSR pre-render) is a committed follow-on; until it lands,
 * W-AUTH-002 surfaces the residual gap.
 *
 * The warning is a TYPE-stage Info/Warning (severity "warning") — it MUST NOT
 * fail the build (it lands in the warnings stream, not the hard-error stream).
 *
 * Cross-stream note (memory: diagnostic-stream-partition): `runTS` returns all
 * diagnostics in `.errors`; the W-/I- prefix routing to the warnings stream
 * happens DOWNSTREAM at result assembly. So these tests scan BOTH streams and
 * additionally assert `severity === "warning"` to prove non-fatality.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runTS } from "../../src/type-system.js";

function runTSForSource(src, filePath = "/test/app.scrml") {
  const bs = splitBlocks(filePath, src);
  const { ast } = buildAST(bs);
  return runTS({ files: [ast] });
}

/** Cross-stream find: scan BOTH errors and warnings for a code. */
function findDiag(res, code) {
  const all = [...(res.errors || []), ...(res.warnings || [])];
  return all.find((e) => e.code === code);
}

describe("W-AUTH-002: Tier-1 server-authority interim honesty warning", () => {
  test("fires for a `< Type authority='server' table=>` state type", () => {
    const src =
      `<program>\n` +
      `< Card authority="server" table="cards" id(int) title(string)>\n` +
      `  <span></span>\n` +
      `</>\n` +
      `</program>`;
    const res = runTSForSource(src);
    const w = findDiag(res, "W-AUTH-002");
    expect(w).toBeDefined();
  });

  test("the warning has severity 'warning' (non-fatal — does not fail the build)", () => {
    const src =
      `<program>\n` +
      `< Card authority="server" table="cards" id(int) title(string)>\n` +
      `  <span></span>\n` +
      `</>\n` +
      `</program>`;
    const res = runTSForSource(src);
    const w = findDiag(res, "W-AUTH-002");
    expect(w.severity).toBe("warning");
  });

  test("the message names the residual gap (the SELECT * initial load + SSR pre-render)", () => {
    const src =
      `<program>\n` +
      `< Card authority="server" table="cards" id(int) title(string)>\n` +
      `  <span></span>\n` +
      `</>\n` +
      `</program>`;
    const res = runTSForSource(src);
    const w = findDiag(res, "W-AUTH-002");
    expect(String(w.message)).toContain("SELECT * initial load");
    expect(String(w.message)).toContain("read-authority sync");
  });

  test("the message names the table and the type", () => {
    const src =
      `<program>\n` +
      `< Card authority="server" table="cards" id(int) title(string)>\n` +
      `  <span></span>\n` +
      `</>\n` +
      `</program>`;
    const res = runTSForSource(src);
    const w = findDiag(res, "W-AUTH-002");
    expect(String(w.message)).toContain("Card");
    expect(String(w.message)).toContain("cards");
  });

  test("does NOT fire for a `authority='local'` state type", () => {
    const src =
      `<program>\n` +
      `< Note authority="local" id(int) body(string)>\n` +
      `  <span></span>\n` +
      `</>\n` +
      `</program>`;
    const res = runTSForSource(src);
    expect(findDiag(res, "W-AUTH-002")).toBeUndefined();
  });

  test("does NOT fire for a state type with no authority attribute (defaults local)", () => {
    const src =
      `<program>\n` +
      `< Note id(int) body(string)>\n` +
      `  <span></span>\n` +
      `</>\n` +
      `</program>`;
    const res = runTSForSource(src);
    expect(findDiag(res, "W-AUTH-002")).toBeUndefined();
  });
});
