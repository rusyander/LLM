export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  chatId: string;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  summary?: string;
}

export interface ContextSummary {
  chatId: string;
  summary: string;
  topics: string[];
  decisions: string[];
  codeChanges: string[];
  projectState: string;
  unresolvedIssues: string[];
  lastUpdated: number;
}

export type AgentMode = "local_only" | "hybrid";

export interface AppConfig {
  mode: AgentMode;
  models: {
    executor: string;
    claudeAvailable: boolean;
  };
}
