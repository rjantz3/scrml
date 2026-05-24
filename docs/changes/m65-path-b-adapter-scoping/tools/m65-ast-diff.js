// scratch/m65-ast-diff.js — within-node divergence diff for the M6.5 path-b
// scoping survey. Runs BOTH parser pipelines on a given .scrml file and dumps
// a structured per-axis diff to stdout.
//
// USAGE: bun run scratch/m65-ast-diff.js <path-to-.scrml> [--json] [--summary]
//
// EXIT CODES:
//   0 — diff completed (regardless of whether divergences were found)
//   2 — file unreadable / parse blew up
//
// METHODOLOGY
// 1. Parse the source via BOTH paths:
//      LIVE   — splitBlocks(filePath, src) + buildAST(bs)        -> FileAST
//      NATIVE — nativeParseFile(filePath, src)                   -> FileAST
// 2. Strip volatile fields (numeric `id`s, deep span coords) so structural
//    diffs are not drowned by ID renumbering. Keep `kind` + `span.line` +
//    field shape; drop `id` and any other counter-derived integers.
// 3. Walk the two ASTs in parallel, classify divergences by class:
//      KIND-NAME            — different `.kind` at the same node position
//      MISSING-FIELD        — field on one side, absent on the other
//      EXTRA-FIELD          — same class, opposite direction (cataloged for symmetry)
//      FIELD-SHAPE          — same field name; different type / structure
//      NESTED-SHAPE         — same `kind`; one wraps in extra envelope
//      ORDER                — same fields, different ordering
//      SPAN-COORD           — same logical structure; different span.line/col
//      COUNT-LENGTH         — same field; arrays of different length
//    All findings printed with PATH (the dotted path to the divergence node),
//    LIVE shape, NATIVE shape, and inferred classification.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { splitBlocks } from "../compiler/src/block-splitter.js";
import { buildAST } from "../compiler/src/ast-builder.js";
import { nativeParseFile } from "../compiler/native-parser/parse-file.js";

const args = process.argv.slice(2);
const fileArg = args.find(a => !a.startsWith("--"));
const wantJson = args.includes("--json");
const wantSummary = args.includes("--summary");
const wantSmall = args.includes("--small");

if (!fileArg) {
  console.error("usage: bun run scratch/m65-ast-diff.js <path-to-.scrml> [--json|--summary|--small]");
  process.exit(2);
}

