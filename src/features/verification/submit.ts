import { getSupabase } from '@/lib/supabase';

import { hexToBitString } from './phash';
import { parseVerifyCatchResult, CatchSubmitError } from './response';
import type { PreparedCapture, VerifyCatchResult } from './types';
import { removeCatchPhotos, uploadCatchPhoto } from './upload';

/** The Edge Function that owns the verdict, the attempt row and the XP ledger. */
export const VERIFY_CATCH_FUNCTION = 'verify-catch';

/** A photos-and-metadata pair ready to submit. */
export type CatchSubmission = {
  find: PreparedCapture & { bytes: Uint8Array };
  dispose: PreparedCapture & { bytes: Uint8Array };
};

type SubmitOptions = {
  userId: string;
  /** Injectable for tests. */
  invoke?: (body: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string; context?: { status?: number } } | null;
  }>;
};

async function insertFindRow(
  catchId: string,
  userId: string,
  find: PreparedCapture,
  findPath: string,
  now: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from('catches')
    .insert({
      id: catchId,
      user_id: userId,
      find_photo_path: findPath,
      find_geom: `SRID=4326;POINT(${find.lng} ${find.lat})`,
      find_at: find.at,
      find_p_hash: hexToBitString(find.pHash),
      created_at: now,
      updated_at: now,
    });

  if (error) throw new CatchSubmitError(`catch_insert_failed: ${error.message}`);
}

const invokeVerifyCatch: NonNullable<SubmitOptions['invoke']> = async (body) => {
  // verify-catch runs two model calls (find, then find+dispose) before it answers, so this must
  // stay above their combined budget; a shorter timeout would fail a catch that the server is
  // still deciding.
  const { data, error } = await getSupabase().functions.invoke(VERIFY_CATCH_FUNCTION, {
    body,
    timeout: 120_000,
  });
  return { data, error };
};

/**
 * Upload both blurred photos, create the find row, then ask `verify-catch` for the verdict.
 *
 * Nothing unblurred is passed in or sent. If the upload/insert/invoke fails, the caller may retry
 * the same catch: the photos are re-uploaded idempotently and the find row is reused. Once the
 * server rejects a catch, it cannot be retried; the flow starts a fresh catch instead.
 */
export async function submitCatch(
  catchId: string,
  submission: CatchSubmission,
  { userId, invoke = invokeVerifyCatch }: SubmitOptions,
): Promise<VerifyCatchResult> {
  const { find, dispose } = submission;

  const [findPath, disposePath] = await Promise.all([
    uploadCatchPhoto(userId, catchId, 'find', find.bytes),
    uploadCatchPhoto(userId, catchId, 'dispose', dispose.bytes),
  ]).catch(async (error: unknown) => {
    await removeCatchPhotos(userId, catchId);
    throw new CatchSubmitError(
      `photo_upload_failed: ${error instanceof Error ? error.message : 'unknown'}`,
    );
  });

  const now = new Date().toISOString();
  try {
    await insertFindRow(catchId, userId, find, findPath, now);
  } catch (error) {
    await removeCatchPhotos(userId, catchId);
    throw error;
  }

  const body = {
    catch_id: catchId,
    find: {
      path: findPath,
      lat: find.lat,
      lng: find.lng,
      accuracy_m: find.accuracyM,
      at: find.at,
      mock: find.mock,
      p_hash: find.pHash,
    },
    dispose: {
      path: disposePath,
      lat: dispose.lat,
      lng: dispose.lng,
      accuracy_m: dispose.accuracyM,
      at: dispose.at,
      mock: dispose.mock,
      p_hash: dispose.pHash,
    },
  };

  const { data, error } = await invoke(body);
  if (error) {
    // Server/model/network failures are retryable: the function resets the catch so the same
    // catch id can be submitted again. A malformed request is not, but that is a client bug.
    throw new CatchSubmitError(
      `verify_catch_failed: ${error.message}`,
      error.context?.status !== 400,
    );
  }

  return parseVerifyCatchResult(data);
}
