import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_TRANSCRIPT_LENGTH } from "../constants";
import { useLatestRef } from "./useLatestRef";
import { getPreferredSpeechLanguage } from "../utils/speechLanguage";
import { getSpeechRecognitionConstructor } from "../utils/speechRecognition";
import type {
  RecognitionCompletion,
  RecorderCloseAction,
  RecorderCompletionAction,
  SpeechRecognitionLike,
} from "../types";

interface UseSpeechRecognitionSessionOptions {
  language?: string;
  onComplete: (completion: RecognitionCompletion) => void;
  onError?: (message: string) => void;
  onActionChange?: (action: RecorderCompletionAction) => void;
}

interface UseSpeechRecognitionSessionResult {
  isSupported: boolean;
  resolvedLanguage: string;
  transcriptPreview: string;
  resetTranscript: () => void;
  startRecognition: () => boolean;
  acceptRecognition: () => void;
  cancelRecognition: () => void;
}

const CONTROL_CHARS_REGEX = /[\u0000-\u001f\u007f]/g;

const sanitizeTranscriptChunk = (value: string) =>
  value.replace(CONTROL_CHARS_REGEX, " ");

const clampTranscriptLength = (value: string) =>
  value.length > MAX_TRANSCRIPT_LENGTH
    ? value.slice(0, MAX_TRANSCRIPT_LENGTH).trim()
    : value;

