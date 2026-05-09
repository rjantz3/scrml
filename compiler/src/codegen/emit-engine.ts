/* SPDX-License-Identifier: MIT
 * Phase A1c Step C12 — Engine state-machine runtime substrate emission.
 *
 * Per SPEC §51.0.A through §51.0.G. Wave 4 foundational step — C13 layers
 * `.advance()` + `<onTransition>` on top; C14 layers `derived=expr`; C15
 * layers cross-file engine import + same-file singleton mount.
 *
 * **Distinct from `emit-machines.ts`:** the legacy file emits substrate for
 * the legacy `<machine>`-keyword + `transitions {}` block + arrow-rule
 * (`.From => .To`) form, driven by the type-system's `machineRegistry`. This
 * file emits substrate for the new `<engine>` keyword + state-children with
 * `rule=` attribute form, driven by B14/B15 PASS 10.A/PASS 11
 * `_record.engineMeta.stateChildren[]` annotations. Both surfaces are
 * preserved during the v0.next P1 deprecation window (§51.0.L).
 *
 * **What this file emits, per engine-decl with `engineMeta.stateChildren`:**
 *
 *   1. ONE auto-declared reactive variant cell (`@<varName>: Type`) with
 *      initial value resolved per §51.0.E (literal `initial=.X`, OR
 *      default-to-first-state-child fallback per W-ENGINE-INITIAL-MISSING
 *      lint behavior — A1b/B14 fires the warning; C12 does the codegen-time
 *      fallback because B14 leaves `initialVariant: null` when absent).
 *
 *   2. ONE static transition table const (`__scrml_engine_<varName>_transitions`)
 *      keyed by from-variant name. Each entry is one of:
 *        - `["X"]`           — single-target rule
 *        - `["A","B","C"]`   — multi-target rule
 *        - `"*"`             — wildcard rule (escape hatch; loses static guarantees)
 *        - `[]`              — terminal state (no `rule=` attribute)
 *      The wildcard `"*"` is a sentinel — runtime check is `entry === "*"`.
 *
 * **What this file does NOT emit (deferred):**
 *
 *   - Direct-write rule= validation (`E-ENGINE-INVALID-TRANSITION` runtime
 *     throw on illegal `@marioState = .Big` writes). Per C12 SURVEY: defer
 *     to C13 alongside `.advance()`. The transition table emitted here is
 *     all C13 needs to layer the validation hook on top.
 *   - `.advance(.Variant)` method emission. **C13 owns this.**
 *   - `<onTransition>` hook firing. **C13 owns this.**
 *   - `derived=expr` engines. **C14 owns this (B16 dependency).**
 *   - Cross-file engine import + `<EngineName/>` mount. **C15 owns this.**
 *   - Body-rendering (state-child markup expansion based on current variant).
 *     State-child bodies are RAW TEXT today (per
 *     `engine-statechild-parser.ts` line 14-21 — "no walkable children").
 *     C12 emits a placeholder marker comment at the engine's source position
 *     so a follow-on body-render emitter can locate it.
 *
 * **Naming convention** (per BRIEF Authorized Decisions):
 *   - `__scrml_engine_<varName>_transitions` — transition table const
 *   - The variant cell uses the standard reactive cell substrate
 *     (`_scrml_state` + `_scrml_reactive_get/set`) — NO new cell kind.
 */

// ---------------------------------------------------------------------------
// Types — canonical engine-decl + engineMeta shapes consumed
// ---------------------------------------------------------------------------

/**
 * The B15 EngineRuleForm shape (mirrored locally to avoid the symbol-table
 * ts dependency in this codegen module — keeps the import surface lean).
 * The shapes match `compiler/src/symbol-table.ts` `EngineRuleForm` exactly.
 */
type EngineRuleForm =
  | { kind: "absent" }
  | { kind: "single"; target: string; historyForm?: boolean }
  | { kind: "multi"; targets: string[]; historyForms?: boolean[] }
  | { kind: "wildcard" }
  | { kind: "legacy-arrow"; raw: string }
  | { kind: "parse-error"; raw: string; reason: string };

