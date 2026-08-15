// SSR-safe localStorage helpers. Mirrors the kaybykhushie/client convention
// (utils/localstorage.js) but typed and guarded for Next.js server rendering.
export const setLocalStorage = <T>(name: string, items: T): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(name, JSON.stringify(items));
  } catch {
    /* ignore write failures (quota / private mode) */
  }
};

export const getLocalStorage = <T>(name: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const data = window.localStorage.getItem(name);
    return data ? (JSON.parse(data) as T) : fallback;
  } catch {
    return fallback;
  }
};
