// scrml validator — runs the compiler against the LLM output, then loads the
// emitted client.js + scrml-runtime into happy-dom and runs the spec's DnD
// assertion sequence.
//
// The validator is per-spec because the runtime assertions depend on the
// spec's expected initial state + interaction sequence. Currently only
// 01-triage-board is implemented; other specs add a new branch in the
// runtime-assertion dispatch.

import { resolve } from "path";
import { writeFile, readFile, stat as fsStat } from "fs/promises";
import { spawnSync } from "child_process";
import type { FailureMode, ValidationOutcome } from "../types.ts";

export async function validateScrml(
  code: string,
  specId: string,
  trialDir: string,
  repoRoot: string,
): Promise<ValidationOutcome> {
  const codeDir = resolve(trialDir, "code");
  await ensureDir(codeDir);
  const scrmlPath = resolve(codeDir, `${specId}.scrml`);
  await writeFile(scrmlPath, code);

  const sourceLOC = countSubstantiveLines(code, /^\s*(\/\/|$)/);

  // Phase 1 — compile
  const compileResult = spawnSync(
    "bun",
    ["run", "compiler/src/cli.js", "compile", scrmlPath],
    { cwd: repoRoot, encoding: "utf8", timeout: 60_000 },
  );

  if (compileResult.status !== 0) {
    return {
      compileOk: false,
      compileErrors: [compileResult.stdout, compileResult.stderr].filter(Boolean).join("\n"),
      runtimeOk: false,
      runtimeErrors: [],
      failureMode: "F1-compile-fail",
      bundleSizeBytes: null,
      sourceLOC,
    };
  }

  // Phase 2 — load into happy-dom + run spec assertions
  // The compiler writes to <codeDir>/dist/ when given an absolute path. Find
  // the html + client.js + runtime.
  const distDir = resolve(codeDir, "dist");
  const htmlPath = resolve(distDir, `${specId}.html`);
  const clientJsPath = resolve(distDir, `${specId}.client.js`);

  let html: string;
  let clientJs: string;
  let runtimeJs: string;
  try {
    html = await readFile(htmlPath, "utf8");
    clientJs = await readFile(clientJsPath, "utf8");
    // Find the runtime file referenced in the HTML.
    const runtimeMatch = html.match(/scrml-runtime\.[a-z0-9]+\.js/);
    if (!runtimeMatch) throw new Error("HTML does not reference scrml-runtime.*.js");
    runtimeJs = await readFile(resolve(distDir, runtimeMatch[0]), "utf8");
  } catch (err) {
    return {
      compileOk: true,
      compileErrors: [],
      runtimeOk: false,
      runtimeErrors: [`Compile output missing: ${(err as Error).message}`],
      failureMode: "F2-runtime-error-on-mount",
      bundleSizeBytes: null,
      sourceLOC,
    };
  }

  const bundleSizeBytes = clientJs.length + runtimeJs.length;

  // Phase 3 — happy-dom mount + assertion sequence
  const runtimeOutcome = await runSpecAssertions(specId, html, runtimeJs, clientJs);

  return {
    compileOk: true,
    compileErrors: [],
    runtimeOk: runtimeOutcome.ok,
    runtimeErrors: runtimeOutcome.errors,
    failureMode: runtimeOutcome.ok ? null : runtimeOutcome.failureMode,
    bundleSizeBytes,
    sourceLOC,
  };
}

interface RuntimeOutcome {
  ok: boolean;
  errors: string[];
  failureMode: FailureMode;
}

async function runSpecAssertions(
  specId: string,
  html: string,
  runtimeJs: string,
  clientJs: string,
): Promise<RuntimeOutcome> {
  if (specId !== "01-triage-board") {
    return { ok: false, errors: [`No runtime assertions implemented for spec ${specId}`], failureMode: "F-other" };
  }

  // happy-dom isn't in compiler/tests' standard test runner here — we need to
  // load it dynamically.
  let Window: typeof import("happy-dom").Window;
  try {
    const mod = await import("happy-dom");
    Window = mod.Window;
  } catch {
    return {
      ok: false,
      errors: ["happy-dom not available — install at repo root: bun add -D happy-dom"],
      failureMode: "F-other",
    };
  }

  const window = new Window({ url: "http://localhost/" });
  const document = window.document;

  // Strip the <script src=...> tags so they don't try to fetch; we inject runtime + client manually.
  const cleanedHtml = html
    .replace(/<script src="[^"]*scrml-runtime[^"]*"><\/script>/g, "")
    .replace(/<script src="[^"]*\.client\.js"><\/script>/g, "");

  document.write(cleanedHtml);

  try {
    // Inject runtime in classic-script realm
    const runtimeScript = document.createElement("script");
    runtimeScript.textContent = runtimeJs;
    document.body.appendChild(runtimeScript);

    // Inject client
    const clientScript = document.createElement("script");
    clientScript.textContent = clientJs;
    document.body.appendChild(clientScript);
  } catch (err) {
    return {
      ok: false,
      errors: [`Mount error: ${(err as Error).message}`],
      failureMode: "F2-runtime-error-on-mount",
    };
  }

  // Triage-board assertions
  return assertTriageBoard(document as unknown as Document, window as unknown as Window);
}

