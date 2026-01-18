import dotenv from "dotenv";
import { ModelConfig } from "./types.js";

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  localLlmHost: process.env.LOCAL_LLM_HOST || "http://localhost:11434",
  defaultExecutorModel: process.env.DEFAULT_EXECUTOR_MODEL || "qwen3",
  agentMode: (process.env.AGENT_MODE || "hybrid") as "local_only" | "hybrid",
};

export const models: Record<string, ModelConfig> = {
  qwen3: {
    provider: "ollama",
    modelName: "qwen3:latest",
    role: "executor",
    maxContext: 256000,
    status: "operational",
  },
  glm46: {
    provider: "cloud",
    modelName: "glm-4.6",
    role: "executor",
    maxContext: 256000,
    status: "cloud_only",
  },
  claude_sonnet: {
    provider: "anthropic",
    modelName: "claude-sonnet-4.5",
    role: "architect",
    maxContext: 200000,
    status: config.anthropicApiKey ? "operational" : "unavailable",
  },
};
