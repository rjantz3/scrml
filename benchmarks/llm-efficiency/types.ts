// Shared result types for the LLM efficiency benchmark.
//
// Schema is stable across benchmark runs so trend analysis (model-over-time,
// language-over-time) can compare apples to apples. Schema changes should be
// versioned via the `schemaVersion` field on aggregated results.

export type Language = "scrml" | "react-ts";

export type ModelId =
  | "claude-opus-4-7"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5"
  | "gpt-5"
  | "gpt-4o-mini"
  | "gemini-2-5-pro"
  | "gemini-2-5-flash";

export type Provider = "anthropic" | "openai" | "google";

export interface ModelDescriptor {
  id: ModelId;
  provider: Provider;
  apiName: string; // The exact name passed to the provider's SDK
  tier: "frontier" | "mid";
}

// One model's attempt at one spec in one language. May include retries
// (each retry is a Turn). Saved verbatim to disk for inspection.
export interface Trial {
  trialId: string; // Stable, derivable from (runId, model, spec, language, sample)
  runId: string;
  model: ModelDescriptor;
  spec: string; // Spec ID, e.g., "01-triage-board"
  language: Language;
  sampleIndex: number; // 0..N-1 for variance signal

  turns: Turn[];
  outcome: TrialOutcome;
  metrics: TrialMetrics;
  startedAt: string; // ISO 8601
  finishedAt: string; // ISO 8601
}

export interface Turn {
  index: number; // 0 = first attempt; 1+ = retries
  promptTokens: number;
  cachedPromptTokens: number; // Anthropic prompt-cache hits (0 for non-cached or other providers)
  completionTokens: number;
  durationMs: number;
  output: string; // The raw model output (file content)
  validation: ValidationOutcome;
}

export type TrialOutcome =
  | { kind: "success"; turnsUsed: number } // Validation passed on some turn
  | { kind: "failure"; reason: FailureMode; turnsUsed: number } // Exhausted retry budget
  | { kind: "api-error"; provider: Provider; message: string }; // Network / quota / etc.

export type FailureMode =
  | "F1-compile-fail"
  | "F2-runtime-error-on-mount"
  | "F3-initial-state-wrong"
  | "F4-drag-not-wired"
  | "F5-drop-target-wrong"
  | "F6-ordering-wrong"
  | "F7-second-move-fails"
  | "F-other"; // Unknown / not-yet-classified

export interface ValidationOutcome {
  compileOk: boolean;
  compileErrors: string[];
  runtimeOk: boolean;
  runtimeErrors: string[];
  failureMode: FailureMode | null; // null when validation passes
  bundleSizeBytes: number | null; // null when compile fails
  sourceLOC: number; // Substantive (blank + comment stripped)
}

// Per-trial quantitative axes, aggregated from turns.
export interface TrialMetrics {
  totalInputTokens: number; // Sum of promptTokens across turns
  totalCachedInputTokens: number; // Sum of cachedPromptTokens
  totalOutputTokens: number;
  totalWallTimeMs: number;
  turnsUsed: number;
  workingOnFirstTry: boolean; // outcome.kind === "success" && turnsUsed === 1
  finalBundleSizeBytes: number | null; // From the validation that passed (or last attempt)
  finalSourceLOC: number;
}

// Top-level run output (one file per benchmark invocation).
export interface BenchmarkRun {
  schemaVersion: 1;
  runId: string;
  startedAt: string;
  finishedAt: string;
  scrmlCommitSha: string; // git rev-parse HEAD at run start
  models: ModelDescriptor[];
  specs: string[];
  trials: Trial[];
  config: RunConfig;
}

export interface RunConfig {
  samplesPerTrial: number; // Default 3
  retryBudget: number; // Default 3
  cacheSystemPrompt: boolean; // Default true (Anthropic only)
  outputDir: string;
}

// Aggregation views — computed from BenchmarkRun.trials for the summary report.
export interface AggregateByModelAndLanguage {
  model: ModelId;
  language: Language;
  spec: string;
  samples: number;
  workingOnFirstTryRate: number; // 0.0-1.0
  compileSuccessRate: number;
  runtimeSuccessRate: number;
  meanInputTokens: number;
  meanCachedInputTokens: number;
  meanOutputTokens: number;
  meanWallTimeMs: number;
  meanTurnsUsed: number;
  meanBundleSizeBytes: number | null;
  meanSourceLOC: number;
  failureModeBreakdown: Partial<Record<FailureMode, number>>;
}

// API-key descriptor (loaded from env, NOT serialized to disk).
export interface ApiKeys {
  anthropic?: string;
  openai?: string;
  google?: string;
}
