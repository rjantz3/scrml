// dual-pipeline-canary.js — M5-swap C2 (v0.7) dual-pipeline canary.
//
// The PROOF INSTRUMENT for C1's `nativeParseFile` assembler fidelity. For a
// scrml source file it runs BOTH parse pipelines:
//
//   LIVE   — `splitBlocks(filePath, source)` (BS) -> `buildAST(...)` (TAB).
//            The canonical pipeline every adopter compile uses today.
//   NATIVE — `nativeParseFile(filePath, source)`. The C1 assembler routed
//            behind `--parser=scrml-native`.
//
// Both pipelines return the SAME `{ filePath, ast: FileAST, errors }` shape,
// so the canary can structurally diff the two FileASTs:
//   - the recursive node-KIND sequence (top-level + markup children);
//   - the six hoisted-collection COUNTS (imports / exports / components /
//     typeDecls / machineDecls / channelDecls);
//   - `hasProgramRoot`;
//   - the diagnostic (error) streams — count + code multiset.
//
// THE CLASSIFICATION CONTRACT. C1 landed with three KNOWN, documented
// deferrals that WILL surface as canary diffs — these are EXPECTED, not bugs
// (see parse-file.js header):
//   D1 — `DisplayTextLiteral` is mapped to a `text` node (the §4.18.6 escape
//        pass is deferred).
//   D2 — `Test` / `ForeignCode` blocks are dropped with an
//        `I-NATIVE-BLOCK-DROPPED` info diagnostic (the live pipeline strips
//        Test pre-codegen; ForeignCode has no live ASTNode).
//   D3 — `synthLogicNode` leaves the per-node `logic.{imports,exports,
//        typeDecls,components}` arrays empty (the file-level `collectHoisted`
//        is the authoritative source).
//
// `classifyDivergence` partitions every divergent file into:
//   - `EXACT`              — the two FileASTs match structurally.
//   - `DEFERRAL-test-block`— the only diff is the live pipeline having a
//        top-level `test` node native dropped (D2). ACCEPTABLE.
//   - one of several `GAP-*` / `DIFF-*` classes — an UNEXPLAINED native-vs-
//        live divergence: a real fidelity gap. The conformance gate
//        (parser-conformance-corpus.test.js) `.skip`s these with the class
//        name as the documented reason; the C2 gap ledger catalogs them.
//
// Pure module — no test framework imports; consumed by the conformance test
// and by ad-hoc ledger scripts.

import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { nativeParseFile } from "../../native-parser/parse-file.js";

// =============================================================================
// runLivePipeline / runNativePipeline — drive one pipeline, return the
// `{ filePath, ast, errors }` result or a `{ crashed: true, error }` marker.
// A crash is itself a canary finding (the live pipeline is not expected to
// crash; the native parser's no-throw discipline means a native crash is a
// hard regression).
// =============================================================================
export function runLivePipeline(filePath, source) {
  try {
    const bs = splitBlocks(filePath, source);
    const tab = buildAST(bs, null);
    return { crashed: false, ast: tab.ast, errors: tab.errors || [] };
  } catch (e) {
    return { crashed: true, error: e && e.message ? e.message : String(e) };
  }
}

export function runNativePipeline(filePath, source) {
  try {
    const r = nativeParseFile(filePath, source);
    return { crashed: false, ast: r.ast, errors: r.errors || [] };
  } catch (e) {
    return { crashed: true, error: e && e.message ? e.message : String(e) };
  }
}

// =============================================================================
// nodeKindSequence — the recursive node-KIND walk. Top-level nodes plus, for
// every `markup` node, its `children` (recursively). The kind sequence is the
// primary structural signature the canary diffs.
// =============================================================================
export function nodeKindSequence(nodes) {
  const out = [];
  function walk(n) {
    if (n === undefined || n === null) return;
    out.push(n.kind);
    if (Array.isArray(n.children)) {
      for (const c of n.children) walk(c);
    }
  }
  for (const n of nodes || []) walk(n);
  return out;
}

// topKindSequence — the top-level node-kind sequence only (no recursion).
export function topKindSequence(nodes) {
  return (nodes || []).map((n) => (n !== undefined && n !== null ? n.kind : null));
}

// hoistCounts — the six hoisted-collection lengths, as a plain record.
const HOIST_FIELDS = [
  "imports", "exports", "components",
  "typeDecls", "machineDecls", "channelDecls",
];
export function hoistCounts(ast) {
  const out = {};
  for (const f of HOIST_FIELDS) {
    out[f] = Array.isArray(ast[f]) ? ast[f].length : 0;
  }
  return out;
}

