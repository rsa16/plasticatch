import { randomUUID } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Image as RNImage } from 'react-native';
import { createImageFaceDetector } from 'react-native-vision-camera-face-detector';
import { ClipOp, ImageFormat, Skia, TileMode, type SkImage } from '@shopify/react-native-skia';

import { phashFromJpeg, PHASH_IMAGE_SIZE } from './phash';
import type { CaptureMetadata, PreparedCapture } from './types';

/** Long edge of the JPEG that leaves the device. */
export const BLURRED_LONG_EDGE = 1080;
/** JPEG quality of the blurred upload. */
export const BLURRED_JPEG_QUALITY = 80;
/** Faces are blurred a little beyond their detected box so the edge is not left sharp. */
const FACE_BOX_EXPAND = 1.25;
/** Blur radius as a fraction of the shorter image side. */
const FACE_BLUR_FRACTION = 0.02;

type Dimensions = { width: number; height: number };

function imageSize(uri: string): Promise<Dimensions> {
  return new Promise((resolve, reject) => {
    RNImage.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

function removeFile(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // A temp file that is already gone is not a failure.
  }
}

async function saveResized(uri: string, size: Dimensions): Promise<string> {
  const context = ImageManipulator.manipulate(uri).resize(size);
  let rendered: Awaited<ReturnType<typeof context.renderAsync>> | undefined;
  try {
    rendered = await context.renderAsync();
    const { uri: saved } = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: 1,
    });
    return saved;
  } finally {
    rendered?.release();
    context.release();
  }
}

/**
 * The 64-bit pHash of the pre-blur original.
 *
 * The image is downscaled to 64×64 and decoded to RGBA before hashing, so the result does not
 * depend on the camera's resolution. The tiny derivative is deleted immediately.
 */
export async function hashPhoto(uri: string): Promise<string> {
  const small = await saveResized(uri, {
    width: PHASH_IMAGE_SIZE,
    height: PHASH_IMAGE_SIZE,
  });
  try {
    const bytes = await new File(small).bytes();
    return phashFromJpeg(bytes);
  } finally {
    removeFile(small);
  }
}

type FaceDetector = ReturnType<typeof createImageFaceDetector>;

// Creating the hybrid object costs a native module lookup; one per app session is enough.
let detector: FaceDetector | null = null;

function faceDetector(): FaceDetector {
  detector ??= createImageFaceDetector({ performanceMode: 'fast', minFaceSize: 0.1 });
  return detector;
}

/** Pixel boxes (in the working image's coordinate space) around every detected face. */
async function faceBoxes(uri: string, size: Dimensions) {
  let faces: Awaited<ReturnType<FaceDetector['detectFaces']>> = [];
  try {
    faces = await faceDetector().detectFaces(uri);
  } catch {
    // A detector failure must not silently upload the original. The photo is still blurred by
    // the whole-image fallback below, which is privacy-safe but less precise.
    return null;
  }

  return faces
    .map((face) => face.bounds)
    .filter((bounds) => bounds.width > 0 && bounds.height > 0)
    .map((bounds) => {
      const expandX = (bounds.width * (FACE_BOX_EXPAND - 1)) / 2;
      const expandY = (bounds.height * (FACE_BOX_EXPAND - 1)) / 2;
      const x = Math.max(0, bounds.x - expandX);
      const y = Math.max(0, bounds.y - expandY);
      const width = Math.min(size.width - x, bounds.width + expandX * 2);
      const height = Math.min(size.height - y, bounds.height + expandY * 2);
      return { x, y, width, height };
    });
}

function blurFaces(
  image: SkImage,
  boxes: { x: number; y: number; width: number; height: number }[] | null,
): Uint8Array {
  const width = image.width();
  const height = image.height();
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) throw new Error('face_blur_surface_unavailable');

  try {
    const canvas = surface.getCanvas();
    const base = Skia.Paint();
    canvas.drawImage(image, 0, 0, base);

    const sigma = Math.max(14, Math.min(width, height) * FACE_BLUR_FRACTION);
    const blur = Skia.Paint();
    blur.setImageFilter(Skia.ImageFilter.MakeBlur(sigma, sigma, TileMode.Clamp, null));

    if (boxes === null) {
      // The detector failed. Blur the whole frame so an undetected bystander can never leave the
      // device. This is conservative, not a substitute for detection.
      canvas.drawImage(image, 0, 0, blur);
    } else {
      for (const box of boxes) {
        canvas.save();
        canvas.clipRect(box, ClipOp.Intersect, true);
        canvas.drawImage(image, 0, 0, blur);
        canvas.restore();
      }
    }

    const snapshot = surface.makeImageSnapshot();
    return snapshot.encodeToBytes(ImageFormat.JPEG, BLURRED_JPEG_QUALITY);
  } finally {
    surface.dispose();
  }
}

async function blurToFile(
  uri: string,
  size: Dimensions,
): Promise<{ uri: string; bytes: Uint8Array }> {
  const data = Skia.Data.fromBytes(await new File(uri).bytes());
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error('photo_decode_failed');

  try {
    const boxes = await faceBoxes(uri, size);
    const bytes = blurFaces(image, boxes);

    const output = new File(Paths.cache, `catch-${randomUUID()}.jpg`);
    output.create({ overwrite: true });
    output.write(bytes);

    return { uri: output.uri, bytes };
  } finally {
    image.dispose();
    data.dispose();
  }
}

/**
 * Run the privacy pipeline for one capture:
 *
 * 1. hash the pre-blur original (64×64 derivative, then delete it);
 * 2. downscale to the upload size;
 * 3. blur every detected face (or the whole frame if detection failed);
 * 4. delete the original and the intermediate;
 * 5. return only the blurred JPEG and its hash.
 *
 * Callers must never keep or send the original URI.
 */
export async function prepareCapture(
  originalUri: string,
  metadata: CaptureMetadata,
): Promise<PreparedCapture & { bytes: Uint8Array }> {
  const original = await imageSize(originalUri);
  const pHash = await hashPhoto(originalUri);

  const scale = Math.min(1, BLURRED_LONG_EDGE / Math.max(original.width, original.height));
  const target = {
    width: Math.max(1, Math.round(original.width * scale)),
    height: Math.max(1, Math.round(original.height * scale)),
  };
  const working = await saveResized(originalUri, target);

  try {
    const blurred = await blurToFile(working, target);
    return { ...metadata, uri: blurred.uri, pHash, bytes: blurred.bytes };
  } finally {
    removeFile(working);
    removeFile(originalUri);
  }
}
