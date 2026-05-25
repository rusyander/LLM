// Сколько столбцов рисуем в волне по умолчанию.
export const DEFAULT_BARS = 128;

// Запасной язык, если браузер и система не вернули локаль.
export const DEFAULT_LANGUAGE = "ru-RU";

// Базовая высота столбцов, когда пользователь молчит.
export const BASELINE_LEVEL = 0.085;

// Порог, ниже которого считаем, что в микрофоне тишина.
export const SILENCE_THRESHOLD = 0.038;

// Сколько держим UI перед полным закрытием после accept/cancel.
export const CLOSE_ANIMATION_MS = 1600;

// Как часто сдвигаем историю столбцов в waveform.
export const WAVEFORM_SHIFT_INTERVAL_MS = 50;

// Верхняя граница transcript, чтобы не раздувать память бесконечной диктовкой.
export const MAX_TRANSCRIPT_LENGTH = 20000;

// Настройки микрофона, которые браузер пытается применить сам.
export const SPEECH_CONFIG: MediaTrackConstraints = {
  // Автоматически выравнивает громкость входящего сигнала.
  autoGainControl: true,
  // Убирает эхо от динамиков и помещения.
  echoCancellation: true,
  // Подавляет постоянный шум фона.
  noiseSuppression: true,
};
