import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const BrandingContext = createContext(null);

function hexToHsl(hex) {
  if (!hex) return null;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0, sat = 0; const light = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue /= 6;
  }
  return `${Math.round(hue * 360)} ${Math.round(sat * 100)}% ${Math.round(light * 100)}%`;
}

function applyBranding(b) {
  if (!b) return;
  if (b.app_name) document.title = b.app_name;
  if (b.meta_description) {
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
    m.content = b.meta_description;
  }
  if (b.favicon) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = b.favicon;
  }
  // NOTE (exception E3 in docs/FLOWDESK_EXCEPTIONS.md): `primary_color` is kept
  // in settings but no longer overrides the `--primary` token — the redesigned
  // shell stays monochrome (token-only, R05).
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/settings/public");
      setBranding(data);
      applyBranding(data);
    } catch {}
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <BrandingContext.Provider value={{ branding, refresh }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext) || { branding: null, refresh: () => {} };
