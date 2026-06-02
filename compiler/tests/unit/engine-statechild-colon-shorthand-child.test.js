/* SPDX-License-Identifier: MIT
 * Regression — §4.14 `:`-shorthand CHILD element inside an engine state-child
 * body breaks state-child closer-pairing (colon-shorthand-in-engine-arm,
 * 2026-06-01).
 *
 * THE BUG: `findStateChildCloser` in `compiler/src/engine-statechild-parser.ts`
 * (and the sibling `findEngineCloser` / `findOnTransitionCloser`) pushed a
 * §4.14 `:`-shorthand lowercase child opener (`<span : @label>`, `<li : @.name>`)
 * onto its `lowerDepth` stack. A `:`-shorthand opener has NO closer (§4.14
 * line 979/982 — the body runs to the opener's `>` and the closer-presence
 * override forbids `</tag>` / `</>`), so the push was never popped. The
 * unbalanced phantom opener then absorbed the state-child's own `</>`,
 * leaving the real closer un-findable → the state-child was dropped from the
 * parsed set → E-ENGINE-STATE-CHILD-MISSING for that variant.
 *
 * THE FIX: a new attribute-aware `isColonShorthandOpener` predicate excludes
 * `:`-shorthand lowercase openers from the `lowerDepth` push, mirroring the
 * pre-existing void-element + self-close exclusions. Detection keys on a
 * top-level (depth-0, non-string), WHITESPACE-PRECEDED `:` body-introducer
 * (§4.14 line 983 mandatory whitespace) — so attribute-name namespace colons
 * (`bind:value`, `on:click`, `class:active`, `onserver:msg`), string-value
 * colons (`style="color: red"`), and `${...}` ternary colons (`a ? b : c`)
 * are NOT mistaken for the body-introducer.
 *
 * Source-of-truth: SPEC §4.14 (`:`-shorthand universal block grammar) +
 * §51.0.B/F (engine state-child exhaustiveness).
 */

import { describe, expect, test } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runSYM } from "../../src/symbol-table.ts";
import { parseEngineStateChildren } from "../../src/engine-statechild-parser.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runUpToSYM(source, filePath = "test.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast } = buildAST(bs);
  return { ast, sym: runSYM({ filePath, ast }) };
}

/** Collect every diagnostic code emitted across the SYM result streams. */
function symCodes(sym) {
  const codes = [];
  for (const stream of [sym?.errors, sym?.warnings, sym?.diagnostics]) {
    if (Array.isArray(stream)) {
      for (const d of stream) if (d && d.code) codes.push(d.code);
    }
  }
  return codes;
}

const tagsOf = (entries) => entries.map((e) => e.tag);

// ===========================================================================
// 1. Parser-level — the state-child closer is found despite a `:`-shorthand
//    CHILD element in its body.
// ===========================================================================

describe("§4.14 `:`-shorthand child element inside an engine state-child body — closer-pairing", () => {
  test("`<span : @label>` child in a state-child body — both state-children parse", () => {
    // `.Running` body contains a `:`-shorthand `<span : @label>` child. Pre-fix
    // its phantom opener absorbed `.Running`'s `</>`, dropping `.Running`.
    const rulesRaw = `
      <Idle rule=.Running>
        <button onclick=\${@phase = .Running}>Start</button>
      </>
      <Running rule=.Idle>
        <span : @label>
      </>
    `;
    const entries = parseEngineStateChildren(rulesRaw);
    expect(tagsOf(entries)).toEqual(["Idle", "Running"]);
    // The `.Running` body is bare-body (NOT colon-shorthand at the state-child
    // level) — the `:`-shorthand is on the NESTED `<span>` child, not on
    // `.Running` itself.
    const running = entries.find((e) => e.tag === "Running");
    expect(running.isColonShorthand).toBe(false);
    expect(running.bodyRaw).toContain("<span : @label>");
  });

  test("`<li : @.name>` inside an `<each>` inside a state-child body — the dogfood case", () => {
    const rulesRaw = `
      <Loading rule=.Browsing>
        <button onclick=\${@phase = .Browsing}>Go</button>
      </>
      <Browsing rule=.Loading>
        <each in=@todos key=@.id>
          <li : @.name>
        </each>
      </>
    `;
    const entries = parseEngineStateChildren(rulesRaw);
    expect(tagsOf(entries)).toEqual(["Loading", "Browsing"]);
    const browsing = entries.find((e) => e.tag === "Browsing");
    expect(browsing.bodyRaw).toContain("<each");
    expect(browsing.bodyRaw).toContain("<li : @.name>");
  });

  test("multiple `:`-shorthand children + trailing state-child all parse", () => {
    const rulesRaw = `
      <A rule=.B>
        <span : @x>
        <em : @y>
        <p : @z>
      </>
      <B rule=.A></>
    `;
    const entries = parseEngineStateChildren(rulesRaw);
    expect(tagsOf(entries)).toEqual(["A", "B"]);
  });

  test("`:`-shorthand child nested INSIDE a bare-body lowercase child still parses", () => {
    // The `:`-shorthand `<span>` sits inside a real `<div>...</div>` pair; the
    // div's lowerDepth push IS legitimate and must still be popped by `</>`.
    const rulesRaw = `
      <A rule=.B>
        <div>
          <span : @x>
        </>
      </>
      <B rule=.A></>
    `;
    const entries = parseEngineStateChildren(rulesRaw);
    expect(tagsOf(entries)).toEqual(["A", "B"]);
  });
});

