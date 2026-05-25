import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
  length: number;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type RecorderCloseAction = "accept" | "cancel" | null;

interface UseVoiceRecorderOptions {
  language?: string;
  barsCount?: number;
  onAccept: (transcript: string) => void;
  onCancel?: () => void;
  onError?: (message: string) => void;
  onRecordingChange?: (isRecording: boolean) => void;
}

interface UseVoiceRecorderResult {
  isSupported: boolean;
  isRecording: boolean;
  isStarting: boolean;
  activeAction: RecorderCloseAction;
  audioLevels: number[];
  transcriptPreview: string;
  durationMs: number;
  startRecording: () => Promise<void>;
  acceptRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
}

const DEFAULT_BARS = 128;
const BASELINE_LEVEL = 0.085;
const SILENCE_THRESHOLD = 0.038;
const CLOSE_ANIMATION_MS = 1600;
const WAVEFORM_SHIFT_INTERVAL_MS = 50;
const SPEECH_CONFIG: MediaTrackConstraints = {
  autoGainControl: true,
  echoCancellation: true,
  noiseSuppression: true,
};

const getSpeechRecognitionConstructor =
  (): SpeechRecognitionConstructor | null => {
    const windowWithSpeech = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    return (
      windowWithSpeech.SpeechRecognition ??
      windowWithSpeech.webkitSpeechRecognition ??
      null
    );
  };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const createLevelArray = (barsCount: number, initial = BASELINE_LEVEL) =>
  Array.from({ length: barsCount }, () => initial);

const createIdleLevel = (now = performance.now()) =>
  clamp(BASELINE_LEVEL + ((Math.sin(now / 240) + 1) / 2) * 0.02, 0.03, 0.08);

const pushWaveHistory = (previous: number[], nextLevel: number) => {
  const next = previous.slice(1);
  next.push(nextLevel);
  return next;
};

