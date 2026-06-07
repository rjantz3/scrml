// match-arrow-derived-locus-s171.test.js — S171 / change-id
// derived-match-arrow-colon-2026-06-07.
//
// SPEC §18.2 / §51.0.J / §34: the canonical match-arm separator is `:>`.
// `=>` and `->` are DEPRECATED arm-separator aliases accepted during the
// deprecation window (all three parse, build, and emit identically), surfacing
// the info-level lint `W-MATCH-ARROW-LEGACY`. S147 landed that lint for the
// block-form `<match>` arms and `!{}` error-handler arms. S171 ratified that
// the DERIVED match loci join the same deprecation:
//
//   (1) the value-return / derived-cell form `const <x> = match @c { ... }`
//       (Bug 71, S157) — ALREADY covered: the AST builder attaches a structural
//       `matchExpr` side-field whose arms carry `armArrow`, routed through
//       checkMatchDiagnostics. This file adds a REGRESSION guard for it.
//   (2) the §51.0.J derived-ENGINE attribute form
//       `<engine for=T derived=match @VAR { ... }>` — NOT previously covered:
//       the parser captures the match body as RAW TEXT (no structured arm
//       nodes), so the `armArrow`-field path is unavailable. S171 adds an
//       `engine-decl.inlineMatchArmArrows` parse-time stamp (glyph + absolute
//       source offset, arm-context-scoped) that the lint (type-system.ts) and
//       `migrate --fix` (commands/migrate.js) both consume.
//
// This file verifies, end to end:
//   §A — the derived-ENGINE locus stamps `inlineMatchArmArrows` with the right
//        glyph at the right source offset (and only at arm-separator positions).
//   §B — W-MATCH-ARROW-LEGACY fires once per `=>`/`->` derived-engine arm,
//        info-level; does NOT fire for `:>`; does NOT fire on a body-internal
//        arrow-fn `=>` or an opener-attribute fn-return `->` elsewhere.
//   §C — the derived-CELL `const <x> = match` locus fires the lint (regression).
//   §D — `migrate --fix` rewrites derived-engine `=>`/`->` arms to `:>` while
//        leaving an arrow-function glyph untouched.
//   §E — emitted JS is byte-identical (modulo the global gensym counter) for
//        the derived-engine substrate across `:>` / `=>` / `->`.

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { compileScrml } from "../../src/api.js";
import { rewriteMatchArmArrows } from "../../src/commands/migrate.js";
import { emitDerivedEngineSubstrate } from "../../src/codegen/emit-engine.ts";

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

let TMP;
beforeAll(() => { TMP = mkdtempSync(join(tmpdir(), "match-derived-s171-")); });
afterAll(() => { if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true }); });

function fx(relPath, source) {
  const abs = join(TMP, relPath);
  mkdirSync(join(abs, "..").replace(/\/$/, ""), { recursive: true });
  writeFileSync(abs, source);
  return abs;
}
function compile(filename, source) {
  const abs = fx(filename, source);
  return compileScrml({ inputFiles: [abs], outputDir: join(TMP, "dist"), write: false, log: () => {} });
}
// W-/I- codes land in result.warnings via the S93 partition; collect cross-stream.
function diagsOf(result, code) {
  return [...(result.errors || []), ...(result.warnings || []), ...(result.lintDiagnostics || [])]
    .filter((e) => e && e.code === code);
}
// Find the DERIVED engine-decl (the one carrying an inline-match body). A
// program may also declare a plain `<engine>` (the upstream source), which
// appears earlier in the walk and has no `inlineMatchArmArrows` — skip it.
function findDerivedEngine(root) {
  let found = null;
  (function walk(n) {
    if (found || !n || typeof n !== "object") return;
    if (Array.isArray(n)) { for (const x of n) walk(x); return; }
    if (n.kind === "engine-decl" && Array.isArray(n.inlineMatchArmArrows)) { found = n; return; }
    for (const k of Object.keys(n)) { if (k === "span") continue; walk(n[k]); }
  })(root);
  return found;
}

// A §51.0.J derived-engine program parameterized on the arm-separator glyph.
// `<phase>` is engine-bound (a sibling `<engine>`), so the derived engine's
// upstream `@phase` resolves; the derived projection maps each Phase variant.
const D = "$";
const DERIVED_ENGINE = (glyph) => `<program name="P">
type Phase:enum = { Idle, Loading, Done }
type Health:enum = { Healthy, AtRisk, Critical }

<engine for=Phase initial=.Idle>
  <Idle/>
  <Loading/>
  <Done/>
</engine>

<engine for=Health derived=match @phase {
  .Idle ${glyph} .Healthy
  .Loading ${glyph} .AtRisk
  .Done ${glyph} .Critical
}>
  <Healthy/>
  <AtRisk/>
  <Critical/>
</engine>

<page><p>${D}{@health}</p></page>
</program>
`;

