import { getSupabase } from '@/lib/supabase';

/** What `check_username_available` answers. */
export type UsernameCheck = {
  available: boolean;
  code: string | null;
};

/** What a profile write RPC answers. */
export type ProfileWriteResult = {
  success: boolean;
  code: string | null;
  /** Set by `username_cooldown`: the first moment a change is allowed again. */
  retryAt: string | null;
  /** Set by `username_cooldown`: seconds until `retryAt`. */
  remainingSeconds: number | null;
};

type RpcJson = Record<string, unknown> | null;

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Map the raw `check_username_available` payload. */
export function toUsernameCheck(value: RpcJson): UsernameCheck {
  return {
    available: value?.available === true,
    code: stringOrNull(value?.code),
  };
}

/** Map the raw profile-write payload shared by `change_username` and `update_my_profile`. */
export function toProfileWriteResult(value: RpcJson): ProfileWriteResult {
  return {
    success: value?.success === true,
    code: stringOrNull(value?.code),
    retryAt: stringOrNull(value?.retry_at),
    remainingSeconds: numberOrNull(value?.remaining_seconds),
  };
}

/** The message shown for a username rejection, or `null` when there is nothing to say. */
export function usernameErrorMessage(code: string | null): string | null {
  switch (code) {
    case 'invalid_username':
      return 'Use 3–20 characters: lowercase letters, numbers and underscores.';
    case 'username_not_allowed':
      return 'That username is not allowed. Try another.';
    case 'username_taken':
      return 'That username is already taken. Try another.';
    case 'username_cooldown':
      return 'You changed your username recently. You can change it again later.';
    case 'sign_in_required':
      return 'Sign in again to save your username.';
    case null:
      return null;
    default:
      return 'That username could not be saved. Try another.';
  }
}

/** Ask the server whether a username can still be claimed. */
export async function checkUsernameAvailable(username: string): Promise<UsernameCheck> {
  const { data, error } = await getSupabase().rpc('check_username_available', {
    p_username: username,
  });

  if (error) throw new Error(`username_check_failed: ${error.message}`);

  return toUsernameCheck(data as RpcJson);
}

/** Claim a username for the signed-in player, enforcing the server's policy and cooldown. */
export async function claimUsername(username: string): Promise<ProfileWriteResult> {
  const { data, error } = await getSupabase().rpc('change_username', {
    p_username: username,
  });

  if (error) throw new Error(`username_change_failed: ${error.message}`);

  return toProfileWriteResult(data as RpcJson);
}

/** Stamp the profile as age-verified after the gate admits the player. */
export async function markAgeVerified(): Promise<ProfileWriteResult> {
  const { data, error } = await getSupabase().rpc('update_my_profile', {
    p_age_verified: true,
  });

  if (error) throw new Error(`age_verification_failed: ${error.message}`);

  return toProfileWriteResult(data as RpcJson);
}

/** Record both consent timestamps and versions in one request. */
export async function acceptConsent({
  termsVersion,
  privacyVersion,
}: {
  termsVersion: string;
  privacyVersion: string;
}): Promise<ProfileWriteResult> {
  const { data, error } = await getSupabase().rpc('update_my_profile', {
    p_terms_version: termsVersion,
    p_privacy_version: privacyVersion,
  });

  if (error) throw new Error(`consent_failed: ${error.message}`);

  return toProfileWriteResult(data as RpcJson);
}