const buildTranscript = (finalTranscript: string, interimTranscript: string) =>
  clampTranscriptLength(
    `${finalTranscript} ${interimTranscript}`
      .replace(CONTROL_CHARS_REGEX, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

// Этот hook изолирует только browser SpeechRecognition:
// выбор языка, сборку transcript и жизненный цикл accept/cancel.
export const useSpeechRecognitionSession = ({
  language,
  onComplete,
  onError,
  onActionChange,
}: UseSpeechRecognitionSessionOptions): UseSpeechRecognitionSessionResult => {
  const [transcriptPreview, setTranscriptPreview] = useState("");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldRestartRef = useRef(false);
  const pendingCloseActionRef = useRef<RecorderCloseAction>(null);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");

  const onCompleteRef = useLatestRef(onComplete);
  const onErrorRef = useLatestRef(onError);
  const onActionChangeRef = useLatestRef(onActionChange);

  // Проверяем поддержку браузерного распознавания и доступа к микрофону.
  const isSupported = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      window.isSecureContext &&
      !!getSpeechRecognitionConstructor() &&
      !!navigator.mediaDevices?.getUserMedia
    );
  }, []);

  const resolvedLanguage = useMemo(() => {
    if (language?.trim()) {
      return language;
    }

    return getPreferredSpeechLanguage();
  }, [language]);

  // Очищает весь накопленный transcript перед новой записью.
  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    setTranscriptPreview("");
  }, []);

  const getTranscript = useCallback(
    () =>
      buildTranscript(finalTranscriptRef.current, interimTranscriptRef.current),
    [],
  );

  // Передаёт наружу итоговую строку только после полного завершения speech-сессии.
  const finalizePendingAction = useCallback(
    (action: RecorderCompletionAction) => {
      onCompleteRef.current({
        action,
        transcript: getTranscript(),
      });
    },
    [getTranscript, onCompleteRef],
  );

  // Создаёт и настраивает browser SpeechRecognition один раз на сессию.
  const buildRecognition = useCallback(() => {
    if (recognitionRef.current || !isSupported) {
      return recognitionRef.current;
    }

    const Recognition = getSpeechRecognitionConstructor();

    if (!Recognition) {
      return null;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = resolvedLanguage;

    recognition.onresult = (event) => {
      let nextFinal = finalTranscriptRef.current;
      let nextInterim = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        const transcript = sanitizeTranscriptChunk(result[0]?.transcript ?? "");

        if (result.isFinal) {
          nextFinal = clampTranscriptLength(
            `${nextFinal}${transcript.trim()} `,
          );
        } else {
          nextInterim = clampTranscriptLength(`${nextInterim}${transcript}`);
        }
      }

      finalTranscriptRef.current = nextFinal;
      interimTranscriptRef.current = nextInterim;
      setTranscriptPreview(buildTranscript(nextFinal, nextInterim));
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" && pendingCloseActionRef.current) {
        return;
      }

      if (event.error === "no-speech") {
        return;
      }

      shouldRestartRef.current = false;
      pendingCloseActionRef.current = "cancel";
      onActionChangeRef.current?.("cancel");
      onErrorRef.current?.(
        "Не удалось распознать речь. Проверь доступ к микрофону и попробуй снова.",
      );
    };

    recognition.onend = () => {
      const pendingAction = pendingCloseActionRef.current;

      // Если браузер сам оборвал сессию, а пользователь всё ещё пишет речь,
      // пробуем мягко перезапустить распознавание.
      if (shouldRestartRef.current && !pendingAction) {
        window.setTimeout(() => {
          try {
            recognition.start();
          } catch {
            shouldRestartRef.current = false;
            onErrorRef.current?.(
              "Голосовой ввод был остановлен браузером. Попробуй начать запись снова.",
            );
          }
        }, 120);
        return;
      }

      if (pendingAction) {
        shouldRestartRef.current = false;
        pendingCloseActionRef.current = null;
        finalizePendingAction(pendingAction);
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [
    finalizePendingAction,
    isSupported,
    onActionChangeRef,
    onErrorRef,
    resolvedLanguage,
  ]);

  useEffect(() => {
    if (recognitionRef.current) {
      // Если язык поменялся между сессиями, подхватываем его без пересоздания hook.
      recognitionRef.current.lang = resolvedLanguage;
    }
  }, [resolvedLanguage]);

  // Завершает сессию либо через stop, либо через abort в зависимости от сценария.
  const completeRecognition = useCallback(
    (action: RecorderCompletionAction, method: "stop" | "abort") => {
      if (pendingCloseActionRef.current) {
        return;
      }

      shouldRestartRef.current = false;
      pendingCloseActionRef.current = action;
      onActionChangeRef.current?.(action);

      if (!recognitionRef.current) {
        pendingCloseActionRef.current = null;
        finalizePendingAction(action);
        return;
      }

      try {
        if (method === "abort") {
          recognitionRef.current?.abort();
        } else {
          recognitionRef.current?.stop();
        }
      } catch {
        pendingCloseActionRef.current = null;
        finalizePendingAction(action);
      }
    },
    [finalizePendingAction, onActionChangeRef],
  );

  // Стартует browser SpeechRecognition и включает автоперезапуск на случай обрыва браузером.
  const startRecognition = useCallback(() => {
    const recognition = buildRecognition();

    if (!recognition) {
      onErrorRef.current?.(
        "Распознавание речи недоступно: нужен совместимый браузер и защищенное соединение.",
      );
      return false;
    }

    shouldRestartRef.current = true;
    pendingCloseActionRef.current = null;
    recognition.lang = resolvedLanguage;

    try {
      recognition.start();
      return true;
    } catch {
      shouldRestartRef.current = false;
      throw new Error("speech-recognition-start-failed");
    }
  }, [buildRecognition, onErrorRef, resolvedLanguage]);

  const acceptRecognition = useCallback(() => {
    completeRecognition("accept", "stop");
  }, [completeRecognition]);

  const cancelRecognition = useCallback(() => {
    completeRecognition("cancel", "abort");
  }, [completeRecognition]);

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      pendingCloseActionRef.current = null;

      try {
        recognitionRef.current?.abort();
      } catch {
        // Игнорируем браузерные ошибки abort во время штатного cleanup.
      }
    };
  }, []);

  return {
    isSupported,
    resolvedLanguage,
    transcriptPreview,
    resetTranscript,
    startRecognition,
    acceptRecognition,
    cancelRecognition,
  };
};
