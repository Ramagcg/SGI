import { useState, useEffect } from "react";

export function useTheme() {
  const [dark, setDark] = useState(() => {
    // Guarda la preferencia en localStorage
    const saved = localStorage.getItem("sgi_theme");
    if (saved) return saved === "dark";
    // Si no hay preferencia guardada, usa la del sistema
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("sgi_theme", dark ? "dark" : "light");
  }, [dark]);

  return { dark, toggle: () => setDark(d => !d) };
}
