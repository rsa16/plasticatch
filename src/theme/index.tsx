import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  StyleSheet,
  useColorScheme,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useThemeStore, type ThemeMode } from '@/stores/theme';
import { darkTheme, lightTheme, type Theme, type ThemeScheme } from '@/theme/tokens';

export type { ThemeMode } from '@/stores/theme';
export type { Theme, ThemeScheme } from '@/theme/tokens';

const ThemeContext = createContext<Theme>(lightTheme);

/** Resolves the OS scheme plus the persisted override into one theme. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const mode = useThemeStore((state) => state.mode);

  const theme = useMemo(() => {
    const scheme = resolveScheme(mode, systemScheme);
    return scheme === 'dark' ? darkTheme : lightTheme;
  }, [mode, systemScheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/**
 * Forces the dark theme for a subtree. The camera and verifying screens use it so their HUD stays
 * legible over the preview in both themes.
 */
export function HudTheme({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={darkTheme}>{children}</ThemeContext.Provider>;
}

/** Resolves a preference against the OS scheme. Pure, so the rule is unit-testable. */
export function resolveScheme(
  mode: ThemeMode,
  systemScheme: 'light' | 'dark' | null | undefined,
): ThemeScheme {
  if (mode !== 'system') return mode;
  return systemScheme === 'dark' ? 'dark' : 'light';
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** The preference itself, for the Settings appearance control. */
export function useThemeMode(): { mode: ThemeMode; setMode: (mode: ThemeMode) => void } {
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  return { mode, setMode };
}

/**
 * Builds a themed StyleSheet once per scheme. Components never read raw colours or sizes:
 *
 *   const useStyles = makeStyles((t) => ({ card: { backgroundColor: t.color.surface } }));
 */
type StyleRecord = Record<string, ViewStyle | TextStyle | ImageStyle>;

export function makeStyles<const T extends StyleRecord>(factory: (theme: Theme) => T) {
  const cache = new Map<string, T>();

  return function useStyles(): T {
    const theme = useTheme();
    const cached = cache.get(theme.scheme);
    if (cached) return cached;

    const created = StyleSheet.create(factory(theme) as never) as T;
    cache.set(theme.scheme, created);
    return created;
  };
}
