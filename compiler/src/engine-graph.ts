/**
 * @module engine-graph
 *
 * Engine "what-comes-next" static sidecar builder.
 *
 * Projects the engine state-machine metadata the compiler ALREADY resolves at
 * compile time (`EngineMetadata` on each `engine-decl._record`) into a
 * deterministic, pretty-printed JSON artifact: `<base>.engine-graph.json`,
 * written by the CLI `--emit-engine-graph` flag (mirroring `--emit-reachability`).
 *
 * This is PURE data exposure — no new analysis, no SPEC change, no runtime
 * behavior change. The artifact is read by the self-demonstrating scrml.dev
 * website's "what could come next" view (ratified S148; pre-computed-static
 * C1 fork) WITHOUT running the compiled app. The same edge data already ships
 * in the client bundle via `emit-machines.ts` `emitTransitionTable()` /
 * `emit-engine.ts` `emitEngineTransitionTable()`; this sidecar is the STATIC,
 * full-graph projection of it for a page that is not executing the runtime.
 *
 * What we project, per engine in the file (graph node):
 *   {
 *     "varName": "marioState",        // §51.0.C auto-declared variable
 *     "forType": "MarioState",        // for=Type enum the engine governs
 *     "initialState": "Small",        // §51.0.E resolved initial variant
 *     "derived": false,               // §51.0.J derived (projection) engine?
 *     "variants": ["Small","Big",...],// enum variants (declaration order)
 *     "transitions": [                // flat edge list, deterministic
 *       { "from": "Small", "to": "Big",  "wildcard": false },
 *       { "from": "*",     "to": "Dead", "wildcard": true  },
 *       ...
 *     ],
 *     "states": [                     // per-state outbound view, sorted by tag
 *       { "tag": "Small", "next": ["Big","Fire"], "hasEffect": false,
 *         "lifecycle": { "onTransition": false, "onTimeout": false } },
 *       ...
 *     ],
 *     "hasOpenerEffect": false        // §51.0.H Form 3 boot-only effect=
 *   }
 *
 * `states[].next` is WILDCARD-EXPANDED: it lists the concrete variant targets a
 * state can actually reach, INCLUDING targets inherited from `*:To` wildcard
 * edges (any-source → To). This is the set the website renders directly ("from
 * HERE, you can go to …"). The flat `transitions[]` list preserves the literal
 * edges WITH a `wildcard` marker so a consumer that wants to distinguish
 * authored-vs-inherited edges still can. (Wildcard-expanded chosen over
 * wildcard-marked-only per the dispatch brief: the website's render is the
 * primary consumer and the expanded set is what it needs; the marked flat list
 * is retained as the lossless source-of-truth.)
 *
 * Determinism (mirrors the reachability serializer + §40.9.8 / §47 culture):
 *   - Engines emitted in source order (the order `collectC12EngineDecls` /
 *     `collectC14DerivedEngineDecls` return them — decl order in the file AST).
 *   - `variants` in declaration order (as resolved by the type system).
 *   - `transitions` sorted by (from, to, wildcard).
 *   - `states` sorted by tag; each `next` sorted.
 *   - Stable object key order via fixed literal-key construction.
 * Two compiles of the same source produce byte-identical output.
 *
 * Engine discovery reuses the canonical codegen collectors from
 * `./codegen/emit-engine.ts` so this sidecar sees EXACTLY the engines codegen
 * emits — no separate walk to drift out of sync. This touches NONE of
 * `codegen/index.ts`.
 *
 * Cross-references:
 *   - SPEC.md §51.0 — engine declaration + state-children + rule= contracts.
 *   - compiler/src/symbol-table.ts — `EngineMetadata` / `EngineStateChildEntry`
 *     / `EngineRuleForm` (the source data this projects).
 *   - compiler/src/codegen/emit-engine.ts — `collectC12EngineDecls`,
 *     `collectC14DerivedEngineDecls`, `resolveEngineInitialVariant` (reused).
 *   - compiler/src/codegen/emit-machines.ts — `emitTransitionTable` (the
 *     runtime client-bundle table this is the static projection of).
 *   - compiler/src/commands/compile.js — `--emit-engine-graph` write site.
 */