/**
 * The B15 EngineStateChildEntry shape (mirrored locally for the same reason
 * as EngineRuleForm above). Fields beyond `tag` and `rule` are ignored by
 * C12 — historyAttr/internalRule/onTimeoutElements/innerEngines all flow to
 * later Wave-4 sub-steps.
 */
interface EngineStateChildEntry {
  tag: string;
  rule: EngineRuleForm;
  bodyRaw?: string;
  isColonShorthand?: boolean;
  rawOffset?: number;
  historyAttr?: boolean;
  internalRule?: EngineRuleForm;
  onTimeoutElements?: unknown[];
  innerEngines?: unknown[];
}

interface EngineMetadata {
  forType: string;
  variants: string[];
  initialVariant: string | null;
  derivedExpr: unknown | null;
  varName: string;
  isExported: boolean;
  isPinned: boolean;
  stateChildren?: EngineStateChildEntry[];
  // ... Wave-4 follow-on fields ignored here.
}

interface EngineDeclLike {
  kind: "engine-decl";
  governedType?: string;
  engineName?: string;
  varName?: string;
  initialVariant?: string | null;
  rulesRaw?: string;
  sourceVar?: string | null;
  _record?: { engineMeta?: EngineMetadata };
  _cellKind?: string;
}

// ---------------------------------------------------------------------------
// Engine-decl discovery — from the file AST
// ---------------------------------------------------------------------------

/**
 * Determine whether a given engine-decl AST node is in C12's emission scope.
 *
 * In scope:
 *   - `_record.engineMeta` exists (PASS 10.A registered the engine cell).
 *   - `engineMeta.stateChildren` is a non-empty array (PASS 11/B15 parsed
 *     the new `<engine>` state-child form, NOT the legacy arrow-rule body).
 *   - `engineMeta.derivedExpr` is null (NON-derived engines only — derived
 *     engines are C14 territory).
 *
 * Out of scope (returns false):
 *   - Legacy `<machine>` keyword bodies (rulesRaw is arrow-rule form;
 *     B15 leaves stateChildren empty — emit-machines.ts handles those).
 *   - Derived engines (`derivedExpr !== null`).
 *   - Engine-decls without B14 registration (parse-failure case; SYM
 *     diagnostic already fired).
 */
export function isC12EngineDecl(node: EngineDeclLike): boolean {
  if (!node || node.kind !== "engine-decl") return false;
  const meta = node._record?.engineMeta;
  if (!meta) return false;
  if (meta.derivedExpr != null) return false;
  if (!Array.isArray(meta.stateChildren) || meta.stateChildren.length === 0) {
    return false;
  }
  return true;
}

/**
 * Walk a file AST and collect all engine-decl nodes that are in C12's
 * emission scope. Walks markup containers (engines live as markup children
 * per `ast-builder.js:9311-9325`); skips logic blocks (engines are
 * file-scope only per §51.0.K Machine Cohesion in v0.next P1).
 *
 * Prefers `fileAST.machineDecls` (pre-collected by ast-builder's
 * `collectHoisted`) when available; falls back to a manual walk for safety.
 */
export function collectC12EngineDecls(fileAST: any): EngineDeclLike[] {
  const out: EngineDeclLike[] = [];
  if (!fileAST) return out;

  // Prefer the pre-collected list — ast-builder.js builds it during the
  // hoist pass and stamps it onto `fileAST.machineDecls`.
  const preCollected = (fileAST.machineDecls as EngineDeclLike[] | undefined)
    ?? (fileAST.ast?.machineDecls as EngineDeclLike[] | undefined);
  if (Array.isArray(preCollected) && preCollected.length > 0) {
    for (const node of preCollected) {
      if (isC12EngineDecl(node)) out.push(node);
    }
    return out;
  }

  // Fallback: manual walk over markup children. Mirrors B16's
  // `collectAllEngineDecls` shape in `compiler/src/dependency-graph.ts`.
  const nodes: any[] = (fileAST.nodes as any[] | undefined)
    ?? (fileAST.ast?.nodes as any[] | undefined)
    ?? [];
  function visit(list: any[]): void {
    for (const node of list) {
      if (!node || typeof node !== "object") continue;
      if (node.kind === "engine-decl" && isC12EngineDecl(node)) {
        out.push(node);
      }
      if (Array.isArray(node.children)) visit(node.children);
    }
  }
  visit(nodes);
  return out;
}