// errorCodeMultiset — the diagnostic-code multiset for an errors[] stream.
export function errorCodeMultiset(errors) {
  const out = {};
  for (const e of errors || []) {
    const code = e && e.code ? e.code : "(no-code)";
    out[code] = (out[code] || 0) + 1;
  }
  return out;
}

// =============================================================================
// diffFileASTs — the structural diff. Returns a record:
//   { topSeqEqual, hoistEqual, programRootEqual,
//     liveTop, nativeTop, liveOnlyKinds, nativeOnlyKinds,
//     liveHoist, nativeHoist, liveHasProgramRoot, nativeHasProgramRoot }
// `liveOnlyKinds` / `nativeOnlyKinds` are the top-kind SET differences — the
// kinds one pipeline produced at top level that the other did not.
// =============================================================================
export function diffFileASTs(liveAst, nativeAst) {
  const liveTop = topKindSequence(liveAst.nodes);
  const nativeTop = topKindSequence(nativeAst.nodes);
  const topSeqEqual =
    liveTop.length === nativeTop.length &&
    liveTop.every((k, i) => k === nativeTop[i]);

  const liveSet = new Set(liveTop);
  const nativeSet = new Set(nativeTop);
  const liveOnlyKinds = [...liveSet].filter((k) => nativeSet.has(k) === false);
  const nativeOnlyKinds = [...nativeSet].filter((k) => liveSet.has(k) === false);

  const liveHoist = hoistCounts(liveAst);
  const nativeHoist = hoistCounts(nativeAst);
  const hoistEqual = HOIST_FIELDS.every((f) => liveHoist[f] === nativeHoist[f]);

  const liveHasProgramRoot = liveAst.hasProgramRoot === true;
  const nativeHasProgramRoot = nativeAst.hasProgramRoot === true;
  const programRootEqual = liveHasProgramRoot === nativeHasProgramRoot;

  return {
    topSeqEqual, hoistEqual, programRootEqual,
    liveTop, nativeTop, liveOnlyKinds, nativeOnlyKinds,
    liveHoist, nativeHoist, liveHasProgramRoot, nativeHasProgramRoot,
  };
}

