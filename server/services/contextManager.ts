import fs from "fs/promises";
import path from "path";
import { Message } from "../types.js";

const STORAGE_DIR = path.join(process.cwd(), "context_storage");

// Enhanced schemas based on DATA_SCHEMAS.md
export interface ChatHistory {
  version: string;
  chatId: string;
  messages: HistoryMessage[];
  createdAt: string;
  lastModified: string;
  messageCount: number;
  totalTokens: number;
}

export interface HistoryMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  model: string | null;
  tokenCount?: number;
  processingTime?: number;
  attachments?: Attachment[];
  metadata?: MessageMetadata;
}

export interface Attachment {
  id: string;
  type: "file" | "image" | "code" | "voice";
  name: string;
  path: string;
  size: number;
  mimeType: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface MessageMetadata {
  voiceInputId?: string;
  imageGenerationId?: string;
  error?: string;
  retryCount?: number;
}

export interface ContextSummary {
  version: string;
  chatId: string;
  summary: string;
  keyPoints: string[];
  entities: EntityMap;
  recentMessages: SummaryMessage[];
  tokenCount: number;
  lastSummarized: string;
  summarizationTrigger: "auto" | "manual" | "threshold";
  compressionRatio: number;
}

export interface EntityMap {
  technologies: string[];
  files: string[];
  decisions: Decision[];
  tasks: Task[];
  codeReferences: CodeReference[];
  issues: Issue[];
}

export interface Decision {
  id: string;
  description: string;
  rationale: string;
  timestamp: string;
  tags: string[];
}

export interface Task {
  id: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "blocked";
  createdAt: string;
  completedAt?: string;
}

export interface CodeReference {
  type: "function" | "class" | "component" | "file";
  name: string;
  file?: string;
  description?: string;
}

export interface Issue {
  id: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt?: string;
}

export interface SummaryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  model: string | null;
  tokenCount: number;
}

export interface ChatMetadata {
  version: string;
  chatId: string;
  title: string;
  createdAt: string;
  lastAccessed: string;
  lastModified: string;
  statistics: ChatStatistics;
  settings: ChatSettings;
  tags: string[];
  pinned: boolean;
  archived: boolean;
}

export interface ChatStatistics {
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  totalTokens: number;
  totalProcessingTime: number;
  averageResponseTime: number;
  modelUsage: Record<string, number>;
  attachmentCount: number;
  voiceInputCount: number;
  imageGenerationCount: number;
  summarizationCount: number;
  errorCount: number;
}

export interface ChatSettings {
  preferredModel: "qwen3" | "claude" | "auto";
  temperature: number;
  maxTokens: number;
  autoSummarize: boolean;
  summarizationThreshold: number;
  voiceInputEnabled: boolean;
  imageGenerationEnabled: boolean;
  previewEnabled: boolean;
  systemPrompt?: string;
  contextWindow: number;
}

/**
 * Enhanced Context Manager implementing the three-file system:
 * - history.json: Complete immutable message history
 * - summary.json: Condensed context for LLM inference
 * - metadata.json: Chat properties and settings
 */
export class ContextManager {
  private summaries: Map<string, ContextSummary> = new Map();
  private metadata: Map<string, ChatMetadata> = new Map();

  constructor() {
    this.initStorage();
  }

  private async initStorage() {
    try {
      await fs.mkdir(STORAGE_DIR, { recursive: true });
      await this.loadAllChats();
    } catch (error) {
      console.error("Failed to initialize storage:", error);
    }
  }

  private async loadAllChats() {
    try {
      const dirs = await fs.readdir(STORAGE_DIR);
      for (const dir of dirs) {
        if (dir.startsWith("chat_")) {
          const chatId = dir.replace("chat_", "");
          await this.loadChatData(chatId);
        }
      }
    } catch (error) {
      console.error("Failed to load chats:", error);
    }
  }

  private async loadChatData(chatId: string) {
    try {
      const chatDir = this.getChatDir(chatId);

      // Load summary
      try {
        const summaryPath = path.join(chatDir, "summary.json");
        const summaryContent = await fs.readFile(summaryPath, "utf-8");
        const summary: ContextSummary = JSON.parse(summaryContent);
        this.summaries.set(chatId, summary);
      } catch {}

      // Load metadata
      try {
        const metadataPath = path.join(chatDir, "metadata.json");
        const metadataContent = await fs.readFile(metadataPath, "utf-8");
        const meta: ChatMetadata = JSON.parse(metadataContent);
        this.metadata.set(chatId, meta);
      } catch {}
    } catch (error) {
      console.error(`Failed to load chat data for ${chatId}:`, error);
    }
  }

