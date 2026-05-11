/* SPDX-License-Identifier: MIT
 * Phase A7 Step A5-6 Feature 1 — `<onTimeout name=>` + `cancelTimer("X")` builtin
 * (S79, 2026-05-10).
 *
 * Per SPEC §51.0.M.1 amendment + ratified SCOPE
 * (`scrml-support/archive/changes/phase-a7-step-a5-6-item-g-timer-extensions/SCOPE-AND-DECOMPOSITION.md` §3,
 * Option A). Phase A10 (engine state-child body render) unblocks this feature
 * by making event-handler attributes inside arm bodies walkable AST that the
 * codegen can recognize the `cancelTimer` call inside.
 *
 * Coverage:
 *   §A5-6F1.1  Parser captures `name=` attribute (quoted + unquoted)
 *   §A5-6F1.2  Typer fires E-TIMER-NAME-INVALID for invalid identifier shape
 *   §A5-6F1.3  Typer fires E-TIMER-NAME-DUPLICATE for duplicate names
 *   §A5-6F1.4  Codegen emits `name: "X"` field on timer-table entry
 *   §A5-6F1.5  maybeLowerCancelTimerCallRef recognition matrix
 *   §A5-6F1.6  Anonymous timer keying (index suffix) preserved
 *   §A5-6F1.7  Runtime helper `_scrml_engine_clear_named_timer` shape
 */

import { describe, test, expect } from "bun:test";
import {
  scanForOnTimeoutEntries,
} from "../../src/engine-statechild-parser.ts";
import {
  emitEngineTimersTable,
  maybeLowerCancelTimerCallRef,
} from "../../src/codegen/emit-engine.ts";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runSYM } from "../../src/symbol-table.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Helper — engineMeta fixture builder, mirrors engine-ontimeout-codegen
// shape but with optional `name` on entries.
// ---------------------------------------------------------------------------

function metaWithNamedTimers(entries) {
  // entries: [{ stateTag, after, to, name? }, ...]
  // Group by stateTag; build the stateChildren + aggregate forms.
  const scMap = new Map();
  for (const e of entries) {
    if (!scMap.has(e.stateTag)) {
      scMap.set(e.stateTag, []);
    }
    const ot = { after: e.after, to: e.to, rawOffset: 0 };
    if (typeof e.name === "string") ot.name = e.name;
    scMap.get(e.stateTag).push(ot);
  }
  const sc = [];
  for (const [tag, ots] of scMap) {
    sc.push({ tag, rule: { kind: "wildcard" }, onTimeoutElements: ots });
  }
  const agg = [];
  for (const c of sc) {
    for (const ot of c.onTimeoutElements) {
      agg.push({ stateChildTag: c.tag, entry: ot });
    }
  }
  return {
    forType: "TestPhase",
    varName: "testPhase",
    initialVariant: sc[0]?.tag ?? "Idle",
    variants: sc.map((c) => c.tag),
    stateChildren: sc,
    onTimeoutElements: agg,
    derivedExpr: null,
    isExported: false,
    isPinned: false,
  };
}

// ---------------------------------------------------------------------------
// §A5-6F1.1 — Parser captures `name=` attribute
// ---------------------------------------------------------------------------

