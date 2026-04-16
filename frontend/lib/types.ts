export type SSEEventType =
  | "agent_start"
  | "agent_log"
  | "agent_done"
  | "message_chunk"
  | "message_done"
  | "error";

export interface SSEEvent {
  type: SSEEventType;
  agent?: string;
  content?: string;
}

export interface AgentStep {
  agent: string;
  label: string;
  status: "running" | "done";
  logs: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  steps: AgentStep[];
  streaming: boolean;
}
