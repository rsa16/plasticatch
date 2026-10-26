import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Remember that this device asked for a reset link.
 *
 * A PKCE recovery redirect carries no `type`, and an expired or already-used link never
 * reaches the code exchange, so the failed redirect is indistinguishable from a failed OAuth
 * or sign-up callback. This marker, written when the reset email is requested, is what lets
 * the callback show the "request a new link" state instead of a generic sign-in error.
 *
 * Best effort: storage failures must never change the outcome of the reset request.
 */
const RECOVERY_INTENT_KEY = 'plasticatch.auth.recovery-requested-at';

/** GoTrue's default email-link lifetime (`GOTRUE_MAILER_OTP_EXP`, 24 hours). */
export const RECOVERY_INTENT_TTL_MS = 24 * 60 * 60 * 1000;

export async function rememberRecoveryRequest(now: number = Date.now()): Promise<void> {
  try {
    await AsyncStorage.setItem(RECOVERY_INTENT_KEY, String(now));
  } catch {
    // The reset email still went out; only the expired-link state is less precise.
  }
}

export async function forgetRecoveryRequest(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECOVERY_INTENT_KEY);
  } catch {
    // Ignore: a stale marker expires on its own.
  }
}

/** Whether a reset was requested recently enough for its link to still be on its way. */
export async function hasRecoveryRequest(now: number = Date.now()): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(RECOVERY_INTENT_KEY);
    if (!raw) return false;

    const requestedAt = Number(raw);
    if (!Number.isFinite(requestedAt) || now - requestedAt > RECOVERY_INTENT_TTL_MS) {
      await forgetRecoveryRequest();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
