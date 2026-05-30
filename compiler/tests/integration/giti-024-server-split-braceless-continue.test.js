/**
 * GITI-024 regression — brace-less `if (cond) continue` / `break` / `return`
 * whose following statement is identifier-led mis-parses in a server-split body.
 *
 * Filed: 2026-05-30 (GITI-024, adopter giti). Reproducer (committed sidecar):
 * a plain `export function` that imports `scrml:fs` is classified server-side
 * and emits a `.server.js` HTTP-handler; its for-body has a brace-less
 * `if (line == "skip") continue` followed by `out.push(line)`.
 *
 * Root cause (ast-builder.js parseLogicBody): the brace-less single-statement
 * if-body path calls parseOneStatement(), which for `break`/`continue` read a
 * same-line label heuristic. The guard compared `tok.line` — a property that
 * DOES NOT EXIST on tokens (line lives at `tok.span.line`) — so the comparison
 * was `undefined === undefined` → always TRUE. The next statement's leading
 * identifier (`out`) was wrongly consumed as a labeled-`continue` target,
 * producing `continue out;` and orphaning `out.push(line)` → `. push ( line );`.
 * The `--validate-emit` gate (default-ON) caught it as E-CODEGEN-INVALID-JS
 * ("Unsyntactic continue"); silent-latent before the gate.
 *
 * Fix: compare `tok.span?.line` with a null-guard (mirrors the adjacent
 * `return`-stmt newline heuristic which already used `startTok?.span?.line`).
 * A label is only consumed when both span lines are known AND equal — the
 * correct JS rule (a labeled continue/break may not have a newline before its
 * label per ASI). Applied at all four break/continue label sites in
 * parseLogicBody (the parseOneStatement nested-body path AND the top-level
 * statement loop).
 *
 * The client `.js` path was always correct (it re-emits source faithfully);
 * the defect was reachable only via the server-split body re-serialization.
 *
 * NOTE on trigger shape: we use plain `export function` + `scrml:fs` (the
 * committed-sidecar shape). `export server function` would additionally trip
 * the gate on the CLIENT `.js`, which emits the `server function` keyword
 * verbatim — a SEPARATE, out-of-scope defect — so we avoid it here to keep the
 * gate exercising ONLY the boundary defect under test.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let TMP;
beforeAll(() => { TMP = mkdtempSync(join(tmpdir(), "giti-024-")); });
afterAll(() => { if (TMP) rmSync(TMP, { recursive: true, force: true }); });

// Compile with the emitted-JS parse gate ON (validateEmit default-true).
function compileWithGate(name, source) {
  const filePath = join(TMP, name + ".scrml");
  writeFileSync(filePath, source);
  const outDir = join(TMP, name + ".dist");
  const result = compileScrml({
    inputFiles: [filePath],
    outputDir: outDir,
    mode: "library",
    write: true,
    validateEmit: true,
    log: () => {},
  });
  const errors = (result.errors || []).filter(
    e => e.severity == null || e.severity === "error",
  );
  let serverJs = "";
  try { serverJs = readFileSync(join(outDir, name + ".server.js"), "utf8"); } catch { /* missing */ }
  return { errors, serverJs, outDir };
}

// Independent confirmation: node --check the emitted .server.js (write a .mjs
// copy so node parses ES module syntax — the file uses `export`).
function nodeCheckOk(serverJs) {
  const dir = mkdtempSync(join(tmpdir(), "giti-024-check-"));
  try {
    const p = join(dir, "_check.mjs");
    writeFileSync(p, serverJs);
    try {
      execFileSync("node", ["--check", p], { stdio: ["ignore", "ignore", "pipe"] });
      return { ok: true, err: "" };
    } catch (e) {
      return { ok: false, err: e.stderr ? e.stderr.toString() : String(e) };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const CONTINUE_SRC = [
  '${',
  '  import { readFileSync } from "scrml:fs"',
  '  export function readLines(path) {',
  '    const out = []',
  '    for (const line of readFileSync(path, "utf8").split("\\n")) {',
  '      if (line == "skip") continue',
  '      out.push(line)',
  '    }',
  '    return out',
  '  }',
  '}',
].join("\n");

const BREAK_SRC = [
  '${',
  '  import { readFileSync } from "scrml:fs"',
  '  export function firstFew(path) {',
  '    const out = []',
  '    for (const line of readFileSync(path, "utf8").split("\\n")) {',
  '      if (line == "stop") break',
  '      out.push(line)',
  '    }',
  '    return out',
  '  }',
  '}',
].join("\n");

const RETURN_SRC = [
  '${',
  '  import { readFileSync } from "scrml:fs"',
  '  export function pick(path) {',
  '    const out = []',
  '    for (const line of readFileSync(path, "utf8").split("\\n")) {',
  '      if (line == "hit") return line',
  '      out.push(line)',
  '    }',
  '    return ""',
  '  }',
  '}',
].join("\n");

function findKind(ast, kind) {
  let found = null;
  (function walk(n) {
    if (!n || typeof n !== "object") return;
    if (n.kind === kind) found = n;
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") walk(v);
    }
  })(ast);
  return found;
}

describe("GITI-024: brace-less continue/break/return in a server-split body", () => {
  // --- AST-level root-cause assertions (FAIL on pre-fix code) -------------
  test("brace-less `if (cond) continue` does NOT capture the next-line ident as a label", () => {
    const node = findKind(buildAST(splitBlocks("p.scrml", CONTINUE_SRC)), "continue-stmt");
    expect(node).not.toBeNull();
    // Pre-fix: label === "out" (next-line ident swallowed). Post-fix: null.
    expect(node.label).toBeNull();
  });

  test("brace-less `if (cond) break` does NOT capture the next-line ident as a label", () => {
    const node = findKind(buildAST(splitBlocks("p.scrml", BREAK_SRC)), "break-stmt");
    expect(node).not.toBeNull();
    expect(node.label).toBeNull();
  });

  // --- End-to-end emit assertions (gate ON + node --check) ----------------
  test("continue: gate-clean compile + valid emitted .server.js", () => {
    const { errors, serverJs } = compileWithGate("readLines", CONTINUE_SRC);
    expect(errors.filter(e => e.code === "E-CODEGEN-INVALID-JS")).toEqual([]);
    expect(errors).toEqual([]);
    expect(serverJs).not.toContain("continue out");
    expect(serverJs).toMatch(/continue;/);
    expect(nodeCheckOk(serverJs)).toEqual({ ok: true, err: "" });
  });

  test("break: gate-clean compile + valid emitted .server.js", () => {
    const { errors, serverJs } = compileWithGate("firstFew", BREAK_SRC);
    expect(errors.filter(e => e.code === "E-CODEGEN-INVALID-JS")).toEqual([]);
    expect(errors).toEqual([]);
    expect(serverJs).not.toContain("break out");
    expect(serverJs).toMatch(/break;/);
    expect(nodeCheckOk(serverJs)).toEqual({ ok: true, err: "" });
  });

  test("return: gate-clean compile + valid emitted .server.js", () => {
    const { errors, serverJs } = compileWithGate("pick", RETURN_SRC);
    expect(errors.filter(e => e.code === "E-CODEGEN-INVALID-JS")).toEqual([]);
    expect(errors).toEqual([]);
    expect(nodeCheckOk(serverJs)).toEqual({ ok: true, err: "" });
  });
});
