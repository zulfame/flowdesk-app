import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "ui-density";

const DensityProviderContext = createContext({
  density: "dense",
  setDensity: () => null,
});

/**
 * DensityProvider
 * Applies "dense" | "comfortable" to <html> via data-density and persists it.
 * CSS variables in index.css remap control heights & form spacing per density.
 */
export function DensityProvider({ children, defaultDensity = "dense" }) {
  const [density, setDensityState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || defaultDensity,
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
  }, [density]);

  const setDensity = (value) => {
    localStorage.setItem(STORAGE_KEY, value);
    setDensityState(value);
  };

  return (
    <DensityProviderContext.Provider value={{ density, setDensity }}>
      {children}
    </DensityProviderContext.Provider>
  );
}

export const useDensity = () => useContext(DensityProviderContext);