describe("§A5-6F1.1 — parser captures name= attribute", () => {
  test("unquoted identifier name= captured", () => {
    const body = `<onTimeout name=autoDismiss after=30s to=.Hidden/>`;
    const entries = scanForOnTimeoutEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("autoDismiss");
    expect(entries[0].after).toBe("30s");
    expect(entries[0].to).toBe("Hidden");
  });

  test("double-quoted name= captured", () => {
    const body = `<onTimeout name="autoDismiss" after=30s to=.Hidden/>`;
    const entries = scanForOnTimeoutEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("autoDismiss");
  });

  test("single-quoted name= captured", () => {
    const body = `<onTimeout name='autoDismiss' after=30s to=.Hidden/>`;
    const entries = scanForOnTimeoutEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("autoDismiss");
  });

  test("attribute order independent (name= can appear after to=)", () => {
    const body = `<onTimeout after=30s to=.Hidden name=autoDismiss/>`;
    const entries = scanForOnTimeoutEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("autoDismiss");
  });

  test("name= absent → entry has no name field", () => {
    const body = `<onTimeout after=30s to=.Hidden/>`;
    const entries = scanForOnTimeoutEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBeUndefined();
  });

  test("multiple <onTimeout> entries with mix of named + anonymous", () => {
    const body = `
      <onTimeout name=banner after=30s to=.Hidden/>
      <onTimeout after=60s to=.Expired/>
      <onTimeout name=session after=300s to=.LoggedOut/>
    `;
    const entries = scanForOnTimeoutEntries(body);
    expect(entries).toHaveLength(3);
    expect(entries[0].name).toBe("banner");
    expect(entries[1].name).toBeUndefined();
    expect(entries[2].name).toBe("session");
  });

  test("invalid name= captured raw (typer rejects later)", () => {
    // Parser is permissive — typer fires E-TIMER-NAME-INVALID.
    const body = `<onTimeout name="bad-name!" after=30s to=.Hidden/>`;
    const entries = scanForOnTimeoutEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("bad-name!");
  });
});

// ---------------------------------------------------------------------------
// §A5-6F1.2 — Typer fires E-TIMER-NAME-INVALID
// ---------------------------------------------------------------------------