// ---------------------------------------------------------------------------
// Naming convention — exported so C13/C14/C15 can use the same names
// ---------------------------------------------------------------------------

/**
 * Compute the transition-table const name for an engine.
 *
 * Format: `__scrml_engine_<varName>_transitions`
 *
 * Used at:
 *   - This file's `emitEngineTransitionTable` (definition site).
 *   - C13's direct-write hook + `.advance()` emission (table-lookup site).
 *
 * Two underscores prefix matches the convention `__scrml_transitions_<MachineName>`
 * used by `emit-machines.ts` for the legacy machine table; with the `engine_`
 * infix the two namespaces never collide even if a project mixes
 * `<engine for=Foo>` (var: `foo`) with `<machine name=Foo for=Foo>`.
 */
export function engineTransitionTableName(varName: string): string {
  return `__scrml_engine_${varName}_transitions`;
}

// ---------------------------------------------------------------------------
// Initial-variant resolution — §51.0.E + W-ENGINE-INITIAL-MISSING fallback
// ---------------------------------------------------------------------------

/**
 * Resolve the initial variant for a non-derived engine.
 *
 * Per SPEC §51.0.E:
 *   - If `initial=.Variant` was specified, use that variant.
 *   - If absent: the lint `W-ENGINE-INITIAL-MISSING` is fired (by B15) and
 *     the compiler defaults to the FIRST state-child's variant.
 *
 * B14 stores the literal `initial=` value as `engineMeta.initialVariant`
 * (`null` when absent). C12 implements the fallback at codegen time so the
 * emitted variant cell always has a concrete starting variant.
 *
 * Returns the variant name, or `null` if no fallback is possible (no
 * stateChildren OR no initialVariant — defensive case the caller skips).
 */
