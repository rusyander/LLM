// Базовый shape альтернативы из browser SpeechRecognition API.
export type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

// Минимальный shape результата распознавания, который нам нужен.
export type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
  length: number;
};

// Событие с пачкой промежуточных и финальных результатов распознавания.
export type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

// Ошибка браузерного SpeechRecognition.
export type SpeechRecognitionErrorEventLike = {
  error: string;
};

// Минимальный контракт browser SpeechRecognition, с которым работает модуль.
export type SpeechRecognitionLike = {
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

// Конструктор браузерного SpeechRecognition.
export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

// Финальные действия закрытия диктовки.
export type RecorderCloseAction = "accept" | "cancel" | null;

// Действие закрытия без null, когда решение уже принято.
export type RecorderCompletionAction = Exclude<RecorderCloseAction, null>;

// Полезная нагрузка, которую отдаёт speech-сессия после завершения.
export interface RecognitionCompletion {
  action: RecorderCompletionAction;
  transcript: string;
}

// Публичные входные параметры основного recorder hook.
export interface UseVoiceRecorderOptions {
  language?: string;
  barsCount?: number;
  onAccept: (transcript: string) => void;
  onCancel?: () => void;
  onError?: (message: string) => void;
  onRecordingChange?: (isRecording: boolean) => void;
}

// Публичный контракт, который получает UI-компонент recorder.
export interface UseVoiceRecorderResult {
  isSupported: boolean;
  isRecording: boolean;
  isStarting: boolean;
  activeAction: RecorderCloseAction;
  audioLevels: number[];
  transcriptPreview: string;
  durationMs: number;
  resolvedLanguage: string;
  startRecording: () => Promise<void>;
  acceptRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
}
