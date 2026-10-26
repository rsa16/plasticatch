import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Environment variable names that configure the Supabase client. */
export const SUPABASE_URL_ENV = 'EXPO_PUBLIC_SUPABASE_URL';
export const SUPABASE_KEY_ENV = 'EXPO_PUBLIC_SUPABASE_ANON_KEY';

const MISSING_CONFIG_MESSAGE =
  `Supabase is not configured. Set ${SUPABASE_URL_ENV} and ${SUPABASE_KEY_ENV} ` +
  'in a local .env file (see .env.example) before starting the app.';

/** The publishable connection settings, or a thrown error naming what is missing. */
export function supabaseConfig(): { url: string; anonKey: string } {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(MISSING_CONFIG_MESSAGE);
  }

  return { url, anonKey };
}

/** Whether the app has been given connection settings. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

let client: SupabaseClient | null = null;

/**
 * The one Supabase client for the app.
 *
 * Built lazily so a missing configuration throws a readable error at use time rather than
 * crashing the module graph (and so tests that supply a fake client never touch it).
 * Sessions persist in AsyncStorage, so a relaunch resumes the signed-in user, and tokens
 * refresh in the background.
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    const { url, anonKey } = supabaseConfig();

    client = createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        storageKey: 'plasticatch.auth',
        autoRefreshToken: true,
        persistSession: true,
        // React Native has no address bar to parse a callback from; the OAuth callback
        // route hands the code over explicitly instead.
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });
  }

  return client;
}

/** Drop the cached client. Tests and sign-out-of-last-resort use this. */
export function resetSupabaseClient(): void {
  client = null;
}
