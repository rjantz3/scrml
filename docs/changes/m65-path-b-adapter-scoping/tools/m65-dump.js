// scratch/m65-dump.js — dump both FileASTs side-by-side, no diff classification.
// USAGE: bun run scratch/m65-dump.js <path-to-.scrml> [native|live]
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { splitBlocks } from "../compiler/src/block-splitter.js";
import { buildAST } from "../compiler/src/ast-builder.js";
import { nativeParseFile } from "../compiler/native-parser/parse-file.js";

const args = process.argv.slice(2);
const fileArg = args.find(a => !a.startsWith("native") && !a.startsWith("live"));
const which = args.includes("native") ? "native" : args.includes("live") ? "live" : "both";

const filePath = resolve(fileArg);
const src = readFileSync(filePath, "utf8");

function strip(v, depth = 99) {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) {
    if (depth <= 0) return `[len=${v.length}]`;
    return v.map(x => strip(x, depth - 1));
  }
  if (depth <= 0) return `{${Object.keys(v).slice(0,5).join(",")}}`;
  const out = {};
  for (const k of Object.keys(v)) {
    if (k === "id" || k === "_sourceText") continue;
    out[k] = strip(v[k], depth - 1);
  }
  return out;
}

if (which === "live" || which === "both") {
  const bs = splitBlocks(filePath, src);
  const tab = buildAST(bs);
  console.log("=== LIVE ===");
  console.log(JSON.stringify(strip(tab.ast), null, 2));
}

if (which === "native" || which === "both") {
  const r = nativeParseFile(filePath, src);
  console.log("=== NATIVE ===");
  console.log(JSON.stringify(strip(r.ast), null, 2));
}
