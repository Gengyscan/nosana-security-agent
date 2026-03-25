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
import { type FileArtifact, type Finding, type OpenAIMessage, type ScanTarget } from "../types";

const GITHUB_URL_REGEX = /https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)/i;
const KEY_FILE_MATCHERS = [/package\.json$/i, /dockerfile$/i, /^\.env/i, /config/i, /\.ya?ml$/i, /\.ini$/i];

const readGitHubToken = (): string | undefined => {
  const runtime = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env?.["GITHUB_TOKEN"];
};

interface GitHubRepoResponse {
  default_branch?: string;
}

interface GitTreeItem {
  path: string;
  type: "tree" | "blob";
}

interface GitTreeResponse {
  tree?: GitTreeItem[];
}


const extractText = (message: Memory): string => {
  const content = message.content as { text?: string } | undefined;
  return content?.text ?? "";
};

const extractRepoTarget = (text: string): ScanTarget | null => {
  const match = text.match(GITHUB_URL_REGEX);
  if (!match) {
    return null;
  }

  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");
  return {
    owner,
    repo,
    branch: "main",
    url: `https://github.com/${owner}/${repo}`,
  };
};

const fetchJson = async <T>(url: string): Promise<T | null> => {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "sentinel-security-recon-agent",
  };
  const token = readGitHubToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as T;
};

const selectKeyFiles = (tree: GitTreeItem[]): string[] => {
  return tree
    .filter((item) => item.type === "blob")
    .map((item) => item.path)
    .filter((path) => KEY_FILE_MATCHERS.some((matcher) => matcher.test(path)))
    .slice(0, 12);
};

const fetchFileContent = async (owner: string, repo: string, path: string, branch: string): Promise<FileArtifact | null> => {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  const text = await response.text();
  return { path, content: text.slice(0, 4000) };
};

const buildPrompt = (target: ScanTarget, files: FileArtifact[]): OpenAIMessage[] => {
  const fileBlock = files
    .map((file) => `FILE: ${file.path}\n\
${file.content}`)
    .join("\n\n---\n\n");

  return [
    {
      role: "system",
      content:
        "You are a senior application security engineer. Return strict JSON with keys summary and findings. Each finding must include id, severity, title, description, filePath, recommendation.",
    },
    {
      role: "user",
      content: `Analyze this repository snapshot for security issues.\nRepository: ${target.url}\nBranch: ${target.branch}\n\n${fileBlock}`,
    },
  ];
};

const formatFindings = (findings: Finding[], summary: string, target: ScanTarget): string => {
  if (findings.length === 0) {
    return `Repository scan complete for ${target.url}.\nSummary: ${summary}\nNo concrete findings detected in sampled files.`;
  }

  const rows = findings.map(
    (finding) =>
      `- [${finding.severity}] ${finding.title}${finding.filePath ? ` (${finding.filePath})` : ""}\n  ${finding.description}\n  Fix: ${finding.recommendation}`,
  );

  return [`Repository scan complete for ${target.url}.`, `Summary: ${summary}`, "", ...rows].join("\n");
};

export const scanRepoAction: Action = {
  name: "SCAN_REPO",
  similes: ["scan", "analyze repo", "check security", "audit repository", "github scan"],
  description: "Scans a GitHub repository for suspicious security patterns and vulnerabilities.",
  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
    return GITHUB_URL_REGEX.test(extractText(message));
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const text = extractText(message);
    const target = extractRepoTarget(text);
    if (!target) {
      const msg = "I need a valid GitHub repository URL to run SCAN_REPO.";
      if (callback) {
        await callback({ text: msg });
      }
      return { success: false, error: msg };
    }

    const repoInfo = await fetchJson<GitHubRepoResponse>(`https://api.github.com/repos/${target.owner}/${target.repo}`);
    target.branch = repoInfo?.default_branch ?? "main";

    const treeUrl = `https://api.github.com/repos/${target.owner}/${target.repo}/git/trees/${target.branch}?recursive=1`;
    const treePayload = await fetchJson<GitTreeResponse>(treeUrl);
    const allFiles = treePayload?.tree ?? [];
    if (allFiles.length === 0) {
      const msg = `Unable to read repository tree for ${target.url}.`;
      if (callback) {
        await callback({ text: msg });
      }
      return { success: false, error: msg };
    }

    const paths = selectKeyFiles(allFiles);
    const artifacts: FileArtifact[] = [];
    for (const path of paths) {
      const artifact = await fetchFileContent(target.owner, target.repo, path, target.branch);
      if (artifact) {
        artifacts.push(artifact);
      }
    }

    if (artifacts.length === 0) {
      const msg = `No key files were accessible in ${target.url}.`;
      if (callback) {
        await callback({ text: msg });
      }
      return { success: false, error: msg };
    }

    const analysis = await requestSecurityAnalysis(buildPrompt(target, artifacts));
    saveFindings(runtime, analysis.findings);
    const responseText = formatFindings(analysis.findings, analysis.summary, target);
    if (callback) {
      await callback({ text: responseText });
    }

    return {
      success: true,
      text: responseText,
      data: {
        target: target.url,
        findings: analysis.findings,
      },
    };
  },
  examples: [
    [
      {
        name: "user",
        content: { text: "Scan this repo for security issues: https://github.com/example/service-api" },
      },
      {
        name: "Sentinel",
        content: { text: "Repository scan complete... [HIGH] Hardcoded API secret in config/default.yaml ..." },
      },
    ],
  ],
};
