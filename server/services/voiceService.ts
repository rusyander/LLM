/**
 * Voice Service
 * 
 * Handles voice input transcription with cumulative append-only model
 * Server-side management of voice transcripts
 */

import fs from "fs/promises";
import path from "path";

export interface VoiceTranscript {
  id: string;
  chatId: string;
  messageId?: string;
  segments: TranscriptSegment[];
  finalText: string;
  confidence: number;
  duration: number;
  language: string;
  timestamp: string;
  status: "recording" | "completed" | "cancelled";
}

export interface TranscriptSegment {
  id: string;
  text: string;
  confidence: number;
  startTime: number;
  endTime: number;
  interim: boolean;
  timestamp: string;
}

export interface TranscriptSession {
  id: string;
  chatId: string;
  startTime: number;
  segments: TranscriptSegment[];
  cumulativeText: string;
  status: "active" | "completed" | "cancelled";
}

export class VoiceService {
  private activeSessions: Map<string, TranscriptSession> = new Map();

  /**
   * Start a new voice recording session
   */
  startSession(chatId: string): string {
    const sessionId = `voice-${Date.now()}`;
    
    const session: TranscriptSession = {
      id: sessionId,
      chatId,
      startTime: Date.now(),
      segments: [],
      cumulativeText: "",
      status: "active"
    };

    this.activeSessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Add a segment to an active session (append-only)
   */
  addSegment(
    sessionId: string,
    text: string,
    confidence: number,
    interim: boolean = false
  ): TranscriptSegment | null {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== "active") {
      return null;
    }

    const now = Date.now();
    const startTime = session.segments.length > 0
      ? session.segments[session.segments.length - 1].endTime
      : 0;

    const segment: TranscriptSegment = {
      id: `segment-${now}`,
      text,
      confidence,
      startTime,
      endTime: now - session.startTime,
      interim,
      timestamp: new Date().toISOString()
    };

    if (!interim) {
      // Only add final (confirmed) segments
      session.segments.push(segment);
      
      // Update cumulative text
      if (session.cumulativeText.length > 0) {
        session.cumulativeText += " ";
      }
      session.cumulativeText += text;
    }

    return segment;
  }

  /**
   * Get current session state
   */
  getSession(sessionId: string): TranscriptSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get cumulative text for a session
   */
  getCumulativeText(sessionId: string): string {
    const session = this.activeSessions.get(sessionId);
    return session?.cumulativeText || "";
  }

  /**
   * Complete a session and save transcript
   */
  async completeSession(
    sessionId: string,
    messageId?: string
  ): Promise<VoiceTranscript | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return null;
    }

    session.status = "completed";

    // Calculate average confidence
    const avgConfidence = session.segments.length > 0
      ? session.segments.reduce((sum, s) => sum + s.confidence, 0) / session.segments.length
      : 0;

    // Calculate total duration
    const duration = Date.now() - session.startTime;

    const transcript: VoiceTranscript = {
      id: sessionId,
      chatId: session.chatId,
      messageId,
      segments: session.segments,
      finalText: session.cumulativeText,
      confidence: avgConfidence,
      duration,
      language: "en-US", // Can be detected
      timestamp: new Date().toISOString(),
      status: "completed"
    };

    // Save transcript to disk
    await this.saveTranscript(transcript);

    // Clean up session
    this.activeSessions.delete(sessionId);

    return transcript;
  }

  /**
   * Cancel a session
   */
  cancelSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.status = "cancelled";
    this.activeSessions.delete(sessionId);
    return true;
  }

  /**
   * Save transcript to disk
   */
  private async saveTranscript(transcript: VoiceTranscript): Promise<void> {
    try {
      const chatDir = path.join(
        process.cwd(),
        "context_storage",
        `chat_${transcript.chatId}`
      );
      const transcriptDir = path.join(chatDir, "voice_transcripts");
      
      await fs.mkdir(transcriptDir, { recursive: true });

      const filePath = path.join(transcriptDir, `${transcript.id}.json`);
      await fs.writeFile(
        filePath,
        JSON.stringify(transcript, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("Failed to save transcript:", error);
    }
  }

  /**
   * Get transcript by ID
   */
  async getTranscript(
    chatId: string,
    transcriptId: string
  ): Promise<VoiceTranscript | null> {
    try {
      const chatDir = path.join(
        process.cwd(),
        "context_storage",
        `chat_${chatId}`
      );
      const transcriptDir = path.join(chatDir, "voice_transcripts");
      const filePath = path.join(transcriptDir, `${transcriptId}.json`);

      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * List all transcripts for a chat
   */
  async listTranscripts(chatId: string): Promise<VoiceTranscript[]> {
    try {
      const chatDir = path.join(
        process.cwd(),
        "context_storage",
        `chat_${chatId}`
      );
      const transcriptDir = path.join(chatDir, "voice_transcripts");
      
      const files = await fs.readdir(transcriptDir);
      const jsonFiles = files.filter(f => f.endsWith(".json"));

      const transcripts: VoiceTranscript[] = [];
      for (const file of jsonFiles) {
        const content = await fs.readFile(
          path.join(transcriptDir, file),
          "utf-8"
        );
        transcripts.push(JSON.parse(content));
      }

      return transcripts.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      return [];
    }
  }

  /**
   * Delete transcript
   */
  async deleteTranscript(chatId: string, transcriptId: string): Promise<boolean> {
    try {
      const chatDir = path.join(
        process.cwd(),
        "context_storage",
        `chat_${chatId}`
      );
      const transcriptDir = path.join(chatDir, "voice_transcripts");
      const filePath = path.join(transcriptDir, `${transcriptId}.json`);

      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error("Failed to delete transcript:", error);
      return false;
    }
  }

  /**
   * Get statistics for a chat's voice usage
   */
  async getVoiceStatistics(chatId: string): Promise<{
    totalTranscripts: number;
    totalDuration: number;
    averageConfidence: number;
    totalSegments: number;
  }> {
    const transcripts = await this.listTranscripts(chatId);

    const stats = {
      totalTranscripts: transcripts.length,
      totalDuration: 0,
      averageConfidence: 0,
      totalSegments: 0
    };

    if (transcripts.length === 0) {
      return stats;
    }

    for (const transcript of transcripts) {
      stats.totalDuration += transcript.duration;
      stats.averageConfidence += transcript.confidence;
      stats.totalSegments += transcript.segments.length;
    }

    stats.averageConfidence /= transcripts.length;

    return stats;
  }

  /**
   * Clean up old sessions (called periodically)
   */
  cleanupStale Sessions(maxAgeMs: number = 3600000): void {
    const now = Date.now();
    
    for (const [sessionId, session] of this.activeSessions) {
      const age = now - session.startTime;
      if (age > maxAgeMs) {
        console.log(`Cleaning up stale session: ${sessionId}`);
        this.activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): TranscriptSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get active sessions count for a chat
   */
  getActiveSessionCount(chatId: string): number {
    return Array.from(this.activeSessions.values())
      .filter(s => s.chatId === chatId)
      .length;
  }
}