import {
  collectC12EngineDecls,
  collectC14DerivedEngineDecls,
  resolveEngineInitialVariant,
} from "./codegen/emit-engine.ts";

// ---------------------------------------------------------------------------
// Local shape mirrors (the fields we read off engineMeta / state-children).
// Mirrored — not imported — to keep this module's type-import surface lean,
// matching the precedent in emit-engine.ts. The shapes match
// symbol-table.ts `EngineRuleForm` / `EngineStateChildEntry` /
// `EngineMetadata` exactly for the fields used.
// ---------------------------------------------------------------------------

type EngineRuleForm =
  | { kind: "absent" }
  | { kind: "single"; target: string }
  | { kind: "multi"; targets: string[] }
  | { kind: "wildcard" }
  | { kind: "legacy-arrow"; raw: string }
  | { kind: "parse-error"; raw: string; reason: string };

interface StateChildShape {
  tag: string;
  rule: EngineRuleForm;
  effectRaw?: string | null;
  onTransitionElements?: unknown[];
  onTimeoutElements?: unknown[];
  internalRule?: EngineRuleForm;
  historyAttr?: boolean;
}

interface EngineMetaShape {
  varName: string;
  forType: string;
  variants?: string[];
  initialVariant?: string | null;
  derivedExpr?: unknown | null;
  openerEffect?: string | null;
  stateChildren?: StateChildShape[];
  onTimeoutElements?: unknown[];
  idleWatchdog?: unknown | null;
}

interface EngineDeclShape {
  kind: string;
  _record?: { engineMeta?: EngineMetaShape };
}

// ---------------------------------------------------------------------------
// Emitted-JSON projection shapes (the public artifact contract).
// ---------------------------------------------------------------------------

/** One directed edge in the engine graph. `wildcard` is true for any edge whose
 *  source OR target is the `*` wildcard token (`*:To`, `From:*`, `*:*`). */
export interface EngineGraphTransition {
  from: string;
  to: string;
  wildcard: boolean;
}

/** Per-state lifecycle presence flags (whatever the metadata carries). */
export interface EngineGraphStateLifecycle {
  /** `<onTransition>` element(s) nested in this state-child body (§51.0.H). */
  onTransition: boolean;
  /** `<onTimeout>` element(s) in this state-child body (§51.0.M). */
  onTimeout: boolean;
  /** `internal:rule=` present on this state-child (§51.0.O composite). */
  internalRule: boolean;
  /** `history` bare attribute on this state-child (§51.0.N). */
  history: boolean;
}

/** Per-state outbound view — the "what comes next from HERE" the website renders. */
export interface EngineGraphState {
  tag: string;
  /** Wildcard-EXPANDED concrete next-state targets (sorted, de-duplicated). */
  next: string[];
  /** True iff entering this state via a transition fires an `effect=` (§51.0.H). */
  hasEffect: boolean;
  lifecycle: EngineGraphStateLifecycle;
}

/** One engine's full static graph projection. */
export interface EngineGraphEngine {
  varName: string;
  forType: string;
  initialState: string | null;
  derived: boolean;
  variants: string[];
  transitions: EngineGraphTransition[];
  states: EngineGraphState[];
  /** §51.0.H Form 3 — boot-only opener `effect=` present (fires once at init). */
  hasOpenerEffect: boolean;
}

/** Top-level artifact shape. Honest-empty `{ engines: [] }` when a file has no
 *  engines (NOT an error). */
export interface EngineGraph {
  engines: EngineGraphEngine[];
}

const WILDCARD = "*";

