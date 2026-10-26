import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import type { CaptureMetadata } from '@/features/verification/types';
import { MAX_GPS_ACCURACY_M, MAX_GPS_STALENESS_MS } from '@/features/verification/constants';

export type CaptureLocationState = 'locating' | 'ready' | 'unavailable';

type Fix = {
  lat: number;
  lng: number;
  accuracyM: number;
  at: string;
  capturedAtMs: number;
  mock: boolean | null;
};

/**
 * The latest foreground GPS fix and whether the shutter may open.
 *
 * The gate is accuracy ≤ 30 m and staleness ≤ 20 s, evaluated on every position update and on a
 * one-second timer so a fix that goes stale while the player frames the shot disables the shutter.
 * Only foreground permission is requested. A denied permission is "unavailable", not an error.
 */
export function useCaptureLocation(): {
  fix: CaptureMetadata | null;
  ready: boolean;
  state: CaptureLocationState;
} {
  // Only a fix that satisfies the accuracy gate can become the capture fix. Keeping the last
  // good fix smooths the normal accuracy oscillation instead of flickering the shutter on/off.
  const [goodFix, setGoodFix] = useState<Fix | null>(null);
  const [state, setState] = useState<CaptureLocationState>(
    Platform.OS === 'web' ? 'unavailable' : 'locating',
  );
  const [now, setNow] = useState(() => Date.now());
  const subscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function start() {
      try {
        let permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted && permission.canAskAgain) {
          permission = await Location.requestForegroundPermissionsAsync();
        }
        if (cancelled) return;
        if (!permission.granted) {
          setState('unavailable');
          return;
        }

        subscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Highest,
            timeInterval: 1000,
            distanceInterval: 0,
          },
          ({ coords, timestamp }) => {
            if (cancelled) return;
            const next: Fix = {
              lat: coords.latitude,
              lng: coords.longitude,
              accuracyM: typeof coords.accuracy === 'number' ? coords.accuracy : Infinity,
              at: new Date(timestamp).toISOString(),
              capturedAtMs: timestamp,
              // Android reports this explicitly. On iOS the field is absent and the spec says
              // to fail open with a soft signal rather than reject a real catch.
              mock:
                typeof (coords as unknown as { mocked?: boolean }).mocked === 'boolean'
                  ? (coords as unknown as { mocked: boolean }).mocked
                  : null,
            };
            if (next.accuracyM <= MAX_GPS_ACCURACY_M) setGoodFix(next);
            setState('ready');
          },
        );

        timer = setInterval(() => setNow(Date.now()), 1000);
      } catch {
        if (!cancelled) setState('unavailable');
      }
    }

    void start();

    // Some devices stop delivering updates while backgrounded; refreshing on return avoids a
    // permanently stale fix.
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') setNow(Date.now());
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      subscription.current?.remove();
      subscription.current = null;
      appState.remove();
    };
  }, []);

  // Some Android builds stamp a fix a few milliseconds ahead of the JS clock. Clamp a negative
  // age to zero so a fresh fix does not flicker out of "ready" until the next tick.
  const ageMs = goodFix ? Math.max(0, now - goodFix.capturedAtMs) : Infinity;
  const ready = Boolean(goodFix && ageMs <= MAX_GPS_STALENESS_MS);

  const metadata = useMemo<CaptureMetadata | null>(
    () =>
      ready && goodFix
        ? {
            lat: goodFix.lat,
            lng: goodFix.lng,
            accuracyM: goodFix.accuracyM,
            at: goodFix.at,
            mock: goodFix.mock,
          }
        : null,
    [goodFix, ready],
  );

  return { fix: metadata, ready, state };
}
