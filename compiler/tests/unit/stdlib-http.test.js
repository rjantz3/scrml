/**
 * stdlib-http — unit tests for scrml:http
 *
 * Tests isOk, isError, withBaseUrl URL resolution, and request logic
 * via mock fetch (no real network calls).
 *
 * Functions extracted here match stdlib/http/index.scrml exactly.
 *
 * Coverage:
 *   H1-H3   isOk()
 *   H4-H8   isError()
 *   H9-H13  withBaseUrl() URL resolution
 *   H14-H20 request logic via mock fetch
 */

import { describe, test, expect } from "bun:test";

function isOk(response) {
    return response && response.ok === true
}

function isError(response) {
    return response && response.status >= 400
}

function withBaseUrl(baseUrl) {
    function resolveUrl(path) {
        if (path.startsWith("http://") || path.startsWith("https://")) return path
        const base = baseUrl.replace(/\/$/, "")
        const p = path.startsWith("/") ? path : "/" + path
        return base + p
    }
    return {
        _resolveUrl: resolveUrl,
        get:   (path, opts) => ({ method: "GET", url: resolveUrl(path), opts }),
        post:  (path, body, opts) => ({ method: "POST", url: resolveUrl(path), body, opts }),
        put:   (path, body, opts) => ({ method: "PUT", url: resolveUrl(path), body, opts }),
        del:   (path, opts) => ({ method: "DELETE", url: resolveUrl(path), opts }),
        patch: (path, body, opts) => ({ method: "PATCH", url: resolveUrl(path), body, opts }),
    }
}

async function makeRequest(url, options, mockFetch) {
    const opts = options || {}
    const retryCount = opts.retry || 0
    const extraHeaders = opts.headers || {}
    const fetchOptions = { method: opts.method || "GET", headers: {} }
    for (const [k, v] of Object.entries(extraHeaders)) fetchOptions.headers[k] = v
    if (opts.body !== undefined) {
        if (typeof opts.body === "string") {
            fetchOptions.body = opts.body
        } else {
            fetchOptions.body = JSON.stringify(opts.body)
            if (!fetchOptions.headers["Content-Type"]) {
                fetchOptions.headers["Content-Type"] = "application/json"
            }
        }
    }
    let lastError = null
    for (let attempt = 0; attempt <= retryCount; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 0))
        try {
            const raw = await mockFetch(url, fetchOptions)
            const contentType = raw.headers.get("content-type") || ""
            let data
            if (contentType.includes("application/json")) { data = await raw.json() }
            else { data = await raw.text() }
            return { ok: raw.ok, status: raw.status, data, headers: raw.headers, raw }
        } catch(err) {
            if (err.name === "AbortError") throw new Error(`timed out: ${url}`)
            lastError = err
            if (attempt === retryCount) throw lastError
        }
    }
    throw lastError
}

function mockResponse(status, body, contentType) {
    const ct = contentType || "text/plain"
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: (k) => k.toLowerCase() === "content-type" ? ct : null },
        json: async () => JSON.parse(body),
        text: async () => body
    }
}

describe("scrml:http — isOk()", () => {
    test("H1: true for ok:true", () => { expect(isOk({ ok: true, status: 200 })).toBe(true) })
    test("H2: false for ok:false", () => { expect(isOk({ ok: false, status: 404 })).toBe(false) })
    test("H3: false for null", () => { expect(isOk(null)).toBeFalsy() })
})

describe("scrml:http — isError()", () => {
    test("H4: true for 400", () => { expect(isError({ ok: false, status: 400 })).toBe(true) })
    test("H5: true for 500", () => { expect(isError({ ok: false, status: 500 })).toBe(true) })
    test("H6: false for 200", () => { expect(isError({ ok: true, status: 200 })).toBe(false) })
    test("H7: false for 201", () => { expect(isError({ ok: true, status: 201 })).toBe(false) })
    test("H8: false for 301", () => { expect(isError({ ok: false, status: 301 })).toBe(false) })
})

describe("scrml:http — withBaseUrl()", () => {
    test("H9: has all 5 methods", () => {
        const c = withBaseUrl("https://api.example.com")
        expect(typeof c.get).toBe("function")
        expect(typeof c.post).toBe("function")
        expect(typeof c.put).toBe("function")
        expect(typeof c.del).toBe("function")
        expect(typeof c.patch).toBe("function")
    })
    test("H10: resolves relative path", () => {
        expect(withBaseUrl("https://api.example.com")._resolveUrl("/users/42"))
            .toBe("https://api.example.com/users/42")
    })
    test("H11: preserves absolute URL", () => {
        expect(withBaseUrl("https://api.example.com")._resolveUrl("https://other.com/p"))
            .toBe("https://other.com/p")
    })
    test("H12: trailing slash stripped from base", () => {
        expect(withBaseUrl("https://api.example.com/")._resolveUrl("/users"))
            .toBe("https://api.example.com/users")
    })
    test("H13: path without leading slash gets one", () => {
        expect(withBaseUrl("https://api.example.com")._resolveUrl("users"))
            .toBe("https://api.example.com/users")
    })
})

