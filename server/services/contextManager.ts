import fs from "fs/promises";
import path from "path";
import { ContextSummary, Message } from "../types.js";

const STORAGE_DIR = path.join(process.cwd(), "context_storage");

export class ContextManager {
  private summaries: Map<string, ContextSummary> = new Map();

  constructor() {
    this.initStorage();
  }

  private async initStorage() {
    try {
      await fs.mkdir(STORAGE_DIR, { recursive: true });
      await this.loadSummaries();
    } catch (error) {
      console.error("Failed to initialize storage:", error);
    }
  }

  private async loadSummaries() {
    try {
      const files = await fs.readdir(STORAGE_DIR);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = await fs.readFile(
            path.join(STORAGE_DIR, file),
            "utf-8",
          );
          const summary: ContextSummary = JSON.parse(content);
          this.summaries.set(summary.chatId, summary);
        }
      }
    } catch (error) {
      console.error("Failed to load summaries:", error);
    }
  }

  async getSummary(chatId: string): Promise<ContextSummary | null> {
    return this.summaries.get(chatId) || null;
  }

  async updateSummary(
    chatId: string,
    messages: Message[],
    assistantResponse: string,
  ) {
    const existing =
      this.summaries.get(chatId) || this.createEmptySummary(chatId);

    // Extract key information from the conversation
    const topics = this.extractTopics(messages);
    const decisions = this.extractDecisions(assistantResponse);
    const codeChanges = this.extractCodeChanges(assistantResponse);

    const updated: ContextSummary = {
      ...existing,
      summary: this.generateSummary(messages, assistantResponse),
      topics: [...new Set([...existing.topics, ...topics])].slice(-10),
      decisions: [...existing.decisions, ...decisions].slice(-20),
      codeChanges: [...existing.codeChanges, ...codeChanges].slice(-20),
      projectState: this.extractProjectState(assistantResponse),
      unresolvedIssues: this.extractUnresolvedIssues(messages),
      lastUpdated: Date.now(),
    };

    this.summaries.set(chatId, updated);
    await this.saveSummary(updated);
    return updated;
  }

  private createEmptySummary(chatId: string): ContextSummary {
    return {
      chatId,
      summary: "",
      topics: [],
      decisions: [],
      codeChanges: [],
      projectState: "Initial state",
      unresolvedIssues: [],
      lastUpdated: Date.now(),
    };
  }

  private generateSummary(messages: Message[], response: string): string {
    const recentMessages = messages.slice(-5);
    const userMessages = recentMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content);

    return `Recent discussion: ${userMessages.join("; ")}. Latest response: ${response.slice(0, 200)}...`;
  }

  private extractTopics(messages: Message[]): string[] {
    const topics: string[] = [];
    const keywords = [
      "создать",
      "добавить",
      "исправить",
      "удалить",
      "изменить",
      "рефакторинг",
    ];

    messages.forEach((msg) => {
      keywords.forEach((keyword) => {
        if (msg.content.toLowerCase().includes(keyword)) {
          topics.push(keyword);
        }
      });
    });

    return topics;
  }

  private extractDecisions(response: string): string[] {
    const decisions: string[] = [];
    const lines = response.split("\n");

    lines.forEach((line) => {
      if (
        line.includes("решено") ||
        line.includes("выбрано") ||
        line.includes("используем")
      ) {
        decisions.push(line.trim());
      }
    });

    return decisions;
  }

  private extractCodeChanges(response: string): string[] {
    const changes: string[] = [];
    const codeBlockRegex = /```[\s\S]*?```/g;
    const matches = response.match(codeBlockRegex);

    if (matches) {
      matches.forEach((block) => {
        const firstLine = block.split("\n")[0];
        changes.push(`Modified: ${firstLine}`);
      });
    }

    return changes;
  }

  private extractProjectState(response: string): string {
    if (response.includes("завершено")) return "Task completed";
    if (response.includes("в процессе")) return "In progress";
    if (response.includes("ошибка")) return "Error state";
    return "Stable";
  }

  private extractUnresolvedIssues(messages: Message[]): string[] {
    const issues: string[] = [];
    messages.forEach((msg) => {
      if (msg.content.includes("проблема") || msg.content.includes("ошибка")) {
        issues.push(msg.content.slice(0, 100));
      }
    });
    return issues.slice(-5);
  }

  private async saveSummary(summary: ContextSummary) {
    try {
      const filename = `chat_${summary.chatId}_summary.json`;
      await fs.writeFile(
        path.join(STORAGE_DIR, filename),
        JSON.stringify(summary, null, 2),
        "utf-8",
      );
    } catch (error) {
      console.error("Failed to save summary:", error);
    }
  }

  async clearChatContext(chatId: string): Promise<boolean> {
    try {
      this.summaries.delete(chatId);
      const filename = `chat_${chatId}_summary.json`;
      await fs.unlink(path.join(STORAGE_DIR, filename));
      return true;
    } catch (error) {
      console.error("Failed to clear chat context:", error);
      return false;
    }
  }

  async clearAllContexts(): Promise<boolean> {
    try {
      this.summaries.clear();
      const files = await fs.readdir(STORAGE_DIR);
      for (const file of files) {
        await fs.unlink(path.join(STORAGE_DIR, file));
      }
      return true;
    } catch (error) {
      console.error("Failed to clear all contexts:", error);
      return false;
    }
  }
}
