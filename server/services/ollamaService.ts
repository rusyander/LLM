import { Ollama } from "ollama";
import { config } from "../config.js";
import { ContextSummary } from "../types.js";

export class OllamaService {
  private ollama: Ollama;

  constructor() {
    this.ollama = new Ollama({ host: config.localLlmHost });
  }

  async generate(
    prompt: string,
    model: string = config.defaultExecutorModel,
    context?: ContextSummary,
  ): Promise<string> {
    try {
      let fullPrompt = prompt;

      // Add context if available
      if (context) {
        fullPrompt = this.buildPromptWithContext(prompt, context);
      }

      const response = await this.ollama.generate({
        model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
        },
      });

      return response.response;
    } catch (error) {
      console.error("Ollama generation error:", error);
      throw new Error(`Failed to generate response: ${error}`);
    }
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    model: string = config.defaultExecutorModel,
  ): Promise<string> {
    try {
      const response = await this.ollama.chat({
        model,
        messages,
        stream: false,
      });

      return response.message.content;
    } catch (error) {
      console.error("Ollama chat error:", error);
      throw new Error(`Failed to chat: ${error}`);
    }
  }

  async executeTask(task: string, context?: ContextSummary): Promise<string> {
    const systemPrompt = `## РОЛЬ: EXECUTOR AGENT

Ты - исполнитель задач в гибридной системе разработки. Работаешь под руководством архитектора (Claude).

**Твои обязанности:**
- Генерировать качественный код
- Создавать и модифицировать файлы
- Подготавливать диффы изменений
- Самостоятельно диагностировать проблемы
- Находить решения автономно

**ПРАВИЛА ВЫВОДА КОДА:**
1. Каждый файл - отдельный блок кода
2. Явно указывай путь к файлу
3. НЕ объединяй несколько файлов в один блок
4. Используй формат:
   \`\`\`language:path/to/file.ext
   код здесь
   \`\`\`

**СТРАТЕГИЯ ВЫПОЛНЕНИЯ:**
- Одна микрозадача = один логический шаг
- Не переходи к следующей без успешного завершения текущей
- Логируй каждый шаг
- При ошибке - диагностируй и исправь самостоятельно

**КОНТЕКСТ РАЗГОВОРА:**
${context?.summary || "Новая задача"}

Отвечай на русском языке.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: task },
    ];

    if (context && context.summary) {
      messages.splice(1, 0, {
        role: "system",
        content: `Контекст разговора: ${context.summary}`,
      });
    }

    return this.chat(messages, config.defaultExecutorModel);
  }

  private buildPromptWithContext(
    prompt: string,
    context: ContextSummary,
  ): string {
    return `
Контекст беседы:
${context.summary}

Основные темы: ${context.topics.join(", ")}
Принятые решения: ${context.decisions.slice(-3).join("; ")}
Состояние проекта: ${context.projectState}

Текущий запрос:
${prompt}
    `.trim();
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${config.localLlmHost}/api/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
