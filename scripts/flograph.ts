// scripts/flograph.ts — flogeance Project-Graph MVP (validation harness; runs against scrml's corpus).
//
// Spec: scrml-support/docs/flogeance-graph-mvp-spec-2026-06-17.md
// House style mirrors scripts/state.ts + scripts/regen-spec-index.ts (plain bun-run TS, readFileSync,
// regex token parse, deterministic output, no timestamps so --check is stable).
//
// THIS IS A THROWAWAY VALIDATION HARNESS for the typed-edge + provenance VOCABULARY, run against
// scrml's own durable corpus (the richest project-graph test bed). The product is flogeance-in-scrml;
// this proves the vocabulary cheaply first (see spec §6).
//
// MODES:
//   bun scripts/flograph.ts                  REPORT — node/edge counts + provenance sweep (stdout)
//   bun scripts/flograph.ts --emit           EMIT   — write docs/graph/graph.json + graph.mmd (@generated)
//   bun scripts/flograph.ts --check          CHECK  — dangling(WARN) + dup-id(ERROR) + drift(ERROR) + sweep(INFO); exit 1 on ERROR
//   bun scripts/flograph.ts --corpus a,b,c   override the default corpus globs (for the fixture demo)
//
// DATA MODEL (spec §2):
//   node token : <!-- @node id=<id> kind=<kind> status=<status> [sev=<sev>] -->   (+ @gap alias → kind=gap)
//   edge       : [[<type>: <target>]]  typed (type ∈ blocks|supersedes|decided-by|cites)
//                [[<target>]]          untyped "relates"
//                [[<type>: <target> verified]]  + the single provenance bit (on decided-by|cites)
//   attribution: an edge belongs to the nearest-preceding @node in document order; else the file-node.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const SUPPORT = `${ROOT}/../scrml-support`;

// ── Corpus (spec §2.4 durable tier) ─────────────────────────────────────────
// "scrml first" (S202 ruling): default = scrml's OWN durable docs only. The scrml-support design
// corpus (design-insights + deep-dives) is OPT-IN via --with-support (it adds ~230 doc-nodes of
// noise that drowns scrml's own graph). --corpus a,b,c overrides entirely.
function defaultCorpus(): string[] {
  const files: string[] = [`${ROOT}/docs/known-gaps.md`, `${ROOT}/master-list.md`];
  if (process.argv.includes("--with-support")) {
    const insights = `${SUPPORT}/design-insights.md`;
    if (existsSync(insights)) files.push(insights);
    const ddDir = `${SUPPORT}/docs/deep-dives`;
    if (existsSync(ddDir)) for (const f of readdirSync(ddDir)) if (f.endsWith(".md")) files.push(`${ddDir}/${f}`);
  }
  return files.filter(existsSync);
}

const EDGE_TYPES = new Set(["blocks", "supersedes", "decided-by", "cites"]);
const LOAD_BEARING = new Set(["resolved", "current"]); // statuses whose claims should be ground-truthed

type Node = { id: string; kind: string; status: string; sev: string | null; file: string; line: number };
type Edge = { from: string; type: string; target: string; verified: boolean; file: string; line: number };

// ── Parse ────────────────────────────────────────────────────────────────────
const GAP_RE = /<!--\s*@gap\s+id=(\S+)\s+sev=(HIGH|MED|LOW|NOMINAL)\s+status=(\S+)\s*-->/;
const NODE_RE = /<!--\s*@node\s+([^>]*?)-->/;
const LINK_RE = /\[\[([^\]]+)\]\]/g;

function attrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(/(\w+)=(\S+)/g)) out[m[1]] = m[2];
  return out;
}

function stem(file: string): string {
  return file.split("/").pop()!.replace(/\.md$/, "");
}

