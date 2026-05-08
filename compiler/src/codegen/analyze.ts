/**
 * CG Analysis Layer — Phase 2
 *
 * The analysis layer walks AST + routeMap + depGraph + protectAnalysis
 * and produces a FileAnalysis. This separates "what data does CG need"
 * from "how does CG emit code."
 *
 * Phase 2 note: analyze.js currently wraps the existing collection functions
 * rather than replacing them. This establishes the analysis contract and
 * consolidates the multi-pass AST walking that currently happens scattered
 * across index.js and the emitters. In a future phase, emitters will receive
 * FileAnalysis slices directly instead of re-walking the raw AST.
 *
 * HIGH RISK: Any change to the traversal logic here must produce identical
 * results to the existing collection functions in collect.js. The analysis
 * layer is a contract surface — not an optimization pass.
 */

import {
  getNodes,
  collectFunctions,
  collectMarkupNodes,
  collectTopLevelLogicStatements,
  collectCssVariableBridges,
  collectProtectedFields,
  collectCssBlocks,
} from "./collect.ts";
import { collectChannelNodes } from "./emit-channel.ts";
import { createFileIR, type FileIR, type TestGroup } from "./ir.ts";
import {
  analyzeUsage,
  emptyUsage,
  mergeUsage,
  type FeatureUsage,
} from "./usage-analyzer.ts";

/** A loosely-typed AST node from the pipeline. */
type ASTNode = Record<string, unknown>;

/** A protect analysis result from the PA stage. */
interface ProtectAnalysis {
  views?: Map<string, object>;
  [key: string]: unknown;
}

/** A file AST as produced by the compiler pipeline. */
interface FileAST {
  filePath: string;
  nodes?: ASTNode[];
  ast?: { nodes: ASTNode[] };
  [key: string]: unknown;
}

/** The complete analysis of a single .scrml file. */
export interface FileAnalysis {
  filePath: string;
  nodes: ASTNode[];
  fnNodes: ASTNode[];
  markupNodes: ASTNode[];
  topLevelLogic: ASTNode[];
  cssBridges: object[];
  cssBlocks: { inlineBlocks: object[]; styleBlocks: object[] };
  channelNodes: object[];
  ir: FileIR;
  testGroups: TestGroup[];
  /**
   * Phase A1c Step C0 — per-file feature-usage bitmap.
   *
   * Records which v0.next features this single file's AST uses. The cross-
   * file merged bitmap (consumed by downstream emitters) lives at
   * `analyzeAll`'s return as `featureUsage`. Per-file is preserved here for
   * debug introspection ("why does my app have engines? → check file X's
   * bitmap") and forward-compat with future per-module elision / cache reuse.
   */
  usage: FeatureUsage;
}

/**
 * Analyze a single file AST and produce a FileAnalysis.
 *
 * This consolidates all AST collection into a single analysis pass per file.
 * The resulting FileAnalysis contains pre-collected data that emitters can
 * consume directly, avoiding redundant AST traversals.
 */
export function analyzeFile(fileAST: FileAST): FileAnalysis {
  const filePath = fileAST.filePath;
  const nodes = getNodes(fileAST as Record<string, unknown>);

  // Collect test groups from ~{} nodes
  const testGroups: TestGroup[] = [];
  for (const node of nodes as Record<string, unknown>[]) {
    if (node.kind === "test" && node.testGroup) {
      testGroups.push(node.testGroup as TestGroup);
    }
  }

  return {
    filePath,
    nodes: nodes as ASTNode[],
    fnNodes: collectFunctions(fileAST as Record<string, unknown>) as ASTNode[],
    markupNodes: collectMarkupNodes(nodes) as ASTNode[],
    topLevelLogic: collectTopLevelLogicStatements(fileAST as Record<string, unknown>) as ASTNode[],
    cssBridges: collectCssVariableBridges(nodes) as object[],
    cssBlocks: collectCssBlocks(nodes) as { inlineBlocks: object[]; styleBlocks: object[] },
    channelNodes: collectChannelNodes(nodes) as object[],
    ir: createFileIR(filePath),
    testGroups,
    // Phase A1c Step C0 — per-file feature-usage bitmap. See usage-analyzer.ts.
    usage: analyzeUsage(fileAST as Record<string, unknown>),
  };
}

/**
 * Analyze all files in the CG input.
 *
 * This is the top-level analysis entry point called by `runCG()`. It runs
 * `analyzeFile()` on each file and collects cross-file data (protectedFields)
 * from the protect analysis pass.
 */
export function analyzeAll(input: {
  files: FileAST[];
  routeMap: object;
  depGraph: object;
  protectAnalysis: ProtectAnalysis | undefined;
}): {
  fileAnalyses: Map<string, FileAnalysis>;
  protectedFields: Set<string>;
  /**
   * Phase A1c Step C0 — cross-file (per-app) feature-usage bitmap.
   *
   * OR-merge of every file's per-file `usage` bitmap. Every transitively-
   * imported module's feature use propagates to this aggregate via the
   * `analyzeAll.input.files` array (post-CHX-inlined + MOD-resolved).
   *
   * Consumed by downstream A1c runtime-emission steps (C5 reset / C6
   * validators / C8 validity-surface / C12 engines / C14 derived-engines /
   * C16 refinement-types / C18 channels / etc.) to elide unused runtime
   * helpers per SCOPE §11 ratified compile-time elision strategy.
   *
   * Soundness guarantee: every flag set `true` reflects structural feature
   * use somewhere in the app. Conservative inclusion — false-positives
   * bloat output, false-negatives crash apps; we err on inclusion.
   */
  featureUsage: FeatureUsage;
} {
  const { files, protectAnalysis } = input;

  const protectedFields = collectProtectedFields(protectAnalysis as Record<string, unknown>);
  const fileAnalyses = new Map<string, FileAnalysis>();
  let featureUsage: FeatureUsage = emptyUsage();

  if (!files) return { fileAnalyses, protectedFields, featureUsage };

  for (const fileAST of files) {
    const analysis = analyzeFile(fileAST);
    fileAnalyses.set(fileAST.filePath, analysis);
    // Phase A1c Step C0 — fold per-file bitmap into per-app aggregate.
    featureUsage = mergeUsage(featureUsage, analysis.usage);
  }

  return { fileAnalyses, protectedFields, featureUsage };
}
