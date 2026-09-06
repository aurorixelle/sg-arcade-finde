import { useEffect, useState } from "react";

const STORAGE_KEY = "sgarcade.theme";
const QUERY = "(prefers-color-scheme: dark)";

// Theme state: null = follow the system preference (default), "light"/"dark" =
// manual override persisted in localStorage. The resolved theme is applied to
// <html data-theme=...> and drives the CSS variable palettes in index.css.
// Guards keep this safe outside a browser (SSR smoke tests).
export function useTheme() {
  const [pref, setPref] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [systemDark, setSystemDark] = useState(() =>
    typeof matchMedia !== "undefined" ? matchMedia(QUERY).matches : false
  );

  // Follow live system changes while the user hasn't picked manually.
  useEffect(() => {
    if (typeof matchMedia === "undefined") return undefined;
    const mq = matchMedia(QUERY);
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const theme = pref === "light" || pref === "dark" ? pref : systemDark ? "dark" : "light";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggle() {
    setPref((prev) => {
      const current = prev === "light" || prev === "dark" ? prev : systemDark ? "dark" : "light";
      const next = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // private mode etc. — toggle still works for this session
      }
      return next;
    });
  }

  return { theme, toggle };
}
