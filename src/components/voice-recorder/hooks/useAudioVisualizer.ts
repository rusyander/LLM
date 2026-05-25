import { useCallback, useEffect, useRef, useState } from "react";
import { BASELINE_LEVEL, WAVEFORM_SHIFT_INTERVAL_MS } from "../constants";
import {
  calculateRmsLevel,
  createLevelArray,
  getTargetWaveLevel,
  pushWaveHistory,
} from "../utils/waveform";

interface UseAudioVisualizerOptions {
  barsCount: number;
}

interface UseAudioVisualizerResult {
  audioLevels: number[];
  durationMs: number;
  startVisualizer: (stream: MediaStream) => void;
  stopVisualizer: () => void;
  resetVisualizer: () => void;
}

export const useAudioVisualizer = ({
  barsCount,
}: UseAudioVisualizerOptions): UseAudioVisualizerResult => {
  const [audioLevels, setAudioLevels] = useState<number[]>(() =>
    createLevelArray(barsCount),
  );
  const [durationMs, setDurationMs] = useState(0);

  const mountedRef = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const durationTimerRef = useRef<number | null>(null);

  // Сбрасывает волну и таймер в исходное спокойное состояние.
  const resetVisualizer = useCallback(() => {
    if (!mountedRef.current) {
      return;
    }

    setAudioLevels(createLevelArray(barsCount));
    setDurationMs(0);
  }, [barsCount]);

  // Полностью останавливает визуализатор и освобождает ресурсы Web Audio API.
  const stopVisualizer = useCallback(() => {
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

  // Отдельный цикл кадр за кадром превращает звук из микрофона в набор столбцов для UI.
  const startWaveformLoop = useCallback(
    (analyser: AnalyserNode) => {
      const buffer = new Uint8Array(analyser.fftSize);
      let previous = createLevelArray(barsCount);
      let smoothedLevel = BASELINE_LEVEL;
      let lastShiftAt = performance.now();

      const tick = () => {
        const now = performance.now();
        analyser.getByteTimeDomainData(buffer);

        const rms = calculateRmsLevel(buffer);
        const targetLevel = getTargetWaveLevel(rms);
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

  // Поднимает Web Audio граф и запускает таймер длительности записи.
  const startVisualizer = useCallback(
    (stream: MediaStream) => {
      stopVisualizer();

      streamRef.current = stream;
      audioContextRef.current = new AudioContext();
      sourceRef.current =
        audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.72;
      sourceRef.current.connect(analyserRef.current);

      startWaveformLoop(analyserRef.current);

      const startedAt = Date.now();
      durationTimerRef.current = window.setInterval(() => {
        if (mountedRef.current) {
          setDurationMs(Date.now() - startedAt);
        }
      }, 250);
    },
    [startWaveformLoop, stopVisualizer],
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      // При размонтировании гарантированно закрываем все аудио-ресурсы.
      stopVisualizer();
    };
  }, [stopVisualizer]);

  return {
    audioLevels,
    durationMs,
    startVisualizer,
    stopVisualizer,
    resetVisualizer,
  };
};