export const useVoiceRecorder = ({
  language = "ru-RU",
  barsCount = DEFAULT_BARS,
  onAccept,
  onCancel,
  onError,
  onRecordingChange,
}: UseVoiceRecorderOptions): UseVoiceRecorderResult => {
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [activeAction, setActiveAction] = useState<RecorderCloseAction>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>(() =>
    createLevelArray(barsCount),
  );
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const [durationMs, setDurationMs] = useState(0);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const durationTimerRef = useRef<number | null>(null);
  const shouldRestartRef = useRef(false);
  const pendingCloseActionRef = useRef<RecorderCloseAction>(null);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const mountedRef = useRef(true);
  const onAcceptRef = useRef(onAccept);
  const onCancelRef = useRef(onCancel);
  const onErrorRef = useRef(onError);
  const onRecordingChangeRef = useRef(onRecordingChange);

  const isSupported = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      !!getSpeechRecognitionConstructor() &&
      !!navigator.mediaDevices?.getUserMedia
    );
  }, []);

  useEffect(() => {
    onAcceptRef.current = onAccept;
  }, [onAccept]);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onRecordingChangeRef.current = onRecordingChange;
  }, [onRecordingChange]);

  const syncRecordingState = useCallback((nextValue: boolean) => {
    if (!mountedRef.current) {
      return;
    }

    setIsRecording(nextValue);
    onRecordingChangeRef.current?.(nextValue);
  }, []);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    setTranscriptPreview("");
  }, []);

  const resetVisualizer = useCallback(() => {
    setAudioLevels(createLevelArray(barsCount));
  }, [barsCount]);

  const stopAudioCapture = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (durationTimerRef.current !== null) {
      window.clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const finalizeSession = useCallback(
    (action: RecorderCloseAction) => {
      shouldRestartRef.current = false;
      pendingCloseActionRef.current = null;
      stopAudioCapture();
      setIsStarting(false);

      const transcript =
        `${finalTranscriptRef.current} ${interimTranscriptRef.current}`
          .replace(/\s+/g, " ")
          .trim();

      if (action === "accept" && transcript) {
        onAcceptRef.current(transcript);
      }

      if (action === "cancel") {
        onCancelRef.current?.();
      }

      window.setTimeout(() => {
        if (mountedRef.current) {
          resetTranscript();
          resetVisualizer();
          setActiveAction(null);
          setDurationMs(0);
          syncRecordingState(false);
        }
      }, CLOSE_ANIMATION_MS);
    },
    [resetTranscript, resetVisualizer, stopAudioCapture, syncRecordingState],
  );

  const startWaveformLoop = useCallback(
    (analyser: AnalyserNode) => {
      const buffer = new Uint8Array(analyser.fftSize);
      let previous = createLevelArray(barsCount);
      let smoothedLevel = BASELINE_LEVEL;
      let lastShiftAt = performance.now();

      const tick = () => {
        const now = performance.now();
        analyser.getByteTimeDomainData(buffer);

        let squaredSum = 0;

        for (let index = 0; index < buffer.length; index += 1) {
          const normalizedSample = (buffer[index] - 128) / 128;
          squaredSum += normalizedSample * normalizedSample;
        }

        const rms = Math.sqrt(squaredSum / Math.max(1, buffer.length));
        const targetLevel =
          rms < SILENCE_THRESHOLD
            ? createIdleLevel()
            : clamp(BASELINE_LEVEL + rms * 5.2, 0.09, 0.96);

        smoothedLevel = smoothedLevel * 0.68 + targetLevel * 0.32;

        if (now - lastShiftAt >= WAVEFORM_SHIFT_INTERVAL_MS) {
          previous = pushWaveHistory(previous, smoothedLevel);
          lastShiftAt = now;
        } else {
          previous = [...previous.slice(0, -1), smoothedLevel];
        }

        if (mountedRef.current) {
          setAudioLevels(previous);
        }

        animationFrameRef.current = requestAnimationFrame(tick);
      };

      animationFrameRef.current = requestAnimationFrame(tick);
    },
    [barsCount],
  );

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
    recognition.lang = language;

    recognition.onresult = (event) => {
      let nextFinal = finalTranscriptRef.current;
      let nextInterim = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";

        if (result.isFinal) {
          nextFinal += `${transcript.trim()} `;
        } else {
          nextInterim += transcript;
        }
      }

      finalTranscriptRef.current = nextFinal;
      interimTranscriptRef.current = nextInterim;
      setTranscriptPreview(
        `${nextFinal} ${nextInterim}`.replace(/\s+/g, " ").trim(),
      );
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
      setActiveAction("cancel");
      onErrorRef.current?.(
        "Не удалось распознать речь. Проверь доступ к микрофону и попробуй снова.",
      );
    };

    recognition.onend = () => {
      if (shouldRestartRef.current && !pendingCloseActionRef.current) {
        window.setTimeout(() => {
          try {
            recognition.start();
          } catch (error) {
            shouldRestartRef.current = false;
            onErrorRef.current?.(
              "Голосовой ввод был остановлен браузером. Попробуй начать запись снова.",
            );
          }
        }, 120);
        return;
      }

      if (pendingCloseActionRef.current) {
        finalizeSession(pendingCloseActionRef.current);
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [finalizeSession, isSupported, language]);

  const stopWithAction = useCallback(
    async (
      action: Exclude<RecorderCloseAction, null>,
      method: "stop" | "abort" = "stop",
    ) => {
      if (!isRecording || pendingCloseActionRef.current) {
        return;
      }

      shouldRestartRef.current = false;
      pendingCloseActionRef.current = action;
      setActiveAction(action);

      try {
        if (method === "abort") {
          recognitionRef.current?.abort();
        } else {
          recognitionRef.current?.stop();
        }
      } catch {
        finalizeSession(action);
      }
    },
    [finalizeSession, isRecording],
  );

  const startRecording = useCallback(async () => {
    if (!isSupported || isRecording || isStarting) {
      if (!isSupported) {
        onErrorRef.current?.(
          "Распознавание речи не поддерживается в этом браузере.",
        );
      }
      return;
    }

    const recognition = buildRecognition();

    if (!recognition) {
      onErrorRef.current?.("Распознавание речи недоступно в этом браузере.");
      return;
    }

    setIsStarting(true);
    setActiveAction(null);
    resetTranscript();
    setDurationMs(0);
    resetVisualizer();
    syncRecordingState(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: SPEECH_CONFIG,
      });

      streamRef.current = stream;
      audioContextRef.current = new AudioContext();
      sourceRef.current =
        audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.72;
      sourceRef.current.connect(analyserRef.current);

      shouldRestartRef.current = true;
      pendingCloseActionRef.current = null;
      startWaveformLoop(analyserRef.current);
      setIsStarting(false);
      recognition.start();

      const startedAt = Date.now();
      durationTimerRef.current = window.setInterval(() => {
        if (mountedRef.current) {
          setDurationMs(Date.now() - startedAt);
        }
      }, 250);
    } catch {
      stopAudioCapture();
      resetVisualizer();
      setIsStarting(false);
      setActiveAction(null);
      syncRecordingState(false);
      onErrorRef.current?.("Не удалось получить доступ к микрофону.");
    }
  }, [
    buildRecognition,
    isRecording,
    isStarting,
    isSupported,
    resetTranscript,
    resetVisualizer,
    startWaveformLoop,
    stopAudioCapture,
    syncRecordingState,
  ]);

  const acceptRecording = useCallback(async () => {
    await stopWithAction("accept");
  }, [stopWithAction]);

  const cancelRecording = useCallback(async () => {
    await stopWithAction("cancel", "abort");
  }, [stopWithAction]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      shouldRestartRef.current = false;
      pendingCloseActionRef.current = null;
      try {
        recognitionRef.current?.abort();
      } catch {
        // Ignore browser abort errors during teardown.
      }
      stopAudioCapture();
    };
  }, [stopAudioCapture]);

  return {
    isSupported,
    isRecording,
    isStarting,
    activeAction,
    audioLevels,
    transcriptPreview,
    durationMs,
    startRecording,
    acceptRecording,
    cancelRecording,
  };
};