function parseFile(file: string, nodes: Map<string, Node>, dupes: string[], edges: Edge[]) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  // Every file is implicitly a node (id = stem, kind=doc) so file-level links have a home.
  const fileNode: Node = { id: stem(file), kind: "doc", status: "current", sev: null, file, line: 1 };
  if (!nodes.has(fileNode.id)) nodes.set(fileNode.id, fileNode);
  let current = fileNode.id;
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }

    // node tokens — scanned regardless of fence so @gap count matches state.ts + defines boundaries
    const gap = line.match(GAP_RE);
    if (gap) {
      const n: Node = { id: gap[1], kind: "gap", status: gap[3], sev: gap[2], file, line: i + 1 };
      if (nodes.has(n.id) && nodes.get(n.id)!.kind !== "doc") dupes.push(`${n.id} (${rel(file)}:${i + 1})`);
      nodes.set(n.id, n);
      current = n.id;
      continue;
    }
    const node = line.match(NODE_RE);
    if (node) {
      const a = attrs(node[1]);
      if (a.id) {
        const n: Node = { id: a.id, kind: a.kind ?? "node", status: a.status ?? "current", sev: a.sev ?? null, file, line: i + 1 };
        if (nodes.has(n.id) && nodes.get(n.id)!.kind !== "doc") dupes.push(`${n.id} (${rel(file)}:${i + 1})`);
        nodes.set(n.id, n);
        current = n.id;
      }
      continue;
    }

    // edges — skip inside code fences (reduces false positives from code samples)
    if (inFence) continue;
    for (const lm of line.matchAll(LINK_RE)) {
      const inner = lm[1].trim();
      const colon = inner.indexOf(":");
      if (colon > 0 && EDGE_TYPES.has(inner.slice(0, colon).trim())) {
        const type = inner.slice(0, colon).trim();
        const rest = inner.slice(colon + 1).trim().split(/\s+/);
        const verified = rest[rest.length - 1] === "verified";
        const target = (verified ? rest.slice(0, -1) : rest).join(" ").trim();
        edges.push({ from: current, type, target, verified, file, line: i + 1 });
      } else {
        edges.push({ from: current, type: "relates", target: inner, verified: false, file, line: i + 1 });
      }
    }
  }
}

function build(corpus: string[]) {
  const nodes = new Map<string, Node>();
  const dupes: string[] = [];
  const edges: Edge[] = [];
  for (const f of corpus) parseFile(f, nodes, dupes, edges);
  return { nodes, dupes, edges };
}

// ── Emit (deterministic; no timestamps) ───────────────────────────────────────
function sanitize(id: string): string { return "n_" + id.replace(/[^A-Za-z0-9_]/g, "_"); }

function toJson(nodes: Map<string, Node>, edges: Edge[]): string {
  const ns = [...nodes.values()].sort((a, b) => a.id < b.id ? -1 : 1);
  const es = [...edges].sort((a, b) => `${a.from}|${a.type}|${a.target}` < `${b.from}|${b.type}|${b.target}` ? -1 : 1);
  return JSON.stringify({ nodes: ns, edges: es }, null, 2) + "\n";
}

function toMermaid(nodes: Map<string, Node>, edges: Edge[]): string {
  const out: string[] = ["flowchart TD"];
  const ids = new Set(nodes.keys());
  for (const n of [...nodes.values()].sort((a, b) => a.id < b.id ? -1 : 1)) {
    const label = `${n.id}<br/>${n.kind}·${n.status}${n.sev ? "·" + n.sev : ""}`;
    out.push(`  ${sanitize(n.id)}["${label}"]:::${n.status}`);
  }
  for (const e of [...edges].sort((a, b) => `${a.from}|${a.target}` < `${b.from}|${b.target}` ? -1 : 1)) {
    if (!ids.has(e.target)) continue; // dangling edges omitted from the render (listed in --check)
    if (e.type === "relates") continue; // untyped links omitted from the flowchart to keep topology legible
    const lbl = e.type + (e.verified ? " ✓" : "");
    out.push(`  ${sanitize(e.from)} -->|${lbl}| ${sanitize(e.target)}`);
  }
  out.push("classDef open fill:#fee,stroke:#c00;");
  out.push("classDef resolved fill:#efe,stroke:#0a0;");
  out.push("classDef current fill:#eef,stroke:#06c;");
  out.push("classDef doc fill:#f7f7f7,stroke:#999,stroke-dasharray:3;");
  return out.join("\n") + "\n";
}

// ── Report ─────────────────────────────────────────────────────────────────
function report(corpus: string[]) {
  const { nodes, dupes, edges } = build(corpus);
  const byKind: Record<string, number> = {};
  const gapByStatusSev: Record<string, number> = {};
  for (const n of nodes.values()) {
    byKind[n.kind] = (byKind[n.kind] ?? 0) + 1;
    if (n.kind === "gap") gapByStatusSev[`${n.sev} ${n.status}`] = (gapByStatusSev[`${n.sev} ${n.status}`] ?? 0) + 1;
  }
  const byType: Record<string, number> = {};
  for (const e of edges) byType[e.type] = (byType[e.type] ?? 0) + 1;

  console.log("flograph — project-graph report (MVP harness)");
  console.log(`  corpus: ${corpus.length} file(s)`);
  console.log(`  nodes:  ${nodes.size}  (${Object.entries(byKind).sort().map(([k, v]) => `${k}:${v}`).join(" ")})`);
  console.log(`  GAP round-trip (must match state.ts): HIGH open=${gapByStatusSev["HIGH open"] ?? 0} · MED open=${gapByStatusSev["MED open"] ?? 0} · LOW open=${gapByStatusSev["LOW open"] ?? 0}`);
  console.log(`  edges:  ${edges.length}  (${Object.entries(byType).sort().map(([k, v]) => `${k}:${v}`).join(" ")})`);

  const ids = new Set(nodes.keys());
  const dangling = edges.filter(e => !ids.has(e.target));
  console.log(`  dangling edges: ${dangling.length} (targets not yet @node — expected on an un-annotated corpus)`);

  const sweep = edges.filter(e => (e.type === "decided-by" || e.type === "cites") && !e.verified && LOAD_BEARING.has(nodes.get(e.from)?.status ?? ""));
  console.log(`  provenance sweep: ${sweep.length} load-bearing decided-by/cites edge(s) NOT verified (assert→verify candidates)`);
  if (dupes.length) console.log(`  DUPLICATE node ids: ${dupes.length}`);
}

