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
