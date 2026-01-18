import { OllamaService } from "./ollamaService.js";
import { ClaudeService } from "./claudeService.js";
import { ContextManager } from "./contextManager.js";
import {
  AgentRequest,
  AgentResponse,
  ArchitectPlan,
  MicroTask,
} from "../types.js";
import { config } from "../config.js";

export class AgentOrchestrator {
  private ollamaService: OllamaService;
  private claudeService: ClaudeService;
  private contextManager: ContextManager;

  constructor() {
    this.ollamaService = new OllamaService();
    this.claudeService = new ClaudeService();
    this.contextManager = new ContextManager();
  }

  async processRequest(request: AgentRequest): Promise<AgentResponse> {
    try {
      const context = await this.contextManager.getSummary(request.chatId);

      if (request.mode === "local_only") {
        return await this.processLocalOnly(request, context);
      } else {
        return await this.processHybrid(request, context);
      }
    } catch (error) {
      return {
        success: false,
        message: "Ошибка обработки запроса",
        error: String(error),
      };
    }
  }

  private async processLocalOnly(
    request: AgentRequest,
    context: any,
  ): Promise<AgentResponse> {
    try {
      const response = await this.ollamaService.executeTask(
        request.message,
        context,
      );

      return {
        success: true,
        message: response,
      };
    } catch (error) {
      return {
        success: false,
        message: "Ошибка локального выполнения",
        error: String(error),
      };
    }
  }

  private async processHybrid(
    request: AgentRequest,
    context: any,
  ): Promise<AgentResponse> {
    if (!this.claudeService.isAvailable()) {
      console.warn("Claude unavailable, falling back to local-only mode");
      return this.processLocalOnly(request, context);
    }

    try {
      // Phase 1: Architect analyzes and creates plan
      const plan = await this.claudeService.architect(request.message, context);

      // Phase 2: Execute tasks with local model
      const executionResults = await this.executeTasks(plan.tasks, context);

      // Phase 3: Review results with Claude
      const codeToReview = this.extractCodeFromResults(executionResults);
      const review = await this.claudeService.review(codeToReview, context);

      // Phase 4: Fix issues if needed
      const finalResults = await this.applyFixes(executionResults, review);

      return {
        success: true,
        message: this.formatHybridResponse(plan, finalResults, review),
        data: {
          plan,
          executionResults: finalResults,
          review,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Ошибка гибридного выполнения",
        error: String(error),
      };
    }
  }

  private async executeTasks(
    tasks: MicroTask[],
    context: any,
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const task of tasks) {
      try {
        task.status = "in-progress";
        const result = await this.ollamaService.executeTask(
          task.description,
          context,
        );
        task.status = "completed";
        task.result = result;
        results.set(task.id, result);
      } catch (error) {
        task.status = "failed";
        results.set(task.id, `Error: ${error}`);
      }
    }

    return results;
  }

  private extractCodeFromResults(results: Map<string, string>): string {
    const codeBlocks: string[] = [];

    for (const [taskId, result] of results) {
      const codeBlockRegex = /```[\s\S]*?```/g;
      const matches = result.match(codeBlockRegex);
      if (matches) {
        codeBlocks.push(...matches);
      }
    }

    return codeBlocks.join("\n\n");
  }

  private async applyFixes(
    results: Map<string, string>,
    review: string,
  ): Promise<Map<string, string>> {
    // Check if review contains critical issues
    if (!review.toLowerCase().includes("critical")) {
      return results;
    }

    // In a real implementation, we would:
    // 1. Parse the review to extract specific issues
    // 2. Create fix tasks
    // 3. Re-execute with fixes
    // For now, just return original results
    return results;
  }

  private formatHybridResponse(
    plan: ArchitectPlan,
    results: Map<string, string>,
    review: string,
  ): string {
    let response = `## План архитектора\n${plan.overview}\n\n`;

    response += `### Архитектура\n${plan.architecture.map((a) => `- ${a}`).join("\n")}\n\n`;

    response += `### Результаты выполнения\n`;
    for (const [taskId, result] of results) {
      response += `\n#### ${taskId}\n${result}\n`;
    }

    response += `\n### Ревью\n${review}\n`;

    return response;
  }

  getContextManager(): ContextManager {
    return this.contextManager;
  }

  async checkHealth(): Promise<{ ollama: boolean; claude: boolean }> {
    return {
      ollama: await this.ollamaService.checkHealth(),
      claude: this.claudeService.isAvailable(),
    };
  }
}