export function resolveEngineInitialVariant(meta: EngineMetadata): string | null {
  if (typeof meta.initialVariant === "string" && meta.initialVariant.length > 0) {
    return meta.initialVariant;
  }
  // W-ENGINE-INITIAL-MISSING fallback — first state-child's variant tag.
  // B15 fires the lint; C12 honors the resolution.
  const sc = meta.stateChildren;
  if (
    Array.isArray(sc) && sc.length > 0 &&
    typeof sc[0]?.tag === "string" && sc[0]!.tag.length > 0
  ) {
    return sc[0]!.tag;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Transition table emission — §51.0.F three rule= forms
// ---------------------------------------------------------------------------

/**
 * Encode an EngineRuleForm into the table-entry value shape.
 *
 * | rule= form        | EngineRuleForm                  | Encoded entry              |
 * |-------------------|---------------------------------|----------------------------|
 * | (absent)          | `{kind:"absent"}`               | `[]`  (terminal — no transitions) |
 * | `rule=.X`         | `{kind:"single",target:"X"}`    | `["X"]`                    |
 * | `rule=(.A | .B)`  | `{kind:"multi",targets:[...]}`  | `["A","B"]`                |
 * | `rule=*`          | `{kind:"wildcard"}`             | `"*"`                       |
 *
 * Legacy-arrow / parse-error rule forms are encoded as `[]` (terminal) here
 * because B15 already fired diagnostics for them; the emitted table is
 * defensively empty so runtime cannot dispatch through a malformed entry.
 *
 * The `.history` target form (§51.0.N) is currently flattened — the variant
 * name is recorded without the history modifier. History semantics are
 * out of A1c Wave 4 scope per the BRIEF (S67 §51.0.N is a follow-on).
 */
function encodeRuleEntry(rule: EngineRuleForm): string {
  switch (rule.kind) {
    case "single":
      return JSON.stringify([rule.target]);
    case "multi":
      return JSON.stringify(rule.targets);
    case "wildcard":
      return JSON.stringify("*");
    case "absent":
    case "legacy-arrow":
    case "parse-error":
    default:
      return JSON.stringify([]);
  }
}

/**
 * Emit the static transition-table const for one engine.
 *
 * Shape:
 *   const __scrml_engine_marioState_transitions = Object.freeze({
 *     "Small": ["Big"],
 *     "Big":   ["Fire","Cape","Small"],
 *     "Fire":  ["Small"],
 *     "Cape":  ["Small"],
 *   });
 *
 * `Object.freeze` is defensive — the table is read-only metadata; freezing
 * documents the "compile-time-baked" intent and turns accidental mutation
 * into a TypeError under strict mode.
 *
 * @param meta — the engine's `engineMeta` (from `_record.engineMeta`)
 * @returns lines of JS code; empty array if `stateChildren` is empty
 */
export function emitEngineTransitionTable(meta: EngineMetadata): string[] {
  const sc = meta.stateChildren;
  if (!Array.isArray(sc) || sc.length === 0) return [];

  const tableName = engineTransitionTableName(meta.varName);
  const lines: string[] = [];

  lines.push(`// §51.0.F transition table for engine ${meta.varName}: ${meta.forType}`);
  lines.push(`const ${tableName} = Object.freeze({`);

  const entries: string[] = [];
  for (const child of sc) {
    if (!child || typeof child.tag !== "string" || child.tag.length === 0) {
      continue;
    }
    const key = JSON.stringify(child.tag);
    const value = encodeRuleEntry(child.rule);
    entries.push(`  ${key}: ${value}`);
  }
  lines.push(entries.join(",\n"));
  lines.push(`});`);

  return lines;
}

// ---------------------------------------------------------------------------
// Variant cell init emission — §51.0.C auto-declared variable
// ---------------------------------------------------------------------------

/**
 * Build the JS expression for the initial variant value.
 *
 * Variants in the runtime are encoded by `emitEnumVariantObjects` (§14.4)
 * as either:
 *   - Unit variant:    `Status.Loading` evaluates to `"Loading"` (bare string).
 *   - Payload variant: `Status.Failed("err")` evaluates to `{variant:"Failed",data:{...}}`.
 *
 * `initial=.Variant` is a UNIT-VARIANT reference (no payload — `initial=`
 * doesn't accept payload-constructor calls per §51.0.E grammar). The runtime
 * shape for a unit variant is the bare string. We emit the bare string
 * directly to avoid depending on the enum object's runtime initialization
 * order (the enum object const + the engine cell init may emit close
 * together; preferring the bare string is order-independent).
 *
 * Note: this matches the parity contract documented at
 * `emit-machines.ts:548-557` for variant extraction — both bare strings and
 * `.variant`-bearing objects flow through the same `__prevVariant` /
 * `__nextVariant` extraction path.
 */
function emitInitialVariantValue(initialVariant: string): string {
  return JSON.stringify(initialVariant);
}

/**
 * Emit the variant cell init for one engine.
 *
 * Shape:
 *   // §51.0.C auto-declared engine variable: marioState (MarioState)
 *   _scrml_reactive_set("marioState", "Small");
 *
 * The cell is registered at the standard reactive-cell substrate
 * (`_scrml_state` + `_scrml_subscribers`). No new helper is needed; the
 * engine variable is structurally identical to a `@var = init` reactive
 * cell, with the engine's transition-table layered ON TOP of the cell at
 * write time (C13's hook).
 *
 * **Encoding-context note:** unlike user-authored state-decls, engine
 * variables do NOT pass through `encodingCtx.encode()`. The variable name
 * is canonical (per §51.0.C) and the stable encoded name is just the
 * variable name itself. This matches the legacy machine variable wiring
 * (per `emit-machines.ts:572` — uses the bare variable name in error
 * messages and `_scrml_reactive_set` keys).
 *
 * @param meta — the engine's `engineMeta`
 * @returns lines of JS code; empty array if `initialVariant` cannot resolve
 */
export function emitEngineVariantCellInit(meta: EngineMetadata): string[] {
  const lines: string[] = [];
  const initial = resolveEngineInitialVariant(meta);
  if (!initial) {
    // No way to resolve initial — defensive skip. B15 should have fired
    // E-ENGINE-INITIAL-INVALID-VARIANT or W-ENGINE-INITIAL-MISSING earlier.
    return lines;
  }

  lines.push(`// §51.0.C auto-declared engine variable: ${meta.varName} (${meta.forType})`);
  lines.push(`_scrml_reactive_set(${JSON.stringify(meta.varName)}, ${emitInitialVariantValue(initial)});`);
  return lines;
}

// ---------------------------------------------------------------------------
// Top-level emission — orchestrates all engines in a file
// ---------------------------------------------------------------------------

/**
 * Emit the C12 substrate for every in-scope engine in the file.
 *
 * Order per engine: transition table FIRST (table is read-only data;
 * declaring it before the cell init lets future write-hook code reference
 * the table at module-init time), then the variant cell init.
 *
 * Per-file ordering: engines are emitted in source order (the order the
 * walker discovered them, mirrors `fileAST.machineDecls` order).
 *
 * Returns an empty array when there are no in-scope engines (lets the
 * caller skip a section header without checking length).
 */
export function emitEngineSubstrate(fileAST: any): string[] {
  const decls = collectC12EngineDecls(fileAST);
  if (decls.length === 0) return [];

  const lines: string[] = [];
  for (const decl of decls) {
    const meta = decl._record!.engineMeta!;
    const tableLines = emitEngineTransitionTable(meta);
    const cellLines = emitEngineVariantCellInit(meta);
    if (tableLines.length === 0 && cellLines.length === 0) continue;
    if (lines.length > 0) lines.push("");
    for (const l of tableLines) lines.push(l);
    for (const l of cellLines) lines.push(l);
    // §51.0.D mount-position marker. The engine renders at its declaration
    // position. C12 deliberately does NOT emit body markup — state-child
    // bodies are RAW TEXT today (per engine-statechild-parser.ts) and a
    // body-render emitter is a follow-on (C13 or later). The marker
    // documents WHERE the engine renders so the follow-on emitter can
    // locate the slot.
    lines.push(`// §51.0.D engine mount position: ${meta.varName} (${meta.forType}) — body rendering deferred to follow-on`);
  }

  return lines;
}

// ---------------------------------------------------------------------------
// C13 — engine-bindings map (write-hook seam) + write-guard emitter
// ---------------------------------------------------------------------------

/**
 * Per-engine binding info consumed by `_emitReactiveSet` to dispatch a
 * `<engine>`-form write to the C13 runtime hook (`_scrml_engine_direct_set`).
 *
 * Sibling to legacy `<machine>` bindings (built by
 * `emit-reactive-wiring.ts:buildMachineBindingsMap`). Per C13 SURVEY q1, the
 * two surfaces are FORKED — the legacy `TransitionRule[]` shape is too
 * entangled with machine-only features (guards, effects, labels, audit,
 * temporal, payload bindings) for a clean merge with the new C12 table
 * format (`["X"]` / `"*"` / `[]` per from-variant).
 */
export interface EngineBindingInfo {
  /** Engine variable name (e.g., `"marioState"`). */
  varName: string;
  /** Governed enum type name (e.g., `"MarioState"`). */
  forType: string;
  /** Compile-time-baked transition-table identifier (per §51.0.F + C12). */
  tableName: string;
}

/**
 * Walk the file AST and collect a map from engine-variable name → binding info.
 * Returns null when no in-scope C12 engines exist (caller skips the wiring
 * cost).
 *
 * Mirrors C12's discovery walker (`collectC12EngineDecls`) for consistency.
 * The map is consumed by `_emitReactiveSet` in `emit-logic.ts` to dispatch a
 * direct-write `@engineVar = .X` to the C13 runtime hook instead of the bare
 * `_scrml_reactive_set`.
 */
export function buildEngineBindingsMap(fileAST: unknown): Map<string, EngineBindingInfo> | null {
  const decls = collectC12EngineDecls(fileAST);
  if (decls.length === 0) return null;
  const out = new Map<string, EngineBindingInfo>();
  for (const decl of decls) {
    const meta = decl._record?.engineMeta;
    if (!meta || typeof meta.varName !== "string" || meta.varName.length === 0) continue;
    out.set(meta.varName, {
      varName: meta.varName,
      forType: meta.forType,
      tableName: engineTransitionTableName(meta.varName),
    });
  }
  return out.size > 0 ? out : null;
}

/**
 * Emit the runtime helper-call for a direct write to an engine variable.
 *
 * Per §51.0.F (Move 12) — `@engineVar = .X` is intercepted; the C13 runtime
 * hook (`_scrml_engine_direct_set`) reads the current variant, looks up the
 * from-state's `rule=` entry in the compile-time-baked table, and either
 * commits the write or throws `E-ENGINE-INVALID-TRANSITION`.
 *
 * Shape:
 *   _scrml_engine_direct_set("marioState", <newValueExpr>, __scrml_engine_marioState_transitions);
 *
 * The table-name is emitted as a BARE IDENTIFIER (not a string) so the
 * runtime does NOT have to look it up — the const is in scope at the use
 * site (table emission precedes any code that writes the engine variable;
 * see `emit-client.ts` orchestration).
 */
export function emitEngineWriteGuard(binding: EngineBindingInfo, newValueExpr: string): string[] {
  return [
    `// §51.0.F engine direct-write hook: ${binding.varName} (${binding.forType})`,
    `_scrml_engine_direct_set(${JSON.stringify(binding.varName)}, ${newValueExpr}, ${binding.tableName});`,
  ];
}

// ---------------------------------------------------------------------------
// C13 — `.advance()` codegen helpers (consumed by emit-expr.ts)
// ---------------------------------------------------------------------------

/**
 * Compute the set of engine variable names in the file's scope. Used by
 * `emit-expr.ts:emitCall` to detect `.advance` calls on engine variables.
 *
 * Returns an empty Set when there are no in-scope engines (caller's
 * detection arm short-circuits).
 */
export function collectEngineVarNames(fileAST: unknown): Set<string> {
  const out = new Set<string>();
  for (const decl of collectC12EngineDecls(fileAST)) {
    const meta = decl._record?.engineMeta;
    if (meta && typeof meta.varName === "string" && meta.varName.length > 0) {
      out.add(meta.varName);
    }
  }
  return out;
}

/**
 * Emit the `.advance(.X)` runtime helper call for a known engine variable.
 *
 * Per §51.0.G (Move 13) — `@engineVar.advance(.X)` is intercepted; the C13
 * runtime hook (`_scrml_engine_advance`) reads the current variant, looks
 * up the from-state's `rule=` entry, and either commits the transition or
 * throws E-ENGINE-INVALID-TRANSITION with the "asserted advance failed"
 * framing per §51.0.G's loud-failure semantics.
 *
 * Shape:
 *   _scrml_engine_advance("marioState", <targetExpr>, __scrml_engine_marioState_transitions)
 *
 * Returns a single expression string (no trailing semicolon — `.advance()`
 * is a CallExpr; its emission is composed by `emitCall` and the surrounding
 * statement wrapper adds the semicolon).
 */
export function emitEngineAdvanceCall(varName: string, targetExpr: string): string {
  const tableName = engineTransitionTableName(varName);
  return `_scrml_engine_advance(${JSON.stringify(varName)}, ${targetExpr}, ${tableName})`;
}
