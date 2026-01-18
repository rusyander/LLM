import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { ContextSummary, ArchitectPlan } from "../types.js";

export class ClaudeService {
  private client: Anthropic | null = null;

  constructor() {
    if (config.anthropicApiKey) {
      this.client = new Anthropic({
        apiKey: config.anthropicApiKey,
      });
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async architect(
    request: string,
    context?: ContextSummary,
  ): Promise<ArchitectPlan> {
    if (!this.client) {
      throw new Error("Claude service not available. Check ANTHROPIC_API_KEY.");
    }

    const systemPrompt = `## РОЛЬ И ИДЕНТИЧНОСТЬ
Ты - **Architect Agent** в гибридной автономной системе разработки. Ты работаешь вместе с локальными LLM (Qwen3) для создания программных решений. Твоя основная роль - **архитектурное проектирование, декомпозиция задач, ревью кода и управление контекстом**.

## ОСНОВНЫЕ ВОЗМОЖНОСТИ

### 1. УПРАВЛЕНИЕ КОНТЕКСТОМ
- Поддерживай сводки беседы для каждого чата
- После каждого ответа обновляй контекст с:
  - Основными обсуждаемыми темами
  - Принятыми решениями
  - Применёнными изменениями кода
  - Текущим состоянием проекта
  - Нерешёнными вопросами

### 2. ИНТЕГРАЦИЯ С ГОЛОСОВЫМ ВВОДОМ
- Пользователь может отправлять сообщения, транскрибированные из голоса
- Понимай намерение независимо от стиля речи (разговорный, технический, фрагментированный)

### 3. ГИБРИДНЫЙ WORKFLOW
Ты работаешь с локальным исполнителем (Qwen3 через Ollama):

**Стандартный рабочий процесс:**
1. **Анализируй** запрос пользователя
2. **Проектируй** архитектуру и выбирай технологии
3. **Декомпозируй** на микрозадачи
4. **Делегируй** локальному исполнителю (Qwen3)
5. **Проверяй** вывод исполнителя
6. **Предоставляй** обратную связь или одобряй
7. **Обновляй** сводку контекста

## ПРАВИЛА ДЕКОМПОЗИЦИИ ЗАДАЧ

При декомпозиции задач:
- Разбивай на **атомарные микрозадачи** (один логический шаг каждая)
- Каждая микрозадача должна быть **независимо выполнима**
- Предоставляй **чёткие критерии приёмки**
- Указывай **пути к файлам явно**
- Никогда не объединяй несколько задач в одну

## АВТОНОМНОЕ РЕШЕНИЕ ПРОБЛЕМ

Ты должен:
- **Диагностировать проблемы** самостоятельно
- **Предлагать решения** без ожидания указаний пользователя
- **Самокорректироваться** при обнаружении ошибок
- **Адаптировать подходы** когда начальные планы не работают

Отвечай на русском языке.

Формат ответа должен содержать:
1. Обзор (overview) - краткое описание задачи
2. Архитектура (architecture) - список архитектурных решений
3. Модули (modules) - спис## ПРОТОКОЛ РЕВЬЮ КОДА

Ты - ревьюер кода в гибридной системе разработки.

**Проверяй на:**
- ✅ Соответствие архитектуре
- ✅ Соблюдение best practices
- ✅ Уязвимости безопасности
- ✅ Проблемы производительности
- ✅ Читаемость кода
- ✅ Правильную обработку ошибок

**Формат вывода:**
\`\`\`
REVIEW SUMMARY:
[CRITICAL] Описание проблемы + предложение по исправлению
[WARNING] Описание проблемы + рекомендация
[INFO] Предложение по улучшению

APPROVAL STATUS: [APPROVED / NEEDS REVISION]
\`\`\`


Отвечай в формате JSON.`;

    let userPrompt = request;
    if (context) {
      userPrompt = `
Контекст беседы: ${context.summary}
Состояние проекта: ${context.projectState}

Запрос: ${request}
      `.trim();
    }

    try {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type");
      }

      return this.parsePlan(content.text);
    } catch (error) {
      console.error("Claude architect error:", error);
      throw new Error(`Failed to create architecture plan: ${error}`);
    }
  }

  async review(code: string, context?: ContextSummary): Promise<string> {
    if (!this.client) {
      throw new Error("Claude service not available. Check ANTHROPIC_API_KEY.");
    }

    const systemPrompt = `Ты - ревьюер кода. 
Твоя задача - находить ошибки, проблемы с читаемостью и предлагать улучшения.
Отвечай на русском языке.

Используй уровни серьезности:
- info: информационное замечание
- warning: предупреждение
- critical: критическая проблема`;

    let userPrompt = `Проверь следующий код:\n\n${code}`;
    if (context) {
      userPrompt += `\n\nКонтекст проекта: ${context.projectState}`;
    }

    try {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type");
      }

      return content.text;
    } catch (error) {
      console.error("Claude review error:", error);
      throw new Error(`Failed to review code: ${error}`);
    }
  }

  async updateContextSummary(messages: string[]): Promise<string> {
    if (!this.client) {
      return messages.slice(-3).join(" ");
    }

    const systemPrompt = `Создай краткую сводку беседы, выделив:
- Основные обсуждаемые темы
- Принятые решения
- Изменения в коде
- Текущее состояние проекта
- Нерешенные вопросы

Отвечай на русском языке. Максимум 2000 символов.`;

    try {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: messages.join("\n\n---\n\n"),
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type");
      }

      return content.text;
    } catch (error) {
      console.error("Claude summary error:", error);
      return messages.slice(-3).join(" ");
    }
  }

  private parsePlan(response: string): ArchitectPlan {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch =
        response.match(/```json\n([\s\S]*?)\n```/) ||
        response.match(/```\n([\s\S]*?)\n```/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try direct JSON parse
      return JSON.parse(response);
    } catch (error) {
      // Fallback: parse structured text
      return {
        overview:
          this.extractSection(response, "overview") || "План разработки",
        architecture: this.extractList(response, "architecture"),
        modules: this.extractList(response, "modules"),
        tasks: this.extractTasks(response),
      };
    }
  }

  private extractSection(text: string, section: string): string {
    const regex = new RegExp(`${section}[:\\s]+([^\\n]+)`, "i");
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  }

  private extractList(text: string, section: string): string[] {
    const lines = text.split("\n");
    const items: string[] = [];
    let inSection = false;

    for (const line of lines) {
      if (line.toLowerCase().includes(section)) {
        inSection = true;
        continue;
      }
      if (inSection && line.match(/^-\s+|^\d+\.\s+/)) {
        items.push(line.replace(/^-\s+|^\d+\.\s+/, "").trim());
      } else if (inSection && line.trim() === "") {
        break;
      }
    }

    return items;
  }

  private extractTasks(text: string): Array<any> {
    const taskList = this.extractList(text, "tasks");
    return taskList.map((task, index) => ({
      id: `task-${index + 1}`,
      description: task,
      status: "pending",
      dependencies: [],
    }));
  }
}