/**
 * Extract the literal `from:to` edges declared by a state-child's `rule=` form.
 * Mirrors `emitEngineTransitionTable`'s rule→key mapping (single / multi /
 * wildcard), and additionally recognizes the `*` source token in the tag
 * position (engine-level wildcard sources are not authored on state-children
 * today, but a `rule=*` produces a `From:*` target-wildcard edge here).
 *
 * Returns edges with the wildcard flag set when either endpoint is `*`.
 * legacy-arrow / parse-error / absent forms contribute no edges (B15 already
 * surfaced diagnostics for the malformed ones; absent = terminal state).
 */
function edgesForStateChild(child: StateChildShape): EngineGraphTransition[] {
  const from = child.tag;
  const rule = child.rule;
  const out: EngineGraphTransition[] = [];
  if (!rule) return out;
  switch (rule.kind) {
    case "single":
      out.push({ from, to: rule.target, wildcard: from === WILDCARD || rule.target === WILDCARD });
      break;
    case "multi":
      for (const target of rule.targets) {
        out.push({ from, to: target, wildcard: from === WILDCARD || target === WILDCARD });
      }
      break;
    case "wildcard":
      // `rule=*` — this state may transition to ANY variant (target wildcard).
      out.push({ from, to: WILDCARD, wildcard: true });
      break;
    // absent | legacy-arrow | parse-error — no edges.
    default:
      break;
  }
  return out;
}

/**
 * Deterministic edge comparator: (from, to, wildcard-last). String compare on
 * `from` then `to`; concrete edges sort before wildcard edges for the same
 * (from, to) pair (stable, total order).
 */
function compareTransitions(a: EngineGraphTransition, b: EngineGraphTransition): number {
  if (a.from !== b.from) return a.from < b.from ? -1 : 1;
  if (a.to !== b.to) return a.to < b.to ? -1 : 1;
  if (a.wildcard !== b.wildcard) return a.wildcard ? 1 : -1;
  return 0;
}

/**
 * Compute the wildcard-EXPANDED next-state set for a concrete state `tag`,
 * given the full edge list and the engine's variant universe.
 *
 * Resolution (mirrors the runtime wildcard-fallback contract in
 * emit-machines.ts: `From:To` → `*:To` → `From:*` → `*:*`):
 *   1. Literal `tag:To` edges with concrete `To` → add `To`.
 *   2. `*:To` edges (any-source → concrete To) → add `To` (this state inherits
 *      the any-source edge).
 *   3. `tag:*` edge (this state → any) → expand to ALL variants except itself
 *      (a wildcard target means "may reach any variant").
 *   4. `*:*` edge (any → any) → expand to ALL variants except itself.
 *
 * Self-loops are PRESERVED only when authored literally (`tag:tag`); wildcard
 * expansion (steps 3/4) excludes the originating state to avoid a spurious
 * self-edge from a catch-all. The result is sorted + de-duplicated.
 */
function expandNextForState(
  tag: string,
  transitions: EngineGraphTransition[],
  variants: string[],
): string[] {
  const next = new Set<string>();
  let hasSourceWildcardTarget = false; // tag:* or *:*
  for (const edge of transitions) {
    const fromMatches = edge.from === tag || edge.from === WILDCARD;
    if (!fromMatches) continue;
    if (edge.to === WILDCARD) {
      hasSourceWildcardTarget = true;
      continue;
    }
    next.add(edge.to);
  }
  if (hasSourceWildcardTarget) {
    for (const v of variants) {
      if (v !== tag) next.add(v);
    }
  }
  return [...next].sort();
}

/**
 * Build the projection for a single engine-decl. `derived` distinguishes the
 * §51.0.J derived (projection) engine form — derived engines carry no
 * authored state-child `rule=` transitions (they project an upstream engine),
 * so their `transitions` + `states` are empty; `variants` + `initialState`
 * still project for the website's variant legend.
 */
