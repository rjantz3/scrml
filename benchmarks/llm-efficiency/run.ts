#!/usr/bin/env bun
//
// LLM Efficiency Benchmark — Runner
//
// Usage:
//   bun run benchmarks/llm-efficiency/run.ts                              # Full run, all specs all models
//   bun run benchmarks/llm-efficiency/run.ts --spec 01-triage-board       # Single spec
//   bun run benchmarks/llm-efficiency/run.ts --model claude-opus-4-7      # Single model
//   bun run benchmarks/llm-efficiency/run.ts --samples 1 --no-cache       # Debug/cheap mode
//   bun run benchmarks/llm-efficiency/run.ts --dry-run                    # Validate config without API calls
//
// Env (set in .env.local or shell — NOT committed):
//   ANTHROPIC_API_KEY=
//   OPENAI_API_KEY=
//   GOOGLE_API_KEY=
//
// Outputs land at: benchmarks/llm-efficiency/outputs/<runId>/

import { resolve, dirname, basename } from "path";
import { readdir, readFile, writeFile, mkdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { spawnSync } from "child_process";
import { validateScrml } from "./validators/scrml.ts";
import { validateReactTS } from "./validators/react.ts";
import type {
  ApiKeys,
  BenchmarkRun,
  Language,
  ModelDescriptor,
  ModelId,
  RunConfig,
  Trial,
  TrialMetrics,
  TrialOutcome,
  Turn,
  ValidationOutcome,
} from "./types.ts";

const BENCH_ROOT = resolve(import.meta.dir);
const REPO_ROOT = resolve(BENCH_ROOT, "../..");

// ============================================================================
// CONFIG
// ============================================================================

const ALL_MODELS: ModelDescriptor[] = [
  { id: "claude-opus-4-7", provider: "anthropic", apiName: "claude-opus-4-7", tier: "frontier" },
  { id: "claude-sonnet-4-6", provider: "anthropic", apiName: "claude-sonnet-4-6", tier: "frontier" },
  { id: "gpt-5", provider: "openai", apiName: "gpt-5", tier: "frontier" },
  { id: "gemini-2-5-pro", provider: "google", apiName: "gemini-2.5-pro", tier: "frontier" },
  { id: "claude-haiku-4-5", provider: "anthropic", apiName: "claude-haiku-4-5-20251001", tier: "mid" },
  { id: "gpt-4o-mini", provider: "openai", apiName: "gpt-4o-mini", tier: "mid" },
  { id: "gemini-2-5-flash", provider: "google", apiName: "gemini-2.5-flash", tier: "mid" },
];

const DEFAULT_CONFIG: RunConfig = {
  samplesPerTrial: 3,
  retryBudget: 3,
  cacheSystemPrompt: true,
  outputDir: resolve(BENCH_ROOT, "outputs"),
};

// ============================================================================
// PROMPT ASSEMBLY
// ============================================================================

interface SystemPromptParts {
  scrmlSystemPrompt: string;
  reactSystemPrompt: string;
  userPromptTemplate: string;
}

async function loadSystemPrompts(): Promise<SystemPromptParts> {
  // scrml: runtime-prepended instructions (from prompts/scrml-system.md's runner-prepended section)
  // followed by the three reference files with file-marker separators.
  const scrmlInstructions = await readPromptInstructionsBlock(
    resolve(BENCH_ROOT, "prompts/scrml-system.md"),
  );

  const kickstarter = await readFile(
    resolve(REPO_ROOT, "docs/articles/llm-kickstarter-v2-2026-05-04.md"),
    "utf8",
  );
  const primer = await readFile(resolve(REPO_ROOT, "docs/PA-SCRML-PRIMER.md"), "utf8");
  const antiPatterns = await readFile(
    resolve(REPO_ROOT, "../scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md"),
    "utf8",
  );

  const scrmlSystemPrompt = [
    scrmlInstructions,
    "===== file: docs/articles/llm-kickstarter-v2-2026-05-04.md =====",
    kickstarter,
    "===== file: docs/PA-SCRML-PRIMER.md =====",
    primer,
    "===== file: scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md =====",
    antiPatterns,
  ].join("\n\n");

  const reactSystemPrompt = await readPromptInstructionsBlock(
    resolve(BENCH_ROOT, "prompts/react-ts-system.md"),
  );

  const userPromptTemplate = await readPromptInstructionsBlock(
    resolve(BENCH_ROOT, "prompts/user-prompt-template.md"),
  );

  return { scrmlSystemPrompt, reactSystemPrompt, userPromptTemplate };
}

// Each prompts/*.md file has the actual prompt in a fenced code block — extract it.
async function readPromptInstructionsBlock(path: string): Promise<string> {
  const raw = await readFile(path, "utf8");
  const match = raw.match(/```\n([\s\S]*?)\n```/);
  if (!match) {
    throw new Error(`Prompt file ${path} has no fenced code block`);
  }
  return match[1];
}

async function buildUserPrompt(specId: string, template: string): Promise<string> {
  const specPath = resolve(BENCH_ROOT, "specs", `${specId}.md`);
  const specRaw = await readFile(specPath, "utf8");

  // Extract spec body from `## Functional requirements` through `## What the spec DOES NOT require` inclusive.
  const startIdx = specRaw.indexOf("## Functional requirements");
  const endIdxStart = specRaw.indexOf("## What the spec DOES NOT require");
  if (startIdx === -1 || endIdxStart === -1) {
    throw new Error(`Spec ${specId} missing required section headers`);
  }
  // Find the end of the "What the spec DOES NOT require" section (next ## or end of file).
  const afterEndStart = specRaw.indexOf("\n## ", endIdxStart + 1);
  const endIdx = afterEndStart === -1 ? specRaw.length : afterEndStart;
  const specContent = specRaw.slice(startIdx, endIdx).trim();

  return template.replace("{{SPEC_CONTENT}}", specContent);
}

// ============================================================================
// PROVIDER ADAPTERS (fetch-based; no SDK deps)
// ============================================================================

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface ProviderCallParams {
  model: ModelDescriptor;
  systemPrompt: string;
  conversation: ConversationMessage[];
  enableCache: boolean;
}

interface ProviderCallResult {
  output: string;
  promptTokens: number;
  cachedPromptTokens: number;
  completionTokens: number;
  durationMs: number;
}

async function callAnthropic(params: ProviderCallParams, apiKey: string): Promise<ProviderCallResult> {
  const startedAt = Date.now();

  const systemBlock = params.enableCache
    ? [{ type: "text", text: params.systemPrompt, cache_control: { type: "ephemeral" } }]
    : params.systemPrompt;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: params.model.apiName,
      max_tokens: 8192,
      system: systemBlock,
      messages: params.conversation,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${body}`);
  }
  const json = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
    usage: { input_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number; output_tokens: number };
  };

  const text = json.content.filter((c) => c.type === "text").map((c) => c.text).join("");

  return {
    output: text,
    promptTokens: json.usage.input_tokens,
    cachedPromptTokens: json.usage.cache_read_input_tokens ?? 0,
    completionTokens: json.usage.output_tokens,
    durationMs: Date.now() - startedAt,
  };
}

async function callOpenAI(params: ProviderCallParams, apiKey: string): Promise<ProviderCallResult> {
  const startedAt = Date.now();

  const messages = [
    { role: "system" as const, content: params.systemPrompt },
    ...params.conversation,
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: params.model.apiName,
      messages,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI API ${response.status}: ${body}`);
  }
  const json = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage: { prompt_tokens: number; completion_tokens: number };
  };

  return {
    output: json.choices[0].message.content,
    promptTokens: json.usage.prompt_tokens,
    cachedPromptTokens: 0,
    completionTokens: json.usage.completion_tokens,
    durationMs: Date.now() - startedAt,
  };
}

