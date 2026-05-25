import React, { useState } from "react";
import { Send } from "lucide-react";
import "./ChatInput.css";
import { VoiceRecorderControl } from "./voice-recorder";

const SHOW_VOICE_LANGUAGE_DEBUG = true;

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState("");
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleVoiceAccept = (transcript: string) => {
    setInput((prev) =>
      `${prev.trim()} ${transcript}`.replace(/\s+/g, " ").trim(),
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input">
      <div
        className={`input-wrapper ${isVoiceRecording ? "input-wrapper--recording" : ""}`}
      >
        {!isVoiceRecording && (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите сообщение или используйте голосовой ввод..."
            disabled={disabled}
            rows={1}
          />
        )}

        <div
          className={`voice-recorder-slot ${isVoiceRecording ? "voice-recorder-slot--recording" : ""}`}
        >
          <VoiceRecorderControl
            disabled={disabled}
            onAccept={handleVoiceAccept}
            onRecordingChange={setIsVoiceRecording}
            showResolvedLanguageDebug={SHOW_VOICE_LANGUAGE_DEBUG}
          />
        </div>

        {!isVoiceRecording && (
          <button
            className="send-button"
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            title="Отправить"
            type="button"
          >
            <Send size={20} />
          </button>
        )}
      </div>
    </div>
  );
};
