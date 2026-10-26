import { bmvbhash } from 'blockhash-core';
import jpeg from 'jpeg-js';

/** Side length of the square grid. 8 × 8 gives the 64-bit hash the server stores. */
export const PHASH_BITS = 8;

/** The size the image is downscaled to before hashing. */
export const PHASH_IMAGE_SIZE = 64;

/** A 64-bit perceptual hash as 16 lowercase hex characters. */
export type PHashHex = string;

type RgbaImage = {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray | number[];
};

/**
 * Hash decoded RGBA pixels. Pure so unit tests can pin the bit output without a camera or a
 * native image decoder.
 */
export function phashFromRgba(image: RgbaImage): PHashHex {
  return bmvbhash(image, PHASH_BITS).toLowerCase();
}

/** Hash an encoded JPEG. `jpeg-js` decodes to RGBA, which is what blockhash expects. */
export function phashFromJpeg(bytes: Uint8Array): PHashHex {
  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
  return phashFromRgba(decoded);
}

/**
 * A database `bit(64)` value is a string of 0/1 digits, not hex. The server compares the stored
 * column against `hexHashToBits(p_hash)`, so the client must send the same 64-character form.
 */
export function hexToBitString(hex: PHashHex): string {
  if (!/^[0-9a-f]{16}$/.test(hex)) throw new Error('p_hash_invalid');
  return hex
    .split('')
    .map((digit) => parseInt(digit, 16).toString(2).padStart(4, '0'))
    .join('');
}
