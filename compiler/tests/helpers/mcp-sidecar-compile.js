/**
 * mcp-sidecar-compile.js — shared helper for the MCP-V0.A descriptor-extractor
 * tests. Drives the REAL emit path (`compileScrml({ write: true,
 * emitPerRoute: true })`) on an in-memory `.scrml` fixture, then reads the four
 * emitted sidecar JSON files (engines/forms/channels/serverfns) back from disk.
 *
 * This exercises buildMcpDescriptors → api.js write loop end-to-end — the
 * MCP-V0.A-tests dispatch must NOT hand-fabricate sidecars (per the dispatch
 * stop-condition: the integration test must exercise the real emit path).
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { compileScrml } from "../../src/api.js";

/** Create a throwaway tmp root for a test file's fixtures. Caller cleans up. */
export function makeSidecarTmpRoot(label) {
  return mkdtempSync(join(tmpdir(), `mcp-a-${label || "sidecar"}-`));
}

/** Remove a tmp root (afterAll cleanup). */
export function cleanupSidecarTmpRoot(root) {
  if (root && existsSync(root)) rmSync(root, { recursive: true, force: true });
}

let _counter = 0;

/**
 * Compile `source` (a single-file `.scrml` string) with the real per-route
 * emit path and return the four parsed sidecars + the fatal-error list.
 *
 * @param {string} source   — .scrml source text
 * @param {string} tmpRoot  — tmp directory from makeSidecarTmpRoot()
 * @returns {{ fatal: any[], outDir: string,
 *             engines: any[]|undefined, forms: any[]|undefined,
 *             channels: any[]|undefined, serverFns: any[]|undefined }}
 */
export function compileAndReadSidecars(source, tmpRoot) {
  const dir = join(tmpRoot, `c${_counter++}`);
  mkdirSync(dir, { recursive: true });
  const fp = join(dir, "app.scrml");
  writeFileSync(fp, source);
  const outDir = join(dir, "dist");

  const result = compileScrml({
    inputFiles: [fp],
    outputDir: outDir,
    write: true,
    emitPerRoute: true,
    log: () => {},
  });

  // Fatal errors only — warnings (W-) and info (I-) are not failures.
  const fatal = (result.errors ?? []).filter(
    (e) =>
      e.severity !== "warning" &&
      !String(e.code ?? "").startsWith("W-") &&
      !String(e.code ?? "").startsWith("I-")
  );

  const readJson = (name) => {
    const p = join(outDir, name);
    return existsSync(p) ? JSON.parse(readFileSync(p, "utf-8")) : undefined;
  };

  return {
    fatal,
    outDir,
    sourceFile: fp,
    engines: readJson("engines.json"),
    forms: readJson("forms.json"),
    channels: readJson("channels.json"),
    serverFns: readJson("serverfns.json"),
  };
}
