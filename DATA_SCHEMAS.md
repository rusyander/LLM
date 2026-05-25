# Data Schemas

## Complete data model definitions for the Hybrid AI Workspace Application

**Version:** 1.0.0
**Last Updated:** January 18, 2026

---

## Table of Contents

1. [Storage Structure](#storage-structure)
2. [Context Files](#context-files)
3. [Message Schemas](#message-schemas)
4. [Chat Schemas](#chat-schemas)
5. [Voice Schemas](#voice-schemas)
6. [Image Generation Schemas](#image-generation-schemas)
7. [Preview Schemas](#preview-schemas)
8. [Configuration Schemas](#configuration-schemas)

---

## Storage Structure

### Directory Layout

```
/context_storage/
├── chat_{chatId}/
│   ├── history.json              # Full message history
│   ├── summary.json              # Condensed context for LLM
│   ├── metadata.json             # Chat properties and settings
│   ├── voice_transcripts/        # Voice input history
│   │   └── transcript_{id}.json
│   └── artifacts/                # Generated content
│       ├── images/
│       │   ├── img_{id}.png
│       │   └── img_{id}.json     # Image metadata
│       ├── code/
│       │   └── file_{id}.ext
│       └── documents/
│           └── doc_{id}.ext
└── global_config.json            # Application-wide settings
```

---

## Context Files

### 1. history.json

**Purpose:** Complete, immutable message history for audit and recovery

```typescript
interface ChatHistory {
  version: string; // Schema version (e.g., "1.0.0")
  chatId: string; // Unique chat identifier
  messages: HistoryMessage[]; // All messages in chronological order
  createdAt: string; // ISO 8601 timestamp
  lastModified: string; // ISO 8601 timestamp
  messageCount: number; // Total number of messages
  totalTokens: number; // Approximate total tokens
}

interface HistoryMessage {
  id: string; // Unique message ID
  role: "user" | "assistant" | "system";
  content: string; // Message content
  timestamp: string; // ISO 8601 timestamp
  model: string | null; // Model used (null for user messages)
  tokenCount?: number; // Estimated tokens in this message
  processingTime?: number; // Processing time in milliseconds
  attachments?: Attachment[]; // Attached files/images
  metadata?: {
    voiceInputId?: string; // Reference to voice transcript
    imageGenerationId?: string; // Reference to generated image
    error?: string; // Error message if failed
    retryCount?: number; // Number of retry attempts
  };
}

interface Attachment {
  id: string; // Unique attachment ID
  type: "file" | "image" | "code" | "voice";
  name: string; // Original filename
  path: string; // Relative path in artifacts/
  size: number; // File size in bytes
  mimeType: string; // MIME type
  timestamp: string; // ISO 8601 timestamp
  metadata?: Record<string, any>; // Type-specific metadata
}
```

**Example:**

```json
{
  "version": "1.0.0",
  "chatId": "chat-1737196800000",
  "messages": [
    {
      "id": "msg-1737196801000",
      "role": "user",
      "content": "Create a React component for a todo list",
      "timestamp": "2026-01-18T10:00:01.000Z",
      "model": null,
      "tokenCount": 12
    },
    {
      "id": "msg-1737196802000",
      "role": "assistant",
      "content": "I'll create a React component...",
      "timestamp": "2026-01-18T10:00:02.000Z",
      "model": "qwen3",
      "tokenCount": 450,
      "processingTime": 1200,
      "attachments": [
        {
          "id": "att-1737196802001",
          "type": "code",
          "name": "TodoList.tsx",
          "path": "artifacts/code/TodoList_1737196802001.tsx",
          "size": 2048,
          "mimeType": "text/typescript",
          "timestamp": "2026-01-18T10:00:02.000Z"
        }
      ]
    }
  ],
  "createdAt": "2026-01-18T10:00:00.000Z",
  "lastModified": "2026-01-18T10:00:02.000Z",
  "messageCount": 2,
  "totalTokens": 462
}
```

---

### 2. summary.json

**Purpose:** Condensed context optimized for LLM inference

```typescript
interface ContextSummary {
  version: string; // Schema version
  chatId: string; // Chat identifier
  summary: string; // Natural language summary
  keyPoints: string[]; // Bullet points of main topics
  entities: EntityMap; // Extracted entities
  recentMessages: SummaryMessage[]; // Last N messages (default 10)
  tokenCount: number; // Total tokens in summary context
  lastSummarized: string; // ISO 8601 timestamp
  summarizationTrigger: "auto" | "manual" | "threshold";
  compressionRatio: number; // Original tokens / summary tokens
}

interface EntityMap {
  technologies: string[]; // Tech stack mentioned
  files: string[]; // Files discussed or created
  decisions: Decision[]; // Architectural decisions
  tasks: Task[]; // Pending or completed tasks
  codeReferences: CodeReference[]; // Code snippets or functions
  issues: Issue[]; // Problems or bugs mentioned
}

interface Decision {
  id: string;
  description: string;
  rationale: string;
  timestamp: string;
  tags: string[];
}

interface Task {
  id: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "blocked";
  createdAt: string;
  completedAt?: string;
}

interface CodeReference {
  type: "function" | "class" | "component" | "file";
  name: string;
  file?: string;
  description?: string;
}

interface Issue {
  id: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt?: string;
}

interface SummaryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  model: string | null;
  tokenCount: number;
}
```

**Example:**

```json
{
  "version": "1.0.0",
  "chatId": "chat-1737196800000",
  "summary": "User requested a React todo list component. Created TodoList.tsx with add/delete/toggle functionality using TypeScript and modern React hooks.",
  "keyPoints": [
    "Created React TypeScript component",
    "Implemented todo CRUD operations",
    "Used useState and useCallback hooks",
    "Added basic styling with CSS modules"
  ],
  "entities": {
    "technologies": ["React", "TypeScript", "CSS Modules"],
    "files": ["TodoList.tsx", "TodoList.module.css"],
    "decisions": [
      {
        "id": "dec-001",
        "description": "Use functional components with hooks instead of class components",
        "rationale": "Modern React best practice, better performance, simpler code",
        "timestamp": "2026-01-18T10:00:02.000Z",
        "tags": ["react", "architecture"]
      }
    ],
    "tasks": [],
    "codeReferences": [
      {
        "type": "component",
        "name": "TodoList",
        "file": "TodoList.tsx",
        "description": "Main todo list component with state management"
      }
    ],
    "issues": []
  },
  "recentMessages": [
    {
      "id": "msg-1737196801000",
      "role": "user",
      "content": "Create a React component for a todo list",
      "timestamp": "2026-01-18T10:00:01.000Z",
      "model": null,
      "tokenCount": 12
    }
  ],
  "tokenCount": 512,
  "lastSummarized": "2026-01-18T10:00:05.000Z",
  "summarizationTrigger": "auto",
  "compressionRatio": 0.9
}
```

---

### 3. metadata.json

**Purpose:** Chat-level configuration and statistics

```typescript
interface ChatMetadata {
  version: string; // Schema version
  chatId: string; // Chat identifier
  title: string; // User-defined title
  createdAt: string; // ISO 8601 timestamp
  lastAccessed: string; // ISO 8601 timestamp
  lastModified: string; // ISO 8601 timestamp
  statistics: ChatStatistics; // Usage statistics
  settings: ChatSettings; // Chat-specific settings
  tags: string[]; // User-defined tags
  pinned: boolean; // Pinned to top of list
  archived: boolean; // Hidden from main list
}

interface ChatStatistics {
  messageCount: number; // Total messages
  userMessageCount: number; // User messages only
  assistantMessageCount: number; // Assistant messages only
  totalTokens: number; // Total tokens used
  totalProcessingTime: number; // Total ms spent processing
  averageResponseTime: number; // Average ms per response
  modelUsage: Record<string, number>; // Messages per model
  attachmentCount: number; // Total attachments
  voiceInputCount: number; // Voice inputs used
  imageGenerationCount: number; // Images generated
  summarizationCount: number; // Times summarized
  errorCount: number; // Failed requests
}

interface ChatSettings {
  preferredModel: "qwen3" | "claude" | "auto";
  temperature: number; // 0.0 - 2.0
  maxTokens: number; // Max tokens per response
  autoSummarize: boolean; // Enable auto-summarization
  summarizationThreshold: number; // Token count trigger
  voiceInputEnabled: boolean; // Enable voice input
  imageGenerationEnabled: boolean; // Enable SD integration
  previewEnabled: boolean; // Enable code preview
  systemPrompt?: string; // Custom system prompt
  contextWindow: number; // Max context tokens
}
```

**Example:**

```json
{
  "version": "1.0.0",
  "chatId": "chat-1737196800000",
  "title": "Build Todo App",
  "createdAt": "2026-01-18T10:00:00.000Z",
  "lastAccessed": "2026-01-18T10:30:00.000Z",
  "lastModified": "2026-01-18T10:00:02.000Z",
  "statistics": {
    "messageCount": 12,
    "userMessageCount": 6,
    "assistantMessageCount": 6,
    "totalTokens": 5420,
    "totalProcessingTime": 8400,
    "averageResponseTime": 1400,
    "modelUsage": {
      "qwen3": 5,
      "claude": 1
    },
    "attachmentCount": 3,
    "voiceInputCount": 0,
    "imageGenerationCount": 0,
    "summarizationCount": 1,
    "errorCount": 0
  },
  "settings": {
    "preferredModel": "qwen3",
    "temperature": 0.7,
    "maxTokens": 4096,
    "autoSummarize": true,
    "summarizationThreshold": 8000,
    "voiceInputEnabled": true,
    "imageGenerationEnabled": true,
    "previewEnabled": true,
    "contextWindow": 8000
  },
  "tags": ["react", "tutorial", "frontend"],
  "pinned": false,
  "archived": false
}
```

---

## Message Schemas

### Core Message Type

```typescript
interface Message {
  id: string; // msg-{timestamp}
  chatId: string; // Reference to parent chat
  role: "user" | "assistant" | "system";
  content: string; // Message text content
  timestamp: string; // ISO 8601
  model: string | null; // Model identifier (null for user)
  tokenCount?: number; // Estimated tokens
  processingTime?: number; // Processing duration (ms)
  attachments?: Attachment[]; // Attached files
  metadata?: MessageMetadata; // Additional metadata
}

interface MessageMetadata {
  voiceInputId?: string; // Voice transcript reference
  imageGenerationId?: string; // Generated image reference
  parentMessageId?: string; // For threaded replies
  editedAt?: string; // If message was edited
  error?: ErrorInfo; // Error details if failed
  retryCount?: number; // Retry attempts
  streaming?: boolean; // Was streamed
  cancelled?: boolean; // User cancelled
}

interface ErrorInfo {
  code: string; // Error code
  message: string; // Error message
  details?: any; // Additional error context
  timestamp: string; // When error occurred
}
```

---

## Chat Schemas

### Chat List Item

```typescript
interface Chat {
  id: string; // chat-{timestamp}
  title: string; // User-defined or auto-generated
  createdAt: string; // ISO 8601
  lastAccessed: string; // ISO 8601
  lastModified: string; // ISO 8601
  messageCount: number; // Total messages
  previewText: string; // First 100 chars of last message
  model: string; // Last used model
  pinned: boolean; // Pinned to top
  archived: boolean; // Hidden from list
  tags: string[]; // User tags
}
```

---

## Voice Schemas

### Voice Transcript

```typescript
interface VoiceTranscript {
  id: string; // transcript-{timestamp}
  chatId: string; // Parent chat
  messageId?: string; // Associated message (after send)
  segments: TranscriptSegment[]; // Individual recording segments
  finalText: string; // Cumulative final text
  confidence: number; // Average confidence (0-1)
  duration: number; // Total duration (ms)
  language: string; // Detected language
  timestamp: string; // ISO 8601
  status: "recording" | "completed" | "cancelled";
}

interface TranscriptSegment {
  id: string; // segment-{timestamp}
  text: string; // Transcribed text
  confidence: number; // Confidence score (0-1)
  startTime: number; // Relative start (ms)
  endTime: number; // Relative end (ms)
  interim: boolean; // Interim result (not final)
  timestamp: string; // ISO 8601
}
```

**Example:**

```json
{
  "id": "transcript-1737196850000",
  "chatId": "chat-1737196800000",
  "messageId": "msg-1737196851000",
  "segments": [
    {
      "id": "segment-1737196850001",
      "text": "Create a function to calculate fibonacci",
      "confidence": 0.92,
      "startTime": 0,
      "endTime": 2300,
      "interim": false,
      "timestamp": "2026-01-18T10:00:50.001Z"
    },
    {
      "id": "segment-1737196852500",
      "text": "numbers using recursion",
      "confidence": 0.88,
      "startTime": 2300,
      "endTime": 3800,
      "interim": false,
      "timestamp": "2026-01-18T10:00:52.500Z"
    }
  ],
  "finalText": "Create a function to calculate fibonacci numbers using recursion",
  "confidence": 0.9,
  "duration": 3800,
  "language": "en-US",
  "timestamp": "2026-01-18T10:00:50.000Z",
  "status": "completed"
}
```

---

## Image Generation Schemas

### Generated Image

```typescript
interface GeneratedImage {
  id: string; // img-{timestamp}
  chatId: string; // Parent chat
  messageId: string; // Associated message
  type: "txt2img" | "img2img"; // Generation type
  prompt: string; // Positive prompt
  negativePrompt?: string; // Negative prompt
  inputImagePath?: string; // For img2img
  outputPath: string; // Relative path to image
  url: string; // Public URL or local path
  parameters: ImageParameters; // Generation parameters
  metadata: ImageMetadata; // Additional metadata
  timestamp: string; // ISO 8601
}

interface ImageParameters {
  width: number; // Image width
  height: number; // Image height
  steps: number; // Sampling steps
  cfgScale: number; // CFG scale (guidance)
  seed: number; // Random seed
  sampler: string; // Sampler name
  model: string; // SD model name
  denoisingStrength?: number; // For img2img (0-1)
}

interface ImageMetadata {
  fileSize: number; // Bytes
  format: "png" | "jpg" | "webp"; // Image format
  generationTime: number; // Processing time (ms)
  hash: string; // SHA256 hash
  embeddings?: string[]; // Used embeddings/LoRAs
}
```

**Example:**

```json
{
  "id": "img-1737197000000",
  "chatId": "chat-1737196800000",
  "messageId": "msg-1737197000000",
  "type": "txt2img",
  "prompt": "a serene mountain landscape at sunset, oil painting style",
  "negativePrompt": "blurry, low quality, watermark",
  "outputPath": "artifacts/images/img_1737197000000.png",
  "url": "/api/images/img_1737197000000.png",
  "parameters": {
    "width": 512,
    "height": 768,
    "steps": 30,
    "cfgScale": 7.5,
    "seed": 42,
    "sampler": "DPM++ 2M Karras",
    "model": "sd_xl_base_1.0"
  },
  "metadata": {
    "fileSize": 1048576,
    "format": "png",
    "generationTime": 8500,
    "hash": "a1b2c3d4e5f6...",
    "embeddings": []
  },
  "timestamp": "2026-01-18T10:03:20.000Z"
}
```

---

## Preview Schemas

### Preview Configuration

```typescript
interface PreviewConfig {
  type: "html" | "markdown" | "code" | "image" | "pdf";
  content: string; // Source content
  language?: string; // For code previews
  sandbox: boolean; // Use sandbox
  theme: "light" | "dark"; // Preview theme
  options: PreviewOptions; // Type-specific options
}

interface PreviewOptions {
  enableScripts?: boolean; // Allow JavaScript
  enableStyles?: boolean; // Allow CSS
  maxHeight?: number; // Max height (px)
  lineNumbers?: boolean; // For code
  wordWrap?: boolean; // Text wrapping
}

interface PreviewResult {
  id: string; // preview-{timestamp}
  rendered: string; // Rendered HTML
  mimeType: string; // Content MIME type
  size: number; // Byte size
  timestamp: string; // ISO 8601
  errors?: PreviewError[]; // Rendering errors
}

interface PreviewError {
  line?: number; // Line number (for code)
  column?: number; // Column number
  message: string; // Error message
  severity: "error" | "warning"; // Error severity
}
```

---

## Configuration Schemas

### Global Configuration

```typescript
interface GlobalConfig {
  version: string; // Config version
  models: ModelConfiguration; // LLM settings
  storage: StorageConfiguration; // Storage settings
  features: FeatureFlags; // Feature toggles
  ui: UIConfiguration; // UI preferences
  integrations: IntegrationConfig; // External services
  lastUpdated: string; // ISO 8601
}

interface ModelConfiguration {
  local: {
    host: string; // Ollama host
    defaultModel: string; // Default local model
    timeout: number; // Request timeout (ms)
  };
  cloud: {
    provider: "anthropic"; // Cloud provider
    apiKey: string; // API key (encrypted)
    defaultModel: string; // Default cloud model
    maxRetries: number; // Retry attempts
  };
  routing: {
    strategy: "auto" | "local_only" | "cloud_only";
    localThreshold: number; // Complexity threshold
    fallbackToCloud: boolean; // Auto fallback
  };
}

interface StorageConfiguration {
  backend: "file"; // MVP: file only
  basePath: string; // Base directory
  maxChatSize: number; // Max chat size (bytes)
  maxTotalSize: number; // Max total storage (bytes)
  autoCleanup: boolean; // Enable auto cleanup
  cleanupThreshold: number; // Days before cleanup
}

interface FeatureFlags {
  voiceInput: boolean; // Enable voice
  imageGeneration: boolean; // Enable SD
  preview: boolean; // Enable preview
  autoSummarize: boolean; // Enable auto-summarize
  contextVisualization: boolean; // Context tree view
  exportImport: boolean; // Chat export/import
}

interface UIConfiguration {
  theme: "light" | "dark" | "auto"; // Color theme
  language: "en" | "ru"; // UI language
  fontSize: number; // Base font size
  compactMode: boolean; // Compact UI
  showTimestamps: boolean; // Show message times
  showTokenCounts: boolean; // Show token usage
  enableMarkdown: boolean; // Render markdown
  enableCodeHighlight: boolean; // Syntax highlighting
}

interface IntegrationConfig {
  stableDiffusion: {
    enabled: boolean; // SD integration on/off
    apiUrl: string; // SD Web UI URL
    defaultModel: string; // Default SD model
    timeout: number; // Request timeout
  };
  voiceRecognition: {
    enabled: boolean; // Voice input on/off
    language: string; // Recognition language
    continuous: boolean; // Continuous recognition
    interimResults: boolean; // Show interim results
  };
}
```

---

## Migration Strategy

### Schema Versioning

All schema files include a `version` field. Migration process:

1. Check schema version on load
2. If outdated, run migration function
3. Update to latest schema
4. Save with new version

```typescript
interface SchemaMigration {
  fromVersion: string;
  toVersion: string;
  migrate: (data: any) => any;
}

const migrations: SchemaMigration[] = [
  {
    fromVersion: "0.9.0",
    toVersion: "1.0.0",
    migrate: (data) => {
      // Transform old structure to new
      return transformedData;
    },
  },
];
```

---

## Validation

All schemas should be validated on load and save:

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
  expected: any;
  received: any;
}
```

---

_This schema document is the source of truth for all data structures in the application._