function projectEngine(decl: EngineDeclShape, derived: boolean): EngineGraphEngine | null {
  const meta = decl._record?.engineMeta;
  if (!meta) return null;

  const variants = Array.isArray(meta.variants) ? [...meta.variants] : [];
  const initialState = resolveEngineInitialVariant(meta as never);

  const transitions: EngineGraphTransition[] = [];
  const stateChildren = Array.isArray(meta.stateChildren) ? meta.stateChildren : [];
  for (const child of stateChildren) {
    for (const edge of edgesForStateChild(child)) {
      transitions.push(edge);
    }
  }
  transitions.sort(compareTransitions);

  const states: EngineGraphState[] = stateChildren
    .map((child): EngineGraphState => ({
      tag: child.tag,
      next: expandNextForState(child.tag, transitions, variants),
      hasEffect: typeof child.effectRaw === "string" && child.effectRaw.length > 0,
      lifecycle: {
        onTransition: Array.isArray(child.onTransitionElements) && child.onTransitionElements.length > 0,
        onTimeout: Array.isArray(child.onTimeoutElements) && child.onTimeoutElements.length > 0,
        internalRule: !!child.internalRule && child.internalRule.kind !== "absent",
        history: child.historyAttr === true,
      },
    }))
    .sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));

  return {
    varName: meta.varName,
    forType: meta.forType,
    initialState,
    derived,
    variants,
    transitions,
    states,
    hasOpenerEffect: typeof meta.openerEffect === "string" && meta.openerEffect.length > 0,
  };
}

/**
 * Build the in-memory engine graph for ONE file AST. Reuses the canonical
 * codegen collectors so discovery matches emission exactly. Non-derived
 * (C12-scope) engines are emitted first in source order, then derived
 * (C14-scope) engines, each in source order — a stable, deterministic order.
 */
export function buildEngineGraphForFile(fileAST: unknown): EngineGraph {
  const engines: EngineGraphEngine[] = [];
  const c12 = collectC12EngineDecls(fileAST as never) as unknown as EngineDeclShape[];
  for (const decl of c12) {
    const projected = projectEngine(decl, false);
    if (projected) engines.push(projected);
  }
  const c14 = collectC14DerivedEngineDecls(fileAST as never) as unknown as EngineDeclShape[];
  for (const decl of c14) {
    const projected = projectEngine(decl, true);
    if (projected) engines.push(projected);
  }
  return { engines };
}

/**
 * Build the merged engine graph across a set of file ASTs (the per-file
 * `metaFiles` the orchestrator feeds to codegen). Engines from each file are
 * concatenated in file order, then engine order within each file (the stable
 * order from `buildEngineGraphForFile`).
 *
 * `files` accepts the orchestrator's post-TS file objects. Each may carry the
 * AST directly (`{ nodes, machineDecls }`) or wrapped (`{ ast: {...} }`); the
 * collectors normalize both shapes.
 */
export function buildEngineGraph(files: unknown): EngineGraph {
  const engines: EngineGraphEngine[] = [];
  const list = Array.isArray(files) ? files : files != null ? [files] : [];
  for (const file of list) {
    const perFile = buildEngineGraphForFile(file);
    for (const engine of perFile.engines) {
      engines.push(engine);
    }
  }
  return { engines };
}

/**
 * Serialize an `EngineGraph` to a deterministic, pretty-printed JSON string
 * (2-space indent, trailing newline). The graph is already built with stable
 * ordering; `JSON.stringify` with the fixed key-insertion order of the
 * projection objects produces byte-stable output across compiles.
 *
 * A file with no engines serializes to `{\n  "engines": []\n}\n`.
 */
export function serializeEngineGraph(graph: EngineGraph): string {
  return JSON.stringify(graph, null, 2) + "\n";
}

/**
 * Convenience: build + serialize in one call from the orchestrator's file set.
 * This is the function api.js wires onto the result object (lazy, mirroring
 * `reachabilityRecordJson` / `batchPlanJson`).
 */
export function buildEngineGraphJson(files: unknown): string {
  return serializeEngineGraph(buildEngineGraph(files));
}
