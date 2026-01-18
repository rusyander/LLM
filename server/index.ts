import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { AgentOrchestrator } from "./services/agentOrchestrator.js";
import { FileManager } from "./services/fileManager.js";
import { Message, Chat } from "./types.js";

const app = express();
const orchestrator = new AgentOrchestrator();
const fileManager = new FileManager();

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// In-memory storage for messages and chats
const chats = new Map<string, Chat>();
const messages = new Map<string, Message[]>();

// Routes
app.get("/api/health", async (req, res) => {
  const health = await orchestrator.checkHealth();
  res.json({
    status: "ok",
    services: health,
    mode: config.agentMode,
  });
});

app.get("/api/chats", (req, res) => {
  const chatList = Array.from(chats.values()).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
  res.json(chatList);
});

app.post("/api/chats", (req, res) => {
  const { title } = req.body;
  const chat: Chat = {
    id: `chat-${Date.now()}`,
    title: title || "Новый чат",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  chats.set(chat.id, chat);
  messages.set(chat.id, []);
  res.json(chat);
});

app.get("/api/chats/:chatId", (req, res) => {
  const { chatId } = req.params;
  const chat = chats.get(chatId);
  if (!chat) {
    return res.status(404).json({ error: "Chat not found" });
  }
  res.json(chat);
});

app.delete("/api/chats/:chatId", async (req, res) => {
  const { chatId } = req.params;
  chats.delete(chatId);
  messages.delete(chatId);
  await orchestrator.getContextManager().clearChatContext(chatId);
  res.json({ success: true });
});

app.get("/api/chats/:chatId/messages", (req, res) => {
  const { chatId } = req.params;
  const chatMessages = messages.get(chatId) || [];
  res.json(chatMessages);
});

app.post("/api/chats/:chatId/messages", async (req, res) => {
  const { chatId } = req.params;
  const { content, mode = config.agentMode } = req.body;

  if (!chats.has(chatId)) {
    return res.status(404).json({ error: "Chat not found" });
  }

  // Add user message
  const userMessage: Message = {
    id: `msg-${Date.now()}`,
    role: "user",
    content,
    timestamp: Date.now(),
    chatId,
  };

  const chatMessages = messages.get(chatId) || [];
  chatMessages.push(userMessage);
  messages.set(chatId, chatMessages);

  // Update chat
  const chat = chats.get(chatId)!;
  chat.updatedAt = Date.now();

  // Process with agent
  try {
    const response = await orchestrator.processRequest({
      chatId,
      message: content,
      mode,
      agentType: "executor",
    });

    // Add assistant message
    const assistantMessage: Message = {
      id: `msg-${Date.now() + 1}`,
      role: "assistant",
      content: response.message,
      timestamp: Date.now(),
      chatId,
    };

    chatMessages.push(assistantMessage);

    // Update context summary
    await orchestrator
      .getContextManager()
      .updateSummary(chatId, chatMessages, response.message);

    res.json({
      userMessage,
      assistantMessage,
      data: response.data,
    });
  } catch (error) {
    console.error("Error processing message:", error);
    res.status(500).json({ error: String(error) });
  }
});

app.get("/api/chats/:chatId/context", async (req, res) => {
  const { chatId } = req.params;
  const context = await orchestrator.getContextManager().getSummary(chatId);
  res.json(context);
});

app.delete("/api/chats/:chatId/context", async (req, res) => {
  const { chatId } = req.params;
  const success = await orchestrator
    .getContextManager()
    .clearChatContext(chatId);
  res.json({ success });
});

app.delete("/api/context/all", async (req, res) => {
  const success = await orchestrator.getContextManager().clearAllContexts();
  res.json({ success });
});

app.post("/api/agent/architect", async (req, res) => {
  const { chatId, message } = req.body;

  try {
    const context = await orchestrator.getContextManager().getSummary(chatId);
    const response = await orchestrator.processRequest({
      chatId,
      message,
      mode: "hybrid",
      agentType: "architect",
      context: context || undefined,
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get("/api/config", (req, res) => {
  res.json({
    mode: config.agentMode,
    models: {
      executor: config.defaultExecutorModel,
      claudeAvailable: config.anthropicApiKey ? true : false,
    },
  });
});

// Project file management
app.post("/api/project/structure", async (req, res) => {
  const { projectPath } = req.body;
  try {
    const structure = await fileManager.readProjectStructure(projectPath);
    res.json(structure);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/project/file/read", async (req, res) => {
  const { filePath } = req.body;
  try {
    const content = await fileManager.readFile(filePath);
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/project/file/write", async (req, res) => {
  const { filePath, content } = req.body;
  try {
    await fileManager.writeFile(filePath, content);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/project/diff", async (req, res) => {
  const { oldContent, newContent } = req.body;
  try {
    const diff = await fileManager.createDiff(oldContent, newContent);
    res.json({ diff });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/project/apply-changes", async (req, res) => {
  const { changes } = req.body;
  try {
    await fileManager.applyChanges(changes);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Code improvement mode (paste code)
app.post("/api/code/improve", async (req, res) => {
  const { code, language, instructions } = req.body;

  try {
    const prompt = instructions
      ? `Улучши следующий ${language} код согласно инструкциям: ${instructions}\n\n\`\`\`${language}\n${code}\n\`\`\``
      : `Улучши следующий ${language} код, применяя best practices:\n\n\`\`\`${language}\n${code}\n\`\`\``;

    const context = await orchestrator
      .getContextManager()
      .getSummary("code-improvement");
    const response = await orchestrator.processRequest({
      chatId: "code-improvement",
      message: prompt,
      mode: config.agentMode,
      agentType: "executor",
      context: context || undefined,
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Mode: ${config.agentMode}`);
  console.log(`🤖 Executor: ${config.defaultExecutorModel}`);
  console.log(
    `☁️  Claude: ${config.anthropicApiKey ? "Available" : "Not configured"}`,
  );
});
