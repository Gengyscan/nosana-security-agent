import { create } from "zustand";
import { sendAgentMessage } from "./lib/api";

export const SEVERITY = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INFO: "INFO",
} as const;

export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];

export interface Finding {
  severity: Severity;
  title: string;
  description: string;
  filePath?: string;
}

interface UserMessage {
  id: string;
  kind: "user";
  text: string;
  createdAt: number;
}

interface AssistantMessage {
  id: string;
  kind: "assistant";
  text: string;
  findings: Finding[];
  createdAt: number;
}

export type ChatMessage = UserMessage | AssistantMessage;

interface ChatStore {
  messages: ChatMessage[];
  findings: Finding[];
  isLoading: boolean;
  addMessage: (message: ChatMessage) => void;
  sendMessage: (text: string) => Promise<void>;
}

const severityValues = Object.values(SEVERITY);

const parseFindings = (text: string): Finding[] => {
  const lines = text.split("\n");
  const results: Finding[] = [];

  for (const line of lines) {
    const match = line.match(/\[(CRITICAL|HIGH|MEDIUM|LOW|INFO)\]\s+([^\(\n]+)(?:\(([^\)]+)\))?/);
    if (!match) {
      continue;
    }

    const severityRaw = match[1] as Severity;
    if (!severityValues.includes(severityRaw)) {
      continue;
    }

    results.push({
      severity: severityRaw,
      title: match[2].trim(),
      filePath: match[3]?.trim(),
      description: "See message details for full context.",
    });
  }

  return results;
};

const createId = (): string => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  findings: [],
  isLoading: false,
  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },
  sendMessage: async (text) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    set((state) => ({
      isLoading: true,
      messages: [
        ...state.messages,
        {
          id: createId(),
          kind: "user",
          text: trimmed,
          createdAt: Date.now(),
        },
      ],
    }));

    try {
      const responseText = await sendAgentMessage("sentinel", {
        text: trimmed,
        userId: "sentinel-ui",
        userName: "Sentinel UI",
      });
      const parsedFindings = parseFindings(responseText);

      set((state) => ({
        isLoading: false,
        findings: parsedFindings,
        messages: [
          ...state.messages,
          {
            id: createId(),
            kind: "assistant",
            text: responseText,
            findings: parsedFindings,
            createdAt: Date.now(),
          },
        ],
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown API error";
      set((state) => ({
        isLoading: false,
        messages: [
          ...state.messages,
          {
            id: createId(),
            kind: "assistant",
            text: `Request failed: ${errorMessage}`,
            findings: [],
            createdAt: Date.now(),
          },
        ],
      }));
    }
  },
}));
