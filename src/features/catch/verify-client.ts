import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { verifyCatchPhoto } from './lifecycle';
import type { CatchCheck } from './step';
import type { VerifyStep } from './verdict';
import { requestCatchVerdict } from './verify-request';

/** Width sent to the verifier. Enough to recognise litter, small enough to upload quickly. */
const VERIFY_PHOTO_WIDTH = 1024;

/**
 * Which verifier runs. `claude` sends photos to the API route; anything else keeps the coin flip,
 * so the app still works for anyone without an API key. Not a secret: it only picks the path.
 */
const VERIFIER = process.env.EXPO_PUBLIC_CATCH_VERIFIER === 'claude' ? 'claude' : 'mock';

/** Shrink a captured photo and return it as base64 JPEG for upload. */
async function preparePhoto(uri: string): Promise<string> {
  const rendered = await ImageManipulator.manipulate(uri)
    .resize({ width: VERIFY_PHOTO_WIDTH })
    .renderAsync();
  const { base64 } = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.7,
    base64: true,
  });
  if (!base64) throw new Error('Could not encode the photo');
  return base64;
}

/**
 * Judge a step's photos (local URIs, in the order the server expects). Throws when they couldn't
 * be checked, which the step shows as "try again".
 */
export async function verifyCatchStep(step: VerifyStep, photos: string[]): Promise<CatchCheck> {
  if (VERIFIER === 'mock') return verifyCatchPhoto();

  const encoded = await Promise.all(photos.map(preparePhoto));
  const { pass, reason } = await requestCatchVerdict({ step, photos: encoded });
  return { pass, reason };
}
