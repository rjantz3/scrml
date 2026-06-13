import { readFileSync } from "node:fs";
import { splitBlocks } from "../../../../compiler/src/block-splitter.js";
import { buildAST } from "../../../../compiler/src/ast-builder.js";

const src = readFileSync(new URL("./form-b.scrml", import.meta.url), "utf8");
const bs = splitBlocks("form-b.scrml", src);
const res = buildAST({ filePath: "form-b.scrml", blocks: bs.blocks });
const ast = res.ast ?? res;
const nodes = ast.nodes ?? ast;

function findTypeDecls(node, depth=0) {
  if (node === null || typeof node !== "object" || depth > 40) return;
  if (Array.isArray(node)) { for (const n of node) findTypeDecls(n, depth+1); return; }
  if (node.kind === "type-decl" || (node.kind && /type/i.test(node.kind) && node.name)) {
    console.log("=== "+node.kind+" name="+node.name+" ===");
    console.log(JSON.stringify(node, (k,v)=> (k==="span")?undefined:v, 2).slice(0, 3500));
    console.log("");
  }
  for (const k of Object.keys(node)) {
    if (k==="span") continue;
    findTypeDecls(node[k], depth+1);
  }
}
findTypeDecls(nodes);
