/** The public Mapbox token, or an empty string when `EXPO_PUBLIC_MAPBOX_TOKEN` is unset. */
export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim() ?? '';

/**
 * Whether the map can render. A missing token is a setup state, never a crash; the screen shows
 * what to put in `.env` and the rest of the app keeps working.
 */
export function hasMapboxToken(token: string = MAPBOX_TOKEN): boolean {
  return token.length > 0;
}