function assertTriageBoard(document: Document, _window: Window): RuntimeOutcome {
  const errors: string[] = [];

  // Find tasks + columns. We don't dictate class names; we use text content.
  const expectedTaskTitles = [
    "Triage incoming bug reports",
    "Review PR #42",
    "Wire up onboarding flow",
    "Update changelog",
  ];

  const allText = document.body.textContent ?? "";
  for (const title of expectedTaskTitles) {
    if (!allText.includes(title)) {
      errors.push(`Expected task title "${title}" not found in DOM`);
    }
  }
  if (errors.length) {
    return { ok: false, errors, failureMode: "F3-initial-state-wrong" };
  }

  // Locate column containers by their text heading. The container's structure
  // varies per implementation; we use a heuristic — find the closest ancestor
  // of the heading-text node that contains all expected tasks for that column.
  const inboxContainer = findColumnContainer(document, "Inbox", [
    "Triage incoming bug reports",
    "Review PR #42",
  ]);
  const doingContainer = findColumnContainer(document, "Doing", ["Wire up onboarding flow"]);
  const doneContainer = findColumnContainer(document, "Done", ["Update changelog"]);

  if (!inboxContainer || !doingContainer || !doneContainer) {
    return {
      ok: false,
      errors: ["Could not identify three distinct column containers via heuristic"],
      failureMode: "F3-initial-state-wrong",
    };
  }

  // DnD simulation: move "Review PR #42" from Inbox to Doing.
  const reviewTask = findTaskElement(document, "Review PR #42");
  if (!reviewTask) return { ok: false, errors: ["Could not locate Review PR #42 task element"], failureMode: "F-other" };

  try {
    simulateDnD(reviewTask, doingContainer);
  } catch (err) {
    return { ok: false, errors: [`DnD simulation threw: ${(err as Error).message}`], failureMode: "F-other" };
  }

  // Verify state after first move.
  const newReviewParent = findTaskElement(document, "Review PR #42");
  if (!newReviewParent) {
    return { ok: false, errors: ["Review PR #42 disappeared after drop"], failureMode: "F-other" };
  }
  if (!doingContainer.contains(newReviewParent)) {
    return {
      ok: false,
      errors: ["Review PR #42 not in Doing column after drop"],
      failureMode: "F5-drop-target-wrong",
    };
  }

  // Second move: drag Update changelog from Done to Inbox.
  const changelogTask = findTaskElement(document, "Update changelog");
  if (!changelogTask) return { ok: false, errors: ["Update changelog task lost between moves"], failureMode: "F-other" };

  try {
    simulateDnD(changelogTask, inboxContainer);
  } catch (err) {
    return { ok: false, errors: [`Second DnD simulation threw: ${(err as Error).message}`], failureMode: "F7-second-move-fails" };
  }

  const newChangelogTask = findTaskElement(document, "Update changelog");
  if (!newChangelogTask || !inboxContainer.contains(newChangelogTask)) {
    return {
      ok: false,
      errors: ["Update changelog not in Inbox after second move"],
      failureMode: "F7-second-move-fails",
    };
  }

  return { ok: true, errors: [], failureMode: null as unknown as FailureMode };
}

function findColumnContainer(document: Document, heading: string, taskTitles: string[]): Element | null {
  // Find an element whose text content contains the heading AND all expected task titles for that column.
  // Walk the body and take the smallest matching element.
  const all = Array.from(document.body.querySelectorAll("*"));
  let best: Element | null = null;
  let bestSize = Infinity;
  for (const el of all) {
    const text = el.textContent ?? "";
    if (!text.includes(heading)) continue;
    if (!taskTitles.every((t) => text.includes(t))) continue;
    const size = text.length;
    if (size < bestSize) {
      best = el;
      bestSize = size;
    }
  }
  return best;
}

function findTaskElement(document: Document, title: string): Element | null {
  const all = Array.from(document.body.querySelectorAll("*"));
  for (const el of all) {
    // Want the leaf-est element whose text equals (or near-equals) the title.
    if ((el.textContent?.trim() ?? "") === title) return el;
  }
  // Fallback: largest text match
  for (const el of all) {
    if ((el.textContent ?? "").includes(title)) return el;
  }
  return null;
}

function simulateDnD(source: Element, target: Element): void {
  const win = source.ownerDocument!.defaultView!;
  const DataTransfer = (win as any).DataTransfer ?? class { setData() {} getData() { return ""; } };
  const dataTransfer = new DataTransfer();

  const fire = (el: Element, type: string) => {
    const ev = new (win as any).DragEvent(type, { bubbles: true, cancelable: true, dataTransfer });
    el.dispatchEvent(ev);
  };

  fire(source, "dragstart");
  fire(target, "dragover");
  fire(target, "drop");
  fire(source, "dragend");
}

// ============================================================================
// HELPERS
// ============================================================================

function countSubstantiveLines(code: string, blankOrCommentRe: RegExp): number {
  return code.split("\n").filter((line) => !blankOrCommentRe.test(line)).length;
}

async function ensureDir(path: string): Promise<void> {
  const { mkdir } = await import("fs/promises");
  await mkdir(path, { recursive: true });
}
