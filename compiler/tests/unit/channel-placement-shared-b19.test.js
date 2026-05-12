/**
 * Phase A1b Step B19 — Channels placement + `@shared` modifier rejection
 * (PASS 14: walkValidateChannels).
 *
 * Per SPEC §38.1, §38.4 (line 15468), §34 catalog rows
 * E-CHANNEL-OUTSIDE-PROGRAM (v0.3 direction) and E-CHANNEL-SHARED-MODIFIER.
 *
 * **v0.3 direction reversal (Wave 1, 2026-05-12).** This test file was
 * rewritten when the channel placement contract reversed: under v0.3,
 * channels live INSIDE `<program>` (channels are app-scope shared-state
 * vehicles, one-program-per-application). File-top channels now fire
 * `E-CHANNEL-OUTSIDE-PROGRAM` (direction REVERSED from pre-v0.3
 * `E-CHANNEL-INSIDE-PROGRAM`).
 *
 * **What B19 owns (v0.3):**
 *   1. E-CHANNEL-OUTSIDE-PROGRAM — `<channel>` reached at programDepth === 0
 *      (i.e. no `<program>` ancestor in the markup tree).
 *   2. E-CHANNEL-SHARED-MODIFIER — any `state-decl` with `isShared: true`
 *      (i.e. source contains `@shared <name> = …`).
 *
 * **S87 Insight 30 dispensation (ratified 47/44/44):** Module-file
 * `<channel>` shape — a `<channel>` at file top in a file with no
 * `<program>` element anywhere (the PURE-CHANNEL-FILE shape per §38.12.6)
 * is canonical placement and DOES NOT fire `E-CHANNEL-OUTSIDE-PROGRAM`.
 * Engine-parity rationale per §21.8 / B14 (cross-file `<engine>` admits
 * the same module-file file-top placement). Coverage in §B19.11.
 *
 * **Out of scope (deferred to later waves):**
 *   - E-CHANNEL-INSIDE-PAGE — `<channel>` inside `<page>` fire-site. Wave 1
 *     does not tokenize `<page>` as a structural element; that fire-site is
 *     filed for the wave that lands `<page>` parser support. The error code
 *     is registered in §34 now.
 *   - V5-strict access validation inside channel body (B3 owns `@cellName`).
 *   - Cross-scope channel-cell visibility (B1 PASS 1 + B3 PASS 3 cover).
 *   - Channel attribute shape errors (E-CHANNEL-001/-005/-007 — codegen).
 *   - A8 exporter-as-route-SoT contract (deferred per §38.1; CHX continues
 *     to satisfy cross-file channel access under the Insight 30 dispensation).
 *
 * Coverage areas:
 *   §B19.1 — `<channel>` inside `<program>` does NOT fire E-CHANNEL-OUTSIDE-PROGRAM
 *   §B19.2 — `<channel>` at file top level in a file WITH `<program>` fires
 *   §B19.3 — `<channel>` inside a non-program markup (program-sibling) fires
 *   §B19.4 — V5-strict channel body (`<x> = init`) does NOT fire E-CHANNEL-SHARED-MODIFIER
 *   §B19.5 — `@shared` inside channel body fires E-CHANNEL-SHARED-MODIFIER
 *   §B19.6 — `@shared` inside `<program>` (no channel) still fires (§38.4 line 15468)
 *   §B19.7 — multiple violations: each fires its own diagnostic
 *   §B19.8 — diagnostic message shape (code + spec ref + canonical fix wording)
 *   §B19.9 — span attached on the offending node
 *   §B19.10 — channel inside `<program>` + cross-scope `@cellName` access (B3 intact)
 *   §B19.11 — S87 Insight 30: module-file `<channel>` dispensation (PURE-CHANNEL-FILE)
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
// §B19.1 — `<channel>` inside `<program>` does NOT fire E-CHANNEL-OUTSIDE-PROGRAM
// ---------------------------------------------------------------------------

describe("§B19.1 <channel> inside <program> is allowed (v0.3 canonical)", () => {
  test("`<channel>` direct child of `<program>` — no E-CHANNEL-OUTSIDE-PROGRAM", () => {
    const source = `<program>
\${ <draft> = "" }
<channel name="chat">
\${ <messages> = [] }
</>
</program>`;
    const { sym } = compileSym(source);
    expect(errorsByCode(sym, "E-CHANNEL-OUTSIDE-PROGRAM")).toHaveLength(0);
  });

  test("multiple `<channel>` elements inside `<program>` all allowed", () => {
    const source = `<program>
\${ <x> = 0 }
<channel name="c1">
\${ <a> = 0 }
</>
<channel name="c2">
\${ <b> = 0 }
</>
</program>`;
    const { sym } = compileSym(source);
    expect(errorsByCode(sym, "E-CHANNEL-OUTSIDE-PROGRAM")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §B19.2 — `<channel>` at file top level (no <program> ancestor) fires
// ---------------------------------------------------------------------------

describe("§B19.2 <channel> at file top level fires E-CHANNEL-OUTSIDE-PROGRAM", () => {
  test("file-top `<channel>` sibling of `<program>` fires", () => {
    const source = `<channel name="chat">
\${ <messages> = [] }
</>
<program>
\${ <draft> = "" }
</program>`;
    const { sym } = compileSym(source);
    const fires = errorsByCode(sym, "E-CHANNEL-OUTSIDE-PROGRAM");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].severity).toBe("error");
    expect(fires[0].message).toContain("E-CHANNEL-OUTSIDE-PROGRAM");
    expect(fires[0].message).toContain("§38.1");
    expect(fires[0].message).toContain("chat");
  });

  // S87 Insight 30 dispensation: file-top `<channel>` in a MODULE FILE
  // (no `<program>` element anywhere — PURE-CHANNEL-FILE shape per §38.12.6)
  // is canonical and DOES NOT fire. The case below now lives in §B19.11.
});

// ---------------------------------------------------------------------------
// §B19.3 — `<channel>` inside non-program markup at file top fires
// ---------------------------------------------------------------------------

describe("§B19.3 <channel> inside non-program markup at file top fires", () => {
  test("`<channel>` inside `<foo>` at file top fires (no `<program>` ancestor)", () => {
    // Two top-level markups: <foo> and <program>. The channel inside <foo>
    // has no `<program>` ancestor — fires under v0.3 (channels need a
    // `<program>` ancestor, no exception for non-program wrappers).
    const source = `<foo>
<channel name="weird">
\${ <a> = 0 }
</>
</foo>
<program>
\${ <x> = 0 }
</program>`;
    const { sym } = compileSym(source);
    const fires = errorsByCode(sym, "E-CHANNEL-OUTSIDE-PROGRAM");
    expect(fires.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// §B19.4 — V5-strict channel body does NOT fire E-CHANNEL-SHARED-MODIFIER
// ---------------------------------------------------------------------------

describe("§B19.4 V5-strict channel body does not fire E-CHANNEL-SHARED-MODIFIER", () => {
  test("<x> = init inside channel body — no E-CHANNEL-SHARED-MODIFIER", () => {
    const source = `<program>
\${ <draft> = "" }
<channel name="chat">
\${
  <messages> = []
  <count> = 0
}
</>
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
    const source = `<program>
\${ <x> = 0 }
<channel name="chat">
\${
  @shared count = 0
}
</>
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
  test("two `@shared` decls inside in-program channel — two shared fires", () => {
    // Use semicolons so the parser produces TWO separate state-decls with
    // isShared:true (without semicolons, only the first @shared in a logic
    // block becomes a state-decl; subsequent @shared lines get folded into
    // the prior init expression by collectExpr() — pre-existing TAB
    // behavior, out of scope for B19).
    //
    // Channel placement (inside `<program>`) is v0.3-canonical so it does
    // NOT fire E-CHANNEL-OUTSIDE-PROGRAM; only the @shared modifier fires.
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
    const placementFires = errorsByCode(sym, "E-CHANNEL-OUTSIDE-PROGRAM");
    const sharedFires = errorsByCode(sym, "E-CHANNEL-SHARED-MODIFIER");
    expect(placementFires).toHaveLength(0);
    expect(sharedFires).toHaveLength(2);
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
  test("E-CHANNEL-OUTSIDE-PROGRAM message references §38.1 + child-of-`<program>` fix", () => {
    const source = `<channel name="x">
\${ <m> = [] }
</>
<program>
\${ <draft> = "" }
</program>`;
    const { sym } = compileSym(source);
    const fires = errorsByCode(sym, "E-CHANNEL-OUTSIDE-PROGRAM");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    const msg = fires[0].message;
    expect(msg).toContain("§38.1");
    expect(msg).toContain("§34");
    expect(msg).toContain("INSIDE");
    expect(msg).toContain("v0.3");
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
  test("E-CHANNEL-OUTSIDE-PROGRAM span points to the channel-decl node", () => {
    const source = `<channel name="x">
\${ <m> = [] }
</>
<program>
\${ <draft> = "" }
</program>`;
    const { ast, sym } = compileSym(source);
    const fires = errorsByCode(sym, "E-CHANNEL-OUTSIDE-PROGRAM");
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
// §B19.10 — channel inside `<program>` + cross-scope @cellName access (B3 unaffected)
// ---------------------------------------------------------------------------

describe("§B19.10 channel inside <program> keeps cross-scope @cellName access (B3) intact", () => {
  test("`@messages` access from `<program>` body — placement OK + B3 resolves cell", () => {
    const source = `<program>
<channel name="chat">
\${ <messages> = [] }
</>
\${
  function send() {
    const n = @messages.length
    return n
  }
}
</program>`;
    const { sym } = compileSym(source);
    expect(errorsByCode(sym, "E-CHANNEL-OUTSIDE-PROGRAM")).toHaveLength(0);
    expect(errorsByCode(sym, "E-CHANNEL-SHARED-MODIFIER")).toHaveLength(0);
    // The channel-body cell is registered in the file scope (channel body's
    // logic block does not introduce a new scope), so the symbol table
    // contains a record for `messages`.
    expect(sym.fileScope.stateCells.has("messages")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §B19.11 — S87 Insight 30: module-file `<channel>` dispensation
// (PURE-CHANNEL-FILE per §38.12.6 — file-top channel in a file with no
//  `<program>` element anywhere is canonical and DOES NOT fire).
//
// Engine-parity rationale per §21.8 / B14 — cross-file `<engine>` already
// admits the same module-file top-level placement; channels reuse the
// precedent rather than introducing a structural asymmetry.
// ---------------------------------------------------------------------------

describe("§B19.11 module-file `<channel>` dispensation (PURE-CHANNEL-FILE, S87 Insight 30)", () => {
  test("file-top `<channel>` in module file (no `<program>` anywhere) — no fire", () => {
    // PURE-CHANNEL-FILE shape: only a `<channel>` decl, no `<program>` at all.
    // Per Insight 30 (ratified S87 47/44/44 closing §38.1 OQ), this is the
    // canonical module-file shape — silent.
    const source = `<channel name="only">
\${ <m> = [] }
</>`;
    const { sym } = compileSym(source);
    expect(errorsByCode(sym, "E-CHANNEL-OUTSIDE-PROGRAM")).toHaveLength(0);
  });

  test("`export <channel>` at file top in module file — no fire", () => {
    // PURE-CHANNEL-FILE shape via `export <channel>` form (per §38.12 cross-file
    // inline-expansion CHX). This is the canonical trucking-dispatch consumer
    // shape — channels/dispatch-board.scrml exports the channel; consumer pages
    // mount it via `<dispatchBoard/>` and CHX inlines the body.
    const source = `export <channel name="dispatch-board">
\${
  <boardEvents> = []
  server function publishBoardEvent(eventType, loadId, status) {
    @boardEvents = [...@boardEvents, { type: eventType }]
  }
}
</>`;
    const { sym } = compileSym(source);
    expect(errorsByCode(sym, "E-CHANNEL-OUTSIDE-PROGRAM")).toHaveLength(0);
  });

  test("multiple `<channel>` decls at file top in module file — no fire", () => {
    // Module file with two PURE-CHANNEL-FILE-style channels. Both admitted.
    const source = `<channel name="c1">
\${ <a> = 0 }
</>
<channel name="c2">
\${ <b> = 0 }
</>`;
    const { sym } = compileSym(source);
    expect(errorsByCode(sym, "E-CHANNEL-OUTSIDE-PROGRAM")).toHaveLength(0);
  });

  test("file with `<program>` + file-top `<channel>` sibling — STILL fires (regression guard)", () => {
    // The genuine canonical-violation shape: file has `<program>` BUT the
    // channel is positioned outside it. The dispensation does NOT apply
    // (fileHasProgram === true).
    const source = `<channel name="chat">
\${ <messages> = [] }
</>
<program>
\${ <draft> = "" }
</program>`;
    const { sym } = compileSym(source);
    const fires = errorsByCode(sym, "E-CHANNEL-OUTSIDE-PROGRAM");
    expect(fires.length).toBeGreaterThanOrEqual(1);
  });

  test("file with `<program>` + `<channel>` INSIDE it — no fire (canonical, regression guard)", () => {
    // Pre-existing v0.3 canonical: channel descends from <program>. Unchanged
    // by the dispensation. Regression guard.
    const source = `<program>
<channel name="chat">
\${ <messages> = [] }
</>
</program>`;
    const { sym } = compileSym(source);
    expect(errorsByCode(sym, "E-CHANNEL-OUTSIDE-PROGRAM")).toHaveLength(0);
  });

  test("engine-parity check: file-top `<engine>` and file-top `<channel>` in module file both silent", () => {
    // Engine-parity rationale anchor (§21.8 / B14). Both surfaces admit the
    // same module-file top-level placement under Insight 30. The walker's
    // dispensation brings `<channel>` to parity with `<engine>`.
    //
    // Engines have their own walkers (B14) and do not fire E-CHANNEL-*. We
    // verify here only that the channel-placement walker does not fire on
    // EITHER markup at file top in a module file (no `<program>` anywhere).
    const engineOnly = `<engine for="Mood" var=N>
\${ <state> = .idle }
</>`;
    const channelOnly = `<channel name="presence">
\${ <users> = [] }
</>`;
    const engineSym = compileSym(engineOnly).sym;
    const channelSym = compileSym(channelOnly).sym;
    // Engine surface: walkChannelPlacement does not fire on engines (no
    // <channel> markup). Channel surface: dispensation silences the fire.
    expect(errorsByCode(engineSym, "E-CHANNEL-OUTSIDE-PROGRAM")).toHaveLength(0);
    expect(errorsByCode(channelSym, "E-CHANNEL-OUTSIDE-PROGRAM")).toHaveLength(0);
  });

  test("module-file `<channel>` retains `@shared` rejection (orthogonal walker)", () => {
    // `walkSharedModifier` is independent of placement — `@shared` anywhere
    // still fires E-CHANNEL-SHARED-MODIFIER per §38.4 line 15468. The
    // Insight 30 dispensation does NOT relax this.
    const source = `<channel name="legacy">
\${ @shared count = 0 }
</>`;
    const { sym } = compileSym(source);
    expect(errorsByCode(sym, "E-CHANNEL-OUTSIDE-PROGRAM")).toHaveLength(0);
    expect(errorsByCode(sym, "E-CHANNEL-SHARED-MODIFIER").length).toBeGreaterThanOrEqual(1);
  });
});
