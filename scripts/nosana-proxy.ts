/**
 * Nosana API proxy for ElizaOS compatibility.
 *
 * Solves compatibility issues between Vercel AI SDK v5 and Nosana vLLM:
 * 1. Thinking mode: adds enable_thinking=false (SDK can't read reasoning_content)
 * 2. Role mapping: developer → system (vLLM only supports system/user/assistant)
 * 3. Token params: max_completion_tokens → max_tokens (vLLM uses legacy param)
 * 4. Embeddings: returns mock 1536-D vectors (no /v1/embeddings on Nosana vLLM)
 *
 * Custom actions (openai-client.ts) bypass this proxy via OPENAI_API_URL.
 *
 * Usage: bun run scripts/nosana-proxy.ts
 */

const NOSANA_BASE = process.env.NOSANA_API_URL
  ?? "https://3gsrmj6gchzyws9bnc835apd4fh6t5tyeppmbxmzrzhn.node.k8s.prd.nos.ci";

const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? "3001", 10);
const EMBED_DIM = 1536;
const REQUEST_TIMEOUT_MS = 300_000;

const zeroVector = new Array(EMBED_DIM).fill(0);
const fetchOpts = { tls: { rejectUnauthorized: false } };

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatRequestBody {
  [key: string]: unknown;
  messages?: ChatMessage[];
  enable_thinking?: boolean;
  max_tokens?: number;
  max_completion_tokens?: number;
}

interface EmbeddingRequestBody {
  model?: string;
  input?: string | string[];
}

function fixChatBody(body: ChatRequestBody): void {
  // Disable thinking mode (Vercel AI SDK can't parse reasoning_content)
  body.enable_thinking = false;

  // Map developer → system role (vLLM doesn't support developer)
  if (Array.isArray(body.messages)) {
    for (const msg of body.messages) {
      if (msg.role === "developer") msg.role = "system";
    }
  }

  // Map max_completion_tokens → max_tokens (vLLM uses legacy param)
  if (body.max_completion_tokens && !body.max_tokens) {
    body.max_tokens = body.max_completion_tokens;
  }
  delete body.max_completion_tokens;

  // Ensure sufficient max_tokens (Qwen3.5 uses ~1000 internal tokens)
  if (!body.max_tokens || body.max_tokens < 4096) {
    body.max_tokens = 8192;
  }
}

async function handleEmbeddings(req: Request): Promise<Response> {
  const body = (await req.json()) as EmbeddingRequestBody;
  const inputs = Array.isArray(body.input) ? body.input : [body.input ?? ""];

  return Response.json({
    object: "list",
    data: inputs.map((_, i) => ({
      object: "embedding",
      index: i,
      embedding: zeroVector,
    })),
    model: body.model ?? "mock-embedding",
    usage: { prompt_tokens: 0, total_tokens: 0 },
  });
}

async function proxyChatCompletions(req: Request): Promise<Response> {
  const body = (await req.json()) as ChatRequestBody;
  fixChatBody(body);

  const roles = body.messages?.map((m) => m.role).join(",") ?? "none";
  console.log(`[proxy] → model=${body.model} msgs=${body.messages?.length} roles=[${roles}] max_t=${body.max_tokens} stream=${body.stream}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(`${NOSANA_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.get("Authorization") ?? "",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      ...fetchOpts,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return new Response(JSON.stringify({ error: "Upstream timeout after 300s" }), {
        status: 504,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!upstream.ok) {
    const errText = await upstream.text();
    console.error(`[proxy] ← ERROR ${upstream.status}: ${errText}`);
    return new Response(errText, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(`[proxy] ← ${upstream.status} OK`);

  const isStream = body.stream === true;
  return new Response(upstream.body, {
    status: upstream.status,
    headers: isStream
      ? {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      }
      : {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
        "Transfer-Encoding": upstream.headers.get("Transfer-Encoding") ?? "",
      },
  });
}

async function proxyPassthrough(req: Request, pathname: string): Promise<Response> {
  console.log(`[proxy] passthrough ${req.method} ${pathname}`);
  const upstream = await fetch(`${NOSANA_BASE}${pathname}`, {
    method: req.method,
    headers: {
      "Content-Type": req.headers.get("Content-Type") ?? "application/json",
      Authorization: req.headers.get("Authorization") ?? "",
    },
    body: req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined,
    ...fetchOpts,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}

Bun.serve({
  port: PROXY_PORT,
  idleTimeout: 255,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/v1/embeddings") return handleEmbeddings(req);
    if (path === "/v1/chat/completions") return proxyChatCompletions(req);
    return proxyPassthrough(req, path);
  },
});

console.log(`[nosana-proxy] http://localhost:${PROXY_PORT} → ${NOSANA_BASE}`);
console.log(`[nosana-proxy] Fixes: thinking=off, developer→system, max_tokens≥4096, mock embeddings`);
