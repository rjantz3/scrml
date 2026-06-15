/**
 * W-AUTH-002 — Tier-1 server-authority residual warning (§52.8 SSR pre-render)
 *
 * change-id state-decl-shape-disambiguation-2026-06-14 (the G1 follow-on).
 *
 * HISTORY. W-AUTH-002 landed S194 (change-id g1-server-sync-codegen-2026-06-14)
 * as an INTERIM honesty warning: a Tier-1 `< Type authority="server" table=>`
 * type compiled CLEAN with ZERO read-authority codegen — a SILENT no-op. At that
 * point the warning only fired on the NON-canonical opener-attr shape
 * (`< Card ... id(int) title(string)>`, fields as opener attrs), because the
 * canonical §52.3.5 BODY-field shape (`< Card> id: number </>` inside `${…}`)
 * parsed as `html-fragment` and the walker never saw it.
 *
 * NOW (this change-id): the recogniser (ast-builder tryParseServerAuthorityDecl)
 * recognises the CANONICAL body-field shape in `${…}`, and the read-authority
 * SELECT * initial-load codegen lands (emit-sync emitServerAuthorityLoad +
 * the /__serverLoad/<var> server route). The ONE remaining read-authority
 * residual is SSR pre-render (§52.8). So W-AUTH-002 is NARROWED:
 *   - it fires on the CANONICAL body-field §52.3.5 shape (what adopters write),
 *   - its message names the SSR-pre-render residual (not "no read sync at all"),
 *   - it stays severity "warning" (non-fatal),
 *   - it still does NOT fire on a local / no-authority type.
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

// The CANONICAL §52.3.5 shape — body-field-list inside a `${…}` logic block.
const CANONICAL = (
  `<program db="sqlite:./t.db">\n` +
  `\${\n` +
  `  < Card authority="server" table="cards">\n` +
  `    id: number\n` +
  `    title: string\n` +
  `  </>\n` +
  `  <Card> @cards\n` +
  `}\n` +
  `</program>`
);

describe("W-AUTH-002: Tier-1 server-authority residual warning (SSR pre-render)", () => {
  test("fires for the CANONICAL §52.3.5 body-field shape inside `${…}`", () => {
    const res = runTSForSource(CANONICAL);
    expect(findDiag(res, "W-AUTH-002")).toBeDefined();
  });

  test("the warning has severity 'warning' (non-fatal — does not fail the build)", () => {
    const res = runTSForSource(CANONICAL);
    expect(findDiag(res, "W-AUTH-002").severity).toBe("warning");
  });

  test("the message names the SSR-pre-render residual (NOT 'no read sync at all')", () => {
    const w = findDiag(runTSForSource(CANONICAL), "W-AUTH-002");
    expect(String(w.message)).toContain("SSR");
    expect(String(w.message)).toContain("SELECT * initial load");
    // It must NOT claim the read-authority sync is entirely absent — that was the
    // pre-narrow message; the SELECT * load now lands.
    expect(String(w.message)).not.toContain("does not yet generate its read-authority sync");
  });

  test("the message names the table and the type", () => {
    const w = findDiag(runTSForSource(CANONICAL), "W-AUTH-002");
    expect(String(w.message)).toContain("Card");
    expect(String(w.message)).toContain("cards");
  });

  test("still fires for the legacy opener-attr shape (state-constructor-def)", () => {
    const src =
      `<program>\n` +
      `< Card authority="server" table="cards" id(int) title(string)>\n` +
      `  <span></span>\n` +
      `</>\n` +
      `</program>`;
    expect(findDiag(runTSForSource(src), "W-AUTH-002")).toBeDefined();
  });

  test("does NOT fire for a `authority='local'` state type", () => {
    const src =
      `<program>\n` +
      `< Note authority="local" id(int) body(string)>\n` +
      `  <span></span>\n` +
      `</>\n` +
      `</program>`;
    expect(findDiag(runTSForSource(src), "W-AUTH-002")).toBeUndefined();
  });

  test("does NOT fire for a state type with no authority attribute (defaults local)", () => {
    const src =
      `<program>\n` +
      `< Note id(int) body(string)>\n` +
      `  <span></span>\n` +
      `</>\n` +
      `</program>`;
    expect(findDiag(runTSForSource(src), "W-AUTH-002")).toBeUndefined();
  });

  test("W-AUTH-001 does NOT fire on a Tier-1 instance (it gets the SELECT * load)", () => {
    const res = runTSForSource(CANONICAL);
    expect(findDiag(res, "W-AUTH-001")).toBeUndefined();
  });
});