// ---------------------------------------------------------------------------
// §A — derived-engine parse-time stamp (inlineMatchArmArrows)
// ---------------------------------------------------------------------------

describe("§A: derived-engine arm-arrow stamp (inlineMatchArmArrows)", () => {
  for (const glyph of [":>", "=>", "->"]) {
    test(`derived=match arms stamp glyph "${glyph}" at byte-accurate source offsets`, () => {
      const src = DERIVED_ENGINE(glyph);
      const bs = splitBlocks("/test/app.scrml", src);
      const { ast } = buildAST(bs);
      const eng = findDerivedEngine(ast);
      expect(eng).not.toBeNull();
      const arrows = eng.inlineMatchArmArrows;
      expect(Array.isArray(arrows)).toBe(true);
      expect(arrows.length).toBe(3);
      for (const a of arrows) {
        expect(a.glyph).toBe(glyph);
        // The recorded offset indexes the glyph's first char in the source.
        expect(src.slice(a.srcOffset, a.srcOffset + glyph.length)).toBe(glyph);
      }
    });
  }

  test("a body-internal arrow-function `=>` is NOT recorded as an arm separator", () => {
    // The derived projection arms use `:>`; the upstream cell carries an
    // arrow-fn `=>` in a sibling decl. Only the THREE arm separators are
    // recorded, and all three are `:>` — the arrow-fn glyph never leaks in.
    const src = `<program name="P">
type Phase:enum = { Idle, Loading, Done }
type Health:enum = { Healthy, AtRisk, Critical }

<double> = (x) => x * 2

<engine for=Phase initial=.Idle>
  <Idle/><Loading/><Done/>
</engine>

<engine for=Health derived=match @phase {
  .Idle :> .Healthy
  .Loading :> .AtRisk
  .Done :> .Critical
}>
  <Healthy/><AtRisk/><Critical/>
</engine>

<page><p>${D}{double(2)}</p></page>
</program>
`;
    const bs = splitBlocks("/test/app.scrml", src);
    const { ast } = buildAST(bs);
    const eng = findDerivedEngine(ast);
    expect(eng).not.toBeNull();
    expect(eng.inlineMatchArmArrows.length).toBe(3);
    for (const a of eng.inlineMatchArmArrows) expect(a.glyph).toBe(":>");
  });
});

// ---------------------------------------------------------------------------
// §B — W-MATCH-ARROW-LEGACY firing on the derived-engine locus
// ---------------------------------------------------------------------------

