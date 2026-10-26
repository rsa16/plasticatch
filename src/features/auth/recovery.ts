import { parseRedirectParams } from './oauth';

/**
 * Recovery-link helpers.
 *
 * The project uses the PKCE flow, so GoTrue returns only `code` in the redirect query; the
 * `type` marker lives in the link that arrives by email, not in the app's return URL. The
 * installed Supabase client (auth-js 2.118) remembers the marker on its stored PKCE verifier
 * and reports it as `redirectType` from `exchangeCodeForSession`. Classification therefore
 * accepts either signal, which also covers an implicit-flow redirect (`type=recovery`) should
 * the project ever switch flow types.
 */
export const RECOVERY_REDIRECT_TYPE = 'recovery';

/** Whether a redirect URL itself names the recovery link. */
export function isRecoveryRedirect(url: string): boolean {
  return parseRedirectParams(url).type === RECOVERY_REDIRECT_TYPE;
}

/** Whether an exchange result names the recovery flow. */
export function isRecoveryRedirectType(redirectType: string | null | undefined): boolean {
  return redirectType === RECOVERY_REDIRECT_TYPE;
}