  private getChatDir(chatId: string): string {
    return path.join(STORAGE_DIR, `chat_${chatId}`);
  }

  private async ensureChatDir(chatId: string): Promise<void> {
    const chatDir = this.getChatDir(chatId);
    await fs.mkdir(chatDir, { recursive: true });
    await fs.mkdir(path.join(chatDir, "artifacts"), { recursive: true });
    await fs.mkdir(path.join(chatDir, "artifacts", "images"), {
      recursive: true,
    });
    await fs.mkdir(path.join(chatDir, "artifacts", "code"), {
      recursive: true,
    });
    await fs.mkdir(path.join(chatDir, "artifacts", "documents"), {
      recursive: true,
    });
    await fs.mkdir(path.join(chatDir, "voice_transcripts"), {
      recursive: true,
    });
  }

  /**
   * Get summary for LLM inference
   */
  async getSummary(chatId: string): Promise<ContextSummary | null> {
    return this.summaries.get(chatId) || null;
  }

  /**
   * Get metadata for a chat
   */
  async getMetadata(chatId: string): Promise<ChatMetadata | null> {
    return this.metadata.get(chatId) || null;
  }

  /**
   * Get complete message history
   */
  async getHistory(chatId: string): Promise<ChatHistory | null> {
    try {
      const chatDir = this.getChatDir(chatId);
      const historyPath = path.join(chatDir, "history.json");
      const content = await fs.readFile(historyPath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * Initialize a new chat with all three files
   */
  async initializeChat(chatId: string, title: string): Promise<void> {
    await this.ensureChatDir(chatId);

    const now = new Date().toISOString();

    // Initialize history
    const history: ChatHistory = {
      version: "1.0.0",
      chatId,
      messages: [],
      createdAt: now,
      lastModified: now,
      messageCount: 0,
      totalTokens: 0,
    };
    await this.saveHistory(chatId, history);

    // Initialize summary
    const summary: ContextSummary = {
      version: "1.0.0",
      chatId,
      summary: "",
      keyPoints: [],
      entities: {
        technologies: [],
        files: [],
        decisions: [],
        tasks: [],
        codeReferences: [],
        issues: [],
      },
      recentMessages: [],
      tokenCount: 0,
      lastSummarized: now,
      summarizationTrigger: "manual",
      compressionRatio: 1.0,
    };
    this.summaries.set(chatId, summary);
    await this.saveSummary(chatId, summary);

    // Initialize metadata
    const metadata: ChatMetadata = {
      version: "1.0.0",
      chatId,
      title,
      createdAt: now,
      lastAccessed: now,
      lastModified: now,
      statistics: {
        messageCount: 0,
        userMessageCount: 0,
        assistantMessageCount: 0,
        totalTokens: 0,
        totalProcessingTime: 0,
        averageResponseTime: 0,
        modelUsage: {},
        attachmentCount: 0,
        voiceInputCount: 0,
        imageGenerationCount: 0,
        summarizationCount: 0,
        errorCount: 0,
      },
      settings: {
        preferredModel: "qwen3",
        temperature: 0.7,
        maxTokens: 4096,
        autoSummarize: true,
        summarizationThreshold: 8000,
        voiceInputEnabled: true,
        imageGenerationEnabled: true,
        previewEnabled: true,
        contextWindow: 8000,
      },
      tags: [],
      pinned: false,
      archived: false,
    };
    this.metadata.set(chatId, metadata);
    await this.saveMetadata(chatId, metadata);
  }

  /**
   * Add a message to history
   */
  async addMessage(chatId: string, message: HistoryMessage): Promise<void> {
    const history =
      (await this.getHistory(chatId)) ||
      (await this.createEmptyHistory(chatId));

    history.messages.push(message);
    history.messageCount = history.messages.length;
    history.totalTokens += message.tokenCount || 0;
    history.lastModified = new Date().toISOString();

    await this.saveHistory(chatId, history);

    // Update metadata statistics
    await this.updateStatistics(chatId, message);

    // Check if summarization is needed
    const metadata = this.metadata.get(chatId);
    if (metadata?.settings.autoSummarize) {
      if (history.totalTokens >= metadata.settings.summarizationThreshold) {
        await this.autoSummarize(chatId);
      }
    }
  }

  /**
   * Update summary (manual or auto)
   */
  async updateSummary(
    chatId: string,
    claudeSummaryFn: (history: ChatHistory) => Promise<string>,
  ): Promise<void> {
    const history = await this.getHistory(chatId);
    if (!history) return;

    // Call Claude to generate summary
    const summaryText = await claudeSummaryFn(history);

    // Extract entities and key points
    const summary =
      this.summaries.get(chatId) || (await this.createEmptySummary(chatId));

    summary.summary = summaryText;
    summary.keyPoints = this.extractKeyPoints(summaryText);
    summary.entities = this.extractEntities(history, summaryText);
    summary.recentMessages = history.messages.slice(-10).map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      timestamp: m.timestamp,
      model: m.model,
      tokenCount: m.tokenCount || 0,
    }));
    summary.tokenCount = this.estimateTokenCount(summaryText);
    summary.lastSummarized = new Date().toISOString();
    summary.compressionRatio = summary.tokenCount / history.totalTokens;

    this.summaries.set(chatId, summary);
    await this.saveSummary(chatId, summary);

    // Update metadata
    const metadata = this.metadata.get(chatId);
    if (metadata) {
      metadata.statistics.summarizationCount++;
      await this.saveMetadata(chatId, metadata);
    }
  }

