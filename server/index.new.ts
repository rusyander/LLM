/**
 * Server Entry Point
 * Enhanced with all services: Context, Voice, SD, Preview
 */

import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { config } from "./config.js";
import { AgentOrchestrator } from "./services/agentOrchestrator.js";
import { FileManager } from "./services/fileManager.js";
import { StableDiffusionService } from "./services/stableDiffusionService.js";
import { VoiceService } from "./services/voiceService.js";
import { PreviewService } from "./services/previewService.js";
import type { Message, Chat } from "./types.js";
import type { HistoryMessage } from "./services/contextManager.js";

const app = express();

// Initialize services
const orchestrator = new AgentOrchestrator();
const fileManager = new FileManager();
const sdService = new StableDiffusionService();
const voiceService = new VoiceService();
const previewService = new PreviewService();

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use("/api/images", express.static("context_storage"));

// In-memory storage for chat list (metadata loaded from disk via ContextManager)
const chats = new Map<string, Chat>();

// ============================================================================
// HEALTH & STATUS
// ============================================================================

app.get("/api/health", async (req, res) => {
  const health = await orchestrator.checkHealth();
  res.json({
    status: "ok",
    services: {
      ...health,
      stableDiffusion: sdService.isAvailable(),
      voice: true,
      preview: true,
    },
    mode: config.agentMode,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// CHAT MANAGEMENT
// ============================================================================

/**
 * GET /api/chats
 * List all chats
 */
app.get("/api/chats", async (req, res) => {
  try {
    const contextManager = orchestrator.getContextManager();

    // Load all chats from metadata files
    const chatList: Chat[] = [];

    // Get all metadata and convert to Chat format
    // This is a simplified version - in production, iterate through storage
    const existingChats = Array.from(chats.values());

    res.json(existingChats.sort((a, b) => b.updatedAt - a.updatedAt));
  } catch (error) {
    console.error("Failed to list chats:", error);
    res.status(500).json({ error: "Failed to list chats" });
  }
});

/**
 * POST /api/chats
 * Create a new chat
 */
app.post("/api/chats", async (req, res) => {
  try {
    const { title } = req.body;
    const chatId = `${Date.now()}`;
    const now = Date.now();

    const chat: Chat = {
      id: chatId,
      title: title || "New Chat",
      createdAt: now,
      updatedAt: now,
    };

    // Initialize chat in context manager
    await orchestrator.getContextManager().initializeChat(chatId, chat.title);

    chats.set(chatId, chat);
    res.json(chat);
  } catch (error) {
    console.error("Failed to create chat:", error);
    res.status(500).json({ error: "Failed to create chat" });
  }
});

/**
 * GET /api/chats/:chatId
 * Get chat details
 */
app.get("/api/chats/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = chats.get(chatId);

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const metadata = await orchestrator.getContextManager().getMetadata(chatId);

    res.json({
      ...chat,
      metadata,
    });
  } catch (error) {
    console.error("Failed to get chat:", error);
    res.status(500).json({ error: "Failed to get chat" });
  }
});

/**
 * DELETE /api/chats/:chatId
 * Delete a chat completely
 */
app.delete("/api/chats/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;

    await orchestrator.getContextManager().deleteChat(chatId);
    chats.delete(chatId);

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete chat:", error);
    res.status(500).json({ error: "Failed to delete chat" });
  }
});

/**
 * DELETE /api/chats/:chatId/context
 * Clear chat context (keep metadata)
 */
app.delete("/api/chats/:chatId/context", async (req, res) => {
  try {
    const { chatId } = req.params;
    const success = await orchestrator
      .getContextManager()
      .clearChatContext(chatId);

    res.json({ success });
  } catch (error) {
    console.error("Failed to clear context:", error);
    res.status(500).json({ error: "Failed to clear context" });
  }
});

/**
 * DELETE /api/contexts
 * Clear all chat contexts
 */