describe("scrml:http — request logic (mock fetch)", () => {
    test("H14: JSON response parsed", async () => {
        const r = await makeRequest("/api", {}, async () =>
            mockResponse(200, '{"name":"Alice"}', "application/json")
        )
        expect(r.ok).toBe(true)
        expect(r.data).toEqual({ name: "Alice" })
    })
    test("H15: text response", async () => {
        const r = await makeRequest("/api", {}, async () =>
            mockResponse(200, "hello", "text/plain")
        )
        expect(r.data).toBe("hello")
    })
    test("H16: 404 sets ok:false", async () => {
        const r = await makeRequest("/api", {}, async () =>
            mockResponse(404, "Not Found", "text/plain")
        )
        expect(r.ok).toBe(false)
        expect(r.status).toBe(404)
    })
    test("H17: default method is GET", async () => {
        let method = null
        await makeRequest("/api", {}, async (url, opts) => {
            method = opts.method
            return mockResponse(200, "", "text/plain")
        })
        expect(method).toBe("GET")
    })
    test("H18: POST object body → JSON serialized", async () => {
        let body = null
        await makeRequest("/api", { method: "POST", body: { name: "Alice" } }, async (url, opts) => {
            body = opts.body
            return mockResponse(201, '{"id":1}', "application/json")
        })
        expect(body).toBe('{"name":"Alice"}')
    })
    test("H20: retry on network error — 3 total attempts for retry:2", async () => {
        let attempts = 0
        try {
            await makeRequest("/api", { retry: 2 }, async () => {
                attempts++
                const e = new Error("Network")
                e.name = "TypeError"
                throw e
            })
        } catch(e) {}
        expect(attempts).toBe(3)
    })
})

// --- S57 Tier 3 middleware extensions ----------------------------------------

const restClient = {
    get:   (url, opts) => Promise.resolve({ url, opts: opts || {}, method: "GET" }),
    post:  (url, body, opts) => Promise.resolve({ url, body, opts: opts || {}, method: "POST" }),
    put:   (url, body, opts) => Promise.resolve({ url, body, opts: opts || {}, method: "PUT" }),
    del:   (url, opts) => Promise.resolve({ url, opts: opts || {}, method: "DELETE" }),
    patch: (url, body, opts) => Promise.resolve({ url, body, opts: opts || {}, method: "PATCH" }),
};

function withAuth(token, scheme, wrapped) {
    const sch = scheme || "Bearer"
    const inner = wrapped || restClient
    function mergeOpts(opts) {
        const o = opts || {}
        const headers = Object.assign({}, o.headers || {}, { Authorization: `${sch} ${token}` })
        return Object.assign({}, o, { headers })
    }
    return {
        get:   (url, opts)       => inner.get(url, mergeOpts(opts)),
        post:  (url, body, opts) => inner.post(url, body, mergeOpts(opts)),
        put:   (url, body, opts) => inner.put(url, body, mergeOpts(opts)),
        del:   (url, opts)       => inner.del(url, mergeOpts(opts)),
        patch: (url, body, opts) => inner.patch(url, body, mergeOpts(opts)),
    }
}

function withDefaults(defaults, wrapped) {
    const d = defaults || {}
    const inner = wrapped || restClient
    function mergeOpts(opts) {
        const o = opts || {}
        const merged = Object.assign({}, d, o)
        if (d.headers || o.headers) {
            merged.headers = Object.assign({}, d.headers || {}, o.headers || {})
        }
        return merged
    }
    return {
        get:   (url, opts)       => inner.get(url, mergeOpts(opts)),
        post:  (url, body, opts) => inner.post(url, body, mergeOpts(opts)),
        put:   (url, body, opts) => inner.put(url, body, mergeOpts(opts)),
        del:   (url, opts)       => inner.del(url, mergeOpts(opts)),
        patch: (url, body, opts) => inner.patch(url, body, mergeOpts(opts)),
    }
}

async function retry(fn, opts) {
    const o = opts || {}
    const maxRetries = o.maxRetries !== undefined ? o.maxRetries : 3
    const baseDelay  = o.baseDelay  !== undefined ? o.baseDelay  : 200
    const factor     = o.factor     !== undefined ? o.factor     : 2
    const jitter     = o.jitter     !== undefined ? o.jitter     : 0.2
    const shouldRetry = o.shouldRetry || (() => true)
    let lastErr = null
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try { return await fn(); } catch (err) {
            lastErr = err
            if (attempt === maxRetries) break
            if (!shouldRetry(err)) break
            const base = baseDelay * Math.pow(factor, attempt)
            const jitterAmt = base * jitter * (Math.random() * 2 - 1)
            const delay = Math.max(0, base + jitterAmt)
            await new Promise(r => setTimeout(r, delay))
        }
    }
    throw lastErr
}

