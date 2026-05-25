import React, { useEffect, useState } from "react";
import { Check, Mic, Plus, X } from "lucide-react";
import { useVoiceRecorder } from "./useVoiceRecorder";
import "./VoiceRecorderControl.css";

interface VoiceRecorderControlProps {
  disabled?: boolean;
  language?: string;
  onAccept: (transcript: string) => void;
  onCancel?: () => void;
  onError?: (message: string) => void;
  onRecordingChange?: (isRecording: boolean) => void;
  footerNote?: string;
  leadingAdornment?: React.ReactNode;
}

const DEFAULT_FOOTNOTE =
  "ChatGPT может допускать ошибки. Рекомендуем проверять важную информацию.";

export const VoiceRecorderControl: React.FC<VoiceRecorderControlProps> = ({
  disabled,
  language,
  onAccept,
  onCancel,
  onError,
  onRecordingChange,
  footerNote,
  leadingAdornment,
}) => {
  const [helperMessage, setHelperMessage] = useState(
    footerNote ?? DEFAULT_FOOTNOTE,
  );

  const {
    isSupported,
    isRecording,
    isStarting,
    activeAction,
    audioLevels,
    startRecording,
    acceptRecording,
    cancelRecording,
  } = useVoiceRecorder({
    language,
    onAccept,
    onCancel,
    onError: (message) => {
      setHelperMessage(message);
      onError?.(message);
    },
    onRecordingChange,
  });

  useEffect(() => {
    if (isRecording) {
      setHelperMessage(footerNote ?? DEFAULT_FOOTNOTE);
    }
  }, [footerNote, isRecording]);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const lowerCaseKey = event.key.toLowerCase();

      if (event.key === "Escape") {
        event.preventDefault();
        void cancelRecording();
      }

      if (event.ctrlKey && event.shiftKey && lowerCaseKey === "d") {
        event.preventDefault();
        void acceptRecording();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [acceptRecording, cancelRecording, isRecording]);

  if (!isRecording) {
    return (
      <button
        className="voice-recorder-trigger"
        onClick={() => void startRecording()}
        disabled={disabled || !isSupported || isStarting}
        title={
          !isSupported
            ? "Голосовой ввод не поддерживается браузером"
            : "Начать голосовой ввод"
        }
        type="button"
      >
        <Mic size={20} />
      </button>
    );
  }

  return (
    <div
      className={[
        "voice-recorder-shell",
        activeAction ? `voice-recorder-shell--${activeAction}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={[
          "voice-recorder-panel",
          activeAction ? `voice-recorder-panel--${activeAction}` : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="voice-recorder-leading" aria-hidden="true">
          {leadingAdornment ?? <Plus size={18} />}
        </div>

        <div
          className="voice-recorder-track"
          aria-label="Идет голосовая диктовка"
        >
          <div className="voice-recorder-baseline" />
          <div
            className="voice-recorder-waveform"
            aria-hidden="true"
            style={
              {
                ["--voice-bars-count" as string]: String(audioLevels.length),
              } as React.CSSProperties
            }
          >
            {audioLevels.map((level, index) => (
              <span
                key={index}
                className="voice-recorder-bar"
                style={
                  {
                    ["--voice-bar-height" as string]: `${Math.max(level * 28, 2)}px`,
                    animationDelay: `${index * 12}ms`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        </div>

        <div className="voice-recorder-actions">
          <button
            className="voice-recorder-action voice-recorder-action--cancel"
            onClick={() => void cancelRecording()}
            title="Отменить диктовку"
            data-tooltip="Отменить диктовку ESC"
            type="button"
            disabled={activeAction !== null || isStarting}
          >
            <X size={18} />
          </button>

          <button
            className="voice-recorder-action voice-recorder-action--accept"
            onClick={() => void acceptRecording()}
            title="Готово"
            data-tooltip="Готово Ctrl + Shift + D"
            type="button"
            disabled={activeAction !== null || isStarting}
          >
            <Check size={18} />
          </button>
        </div>
      </div>

      <div
        className={[
          "voice-recorder-footnote",
          helperMessage !== (footerNote ?? DEFAULT_FOOTNOTE)
            ? "voice-recorder-footnote--error"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {helperMessage}
      </div>
    </div>
  );
};
