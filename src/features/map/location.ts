import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { useEffect, useState } from 'react';

export type PlayerPosition = {
  longitude: number;
  latitude: number;
};

export type PlayerLocationState = 'locating' | 'ready' | 'unavailable';

/**
 * Follow the player's foreground position for the avatar-head marker.
 *
 * Uses `expo-location` foreground permission only and never requests background access. A
 * denied or unavailable fix is not an error state: the map falls back to a neutral marker.
 */
export function usePlayerLocation(): {
  position: PlayerPosition | null;
  state: PlayerLocationState;
} {
  const [position, setPosition] = useState<PlayerPosition | null>(null);
  const [state, setState] = useState<PlayerLocationState>(
    Platform.OS === 'web' ? 'unavailable' : 'locating',
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    async function start() {
      try {
        let permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== 'granted' && permission.canAskAgain) {
          permission = await Location.requestForegroundPermissionsAsync();
        }

        if (permission.status !== 'granted') {
          if (!cancelled) setState('unavailable');
          return;
        }

        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 10_000 },
          ({ coords }) => {
            if (cancelled) return;
            setPosition({ longitude: coords.longitude, latitude: coords.latitude });
            setState('ready');
          },
        );
      } catch {
        if (!cancelled) setState('unavailable');
      }
    }

    void start();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return { position, state };
}
