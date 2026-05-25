# API Documentation

## Hybrid AI Workspace Application

**REST API Reference**

**Version:** 1.0.0  
**Base URL:** `http://localhost:3001/api`  
**Last Updated:** January 18, 2026

---

## Table of Contents

1. [Authentication](#authentication)
2. [Health & Status](#health--status)
3. [Chat Management](#chat-management)
4. [Messages](#messages)
5. [Context & Summary](#context--summary)
6. [Voice Input](#voice-input)
7. [Image Generation](#image-generation)
8. [Preview & Rendering](#preview--rendering)
9. [Error Handling](#error-handling)
10. [Rate Limits](#rate-limits)

---

## Authentication

Currently, the MVP does not require authentication. All endpoints are open.

**Future:** JWT-based authentication will be added in v2.0.

---

## Health & Status

### GET /api/health

Check system health and service availability.

**Request:**

```http
GET /api/health
```

**Response:**

```json
{
  "status": "ok",
  "services": {
    "ollama": true,
    "claude": true,
    "stableDiffusion": false,
    "voice": true,
    "preview": true
  },
  "mode": "hybrid",
  "timestamp": "2026-01-18T10:00:00.000Z"
}
```

**Status Codes:**

- `200 OK` - System healthy
- `503 Service Unavailable` - Critical service down

---

## Chat Management

### GET /api/chats

List all chats, sorted by last updated.

**Request:**

```http
GET /api/chats
```

**Response:**

```json
[
  {
    "id": "1737196800000",
    "title": "Build Todo App",
    "createdAt": 1737196800000,
    "updatedAt": 1737198000000
  }
]
```

---

### POST /api/chats

Create a new chat.

**Request:**

```http
POST /api/chats
Content-Type: application/json

{
  "title": "My New Chat"
}
```

**Response:**

```json
{
  "id": "1737196800000",
  "title": "My New Chat",
  "createdAt": 1737196800000,
  "updatedAt": 1737196800000
}
```

**Status Codes:**

- `200 OK` - Chat created
- `400 Bad Request` - Invalid input
- `500 Internal Server Error` - Creation failed

---

### GET /api/chats/:chatId

Get chat details including metadata.

**Request:**

```http
GET /api/chats/1737196800000
```

**Response:**

```json
{
  "id": "1737196800000",
  "title": "Build Todo App",
  "createdAt": 1737196800000,
  "updatedAt": 1737198000000,
  "metadata": {
    "version": "1.0.0",
    "chatId": "1737196800000",
    "statistics": {
      "messageCount": 12,
      "totalTokens": 5420,
      "averageResponseTime": 1400
    },
    "settings": {
      "preferredModel": "qwen3",
      "temperature": 0.7,
      "autoSummarize": true
    }
  }
}
```

**Status Codes:**

- `200 OK` - Chat found
- `404 Not Found` - Chat doesn't exist

---

### DELETE /api/chats/:chatId

Delete a chat completely (history, summary, metadata, artifacts).

**Request:**

```http
DELETE /api/chats/1737196800000
```

**Response:**

```json
{
  "success": true
}
```

**Status Codes:**

- `200 OK` - Chat deleted
- `404 Not Found` - Chat doesn't exist
- `500 Internal Server Error` - Deletion failed

---

### DELETE /api/chats/:chatId/context

Clear chat context (delete history and summary, keep metadata).

**Request:**

```http
DELETE /api/chats/1737196800000/context
```

**Response:**

```json
{
  "success": true
}
```

**Status Codes:**

- `200 OK` - Context cleared
- `404 Not Found` - Chat doesn't exist

---

### DELETE /api/contexts

Clear all chat contexts (global cleanup).

**Request:**

```http
DELETE /api/contexts
```

**Response:**

```json
{
  "success": true
}
```

**Status Codes:**

- `200 OK` - All contexts cleared
- `500 Internal Server Error` - Failed to clear

---

## Messages

### GET /api/chats/:chatId/messages

Get all messages for a chat.

**Request:**

```http
GET /api/chats/1737196800000/messages
```

**Response:**

```json
[
  {
    "id": "msg-1737196801000",
    "role": "user",
    "content": "Create a React component",
    "timestamp": 1737196801000,
    "chatId": "1737196800000"
  },
  {
    "id": "msg-1737196802000",
    "role": "assistant",
    "content": "I'll create a React component...",
    "timestamp": 1737196802000,
    "chatId": "1737196800000"
  }
]
```

**Status Codes:**

- `200 OK` - Messages retrieved
- `404 Not Found` - Chat doesn't exist

---

### POST /api/chats/:chatId/messages

Send a message and get AI response.

**Request:**

```http
POST /api/chats/1737196800000/messages
Content-Type: application/json

{
  "content": "Create a function to sort an array",
  "mode": "hybrid"
}
```

**Parameters:**

- `content` (string, required) - Message text
- `mode` (string, optional) - "local_only" | "hybrid" (default: from config)

**Response:**

```json
{
  "messageId": "msg-1737196802000",
  "response": "Here's a function to sort an array...",
  "model": "qwen3",
  "timestamp": "2026-01-18T10:00:02.000Z",
  "processingTime": 1234
}
```

**Status Codes:**

- `200 OK` - Message processed
- `404 Not Found` - Chat doesn't exist
- `500 Internal Server Error` - Processing failed

---

## Context & Summary

### GET /api/chats/:chatId/summary

Get context summary for LLM inference.

**Request:**

```http
GET /api/chats/1737196800000/summary
```

**Response:**

```json
{
  "version": "1.0.0",
  "chatId": "1737196800000",
  "summary": "User requested a React component...",
  "keyPoints": [
    "Created TodoList component",
    "Used TypeScript and hooks"
  ],
  "entities": {
    "technologies": ["React", "TypeScript"],
    "files": ["TodoList.tsx"],
    "decisions": [],
    "tasks": [],
    "codeReferences": [],
    "issues": []
  },
  "recentMessages": [...],
  "tokenCount": 512,
  "lastSummarized": "2026-01-18T10:00:05.000Z",
  "compressionRatio": 0.9
}
```

**Status Codes:**

- `200 OK` - Summary retrieved
- `404 Not Found` - No summary available

---

### POST /api/chats/:chatId/summarize

Manually trigger summarization (calls Claude to generate summary).

**Request:**

```http
POST /api/chats/1737196800000/summarize
```

**Response:**

```json
{
  "success": true,
  "message": "Summarization triggered"
}
```

**Status Codes:**

- `200 OK` - Summarization started
- `503 Service Unavailable` - Claude not available

---

### GET /api/chats/:chatId/metadata

Get chat metadata (statistics, settings, tags).

**Request:**

```http
GET /api/chats/1737196800000/metadata
```

**Response:**

```json
{
  "version": "1.0.0",
  "chatId": "1737196800000",
  "title": "Build Todo App",
  "createdAt": "2026-01-18T10:00:00.000Z",
  "lastAccessed": "2026-01-18T10:30:00.000Z",
  "statistics": {
    "messageCount": 12,
    "totalTokens": 5420,
    "modelUsage": {
      "qwen3": 10,
      "claude": 2
    }
  },
  "settings": {
    "preferredModel": "qwen3",
    "temperature": 0.7,
    "autoSummarize": true
  },
  "tags": ["react", "tutorial"]
}
```

---

## Voice Input

### POST /api/voice/start

Start a new voice recording session.

**Request:**

```http
POST /api/voice/start
Content-Type: application/json

{
  "chatId": "1737196800000"
}
```

**Response:**

```json
{
  "sessionId": "voice-1737196850000"
}
```

**Status Codes:**

- `200 OK` - Session started

---

### POST /api/voice/:sessionId/segment

Add a transcript segment to an active session (cumulative).

**Request:**

```http
POST /api/voice/voice-1737196850000/segment
Content-Type: application/json

{
  "text": "Create a function",
  "confidence": 0.95,
  "interim": false
}
```

**Parameters:**

- `text` (string, required) - Transcribed text
- `confidence` (number, required) - Confidence score (0-1)
- `interim` (boolean, optional) - Is this a final result? (default: false)

**Response:**

```json
{
  "segment": {
    "id": "segment-1737196850001",
    "text": "Create a function",
    "confidence": 0.95,
    "startTime": 0,
    "endTime": 1500,
    "interim": false,
    "timestamp": "2026-01-18T10:00:50.001Z"
  },
  "cumulativeText": "Create a function"
}
```

**Status Codes:**

- `200 OK` - Segment added
- `404 Not Found` - Session not found

---

### GET /api/voice/:sessionId

Get current session state.

**Request:**

```http
GET /api/voice/voice-1737196850000
```

**Response:**

```json
{
  "id": "voice-1737196850000",
  "chatId": "1737196800000",
  "startTime": 1737196850000,
  "segments": [...],
  "cumulativeText": "Create a function to calculate fibonacci",
  "status": "active"
}
```

---

### POST /api/voice/:sessionId/complete

Complete a voice session and save transcript.

**Request:**

```http
POST /api/voice/voice-1737196850000/complete
Content-Type: application/json

{
  "messageId": "msg-1737196851000"
}
```

**Response:**

```json
{
  "id": "voice-1737196850000",
  "chatId": "1737196800000",
  "messageId": "msg-1737196851000",
  "segments": [...],
  "finalText": "Create a function to calculate fibonacci",
  "confidence": 0.93,
  "duration": 3800,
  "language": "en-US",
  "timestamp": "2026-01-18T10:00:50.000Z",
  "status": "completed"
}
```

**Status Codes:**

- `200 OK` - Session completed
- `404 Not Found` - Session not found

---

### POST /api/voice/:sessionId/cancel

Cancel a voice session.

**Request:**

```http
POST /api/voice/voice-1737196850000/cancel
```

**Response:**

```json
{
  "success": true
}
```

---

### GET /api/voice/chats/:chatId/transcripts

List all voice transcripts for a chat.

**Request:**

```http
GET /api/voice/chats/1737196800000/transcripts
```

**Response:**

```json
[
  {
    "id": "voice-1737196850000",
    "chatId": "1737196800000",
    "finalText": "Create a function...",
    "confidence": 0.93,
    "duration": 3800,
    "timestamp": "2026-01-18T10:00:50.000Z"
  }
]
```

---

## Image Generation

### POST /api/images/generate

Generate image from text (txt2img).

**Request:**

```http
POST /api/images/generate
Content-Type: application/json

{
  "chatId": "1737196800000",
  "messageId": "msg-1737197000000",
  "prompt": "a serene mountain landscape at sunset",
  "negativePrompt": "blurry, low quality",
  "width": 512,
  "height": 768,
  "steps": 30,
  "cfgScale": 7.5,
  "seed": 42,
  "sampler": "DPM++ 2M Karras"
}
```

**Parameters:**

- `chatId` (string, required)
- `messageId` (string, required)
- `prompt` (string, required)
- `negativePrompt` (string, optional)
- `width` (number, optional, default: 512)
- `height` (number, optional, default: 512)
- `steps` (number, optional, default: 30)
- `cfgScale` (number, optional, default: 7.5)
- `seed` (number, optional, random if not provided)
- `sampler` (string, optional, default: "DPM++ 2M Karras")

**Response:**

```json
{
  "id": "img-1737197000000",
  "chatId": "1737196800000",
  "messageId": "msg-1737197000000",
  "type": "txt2img",
  "prompt": "a serene mountain landscape at sunset",
  "outputPath": "context_storage/chat_1737196800000/artifacts/images/img_1737197000000.png",
  "url": "/api/images/1737196800000/img_1737197000000.png",
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
    "generationTime": 8500
  },
  "timestamp": "2026-01-18T10:03:20.000Z"
}
```

**Status Codes:**

- `200 OK` - Image generated
- `400 Bad Request` - Invalid parameters
- `503 Service Unavailable` - SD not available
- `500 Internal Server Error` - Generation failed

---

### POST /api/images/img2img

Generate image from image (img2img).

**Request:**

```http
POST /api/images/img2img
Content-Type: multipart/form-data

chatId=1737196800000
messageId=msg-1737197000000
prompt=artistic style transformation
negativePrompt=low quality
denoisingStrength=0.75
image=<file>
```

**Parameters:**

- `chatId` (string, required)
- `messageId` (string, required)
- `prompt` (string, required)
- `negativePrompt` (string, optional)
- `denoisingStrength` (number, optional, default: 0.75, range: 0-1)
- `image` (file, required) - Input image file

**Response:** Same as txt2img

---

### GET /api/images/chats/:chatId/list

List all generated images for a chat.

**Request:**

```http
GET /api/images/chats/1737196800000/list
```

**Response:**

```json
[
  {
    "id": "img-1737197000000",
    "prompt": "mountain landscape",
    "url": "/api/images/1737196800000/img_1737197000000.png",
    "timestamp": "2026-01-18T10:03:20.000Z"
  }
]
```

---

### GET /api/images/models

Get available Stable Diffusion models.

**Request:**

```http
GET /api/images/models
```

**Response:**

```json
[
  {
    "title": "SD XL Base 1.0",
    "model_name": "sd_xl_base_1.0.safetensors",
    "hash": "a1b2c3d4",
    "filename": "sd_xl_base_1.0.safetensors"
  }
]
```

---

### GET /api/images/samplers

Get available samplers.

**Request:**

```http
GET /api/images/samplers
```

**Response:**

```json
["Euler a", "DPM++ 2M Karras", "DDIM", "UniPC"]
```

---

### POST /api/images/interrupt

Interrupt ongoing image generation.

**Request:**

```http
POST /api/images/interrupt
```

**Response:**

```json
{
  "success": true
}
```

---

### GET /api/images/progress

Get current generation progress.

**Request:**

```http
GET /api/images/progress
```

**Response:**

```json
{
  "progress": 0.45,
  "eta": 12.5,
  "state": {
    "job_count": 1,
    "sampling_step": 13,
    "sampling_steps": 30
  }
}
```

---

## Preview & Rendering

### POST /api/preview/render

Render preview for various content types.

**Request:**

```http
POST /api/preview/render
Content-Type: application/json

{
  "type": "html",
  "content": "<h1>Hello World</h1>",
  "language": "html",
  "sandbox": true,
  "theme": "dark",
  "options": {
    "enableScripts": false,
    "enableStyles": true
  }
}
```

**Parameters:**

- `type` (string, required) - "html" | "markdown" | "code" | "json" | "image"
- `content` (string, required) - Content to render
- `language` (string, optional) - For code type (e.g., "typescript")
- `sandbox` (boolean, optional, default: true) - Enable sandboxing
- `theme` (string, optional, default: "dark") - "light" | "dark"
- `options` (object, optional) - Type-specific options

**Response:**

```json
{
  "id": "preview-1737197100000",
  "rendered": "<!DOCTYPE html>...",
  "mimeType": "text/html",
  "size": 2048,
  "timestamp": "2026-01-18T10:05:00.000Z"
}
```

**Status Codes:**

- `200 OK` - Preview rendered
- `400 Bad Request` - Invalid type or content
- `500 Internal Server Error` - Rendering failed

---

### POST /api/preview/extract-code

Extract code blocks from markdown or chat content.

**Request:**

````http
POST /api/preview/extract-code
Content-Type: application/json

{
  "content": "Here's a function:\n```typescript\nfunction hello() {}\n```"
}
````

**Response:**

```json
[
  {
    "language": "typescript",
    "code": "function hello() {}",
    "startLine": 2
  }
]
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {
    "field": "additional context"
  }
}
```

### Common Error Codes

| Code                   | HTTP Status | Description                  |
| ---------------------- | ----------- | ---------------------------- |
| `CHAT_NOT_FOUND`       | 404         | Chat doesn't exist           |
| `INVALID_INPUT`        | 400         | Request validation failed    |
| `SERVICE_UNAVAILABLE`  | 503         | Required service is down     |
| `GENERATION_FAILED`    | 500         | Image generation error       |
| `SUMMARIZATION_FAILED` | 500         | Context summarization error  |
| `STORAGE_ERROR`        | 500         | File system operation failed |

---

## Rate Limits

**MVP:** No rate limiting

**Future:**

- 100 requests/minute per IP
- 1000 requests/hour per user
- 10 concurrent image generations

---

## WebSocket Support

**Future:** Real-time updates for:

- Streaming LLM responses
- Image generation progress
- Voice transcription interim results

**Endpoint:** `ws://localhost:3001/ws`

---

## Changelog

### v1.0.0 (2026-01-18)

- Initial MVP release
- Full REST API
- Context management
- Voice input
- Image generation
- Preview system

---

**Last Updated:** January 18, 2026  
**Maintained By:** Development Team
