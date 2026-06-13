import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ThemeMode = "dark" | "light" | "system";

export interface ThemeSettings {
  mode: ThemeMode;
  accentColor: string;
  compactMode: boolean;
  reduceMotion: boolean;
}

interface ThemeContextType {
  settings: ThemeSettings;
  effectiveTheme: "dark" | "light";
  setMode: (mode: ThemeMode) => void;
  setAccentColor: (color: string) => void;
  setCompactMode: (v: boolean) => void;
  setReduceMotion: (v: boolean) => void;
  saveSettings: (settings: ThemeSettings) => void;
}

// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS: ThemeSettings = {
  mode: "dark",
  accentColor: "#7C5CFF",
  compactMode: false,
  reduceMotion: false,
};

const STORAGE_KEY = "hackos_theme_settings";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function loadSettings(): ThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(s: ThemeSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

function getSystemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Hex → HSL conversion.
 * Returns "H S% L%" string (no "hsl()" wrapper) suitable for CSS custom properties.
 */
function hexToHsl(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Apply all theme settings to the document root.
 */
function applyTheme(settings: ThemeSettings, effective: "dark" | "light") {
  const root = document.documentElement;

  // ── 1. Theme mode class ──────────────────────────────────────────────────
  root.setAttribute("data-theme", effective);
  if (effective === "light") {
    root.classList.add("theme-light");
    root.classList.remove("theme-dark");
  } else {
    root.classList.add("theme-dark");
    root.classList.remove("theme-light");
  }

  // ── 2. Compact mode ──────────────────────────────────────────────────────
  if (settings.compactMode) {
    root.classList.add("compact");
  } else {
    root.classList.remove("compact");
  }

  // ── 3. Reduce motion ────────────────────────────────────────────────────
  if (settings.reduceMotion) {
    root.classList.add("reduce-motion");
  } else {
    root.classList.remove("reduce-motion");
  }

  // ── 4. Accent color CSS variable ─────────────────────────────────────────
  try {
    const hsl = hexToHsl(settings.accentColor);
    root.style.setProperty("--accent-hex", settings.accentColor);
    root.style.setProperty("--primary", hsl);
    root.style.setProperty("--ring", hsl);
    root.style.setProperty("--accent", hsl);

    // Also set sidebar primary to match
    root.style.setProperty("--sidebar-primary", hsl);
    root.style.setProperty("--sidebar-ring", hsl);
  } catch {}
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(loadSettings);
  const [systemDark, setSystemDark] = useState(getSystemPrefersDark);

  // Derive effective theme
  const effectiveTheme: "dark" | "light" =
    settings.mode === "system"
      ? systemDark ? "dark" : "light"
      : settings.mode;

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Apply whenever settings or effectiveTheme changes
  useEffect(() => {
    applyTheme(settings, effectiveTheme);
  }, [settings, effectiveTheme]);

  const updateSettings = useCallback((patch: Partial<ThemeSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      persistSettings(next);
      return next;
    });
  }, []);

  const setMode = useCallback((mode: ThemeMode) => updateSettings({ mode }), [updateSettings]);
  const setAccentColor = useCallback((accentColor: string) => updateSettings({ accentColor }), [updateSettings]);
  const setCompactMode = useCallback((compactMode: boolean) => updateSettings({ compactMode }), [updateSettings]);
  const setReduceMotion = useCallback((reduceMotion: boolean) => updateSettings({ reduceMotion }), [updateSettings]);

  const saveSettings = useCallback((s: ThemeSettings) => {
    persistSettings(s);
    setSettings(s);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        settings,
        effectiveTheme,
        setMode,
        setAccentColor,
        setCompactMode,
        setReduceMotion,
        saveSettings,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
