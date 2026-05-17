/**
 * S97 — match-arm RHS bare variant unmask
 *
 * SPEC §18 + §14.10 bare-variant inference allows `.Variant` on the RHS of
 * a match arm where the LHS context determines the type:
 *
 *   const <next>: Mode = match @mode {
 *       .Idle    => .Active     // bare `.Active` on RHS
 *       .Active  => .Pending
 *       .Pending => .Idle
 *   }
 *
 * Pre-fix the client JS leaked `__scrml_bare_variant_Active__` literals —
 * ReferenceError at runtime. Root cause: `preprocessForAcorn` extracts
 * match-arm bodies as JSON-stringified strings via `preprocessMatchExprs`,
 * then the bare-variant rewrite (line 783) catches `.Variant` references
 * INSIDE the quoted arm strings. The LHS position is shielded by the
 * regex's negative-lookbehind on `"` (the opening quote of the arm
 * string), but the RHS position is preceded by space/arrow and gets
 * rewritten to the placeholder. The match emitter then feeds the
 * placeholder-bearing arm.result string to `rewriteExpr`, which has no
 * handler for the placeholder, and it leaks to output.
 *
 * Fix: unmask placeholders at the top of `rewriteEnumVariantAccess`
 * (rewrite.ts:1390). Converts `__scrml_bare_variant_X__` → `.X`; the
 * existing rewrites below handle `.X`:
 *   - unit variant   `.X`       → `"X"`
 *   - payload-call   `.X(args)` → `{ variant: "X", data: {...} }`
 *
 * SPEC authority:
 *   - §18 (pattern matching) — match-stmt RHS is an expression
 *   - §14.10 (bare-variant inference) — `.X` admitted where context typed
 *   - §51.3.2 (S22) — tagged-object shape for payload variants
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import fs from "fs";
import path from "path";
import os from "os";

function compileSrcToTmp(src, basename = "match-rhs-test") {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "match-rhs-"));
  const srcPath = path.join(tmpDir, `${basename}.scrml`);
  fs.writeFileSync(srcPath, src);
  try {
    compileScrml({
      inputFiles: [srcPath],
      write: true,
      outputDir: tmpDir,
    });
    const clientPath = path.join(tmpDir, `${basename}.client.js`);
    return fs.existsSync(clientPath) ? fs.readFileSync(clientPath, "utf-8") : null;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe("§1 — unit-variant RHS unmask", () => {
  test("§1.1 .Idle => .Active emits return \"Active\"", () => {
    const src = `type Mode:enum = { Idle, Active, Pending }

<program>
    <mode>: Mode = .Idle
    const <next>: Mode = match @mode {
        .Idle => .Active
        .Active => .Pending
        .Pending => .Idle
    }
    <div>${"$"}{@next}</div>
</program>`;
    const client = compileSrcToTmp(src);
    expect(client).not.toBeNull();
    // Pre-fix symptom: `return __scrml_bare_variant_Active__;`
    expect(client).not.toMatch(/__scrml_bare_variant_/);
    expect(client).toMatch(/return "Active";/);
    expect(client).toMatch(/return "Pending";/);
    expect(client).toMatch(/return "Idle";/);
    expect(() => new Function(client)).not.toThrow();
  });

  test("§1.2 wildcard arm with bare-variant RHS unmasks", () => {
    const src = `type Mode:enum = { A, B, C }

<program>
    <mode>: Mode = .A
    const <next>: Mode = match @mode {
        .A => .B
        else => .A
    }
    <div>${"$"}{@next}</div>
</program>`;
    const client = compileSrcToTmp(src);
    expect(client).not.toBeNull();
    expect(client).not.toMatch(/__scrml_bare_variant_/);
    expect(client).toMatch(/return "B";/);
    expect(client).toMatch(/return "A";/);
    expect(() => new Function(client)).not.toThrow();
  });
});

describe("§2 — payload-variant RHS unmask + tagged-object lowering", () => {
  test("§2.1 .Loading => .Success(42) emits tagged-object literal", () => {
    const src = `type Status:enum = { Idle, Loading, Success(count: int), Error(msg: string) }

<program>
    <phase>: Status = .Idle
    const <display> = match @phase {
        .Idle => .Loading
        .Loading => .Success(42)
        .Success(c) => .Error("done")
        .Error(m) => .Idle
    }
    <div>${"$"}{@display}</div>
</program>`;
    const client = compileSrcToTmp(src);
    expect(client).not.toBeNull();
    expect(client).not.toMatch(/__scrml_bare_variant_/);
    // Unit-variant RHS lowers to bare string
    expect(client).toMatch(/return "Loading";/);
    expect(client).toMatch(/return "Idle";/);
    // Payload-variant RHS lowers to tagged-object literal
    expect(client).toMatch(/return \{ variant: "Success", data: \{ count: 42 \} \};/);
    expect(client).toMatch(/return \{ variant: "Error", data: \{ msg: "done" \} \};/);
    expect(() => new Function(client)).not.toThrow();
  });
});

describe("§3 — regression: existing structured-AST match path unchanged", () => {
  test("§3.1 pipe-alternation arms still work end-to-end", () => {
    const src = `type Mode:enum = { A, B, C, D }

<program>
    <mode>: Mode = .A
    const <kind> = match @mode {
        .A | .B => "first"
        .C | .D => "second"
    }
    <div>${"$"}{@kind}</div>
</program>`;
    const client = compileSrcToTmp(src);
    expect(client).not.toBeNull();
    expect(client).toMatch(/_scrml_match_\d+ === "A" \|\| _scrml_match_\d+ === "B"/);
    expect(client).toMatch(/return "first";/);
    expect(() => new Function(client)).not.toThrow();
  });

  test("§3.2 string-literal RHS unchanged (regression guard for unrelated arms)", () => {
    const src = `type Mode:enum = { A, B }

<program>
    <mode>: Mode = .A
    const <label> = match @mode {
        .A => "first"
        .B => "second"
    }
    <div>${"$"}{@label}</div>
</program>`;
    const client = compileSrcToTmp(src);
    expect(client).not.toBeNull();
    expect(client).toMatch(/return "first";/);
    expect(client).toMatch(/return "second";/);
    expect(() => new Function(client)).not.toThrow();
  });
});
