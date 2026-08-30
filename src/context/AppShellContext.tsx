import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  migrateLegacyTheme,
  resolveTheme,
  type ConnectivityState,
  type EvidenceDockState,
  type MobileDestinationId,
  type ResolvedTheme,
  type ThemePreference,
} from '../lib/appShell';

const THEME_PREFERENCE_KEY = 'omni_theme_preference_v2';
const LEGACY_THEME_KEY = 'omni_ielts_dark_v1';
const NAV_COLLAPSED_KEY = 'omni_nav_collapsed_v1';
const EVIDENCE_DOCK_KEY = 'omni_evidence_dock_v1';

export interface AppShellContextValue {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (theme: ThemePreference) => void;
  navCollapsed: boolean;
  setNavCollapsed: (collapsed: boolean) => void;
  evidenceDock: EvidenceDockState;
  setEvidenceDock: (state: EvidenceDockState) => void;
  mobileDestination: MobileDestinationId | null;
  setMobileDestination: (destination: MobileDestinationId | null) => void;
  connectivity: ConnectivityState;
  setConnectivity: (state: ConnectivityState) => void;
}

const AppShellContext = createContext<AppShellContextValue | undefined>(undefined);

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system'
    || value === 'light'
    || value === 'dark'
    || value === 'high_contrast';
}

function readInitialThemePreference(): ThemePreference {
  const storage = getStorage();
  if (!storage) return 'system';

  try {
    const current = storage.getItem(THEME_PREFERENCE_KEY);
    if (isThemePreference(current)) return current;

    const legacy = storage.getItem(LEGACY_THEME_KEY);
    if (legacy !== null) {
      const migrated = migrateLegacyTheme(legacy);
      storage.setItem(THEME_PREFERENCE_KEY, migrated);
      storage.removeItem(LEGACY_THEME_KEY);
      return migrated;
    }
  } catch {
    return 'system';
  }

  return 'system';
}

function readBooleanPreference(key: string, fallback: boolean): boolean {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    return storage.getItem(key) === 'true';
  } catch {
    return fallback;
  }
}

function readEvidenceDockPreference(): EvidenceDockState {
  const storage = getStorage();
  if (!storage) return 'open';
  try {
    const value = storage.getItem(EVIDENCE_DOCK_KEY);
    return value === 'collapsed' || value === 'hidden' ? value : 'open';
  } catch {
    return 'open';
  }
}

function readSystemDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readConnectivity(): ConnectivityState {
  if (typeof navigator === 'undefined' || navigator.onLine) return 'online';
  return 'offline';
}

export const AppShellProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePreference, setThemePreference] = useState<ThemePreference>(
    readInitialThemePreference,
  );
  const [systemDark, setSystemDark] = useState(readSystemDark);
  const [navCollapsed, setNavCollapsed] = useState(() =>
    readBooleanPreference(NAV_COLLAPSED_KEY, false),
  );
  const [evidenceDock, setEvidenceDock] = useState<EvidenceDockState>(
    readEvidenceDockPreference,
  );
  const [mobileDestination, setMobileDestination] = useState<MobileDestinationId | null>(null);
  const [connectivity, setConnectivity] = useState<ConnectivityState>(readConnectivity);

  const resolvedTheme = resolveTheme(themePreference, systemDark);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(THEME_PREFERENCE_KEY, themePreference);
    } catch {
      // Theme remains usable when storage is unavailable or full.
    }
  }, [themePreference]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(NAV_COLLAPSED_KEY, String(navCollapsed));
    } catch {
      // The shell keeps the in-memory preference when persistence fails.
    }
  }, [navCollapsed]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(EVIDENCE_DOCK_KEY, evidenceDock);
    } catch {
      // The shell keeps the in-memory preference when persistence fails.
    }
  }, [evidenceDock]);

  useEffect(() => {
    if (themePreference !== 'system' || typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    setSystemDark(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [themePreference]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('dark', 'high-contrast');
    if (resolvedTheme === 'dark') root.classList.add('dark');
    if (resolvedTheme === 'high_contrast') root.classList.add('high-contrast');
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleOnline = () => setConnectivity('online');
    const handleOffline = () => setConnectivity('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const value = useMemo<AppShellContextValue>(() => ({
    themePreference,
    resolvedTheme,
    setThemePreference,
    navCollapsed,
    setNavCollapsed,
    evidenceDock,
    setEvidenceDock,
    mobileDestination,
    setMobileDestination,
    connectivity,
    setConnectivity,
  }), [
    themePreference,
    resolvedTheme,
    navCollapsed,
    evidenceDock,
    mobileDestination,
    connectivity,
  ]);

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
};

export function useAppShell(): AppShellContextValue {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error('useAppShell must be used within an AppShellProvider');
  }
  return context;
}
