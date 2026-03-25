export interface AgentApiRequest {
  text: string;
  userId: string;
  userName: string;
}

interface AgentApiContent {
  text?: string;
}

interface AgentApiMessage {
  text?: string;
  content?: AgentApiContent;
}

type AgentApiResponse = AgentApiMessage | AgentApiMessage[];

const getApiBase = (): string => {
  if (import.meta.env.DEV) {
    return "/api";
  }
  return import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
};

const extractResponseText = (payload: AgentApiResponse): string => {
  const message = Array.isArray(payload) ? payload[0] : payload;
  return message?.text ?? message?.content?.text ?? "No response text returned by agent.";
};

export const sendAgentMessage = async (agentId: string, request: AgentApiRequest): Promise<string> => {
  const base = getApiBase();
  const response = await fetch(`${base}/${agentId}/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Agent API error ${response.status}`);
  }

  const payload = (await response.json()) as AgentApiResponse;
  return extractResponseText(payload);
};