async function callGoogle(params: ProviderCallParams, apiKey: string): Promise<ProviderCallResult> {
  const startedAt = Date.now();

  // Google Gemini uses a different message shape — convert.
  const contents = params.conversation.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model.apiName}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: params.systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 8192 },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google API ${response.status}: ${body}`);
  }
  const json = (await response.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    usageMetadata: { promptTokenCount: number; candidatesTokenCount: number };
  };

  const text = json.candidates[0].content.parts.map((p) => p.text).join("");

  return {
    output: text,
    promptTokens: json.usageMetadata.promptTokenCount,
    cachedPromptTokens: 0,
    completionTokens: json.usageMetadata.candidatesTokenCount,
    durationMs: Date.now() - startedAt,
  };
}

async function callModel(params: ProviderCallParams, apiKeys: ApiKeys): Promise<ProviderCallResult> {
  switch (params.model.provider) {
    case "anthropic":
      if (!apiKeys.anthropic) throw new Error("ANTHROPIC_API_KEY not set");
      return callAnthropic(params, apiKeys.anthropic);
    case "openai":
      if (!apiKeys.openai) throw new Error("OPENAI_API_KEY not set");
      return callOpenAI(params, apiKeys.openai);
    case "google":
      if (!apiKeys.google) throw new Error("GOOGLE_API_KEY not set");
      return callGoogle(params, apiKeys.google);
  }
}

// ============================================================================
// VALIDATION DISPATCH
// ============================================================================

async function validate(
  language: Language,
  code: string,
  specId: string,
  trialDir: string,
): Promise<ValidationOutcome> {
  return language === "scrml"
    ? validateScrml(code, specId, trialDir, REPO_ROOT)
    : validateReactTS(code, specId, trialDir);
}

// ============================================================================
// TRIAL ORCHESTRATION
// ============================================================================

interface TrialParams {
  runId: string;
  model: ModelDescriptor;
  specId: string;
  language: Language;
  sampleIndex: number;
  systemPrompt: string;
  initialUserPrompt: string;
  config: RunConfig;
  apiKeys: ApiKeys;
  outputDir: string;
}

async function runTrial(params: TrialParams): Promise<Trial> {
  const trialIdSlug = `${params.model.id}__${params.specId}__${params.language}__s${params.sampleIndex}`;
  const trialId = `${params.runId}/${trialIdSlug}`;
  const trialDir = resolve(params.outputDir, "trials", trialIdSlug);
  await mkdir(trialDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const turns: Turn[] = [];
  const conversation: ConversationMessage[] = [{ role: "user", content: params.initialUserPrompt }];

  let outcome: TrialOutcome = { kind: "failure", reason: "F-other", turnsUsed: 0 };

  for (let i = 0; i < params.config.retryBudget; i++) {
    let providerResult: ProviderCallResult;
    try {
      providerResult = await callModel(
        {
          model: params.model,
          systemPrompt: params.systemPrompt,
          conversation,
          enableCache: params.config.cacheSystemPrompt,
        },
        params.apiKeys,
      );
    } catch (err) {
      outcome = { kind: "api-error", provider: params.model.provider, message: (err as Error).message };
      break;
    }

    const validation = await validate(params.language, providerResult.output, params.specId, trialDir);

    turns.push({
      index: i,
      promptTokens: providerResult.promptTokens,
      cachedPromptTokens: providerResult.cachedPromptTokens,
      completionTokens: providerResult.completionTokens,
      durationMs: providerResult.durationMs,
      output: providerResult.output,
      validation,
    });

    if (validation.compileOk && validation.runtimeOk) {
      outcome = { kind: "success", turnsUsed: i + 1 };
      break;
    }

    conversation.push({ role: "assistant", content: providerResult.output });
    conversation.push({ role: "user", content: formatRetryMessage(validation) });
    outcome = { kind: "failure", reason: validation.failureMode ?? "F-other", turnsUsed: i + 1 };
  }

  const finishedAt = new Date().toISOString();
  const metrics = computeMetrics(turns, outcome);

  const trial: Trial = {
    trialId,
    runId: params.runId,
    model: params.model,
    spec: params.specId,
    language: params.language,
    sampleIndex: params.sampleIndex,
    turns,
    outcome,
    metrics,
    startedAt,
    finishedAt,
  };

  await persistTrial(trial, trialDir);
  return trial;
}

function formatRetryMessage(validation: ValidationOutcome): string {
  const errors = validation.compileOk
    ? `RUNTIME ERROR(S):\n${validation.runtimeErrors.join("\n")}`
    : `COMPILE ERROR(S):\n${validation.compileErrors.join("\n")}`;
  return `The previous attempt did not meet the spec. The validator output:\n\n${errors}\n\nRevise the file. Output the complete revised file content now. No explanation, no markdown fences.`;
}

function computeMetrics(turns: Turn[], outcome: TrialOutcome): TrialMetrics {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const lastTurn = turns[turns.length - 1];
  return {
    totalInputTokens: sum(turns.map((t) => t.promptTokens)),
    totalCachedInputTokens: sum(turns.map((t) => t.cachedPromptTokens)),
    totalOutputTokens: sum(turns.map((t) => t.completionTokens)),
    totalWallTimeMs: sum(turns.map((t) => t.durationMs)),
    turnsUsed: turns.length,
    workingOnFirstTry: outcome.kind === "success" && outcome.turnsUsed === 1,
    finalBundleSizeBytes: lastTurn?.validation.bundleSizeBytes ?? null,
    finalSourceLOC: lastTurn?.validation.sourceLOC ?? 0,
  };
}

async function persistTrial(trial: Trial, trialDir: string): Promise<void> {
  // Strip the raw output from the trial JSON (kept separately in conversation.json)
  // to keep the aggregate results.json compact.
  const trialMeta = {
    ...trial,
    turns: trial.turns.map((t) => ({ ...t, output: `<see conversation.json turn ${t.index}>` })),
  };
  await writeFile(resolve(trialDir, "trial.json"), JSON.stringify(trialMeta, null, 2));
  await writeFile(
    resolve(trialDir, "conversation.json"),
    JSON.stringify(trial.turns.map((t) => ({ index: t.index, output: t.output })), null, 2),
  );
}

async function persistRun(run: BenchmarkRun, outputDir: string): Promise<void> {
  await writeFile(resolve(outputDir, "results.json"), JSON.stringify(run, null, 2));
}

async function generateSummaryMarkdown(run: BenchmarkRun, outputDir: string): Promise<void> {
  const lines: string[] = [];
  lines.push(`# Benchmark Run — ${run.runId}\n`);
  lines.push(`scrml commit: \`${run.scrmlCommitSha}\``);
  lines.push(`Started: ${run.startedAt}`);
  lines.push(`Finished: ${run.finishedAt}`);
  lines.push(`Trials: ${run.trials.length}\n`);

  // Aggregate per (model, spec, language).
  type Key = string;
  const groups: Map<Key, Trial[]> = new Map();
  for (const t of run.trials) {
    const key = `${t.model.id}|${t.spec}|${t.language}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  lines.push(`| Model | Spec | Lang | N | 1st-try | Compile OK | Runtime OK | Mean in-tok | Mean cached | Mean out-tok | Mean turns | Mean LOC | Mean bundle B |`);
  lines.push(`|---|---|---|---|---|---|---|---|---|---|---|---|---|`);

  for (const [key, trials] of groups) {
    const [modelId, spec, language] = key.split("|");
    const n = trials.length;
    const firstTry = trials.filter((t) => t.metrics.workingOnFirstTry).length / n;
    const compileOk = trials.filter((t) => t.turns.some((tn) => tn.validation.compileOk)).length / n;
    const runtimeOk = trials.filter((t) => t.outcome.kind === "success").length / n;
    const mean = (sel: (t: Trial) => number) => trials.reduce((a, t) => a + sel(t), 0) / n;
    const meanIn = mean((t) => t.metrics.totalInputTokens);
    const meanCached = mean((t) => t.metrics.totalCachedInputTokens);
    const meanOut = mean((t) => t.metrics.totalOutputTokens);
    const meanTurns = mean((t) => t.metrics.turnsUsed);
    const meanLOC = mean((t) => t.metrics.finalSourceLOC);
    const bundleSamples = trials.map((t) => t.metrics.finalBundleSizeBytes).filter((b): b is number => b !== null);
    const meanBundle = bundleSamples.length ? bundleSamples.reduce((a, b) => a + b, 0) / bundleSamples.length : null;

    lines.push(
      `| ${modelId} | ${spec} | ${language} | ${n} | ${(firstTry * 100).toFixed(0)}% | ${(compileOk * 100).toFixed(0)}% | ${(runtimeOk * 100).toFixed(0)}% | ${meanIn.toFixed(0)} | ${meanCached.toFixed(0)} | ${meanOut.toFixed(0)} | ${meanTurns.toFixed(1)} | ${meanLOC.toFixed(0)} | ${meanBundle?.toFixed(0) ?? "n/a"} |`,
    );
  }

  await writeFile(resolve(outputDir, "results.md"), lines.join("\n"));
}

// ============================================================================
// CLI + ORCHESTRATION
// ============================================================================

interface CliArgs {
  spec?: string;
  model?: ModelId;
  samples?: number;
  noCache?: boolean;
  dryRun?: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--spec") args.spec = argv[++i];
    else if (a === "--model") args.model = argv[++i] as ModelId;
    else if (a === "--samples") args.samples = Number(argv[++i]);
    else if (a === "--no-cache") args.noCache = true;
    else if (a === "--dry-run") args.dryRun = true;
  }
  return args;
}

function loadApiKeys(): ApiKeys {
  return {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    google: process.env.GOOGLE_API_KEY,
  };
}

async function listSpecs(): Promise<string[]> {
  const dir = resolve(BENCH_ROOT, "specs");
  const files = await readdir(dir);
  return files.filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")).sort();
}

async function getCurrentCommitSha(): Promise<string> {
  const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" });
  return r.stdout.trim();
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const apiKeys = loadApiKeys();

  const config: RunConfig = {
    ...DEFAULT_CONFIG,
    samplesPerTrial: args.samples ?? DEFAULT_CONFIG.samplesPerTrial,
    cacheSystemPrompt: args.noCache ? false : DEFAULT_CONFIG.cacheSystemPrompt,
  };

  const models = args.model ? ALL_MODELS.filter((m) => m.id === args.model) : ALL_MODELS;
  const specs = args.spec ? [args.spec] : await listSpecs();

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = resolve(config.outputDir, runId);
  await mkdir(outputDir, { recursive: true });

  console.log(`Run ID: ${runId}`);
  console.log(`Models: ${models.map((m) => m.id).join(", ")}`);
  console.log(`Specs: ${specs.join(", ")}`);
  console.log(`Samples per trial: ${config.samplesPerTrial}`);
  console.log(`Total trials: ${models.length * specs.length * 2 * config.samplesPerTrial}`);
  console.log(`Output: ${outputDir}\n`);

  if (args.dryRun) {
    console.log("--dry-run set; exiting without API calls.");
    return;
  }

  // Verify API keys for the models we'll call.
  const providersNeeded = new Set(models.map((m) => m.provider));
  for (const p of providersNeeded) {
    if (p === "anthropic" && !apiKeys.anthropic) throw new Error("ANTHROPIC_API_KEY not set");
    if (p === "openai" && !apiKeys.openai) throw new Error("OPENAI_API_KEY not set");
    if (p === "google" && !apiKeys.google) throw new Error("GOOGLE_API_KEY not set");
  }

  const prompts = await loadSystemPrompts();
  const trials: Trial[] = [];

  // Run order: model-first → spec → language → sample. Keeps Anthropic prompt-cache hot per model.
  for (const model of models) {
    for (const specId of specs) {
      const userPrompt = await buildUserPrompt(specId, prompts.userPromptTemplate);

      for (const language of ["scrml", "react-ts"] as Language[]) {
        const systemPrompt = language === "scrml" ? prompts.scrmlSystemPrompt : prompts.reactSystemPrompt;

        for (let sampleIndex = 0; sampleIndex < config.samplesPerTrial; sampleIndex++) {
          try {
            const trial = await runTrial({
              runId,
              model,
              specId,
              language,
              sampleIndex,
              systemPrompt,
              initialUserPrompt: userPrompt,
              config,
              apiKeys,
              outputDir,
            });
            trials.push(trial);
            const outcomeStr =
              trial.outcome.kind === "success"
                ? `✓ success (${trial.outcome.turnsUsed} turn${trial.outcome.turnsUsed > 1 ? "s" : ""})`
                : trial.outcome.kind === "api-error"
                  ? `! api-error`
                  : `✗ ${trial.outcome.reason}`;
            console.log(`${model.id} ${specId} ${language} s${sampleIndex}: ${outcomeStr}`);
          } catch (err) {
            console.error(`${model.id} ${specId} ${language} s${sampleIndex}: HARD-ERROR ${(err as Error).message}`);
          }
        }
      }
    }
  }

  const run: BenchmarkRun = {
    schemaVersion: 1,
    runId,
    startedAt: trials[0]?.startedAt ?? new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    scrmlCommitSha: await getCurrentCommitSha(),
    models,
    specs,
    trials,
    config,
  };

  await persistRun(run, outputDir);
  await generateSummaryMarkdown(run, outputDir);

  console.log(`\nRun complete: ${outputDir}/results.md`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
