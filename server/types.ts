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

export interface AgentRequest {
  chatId: string;
  message: string;
  mode: "local_only" | "hybrid";
  agentType: "architect" | "executor" | "reviewer";
  context?: ContextSummary;
}

export interface AgentResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface ArchitectPlan {
  overview: string;
  architecture: string[];
  modules: string[];
  tasks: MicroTask[];
}

export interface MicroTask {
  id: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  dependencies: string[];
  result?: any;
}

export interface ModelConfig {
  provider: "ollama" | "anthropic" | "cloud";
  modelName: string;
  role: "architect" | "executor" | "reviewer";
  maxContext: number;
  status: "operational" | "cloud_only" | "unavailable";
}
