import type { SpeechRecognitionConstructor } from "../types";

// Безопасно достаёт SpeechRecognition из разных браузерных реализаций.
export const getSpeechRecognitionConstructor =
  (): SpeechRecognitionConstructor | null => {
    if (typeof window === "undefined") {
      return null;
    }

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
