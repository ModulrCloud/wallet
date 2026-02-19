import React from 'react';
import { storageGet, storageSet } from '../lib/chromeStorage';

export type ThemeMode = 'light' | 'dark';

const STORAGE_THEME_KEY = 'modulr.ui.theme.v1';

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
};

const ThemeCtx = React.createContext<ThemeContextValue | null>(null);

function applyToDom(mode: ThemeMode) {
  const el = document.documentElement;
  if (mode === 'dark') el.classList.add('dark');
  else el.classList.remove('dark');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<ThemeMode>('light');

  React.useEffect(() => {
    // Default theme (before storage loads) is always light.
    applyToDom('light');
    (async () => {
      const stored = await storageGet<ThemeMode>(STORAGE_THEME_KEY);
      const next: ThemeMode = stored === 'dark' ? 'dark' : 'light';
      setModeState(next);
      applyToDom(next);
    })().catch(() => {
      setModeState('light');
      applyToDom('light');
    });
  }, []);

  const setMode = React.useCallback((m: ThemeMode) => {
    setModeState(m);
    applyToDom(m);
    storageSet(STORAGE_THEME_KEY, m).catch(() => {});
  }, []);

  const toggle = React.useCallback(() => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
  }, [mode, setMode]);

  const value = React.useMemo<ThemeContextValue>(() => ({ mode, setMode, toggle }), [mode, setMode, toggle]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

