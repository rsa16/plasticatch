/**
 * The contract between the app and the photo-verification server.
 *
 * Both sides import this module, so it holds only types and validation: no network, no SDK, no
 * secrets. Keeping the shape here means Phase 2 can move the server elsewhere without touching the
 * screens, as long as the new server answers the same request with the same verdict.
 */

/** Which camera step a photo belongs to. */
export type VerifyStep = 'find' | 'dispose';

/**
 * What the app sends. Photos are base64 JPEGs, already shrunk on the phone. Find sends the litter
 * photo; Dispose sends the Find photo first, then the photo of it going into a bin.
 */
export type VerifyCatchRequest = {
  step: VerifyStep;
  photos: string[];
};

/** What the server answers. `reason` is one short sentence the failure popup can show. */
export type CatchVerdict = {
  pass: boolean;
  item: string;
  reason: string;
};

/** How many photos each step sends. */
export const PHOTOS_PER_STEP: Record<VerifyStep, number> = { find: 1, dispose: 2 };

/**
 * Largest base64 photo the server accepts. A 1024px JPEG is a few hundred KB; this leaves room
 * while staying well under the model's per-image limit, and stops a client posting a raw photo.
 */
export const MAX_PHOTO_BASE64_LENGTH = 2_000_000;

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Validate a request body. Returns the request, or a message saying what is wrong with it, so the
 * server can answer 400 without trusting anything the client sent.
 */
export function parseVerifyCatchRequest(
  body: unknown,
): { ok: true; request: VerifyCatchRequest } | { ok: false; error: string } {
  if (!isRecord(body)) return { ok: false, error: 'Body must be a JSON object.' };

  const { step, photos } = body;
  if (step !== 'find' && step !== 'dispose') {
    return { ok: false, error: 'step must be "find" or "dispose".' };
  }
  if (!Array.isArray(photos) || photos.length !== PHOTOS_PER_STEP[step]) {
    return { ok: false, error: `${step} needs exactly ${PHOTOS_PER_STEP[step]} photo(s).` };
  }
  for (const photo of photos) {
    if (typeof photo !== 'string' || photo.length === 0 || !BASE64.test(photo)) {
      return { ok: false, error: 'Each photo must be a base64 string.' };
    }
    if (photo.length > MAX_PHOTO_BASE64_LENGTH) {
      return { ok: false, error: 'A photo is too large. Resize it before sending.' };
    }
  }

  return { ok: true, request: { step, photos: photos as string[] } };
}

/** Validate a verdict, from the model on the server or from the server in the app. */
export function parseCatchVerdict(value: unknown): CatchVerdict | null {
  if (!isRecord(value)) return null;

  const { pass, item, reason } = value;
  if (typeof pass !== 'boolean' || typeof item !== 'string' || typeof reason !== 'string') {
    return null;
  }
  return { pass, item, reason };
}
