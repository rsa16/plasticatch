import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';

import { verifyCatchPhoto } from './lifecycle';
import type { CatchCheck } from './step';
import { parseVerifyCatchRequest, type VerifyStep } from './verdict';
import { requestCatchVerdict } from './verify-request';

/** Width sent to the verifier. Enough to recognise litter, small enough to upload quickly. */
const VERIFY_PHOTO_WIDTH = 1024;

/**
 * Which verifier runs. `claude` sends photos to the verify-photo Edge Function; anything else
 * keeps the coin flip, so the app still works before the Anthropic secret is set. Not a secret:
 * it only picks the path.
 */
const VERIFIER = process.env.EXPO_PUBLIC_CATCH_VERIFIER === 'claude' ? 'claude' : 'mock';

/** Shrink a captured photo and return it as base64 JPEG for upload. */
async function preparePhoto(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri).resize({ width: VERIFY_PHOTO_WIDTH });
  let rendered: ImageRef | undefined;
  try {
    rendered = await context.renderAsync();
    const { base64 } = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.7,
      base64: true,
    });
    if (!base64) throw new Error('Could not encode the photo');
    return base64;
  } finally {
    // Both are native shared objects; a catch runs two photos through here, so leaking them
    // grows native memory on every attempt.
    rendered?.release();
    context.release();
  }
}

/**
 * Judge a step's photos (local URIs, in the order the server expects). Throws when they couldn't
 * be checked, which the step shows as "try again".
 */
export async function verifyCatchStep(step: VerifyStep, photos: string[]): Promise<CatchCheck> {
  if (VERIFIER === 'mock') return verifyCatchPhoto();

  const encoded = await Promise.all(photos.map(preparePhoto));

  // Same contract check the function runs, so an oversized or malformed payload fails here
  // instead of costing a round trip.
  const parsed = parseVerifyCatchRequest({ step, photos: encoded });
  if (!parsed.ok) throw new Error(`photo_check_rejected: ${parsed.error}`);

  const { pass, reason } = await requestCatchVerdict(parsed.request);
  return { pass, reason };
}
