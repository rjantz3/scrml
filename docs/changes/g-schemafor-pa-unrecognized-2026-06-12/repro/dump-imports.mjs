import { readFileSync } from "node:fs";
import { splitBlocks } from "../../../../compiler/src/block-splitter.js";
import { buildAST } from "../../../../compiler/src/ast-builder.js";

const src = readFileSync(new URL("./form-b.scrml", import.meta.url), "utf8");
const bs = splitBlocks("form-b.scrml", src);
const res = buildAST({ filePath: "form-b.scrml", blocks: bs.blocks });
const ast = res.ast ?? res;
const nodes = ast.nodes ?? ast;

function find(node, depth=0) {
  if (node === null || typeof node !== "object" || depth > 40) return;
  if (Array.isArray(node)) { for (const n of node) find(n, depth+1); return; }
  if (node.kind === "import-decl" || node.kind === "import" || (node.imports && Array.isArray(node.imports) && node.imports.length)) {
    if (node.kind === "import-decl" || node.kind === "import") {
      console.log("=== IMPORT NODE kind="+node.kind+" ===");
      console.log(JSON.stringify(node, (k,v)=>k==="span"?undefined:v, 2).slice(0,1500));
    }
    if (node.imports && node.imports.length) {
      console.log("=== node."+node.kind+".imports ===");
      console.log(JSON.stringify(node.imports, (k,v)=>k==="span"?undefined:v, 2).slice(0,1500));
    }
  }
  for (const k of Object.keys(node)) { if (k==="span") continue; find(node[k], depth+1); }
}
find(nodes);
