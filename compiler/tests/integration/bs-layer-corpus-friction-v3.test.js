/**
 * BS-layer corpus-friction v3 regression tests (S94+).
 *
 * Captures the sibling-friction shape surfaced (but explicitly NOT fixed)
 * by BS-batch v2 (`2201556`): the `E-COMPONENT-031` "unslotted children
 * but no spread" predicate in component-expander.ts over-fired on use-
 * sites whose only "unslotted" children were source-format whitespace
 * text nodes between slotted markup siblings.
 *
 *   <Card>
 *     <header slot="header">Title</>
 *
 *     <footer slot="footer">Footer</>
 *   </Card>
 *
 * Pre-fix the three whitespace text nodes (leading indent, blank-line
 * between slotted children, trailing indent) all flowed into
 * `unslottedChildren` and the predicate `unslottedChildren.length > 0`
 * fired E-COMPONENT-031 three times — once per recursive walk level
 * — even though the adopter authored no actual unslotted content.
 *
 * Fix surface: compiler/src/component-expander.ts — the predicate
 * at the fire-check site is replaced with `hasNonWhitespaceUnslottedChild`,
 * which skips text nodes whose `value` matches /^\s*$/. The
 * `unslottedChildren` array itself is unchanged so any downstream
 * `${...}` spread injection still receives the whitespace text nodes.
 *
 * Boundary protected by these tests:
 *   - Whitespace-only between slots → no E-COMPONENT-031.
 *   - Real content between slots ("hello") → E-COMPONENT-031 STILL fires.
 *   - "  hello  " (whitespace-surrounded real content) → E-COMPONENT-031
 *     STILL fires (the trim is for WHITESPACE-ONLY, not whitespace-
 *     surrounded content).
 *   - Cross-check: example 12 (the existing slot+spread surface)
 *     compiles clean (no NEW false-pass).
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { writeFileSync, mkdirSync, rmSync, mkdtempSync } from "fs";
import { join, dirname, resolve } from "path";
import { tmpdir } from "os";

function compileSrc(srcName, src) {
  const TMP = mkdtempSync(join(tmpdir(), "bs-bug-v3-"));
  const path = join(TMP, srcName);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, src);
  const result = compileScrml({
    inputFiles: [path],
    outputDir: join(TMP, "out"),
    write: false,
    gather: false,
    log: () => {},
  });
  try {
    rmSync(TMP, { recursive: true, force: true });
  } catch {}
  return result;
}

function diagCodes(result) {
  const codes = [];
  for (const e of result.errors ?? []) codes.push(e.code);
  for (const w of result.warnings ?? []) codes.push(w.code);
  return codes;
}

function fatalErrors(result) {
  return (result.errors ?? []).filter(e => e.severity === "error" || !e.severity);
}

// ---------------------------------------------------------------------------
// Whitespace-only text between slotted children — no E-COMPONENT-031
// ---------------------------------------------------------------------------

describe("E-COMPONENT-031 whitespace-only between slotted children", () => {
  test("blank line between two slotted children → no E-COMPONENT-031", () => {
    const src = `<program>
  \${
    const Card = <div class="card">
      <header>\${render header()}</>
      <footer>\${render footer()}</>
    </div>
  }

  <Card>
    <header slot="header">Title</>

    <footer slot="footer">Footer</>
  </Card>
</program>
`;
    const result = compileSrc("repro.scrml", src);
    const e031 = fatalErrors(result).filter(e => e.code === "E-COMPONENT-031");
    expect(e031).toHaveLength(0);
    // And the compile should not be fatal at all.
    expect(fatalErrors(result)).toHaveLength(0);
  });

  test("only whitespace between slots (no blank line) → no E-COMPONENT-031", () => {
    // Whitespace-only here is just the inter-element indent + newlines,
    // with no blank line between the two slotted children.
    const src = `<program>
  \${
    const Card = <div class="card">
      <header>\${render header()}</>
      <footer>\${render footer()}</>
    </div>
  }
  <Card>
    <header slot="header">Title</>
    <footer slot="footer">Footer</>
  </Card>
</program>
`;
    const result = compileSrc("repro2.scrml", src);
    const e031 = fatalErrors(result).filter(e => e.code === "E-COMPONENT-031");
    expect(e031).toHaveLength(0);
    expect(fatalErrors(result)).toHaveLength(0);
  });

  test("leading + trailing whitespace inside <Card> (all-slotted) → no E-COMPONENT-031", () => {
    // Pure whitespace before/after the slotted children. No content between.
    const src = `<program>
  \${
    const Card = <div class="card">
      <header>\${render header()}</>
    </div>
  }
  <Card>
    \n  \t
    <header slot="header">Title</>
    \n
  </Card>
</program>
`;
    const result = compileSrc("repro3.scrml", src);
    const e031 = fatalErrors(result).filter(e => e.code === "E-COMPONENT-031");
    expect(e031).toHaveLength(0);
    expect(fatalErrors(result)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Negative cases — predicate is whitespace-ONLY, not whitespace-surrounding
// ---------------------------------------------------------------------------

describe("E-COMPONENT-031 still fires for adopter-authored content between slots", () => {
  test("bare 'hello' between slots → E-COMPONENT-031 fires", () => {
    const src = `<program>
  \${
    const Card = <div class="card">
      <header>\${render header()}</>
      <footer>\${render footer()}</>
    </div>
  }
  <Card>
    <header slot="header">Title</>
    hello
    <footer slot="footer">Footer</>
  </Card>
</program>
`;
    const result = compileSrc("adversarial.scrml", src);
    const e031 = fatalErrors(result).filter(e => e.code === "E-COMPONENT-031");
    expect(e031.length).toBeGreaterThanOrEqual(1);
    expect(e031[0].message).toContain("Card");
  });

  test("'  hello  ' (whitespace-surrounded real content) → E-COMPONENT-031 fires", () => {
    // The trim is for WHITESPACE-ONLY, not whitespace-surrounded — a text node
    // whose .value contains any non-whitespace character is still unslotted
    // content for the purposes of the diagnostic.
    const src = `<program>
  \${
    const Card = <div class="card">
      <header>\${render header()}</>
      <footer>\${render footer()}</>
    </div>
  }
  <Card>
    <header slot="header">Title</>     hello     <footer slot="footer">Footer</>
  </Card>
</program>
`;
    const result = compileSrc("adversarial2.scrml", src);
    const e031 = fatalErrors(result).filter(e => e.code === "E-COMPONENT-031");
    expect(e031.length).toBeGreaterThanOrEqual(1);
    expect(e031[0].message).toContain("Card");
  });

  test("non-text unslotted markup between slots → E-COMPONENT-031 fires", () => {
    // A non-text node (markup without slot=) between slotted children must
    // still trip the predicate — the fix is text-node-specific.
    const src = `<program>
  \${
    const Card = <div class="card">
      <header>\${render header()}</>
      <footer>\${render footer()}</>
    </div>
  }
  <Card>
    <header slot="header">Title</>
    <p>body</p>
    <footer slot="footer">Footer</>
  </Card>
</program>
`;
    const result = compileSrc("adversarial3.scrml", src);
    const e031 = fatalErrors(result).filter(e => e.code === "E-COMPONENT-031");
    expect(e031.length).toBeGreaterThanOrEqual(1);
    expect(e031[0].message).toContain("Card");
  });
});

// ---------------------------------------------------------------------------
// Cross-check: existing corpus example 12 (slot+spread) still compiles clean
// ---------------------------------------------------------------------------

describe("Cross-check: examples/12-snippets-slots.scrml not regressed", () => {
  test("example 12 compiles with no fatal errors after the whitespace fix", () => {
    const exPath = resolve(import.meta.dir, "../../../examples/12-snippets-slots.scrml");
    const result = compileScrml({
      inputFiles: [exPath],
      outputDir: join(mkdtempSync(join(tmpdir(), "bs-bug-v3-ex12-")), "out"),
      write: false,
      gather: false,
      log: () => {},
    });
    // The example uses both slot= and ${...} spread; pre/post fix it must
    // compile clean (no E-COMPONENT-031 false-pass introduced by the predicate
    // change, no regression of the BSBv2-landed fix for shape #12).
    expect(fatalErrors(result)).toHaveLength(0);
    const e031 = fatalErrors(result).filter(e => e.code === "E-COMPONENT-031");
    expect(e031).toHaveLength(0);
  });
});
