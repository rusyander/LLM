import { useCallback, useEffect, useRef, useState } from "react";
import { CLOSE_ANIMATION_MS, DEFAULT_BARS, SPEECH_CONFIG } from "../constants";
import { useAudioVisualizer } from "./useAudioVisualizer";
import { useLatestRef } from "./useLatestRef";
import { useSpeechRecognitionSession } from "./useSpeechRecognitionSession";
import type {
  RecognitionCompletion,
  RecorderCloseAction,
  UseVoiceRecorderOptions,
  UseVoiceRecorderResult,
} from "../types";

// Главный orchestrator recorder-модуля.
// Он не занимается низкоуровневым анализом сигнала или SpeechRecognition напрямую,
// а только склеивает эти части в единый жизненный цикл записи.
export const useVoiceRecorder = ({
  language,
  barsCount = DEFAULT_BARS,
  onAccept,
  onCancel,
  onError,
  onRecordingChange,
}: UseVoiceRecorderOptions): UseVoiceRecorderResult => {
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [activeAction, setActiveAction] = useState<RecorderCloseAction>(null);

  const mountedRef = useRef(true);
  const completionHandlerRef = useRef<
    ((completion: RecognitionCompletion) => void) | null
  >(null);

  // Храним актуальные callbacks в ref, чтобы не пересобирать подписки глубже по дереву.
  const onAcceptRef = useLatestRef(onAccept);
  const onCancelRef = useLatestRef(onCancel);
  const onErrorRef = useLatestRef(onError);
  const onRecordingChangeRef = useLatestRef(onRecordingChange);

  // Отдельный hook отвечает только за waveform и таймер записи.
  const {
    audioLevels,
    durationMs,
    startVisualizer,
    stopVisualizer,
    resetVisualizer,
  } = useAudioVisualizer({ barsCount });

  // Отдельный hook отвечает только за speech recognition и итоговый transcript.
  const {
    isSupported,
    resolvedLanguage,
    transcriptPreview,
    resetTranscript,
    startRecognition,
    acceptRecognition,
    cancelRecognition,
  } = useSpeechRecognitionSession({
    language,
    onActionChange: (action) => setActiveAction(action),
    onComplete: (completion) => completionHandlerRef.current?.(completion),
    onError: (message) => {
      onErrorRef.current?.(message);
    },
  });

  // Синхронизируем внутренний флаг записи и внешний callback родителя.
  const syncRecordingState = useCallback(
    (nextValue: boolean) => {
      if (!mountedRef.current) {
        return;
      }

      setIsRecording(nextValue);
      onRecordingChangeRef.current?.(nextValue);
    },
    [onRecordingChangeRef],
  );

  // Завершаем сессию после accept/cancel и даём UI доиграть анимацию закрытия.
  const finalizeSession = useCallback(
    ({ action, transcript }: RecognitionCompletion) => {
      stopVisualizer();
      setIsStarting(false);

      if (action === "accept" && transcript) {
        onAcceptRef.current(transcript);
      }

      if (action === "cancel") {
        onCancelRef.current?.();
      }

      window.setTimeout(() => {
        if (!mountedRef.current) {
          return;
        }

        resetTranscript();
        resetVisualizer();
        setActiveAction(null);
        syncRecordingState(false);
      }, CLOSE_ANIMATION_MS);
    },
    [
      onAcceptRef,
      onCancelRef,
      resetTranscript,
      resetVisualizer,
      stopVisualizer,
      syncRecordingState,
    ],
  );

  completionHandlerRef.current = finalizeSession;

  // Поднимаем микрофон, запускаем visualizer и только потом стартуем browser speech recognition.
  const startRecording = useCallback(async () => {
    if (!isSupported || isRecording || isStarting) {
      if (!isSupported) {
        onErrorRef.current?.(
          "Распознавание речи не поддерживается в этом браузере.",
        );
      }
      return;
    }

    setIsStarting(true);
    setActiveAction(null);
    resetTranscript();
    resetVisualizer();
    syncRecordingState(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: SPEECH_CONFIG,
      });

      try {
        startVisualizer(stream);
        const started = startRecognition();

        if (!started) {
          stopVisualizer();
          resetVisualizer();
          setIsStarting(false);
          syncRecordingState(false);
          return;
        }

        setIsStarting(false);
      } catch {
        stopVisualizer();
        resetVisualizer();
        setIsStarting(false);
        setActiveAction(null);
        syncRecordingState(false);
        onErrorRef.current?.(
          "Голосовой ввод не удалось запустить. Попробуй снова.",
        );
      }
    } catch {
      stopVisualizer();
      resetVisualizer();
      setIsStarting(false);
      setActiveAction(null);
      syncRecordingState(false);
      onErrorRef.current?.("Не удалось получить доступ к микрофону.");
    }
  }, [
    isSupported,
    isRecording,
    isStarting,
    onErrorRef,
    resetTranscript,
    resetVisualizer,
    startRecognition,
    startVisualizer,
    stopVisualizer,
    syncRecordingState,
  ]);

  const acceptRecording = useCallback(async () => {
    acceptRecognition();
  }, [acceptRecognition]);

  const cancelRecording = useCallback(async () => {
    cancelRecognition();
  }, [cancelRecognition]);

  useEffect(() => {
    if (!isRecording && !isStarting) {
      return;
    }

    // Если вкладку скрыли или страница уходит, принудительно останавливаем диктовку,
    // чтобы микрофон не оставался активным вне явного контекста пользователя.
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        return;
      }

      cancelRecognition();
      onErrorRef.current?.(
        "Голосовой ввод остановлен из соображений безопасности после скрытия вкладки.",
      );
    };

    const handlePageHide = () => {
      cancelRecognition();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [cancelRecognition, isRecording, isStarting, onErrorRef]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    isSupported,
    isRecording,
    isStarting,
    activeAction,
    audioLevels,
    transcriptPreview,
    durationMs,
    resolvedLanguage,
    startRecording,
    acceptRecording,
    cancelRecording,
  };
};