describe("§B: W-MATCH-ARROW-LEGACY on derived=match engine arms", () => {
  test("`=>` derived-engine arms fire the lint once per arm (3x), info-level", () => {
    const result = compile("b/eq.scrml", DERIVED_ENGINE("=>"));
    const lints = diagsOf(result, "W-MATCH-ARROW-LEGACY");
    expect(lints.length).toBe(3);
    for (const l of lints) {
      expect(l.severity).toBe("info");
      expect(l.message).toContain(":>");
      expect(l.message).toContain("derived=match");
    }
  });

  test("`->` derived-engine arms fire the lint once per arm (3x)", () => {
    const result = compile("b/dash.scrml", DERIVED_ENGINE("->"));
    const lints = diagsOf(result, "W-MATCH-ARROW-LEGACY");
    expect(lints.length).toBe(3);
    for (const l of lints) expect(l.severity).toBe("info");
  });

  test("`:>` canonical derived-engine arms do NOT fire the lint", () => {
    const result = compile("b/colon.scrml", DERIVED_ENGINE(":>"));
    expect(diagsOf(result, "W-MATCH-ARROW-LEGACY").length).toBe(0);
  });

  test("info-level partition: lands in result.warnings, never result.errors (S93)", () => {
    const result = compile("b/partition.scrml", DERIVED_ENGINE("=>"));
    const inWarnings = (result.warnings || []).filter((e) => e.code === "W-MATCH-ARROW-LEGACY");
    const inErrors = (result.errors || []).filter((e) => e.code === "W-MATCH-ARROW-LEGACY");
    expect(inWarnings.length).toBe(3);
    expect(inErrors.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §C — regression: derived-CELL `const <x> = match` locus (Bug 71)
// ---------------------------------------------------------------------------

const DERIVED_CELL = (glyph) => `<program name="P">
type Dir:enum = { North, South, East }
<dir>: Dir = Dir.North
const <label> = match @dir {
  .North ${glyph} "up"
  .South ${glyph} "down"
  else   ${glyph} "x"
}
<page><p>${D}{label}</p></page>
</program>
`;

describe("§C: W-MATCH-ARROW-LEGACY on derived-cell const <x> = match (regression)", () => {
  test("`=>` derived-cell match arms fire the lint (3x)", () => {
    const result = compile("c/eq.scrml", DERIVED_CELL("=>"));
    expect(diagsOf(result, "W-MATCH-ARROW-LEGACY").length).toBe(3);
  });
  test("`->` derived-cell match arms fire the lint (3x)", () => {
    const result = compile("c/dash.scrml", DERIVED_CELL("->"));
    expect(diagsOf(result, "W-MATCH-ARROW-LEGACY").length).toBe(3);
  });
  test("`:>` derived-cell match arms do NOT fire the lint", () => {
    const result = compile("c/colon.scrml", DERIVED_CELL(":>"));
    expect(diagsOf(result, "W-MATCH-ARROW-LEGACY").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §D — migrate --fix rewrites the derived-engine arms
// ---------------------------------------------------------------------------

describe("§D: migrate --fix rewrites derived=match engine arms to `:>`", () => {
  const SRC = `<program name="P">
type Phase:enum = { Idle, Loading, Done }
type Health:enum = { Healthy, AtRisk, Critical }

<double> = (x) => x * 2

<engine for=Phase initial=.Idle>
  <Idle/><Loading/><Done/>
</engine>

<engine for=Health derived=match @phase {
  .Idle => .Healthy
  .Loading -> .AtRisk
  .Done => .Critical
}>
  <Healthy/><AtRisk/><Critical/>
</engine>

<page><p>${D}{double(2)}</p></page>
</program>
`;

  test("all three derived-engine arm separators (=>/->/=>) become :>", () => {
    const r = rewriteMatchArmArrows(SRC, "/tmp/x.scrml");
    expect(r.changed).toBe(true);
    expect(r.count).toBe(3);
    expect(r.rewritten).toContain(".Idle :> .Healthy");
    expect(r.rewritten).toContain(".Loading :> .AtRisk");
    expect(r.rewritten).toContain(".Done :> .Critical");
  });

  test("the arrow-function glyph `(x) => x * 2` is UNTOUCHED", () => {
    const r = rewriteMatchArmArrows(SRC, "/tmp/x.scrml");
    expect(r.rewritten).toContain("<double> = (x) => x * 2");
    expect(r.rewritten).not.toContain("<double> = (x) :> x * 2");
  });

  test("a derived engine with only `:>` arms is a no-op", () => {
    const colonOnly = `<program name="P">
type Phase:enum = { Idle, Loading, Done }
type Health:enum = { Healthy, AtRisk, Critical }

<engine for=Phase initial=.Idle>
  <Idle/><Loading/><Done/>
</engine>

<engine for=Health derived=match @phase {
  .Idle :> .Healthy
  .Loading :> .AtRisk
  .Done :> .Critical
}>
  <Healthy/><AtRisk/><Critical/>
</engine>

<page><p>x</p></page>
</program>
`;
    const r = rewriteMatchArmArrows(colonOnly, "/tmp/x.scrml");
    expect(r.count).toBe(0);
    expect(r.changed).toBe(false);
    expect(r.rewritten).toBe(colonOnly);
  });

  test("post-rewrite source produces zero W-MATCH-ARROW-LEGACY on the derived-engine arms", () => {
    const r = rewriteMatchArmArrows(SRC, "/tmp/x.scrml");
    const result = compile("d/after.scrml", r.rewritten);
    expect(diagsOf(result, "W-MATCH-ARROW-LEGACY").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §E — byte-identical codegen across the three arrows (derived-engine substrate)
// ---------------------------------------------------------------------------

describe("§E: derived-engine codegen is byte-identical across :> / => / ->", () => {
  function buildSubstrate(body) {
    return emitDerivedEngineSubstrate({
      forType: "C",
      variants: [],
      initialVariant: null,
      derivedExpr: { kind: "inline-match", upstream: "c", matchBody: body },
      varName: "cell",
      isExported: false,
      isPinned: false,
      parentEngine: null,
      innerEngines: [],
      historyAttr: undefined,
      internalRules: undefined,
      onTimeoutElements: undefined,
    }).join("\n");
  }
  // The only legitimate inter-call difference is the global `_scrml_match_<n>`
  // gensym counter (call-order state, NOT arrow-dependent); normalize it.
  const norm = (s) => s.replace(/_scrml_match_\d+/g, "_scrml_match_N");

  test("=> and :> produce byte-identical substrate", () => {
    const a = norm(buildSubstrate(".A => .A\n.B => .B\n_ => .C"));
    const c = norm(buildSubstrate(".A :> .A\n.B :> .B\n_ :> .C"));
    expect(a).toBe(c);
  });
  test("-> and :> produce byte-identical substrate", () => {
    const d = norm(buildSubstrate(".A -> .A\n.B -> .B\n_ -> .C"));
    const c = norm(buildSubstrate(".A :> .A\n.B :> .B\n_ :> .C"));
    expect(d).toBe(c);
  });
});
