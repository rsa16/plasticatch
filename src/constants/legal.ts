/**
 * Versions of the legal documents the app asks the player to accept.
 *
 * Bump a version whenever its document changes materially: the backend records the accepted
 * version next to the acceptance timestamp, so a bump is what makes re-acceptance detectable.
 *
 * There are deliberately no URLs or legal copy here. The documents are not hosted yet, and the
 * app must not invent either.
 */
export const TERMS_VERSION = 'v1';
export const PRIVACY_VERSION = 'v1';

/**
 * Optional published support/legal destinations.
 *
 * Only the environment variable names belong in the repo: the values are provisioned per
 * environment. Settings hides a row when its value is unset or malformed, so the app never
 * shows a dead link or invents legal copy.
 */
export const SUPPORT_EMAIL_ENV = 'EXPO_PUBLIC_SUPPORT_EMAIL';
export const PRIVACY_URL_ENV = 'EXPO_PUBLIC_PRIVACY_URL';

const SUPPORT_EMAIL_PATTERN = /^[^\s@:]+@[^\s@]+\.[^\s@]+$/;

/** A usable support address, or `null` when the value is not provisioned. */
export function parseSupportEmail(raw: string | undefined): string | null {
  const value = raw?.trim();
  return value && SUPPORT_EMAIL_PATTERN.test(value) ? value : null;
}

/** A usable absolute HTTPS policy URL, or `null` when the value is not provisioned. */
export function parsePrivacyUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** The provisioned support address, or `null`. */
export function supportEmail(): string | null {
  return parseSupportEmail(process.env.EXPO_PUBLIC_SUPPORT_EMAIL);
}

/** The provisioned Privacy Policy URL, or `null`. */
export function privacyUrl(): string | null {
  return parsePrivacyUrl(process.env.EXPO_PUBLIC_PRIVACY_URL);
}