function multipart(fields) {
    const fd = new FormData()
    for (const [k, v] of Object.entries(fields || {})) {
        if (v === undefined || v === null) continue
        if (v instanceof Blob || v instanceof File) {
            fd.append(k, v)
        } else {
            fd.append(k, String(v))
        }
    }
    return fd
}

describe("scrml:http — withAuth (Tier 3)", () => {
    test("HM1: adds Bearer auth header by default", async () => {
        const c = withAuth("token-xyz")
        const res = await c.get("/x")
        expect(res.opts.headers.Authorization).toBe("Bearer token-xyz")
    })
    test("HM2: custom scheme", async () => {
        const c = withAuth("creds", "Basic")
        const res = await c.get("/x")
        expect(res.opts.headers.Authorization).toBe("Basic creds")
    })
    test("HM3: preserves user-set headers", async () => {
        const c = withAuth("t")
        const res = await c.get("/x", { headers: { "X-Trace": "abc" } })
        expect(res.opts.headers["X-Trace"]).toBe("abc")
        expect(res.opts.headers.Authorization).toBe("Bearer t")
    })
    test("HM4: composes with another wrapped client", async () => {
        const inner = withDefaults({ timeout: 5000 })
        const auth = withAuth("t", "Bearer", inner)
        const res = await auth.get("/x")
        expect(res.opts.headers.Authorization).toBe("Bearer t")
        expect(res.opts.timeout).toBe(5000)
    })
})

describe("scrml:http — withDefaults (Tier 3)", () => {
    test("HM5: injects timeout default", async () => {
        const c = withDefaults({ timeout: 30000 })
        const res = await c.get("/x")
        expect(res.opts.timeout).toBe(30000)
    })
    test("HM6: per-call options override defaults", async () => {
        const c = withDefaults({ timeout: 30000 })
        const res = await c.get("/x", { timeout: 1000 })
        expect(res.opts.timeout).toBe(1000)
    })
    test("HM7: headers merge by key", async () => {
        const c = withDefaults({ headers: { "X-A": "1", "X-B": "2" } })
        const res = await c.get("/x", { headers: { "X-B": "override", "X-C": "3" } })
        expect(res.opts.headers["X-A"]).toBe("1")
        expect(res.opts.headers["X-B"]).toBe("override")
        expect(res.opts.headers["X-C"]).toBe("3")
    })
})

describe("scrml:http — retry (Tier 3)", () => {
    test("HM8: returns first-call result on success", async () => {
        const r = await retry(async () => 42, { maxRetries: 2, baseDelay: 1, jitter: 0 })
        expect(r).toBe(42)
    })
    test("HM9: retries on failure up to maxRetries", async () => {
        let calls = 0
        try {
            await retry(async () => { calls++; throw new Error("fail") }, { maxRetries: 2, baseDelay: 1, jitter: 0 })
        } catch(e) {}
        expect(calls).toBe(3)  // 1 initial + 2 retries
    })
    test("HM10: shouldRetry stops retrying when false", async () => {
        let calls = 0
        try {
            await retry(
                async () => { calls++; throw new Error("nope") },
                { maxRetries: 5, baseDelay: 1, jitter: 0, shouldRetry: () => false }
            )
        } catch(e) {}
        expect(calls).toBe(1)
    })
})

describe("scrml:http — multipart (Tier 3)", () => {
    test("HM11: returns FormData", () => {
        const fd = multipart({ name: "alice" })
        expect(fd).toBeInstanceOf(FormData)
        expect(fd.get("name")).toBe("alice")
    })
    test("HM12: stringifies non-blob values", () => {
        const fd = multipart({ count: 3, ratio: 0.5, flag: true })
        expect(fd.get("count")).toBe("3")
        expect(fd.get("ratio")).toBe("0.5")
        expect(fd.get("flag")).toBe("true")
    })
    test("HM13: skips null/undefined", () => {
        const fd = multipart({ name: "a", missing: null, nope: undefined })
        expect(fd.get("name")).toBe("a")
        expect(fd.get("missing")).toBeNull()
    })
    test("HM14: preserves Blob values as files", () => {
        const blob = new Blob(["hello"], { type: "text/plain" })
        const fd = multipart({ file: blob })
        const got = fd.get("file")
        expect(got).toBeInstanceOf(Blob)
    })
})
