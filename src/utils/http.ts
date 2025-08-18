export type JsonRequestOptions = {
  /** Abort if the request exceeds this many ms. Default: 10_000 */
  timeoutMs?: number;
  /** Max automatic retries for 429/5xx. Default: 2 */
  retries?: number;
  /** Delay base for exponential backoff (ms). Default: 500 */
  retryBaseDelayMs?: number;
};

export const DEFAULT_JSON_REQUEST_OPTIONS: Required<JsonRequestOptions> = {
  timeoutMs: 10_000,
  retries: 2,
  retryBaseDelayMs: 500,
};

export async function fetchJson<T>(
  url: string,
  {
    timeoutMs,
    retries,
    retryBaseDelayMs,
  }: Required<JsonRequestOptions> = DEFAULT_JSON_REQUEST_OPTIONS,
): Promise<T> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        clearTimeout(t);
        return (await res.json()) as T;
      }
      // Retry on rate limit or transient server errors
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        attempt++;
        clearTimeout(t);
        await sleep(retryBaseDelayMs * Math.pow(2, attempt - 1));
        continue;
      }
      const body = await res.text().catch(() => "");
      clearTimeout(t);
      throw new Error(`HTTP ${res.status} ${res.statusText} – ${body}`);
    } catch (e: any) {
      clearTimeout(t);
      if (e?.name === "AbortError") {
        if (attempt < retries) {
          attempt++;
          await sleep(retryBaseDelayMs * Math.pow(2, attempt - 1));
          continue;
        }
        throw new Error(`Request timed out after ${attempt + 1} attempt(s)`);
      }
      // Network error: retry if attempts remain
      if (attempt < retries) {
        attempt++;
        await sleep(retryBaseDelayMs * Math.pow(2, attempt - 1));
        continue;
      }
      throw e;
    }
  }
}

/**
 * Minimal JSON-RPC 2.0 helper.
 *
 * - Sends a JSON-RPC request (POST) with `method` and `params`.
 * - If the response parses as a JSON-RPC envelope, returns `result` (or throws on `error`).
 * - Otherwise returns the raw response body as a string.
 * - Small, single function; easy to debug.
 *
 * Requires: global `fetch` (Node 18+ or a polyfill).
 */
export async function fetchJsonRpc<T = unknown>(
  url: string,
  method: string,
  params?: unknown[] | Record<string, unknown> | null,
  opts?: {
    timeoutMs?: number;
    headers?: Record<string, string>;
    id?: string | number;
  },
): Promise<T | string> {
  const timeoutMs = opts?.timeoutMs ?? 15_000;
  const id = opts?.id ?? Date.now();
  const headers = {
    "content-type": "application/json",
    accept: "*/*",
    ...(opts?.headers ?? {}),
  };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method,
        ...(params !== undefined ? { params } : {}),
        id,
      }),
      signal: ctrl.signal,
    });

    // If HTTP status is not OK, include best-effort body in the error.
    if (!res.ok) {
      const body = await safeText(res);
      throw new Error(
        `HTTP ${res.status} ${res.statusText}${body ? ` — ${truncate(body, 400)}` : ""}`,
      );
    }

    // Read once as text, then try to interpret as JSON-RPC.
    const text = await res.text();

    // Try JSON first; if that fails, we return the raw text.
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return text; // server returned a raw string (non-JSON)
    }

    // If it looks like a JSON-RPC envelope, handle success/error.
    if (isJsonRpc(parsed)) {
      if (parsed.error) {
        const { code, message, data } = parsed.error;
        const detail =
          data !== undefined ? ` — data: ${tryStringify(data, 200)}` : "";
        throw new Error(`JSON-RPC error ${code}: ${message}${detail}`);
      }
      return parsed.result as T;
    }

    // Not a JSON-RPC envelope; if it's a JSON string, return it; else return the original text.
    if (typeof parsed === "string") return parsed;
    return text;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("Request timed out/aborted");
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

/* ---------------- helpers ---------------- */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isJsonRpc(
  x: any,
): x is {
  jsonrpc: "2.0";
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
} {
  return (
    x &&
    typeof x === "object" &&
    x.jsonrpc === "2.0" &&
    ("result" in x || "error" in x)
  );
}

async function safeText(res: Response): Promise<string | null> {
  try {
    const s = await res.text();
    return s.length ? s : null;
  } catch {
    return null;
  }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max) + "…";
}

function tryStringify(v: unknown, max: number): string {
  try {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return truncate(s, max);
  } catch {
    return "[unserializable]";
  }
}
