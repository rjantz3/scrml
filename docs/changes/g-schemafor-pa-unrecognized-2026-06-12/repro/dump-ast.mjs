import { readFileSync } from "node:fs";
import { splitBlocks } from "../../../../compiler/src/block-splitter.js";
import { buildAST } from "../../../../compiler/src/ast-builder.js";

const src = readFileSync(new URL("./form-b.scrml", import.meta.url), "utf8");
const bs = splitBlocks("form-b.scrml", src);
const res = buildAST({ filePath: "form-b.scrml", blocks: bs.blocks });
const ast = res.ast ?? res;
const nodes = ast.nodes ?? ast;

function findSchema(node, depth=0) {
  if (node === null || typeof node !== "object" || depth > 40) return;
  if (Array.isArray(node)) { for (const n of node) findSchema(n, depth+1); return; }
  if (node.kind === "state" && node.stateType === "schema") {
    console.log("=== SCHEMA NODE ===");
    console.log(JSON.stringify(node, (k,v)=> (k==="span"||k==="filePath")?undefined:v, 2).slice(0, 6000));
  }
  for (const k of Object.keys(node)) {
    if (k==="span") continue;
    findSchema(node[k], depth+1);
  }
}
findSchema(nodes);
