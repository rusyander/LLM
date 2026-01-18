import React, { useState, useRef, useEffect } from "react";
import { Send, Mic, Check, Square } from "lucide-react";
import "./ChatInput.css";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "ru-RU";

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setInput((prev) => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
        setIsProcessing(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleMicClick = () => {
    if (!recognitionRef.current) {
      alert("Распознавание речи не поддерживается в вашем браузере");
      return;
    }

    if (isRecording) {
      // Stop recording
      recognitionRef.current.stop();
      setIsRecording(false);
      setIsProcessing(false);
    } else {
      // Start recording
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleStopClick = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setIsProcessing(false);
    }
  };

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input">
      <div className="input-wrapper">
        <button
          className={`mic-button ${isRecording ? "recording" : ""}`}
          onClick={handleMicClick}
          disabled={disabled}
          title={isRecording ? "Остановить запись" : "Начать запись"}
        >
          {isProcessing ? (
            <div className="spinner" />
          ) : isRecording ? (
            <Square size={20} />
          ) : (
            <Mic size={20} />
          )}
        </button>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введите сообщение или используйте голосовой ввод..."
          disabled={disabled}
          rows={1}
        />

        {isRecording && (
          <button
            className="stop-button"
            onClick={handleStopClick}
            title="Завершить запись"
          >
            <Check size={20} />
          </button>
        )}

        <button
          className="send-button"
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          title="Отправить"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};