  /**
   * Clear chat context (delete history and summary, keep metadata)
   */
  async clearChatContext(chatId: string): Promise<boolean> {
    try {
      const chatDir = this.getChatDir(chatId);

      // Delete history
      try {
        await fs.unlink(path.join(chatDir, "history.json"));
      } catch {}

      // Delete summary
      try {
        await fs.unlink(path.join(chatDir, "summary.json"));
      } catch {}

      this.summaries.delete(chatId);

      // Reinitialize empty history and summary
      const metadata = this.metadata.get(chatId);
      if (metadata) {
        await this.initializeChat(chatId, metadata.title);
      }

      return true;
    } catch (error) {
      console.error("Failed to clear chat context:", error);
      return false;
    }
  }

  /**
   * Clear all contexts
   */
  async clearAllContexts(): Promise<boolean> {
    try {
      const dirs = await fs.readdir(STORAGE_DIR);
      for (const dir of dirs) {
        if (dir.startsWith("chat_")) {
          const chatId = dir.replace("chat_", "");
          await this.clearChatContext(chatId);
        }
      }
      return true;
    } catch (error) {
      console.error("Failed to clear all contexts:", error);
      return false;
    }
  }

  /**
   * Delete entire chat including all files
   */
  async deleteChat(chatId: string): Promise<boolean> {
    try {
      const chatDir = this.getChatDir(chatId);
      await fs.rm(chatDir, { recursive: true, force: true });
      this.summaries.delete(chatId);
      this.metadata.delete(chatId);
      return true;
    } catch (error) {
      console.error("Failed to delete chat:", error);
      return false;
    }
  }

  // Private helper methods

  private async createEmptyHistory(chatId: string): Promise<ChatHistory> {
    const now = new Date().toISOString();
    return {
      version: "1.0.0",
      chatId,
      messages: [],
      createdAt: now,
      lastModified: now,
      messageCount: 0,
      totalTokens: 0,
    };
  }

  private async createEmptySummary(chatId: string): Promise<ContextSummary> {
    const now = new Date().toISOString();
    return {
      version: "1.0.0",
      chatId,
      summary: "",
      keyPoints: [],
      entities: {
        technologies: [],
        files: [],
        decisions: [],
        tasks: [],
        codeReferences: [],
        issues: [],
      },
      recentMessages: [],
      tokenCount: 0,
      lastSummarized: now,
      summarizationTrigger: "manual",
      compressionRatio: 1.0,
    };
  }

  private async saveHistory(
    chatId: string,
    history: ChatHistory,
  ): Promise<void> {
    try {
      const chatDir = this.getChatDir(chatId);
      const historyPath = path.join(chatDir, "history.json");
      await fs.writeFile(
        historyPath,
        JSON.stringify(history, null, 2),
        "utf-8",
      );
    } catch (error) {
      console.error("Failed to save history:", error);
    }
  }

  private async saveSummary(
    chatId: string,
    summary: ContextSummary,
  ): Promise<void> {
    try {
      const chatDir = this.getChatDir(chatId);
      const summaryPath = path.join(chatDir, "summary.json");
      await fs.writeFile(
        summaryPath,
        JSON.stringify(summary, null, 2),
        "utf-8",
      );
    } catch (error) {
      console.error("Failed to save summary:", error);
    }
  }

  private async saveMetadata(
    chatId: string,
    metadata: ChatMetadata,
  ): Promise<void> {
    try {
      const chatDir = this.getChatDir(chatId);
      const metadataPath = path.join(chatDir, "metadata.json");
      await fs.writeFile(
        metadataPath,
        JSON.stringify(metadata, null, 2),
        "utf-8",
      );
    } catch (error) {
      console.error("Failed to save metadata:", error);
    }
  }

