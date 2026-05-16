// React+TS validator.
//
// STATUS: scaffolded. Requires `esbuild` + `typescript` + `react` + `react-dom`
// installed at the repo root OR in benchmarks/llm-efficiency/node_modules.
// Until those are installed, this validator returns a "setup-required" error
// on every trial so the harness completes without surprise crashes.
//
// Setup (one-time, run from repo root):
//   bun add -D esbuild typescript @types/react @types/react-dom
//   bun add react react-dom
//
// After setup, this validator will:
//   1. Write the LLM output to <trialDir>/code/App.tsx
//   2. tsc --noEmit (type-check; capture errors)
//   3. esbuild bundle App.tsx with React entrypoint shim
//   4. Load bundle into happy-dom + run the spec's DnD assertion sequence
//      (shared logic with validators/scrml.ts assertTriageBoard — TODO: extract)
//
// The validator's runtime-assertion logic should be IDENTICAL to scrml's so
// the benchmark measures language-induced behavior differences, not assertion
// differences. Extraction to validators/shared.ts is a follow-up task.

import { resolve } from "path";
import { writeFile, readFile } from "fs/promises";
import { spawnSync } from "child_process";
import type { ValidationOutcome } from "../types.ts";

export async function validateReactTS(
  code: string,
  specId: string,
  trialDir: string,
): Promise<ValidationOutcome> {
  const codeDir = resolve(trialDir, "code");
  await ensureDir(codeDir);
  const appPath = resolve(codeDir, "App.tsx");
  await writeFile(appPath, code);

  const sourceLOC = countSubstantiveLines(code, /^\s*(\/\/|$)/);

  // Phase 1 — type check (requires typescript installed)
  const tsCheck = checkTypeScriptAvailable();
  if (!tsCheck.available) {
    return {
      compileOk: false,
      compileErrors: [
        "React+TS validator: setup required.",
        "Install dependencies from repo root:",
        "  bun add -D esbuild typescript @types/react @types/react-dom",
        "  bun add react react-dom",
        "Then re-run the benchmark. (Detected error: " + tsCheck.reason + ")",
      ],
      runtimeOk: false,
      runtimeErrors: [],
      failureMode: "F-other",
      bundleSizeBytes: null,
      sourceLOC,
    };
  }

  const tscResult = spawnSync(
    "bunx",
    ["tsc", "--noEmit", "--jsx", "react-jsx", "--target", "es2020", "--moduleResolution", "node", "--esModuleInterop", appPath],
    { cwd: trialDir, encoding: "utf8", timeout: 60_000 },
  );

  if (tscResult.status !== 0) {
    return {
      compileOk: false,
      compileErrors: [tscResult.stdout, tscResult.stderr].filter(Boolean).join("\n"),
      runtimeOk: false,
      runtimeErrors: [],
      failureMode: "F1-compile-fail",
      bundleSizeBytes: null,
      sourceLOC,
    };
  }

  // Phase 2 — bundle (requires esbuild installed)
  // Write a minimal entrypoint that mounts App into #root.
  const entrypointPath = resolve(codeDir, "entry.tsx");
  await writeFile(
    entrypointPath,
    `import { createRoot } from "react-dom/client";\nimport { App } from "./App";\nconst root = createRoot(document.getElementById("root")!);\nroot.render(<App />);\n`,
  );

  const bundlePath = resolve(codeDir, "bundle.js");
  const esbuildResult = spawnSync(
    "bunx",
    [
      "esbuild",
      entrypointPath,
      "--bundle",
      "--format=iife",
      "--target=es2020",
      "--loader:.tsx=tsx",
      `--outfile=${bundlePath}`,
    ],
    { cwd: trialDir, encoding: "utf8", timeout: 60_000 },
  );

  if (esbuildResult.status !== 0) {
    return {
      compileOk: false,
      compileErrors: ["esbuild failed:\n" + esbuildResult.stderr],
      runtimeOk: false,
      runtimeErrors: [],
      failureMode: "F1-compile-fail",
      bundleSizeBytes: null,
      sourceLOC,
    };
  }

  const bundle = await readFile(bundlePath, "utf8");
  const bundleSizeBytes = bundle.length;

  // Phase 3 — happy-dom mount + assertions
  // TODO: extract assertTriageBoard from validators/scrml.ts to validators/shared.ts
  // and reuse here. Until then, return runtime-ok with a note.
  return {
    compileOk: true,
    compileErrors: [],
    runtimeOk: false,
    runtimeErrors: ["React+TS runtime assertions not yet implemented — TODO: extract shared assertion logic"],
    failureMode: "F-other",
    bundleSizeBytes,
    sourceLOC,
  };
}

function checkTypeScriptAvailable(): { available: boolean; reason: string } {
  const r = spawnSync("bunx", ["--bun", "tsc", "--version"], { encoding: "utf8" });
  if (r.status === 0) return { available: true, reason: "" };
  return { available: false, reason: r.stderr || r.stdout || `exit ${r.status}` };
}

function countSubstantiveLines(code: string, blankOrCommentRe: RegExp): number {
  return code.split("\n").filter((line) => !blankOrCommentRe.test(line)).length;
}

async function ensureDir(path: string): Promise<void> {
  const { mkdir } = await import("fs/promises");
  await mkdir(path, { recursive: true });
}
