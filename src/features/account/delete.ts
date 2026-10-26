import { getSupabase } from '@/lib/supabase';

import { canDeleteAccount, type DeleteGate } from './gate';

/** The Edge Function that owns the hard delete, cascade and Storage cleanup. */
export const DELETE_ACCOUNT_FUNCTION = 'delete-account';

export const DELETE_NOT_READY_MESSAGE =
  'Re-authenticate and type the confirmation before deleting your account.';

export const DELETE_REAUTH_REQUIRED_MESSAGE =
  'Your sign-in is no longer fresh. Re-authenticate and try again. Your account has not been deleted.';

export const DELETE_CONFIRMATION_MISMATCH_MESSAGE =
  "That doesn't match the confirmation. Check the spelling and try again. Your account has not been deleted.";

export const DELETE_SESSION_INVALID_MESSAGE =
  'Your session has expired. Sign in again before deleting your account.';

export const DELETE_INCOMPLETE_MESSAGE =
  'Your account is still active, but the deletion did not finish. Try again, or contact support if it keeps failing.';

export const DELETE_UNAVAILABLE_MESSAGE =
  "We couldn't reach the delete service. Check your connection and try again. If you are still signed in, your account is still active.";

/** What the screen should show after asking the server to delete the account. */
export type DeleteAccountOutcome =
  | { status: 'success' }
  | { status: 'reauth_required'; message: string }
  | { status: 'confirmation_mismatch'; message: string }
  | { status: 'error'; message: string };

/** The two fields the function needs from the client. */
export type DeleteAccountInput = Pick<
  DeleteGate,
  'username' | 'confirmation' | 'reauthenticatedAt'
>;

/** A status plus decoded body, so response mapping can be tested without a Supabase client. */
export type DeleteAccountResponse = { status: number; body: unknown };

/** Posts the confirmation with the current session's bearer token. */
export type DeleteAccountTransport = (confirmation: string) => Promise<DeleteAccountResponse>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorCode(body: unknown): string | null {
  if (!isRecord(body)) return null;
  return typeof body.error === 'string' ? body.error : null;
}

/** Map the Edge Function's status/body onto copy the screen can act on. */
export function outcomeFromDeleteResponse({
  status,
  body,
}: DeleteAccountResponse): DeleteAccountOutcome {
  const code = errorCode(body);

  if (status >= 200 && status < 300 && isRecord(body) && body.success === true) {
    return { status: 'success' };
  }

  if (code === 'reauthentication_required') {
    return { status: 'reauth_required', message: DELETE_REAUTH_REQUIRED_MESSAGE };
  }

  if (code === 'confirmation_mismatch' || code === 'confirmation_required') {
    return { status: 'confirmation_mismatch', message: DELETE_CONFIRMATION_MISMATCH_MESSAGE };
  }

  if (code === 'invalid_session' || status === 401) {
    return { status: 'error', message: DELETE_SESSION_INVALID_MESSAGE };
  }

  if (code?.includes('photo_cleanup') || code === 'photos_removed_account_deletion_failed') {
    return { status: 'error', message: DELETE_INCOMPLETE_MESSAGE };
  }

  return { status: 'error', message: DELETE_UNAVAILABLE_MESSAGE };
}

type ResponseLike = { status?: number; json?: () => Promise<unknown> };

type DeleteAccountClient = {
  functions: {
    invoke(
      name: string,
      options: { body: { confirmation: string } },
    ): Promise<{ data: unknown; error: { context?: ResponseLike } | null }>;
  };
};

/**
 * Invoke the deployed function with the confirmation.
 *
 * The Edge Function reads the bearer token from the Supabase client's current session and does
 * the hard delete, cascade and `catch-photos/{user_id}/` cleanup server-side. No service-role
 * key and no Storage access exist on this side.
 */
export async function invokeDeleteAccount(
  confirmation: string,
  client: DeleteAccountClient = getSupabase() as unknown as DeleteAccountClient,
): Promise<DeleteAccountResponse> {
  const { data, error } = await client.functions.invoke(DELETE_ACCOUNT_FUNCTION, {
    body: { confirmation },
  });

  if (error) {
    let body: unknown = data;
    const context = error.context;

    if (context?.json) {
      try {
        body = await context.json();
      } catch {
        // A non-JSON error body leaves the generic copy in charge.
      }
    }

    return { status: context?.status ?? 0, body };
  }

  return { status: 200, body: data };
}

/**
 * Ask the server to delete the account.
 *
 * Refuses locally unless the username matches and re-authentication is still fresh, so a
 * mistaken call cannot rely on the typed username alone. The server repeats both checks.
 * A failed request changes no local state; the caller keeps the session until success.
 */
export async function deleteAccount(
  input: DeleteAccountInput,
  { transport, now = Date.now }: { transport: DeleteAccountTransport; now?: () => number },
): Promise<DeleteAccountOutcome> {
  const gate: DeleteGate = { ...input, now: now() };

  if (!canDeleteAccount(gate)) {
    return { status: 'error', message: DELETE_NOT_READY_MESSAGE };
  }

  try {
    return outcomeFromDeleteResponse(await transport(input.confirmation));
  } catch {
    return { status: 'error', message: DELETE_UNAVAILABLE_MESSAGE };
  }
}
