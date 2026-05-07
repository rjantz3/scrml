/**
 * a-plus-verdict — Unit Tests
 *
 * S64 debate-04 verdict A+ carry-forward (3-of-3 unanimous, judge-ratified):
 *   #1 — did-you-mean: match quickfix on E-SWITCH-FORBIDDEN
 *        (ast-builder hard-error with enriched message text — there is no
 *         LSP/code-action quickfix infrastructure today, so the enriched
 *         message body carries the guidance)
 *   #2 — W-LIFECYCLE-CANDIDATE tightening on `<state> = "PascalCaseValue"`
 *        (string-discriminator trap detection in lint-ghost-patterns.js)
 *
 * References:
 *   - scrml-support/docs/debates/debate-04-switch-as-tier-0-plus-2026-05-06.md
 *   - scrml-support/docs/debates/debate-04-judgment-2026-05-06.md
 *   - scrml-support/design-insights.md (string-switch-trap, synonym-not-sliver)
 *   - docs/PA-SCRML-PRIMER.md §1 (tier ladder), §11 (anti-patterns), §12 (lints)
 */

import { describe, test, expect } from "bun:test";
import { lintGhostPatterns } from "../../src/lint-ghost-patterns.js";
import { compileScrml } from "../../src/api.js";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compileSource(source) {
  const dir = join(tmpdir(), "scrml-aplus-test-" + Math.random().toString(36).slice(2));
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, "test.scrml");
  writeFileSync(filePath, source, "utf8");
  let result;
  try {
    result = compileScrml({
      inputFiles: [filePath],
      outputDir: join(dir, "dist"),
      write: false,
    });
  } finally {
    try { unlinkSync(filePath); } catch {}
  }
  return result;
}

function lint(source) {
  return lintGhostPatterns(source, "test.scrml");
}

function hasCode(diags, code) {
  return diags.some(d => d.code === code);
}

// ---------------------------------------------------------------------------
// §1 — E-SWITCH-FORBIDDEN with did-you-mean: match enriched message
// ---------------------------------------------------------------------------

describe("§1 E-SWITCH-FORBIDDEN — did-you-mean: match enrichment", () => {
  test("switch keyword inside <program> body produces E-SWITCH-FORBIDDEN with did-you-mean guidance", () => {
    const source = `<program>\${
  switch (x) {
    case 1: return "a"
    default: return "b"
  }
}</program>`;
    const result = compileSource(source);
    const allErrors = [
      ...(result.errors || []),
      ...(result.warnings || []),
      ...(result.diagnostics || []),
    ];
    const switchErr = allErrors.find(e =>
      (e.code && String(e.code).includes("E-SWITCH-FORBIDDEN")) ||
      (e.message && String(e.message).includes("E-SWITCH-FORBIDDEN"))
    );
    expect(switchErr).toBeDefined();
    const msg = switchErr.message || switchErr.toString();
    expect(msg).toContain("E-SWITCH-FORBIDDEN");
    expect(msg).toContain("Did you mean");
    expect(msg).toContain("<match for=Type>");
    expect(msg).toContain("match expr");
  });

  test("switch in nested function body also fires (second parse-site)", () => {
    const source = `<program>\${function foo() {
  switch (y) {
    case 1: return 1
  }
}}</program>`;
    const result = compileSource(source);
    const allErrors = [
      ...(result.errors || []),
      ...(result.warnings || []),
      ...(result.diagnostics || []),
    ];
    const switchErr = allErrors.find(e =>
      (e.code && String(e.code).includes("E-SWITCH-FORBIDDEN")) ||
      (e.message && String(e.message).includes("E-SWITCH-FORBIDDEN"))
    );
    expect(switchErr).toBeDefined();
    const msg = switchErr.message || switchErr.toString();
    expect(msg).toContain("Did you mean");
    expect(msg).toContain("<match for=Type>");
    expect(msg).toContain("match expr");
  });
});

// ---------------------------------------------------------------------------
// §2 — W-LIFECYCLE-CANDIDATE — string-discriminator trap detection
// ---------------------------------------------------------------------------

