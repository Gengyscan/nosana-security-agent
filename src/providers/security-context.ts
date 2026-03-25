import { type IAgentRuntime, type Memory, type Provider, type ProviderResult, type State } from "@elizaos/core";

const OWASP_CHECKLIST = [
  "A01 Broken Access Control",
  "A02 Cryptographic Failures",
  "A03 Injection",
  "A04 Insecure Design",
  "A05 Security Misconfiguration",
  "A06 Vulnerable and Outdated Components",
  "A07 Identification and Authentication Failures",
  "A08 Software and Data Integrity Failures",
  "A09 Security Logging and Monitoring Failures",
  "A10 Server-Side Request Forgery",
];

const COMMON_PATTERNS = [
  "Hardcoded credentials, API keys, tokens, and private keys",
  "Dangerous command execution (exec, spawn, shell=True, eval, Function)",
  "SQL or NoSQL injection paths through unsanitized input",
  "Path traversal and unsafe file access",
  "Insecure deserialization and unsafe parsing",
  "Weak auth/session handling and missing authorization checks",
  "Insecure CORS and overly permissive network exposure",
  "Secrets in Dockerfile, CI configs, or environment templates",
];

export const securityContextProvider: Provider = {
  name: "securityContextProvider",
  description: "Provides security reconnaissance analysis guidance.",
  get: async (_runtime: IAgentRuntime, _message: Memory, _state: State): Promise<ProviderResult> => {
    return {
      text: [
        "Security Recon Guidelines:",
        "",
        "Severity model: CRITICAL/HIGH/MEDIUM/LOW/INFO.",
        "Focus on exploitable issues first, then hygiene and quality.",
        "",
        "OWASP Top 10:",
        ...OWASP_CHECKLIST.map((item) => `- ${item}`),
        "",
        "Common suspicious patterns:",
        ...COMMON_PATTERNS.map((item) => `- ${item}`),
        "",
        "Output rules:",
        "- Always include severity, impacted file path, and remediation steps.",
        "- Separate confirmed risks from speculative concerns.",
        "- Keep findings technical, concise, and actionable.",
      ].join("\n"),
    };
  },
};
