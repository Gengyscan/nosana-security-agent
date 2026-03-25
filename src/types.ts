export const SEVERITY = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INFO: "INFO",
} as const;

export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  filePath?: string;
  recommendation: string;
}

export interface ScanTarget {
  owner: string;
  repo: string;
  branch: string;
  url: string;
}

export interface FileArtifact {
  path: string;
  content: string;
}

export interface FindingsPayload {
  target: string;
  findings: Finding[];
  summary: string;
}

export interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAIResponse {
  findings: Finding[];
  summary: string;
}

export interface MessageTextContent {
  text?: string;
}

export interface MemoryShape {
  content?: MessageTextContent;
}

export interface StateShape {
  recentFindings?: Finding[];
}