// =============================================================================
// classifyDivergence — the canary's verdict for one corpus file. Drives both
// pipelines, structurally diffs, and returns:
//   { class, explained, detail }
// where `class` is one of:
//   - "EXACT"              — structural match. `explained: true`.
//   - "LIVE-CRASH"         — the live pipeline crashed. Surfaced; not C2's
//                            remit. `explained: false`.
//   - "NATIVE-CRASH"       — the native parser crashed (no-throw violation —
//                            a hard regression). `explained: false`.
//   - "DEFERRAL-test-block"— the ONLY diff is the live pipeline carrying a
//                            top-level `test` node native dropped per the D2
//                            deferral. `explained: true` — acceptable.
//   - "GAP-state-block"    — the live pipeline produced a `state` /
//                            `state-constructor-def` node native rendered as
//                            `markup` (the native parser has no `State`
//                            BlockKind). `explained: false` — a real gap.
//   - "GAP-native-extra-block" — native produced a top-level `sql` /
//                            `error-effect` / `markup` block the live
//                            pipeline did not. `explained: false`.
//   - "DIFF-engine-in-nodes"   — the live pipeline emits `engine-decl` in
//                            `ast.nodes`; native emits it only into
//                            `machineDecls`. `explained: false` — a real
//                            divergence (a placement difference).
//   - "GAP-program-root"   — `hasProgramRoot` disagrees and nothing else.
//                            `explained: false`.
//   - "DIFF-hoist-count"   — a hoisted-collection count disagrees and the
//                            top-kind sets match. `explained: false`.
//   - "DIFF-top-seq"       — the top-kind SETS match but the SEQUENCE (order
//                            or count) differs — a block-segmentation
//                            divergence. `explained: false`.
//   - "GAP-mixed"          — multiple divergence axes at once.
//                            `explained: false`.
// `explained: true` ⇒ the file is conformance-strict-eligible (it matches the
// live pipeline modulo a documented C1 deferral). `explained: false` ⇒ the
// file is a gap-ledger entry and is `.skip`-ed by the strict gate.
// =============================================================================
export function classifyDivergence(filePath, source) {
  const live = runLivePipeline(filePath, source);
  const native = runNativePipeline(filePath, source);

  if (live.crashed) {
    return { class: "LIVE-CRASH", explained: false, detail: live.error };
  }
  if (native.crashed) {
    return { class: "NATIVE-CRASH", explained: false, detail: native.error };
  }

  const d = diffFileASTs(live.ast, native.ast);

  if (d.topSeqEqual && d.hoistEqual && d.programRootEqual) {
    return { class: "EXACT", explained: true, detail: d };
  }

  const liveOnly = d.liveOnlyKinds;
  const nativeOnly = d.nativeOnlyKinds;

  // DEFERRAL D2 — the only top-kind diff is a `test` node native dropped.
  if (
    liveOnly.length === 1 && liveOnly[0] === "test" &&
    nativeOnly.length === 0 && d.hoistEqual && d.programRootEqual
  ) {
    return { class: "DEFERRAL-test-block", explained: true, detail: d };
  }

  // GAP — the native parser has no `State` BlockKind; `<state>` / `<db>`
  // declarative blocks become `markup` nodes.
  if (liveOnly.includes("state") || liveOnly.includes("state-constructor-def")) {
    return { class: "GAP-state-block", explained: false, detail: d };
  }

  // DIFF — `engine-decl` placement: live emits it in `nodes`, native only in
  // `machineDecls`.
  if (
    liveOnly.length === 1 && liveOnly[0] === "engine-decl" &&
    nativeOnly.length === 0
  ) {
    return { class: "DIFF-engine-in-nodes", explained: false, detail: d };
  }

  // hasProgramRoot disagrees and nothing else.
  if (
    liveOnly.length === 0 && nativeOnly.length === 0 &&
    d.programRootEqual === false && d.hoistEqual
  ) {
    return { class: "GAP-program-root", explained: false, detail: d };
  }

  // a hoisted-collection count disagrees, top-kind sets match.
  if (
    liveOnly.length === 0 && nativeOnly.length === 0 &&
    d.programRootEqual && d.hoistEqual === false
  ) {
    return { class: "DIFF-hoist-count", explained: false, detail: d };
  }

  // top-kind SETS match but the SEQUENCE differs — a segmentation divergence.
  if (
    liveOnly.length === 0 && nativeOnly.length === 0 &&
    d.programRootEqual && d.hoistEqual && d.topSeqEqual === false
  ) {
    return { class: "DIFF-top-seq", explained: false, detail: d };
  }

  // native produced an extra top-level block kind.
  if (
    liveOnly.length === 0 &&
    (nativeOnly.includes("sql") || nativeOnly.includes("error-effect") ||
     nativeOnly.includes("markup"))
  ) {
    return { class: "GAP-native-extra-block", explained: false, detail: d };
  }

  return { class: "GAP-mixed", explained: false, detail: d };
}

// =============================================================================
// summarizeDetail — a compact one-line human string for a divergence detail,
// for the gap-ledger output + the conformance `.skip` reason.
// =============================================================================
export function summarizeDetail(verdict) {
  if (verdict.class === "LIVE-CRASH" || verdict.class === "NATIVE-CRASH") {
    return verdict.detail;
  }
  const d = verdict.detail;
  const parts = [];
  if (d.liveOnlyKinds && d.liveOnlyKinds.length > 0) {
    parts.push("live-only-kinds=[" + d.liveOnlyKinds.join(",") + "]");
  }
  if (d.nativeOnlyKinds && d.nativeOnlyKinds.length > 0) {
    parts.push("native-only-kinds=[" + d.nativeOnlyKinds.join(",") + "]");
  }
  if (d.programRootEqual === false) {
    parts.push("hasProgramRoot live=" + d.liveHasProgramRoot +
      " native=" + d.nativeHasProgramRoot);
  }
  if (d.hoistEqual === false) {
    const hf = [];
    for (const f of Object.keys(d.liveHoist)) {
      if (d.liveHoist[f] !== d.nativeHoist[f]) {
        hf.push(f + " live=" + d.liveHoist[f] + " native=" + d.nativeHoist[f]);
      }
    }
    parts.push("hoist[" + hf.join("; ") + "]");
  }
  if (d.topSeqEqual === false && parts.length === 0) {
    parts.push("top-seq differs (same kind set): live=[" +
      d.liveTop.join(",") + "] native=[" + d.nativeTop.join(",") + "]");
  }
  return parts.join(" | ") || "structural divergence";
}