  private async updateStatistics(
    chatId: string,
    message: HistoryMessage,
  ): Promise<void> {
    const metadata = this.metadata.get(chatId);
    if (!metadata) return;

    metadata.statistics.messageCount++;
    if (message.role === "user") {
      metadata.statistics.userMessageCount++;
    } else if (message.role === "assistant") {
      metadata.statistics.assistantMessageCount++;
      if (message.model) {
        metadata.statistics.modelUsage[message.model] =
          (metadata.statistics.modelUsage[message.model] || 0) + 1;
      }
      if (message.processingTime) {
        metadata.statistics.totalProcessingTime += message.processingTime;
        metadata.statistics.averageResponseTime =
          metadata.statistics.totalProcessingTime /
          metadata.statistics.assistantMessageCount;
      }
    }

    metadata.statistics.totalTokens += message.tokenCount || 0;
    metadata.statistics.attachmentCount += message.attachments?.length || 0;
    metadata.lastModified = new Date().toISOString();
    metadata.lastAccessed = new Date().toISOString();

    await this.saveMetadata(chatId, metadata);
  }

  private async autoSummarize(chatId: string): Promise<void> {
    // This will be called with a Claude service function in the orchestrator
    console.log(`Auto-summarization triggered for chat ${chatId}`);
  }

  private extractKeyPoints(summaryText: string): string[] {
    const lines = summaryText.split("\n");
    const keyPoints: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        keyPoints.push(trimmed.substring(2));
      }
    }

    return keyPoints.slice(0, 10);
  }

  private extractEntities(
    history: ChatHistory,
    summaryText: string,
  ): EntityMap {
    const text =
      summaryText + " " + history.messages.map((m) => m.content).join(" ");

    // Simple extraction (can be enhanced with NLP)
    const technologies = this.extractTechnologies(text);
    const files = this.extractFiles(history.messages);
    const codeReferences = this.extractCodeReferences(history.messages);

    return {
      technologies,
      files,
      decisions: [], // Will be populated by Claude
      tasks: [],
      codeReferences,
      issues: [],
    };
  }

  private extractTechnologies(text: string): string[] {
    const techKeywords = [
      "React",
      "TypeScript",
      "Node.js",
      "Express",
      "Python",
      "JavaScript",
      "CSS",
      "HTML",
      "Vite",
      "Ollama",
      "Claude",
      "Zustand",
      "PostgreSQL",
      "MongoDB",
      "Docker",
      "Git",
      "Stable Diffusion",
      "API",
    ];

    const found = new Set<string>();
    for (const tech of techKeywords) {
      if (text.includes(tech)) {
        found.add(tech);
      }
    }

    return Array.from(found);
  }

  private extractFiles(messages: HistoryMessage[]): string[] {
    const fileRegex = /[\w-]+\.(ts|tsx|js|jsx|py|json|css|html|md|txt)/gi;
    const files = new Set<string>();

    for (const msg of messages) {
      const matches = msg.content.match(fileRegex);
      if (matches) {
        matches.forEach((file) => files.add(file));
      }
    }

    return Array.from(files);
  }

  private extractCodeReferences(messages: HistoryMessage[]): CodeReference[] {
    const references: CodeReference[] = [];
    const componentRegex = /(?:component|function|class)\s+(\w+)/gi;

    for (const msg of messages) {
      let match;
      while ((match = componentRegex.exec(msg.content)) !== null) {
        references.push({
          type: "component",
          name: match[1],
          description: `Mentioned in chat`,
        });
      }
    }

    return references.slice(0, 20);
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Build context for LLM inference
   * Returns summary + recent messages
   */
  async buildInferenceContext(chatId: string): Promise<string> {
    const summary = await this.getSummary(chatId);
    if (!summary) return "";

    let context = `## Context Summary\n${summary.summary}\n\n`;

    if (summary.keyPoints.length > 0) {
      context += `## Key Points\n${summary.keyPoints.map((p) => `- ${p}`).join("\n")}\n\n`;
    }

    if (summary.entities.technologies.length > 0) {
      context += `## Technologies: ${summary.entities.technologies.join(", ")}\n\n`;
    }

    if (summary.recentMessages.length > 0) {
      context += `## Recent Messages\n`;
      for (const msg of summary.recentMessages) {
        context += `**${msg.role}**: ${msg.content}\n\n`;
      }
    }

    return context;
  }
}
