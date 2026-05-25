import { DEFAULT_LANGUAGE } from "../constants";

// Возвращает locale системы через Intl как запасной источник языка.
export const getSystemLocale = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || null;
  } catch {
    return null;
  }
};

// Выбирает язык для распознавания в порядке приоритета:
// браузерные языки -> язык браузера -> системная локаль -> fallback.
export const getPreferredSpeechLanguage = () => {
  if (typeof navigator !== "undefined") {
    const browserLanguage =
      navigator.languages?.find((value) => !!value?.trim()) ||
      navigator.language;

    if (browserLanguage?.trim()) {
      return browserLanguage;
    }
  }

  return getSystemLocale() ?? DEFAULT_LANGUAGE;
};
