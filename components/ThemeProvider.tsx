"use client";

import * as React from "react";
import { THEME_STORAGE_KEY } from "@/lib/brand";

export type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeMode>("light");
  const [ready, setReady] = React.useState(false);

  React.useLayoutEffect(() => {
    const t =
      document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    setThemeState(t);
    setReady(true);
  }, []);

  React.useLayoutEffect(() => {
    if (!ready) return;
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* private mode / quota */
    }
  }, [theme, ready]);

  const setTheme = React.useCallback((t: ThemeMode) => {
    setThemeState(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
