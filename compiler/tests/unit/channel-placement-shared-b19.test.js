/**
 * Phase A1b Step B19 — Channels file-level placement + `@shared` modifier
 * rejection (PASS 14: walkValidateChannels).
 *
 * Per SPEC §38.1 (line 15422), §38.4 (line 15468), §34 catalog rows
 * E-CHANNEL-INSIDE-PROGRAM and E-CHANNEL-SHARED-MODIFIER.
 *
 * **What B19 owns:**
 *   1. E-CHANNEL-INSIDE-PROGRAM — `<channel>` reached at markupDepth >= 1
 *      (i.e. nested inside `<program>`, another markup, or a component-def).
 *   2. E-CHANNEL-SHARED-MODIFIER — any `state-decl` with `isShared: true`
 *      (i.e. source contains `@shared <name> = …`).
 *
 * **Out of scope (deferred elsewhere):**
 *   - V5-strict access validation inside channel body (B3 owns `@cellName`).
 *   - Cross-scope channel-cell visibility (B1 PASS 1 + B3 PASS 3 cover).
 *   - Channel attribute shape errors (E-CHANNEL-001/-005/-007 — codegen).
 *   - A1c codegen — runtime concern.
 *
 * Coverage areas:
 *   §B19.1 — top-level `<channel>` (sibling of `<program>`) does NOT fire
 *   §B19.2 — `<channel>` nested inside `<program>` fires E-CHANNEL-INSIDE-PROGRAM
 *   §B19.3 — `<channel>` nested deeper (inside markup descendant of program) fires
 *   §B19.4 — V5-strict channel body (`<x> = init`) does NOT fire E-CHANNEL-SHARED-MODIFIER
 *   §B19.5 — `@shared` inside channel body fires E-CHANNEL-SHARED-MODIFIER
 *   §B19.6 — `@shared` inside `<program>` (no channel) still fires (§38.4 line 15468)
 *   §B19.7 — multiple violations: each fires its own diagnostic
 *   §B19.8 — diagnostic message shape (code + spec ref + canonical fix wording)
 *   §B19.9 — span attached on the offending node
 *   §B19.10 — file-level `<channel>` + cross-scope `@cellName` access from `<program>`
 *             (placement OK, no E-CHANNEL-INSIDE-PROGRAM; B3 still resolves cells)
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runSYM } from "../../src/symbol-table.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compileSym(source, filePath = "test.scrml") {
  const bs = splitBlocks(filePath, source);
  const tab = buildAST(bs);
  const sym = runSYM({ filePath, ast: tab.ast });
  return { ast: tab.ast, tabErrors: tab.errors, sym };
}

function errorsByCode(sym, code) {
  return sym.errors.filter(e => e.code === code);
}

// ---------------------------------------------------------------------------
// §B19.1 — top-level `<channel>` does NOT fire E-CHANNEL-INSIDE-PROGRAM
// ---------------------------------------------------------------------------

describe("§B19.1 top-level <channel> is allowed", () => {
  test("file-level <channel> sibling of <program> — no E-CHANNEL-INSIDE-PROGRAM", () => {
    const source = `<channel name="chat">
\${
  <messages> = []
}
</>
<program>
\${ <draft> = "" }
</program>`;
    const { sym } = compileSym(source);
    expect(errorsByCode(sym, "E-CHANNEL-INSIDE-PROGRAM")).toHaveLength(0);
  });

  test("multiple top-level <channel> elements all allowed", () => {
    const source = `<channel name="c1">
\${ <a> = 0 }
</>
<channel name="c2">
\${ <b> = 0 }
</>
<program>
\${ <x> = 0 }
</program>`;
    const { sym } = compileSym(source);
    expect(errorsByCode(sym, "E-CHANNEL-INSIDE-PROGRAM")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §B19.2 — `<channel>` nested inside `<program>` fires
// ---------------------------------------------------------------------------

describe("§B19.2 <channel> nested in <program> fires E-CHANNEL-INSIDE-PROGRAM", () => {
  test("`<channel>` direct child of `<program>` fires", () => {
    const source = `<program>
\${ <draft> = "" }
<channel name="nested">
\${ <messages> = [] }
</>
</program>`;
    const { sym } = compileSym(source);
    const fires = errorsByCode(sym, "E-CHANNEL-INSIDE-PROGRAM");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].severity).toBe("error");
    expect(fires[0].message).toContain("E-CHANNEL-INSIDE-PROGRAM");
    expect(fires[0].message).toContain("§38.1");
    expect(fires[0].message).toContain("nested");
  });
});

// ---------------------------------------------------------------------------
// §B19.3 — `<channel>` nested deeper (inside another markup) fires
// ---------------------------------------------------------------------------

describe("§B19.3 <channel> nested at depth >= 2 fires", () => {
  test("two top-level markups, channel under second fires (any non-top-level placement)", () => {
    // Two co-equal top-level markup elements: <foo> and <program>. Channel
    // placed inside <foo> fires (placement is "not file top level", per
    // §38.1 line 15422 "(or any other element)").
    //
    // Note: nesting under a non-program markup is rare in practice (a
    // .scrml file is typically a <program> root); but the spec wording
    // is universal and the walker enforces uniformly.
    const source = `<foo>
<channel name="weird">
\${ <a> = 0 }
</>
</foo>
<program>
\${ <x> = 0 }
</program>`;
    const { sym } = compileSym(source);
    const fires = errorsByCode(sym, "E-CHANNEL-INSIDE-PROGRAM");
    expect(fires.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// §B19.4 — V5-strict channel body does NOT fire E-CHANNEL-SHARED-MODIFIER
// ---------------------------------------------------------------------------

describe("§B19.4 V5-strict channel body does not fire E-CHANNEL-SHARED-MODIFIER", () => {
  test("<x> = init inside channel body — no E-CHANNEL-SHARED-MODIFIER", () => {
    const source = `<channel name="chat">
\${
  <messages> = []
  <count> = 0
}
</>
<program>
\${ <draft> = "" }
</program>`;
    const { sym } = compileSym(source);
    expect(errorsByCode(sym, "E-CHANNEL-SHARED-MODIFIER")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §B19.5 — `@shared` inside channel body fires
// ---------------------------------------------------------------------------

describe("§B19.5 `@shared` inside channel body fires E-CHANNEL-SHARED-MODIFIER", () => {
  test("`@shared count = 0` inside `<channel>` body fires", () => {
    const source = `<channel name="chat">
\${
  @shared count = 0
}
</>
<program>
\${ <x> = 0 }
</program>`;
    const { sym } = compileSym(source);
    const fires = errorsByCode(sym, "E-CHANNEL-SHARED-MODIFIER");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].severity).toBe("error");
    expect(fires[0].message).toContain("E-CHANNEL-SHARED-MODIFIER");
    expect(fires[0].message).toContain("@shared");
    expect(fires[0].message).toContain("§38.4");
  });
});

// ---------------------------------------------------------------------------
// §B19.6 — `@shared` outside any channel still fires (§38.4 line 15468)
// ---------------------------------------------------------------------------

describe("§B19.6 `@shared` anywhere fires (§38.4 line 15468)", () => {
  test("`@shared` inside `<program>` (no channel) — still fires", () => {
    const source = `<program>
\${
  @shared total = 0
}
</program>`;
    const { sym } = compileSym(source);
    const fires = errorsByCode(sym, "E-CHANNEL-SHARED-MODIFIER");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toContain("@shared");
  });
});

// ---------------------------------------------------------------------------
// §B19.7 — multiple violations: each fires its own diagnostic
// ---------------------------------------------------------------------------

describe("§B19.7 multiple violations fire independent diagnostics", () => {
  test("two `@shared` decls inside channel + nested channel — three fires total", () => {
    // Use semicolons so the parser produces THREE separate state-decls with
    // isShared:true (without semicolons, only the first @shared in a logic
    // block becomes a state-decl; subsequent @shared lines get folded into
    // the prior init expression by collectExpr() — pre-existing TAB
    // behavior, out of scope for B19).
    const source = `<program>
\${ <draft> = "" }
<channel name="nested">
\${
  @shared messages = [];
  @shared count = 0;
}
</>
</program>`;
    const { sym } = compileSym(source);
    const placementFires = errorsByCode(sym, "E-CHANNEL-INSIDE-PROGRAM");
    const sharedFires = errorsByCode(sym, "E-CHANNEL-SHARED-MODIFIER");
    expect(placementFires).toHaveLength(1);
    expect(sharedFires).toHaveLength(2);
    // Each shared fire references one of the cell names.
    const messages = sharedFires.map(f => f.message).join("\n");
    expect(messages).toContain("messages");
    expect(messages).toContain("count");
  });

  test("multiple top-level @shared (no channel anywhere) — each fires", () => {
    const source = `<program>
\${
  @shared a = 0;
  @shared b = 1;
  @shared c = 2;
}
</program>`;
    const { sym } = compileSym(source);
    const fires = errorsByCode(sym, "E-CHANNEL-SHARED-MODIFIER");
    expect(fires).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// §B19.8 — diagnostic message shape (canonical fix wording)
// ---------------------------------------------------------------------------

describe("§B19.8 diagnostic messages reference spec sections + canonical fix", () => {
  test("E-CHANNEL-INSIDE-PROGRAM message references §38.1 + canonical placement fix", () => {
    const source = `<program>
<channel name="x">
\${ <m> = [] }
</>
</program>`;
    const { sym } = compileSym(source);
    const fires = errorsByCode(sym, "E-CHANNEL-INSIDE-PROGRAM");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    const msg = fires[0].message;
    expect(msg).toContain("§38.1");
    expect(msg).toContain("§34");
    expect(msg).toContain("file-level");
    expect(msg).toContain("v0.next");
    // Names the channel via name= when extractable.
    expect(msg).toMatch(/name="x"/);
  });

  test("E-CHANNEL-SHARED-MODIFIER message references §38.4 + V5-strict fix wording", () => {
    const source = `<program>
\${ @shared count = 0 }
</program>`;
    const { sym } = compileSym(source);
    const fires = errorsByCode(sym, "E-CHANNEL-SHARED-MODIFIER");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    const msg = fires[0].message;
    expect(msg).toContain("§38.4");
    expect(msg).toContain("§34");
    expect(msg).toContain("V5-strict");
    expect(msg).toContain("v0.next");
    // Mentions structural form fix.
    expect(msg).toContain("<count>");
  });
});

// ---------------------------------------------------------------------------
// §B19.9 — span attached on offending node
// ---------------------------------------------------------------------------

describe("§B19.9 diagnostic span attached on the offending node", () => {
  test("E-CHANNEL-INSIDE-PROGRAM span points to the channel-decl node", () => {
    const source = `<program>
<channel name="x">
\${ <m> = [] }
</>
</program>`;
    const { ast, sym } = compileSym(source);
    const fires = errorsByCode(sym, "E-CHANNEL-INSIDE-PROGRAM");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    const fire = fires[0];
    expect(fire.span).toBeDefined();
    expect(typeof fire.span.start).toBe("number");
    expect(typeof fire.span.end).toBe("number");
    expect(fire.span.end).toBeGreaterThan(fire.span.start);
  });

  test("E-CHANNEL-SHARED-MODIFIER span points to the state-decl node", () => {
    const source = `<program>
\${ @shared count = 0 }
</program>`;
    const { sym } = compileSym(source);
    const fires = errorsByCode(sym, "E-CHANNEL-SHARED-MODIFIER");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    const fire = fires[0];
    expect(fire.span).toBeDefined();
    expect(typeof fire.span.start).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// §B19.10 — file-level channel + cross-scope @cellName access (B3 unaffected)
// ---------------------------------------------------------------------------

describe("§B19.10 file-level channel keeps cross-scope @cellName access (B3) intact", () => {
  test("`@messages` access from `<program>` — placement OK + B3 resolves cell", () => {
    const source = `<channel name="chat">
\${ <messages> = [] }
</>
<program>
\${
  function send() {
    const n = @messages.length
    return n
  }
}
</program>`;
    const { sym } = compileSym(source);
    expect(errorsByCode(sym, "E-CHANNEL-INSIDE-PROGRAM")).toHaveLength(0);
    expect(errorsByCode(sym, "E-CHANNEL-SHARED-MODIFIER")).toHaveLength(0);
    // The channel-body cell is registered in the file scope (channel body's
    // logic block does not introduce a new scope), so the symbol table
    // contains a record for `messages`.
    expect(sym.fileScope.stateCells.has("messages")).toBe(true);
  });
});
