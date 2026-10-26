import { getSupabase } from '@/lib/supabase';

import { toCatchRecord, type CatchRecord } from './record';
import type { CatchRecordSource } from './source';

/**
 * The gallery page size the function allows by default.
 *
 * The existing My Catches screen has no pagination control, so the live read path fetches this
 * first page and stops. Raising it further would need UI the app does not have yet; the function
 * caps a request at 30.
 */
export const GALLERY_PAGE_SIZE = 20;

/** One item as `gallery-feed` returns it. */
export type GalleryItem = {
  catch_id: string;
  username: string | null;
  state_code: string | null;
  verdict_at: string;
  find_photo_url: string;
  dispose_photo_url: string;
  is_own: boolean;
};

type GalleryPayload = { items?: GalleryItem[]; next_cursor?: unknown };

/** What one `gallery-feed` call resolves to. */
export type GalleryInvoke = (body: {
  limit: number;
}) => Promise<{ data: unknown; error: { message: string } | null }>;

/**
 * The gallery-feed cursor is `(verdict_at, id)`.
 *
 * Ticket 12 originally described `(caught_at, id)`, but `catches` has no `caught_at` column and
 * adding one would only duplicate `verdict_at`. The server owns the cursor; the client never
 * builds one.
 */

/**
 * Project gallery items onto catch records, keeping the server's newest-first order.
 *
 * `verdict_at` is the time the catch was verified, which is the closest thing to "when it happened"
 * that the existing card needs. Signed photo URLs are used as-is and never stored.
 */
export function catchRecordsFromGallery(items: readonly GalleryItem[]): CatchRecord[] {
  return items
    .filter((item) => item.find_photo_url && item.dispose_photo_url)
    .map((item) =>
      toCatchRecord({
        id: item.catch_id,
        caughtAt: new Date(item.verdict_at),
        findPhoto: item.find_photo_url,
        disposePhoto: item.dispose_photo_url,
      }),
    );
}

const invokeGallery: GalleryInvoke = async (body) => {
  const { data, error } = await getSupabase().functions.invoke('gallery-feed', { body });
  return { data, error: error ? { message: error.message } : null };
};

/**
 * The owner-only live read path.
 *
 * Reads come from `gallery-feed`, which signs short-lived photo URLs for the caller's own verified
 * catches. `add` is deliberately unsupported: writing a catch needs the native capture pipeline
 * (ticket 25), and this adapter must never fabricate a record.
 */
export function createGalleryCatchSource(invoke: GalleryInvoke = invokeGallery): CatchRecordSource {
  return {
    async list() {
      const { data, error } = await invoke({ limit: GALLERY_PAGE_SIZE });

      if (error) {
        throw new Error(`gallery_feed_failed: ${error.message}`);
      }

      return catchRecordsFromGallery((data as GalleryPayload | null)?.items ?? []);
    },

    async add() {
      throw new Error('gallery_feed_read_only: catches are written by the native capture pipeline');
    },
  };
}

/** The app's live read source. */
export const galleryCatchSource = createGalleryCatchSource();
