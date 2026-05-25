import { useEffect, useRef } from "react";

// Хранит самое свежее значение в ref, чтобы callbacks внутри эффектов
// не цеплялись за устаревшие замыкания.
export const useLatestRef = <T>(value: T) => {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
};
