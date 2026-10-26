import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** The player's theme preference. `system` defers to the OS. */
export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeStore = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

/**
 * Persisted theme preference. The default is `system`, so an install follows the OS until the
 * player chooses otherwise in Settings.
 */
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'plasticatch.theme',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
