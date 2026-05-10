/**
 * Idempotency-Store Resolver — SPEC §19.9.6 + §39.2.6 (A9 Ext 5).
 *
 * Implements the default-resolution algorithm for the
 * `<program idempotency-store=>` attribute. Given a developer-declared value
 * (or `undefined` for the default `"auto"` case), the closest-ancestor
 * `<program db=>` driver, and a snapshot of the app's module graph, this
 * function returns the resolved storage backend.
 *
 * Resolution rules (per §19.9.6 paragraph 3 / §39.2.6):
 *   - "auto" (or undefined) → walk through:
 *       1. db-driver shadow table (sqlite/postgres/mysql)
 *       2. scrml:redis import → redis
 *       3. otherwise → "none"
 *   - "sqlite" / "postgres" / "mysql" → must match the db= driver, else
 *     E-CPS-IDEMPOTENCY-STORE-DRIVER-MISMATCH (caller's responsibility to
 *     fire the diagnostic; this resolver returns the backend even if
 *     mismatched, so the caller can compare).
 *   - "redis" → requires scrml:redis import, else
 *     E-CPS-IDEMPOTENCY-STORE-MISSING-IMPORT (caller fires).
 *   - "none" → explicitly disable the store; non-monotone batches in scope
 *     produce E-CPS-NONIDEM-NO-STORAGE (caller fires).
 *
 * The resolver is pure — no diagnostics fired here; callers consult the
 * resolution result + their context (e.g., presence of non-monotone batches)
 * to decide which diagnostic, if any, is appropriate.
 *
 * Used by:
 *   - monotonicity-analyzer.ts (Stage 5.5) — to know the resolved backend
 *     when classifying CPS batches.
 *   - emit-server.ts (Stage 8 codegen) — to dispatch the dedup-middleware
 *     emission to the correct backend helper.
 *   - type-system.ts (Stage 6) — to fire E-CPS-IDEMPOTENCY-STORE-DRIVER-
 *     MISMATCH / -MISSING-IMPORT / E-CPS-NONIDEM-NO-STORAGE.
 *
 * Cross-references:
 *   - SPEC §8.1.1 — db driver resolution (closest-ancestor `<program db=>`
 *     mirroring shape this resolver reuses).
 *   - SPEC §19.9.6 — primary normative spec for the default-resolution.
 *   - SPEC §39.2.6 — `idempotency-store=` attribute spec.
 *   - SPEC §41.4 — stdlib resolution for `scrml:redis` detection.
 *   - SPEC §43 — nested `<program>` for override semantics.
 */

/**
 * The five concrete resolved storage backends + the explicit-disable variant.
 * Distinct from the developer-facing `idempotency-store=` value space, which
 * also includes `"auto"` (resolves to one of these).
 */
export type ResolvedIdempotencyBackend =
  | "sqlite"
  | "postgres"
  | "mysql"
  | "redis"
  | "none";

/**
 * The developer-facing `<program idempotency-store=>` attribute value space.
 * `undefined` is the default (treat as `"auto"`).
 */
export type IdempotencyStoreAttr =
  | "auto"
  | "sqlite"
  | "postgres"
  | "mysql"
  | "redis"
  | "none"
  | undefined;

/**
 * Drivers the §8.1.1 db= attribute may select. The resolver consults this
 * value when `idempotency-store="auto"` to find the SQL backend that has a
 * shadow table.
 */
export type DbDriver =
  | "sqlite"
  | "postgres"
  | "mysql"
  | null /* no db= configured */;

/**
 * Resolution outcome. `backend` is the resolved storage; `mismatch` flags
 * driver-vs-attr conflicts (caller may fire E-CPS-IDEMPOTENCY-STORE-
 * DRIVER-MISMATCH). `missingRedisImport` flags
 * `idempotency-store="redis"` without `scrml:redis` in the module graph
 * (caller may fire E-CPS-IDEMPOTENCY-STORE-MISSING-IMPORT).
 */