const filePath = resolve(fileArg);
let source;
try {
  source = readFileSync(filePath, "utf8");
} catch (e) {
  console.error(`unreadable: ${filePath}: ${e.message}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// PARSE BOTH PIPELINES
// ---------------------------------------------------------------------------
let liveFileAst, liveErrors;
try {
  const bs = splitBlocks(filePath, source);
  const tab = buildAST(bs);
  liveFileAst = tab.ast;
  liveErrors = (bs.errors || []).concat(tab.errors || []);
} catch (e) {
  liveFileAst = { __crash: true, error: e.message, stack: e.stack };
  liveErrors = [{ stage: "LIVE-CRASH", code: "E-CRASH", message: e.message }];
}

let nativeFileAst, nativeErrors;
try {
  const r = nativeParseFile(filePath, source);
  nativeFileAst = r.ast;
  nativeErrors = r.errors || [];
} catch (e) {
  nativeFileAst = { __crash: true, error: e.message, stack: e.stack };
  nativeErrors = [{ stage: "NATIVE-CRASH", code: "E-CRASH", message: e.message }];
}

// ---------------------------------------------------------------------------
// STRIPPING — kill `id` and other counter-derived fields so the diff sees
// structural delta, not renumbering noise. Keep `kind`, `tag`, `name`, and
// shape; drop `id`, `_sourceText`, `spans` map (which lives on the live
// FileAST root, not in nodes).
// ---------------------------------------------------------------------------
const STRIP_KEYS = new Set([
  "id",
  "spans",
  "_sourceText",
  "_source",
  // _nativeEngineBlock is a native-only escape hatch — synthesized on
  // native-side engine-decls for the M6.6.b.2 walker.
  "_nativeEngineBlock",
]);

// ---------------------------------------------------------------------------
// CLASSIFICATION HELPERS
// ---------------------------------------------------------------------------
function typeOf(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function isObj(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

const findings = [];
function record(klass, path, live, native, extra = {}) {
  findings.push({ klass, path, live, native, ...extra });
}

// Shorten a value for diagnostic display — keep enough to disambiguate
// without dumping the full subtree.
function summary(v, depth = 2) {
  if (v === null || v === undefined) return JSON.stringify(v);
  if (typeof v === "string") return v.length > 50 ? JSON.stringify(v.slice(0, 50)) + "..." : JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    if (depth <= 0) return `[array len=${v.length}]`;
    const kinds = v.slice(0, 3).map(x => (isObj(x) && x.kind) ? x.kind : typeOf(x));
    return `[array len=${v.length} kinds=${JSON.stringify(kinds)}]`;
  }
  if (isObj(v)) {
    if (depth <= 0) return `{${Object.keys(v).slice(0, 5).join(",")}}`;
    const keys = Object.keys(v).slice(0, 8);
    const inner = keys.map(k => {
      const val = v[k];
      if (k === "kind") return `kind:${JSON.stringify(val)}`;
      if (typeof val === "string") return `${k}:${val.length > 24 ? '"' + val.slice(0, 24) + '..."' : JSON.stringify(val)}`;
      if (typeof val === "number" || typeof val === "boolean" || val === null) return `${k}:${val}`;
      if (Array.isArray(val)) return `${k}:[${val.length}]`;
      if (isObj(val)) return `${k}:{${Object.keys(val).slice(0, 3).join(",")}}`;
      return `${k}:?`;
    });
    return `{${inner.join(",")}}`;
  }
  return String(v);
}

// ---------------------------------------------------------------------------
// PARALLEL WALKER — diff two values at PATH. Records findings via record().
// Recursion depth-limited for safety; arrays compared positionally; objects
// compared by key union.
// ---------------------------------------------------------------------------
function walk(path, live, native) {
  // Both crashed / both missing — nothing to compare.
  if (live === undefined && native === undefined) return;

  const lt = typeOf(live);
  const nt = typeOf(native);

  if (lt !== nt) {
    record("FIELD-SHAPE", path, lt, nt, { liveSummary: summary(live), nativeSummary: summary(native) });
    return;
  }

  if (lt === "array") {
    if (live.length !== native.length) {
      record("COUNT-LENGTH", path, `len=${live.length}`, `len=${native.length}`, {
        liveSummary: summary(live, 1), nativeSummary: summary(native, 1),
      });
    }
    const minLen = Math.min(live.length, native.length);
    for (let i = 0; i < minLen; i++) {
      walk(`${path}[${i}]`, live[i], native[i]);
    }
    // Surface the extras (one side has more elements)
    for (let i = minLen; i < live.length; i++) {
      record("MISSING-FIELD", `${path}[${i}]`, summary(live[i]), "<absent>");
    }
    for (let i = minLen; i < native.length; i++) {
      record("EXTRA-FIELD", `${path}[${i}]`, "<absent>", summary(native[i]));
    }
    return;
  }

  if (lt === "object") {
    // KIND-NAME divergence — same node position, different `.kind`.
    if (live.kind !== native.kind) {
      record("KIND-NAME", `${path}.kind`, JSON.stringify(live.kind), JSON.stringify(native.kind), {
        liveSummary: summary(live, 1), nativeSummary: summary(native, 1),
      });
      // STILL compare other fields below; the kind divergence doesn't stop us.
    }

    const liveKeys = new Set(Object.keys(live).filter(k => !STRIP_KEYS.has(k)));
    const nativeKeys = new Set(Object.keys(native).filter(k => !STRIP_KEYS.has(k)));

    for (const k of liveKeys) {
      if (!nativeKeys.has(k)) {
        record("MISSING-FIELD", `${path}.${k}`, summary(live[k]), "<absent>");
      } else {
        // Span gets special treatment — line+col differences are SPAN-COORD
        // (often not load-bearing); structural span differences are FIELD-SHAPE.
        if (k === "span") {
          const ls = live[k], ns = native[k];
          if (isObj(ls) && isObj(ns)) {
            // Spans differ structurally?
            const lKeys = Object.keys(ls).sort().join(",");
            const nKeys = Object.keys(ns).sort().join(",");
            if (lKeys !== nKeys) {
              record("SPAN-COORD", `${path}.span`, lKeys, nKeys);
            } else if (ls.line !== ns.line || ls.column !== ns.column ||
                       ls.start !== ns.start || ls.end !== ns.end) {
              // line/col differs — likely not load-bearing but cataloged
              // (only first 3 per parent — too noisy otherwise; we'll
              // count-summarize at the end)
              record("SPAN-COORD", `${path}.span`,
                     JSON.stringify(ls), JSON.stringify(ns));
            }
          } else {
            walk(`${path}.${k}`, ls, ns);
          }
        } else {
          walk(`${path}.${k}`, live[k], native[k]);
        }
      }
    }
    for (const k of nativeKeys) {
      if (!liveKeys.has(k)) {
        record("EXTRA-FIELD", `${path}.${k}`, "<absent>", summary(native[k]));
      }
    }
    return;
  }

  // Primitive — compare directly.
  if (live !== native) {
    record("FIELD-SHAPE", path, JSON.stringify(live), JSON.stringify(native));
  }
}

// ---------------------------------------------------------------------------
// Drive the walk
// ---------------------------------------------------------------------------
const liveAst = liveFileAst.__crash ? null : liveFileAst;
const nativeAst = nativeFileAst.__crash ? null : nativeFileAst;

if (liveFileAst.__crash) {
  console.error(`LIVE CRASH: ${liveFileAst.error}`);
  console.error(liveFileAst.stack);
}
if (nativeFileAst.__crash) {
  console.error(`NATIVE CRASH: ${nativeFileAst.error}`);
  console.error(nativeFileAst.stack);
}

if (liveAst && nativeAst) {
  walk("ast", liveAst, nativeAst);
}

// ---------------------------------------------------------------------------
// REPORT
// ---------------------------------------------------------------------------
if (wantJson) {
  console.log(JSON.stringify({
    filePath,
    liveErrorCount: liveErrors.length,
    nativeErrorCount: nativeErrors.length,
    liveErrors: liveErrors.slice(0, 30),
    nativeErrors: nativeErrors.slice(0, 30),
    divergenceCount: findings.length,
    findings,
  }, null, 2));
} else {
  // Aggregate by class
  const byClass = new Map();
  for (const f of findings) {
    byClass.set(f.klass, (byClass.get(f.klass) || 0) + 1);
  }
  console.log(`\n=== ${filePath} ===`);
  console.log(`live errors: ${liveErrors.length}  |  native errors: ${nativeErrors.length}`);
  if (liveErrors.length > 0 && !wantSummary) {
    console.log(`  live errors sample:`);
    for (const e of liveErrors.slice(0, 5)) {
      console.log(`    [${e.stage || "?"}] ${e.code || "?"}: ${(e.message || "").slice(0, 120)}`);
    }
  }
  if (nativeErrors.length > 0 && !wantSummary) {
    console.log(`  native errors sample:`);
    for (const e of nativeErrors.slice(0, 5)) {
      console.log(`    [${e.stage || "?"}] ${e.code || "?"}: ${(e.message || "").slice(0, 120)}`);
    }
  }

  console.log(`\ndivergence count by class:`);
  const sorted = [...byClass.entries()].sort((a, b) => b[1] - a[1]);
  for (const [klass, count] of sorted) {
    console.log(`  ${klass.padEnd(20)} ${count}`);
  }
  console.log(`  TOTAL                ${findings.length}`);

  if (!wantSummary) {
    // Surface up to N findings per class
    const SHOW_PER_CLASS = wantSmall ? 3 : 8;
    for (const [klass, count] of sorted) {
      if (klass === "SPAN-COORD") continue; // too noisy
      console.log(`\n--- ${klass} (showing up to ${SHOW_PER_CLASS} of ${count}) ---`);
      const items = findings.filter(f => f.klass === klass).slice(0, SHOW_PER_CLASS);
      for (const f of items) {
        console.log(`  PATH: ${f.path}`);
        console.log(`    LIVE:   ${f.liveSummary || f.live}`);
        console.log(`    NATIVE: ${f.nativeSummary || f.native}`);
      }
    }
  }
}