// ── Emit mode ─────────────────────────────────────────────────────────────
function emit(corpus: string[]): number {
  const { nodes, edges } = build(corpus);
  const dir = `${ROOT}/docs/graph`;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/graph.json`, toJson(nodes, edges));
  writeFileSync(`${dir}/graph.mmd`, toMermaid(nodes, edges));
  console.log(`flograph --emit: wrote ${rel(dir)}/graph.json + graph.mmd (${nodes.size} nodes, ${edges.length} edges)`);
  return 0;
}

// ── Check mode ─────────────────────────────────────────────────────────────
function check(corpus: string[]): number {
  const { nodes, dupes, edges } = build(corpus);
  const ids = new Set(nodes.keys());
  let errors = 0;
  console.log("flograph --check");

  // 1. duplicate id → ERROR
  if (dupes.length) { errors += dupes.length; for (const d of dupes) console.log(`  ERROR  duplicate node id: ${d}`); }

  // 2. dangling edge → WARN (honors [[name]]-as-todo)
  const dangling = edges.filter(e => !ids.has(e.target));
  for (const e of dangling.slice(0, 12)) console.log(`  WARN   dangling [[${e.type === "relates" ? "" : e.type + ": "}${e.target}]] in ${rel(e.file)}:${e.line} (target not a @node)`);
  if (dangling.length > 12) console.log(`  WARN   … +${dangling.length - 12} more dangling edges`);

  // 3. drift → ERROR (only if the artifacts exist on disk)
  const jf = `${ROOT}/docs/graph/graph.json`, mf = `${ROOT}/docs/graph/graph.mmd`;
  if (existsSync(jf) && readFileSync(jf, "utf8") !== toJson(nodes, edges)) { errors++; console.log(`  ERROR  docs/graph/graph.json stale — run \`bun scripts/flograph.ts --emit\``); }
  if (existsSync(mf) && readFileSync(mf, "utf8") !== toMermaid(nodes, edges)) { errors++; console.log(`  ERROR  docs/graph/graph.mmd stale — run \`bun scripts/flograph.ts --emit\``); }

  // 4. provenance sweep → INFO (non-gating)
  const sweep = edges.filter(e => (e.type === "decided-by" || e.type === "cites") && !e.verified && LOAD_BEARING.has(nodes.get(e.from)?.status ?? ""));
  for (const e of sweep.slice(0, 12)) console.log(`  INFO   ${e.from} [[${e.type}: ${e.target}]] is asserted, not verified (${rel(e.file)}:${e.line})`);
  if (sweep.length > 12) console.log(`  INFO   … +${sweep.length - 12} more assert→verify candidates`);

  console.log(`  ${errors ? "FAIL" : "PASS"} — ${dupes.length} dup · ${dangling.length} dangling(warn) · ${sweep.length} unverified(info) · ${errors} error(s)`);
  return errors ? 1 : 0;
}

function rel(abs: string): string { return abs.startsWith(ROOT + "/") ? abs.slice(ROOT.length + 1) : abs.replace(SUPPORT + "/", "../scrml-support/"); }

// ── main ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const cIdx = args.indexOf("--corpus");
const corpus = cIdx >= 0 ? args[cIdx + 1].split(",").map(p => p.startsWith("/") ? p : `${ROOT}/${p}`) : defaultCorpus();
const expandedCorpus = corpus.flatMap(p => p.includes("*") ? globSync(p) : [p]).filter(existsSync);

function globSync(pat: string): string[] {
  const dir = pat.slice(0, pat.lastIndexOf("/"));
  const re = new RegExp("^" + pat.slice(pat.lastIndexOf("/") + 1).replace(/[.]/g, "\\.").replace(/\*/g, ".*") + "$");
  return existsSync(dir) ? readdirSync(dir).filter(f => re.test(f)).map(f => `${dir}/${f}`) : [];
}

if (args.includes("--emit")) process.exit(emit(expandedCorpus));
else if (args.includes("--check")) process.exit(check(expandedCorpus));
else report(expandedCorpus);
