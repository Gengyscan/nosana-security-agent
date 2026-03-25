import { type Finding, type OpenAIMessage, type OpenAIResponse } from "../types";

const readEnv = (key: string): string | undefined => {
  const runtime = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env?.[key];
};

const defaultModel = readEnv("MODEL_NAME") ?? "Qwen3.5-27B-AWQ-4bit";
const defaultApiUrl = readEnv("OPENAI_API_URL") ?? "https://api.openai.com/v1";
const defaultApiKey = readEnv("OPENAI_API_KEY") ?? "";

interface ChatChoice {
  message?: {
    content?: string | null;
    reasoning?: string | null;
    reasoning_content?: string | null;
  };
}

interface ChatCompletionResponse {
  choices?: ChatChoice[];
}

const isFinding = (value: unknown): value is Finding => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<Finding>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.severity === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.recommendation === "string"
  );
};

const parseJsonBlock = (text: string): OpenAIResponse => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) {
    return { findings: [], summary: "No structured findings returned by model." };
  }

  const jsonSlice = text.slice(start, end + 1);
  try {
    const parsed = JSON.parse(jsonSlice) as Partial<OpenAIResponse>;
    const findings = Array.isArray(parsed.findings) ? parsed.findings.filter(isFinding) : [];
    const summary = typeof parsed.summary === "string" ? parsed.summary : "Security analysis completed.";
    return { findings, summary };
  } catch {
    return { findings: [], summary: "Model response could not be parsed as JSON." };
  }
};

/** Extract text from a thinking-model response (content or reasoning fallback). */
const extractResponseText = (message: ChatChoice["message"]): string | null => {
  if (!message) return null;
  if (message.content) return message.content;
  if (message.reasoning) return message.reasoning;
  if (message.reasoning_content) return message.reasoning_content;
  return null;
};

export const requestSecurityAnalysis = async (messages: OpenAIMessage[]): Promise<OpenAIResponse> => {
  if (!defaultApiKey) {
    return {
      findings: [],
      summary: "OPENAI_API_KEY is not configured. Security analysis could not run.",
    };
  }

  const response = await fetch(`${defaultApiUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${defaultApiKey}`,
    },
    body: JSON.stringify({
      model: defaultModel,
      temperature: 0.1,
      max_tokens: 8192,
      messages,
      response_format: {
        type: "json_object",
      },
    }),
  });

  if (!response.ok) {
    return {
      findings: [],
      summary: `Model request failed with status ${response.status}.`,
    };
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const text = extractResponseText(payload.choices?.[0]?.message);
  if (!text) {
    return {
      findings: [],
      summary: "Model returned an empty response.",
    };
  }

  return parseJsonBlock(text);
};
