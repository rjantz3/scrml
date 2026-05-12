/**
 * v0.3 — W-PROGRAM-SPA-INFERRED integration tests
 *
 * SPEC §40.8.1 RESOLVED (Option C, ratified S86 2026-05-12) + §34 row.
 *
 * The lint fires at the entry-file `<program>` opener when ALL three
 * conditions hold:
 *   1. The entry file declares a top-level `<program>` element.
 *   2. The `<program>` body contains zero `<page>` siblings.
 *   3. No `pages/` directory exists at the project root.
 *
 * Suppression: presence of a `pages/` directory (even empty) at the
 * project root suppresses the lint.
 *
 * Implementation guard: the walker requires the entry filePath to be
 * absolute AND point at a real file on disk. Tests therefore stage real
 * files under a tmpdir to drive the lint.
 *
 * SPEC anchors: §40.8.1 (RESOLVED), §34 (diagnostic catalog row),
 * §40.8 (v0.3 program-shape parent context).
 */

import { describe, test, expect, afterAll } from "bun:test";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

// ---------------------------------------------------------------------------
// Tmpdir / staging helpers
// ---------------------------------------------------------------------------

const createdDirs = [];

function makeProjectDir(prefix = "spa-inferred") {
  const dir = join(
    tmpdir(),
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  createdDirs.push(dir);
  return dir;
}

function stageFile(dir, name, contents) {
  const fp = join(dir, name);
  writeFileSync(fp, contents, "utf8");
  return fp;
}

function compileAtPath(filePath, source) {
  const bs = splitBlocks(filePath, source);
  return buildAST(bs);
}

function errorsByCode(errors, code) {
  return (errors || []).filter(e => e && e.code === code);
}

afterAll(() => {
  for (const d of createdDirs) {
    try { rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

// ---------------------------------------------------------------------------
// §1 — POSITIVE: lint fires per §40.8.1
// ---------------------------------------------------------------------------

describe("W-PROGRAM-SPA-INFERRED — positive (lint fires)", () => {
  test("entry <program> + no <page> + no pages/ dir → fires", () => {
    const dir = makeProjectDir();
    const src = "<program title=\"Demo\">\n  <div>hello</div>\n</program>";
    const fp = stageFile(dir, "app.scrml", src);

    const { errors } = compileAtPath(fp, src);
    const hits = errorsByCode(errors, "W-PROGRAM-SPA-INFERRED");

    expect(hits.length).toBe(1);
    expect(hits[0].severity).toBe("info");
    expect(hits[0].message).toMatch(/SPA \(single-page application\) shape/);
    expect(hits[0].message).toMatch(/§40\.8\.1/);
  });

  test("emission site spans the entry <program> opener", () => {
    const dir = makeProjectDir();
    const src = "<program>\n  <div>x</div>\n</program>";
    const fp = stageFile(dir, "app.scrml", src);

    const { errors } = compileAtPath(fp, src);
    const hits = errorsByCode(errors, "W-PROGRAM-SPA-INFERRED");

    expect(hits.length).toBe(1);
    // Span line/col point at the `<program>` opener (line 1).
    expect(hits[0].tabSpan.line).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §2 — NEGATIVE: <page> sibling present
// ---------------------------------------------------------------------------

describe("W-PROGRAM-SPA-INFERRED — negative (<page> sibling)", () => {
  test("entry <program> with a <page> sibling → does NOT fire", () => {
    const dir = makeProjectDir();
    const src = "<program>\n  <page>home content</page>\n</program>";
    const fp = stageFile(dir, "app.scrml", src);

    const { errors } = compileAtPath(fp, src);
    const hits = errorsByCode(errors, "W-PROGRAM-SPA-INFERRED");

    expect(hits.length).toBe(0);
  });

  test("entry <program> with two <page> siblings → does NOT fire", () => {
    const dir = makeProjectDir();
    const src = "<program>\n  <page>home</page>\n  <page>about</page>\n</program>";
    const fp = stageFile(dir, "app.scrml", src);

    const { errors } = compileAtPath(fp, src);
    const hits = errorsByCode(errors, "W-PROGRAM-SPA-INFERRED");

    expect(hits.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §3 — NEGATIVE: pages/ directory at project root suppresses
// ---------------------------------------------------------------------------

describe("W-PROGRAM-SPA-INFERRED — negative (pages/ suppression)", () => {
  test("entry <program> + no <page> + EMPTY pages/ dir → does NOT fire", () => {
    const dir = makeProjectDir();
    mkdirSync(join(dir, "pages"), { recursive: true });
    const src = "<program>\n  <div>x</div>\n</program>";
    const fp = stageFile(dir, "app.scrml", src);

    const { errors } = compileAtPath(fp, src);
    const hits = errorsByCode(errors, "W-PROGRAM-SPA-INFERRED");

    expect(hits.length).toBe(0);
  });

  test("entry <program> + no <page> + NON-EMPTY pages/ dir → does NOT fire", () => {
    const dir = makeProjectDir();
    mkdirSync(join(dir, "pages"), { recursive: true });
    // Drop a real .scrml route file into pages/.
    writeFileSync(
      join(dir, "pages", "dashboard.scrml"),
      "<page>dashboard content</page>",
      "utf8",
    );
    const src = "<program>\n  <div>x</div>\n</program>";
    const fp = stageFile(dir, "app.scrml", src);

    const { errors } = compileAtPath(fp, src);
    const hits = errorsByCode(errors, "W-PROGRAM-SPA-INFERRED");

    expect(hits.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §4 — NEGATIVE: non-entry file (no top-level <program>)
// ---------------------------------------------------------------------------

describe("W-PROGRAM-SPA-INFERRED — negative (non-entry file)", () => {
  test("module file (no <program>) → does NOT fire, regardless of fs", () => {
    const dir = makeProjectDir();
    // No <program> wrapper — this is a module file (helpers/types/etc).
    const src = "${ export function greet(name) { return \"hi \" + name } }";
    const fp = stageFile(dir, "helpers.scrml", src);

    const { errors } = compileAtPath(fp, src);
    const hits = errorsByCode(errors, "W-PROGRAM-SPA-INFERRED");

    expect(hits.length).toBe(0);
  });

  test("page-only file (top-level <page>, no <program>) → does NOT fire", () => {
    const dir = makeProjectDir();
    const src = "<page>route content</page>";
    const fp = stageFile(dir, "about.scrml", src);

    const { errors } = compileAtPath(fp, src);
    const hits = errorsByCode(errors, "W-PROGRAM-SPA-INFERRED");

    expect(hits.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §5 — Edge: synthetic non-existent paths skip the lint (impl guard)
// ---------------------------------------------------------------------------

describe("W-PROGRAM-SPA-INFERRED — impl guard (no fs context)", () => {
  test("synthetic filePath (file not on disk) → does NOT fire", () => {
    // This is the standard test-fixture shape; the walker's filesystem
    // guard skips it because the file does not exist on disk and there
    // is no meaningful project root to inspect.
    const { errors } = compileAtPath("test.scrml", "<program><div>x</div></program>");
    const hits = errorsByCode(errors, "W-PROGRAM-SPA-INFERRED");

    expect(hits.length).toBe(0);
  });
});
