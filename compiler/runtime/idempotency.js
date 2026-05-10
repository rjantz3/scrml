/**
 * A9 Ext 5 — Idempotency-Key Storage Runtime Helpers (SPEC §19.9.6).
 *
 * Server-side runtime helpers consumed by emit-server.ts dedup middleware.
 * Three backends:
 *   - SQL shadow table (sqlite / postgres / mysql via Bun.SQL `_scrml_sql`)
 *   - Redis (via `scrml:redis` stdlib helpers)
 *   - none (no helper emission; static-rejection diagnostic at compile time)
 *
 * The compiler chooses ONE backend per app at codegen time based on the
 * resolved `<program idempotency-store=>` value (per SPEC §39.2.6). The
 * matching helper block below is inlined into the server module's prelude
 * by emit-server.ts post-hoc inliner.
 *
 * Schema (SPEC §19.9.6):
 *
 *   _scrml_idempotency_keys (
 *     key             TEXT    PRIMARY KEY,
 *     response_body   TEXT    NOT NULL,
 *     response_status INTEGER NOT NULL,
 *     created_at      INTEGER NOT NULL,
 *     expires_at      INTEGER NOT NULL
 *   )
 *
 * INTEGER timestamps (Unix epoch milliseconds) for cross-driver portability.
 * TTL: 24 hours (Stripe convention; compiler-internal constant).
 * Eviction: lazy on read — expired entries return null and are NOT
 *   automatically deleted. (Future amendment may add a background sweeper;
 *   v0.2.0 keeps the helper minimal.)
 *
 * Bootstrap: each helper is idempotent — the table CREATE IF NOT EXISTS
 *   runs on every call but is a no-op once the table exists. Future
 *   optimization: hoist the bootstrap to a one-time top-level await.
 */

// ---------------------------------------------------------------------------
// SQL backend (sqlite / postgres / mysql via Bun.SQL `_scrml_sql`).
// Reference shape: this file is NOT imported directly; emit-server.ts
// inlines the helper text below into the server module on detection of
// the `_scrml_idempotency_lookup(` / `_scrml_idempotency_store(` callsites.
// ---------------------------------------------------------------------------

const _SCRML_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let _scrml_idempotency_table_ready = false;

async function _scrml_idempotency_ensure_table() {
  if (_scrml_idempotency_table_ready) return;
  await _scrml_sql.unsafe(`CREATE TABLE IF NOT EXISTS _scrml_idempotency_keys (
    key             TEXT    PRIMARY KEY,
    response_body   TEXT    NOT NULL,
    response_status INTEGER NOT NULL,
    created_at      INTEGER NOT NULL,
    expires_at      INTEGER NOT NULL
  )`);
  _scrml_idempotency_table_ready = true;
}

/**
 * Lookup an idempotency key in the shadow table.
 *
 * @param {string} key
 * @returns {Promise<{response_body: string, response_status: number} | null>}
 *   `null` on miss OR on expired entry; `{response_body, response_status}` on hit.
 */
async function _scrml_idempotency_lookup(key) {
  if (!key) return null;
  await _scrml_idempotency_ensure_table();
  const now = Date.now();
  // Bun.SQL tagged-template returns array-of-rows; we want the first row.
  const rows = await _scrml_sql`SELECT response_body, response_status, expires_at FROM _scrml_idempotency_keys WHERE key = ${key} LIMIT 1`;
  if (!rows || rows.length === 0) return null;
  const row = rows[0];
  if (row.expires_at <= now) {
    // Lazy eviction — expired entries are treated as a miss. Caller will
    // execute the body and store fresh.
    return null;
  }
  return {
    response_body: row.response_body,
    response_status: row.response_status,
  };
}

/**
 * Store an idempotency key + response tuple in the shadow table.
 *
 * @param {string} key
 * @param {string} body  serialized response body (typically JSON.stringify result)
 * @param {number} status  HTTP status code
 * @returns {Promise<void>}
 */
async function _scrml_idempotency_store(key, body, status) {
  if (!key) return;
  await _scrml_idempotency_ensure_table();
  const now = Date.now();
  const expires = now + _SCRML_IDEMPOTENCY_TTL_MS;
  // Cross-driver upsert: try insert, fall back to update on conflict.
  // sqlite uses `OR REPLACE`; postgres/mysql use `ON CONFLICT (key) DO UPDATE`.
  // For portability, use a two-step: DELETE + INSERT (atomic enough at the
  // app-layer; the per-key-write rate is bounded by client retry intervals).
  try {
    await _scrml_sql`INSERT INTO _scrml_idempotency_keys (key, response_body, response_status, created_at, expires_at) VALUES (${key}, ${body}, ${status}, ${now}, ${expires})`;
  } catch (_e) {
    // Probable PRIMARY KEY conflict — update existing row instead.
    await _scrml_sql`UPDATE _scrml_idempotency_keys SET response_body = ${body}, response_status = ${status}, created_at = ${now}, expires_at = ${expires} WHERE key = ${key}`;
  }
}

// ---------------------------------------------------------------------------
// Redis backend (via scrml:redis stdlib).
//
// Storage shape: a single Redis hash key `_scrml_idem:<key>` storing fields
// `body`, `status`, `expires_at`. Native TTL via Redis EXPIREAT.
// ---------------------------------------------------------------------------

// (Stub — populated by D5/D6 follow-up if the resolved backend is "redis".
// The SQL backend above is the v0.2.0 default-resolution target for apps
// with `<program db=>` configured.)