app.delete("/api/contexts", async (req, res) => {
  try {
    const success = await orchestrator.getContextManager().clearAllContexts();
    res.json({ success });
  } catch (error) {
    console.error("Failed to clear all contexts:", error);
    res.status(500).json({ error: "Failed to clear all contexts" });
  }
});

// ============================================================================
// MESSAGES
// ============================================================================

/**
 * GET /api/chats/:chatId/messages
 * Get all messages for a chat
 */
app.get("/api/chats/:chatId/messages", async (req, res) => {
  try {
    const { chatId } = req.params;

    const history = await orchestrator.getContextManager().getHistory(chatId);

    if (!history) {
      return res.json([]);
    }

    // Convert HistoryMessage to Message format for frontend
    const messages: Message[] = history.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp).getTime(),
      chatId,
    }));

    res.json(messages);
  } catch (error) {
    console.error("Failed to get messages:", error);
    res.status(500).json({ error: "Failed to get messages" });
  }
});

/**
 * POST /api/chats/:chatId/messages
 * Send a message and get AI response
 */
app.post("/api/chats/:chatId/messages", async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, mode = config.agentMode } = req.body;

    if (!chats.has(chatId)) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const startTime = Date.now();
    const messageId = `msg-${Date.now()}`;

    // Add user message to history
    const userMessage: HistoryMessage = {
      id: messageId,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
      model: null,
      tokenCount: Math.ceil(content.length / 4),
    };

    await orchestrator.getContextManager().addMessage(chatId, userMessage);

    // Update chat
    const chat = chats.get(chatId)!;
    chat.updatedAt = Date.now();

    // Process with agent
    const response = await orchestrator.processRequest({
      chatId,
      message: content,
      mode,
      agentType: "executor",
    });

    const processingTime = Date.now() - startTime;

    // Add assistant message to history
    const assistantMessage: HistoryMessage = {
      id: `msg-${Date.now()}`,
      role: "assistant",
      content: response.message,
      timestamp: new Date().toISOString(),
      model: "qwen3", // TODO: get from response
      tokenCount: Math.ceil(response.message.length / 4),
      processingTime,
    };

    await orchestrator.getContextManager().addMessage(chatId, assistantMessage);

    res.json({
      messageId: assistantMessage.id,
      response: response.message,
      model: assistantMessage.model,
      timestamp: assistantMessage.timestamp,
      processingTime,
    });
  } catch (error) {
    console.error("Failed to process message:", error);
    res.status(500).json({ error: String(error) });
  }
});

// ============================================================================
// VOICE INPUT
// ============================================================================

/**
 * POST /api/voice/start
 * Start a voice recording session
 */
app.post("/api/voice/start", (req, res) => {
  try {
    const { chatId } = req.body;
    const sessionId = voiceService.startSession(chatId);
    res.json({ sessionId });
  } catch (error) {
    console.error("Failed to start voice session:", error);
    res.status(500).json({ error: "Failed to start voice session" });
  }
});

/**
 * POST /api/voice/:sessionId/segment
 * Add a transcript segment to session
 */
app.post("/api/voice/:sessionId/segment", (req, res) => {
  try {
    const { sessionId } = req.params;
    const { text, confidence, interim } = req.body;

    const segment = voiceService.addSegment(
      sessionId,
      text,
      confidence,
      interim,
    );

    if (!segment) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({
      segment,
      cumulativeText: voiceService.getCumulativeText(sessionId),
    });
  } catch (error) {
    console.error("Failed to add segment:", error);
    res.status(500).json({ error: "Failed to add segment" });
  }
});

/**
 * GET /api/voice/:sessionId
 * Get current session state
 */
app.get("/api/voice/:sessionId", (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = voiceService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (error) {
    console.error("Failed to get session:", error);
    res.status(500).json({ error: "Failed to get session" });
  }
});

