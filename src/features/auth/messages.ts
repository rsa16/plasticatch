/**
 * Player-facing auth copy.
 *
 * Every failure path resolves to one of these strings. Supabase error text names the
 * problem ("Invalid login credentials", "User already registered", "Email not confirmed"),
 * so it is never rendered. Each operation has exactly one generic failure message, which is
 * what keeps a wrong password and an unknown address indistinguishable.
 */
export const SIGN_IN_ERROR =
  "We couldn't sign you in with those details. Check your email and password and try again.";

export const SIGN_UP_ERROR =
  "We couldn't create your account with those details. Check your email and password and try again.";

export const UNAVAILABLE_ERROR =
  "We couldn't reach the sign-in service. Check your connection and try again.";

export const PASSWORD_UPDATE_ERROR =
  "We couldn't save your new password. Check your connection and try again.";

export const GOOGLE_ERROR = "Google sign-in didn't complete. Check your connection and try again.";

/**
 * A re-authentication that came back as another account. The deletion is cancelled and the
 * app signs out rather than leaving the wrong player able to continue.
 */
export const REAUTH_DIFFERENT_ACCOUNT =
  'That signed in to a different account, so nothing was deleted. You have been signed out.';

/** Shown after a resend, whether or not the address has an account. */
export const RESEND_NOTICE = "If that address needs confirming, we've sent another link.";

/** Shown after a password reset request, whether or not the address has an account. */
export const RESET_NOTICE = "If that email has an account, we've sent a reset link.";
