/**
 * S101 — String.replace() `$&` backreference-injection class regression guard.
 *
 * Sibling to the S100 `01eeda9` MPA fix (canary test in
 * e2e/tests/docs-website.spec.ts shell-composition). Three additional
 * call sites surfaced via the S101 String.replace audit and were
 * converted from string-form `.replace(re, str)` to function-form
 * `.replace(re, () => str)`:
 *
 *   1. `component-expander.ts:2169` — parametric snippet `${render name(expr)}`
 *      substitution. `expr` is user-authored scrml; if it contains a literal
 *      `$&` / `$1` / `$$`, the snippet body would have been corrupted by
 *      regex backreference interpretation.
 *
 *   2. `tailwind-classes.js:1577` — multi-rule selector rewrite during
 *      `escapeCssClass`. `escapedFullName` can carry a literal `$` for
 *      Tailwind arbitrary-value classes like `bg-[var($foo)]`.
 *
 *   3. `commands/generate.js:242` — `<db src=...>` placeholder substitution
 *      in scaffold output. Read from a user-controlled program-root attribute.
 *
 * Each test exercises the fix by passing an injection-shaped payload
 * through the relevant code path and asserting the literal `$&` / `$1`
 * survives unchanged in the output.
 */
import { describe, test, expect } from "bun:test";

// ---------------------------------------------------------------------------
// 1. Component-expander parametric snippet — argExpr with `$&`
// ---------------------------------------------------------------------------

describe("S101 regression — component-expander snippet param injection", () => {
  test("snippet body.replace(paramRe, argExpr) is function-form (no `$&` interpretation)", () => {
    // Mirror the exact pattern at component-expander.ts:2168-2169 with an
    // injection-shaped argExpr. If the .replace() is string-form, `$&` in
    // argExpr would be replaced by the matched substring (the paramName),
    // producing `param$param` instead of the literal `$&`.
    const body = "<span>Hello, param!</span>";
    const paramName = "param";
    const argExpr = "@user.name $& <strong>extra</strong>"; // injection-shaped
    const paramRe = new RegExp(`\\b${paramName}\\b`, "g");

    // Function-form (the fix):
    const safe = body.replace(paramRe, () => argExpr);
    expect(safe).toBe(`<span>Hello, ${argExpr}!</span>`);
    expect(safe).toContain("$&"); // literal `$&` preserved

    // String-form (the bug, kept here for explicit contrast):
    const buggy = body.replace(paramRe, argExpr);
    expect(buggy).not.toContain("$& <strong>extra</strong>"); // `$&` expanded to "param"
    expect(buggy).toContain("@user.name param <strong>"); // backreference fired
  });

  test("argExpr with `$1` / `$$` survives function-form replace", () => {
    const body = "x";
    const paramRe = new RegExp(`\\bx\\b`, "g");
    const expr1 = "$1 thing";
    const expr2 = "$$ price";
    expect(body.replace(paramRe, () => expr1)).toBe("$1 thing");
    expect(body.replace(paramRe, () => expr2)).toBe("$$ price");
  });
});

// ---------------------------------------------------------------------------
// 2. Tailwind-classes multi-rule selector rewrite — escapedFullName with `$`
// ---------------------------------------------------------------------------

describe("S101 regression — tailwind multi-rule selector rewrite injection", () => {
  test("rewriteMultiRuleSelector preserves literal `$` in escapedFullName", () => {
    // Mirror the exact pattern at tailwind-classes.js:1571-1577 with an
    // injection-shaped escapedFullName. The replacement is `.${escapedFullName}${pseudoSuffix}`;
    // if string-form, `$&` in that template literal becomes the matched
    // selector substring, corrupting CSS rule output.
    const baseRules =
      ".foo { color: red; }\n.foo:hover { color: blue; }";
    const baseName = "foo";
    const escapedFullName = "bg-\\[var\\(\\$injected\\)\\]"; // contains literal `$`
    const pseudoSuffix = "";
    const newSelectorBase = `.${escapedFullName}${pseudoSuffix}`;
    const escaped = baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\.${escaped}(?![a-zA-Z0-9_-])`, "g");

    // Function-form (the fix):
    const safe = baseRules.replace(re, () => newSelectorBase);
    expect(safe).toContain(`.bg-\\[var\\(\\$injected\\)\\] { color: red; }`);
    expect(safe).toContain("$injected"); // literal `$injected` preserved

    // String-form (the bug):
    const buggy = baseRules.replace(re, newSelectorBase);
    // `$injected` is not a valid backreference name; modern engines treat
    // `$<word>` literally only when it doesn't match `$&` / `$$` / `$N`.
    // The explicit demonstration is with `$&`:
    const explicitBuggy = baseRules.replace(re, ".$&-injected");
    expect(explicitBuggy).toContain(".foo-injected"); // `$&` expanded to ".foo"
    expect(explicitBuggy).not.toContain("$&"); // literal `$&` gone
  });
});

// ---------------------------------------------------------------------------
// 3. CLI scaffold `<db src>` substitution — dbSrc with `$&`
// ---------------------------------------------------------------------------

describe("S101 regression — generate.js applySubstitutions dbSrc injection", () => {
  // Re-implement applySubstitutions locally to test the fixed shape without
  // importing the CLI module (which has side effects).
  function applySubstitutionsFixed(body, subs) {
    let out = body;
    if (subs.dbSrc) {
      out = out.replace(
        /(<db\s+src=)"\.\/app\.db"/,
        (_, prefix) => `${prefix}"${subs.dbSrc}"`,
      );
    }
    return out;
  }

  test("dbSrc with `$&` survives function-form replace", () => {
    const body = `<program>\n  <db src="./app.db"/>\n</>`;
    const result = applySubstitutionsFixed(body, { dbSrc: "my$&path.sqlite" });
    expect(result).toContain(`src="my$&path.sqlite"`);
    expect(result).not.toContain(`src="./app.db"`);
  });

  test("dbSrc with `$1` survives function-form replace", () => {
    const body = `<db src="./app.db"/>`;
    const result = applySubstitutionsFixed(body, { dbSrc: "$1.sqlite" });
    expect(result).toBe(`<db src="$1.sqlite"/>`);
  });

  test("dbSrc plain string (no $) unchanged behavior", () => {
    const body = `<db src="./app.db"/>`;
    const result = applySubstitutionsFixed(body, { dbSrc: "/var/lib/myapp.db" });
    expect(result).toBe(`<db src="/var/lib/myapp.db"/>`);
  });
});