describe("§2 W-LIFECYCLE-CANDIDATE — tightening predicate", () => {
  test("<status> = \"Loading\" fires W-LIFECYCLE-CANDIDATE (initial-uppercase, single-word)", () => {
    const source = `<markup name="app">
  <status> = "Loading"
  <div if=@status == "Loading">spinner</div>
</>`;
    const diags = lint(source);
    expect(hasCode(diags, "W-LIFECYCLE-CANDIDATE")).toBe(true);
  });

  test("multiple PascalCase variants — Idle, Pending, Success — all fire", () => {
    for (const tag of ["Idle", "Pending", "Success", "Error", "InProgress"]) {
      const source = `<markup name="app">\n  <phase> = "${tag}"\n</>`;
      const diags = lint(source);
      expect(hasCode(diags, "W-LIFECYCLE-CANDIDATE")).toBe(true);
    }
  });

  test("typed state-cell decl `<status>: Phase = \"Loading\"` also fires", () => {
    const source = `<markup name="app">
  <status>: Phase = "Loading"
</>`;
    const diags = lint(source);
    expect(hasCode(diags, "W-LIFECYCLE-CANDIDATE")).toBe(true);
  });

  test("diagnostic message contains promotion guidance", () => {
    const source = `<markup name="app">\n  <status> = "Loading"\n</>`;
    const diags = lint(source);
    const d = diags.find(x => x.code === "W-LIFECYCLE-CANDIDATE");
    expect(d).toBeDefined();
    expect(d.message).toContain("string-discriminator trap");
    expect(d.correction).toContain("enum");
    expect(d.correction).toContain("<match for=");
    expect(d.correction).toContain("<engine for=");
  });

  test("NEGATIVE: <count> = 0 (numeric RHS) does NOT fire", () => {
    const source = `<markup name="app">\n  <count> = 0\n</>`;
    const diags = lint(source);
    expect(hasCode(diags, "W-LIFECYCLE-CANDIDATE")).toBe(false);
  });

  test("NEGATIVE: <flag> = true (boolean RHS) does NOT fire", () => {
    const source = `<markup name="app">\n  <flag> = true\n</>`;
    const diags = lint(source);
    expect(hasCode(diags, "W-LIFECYCLE-CANDIDATE")).toBe(false);
  });

  test("NEGATIVE: <name> = \"alice\" (lowercase initial) does NOT fire", () => {
    const source = `<markup name="app">\n  <name> = "alice"\n</>`;
    const diags = lint(source);
    expect(hasCode(diags, "W-LIFECYCLE-CANDIDATE")).toBe(false);
  });

  test("NEGATIVE: <status> = \"loading\" (lowercase, edge case) does NOT fire", () => {
    // SURVEY-NOTE.md decision: lowercase initial does NOT fire even though it
    // may also be a string-discriminator. False-positive cost on lowercase
    // strings is too high (any "red", "left", "normal" would trip it). The
    // initial-uppercase predicate is the lexical tell.
    const source = `<markup name="app">\n  <status> = "loading"\n</>`;
    const diags = lint(source);
    expect(hasCode(diags, "W-LIFECYCLE-CANDIDATE")).toBe(false);
  });

  test("NEGATIVE: <greeting> = \"Hello world\" (multi-word with space) does NOT fire", () => {
    const source = `<markup name="app">\n  <greeting> = "Hello world"\n</>`;
    const diags = lint(source);
    expect(hasCode(diags, "W-LIFECYCLE-CANDIDATE")).toBe(false);
  });

  test("NEGATIVE: <id> = \"abc-123\" (hyphenated) does NOT fire", () => {
    const source = `<markup name="app">\n  <id> = "abc-123"\n</>`;
    const diags = lint(source);
    expect(hasCode(diags, "W-LIFECYCLE-CANDIDATE")).toBe(false);
  });

  test("NEGATIVE: inside ${} logic block — not a state-cell decl, no fire", () => {
    const source = `<markup name="app">
  <div>\${
    let s = "Loading"
    s
  }</div>
</>`;
    const diags = lint(source);
    expect(hasCode(diags, "W-LIFECYCLE-CANDIDATE")).toBe(false);
  });

  test("NEGATIVE: inside // comment — not a real decl, no fire", () => {
    const source = `<markup name="app">
  // <status> = "Loading"
  <div>hi</div>
</>`;
    const diags = lint(source);
    expect(hasCode(diags, "W-LIFECYCLE-CANDIDATE")).toBe(false);
  });

  test("NEGATIVE: inside ~{} test sigil — legitimate test-body assignment, no fire", () => {
    const source = `<markup name="app">
  <div>hi</div>
  ~{ <status> = "Loading" }
</>`;
    const diags = lint(source);
    expect(hasCode(diags, "W-LIFECYCLE-CANDIDATE")).toBe(false);
  });
});
