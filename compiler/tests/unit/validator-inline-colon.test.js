/**
 * E-VALIDATOR-INLINE-COLON — colon-form inline-message override (§55.10 / §41.12, S185).
 *
 * The §55.10-normative Level-1 inline message override is the PAREN form — a
 * trailing string-literal ARG inside the validator parens (`<name req("…")>`,
 * `<name length(>=2, "…")>`). The COLON form `<name req:"…">` /
 * `<name length(>=2):"…">` is NOT valid scrml: the `:`-after-validator collided
 * with the decl scanner's `:`-handling and silently corrupted the cell's
 * `@`-access registration, so every later `@cell` / `@parent.field` reference
 * fired a MISLEADING E-SCOPE-001 ("undeclared `@cell`") pointing at the cell
 * rather than the malformed validator (g-validator-inline-msg-colon-form).
 *
 * The fix detects the colon-form at decl-scan time, fires a CLEAR
 * E-VALIDATOR-INLINE-COLON naming the paren form as the resolution, AND recovers
 * by registering the cell with the message as the paren-form inline override — so
 * the adopter sees exactly ONE clear error at the decl and the misleading
 * E-SCOPE-001 cascade does NOT fire.
 *
 * E- prefix → result.errors (fatal). Tests assert over BOTH streams so a
 * partition regression (an E- code silently moving to result.warnings) is caught.
 *
 * Fire site: ast-builder.js scanStructuralDeclLookahead → tryRecoverColonInlineMessage.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let TMP;
beforeAll(() => { TMP = mkdtempSync(join(tmpdir(), "validator-inline-colon-")); });
afterAll(() => { if (TMP) rmSync(TMP, { recursive: true, force: true }); });

function compile(src) {
  const fp = join(TMP, `f-${Math.random().toString(36).slice(2)}.scrml`);
  writeFileSync(fp, src);
  return compileScrml({ inputFiles: [fp], outputDir: join(TMP, "dist"), write: false, log: () => {} });
}

// Cross-stream collectors. E- partitions to result.errors, but assert over BOTH
// streams so a partition regression is caught rather than silently passing.
function colonDiags(res) {
  return [...(res.errors || []), ...(res.warnings || [])]
    .filter((d) => d.code === "E-VALIDATOR-INLINE-COLON");
}
function scopeDiags(res) {
  return [...(res.errors || []), ...(res.warnings || [])]
    .filter((d) => d.code === "E-SCOPE-001");
}

// ---------------------------------------------------------------------------
// POSITIVE — the colon-form fires E-VALIDATOR-INLINE-COLON, recovers (no cascade)
// ---------------------------------------------------------------------------

describe("E-VALIDATOR-INLINE-COLON — fires + recovers", () => {
  test("top-level cell `<ref req:\"…\">` fires the colon diagnostic", () => {
    const res = compile(`<program title="T">
<ref req:"A reference is required."> = <input type="text"/>
<form>
    <label>Reference <ref/></>
    <errors of=@ref/>
</form>
</program>`);
    expect(colonDiags(res).length).toBe(1);
    // E- code → result.errors, never result.warnings.
    expect((res.warnings || []).some((d) => d.code === "E-VALIDATOR-INLINE-COLON")).toBe(false);
    expect((res.errors || []).some((d) => d.code === "E-VALIDATOR-INLINE-COLON")).toBe(true);
  });

  test("top-level cell recovers — the misleading E-SCOPE-001 cascade does NOT fire", () => {
    const res = compile(`<program title="T">
<ref req:"A reference is required."> = <input type="text"/>
<form>
    <label>Reference <ref/></>
    <errors of=@ref/>
</form>
</program>`);
    expect(scopeDiags(res).length).toBe(0);
  });

  test("compound child `<name req:\"…\">` fires + parent `@signup` registers (no E-SCOPE-001)", () => {
    const res = compile(`<program title="T">
<signup>
    <name req:"Please enter your name."> = <input type="text"/>
</>
<form>
    <label>Name <name/></>
    <errors of=@signup.name/>
</form>
</program>`);
    expect(colonDiags(res).length).toBe(1);
    expect(scopeDiags(res).length).toBe(0);
  });

  test("call-form validator with trailing colon (`length(>=2):\"…\"`) fires + recovers", () => {
    const res = compile(`<program title="T">
<name length(>=2):"Name too short."> = <input type="text"/>
<form>
    <label>Name <name/></>
    <errors of=@name/>
</form>
</program>`);
    expect(colonDiags(res).length).toBe(1);
    expect(scopeDiags(res).length).toBe(0);
  });

  test("diagnostic names the paren form and the offending validator", () => {
    const res = compile(`<program title="T">
<ref req:"A reference is required."> = <input type="text"/>
<form><errors of=@ref/></form>
</program>`);
    const d = colonDiags(res)[0];
    expect(d).toBeDefined();
    expect(d.message).toContain("req(");
    expect(d.message).toContain("§55.10");
  });
});

// ---------------------------------------------------------------------------
// NEGATIVE — the paren form + the legit typed-cell `:` decl MUST NOT fire
// ---------------------------------------------------------------------------

describe("E-VALIDATOR-INLINE-COLON — no false fire", () => {
  test("paren form `<ref req(\"…\")>` does NOT fire (canonical)", () => {
    const res = compile(`<program title="T">
<ref req("A reference is required.")> = <input type="text"/>
<form>
    <label>Reference <ref/></>
    <errors of=@ref/>
</form>
</program>`);
    expect(colonDiags(res).length).toBe(0);
    expect(scopeDiags(res).length).toBe(0);
  });

  test("paren form with trailing string `<name length(>=2, \"…\")>` does NOT fire", () => {
    const res = compile(`<program title="T">
<name length(>=2, "Name too short")> = <input type="text"/>
<form>
    <label>Name <name/></>
    <errors of=@name/>
</form>
</program>`);
    expect(colonDiags(res).length).toBe(0);
    expect(scopeDiags(res).length).toBe(0);
  });

  test("typed-cell annotation `<count>: number = 0` does NOT fire (the `:` is AFTER `>`)", () => {
    const res = compile(`<program title="T">
<count>: number = 0
<form>
    <button onclick=\${ @count = @count + 1 }>\${@count}</button>
</form>
</program>`);
    expect(colonDiags(res).length).toBe(0);
    expect(scopeDiags(res).length).toBe(0);
  });

  test("typed compound `<userInfo>: UserInfo = (...)` does NOT fire", () => {
    const res = compile(`<program title="T">
\${ type UserInfo:struct = { name: string, age: number } }
<userInfo>: UserInfo = ("alice", 30)
<form><p>\${@userInfo.name}</p></form>
</program>`);
    expect(colonDiags(res).length).toBe(0);
  });

  test("bare validators `<password req length(>=8)>` (no colon) do NOT fire", () => {
    const res = compile(`<program title="T">
<password req length(>=8)> = <input type="password"/>
<form>
    <label>PW <password/></>
    <errors of=@password/>
</form>
</program>`);
    expect(colonDiags(res).length).toBe(0);
    expect(scopeDiags(res).length).toBe(0);
  });
});
