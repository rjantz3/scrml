/**
 * Tokenizer — `reset` reserved keyword (Phase A1a Step 1)
 *
 * Verifies that `reset` is tokenized as a KEYWORD-kind token at every site,
 * not as a generic IDENT. This is the foundation for:
 *   - Step 6: expression-parser recognizes `keyword(reset) ( expr )` →
 *             `kind: "reset-expr"` AST node.
 *   - Step 8: ast-builder emits E-RESERVED-IDENTIFIER when `function reset()`
 *             or `fn reset()` is declared.
 *
 * Spec: SPEC.md §6.8.2 (state-cell reset builtin)
 * Contract: docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md §2.1
 *
 * Coverage:
 *   §1  `reset(@x)` in expression position → KEYWORD kind for `reset`
 *   §2  `function reset() {}` in function-name position → KEYWORD kind
 *   §3  `let reset = 1` in let-binding LHS → KEYWORD kind
 *   §4  Substring guards: `notReset`, `resetFoo`, `myReset` → IDENT (not keyword)
 *   §5  `"reset"` inside a string literal → STRING token, not KEYWORD
 *   §6  Position-independence: `reset` is uniformly KEYWORD across positions
 */

import { describe, test, expect } from "bun:test";
import { tokenizeLogic } from "../../src/tokenizer.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lex(content) {
  const tokens = tokenizeLogic(content, 0, 1, 1, []);
  return tokens.filter(t => t.kind !== "EOF");
}

/** Find the first token whose text exactly equals `name`. */
function findToken(tokens, name) {
  return tokens.find(t => t.text === name);
}

// ---------------------------------------------------------------------------
// §1  Expression-position `reset(@x)` → KEYWORD
// ---------------------------------------------------------------------------

describe("tokenizer: `reset` reserved keyword", () => {
  test("§1 `reset(@x)` tokenizes `reset` as KEYWORD-kind", () => {
    const toks = lex("reset(@x)");
    const reset = findToken(toks, "reset");
    expect(reset).toBeDefined();
    expect(reset.kind).toBe("KEYWORD");
  });

  // -------------------------------------------------------------------------
  // §2  Function-name position `function reset() {}` → KEYWORD
  // -------------------------------------------------------------------------

  test("§2 `function reset() {}` tokenizes the name `reset` as KEYWORD-kind", () => {
    const toks = lex("function reset() {}");
    // Two `function`/`reset` tokens: pick the one whose text is `reset`.
    const reset = findToken(toks, "reset");
    expect(reset).toBeDefined();
    expect(reset.kind).toBe("KEYWORD");
  });

  // -------------------------------------------------------------------------
  // §3  Let-binding LHS position `let reset = 1` → KEYWORD
  // -------------------------------------------------------------------------

  test("§3 `let reset = 1` tokenizes `reset` as KEYWORD-kind", () => {
    const toks = lex("let reset = 1");
    const reset = findToken(toks, "reset");
    expect(reset).toBeDefined();
    expect(reset.kind).toBe("KEYWORD");
  });

  // -------------------------------------------------------------------------
  // §4  Substring guards: identifiers containing `reset` as substring → IDENT
  // -------------------------------------------------------------------------

  test("§4 `notReset`, `resetFoo`, `myReset` remain IDENT tokens (substring guard)", () => {
    const cases = ["notReset", "resetFoo", "myReset"];
    for (const name of cases) {
      const toks = lex(name);
      const tok = findToken(toks, name);
      expect(tok).toBeDefined();
      expect(tok.kind).toBe("IDENT");
    }
  });

  // -------------------------------------------------------------------------
  // §5  String-literal `"reset"` → STRING (not a keyword)
  // -------------------------------------------------------------------------

  test("§5 `\"reset\"` inside a string literal is not a KEYWORD token", () => {
    const toks = lex('"reset"');
    // No KEYWORD-kind token whose text is `reset` should appear; the entire
    // literal is a single STRING token whose text includes the quotes.
    const kw = toks.find(t => t.kind === "KEYWORD" && t.text === "reset");
    expect(kw).toBeUndefined();
    // The string literal itself should be present as a single token.
    const str = toks.find(t => t.kind === "STRING");
    expect(str).toBeDefined();
    expect(str.text).toContain("reset");
  });

  // -------------------------------------------------------------------------
  // §6  Position-independence: every occurrence of bare `reset` is KEYWORD
  // -------------------------------------------------------------------------

  test("§6 `reset` is uniformly KEYWORD-kind across multiple positions", () => {
    const toks = lex("reset; foo(reset); { reset }");
    const resets = toks.filter(t => t.text === "reset");
    expect(resets.length).toBe(3);
    for (const t of resets) {
      expect(t.kind).toBe("KEYWORD");
    }
  });
});
