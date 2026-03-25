import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
} from "@elizaos/core";
import { requestSecurityAnalysis } from "./openai-client";
import { saveFindings } from "./findings-store";
import { type Finding, type OpenAIMessage } from "../types";

const CODE_BLOCK_REGEX = /```[\s\S]*?```/;

const extractText = (message: Memory): string => {
  const content = message.content as { text?: string } | undefined;
  return content?.text ?? "";
};

const hasAnalyzeIntent = (text: string): boolean => {
  const lowered = text.toLowerCase();
  return (
    lowered.includes("analyze this code") ||
    lowered.includes("review this code") ||
    lowered.includes("security review") ||
    CODE_BLOCK_REGEX.test(text)
  );
};

const buildPrompt = (code: string): OpenAIMessage[] => {
  return [
    {
      role: "system",
      content:
        "You are a secure code reviewer. Return strict JSON with keys summary and findings. Each finding must include id, severity, title, description, filePath, recommendation.",
    },
    {
      role: "user",
      content: `Analyze this code snippet for vulnerabilities and suspicious patterns:\n\n${code.slice(0, 12000)}`,
    },
  ];
};

const formatFindings = (findings: Finding[], summary: string): string => {
  if (findings.length === 0) {
    return `Code analysis complete.\nSummary: ${summary}\nNo concrete vulnerabilities identified.`;
  }

  return [
    "Code analysis complete.",
    `Summary: ${summary}`,
    "",
    ...findings.map(
      (finding) =>
        `- [${finding.severity}] ${finding.title}${finding.filePath ? ` (${finding.filePath})` : ""}\n  ${finding.description}\n  Fix: ${finding.recommendation}`,
    ),
  ].join("\n");
};

export const analyzeCodeAction: Action = {
  name: "ANALYZE_CODE",
  similes: ["analyze this code", "review code", "check this snippet", "security review code"],
  description: "Analyzes pasted code snippets and reports security findings.",
  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
    return hasAnalyzeIntent(extractText(message));
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const text = extractText(message).trim();
    if (!text) {
      if (callback) {
        await callback({ text: "Please provide a code snippet to analyze." });
      }
      return { success: false, error: "Missing code snippet" };
    }

    const analysis = await requestSecurityAnalysis(buildPrompt(text));
    saveFindings(runtime, analysis.findings);
    const responseText = formatFindings(analysis.findings, analysis.summary);
    if (callback) {
      await callback({ text: responseText });
    }

    return {
      success: true,
      text: responseText,
      data: {
        findings: analysis.findings,
      },
    };
  },
  examples: [
    [
      {
        name: "user",
        content: { text: "Analyze this code: const q = `SELECT * FROM users WHERE id=${id}`;" },
      },
      {
        name: "Sentinel",
        content: { text: "[HIGH] SQL Injection risk..." },
      },
    ],
  ],
};