describe("§A5-6F1.2 — E-TIMER-NAME-INVALID on invalid identifier shape", () => {
  function compileSource(src) {
    const bs = splitBlocks("test.scrml", src);
    const { ast } = buildAST(bs);
    const sym = runSYM({ filePath: "test.scrml", ast });
    return sym;
  }

  test("hyphen in name= fires E-TIMER-NAME-INVALID", () => {
    const src = `
type P:enum = { Visible, Hidden }
<engine for=P initial=.Visible>
  <Visible rule=.Hidden>
    <onTimeout name="bad-name" after=30s to=.Hidden/>
  </>
  <Hidden></>
</>
`;
    const sym = compileSource(src);
    const errs = (sym.errors ?? []).map((e) => String(e.message ?? e));
    const hit = errs.some((m) => m.includes("E-TIMER-NAME-INVALID"));
    expect(hit).toBe(true);
  });

  test("leading digit fires E-TIMER-NAME-INVALID", () => {
    const src = `
type P:enum = { Visible, Hidden }
<engine for=P initial=.Visible>
  <Visible rule=.Hidden>
    <onTimeout name="1banner" after=30s to=.Hidden/>
  </>
  <Hidden></>
</>
`;
    const sym = compileSource(src);
    const errs = (sym.errors ?? []).map((e) => String(e.message ?? e));
    const hit = errs.some((m) => m.includes("E-TIMER-NAME-INVALID"));
    expect(hit).toBe(true);
  });

  test("valid camelCase + PascalCase + underscore names DON'T fire", () => {
    const src = `
type P:enum = { Visible, Hidden }
<engine for=P initial=.Visible>
  <Visible rule=.Hidden>
    <onTimeout name=autoDismiss after=30s to=.Hidden/>
  </>
  <Hidden></>
</>
`;
    const sym = compileSource(src);
    const errs = (sym.errors ?? []).map((e) => String(e.message ?? e));
    expect(errs.some((m) => m.includes("E-TIMER-NAME-INVALID"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §A5-6F1.3 — Typer fires E-TIMER-NAME-DUPLICATE
// ---------------------------------------------------------------------------

describe("§A5-6F1.3 — E-TIMER-NAME-DUPLICATE on duplicate names", () => {
  function compileSource(src) {
    const bs = splitBlocks("test.scrml", src);
    const { ast } = buildAST(bs);
    const sym = runSYM({ filePath: "test.scrml", ast });
    return sym;
  }

  test("two <onTimeout> with same name in same state-child fire", () => {
    const src = `
type P:enum = { Visible, Hidden }
<engine for=P initial=.Visible>
  <Visible rule=.Hidden>
    <onTimeout name=banner after=30s to=.Hidden/>
    <onTimeout name=banner after=60s to=.Hidden/>
  </>
  <Hidden></>
</>
`;
    const sym = compileSource(src);
    const errs = (sym.errors ?? []).map((e) => String(e.message ?? e));
    const hit = errs.some((m) => m.includes("E-TIMER-NAME-DUPLICATE"));
    expect(hit).toBe(true);
  });

  test("same name in DIFFERENT state-children does NOT fire (scope-local)", () => {
    const src = `
type P:enum = { A, B, C }
<engine for=P initial=.A>
  <A rule=.B>
    <onTimeout name=t after=30s to=.B/>
  </>
  <B rule=.C>
    <onTimeout name=t after=30s to=.C/>
  </>
  <C></>
</>
`;
    const sym = compileSource(src);
    const errs = (sym.errors ?? []).map((e) => String(e.message ?? e));
    expect(errs.some((m) => m.includes("E-TIMER-NAME-DUPLICATE"))).toBe(false);
  });

  test("named + anonymous timer in same state-child does NOT fire", () => {
    const src = `
type P:enum = { Visible, Hidden }
<engine for=P initial=.Visible>
  <Visible rule=.Hidden>
    <onTimeout name=banner after=30s to=.Hidden/>
    <onTimeout after=60s to=.Hidden/>
  </>
  <Hidden></>
</>
`;
    const sym = compileSource(src);
    const errs = (sym.errors ?? []).map((e) => String(e.message ?? e));
    expect(errs.some((m) => m.includes("E-TIMER-NAME-DUPLICATE"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §A5-6F1.4 — Codegen emits `name: "X"` on timer-table entry
// ---------------------------------------------------------------------------

describe("§A5-6F1.4 — emitEngineTimersTable name field emission", () => {
  test("named entry emits name: \"X\" in literal-form table row", () => {
    const m = metaWithNamedTimers([
      { stateTag: "Visible", after: "30s", to: "Hidden", name: "autoDismiss" },
    ]);
    const out = emitEngineTimersTable(m).join("\n");
    expect(out).toContain('{ ms: 30000, target: "Hidden", name: "autoDismiss" }');
  });

  test("anonymous entry omits name field (back-compat with pre-S79 shape)", () => {
    const m = metaWithNamedTimers([
      { stateTag: "Visible", after: "30s", to: "Hidden" },
    ]);
    const out = emitEngineTimersTable(m).join("\n");
    expect(out).toContain('{ ms: 30000, target: "Hidden" }');
    expect(out).not.toContain("name:");
  });

  test("mixed named + anonymous in same state-child", () => {
    const m = metaWithNamedTimers([
      { stateTag: "Visible", after: "30s", to: "Hidden", name: "fast" },
      { stateTag: "Visible", after: "60s", to: "Hidden" },
      { stateTag: "Visible", after: "90s", to: "Hidden", name: "slow" },
    ]);
    const out = emitEngineTimersTable(m).join("\n");
    expect(out).toContain('name: "fast"');
    expect(out).toContain('name: "slow"');
    // Anonymous middle entry: no name field
    const middleMatch = out.match(/\{ ms: 60000, target: "Hidden" \}/);
    expect(middleMatch).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §A5-6F1.5 — maybeLowerCancelTimerCallRef recognition matrix
// ---------------------------------------------------------------------------

describe("§A5-6F1.5 — maybeLowerCancelTimerCallRef recognition", () => {
  test("recognizes cancelTimer + arm context + string-lit arg", () => {
    const out = maybeLowerCancelTimerCallRef(
      "cancelTimer", ['"autoDismiss"'], "banner:Visible",
    );
    expect(out).toBe(
      `_scrml_engine_clear_named_timer("banner", "Visible", "autoDismiss")`,
    );
  });

  test("recognizes single-quoted string arg", () => {
    const out = maybeLowerCancelTimerCallRef(
      "cancelTimer", ["'foo'"], "banner:Visible",
    );
    expect(out).toBe(
      `_scrml_engine_clear_named_timer("banner", "Visible", "foo")`,
    );
  });

  test("recognizes pre-parsed string-literal node arg", () => {
    const out = maybeLowerCancelTimerCallRef(
      "cancelTimer",
      [{ kind: "string-literal", value: "foo" }],
      "banner:Visible",
    );
    expect(out).toBe(
      `_scrml_engine_clear_named_timer("banner", "Visible", "foo")`,
    );
  });

  test("returns null for non-cancelTimer handler", () => {
    const out = maybeLowerCancelTimerCallRef(
      "doSomething", ['"autoDismiss"'], "banner:Visible",
    );
    expect(out).toBeNull();
  });

  test("returns null when no arm context (engineArm null/undefined/empty)", () => {
    expect(maybeLowerCancelTimerCallRef(
      "cancelTimer", ['"autoDismiss"'], null,
    )).toBeNull();
    expect(maybeLowerCancelTimerCallRef(
      "cancelTimer", ['"autoDismiss"'], undefined,
    )).toBeNull();
    expect(maybeLowerCancelTimerCallRef(
      "cancelTimer", ['"autoDismiss"'], "",
    )).toBeNull();
  });

  test("returns null for malformed armId (no colon)", () => {
    const out = maybeLowerCancelTimerCallRef(
      "cancelTimer", ['"foo"'], "banner",
    );
    expect(out).toBeNull();
  });

  test("returns null for non-string-literal arg (variable ref)", () => {
    const out = maybeLowerCancelTimerCallRef(
      "cancelTimer", ["someVar"], "banner:Visible",
    );
    expect(out).toBeNull();
  });

  test("returns null for missing args", () => {
    const out = maybeLowerCancelTimerCallRef(
      "cancelTimer", [], "banner:Visible",
    );
    expect(out).toBeNull();
  });

  test("colon in armTag — splits on FIRST colon only", () => {
    // Defensive: future arm-tag formats might include colons; the helper
    // splits on the first colon to extract varName, leaving the rest as the
    // armTag.
    const out = maybeLowerCancelTimerCallRef(
      "cancelTimer", ['"x"'], "banner:Visible:nested",
    );
    expect(out).toBe(
      `_scrml_engine_clear_named_timer("banner", "Visible:nested", "x")`,
    );
  });
});

// ---------------------------------------------------------------------------
// §A5-6F1.6 — Runtime helper file content (hand-validated shape)
// ---------------------------------------------------------------------------

describe("§A5-6F1.6 — runtime-template.js helper shape", () => {
  test("_scrml_engine_clear_named_timer is defined in runtime-template.js", () => {
    const rt = readFileSync(
      join(import.meta.dir, "..", "..", "src", "runtime-template.js"),
      "utf8",
    );
    expect(rt).toContain("function _scrml_engine_clear_named_timer(");
    // Composite key shape: varName::stateName::n:NAME
    expect(rt).toContain('varName + "::" + stateName + "::n:" + name');
  });

  test("_scrml_engine_arm_state_timers uses n:NAME suffix when entry has name", () => {
    const rt = readFileSync(
      join(import.meta.dir, "..", "..", "src", "runtime-template.js"),
      "utf8",
    );
    // The keying-scheme switch lives inside _scrml_engine_arm_state_timers.
    const armStart = rt.indexOf("function _scrml_engine_arm_state_timers(");
    expect(armStart).toBeGreaterThan(-1);
    const armEnd = rt.indexOf(
      "function _scrml_engine_clear_state_timers(",
      armStart,
    );
    const armBody = rt.slice(armStart, armEnd);
    expect(armBody).toContain('"n:" + ent.name');
  });

  test("_scrml_engine_clear_state_timers uses n:NAME suffix to match", () => {
    const rt = readFileSync(
      join(import.meta.dir, "..", "..", "src", "runtime-template.js"),
      "utf8",
    );
    // Symmetric keying in clear path.
    const clrStart = rt.indexOf("function _scrml_engine_clear_state_timers(");
    expect(clrStart).toBeGreaterThan(-1);
    const clrEnd = rt.indexOf(
      "function _scrml_engine_clear_named_timer(",
      clrStart,
    );
    const clrBody = rt.slice(clrStart, clrEnd);
    expect(clrBody).toContain('"n:" + ent.name');
  });
});
