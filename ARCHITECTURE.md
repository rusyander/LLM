# System Architecture

## Hybrid AI Workspace Application

**Version:** 1.0.0-MVP
**Last Updated:** January 18, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [System Components](#system-components)
4. [Data Flow](#data-flow)
5. [Context Memory Model](#context-memory-model)
6. [API Contracts](#api-contracts)
7. [Data Schemas](#data-schemas)
8. [Integration Points](#integration-points)
9. [Security Considerations](#security-considerations)
10. [Scalability & Extensibility](#scalability--extensibility)

---

## Overview

### Mission

Provide a local-first, production-ready AI workspace that combines the speed of local LLMs with the intelligence of cloud models, while maintaining explicit, persistent context for every chat session.

### Key Characteristics

- **Local-First:** All data stored locally, no cloud dependency except LLM API calls
- **Hybrid Intelligence:** Smart routing between local (fast) and cloud (smart) models
- **Explicit Context:** Users can see, edit, and clear context at any time
- **Multi-Modal:** Text, voice, code, images all supported
- **Extensible:** Plugin architecture for future capabilities

---

## Core Principles

### 1. Local-First Execution

- All user data stored on local disk
- Context files are human-readable JSON
- No external database required
- Offline-capable (except LLM inference)

### 2. Explicit Context Management

- Every chat has separate context storage
- History and summary are distinct files
- Users can inspect and modify context files
- Clear visual indicators for context size

### 3. Isolated Workspaces

- Each chat is an independent workspace
- No cross-chat context contamination
- Separate artifact storage per chat
- Independent cleanup controls

### 4. Architectural Logging

- Every decision documented
- Error tracking and resolution
- Development timeline maintained
- Technical debt explicitly tracked

---

## System Components

### Backend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Backend Server                        │
│                     (Node.js + Express)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Agent           │  │  Context         │               │
│  │  Orchestrator    │  │  Manager         │               │
│  │                  │  │                  │               │
│  │  - Route to LLM  │  │  - Load/Save     │               │
│  │  - Strategy      │  │  - Summarize     │               │
│  │  - Fallback      │  │  - Cleanup       │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Claude Service  │  │  Ollama Service  │               │
│  │                  │  │                  │               │
│  │  - API Client    │  │  - Local API     │               │
│  │  - Retry Logic   │  │  - Model Mgmt    │               │
│  │  - Rate Limit    │  │  - Streaming     │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Stable          │  │  Voice           │               │
│  │  Diffusion Svc   │  │  Service         │               │
│  │                  │  │                  │               │
│  │  - txt2img       │  │  - Transcription │               │
│  │  - img2img       │  │  - Buffer Mgmt   │               │
│  │  - Storage       │  │  - Accumulation  │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  File Manager    │  │  Preview         │               │
│  │                  │  │  Service         │               │
│  │  - CRUD Ops      │  │  - Render HTML   │               │
│  │  - Storage       │  │  - Image Handle  │               │
│  │  - Cleanup       │  │  - Doc Parse     │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Application                    │
│                      (React + TypeScript)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              App State (Zustand)                       │ │
│  │  - Current chat                                        │ │
│  │  - Chat list                                           │ │
│  │  - Voice recording state                               │ │
│  │  - Preview state                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Sidebar    │  │  ChatView    │  │  Preview     │     │
│  │              │  │              │  │  Panel       │     │
│  │  - Chat list │  │  - Messages  │  │              │     │
│  │  - New chat  │  │  - Input     │  │  - Code      │     │
│  │  - Settings  │  │  - Voice UI  │  │  - Images    │     │
│  │  - Clear all │  │  - Context   │  │  - Docs      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  ChatInput   │  │  VoiceInput  │  │  Message     │     │
│  │              │  │              │  │              │     │
│  │  - Text      │  │  - Record    │  │  - Render    │     │
│  │  - Send      │  │  - Confirm   │  │  - Actions   │     │
│  │  - Attach    │  │  - Buffer    │  │  - Preview   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Storage Architecture

```
/context_storage/
├── chat_{chatId}/
│   ├── history.json          # Full message history
│   ├── summary.json          # Summarized context
│   ├── metadata.json         # Chat metadata
│   └── artifacts/            # Generated files
│       ├── images/
│       ├── code/
│       └── documents/
```

---

## Data Flow

### Chat Message Flow

```
User Input → Frontend → API → Agent Orchestrator → LLM Selection
                                                     ↓
                                   ┌─────────────────┴──────────────┐
                                   ↓                                ↓
                            Ollama (Local)                   Claude (Cloud)
                                   ↓                                ↓
                                   └─────────────────┬──────────────┘
                                                     ↓
                              Context Manager ← Response
                                     ↓
                              Save to history.json
                                     ↓
                              Check context size
                                     ↓
                          Auto-summarize if needed
                                     ↓
                              Update summary.json
                                     ↓
                              Return to Frontend
```

### Voice Input Flow

```
User clicks Record → Web Speech API → Interim Results
                                            ↓
                                    Display in buffer
                                            ↓
                              User clicks "Confirm"
                                            ↓
                          Append to cumulative text
                                            ↓
                              Display in textarea
                                            ↓
                            Repeat until "Send"
                                            ↓
                              Normal chat flow
```

### Image Generation Flow

```
User requests image → Frontend → API → SD Service
                                           ↓
                              AUTOMATIC1111 API (Local)
                                           ↓
                                   Generate image
                                           ↓
                              Save to artifacts/images/
                                           ↓
                              Return file path + metadata
                                           ↓
                              Frontend displays preview
                                           ↓
                              Save to message history
```

### Context Cleanup Flow

```
User clicks "Clear Context" → Confirm dialog → API
                                                 ↓
                                      Context Manager
                                                 ↓
                                      Delete history.json
                                                 ↓
                                      Delete summary.json
                                                 ↓
                                      Keep metadata.json
                                                 ↓
                                      Return success
                                                 ↓
                                      Frontend resets view
```

---

## Context Memory Model

### Three-File System

#### 1. history.json

**Purpose:** Complete audit trail of all messages
**Structure:**

```json
{
  "chatId": "chat-1234567890",
  "messages": [
    {
      "id": "msg-001",
      "role": "user",
      "content": "Hello",
      "timestamp": "2026-01-18T10:00:00Z",
      "model": null
    },
    {
      "id": "msg-002",
      "role": "assistant",
      "content": "Hi! How can I help?",
      "timestamp": "2026-01-18T10:00:02Z",
      "model": "qwen3"
    }
  ],
  "createdAt": "2026-01-18T10:00:00Z",
  "lastModified": "2026-01-18T10:00:02Z"
}
```

#### 2. summary.json

**Purpose:** Condensed context for LLM inference
**Structure:**

```json
{
  "chatId": "chat-1234567890",
  "summary": "User asked about...",
  "keyPoints": [
    "Topic A discussed",
    "Decision made on B",
    "Working on feature C"
  ],
  "entities": {
    "technologies": ["React", "Node.js"],
    "files": ["App.tsx", "server.ts"],
    "decisions": ["Use TypeScript", "File-based storage"]
  },
  "recentMessages": ["last 10 messages..."],
  "tokenCount": 1500,
  "lastSummarized": "2026-01-18T11:00:00Z"
}
```

#### 3. metadata.json

**Purpose:** Chat properties and settings
**Structure:**

```json
{
  "chatId": "chat-1234567890",
  "title": "Build AI Workspace",
  "createdAt": "2026-01-18T10:00:00Z",
  "lastAccessed": "2026-01-18T12:00:00Z",
  "messageCount": 25,
  "tokenCount": 5000,
  "preferredModel": "qwen3",
  "settings": {
    "autoSummarize": true,
    "maxContextTokens": 8000,
    "temperature": 0.7
  },
  "tags": ["development", "architecture"]
}
```

### Context Strategy

**Inference Context Construction:**

```
Context = Summary + Recent Messages (last 10) + Current User Message
```

**Auto-Summarization Trigger:**

- When total context exceeds 8000 tokens
- Or every 50 messages
- Or manually via UI

**Summarization Process:**

1. Send full history to Claude Sonnet 4.5
2. Request structured summary with key points
3. Save summary.json
4. Keep full history.json intact
5. Update metadata.json

---

## API Contracts

### Chat API

#### POST /api/chat/send

```typescript
Request:
{
  chatId: string;
  message: string;
  model?: 'qwen3' | 'claude' | 'auto';
  attachments?: Array<{
    type: 'file' | 'image';
    path: string;
  }>;
}

Response:
{
  messageId: string;
  response: string;
  model: string;
  timestamp: string;
  contextSummary?: {
    tokenCount: number;
    needsSummarization: boolean;
  };
}
```

#### GET /api/chat/:chatId

```typescript
Response:
{
  chatId: string;
  title: string;
  messages: Message[];
  metadata: ChatMetadata;
}
```

#### POST /api/chat/new

```typescript
Request:
{
  title?: string;
}

Response:
{
  chatId: string;
  title: string;
  createdAt: string;
}
```

#### DELETE /api/chat/:chatId/context

```typescript
Response: {
  success: boolean;
  message: string;
}
```

### Voice API

#### POST /api/voice/transcribe

```typescript
Request:
FormData {
  audio: Blob;
  chatId: string;
}

Response:
{
  text: string;
  confidence: number;
}
```

### Image Generation API

#### POST /api/image/generate

```typescript
Request:
{
  chatId: string;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
}

Response:
{
  imageId: string;
  path: string;
  url: string;
  metadata: {
    prompt: string;
    width: number;
    height: number;
    seed: number;
    model: string;
  };
}
```

#### POST /api/image/img2img

```typescript
Request:
FormData {
  chatId: string;
  image: File;
  prompt: string;
  denoisingStrength: number;
}

Response:
{
  imageId: string;
  path: string;
  url: string;
}
```

### Preview API

#### POST /api/preview/render

```typescript
Request: {
  type: "html" | "markdown" | "code";
  content: string;
}

Response: {
  rendered: string;
  mimeType: string;
}
```

---

## Data Schemas

### Message Schema

```typescript
interface Message {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  model: string | null;
  attachments?: Attachment[];
  metadata?: {
    tokenCount?: number;
    processingTime?: number;
    error?: string;
  };
}
```

### Chat Schema

```typescript
interface Chat {
  id: string;
  title: string;
  createdAt: string;
  lastAccessed: string;
  messageCount: number;
  tokenCount: number;
  preferredModel: "qwen3" | "claude" | "auto";
  settings: ChatSettings;
  tags: string[];
}
```

### Context Summary Schema

```typescript
interface ContextSummary {
  chatId: string;
  summary: string;
  keyPoints: string[];
  entities: {
    technologies: string[];
    files: string[];
    decisions: string[];
  };
  recentMessages: Message[];
  tokenCount: number;
  lastSummarized: string;
}
```

### Voice Transcript Schema

```typescript
interface VoiceTranscript {
  id: string;
  chatId: string;
  text: string;
  confidence: number;
  timestamp: string;
  duration: number;
}
```

### Image Generation Schema

```typescript
interface GeneratedImage {
  id: string;
  chatId: string;
  path: string;
  url: string;
  prompt: string;
  negativePrompt?: string;
  parameters: {
    width: number;
    height: number;
    steps: number;
    cfgScale: number;
    seed: number;
    sampler: string;
    model: string;
  };
  timestamp: string;
}
```

---

## Integration Points

### Ollama Integration

- **Endpoint:** `http://localhost:11434`
- **API:** REST + Streaming
- **Model:** qwen3
- **Use Cases:** General chat, code generation, quick responses

### Claude Integration

- **API:** Anthropic REST API
- **Model:** claude-sonnet-4.5
- **Use Cases:** Architecture decisions, code review, summarization

### Stable Diffusion Integration

- **Endpoint:** `http://localhost:7860`
- **API:** AUTOMATIC1111 Web UI API
- **Endpoints Used:**
  - `/sdapi/v1/txt2img`
  - `/sdapi/v1/img2img`
  - `/sdapi/v1/sd-models`
  - `/sdapi/v1/options`

### Web Speech API Integration

- **API:** Browser native
- **Features:** Speech recognition
- **Fallback:** Manual text input

---

## Security Considerations

### API Key Management

- Environment variables only
- Never commit to git
- Rotation strategy documented

### Sandbox Isolation

- Preview iframes sandboxed
- No inline script execution
- CSP headers enforced

### File System Access

- Restricted to context_storage directory
- Path traversal prevention
- File type validation

### User Data

- All stored locally
- No telemetry
- No cloud sync (MVP)

---

## Scalability & Extensibility

### Plugin Architecture (Future)

```
/plugins/
├── llm-providers/
│   ├── openai.ts
│   ├── gemini.ts
│   └── local-llama.ts
├── storage-backends/
│   ├── sqlite.ts
│   └── postgres.ts
└── preview-renderers/
    ├── pdf.ts
    └── jupyter.ts
```

### Configuration System

```typescript
interface AppConfig {
  models: {
    local: ModelConfig;
    cloud: ModelConfig;
    routing: RoutingStrategy;
  };
  storage: {
    backend: "file" | "sqlite" | "postgres";
    path: string;
    maxSize: number;
  };
  features: {
    voice: boolean;
    imageGeneration: boolean;
    preview: boolean;
  };
}
```

### Extension Points

1. Custom LLM providers
2. Storage backends
3. Preview renderers
4. Context strategies
5. Voice engines
6. Image generators

---

## Development Roadmap

### MVP (Current)

- [x] Architecture design
- [ ] Core backend services
- [ ] Frontend UI
- [ ] Context management
- [ ] Voice input
- [ ] Preview system
- [ ] Stable Diffusion integration

### v1.1 (Next)

- [ ] Multi-model routing optimization
- [ ] Batch image generation
- [ ] Context visualization
- [ ] Export/import chats

### v2.0 (Future)

- [ ] Plugin system
- [ ] Team collaboration
- [ ] Cloud sync (optional)
- [ ] Advanced analytics

---

_This architecture document is a living document and will be updated as the system evolves._
