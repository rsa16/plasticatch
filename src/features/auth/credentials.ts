/**
 * The local minimum for new passwords. Stricter than Supabase's default; the live project should
 * also raise its server-side minimum and enable leaked-password protection (a dashboard action).
 */
export const MIN_PASSWORD_LENGTH = 8;

/** Which form the auth screen is showing. */
export type CredentialMode = 'login' | 'create';

/** The raw field values from the auth form. */
export type CredentialFields = {
  email: string;
  password: string;
  confirmPassword: string;
};

/** The new-password fields on the reset screen. */
export type NewPasswordFields = {
  password: string;
  confirmPassword: string;
};

/** Trim the address the player typed; the store sends exactly this. */
export function normalizeEmail(email: string): string {
  return email.trim();
}

/**
 * The first local reason these fields cannot be submitted, or `null` when they can.
 *
 * Purely local checks, so an invalid form never reaches the network. The messages are plain
 * language and name the fix; nothing here reports whether an account exists.
 */
export function validateCredentials(
  mode: CredentialMode,
  { email, password, confirmPassword }: CredentialFields,
): string | null {
  const normalized = normalizeEmail(email);

  if (!normalized) return 'Enter your email address.';
  if (!/^\S+@\S+$/.test(normalized)) return 'Enter a valid email address.';
  if (!password) return 'Enter your password.';

  if (mode === 'create') {
    return validateNewPassword({ password, confirmPassword });
  }

  return null;
}

/**
 * The first local reason a new password cannot be saved, or `null` when it can.
 *
 * Same minimum and copy as account creation, so a password accepted here is accepted by the
 * sign-up form too. Never reaches the network when it fails.
 */
export function validateNewPassword({
  password,
  confirmPassword,
}: NewPasswordFields): string | null {
  if (!password) return 'Enter a new password.';

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`;
  }

  if (password !== confirmPassword) return "Those passwords don't match.";

  return null;
}