/**
 * POST /api/voice/:sessionId/complete
 * Complete a voice session
 */
app.post("/api/voice/:sessionId/complete", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { messageId } = req.body;

    const transcript = await voiceService.completeSession(sessionId, messageId);

    if (!transcript) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(transcript);
  } catch (error) {
    console.error("Failed to complete session:", error);
    res.status(500).json({ error: "Failed to complete session" });
  }
});

/**
 * POST /api/voice/:sessionId/cancel
 * Cancel a voice session
 */
app.post("/api/voice/:sessionId/cancel", (req, res) => {
  try {
    const { sessionId } = req.params;
    const success = voiceService.cancelSession(sessionId);
    res.json({ success });
  } catch (error) {
    console.error("Failed to cancel session:", error);
    res.status(500).json({ error: "Failed to cancel session" });
  }
});

/**
 * GET /api/voice/chats/:chatId/transcripts
 * List all transcripts for a chat
 */
app.get("/api/voice/chats/:chatId/transcripts", async (req, res) => {
  try {
    const { chatId } = req.params;
    const transcripts = await voiceService.listTranscripts(chatId);
    res.json(transcripts);
  } catch (error) {
    console.error("Failed to list transcripts:", error);
    res.status(500).json({ error: "Failed to list transcripts" });
  }
});

// ============================================================================
// IMAGE GENERATION (STABLE DIFFUSION)
// ============================================================================

/**
 * POST /api/images/generate
 * Generate image from text (txt2img)
 */
