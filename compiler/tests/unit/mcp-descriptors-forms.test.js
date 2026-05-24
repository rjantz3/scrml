/**
 * mcp-descriptors-forms.test.js — MCP-V0.A extractor unit test (forms.json)
 *
 * Sub-unit A test follow-on. Compiles a compound state-decl with validators via
 * the REAL per-route emit path, reads `forms.json` from disk, and asserts the
 * descriptor shape — in particular the NESTED `compoundKeys` object that the
 * S126 A↔B contract fix introduced (B's getFormStatus reads
 * `descriptor.compoundKeys.{isValidKey,errorsKey,touchedKey,submittedKey}` at
 * mcp.js:311-323; the four keys are NOT flat on the descriptor root).
 *
 * Form fixture authoring note: a compound is a `<name>` with structural
 * children carrying validators (`<field req length(>=2)> = <input/>`), declared
 * inside a `${ ... }` logic block per the kickstarter §6 / §3.1 markup-as-value
 * decl-coupled-with-render-spec form.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  makeSidecarTmpRoot,
  cleanupSidecarTmpRoot,
  compileAndReadSidecars,
} from "../helpers/mcp-sidecar-compile.js";

let TMP;
beforeAll(() => { TMP = makeSidecarTmpRoot("forms"); });
afterAll(() => { cleanupSidecarTmpRoot(TMP); });

const compile = (src) => compileAndReadSidecars(src, TMP);

// ---------------------------------------------------------------------------
// Fixture — one compound form `signup` with validatable fields per §55.5.
// ---------------------------------------------------------------------------

const FORM_FIXTURE = `<program title="Signup">

\${
  <signup>
    <name req length(>=2)> = <input type="text"/>
    <email req> = <input type="email"/>
  </>
}

<div>placeholder</div>

</program>
`;

describe("MCP-V0.A forms.json extractor", () => {
  test("compiles clean + emits forms.json as a JSON array with the form", () => {
    const { fatal, forms } = compile(FORM_FIXTURE);
    expect(fatal).toEqual([]);
    expect(Array.isArray(forms)).toBe(true);
    expect(forms).toHaveLength(1);
    expect(forms[0].formName).toBe("signup");
  });

  test("compound rollup keys are NESTED under compoundKeys (A↔B contract)", () => {
    const { forms } = compile(FORM_FIXTURE);
    const signup = forms[0];
    // The four compound keys live under `compoundKeys` — NOT flat on root.
    expect(signup.compoundKeys).toEqual({
      isValidKey: "signup.isValid",
      errorsKey: "signup.errors",
      touchedKey: "signup.touched",
      submittedKey: "signup.submitted",
    });
    // Regression guard for the pre-S126 flat shape: the keys must NOT be flat.
    expect(signup.isValidKey).toBeUndefined();
    expect(signup.errorsKey).toBeUndefined();
    expect(signup.touchedKey).toBeUndefined();
    expect(signup.submittedKey).toBeUndefined();
  });

  test("submittedKey is present (compound-only per §55.7) and decodes via compoundKeys", () => {
    const { forms } = compile(FORM_FIXTURE);
    // submitted has NO per-field equivalent — it can only be reached through
    // the nested compoundKeys. This is the field the flat shape made
    // undecodeable for B.
    expect(forms[0].compoundKeys.submittedKey).toBe("signup.submitted");
  });

  test("per-field descriptors carry name, qualifiedName, and the three field keys", () => {
    const { forms } = compile(FORM_FIXTURE);
    const fields = forms[0].fields;
    const byName = Object.fromEntries(fields.map((f) => [f.name, f]));
    expect(byName.name).toEqual({
      name: "name",
      qualifiedName: "signup.name",
      errorsKey: "signup.name.errors",
      isValidKey: "signup.name.isValid",
      touchedKey: "signup.name.touched",
    });
    expect(byName.email).toEqual({
      name: "email",
      qualifiedName: "signup.email",
      errorsKey: "signup.email.errors",
      isValidKey: "signup.email.isValid",
      touchedKey: "signup.email.touched",
    });
  });

  test("emitted forms.json is valid JSON serializable round-trip", () => {
    const { forms } = compile(FORM_FIXTURE);
    // Already JSON.parsed by the helper; re-serialize to confirm no cycles /
    // non-serializable values leaked into the descriptor.
    expect(() => JSON.stringify(forms)).not.toThrow();
  });
});
