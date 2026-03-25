import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
} from "@elizaos/core";
import { clearFindings, getFindings } from "./findings-store";
import { SEVERITY, type Finding } from "../types";

const extractText = (message: Memory): string => {
  const content = message.content as { text?: string } | undefined;
  return content?.text ?? "";
};

const severityOrder: Record<string, number> = {
  [SEVERITY.CRITICAL]: 0,
  [SEVERITY.HIGH]: 1,
  [SEVERITY.MEDIUM]: 2,
  [SEVERITY.LOW]: 3,
  [SEVERITY.INFO]: 4,
};

const formatReport = (findings: Finding[]): string => {
  if (findings.length === 0) {
    return "# Sentinel Security Summary\n\nNo stored findings yet. Run SCAN_REPO or ANALYZE_CODE first.";
  }

  const sorted = [...findings].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const counters = sorted.reduce<Record<string, number>>((acc, item) => {
    acc[item.severity] = (acc[item.severity] ?? 0) + 1;
    return acc;
  }, {});

  const lines = sorted.map(
    (finding, index) =>
      `${index + 1}. [${finding.severity}] ${finding.title}${finding.filePath ? ` (${finding.filePath})` : ""}\n   ${finding.description}\n   Recommendation: ${finding.recommendation}`,
  );

  return [
    "# Sentinel Security Summary",
    "",
    "## Totals by Severity",
    `- CRITICAL: ${counters[SEVERITY.CRITICAL] ?? 0}`,
    `- HIGH: ${counters[SEVERITY.HIGH] ?? 0}`,
    `- MEDIUM: ${counters[SEVERITY.MEDIUM] ?? 0}`,
    `- LOW: ${counters[SEVERITY.LOW] ?? 0}`,
    `- INFO: ${counters[SEVERITY.INFO] ?? 0}`,
    "",
    "## Findings",
    ...lines,
  ].join("\n");
};

export const summarizeFindingsAction: Action = {
  name: "SUMMARIZE_FINDINGS",
  similes: ["summarize", "report", "summary", "security summary"],
  description: "Summarizes recent findings into a markdown report.",
  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
    const text = extractText(message).toLowerCase();
    return text.includes("summarize") || text.includes("summary") || text.includes("report");
  },
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const findings = getFindings(runtime);
    const report = formatReport(findings);
    if (callback) {
      await callback({ text: report });
    }
    clearFindings(runtime);

    return {
      success: true,
      text: report,
      data: {
        findingsCount: findings.length,
      },
    };
  },
  examples: [
    [
      {
        name: "user",
        content: { text: "Give me a summary report." },
      },
      {
        name: "Sentinel",
        content: { text: "# Sentinel Security Summary\n..." },
      },
    ],
  ],
};