app.post("/api/images/generate", async (req, res) => {
  try {
    const {
      chatId,
      messageId,
      prompt,
      negativePrompt,
      width,
      height,
      steps,
      cfgScale,
      seed,
      sampler,
    } = req.body;

    if (!sdService.isAvailable()) {
      return res
        .status(503)
        .json({ error: "Stable Diffusion service not available" });
    }

    const result = await sdService.generateImage(chatId, messageId, {
      prompt,
      negativePrompt,
      width,
      height,
      steps,
      cfgScale,
      seed,
      sampler,
    });

    res.json(result);
  } catch (error) {
    console.error("Failed to generate image:", error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/images/img2img
 * Generate image from image
 */
app.post("/api/images/img2img", upload.single("image"), async (req, res) => {
  try {
    const { chatId, messageId, prompt, negativePrompt, denoisingStrength } =
      req.body;

    if (!sdService.isAvailable()) {
      return res
        .status(503)
        .json({ error: "Stable Diffusion service not available" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image provided" });
    }

    // Read uploaded image and convert to base64
    const fs = await import("fs/promises");
    const imageBuffer = await fs.readFile(req.file.path);
    const base64Image = imageBuffer.toString("base64");

    const result = await sdService.generateImageFromImage(chatId, messageId, {
      prompt,
      negativePrompt,
      initImages: [base64Image],
      denoisingStrength: parseFloat(denoisingStrength) || 0.75,
    });

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    res.json(result);
  } catch (error) {
    console.error("Failed to generate image from image:", error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * GET /api/images/chats/:chatId/list
 * List all generated images for a chat
 */
app.get("/api/images/chats/:chatId/list", async (req, res) => {
  try {
    const { chatId } = req.params;
    const images = await sdService.listImages(chatId);
    res.json(images);
  } catch (error) {
    console.error("Failed to list images:", error);
    res.status(500).json({ error: "Failed to list images" });
  }
});

/**
 * GET /api/images/models
 * Get available SD models
 */
app.get("/api/images/models", async (req, res) => {
  try {
    const models = await sdService.getModels();
    res.json(models);
  } catch (error) {
    console.error("Failed to get models:", error);
    res.status(500).json({ error: "Failed to get models" });
  }
});

/**
 * GET /api/images/samplers
 * Get available samplers
 */
app.get("/api/images/samplers", async (req, res) => {
  try {
    const samplers = await sdService.getSamplers();
    res.json(samplers);
  } catch (error) {
    console.error("Failed to get samplers:", error);
    res.status(500).json({ error: "Failed to get samplers" });
  }
});

/**
 * POST /api/images/interrupt
 * Interrupt ongoing generation
 */
app.post("/api/images/interrupt", async (req, res) => {
  try {
    const success = await sdService.interrupt();
    res.json({ success });
  } catch (error) {
    console.error("Failed to interrupt:", error);
    res.status(500).json({ error: "Failed to interrupt" });
  }
});

/**
 * GET /api/images/progress
 * Get generation progress
 */
app.get("/api/images/progress", async (req, res) => {
  try {
    const progress = await sdService.getProgress();
    res.json(progress || { progress: 0, eta: 0 });
  } catch (error) {
    console.error("Failed to get progress:", error);
    res.status(500).json({ error: "Failed to get progress" });
  }
});

// ============================================================================
// PREVIEW
// ============================================================================

/**
 * POST /api/preview/render
 * Render preview for various content types
 */
app.post("/api/preview/render", async (req, res) => {
  try {
    const { type, content, language, sandbox, theme, options } = req.body;

    const result = await previewService.render({
      type,
      content,
      language,
      sandbox: sandbox !== false,
      theme: theme || "dark",
      options: options || {},
    });

    res.json(result);
  } catch (error) {
    console.error("Failed to render preview:", error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/preview/extract-code
 * Extract code blocks from markdown/chat content
 */
app.post("/api/preview/extract-code", (req, res) => {
  try {
    const { content } = req.body;
    const blocks = previewService.extractCodeBlocks(content);
    res.json(blocks);
  } catch (error) {
    console.error("Failed to extract code:", error);
    res.status(500).json({ error: String(error) });
  }
});

// ============================================================================
// CONTEXT & SUMMARY
// ============================================================================

/**
 * GET /api/chats/:chatId/summary
 * Get context summary
 */
app.get("/api/chats/:chatId/summary", async (req, res) => {
  try {
    const { chatId } = req.params;
    const summary = await orchestrator.getContextManager().getSummary(chatId);
    res.json(summary);
  } catch (error) {
    console.error("Failed to get summary:", error);
    res.status(500).json({ error: "Failed to get summary" });
  }
});

/**
 * POST /api/chats/:chatId/summarize
 * Manually trigger summarization
 */
app.post("/api/chats/:chatId/summarize", async (req, res) => {
  try {
    const { chatId } = req.params;

    // This would call Claude to generate summary
    // For now, return success

    res.json({ success: true, message: "Summarization triggered" });
  } catch (error) {
    console.error("Failed to summarize:", error);
    res.status(500).json({ error: "Failed to summarize" });
  }
});

/**
 * GET /api/chats/:chatId/metadata
 * Get chat metadata
 */
app.get("/api/chats/:chatId/metadata", async (req, res) => {
  try {
    const { chatId } = req.params;
    const metadata = await orchestrator.getContextManager().getMetadata(chatId);
    res.json(metadata);
  } catch (error) {
    console.error("Failed to get metadata:", error);
    res.status(500).json({ error: "Failed to get metadata" });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = config.port || 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🤖 Agent mode: ${config.agentMode}`);
  console.log(`\n✅ Services initialized:`);
  console.log(`   - Ollama: ${config.localLlmHost}`);
  console.log(`   - Claude: ${config.anthropicApiKey ? "✓" : "✗"}`);
  console.log(`   - Stable Diffusion: ${sdService.isAvailable() ? "✓" : "✗"}`);
  console.log(`   - Voice: ✓`);
  console.log(`   - Preview: ✓`);
  console.log(`\n📁 Context storage: ./context_storage`);
  console.log(`\n`);

  // Clean up stale voice sessions every hour
  setInterval(() => {
    voiceService.cleanupStaleSessions();
  }, 3600000);
});