export interface IdempotencyStoreResolution {
  backend: ResolvedIdempotencyBackend;
  /** True when the developer-declared value disagrees with the closest db= driver. */
  mismatch: boolean;
  /** True when the developer wrote `redis` but `scrml:redis` is not imported. */
  missingRedisImport: boolean;
  /** Why the resolver settled on `backend` (debug + diagnostic-message-formatting). */
  reason:
    | "explicit-attr"
    | "auto-db-driver"
    | "auto-redis-import"
    | "auto-fallthrough-none"
    | "explicit-attr-redis-but-no-import"
    | "explicit-attr-driver-mismatch";
}

/**
 * Resolves the per-app idempotency-key storage backend.
 *
 * Pure: no diagnostics fired; result reflects the resolution AND any
 * misalignments (mismatch / missingRedisImport flags). Callers decide
 * whether to surface diagnostics based on result + their context.
 *
 * @param attr  developer-declared `<program idempotency-store=>` value, or
 *              `undefined` if absent (treated as `"auto"`).
 * @param dbDriver  the closest-ancestor `<program db=>` driver, or `null`
 *              if no db= is configured.
 * @param hasScrmlRedisImport  whether `scrml:redis` appears in the module
 *              graph anywhere reachable from the program.
 */
export function resolveIdempotencyStore(
  attr: IdempotencyStoreAttr,
  dbDriver: DbDriver,
  hasScrmlRedisImport: boolean,
): IdempotencyStoreResolution {
  const effective = attr ?? "auto";

  // --- Explicit-attr branches ---

  if (effective === "none") {
    return {
      backend: "none",
      mismatch: false,
      missingRedisImport: false,
      reason: "explicit-attr",
    };
  }

  if (effective === "redis") {
    if (!hasScrmlRedisImport) {
      // Caller surfaces E-CPS-IDEMPOTENCY-STORE-MISSING-IMPORT;
      // resolver still returns "redis" so emission code knows the
      // intent. Backend is "redis"; the missing-import flag tells the
      // caller the runtime symbol won't be available.
      return {
        backend: "redis",
        mismatch: false,
        missingRedisImport: true,
        reason: "explicit-attr-redis-but-no-import",
      };
    }
    return {
      backend: "redis",
      mismatch: false,
      missingRedisImport: false,
      reason: "explicit-attr",
    };
  }

  if (effective === "sqlite" || effective === "postgres" || effective === "mysql") {
    if (dbDriver !== null && dbDriver !== effective) {
      return {
        backend: effective,
        mismatch: true,
        missingRedisImport: false,
        reason: "explicit-attr-driver-mismatch",
      };
    }
    return {
      backend: effective,
      mismatch: false,
      missingRedisImport: false,
      reason: "explicit-attr",
    };
  }

  // --- Auto-resolution branches ---
  // 1. db-driver shadow table.
  if (dbDriver === "sqlite" || dbDriver === "postgres" || dbDriver === "mysql") {
    return {
      backend: dbDriver,
      mismatch: false,
      missingRedisImport: false,
      reason: "auto-db-driver",
    };
  }
  // 2. scrml:redis import.
  if (hasScrmlRedisImport) {
    return {
      backend: "redis",
      mismatch: false,
      missingRedisImport: false,
      reason: "auto-redis-import",
    };
  }
  // 3. fallthrough — none. Caller surfaces E-CPS-NONIDEM-NO-STORAGE iff
  // any non-monotone batch exists in scope.
  return {
    backend: "none",
    mismatch: false,
    missingRedisImport: false,
    reason: "auto-fallthrough-none",
  };
}

/**
 * Heuristically extract the db= driver token from a `<program db=>` attribute
 * value. Mirrors the §8.1.1 driver-resolution logic: looks for `sqlite:`,
 * `postgres://`, `postgresql://`, or `mysql://` URI prefix.
 *
 * Returns `null` if the value is absent or cannot be classified.
 *
 * Conservative: when in doubt, returns null (which triggers the auto-
 * resolution fallthrough). False-positive misclassification is avoided by
 * requiring an unambiguous URI scheme prefix.
 */
export function extractDbDriverFromValue(value: string | undefined | null): DbDriver {
  if (!value || typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v.startsWith("sqlite:") || v.endsWith(".db") || v.endsWith(".sqlite") || v.endsWith(".sqlite3")) {
    return "sqlite";
  }
  if (v.startsWith("postgres://") || v.startsWith("postgresql://")) {
    return "postgres";
  }
  if (v.startsWith("mysql://")) {
    return "mysql";
  }
  return null;
}
