import { getSupabase } from '@/lib/supabase';

/** The private bucket that holds blurred catch photos only. */
export const CATCH_PHOTOS_BUCKET = 'catch-photos';

export type CatchHalf = 'find' | 'dispose';

/** The object path contract the Edge Function validates: `{user_id}/{catch_id}/{half}.jpg`. */
export function catchPhotoPath(userId: string, catchId: string, half: CatchHalf): string {
  return `${userId}/${catchId}/${half}.jpg`;
}

/** Upload one blurred JPEG under the owner's prefix. Re-uploading a retry is idempotent. */
export async function uploadCatchPhoto(
  userId: string,
  catchId: string,
  half: CatchHalf,
  bytes: Uint8Array,
): Promise<string> {
  const path = catchPhotoPath(userId, catchId, half);
  const { error } = await getSupabase()
    .storage.from(CATCH_PHOTOS_BUCKET)
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });

  if (error) throw new Error(`photo_upload_failed: ${error.message}`);
  return path;
}

/** Best-effort cleanup for a catch that never became a row. */
export async function removeCatchPhotos(userId: string, catchId: string): Promise<void> {
  const paths = [
    catchPhotoPath(userId, catchId, 'find'),
    catchPhotoPath(userId, catchId, 'dispose'),
  ];
  try {
    await getSupabase().storage.from(CATCH_PHOTOS_BUCKET).remove(paths);
  } catch {
    // A failed cleanup must not hide the original failure.
  }
}
