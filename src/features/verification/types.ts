import type { RetryHalf } from './rejection';

/** The GPS and clock values captured with one photo. */
export type CaptureMetadata = {
  lat: number;
  lng: number;
  accuracyM: number;
  /** ISO timestamp from the device clock at capture time. */
  at: string;
  /** `null` when the platform cannot tell us; the server fails open on `null`. */
  mock: boolean | null;
};

/** A photo after the on-device privacy pipeline has run. */
export type PreparedCapture = CaptureMetadata & {
  /** A local file URI of the blurred JPEG, used for the preview and the upload. */
  uri: string;
  /** 64-bit perceptual hash of the pre-blur original, as 16 hex characters. */
  pHash: string;
};

/** A prepared photo after it has been uploaded to the private bucket. */
export type StoredCapture = PreparedCapture & { path: string };

/** The itemised ledger the server returns for a verified catch. */
export type XpBreakdown = {
  already_awarded: boolean;
  xp_awarded: number;
  base_xp?: number;
  streak_bonus?: number;
  first_catch_of_day?: number;
  repeat_location_adjustment?: number;
  daily_cap_adjustment?: number;
  total_xp: number;
  level?: number;
  current_streak: number;
  longest_streak: number;
};

/** The server's answer to a `verify-catch` call. */
export type VerifyCatchResult = {
  verdict: 'verified' | 'rejected';
  rejectionCode: string | null;
  /** The model's reason, for `photo_check_failed` only. */
  reason: string | null;
  retry: RetryHalf | null;
  xp: XpBreakdown | null;
  alreadyVerified: boolean;
};
