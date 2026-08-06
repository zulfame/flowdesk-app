import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "ui-theme";

const ThemeProviderContext = createContext({
  theme: "system",
  setTheme: () => null,
});

/**
 * ThemeProvider
 * Applies "light" | "dark" | "system" to <html> and persists the choice.
 * "system" tracks the OS preference live via matchMedia.
 */
export function ThemeProvider({ children, defaultTheme = "system" }) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || defaultTheme,
  );

  useEffect(() => {
    const root = window.document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = (value) => {
      const resolved =
        value === "system" ? (media.matches ? "dark" : "light") : value;
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
    };

    apply(theme);

    if (theme === "system") {
      const listener = () => apply("system");
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, [theme]);

  const setTheme = (value) => {
    localStorage.setItem(STORAGE_KEY, value);
    setThemeState(value);
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeProviderContext);
