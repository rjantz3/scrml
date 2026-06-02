/* SPDX-License-Identifier: MIT
 *
 * Conformance — #14 event-payload-transition (Approach E), TYPER batch (S155).
 *
 * Normative authority:
 *   - SPEC §51.0.S    — engine message dispatch (`accepts=` + `(state × message)` arms).
 *   - SPEC §51.0.S.2.2 — `accepts=MsgType` opener attr; E-ENGINE-ACCEPTS-NOT-ENUM.
 *   - SPEC §51.0.S.2.3 — `(state × message)` arm form; E-ENGINE-MSG-WITHOUT-ACCEPTS.
 *   - SPEC §51.0.S.2.4 — per-state message-arm exhaustiveness; E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE.
 *   - SPEC §51.0.G.1   — `.advance(arg)` two-plane (state vs message) resolution;
 *                        E-ENGINE-MSG-UNKNOWN + E-VARIANT-AMBIGUOUS reuse.
 *   - SPEC §51.0.S.6   — worked example (DragPhase / DragMsg), used verbatim as a fixture.
 *
 * Batch 2 (this dispatch) is DIAGNOSTICS + RESOLUTION only (no codegen). These
 * conformance tests assert the four new §34 codes fire (and do NOT false-fire)
 * through the FULL pipeline (`compileScrml`). The S93 diagnostic-stream
 * partition routes the info-level W-MATCH-ARROW-LEGACY into `result.warnings`,
 * so every assertion uses the cross-stream `allDiags` collector — asserting on
 * `result.errors.filter(...)` alone would silently FALSE-PASS for the W- code.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { compileScrml } from "../../src/api.js";

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

let TMP;
beforeAll(() => { TMP = mkdtempSync(join(tmpdir(), "conf-engine-msg-s155-")); });
afterAll(() => { if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true }); });

let counter = 0;
function compile(source) {
  const abs = join(TMP, `t${counter++}.scrml`);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, source);
  return compileScrml({ inputFiles: [abs], outputDir: join(TMP, "dist"), write: false, log: () => {} });
}

// Cross-stream diagnostic collector. W-/I- codes land in result.warnings via
// the S93 partition; never assert against result.errors alone for a W- code.
function allDiags(result) {
  return [
    ...(result.errors || []),
    ...(result.warnings || []),
    ...(result.lintDiagnostics || []),
  ];
}
function diagsOf(result, code) {
  return allDiags(result).filter((e) => e && e.code === code);
}

// SPEC §51.0.S.6 worked example, exhaustive, verbatim (copied from spec). This
// is the canonical clean baseline: it must produce NONE of the four new codes.
const WORKED_EXAMPLE = `type DragPhase:enum = { Idle, Dragging(id: number) }
type DragMsg:enum   = { Start(id: number), Drop(col: string), End }

<engine for=DragPhase initial=.Idle accepts=DragMsg>
  <Idle rule=.Dragging>
    | .Start(id) :> .Dragging(id)
    | .Drop(col) :> .Idle
    | .End       :> .Idle
  </>
  <Dragging(id) rule=.Idle>
    | .Drop(col) :> { @tasks = taskMovedTo(@tasks, id, col); .Idle }
    | .Start(id) :> .Dragging(id)
    | .End       :> .Idle
  </>
</>
`;

const NEW_CODES = [
  "E-ENGINE-ACCEPTS-NOT-ENUM",
  "E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE",
  "E-ENGINE-MSG-UNKNOWN",
  "E-ENGINE-MSG-WITHOUT-ACCEPTS",
];

// ---------------------------------------------------------------------------
// §51.0.S.6 — worked example baseline (no new codes fire)
// ---------------------------------------------------------------------------

describe("§51.0.S.6: worked example (DragPhase/DragMsg) fires no message-dispatch error", () => {
  test("exhaustive arms + valid accepts= → none of the four new codes", () => {
    const r = compile(WORKED_EXAMPLE);
    for (const code of NEW_CODES) {
      expect(diagsOf(r, code).length).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// §51.0.S.2.2 — E-ENGINE-ACCEPTS-NOT-ENUM
// ---------------------------------------------------------------------------

describe("§51.0.S.2.2: E-ENGINE-ACCEPTS-NOT-ENUM (accepts= must resolve to an :enum)", () => {
  test("accepts= naming a struct type fires E-ENGINE-ACCEPTS-NOT-ENUM", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }
type NotAMsg:struct = { x: number }

<engine for=DragPhase initial=.Idle accepts=NotAMsg>
  <Idle rule=.Dragging></>
  <Dragging(id) rule=.Idle></>
</>
`;
    expect(diagsOf(compile(src), "E-ENGINE-ACCEPTS-NOT-ENUM").length).toBe(1);
  });

  test("accepts= naming an undeclared type fires E-ENGINE-ACCEPTS-NOT-ENUM", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }

<engine for=DragPhase initial=.Idle accepts=NopeNotDeclared>
  <Idle rule=.Dragging></>
  <Dragging(id) rule=.Idle></>
</>
`;
    expect(diagsOf(compile(src), "E-ENGINE-ACCEPTS-NOT-ENUM").length).toBe(1);
  });

  test("accepts= naming a valid :enum does NOT fire E-ENGINE-ACCEPTS-NOT-ENUM", () => {
    expect(diagsOf(compile(WORKED_EXAMPLE), "E-ENGINE-ACCEPTS-NOT-ENUM").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §51.0.S.2.3 — E-ENGINE-MSG-WITHOUT-ACCEPTS
// ---------------------------------------------------------------------------

describe("§51.0.S.2.3: E-ENGINE-MSG-WITHOUT-ACCEPTS (arms present, no accepts=)", () => {
  test("a state declares a (state × message) arm but engine has no accepts= → fires", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }
type DragMsg:enum   = { Start(id: number), Drop(col: string), End }

<engine for=DragPhase initial=.Idle>
  <Idle rule=.Dragging>
    | .Start(id) :> .Dragging(id)
  </>
  <Dragging(id) rule=.Idle></>
</>
`;
    expect(diagsOf(compile(src), "E-ENGINE-MSG-WITHOUT-ACCEPTS").length).toBeGreaterThanOrEqual(1);
  });

  test("a state with NO arms and no accepts= does NOT fire (ignores messages)", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }

<engine for=DragPhase initial=.Idle>
  <Idle rule=.Dragging></>
  <Dragging(id) rule=.Idle></>
</>
`;
    expect(diagsOf(compile(src), "E-ENGINE-MSG-WITHOUT-ACCEPTS").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §51.0.S.2.4 — E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE
// ---------------------------------------------------------------------------

describe("§51.0.S.2.4: E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE (mirror of E-MATCH-NOT-EXHAUSTIVE)", () => {
  test("partial coverage, no wildcard → fires per under-covered state", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }
type DragMsg:enum   = { Start(id: number), Drop(col: string), End }

<engine for=DragPhase initial=.Idle accepts=DragMsg>
  <Idle rule=.Dragging>
    | .Start(id) :> .Dragging(id)
  </>
  <Dragging(id) rule=.Idle>
    | .End :> .Idle
  </>
</>
`;
    // Both Idle (missing Drop, End) and Dragging (missing Start, Drop) are partial.
    expect(diagsOf(compile(src), "E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE").length).toBe(2);
  });

  test("partial coverage WITH `| _ :>` wildcard does NOT fire", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }
type DragMsg:enum   = { Start(id: number), Drop(col: string), End }

<engine for=DragPhase initial=.Idle accepts=DragMsg>
  <Idle rule=.Dragging>
    | .Start(id) :> .Dragging(id)
    | _          :> @dragPhase
  </>
  <Dragging(id) rule=.Idle>
    | _ :> @dragPhase
  </>
</>
`;
    expect(diagsOf(compile(src), "E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE").length).toBe(0);
  });

  test("full coverage (every message variant) does NOT fire", () => {
    expect(diagsOf(compile(WORKED_EXAMPLE), "E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE").length).toBe(0);
  });

  test("a state with ZERO message-arms does NOT fire (opts out of messages)", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }
type DragMsg:enum   = { Start(id: number), Drop(col: string), End }

<engine for=DragPhase initial=.Idle accepts=DragMsg>
  <Idle rule=.Dragging>
    | .Start(id) :> .Dragging(id)
    | .Drop(col) :> .Idle
    | .End       :> .Idle
  </>
  <Dragging(id) rule=.Idle></>
</>
`;
    // Dragging has zero arms → ignores messages, NOT a violation. Idle covers all.
    expect(diagsOf(compile(src), "E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §51.0.G.1 — `.advance(arg)` two-plane resolution + E-ENGINE-MSG-UNKNOWN
// ---------------------------------------------------------------------------

function withAdvance(line, opts = {}) {
  const header = `type DragPhase:enum = { Idle, Dragging(id: number) }
type DragMsg:enum   = { Start(id: number), Drop(col: string), End }
${opts.extraTypes || ""}
<engine for=DragPhase initial=.Idle accepts=DragMsg>
  <Idle rule=.Dragging>
    | .Start(id) :> .Dragging(id)
    | .Drop(col) :> .Idle
    | .End       :> .Idle
  </>
  <Dragging(id) rule=.Idle>
    | _ :> @dragPhase
  </>
</>
`;
  return compile(header + (opts.fnWrap
    ? `\nfunction handle(${opts.fnWrap}) {\n  ${line}\n}\n`
    : `\n\${\n  ${line}\n}\n`));
}

describe("§51.0.G.1: `.advance(arg)` two-plane resolution (state vs message)", () => {
  test("literal STATE-plane bare variant resolves clean", () => {
    const r = withAdvance("@dragPhase.advance(.Dragging(1))");
    expect(diagsOf(r, "E-ENGINE-MSG-UNKNOWN").length).toBe(0);
    expect(diagsOf(r, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(diagsOf(r, "E-TYPE-063").length).toBe(0);
  });

  test("literal MESSAGE-plane bare variant resolves clean (no false E-TYPE-063)", () => {
    const r = withAdvance(`@dragPhase.advance(.Drop("c1"))`);
    expect(diagsOf(r, "E-ENGINE-MSG-UNKNOWN").length).toBe(0);
    expect(diagsOf(r, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(diagsOf(r, "E-TYPE-063").length).toBe(0);
  });

  test("literal MESSAGE-plane unit variant resolves clean", () => {
    const r = withAdvance("@dragPhase.advance(.End)");
    expect(diagsOf(r, "E-ENGINE-MSG-UNKNOWN").length).toBe(0);
    expect(diagsOf(r, "E-TYPE-063").length).toBe(0);
  });

  test("literal bare variant in NEITHER plane → E-ENGINE-MSG-UNKNOWN", () => {
    const r = withAdvance("@dragPhase.advance(.Bogus)");
    expect(diagsOf(r, "E-ENGINE-MSG-UNKNOWN").length).toBe(1);
  });

  test("variant shared by BOTH planes (collision) → E-VARIANT-AMBIGUOUS", () => {
    const src = `type Phase:enum = { Idle, Reset }
type Msg:enum   = { Go, Reset }

<engine for=Phase initial=.Idle accepts=Msg>
  <Idle rule=.Reset>
    | .Go    :> .Reset
    | .Reset :> .Idle
  </>
  <Reset rule=.Idle>
    | _ :> @phase
  </>
</>

\${
  @phase.advance(.Reset)
}
`;
    expect(diagsOf(compile(src), "E-VARIANT-AMBIGUOUS").length).toBe(1);
  });

  test("collision resolved by qualification (Msg.Reset) → clean", () => {
    const src = `type Phase:enum = { Idle, Reset }
type Msg:enum   = { Go, Reset }

<engine for=Phase initial=.Idle accepts=Msg>
  <Idle rule=.Reset>
    | .Go    :> .Reset
    | .Reset :> .Idle
  </>
  <Reset rule=.Idle>
    | _ :> @phase
  </>
</>

\${
  @phase.advance(Msg.Reset)
}
`;
    const r = compile(src);
    expect(diagsOf(r, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(diagsOf(r, "E-ENGINE-MSG-UNKNOWN").length).toBe(0);
  });

  test("qualified state variant (DragPhase.Dragging) → clean", () => {
    const r = withAdvance("@dragPhase.advance(DragPhase.Dragging(1))");
    expect(diagsOf(r, "E-ENGINE-MSG-UNKNOWN").length).toBe(0);
    expect(diagsOf(r, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(diagsOf(r, "E-TYPE-063").length).toBe(0);
  });

  test("qualified message variant (DragMsg.Drop) → clean", () => {
    const r = withAdvance(`@dragPhase.advance(DragMsg.Drop("c2"))`);
    expect(diagsOf(r, "E-ENGINE-MSG-UNKNOWN").length).toBe(0);
    expect(diagsOf(r, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(diagsOf(r, "E-TYPE-063").length).toBe(0);
  });

  test("non-literal, single-plane (DragMsg-typed fn param) → clean", () => {
    const r = withAdvance("@dragPhase.advance(m)", { fnWrap: "m: DragMsg" });
    expect(diagsOf(r, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(diagsOf(r, "E-ENGINE-MSG-UNKNOWN").length).toBe(0);
  });

  test("non-literal, union-typed argument → FORBIDDEN (E-VARIANT-AMBIGUOUS)", () => {
    const r = withAdvance("@dragPhase.advance(u)", { fnWrap: "u: DragPhase | DragMsg" });
    expect(diagsOf(r, "E-VARIANT-AMBIGUOUS").length).toBe(1);
  });

  test("non-literal, wrong-enum argument → FORBIDDEN (E-VARIANT-AMBIGUOUS)", () => {
    const r = withAdvance("@dragPhase.advance(o)", {
      extraTypes: "type Other:enum = { Foo, Bar }\n",
      fnWrap: "o: Other",
    });
    expect(diagsOf(r, "E-VARIANT-AMBIGUOUS").length).toBe(1);
  });

  test("accepts-LESS engine: `.advance(.StateVariant)` resolves single-plane, clean", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }

<engine for=DragPhase initial=.Idle>
  <Idle rule=.Dragging></>
  <Dragging(id) rule=.Idle></>
</>

\${
  @dragPhase.advance(.Dragging(1))
}
`;
    const r = compile(src);
    expect(diagsOf(r, "E-ENGINE-MSG-UNKNOWN").length).toBe(0);
    expect(diagsOf(r, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(diagsOf(r, "E-TYPE-063").length).toBe(0);
  });

  test("accepts-LESS engine: bad bare variant stays §14.10 single-plane (E-TYPE-063, NOT E-ENGINE-MSG-UNKNOWN)", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }

<engine for=DragPhase initial=.Idle>
  <Idle rule=.Dragging></>
  <Dragging(id) rule=.Idle></>
</>

\${
  @dragPhase.advance(.Bogus)
}
`;
    const r = compile(src);
    // Unchanged pre-S154 behavior: single-plane against the state enum only.
    expect(diagsOf(r, "E-ENGINE-MSG-UNKNOWN").length).toBe(0);
    expect(diagsOf(r, "E-TYPE-063").length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// W-MATCH-ARROW-LEGACY (info) on a deprecated `=>` / `->` message arm
// ---------------------------------------------------------------------------

describe("W-MATCH-ARROW-LEGACY: deprecated arm separator on a (state × message) arm", () => {
  test("`| .V => body` message arm fires W-MATCH-ARROW-LEGACY (info), lands in warnings not errors", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }
type DragMsg:enum   = { Start(id: number), Drop(col: string), End }

<engine for=DragPhase initial=.Idle accepts=DragMsg>
  <Idle rule=.Dragging>
    | .Start(id) => .Dragging(id)
    | .Drop(col) :> .Idle
    | .End       :> .Idle
  </>
  <Dragging(id) rule=.Idle>
    | _ :> @dragPhase
  </>
</>
`;
    const r = compile(src);
    const hits = diagsOf(r, "W-MATCH-ARROW-LEGACY");
    expect(hits.length).toBeGreaterThanOrEqual(1);
    for (const h of hits) expect(h.severity).toBe("info");

    // S93 stream partition: the info code lands in result.warnings, NEVER in
    // result.errors. Asserting on result.errors alone would silently pass.
    const inWarnings = (r.warnings || []).filter((e) => e.code === "W-MATCH-ARROW-LEGACY");
    const inErrors = (r.errors || []).filter((e) => e.code === "W-MATCH-ARROW-LEGACY");
    expect(inWarnings.length).toBeGreaterThanOrEqual(1);
    expect(inErrors.length).toBe(0);
  });

  test("canonical `:>` message arms do NOT fire W-MATCH-ARROW-LEGACY", () => {
    expect(diagsOf(compile(WORKED_EXAMPLE), "W-MATCH-ARROW-LEGACY").length).toBe(0);
  });
});