// ===========================================================================
// 2. Negative-detection — a child carrying a `:` that is NOT a `:`-shorthand
//    body-introducer must NOT be mis-read as self-terminating (else the real
//    `</tag>` / `</>` pop accounting breaks and the state-child is lost).
// ===========================================================================

describe("§4.14 `:`-shorthand negative detection — colons that are NOT body-introducers", () => {
  // Each case wraps a bare-body lowercase child WITH a tricky colon and a
  // matching closer; the state-child must still be found.
  const negativeCases = [
    ["bind: namespace attr", `<input bind:value=@x>X</input>`],
    ["on: namespace attr", `<button on:click=\${run()}>Go</button>`],
    ["class: namespace attr", `<div class:active=@flag>body</div>`],
    ["onserver: channel attr", `<div onserver:msg=\${recv()}>body</div>`],
    ["string-value colon (style)", `<div style="color: red">body</div>`],
    ["string-value colon (url)", `<a href="http://x.test/p">link</a>`],
    ["string-value colon (title)", `<span title="a:b">body</span>`],
    ["ternary colon in \${...}", `<button onclick=\${@flag ? a() : b()}>Go</button>`],
  ];

  for (const [label, childMarkup] of negativeCases) {
    test(`${label} — state-child still parses (not mis-read as :-shorthand)`, () => {
      const rulesRaw = `
        <A rule=.B>
          ${childMarkup}
        </>
        <B rule=.A></>
      `;
      const entries = parseEngineStateChildren(rulesRaw);
      expect(tagsOf(entries)).toEqual(["A", "B"]);
    });
  }

  test("self-closing child with a namespace colon attr still parses", () => {
    const rulesRaw = `
      <A rule=.B>
        <input bind:value=@x/>
      </>
      <B rule=.A></>
    `;
    const entries = parseEngineStateChildren(rulesRaw);
    expect(tagsOf(entries)).toEqual(["A", "B"]);
  });

  test("`:`-shorthand child that ALSO carries a namespace-colon attr is still detected", () => {
    // `<span class:active=@f : @label>` — the FIRST colon is a `class:` attr
    // namespace separator (glued, no leading space); the SECOND ` : ` is the
    // body-introducer. The opener is still self-terminating.
    const rulesRaw = `
      <A rule=.B>
        <span class:active=@f : @label>
      </>
      <B rule=.A></>
    `;
    const entries = parseEngineStateChildren(rulesRaw);
    expect(tagsOf(entries)).toEqual(["A", "B"]);
  });
});

// ===========================================================================
// 3. End-to-end via SYM — no E-ENGINE-STATE-CHILD-MISSING for the variant
//    whose body hosts a `:`-shorthand child.
// ===========================================================================

describe("§4.14 `:`-shorthand child element — end-to-end (no E-ENGINE-STATE-CHILD-MISSING)", () => {
  test("repro-1 — `<span : @label>` in the `.Running` arm compiles clean", () => {
    const source = `<program>
type Phase:enum = { Idle, Running }
<label> = "hi"
<engine for=Phase initial=.Idle>
  <Idle rule=.Running>
    <button onclick=\${@phase = .Running}>Start</button>
  </>
  <Running rule=.Idle>
    <span : @label>
  </>
</>
</program>
`;
    const { sym } = runUpToSYM(source);
    expect(symCodes(sym)).not.toContain("E-ENGINE-STATE-CHILD-MISSING");
  });

  test("repro-2 — `<li : @.name>` in an `<each>` in the `.Browsing` arm compiles clean", () => {
    const source = `<program>
type Phase:enum = { Loading, Browsing }
type Todo:struct = { id: string, name: string }
<todos>: Todo[] = [{ id: "1", name: "alpha" }, { id: "2", name: "beta" }]
<engine for=Phase initial=.Loading>
  <Loading rule=.Browsing>
    <button onclick=\${@phase = .Browsing}>Go</button>
  </>
  <Browsing rule=.Loading>
    <each in=@todos key=@.id>
      <li : @.name>
    </each>
  </>
</>
</program>
`;
    const { sym } = runUpToSYM(source);
    expect(symCodes(sym)).not.toContain("E-ENGINE-STATE-CHILD-MISSING");
  });
});
