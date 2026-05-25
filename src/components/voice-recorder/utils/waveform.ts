import { BASELINE_LEVEL, SILENCE_THRESHOLD } from "../constants";

// Ограничивает значение диапазоном, чтобы волна не выходила за границы UI.
export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// Создаёт стартовый массив столбцов одинаковой высоты.
export const createLevelArray = (barsCount: number, initial = BASELINE_LEVEL) =>
  Array.from({ length: barsCount }, () => initial);

// Возвращает мягкий idle-уровень, когда пользователь молчит.
export const createIdleLevel = (now = performance.now()) =>
  clamp(BASELINE_LEVEL + ((Math.sin(now / 240) + 1) / 2) * 0.02, 0.03, 0.08);

// Сдвигает историю волны влево и добавляет новый столбец в конец.
export const pushWaveHistory = (previous: number[], nextLevel: number) => {
  const next = previous.slice(1);
  next.push(nextLevel);
  return next;
};

// Считает RMS по time-domain буферу, чтобы получить устойчивую громкость сигнала.
export const calculateRmsLevel = (buffer: Uint8Array) => {
  let squaredSum = 0;

  for (let index = 0; index < buffer.length; index += 1) {
    const normalizedSample = (buffer[index] - 128) / 128;
    squaredSum += normalizedSample * normalizedSample;
  }

  return Math.sqrt(squaredSum / Math.max(1, buffer.length));
};

// Превращает измеренную громкость в целевую высоту столбца для waveform.
export const getTargetWaveLevel = (rms: number) => {
  if (rms < SILENCE_THRESHOLD) {
    return createIdleLevel();
  }

  return clamp(BASELINE_LEVEL + rms * 5.2, 0.09, 0.96);
};
