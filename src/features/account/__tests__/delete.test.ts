import {
  DELETE_CONFIRMATION_MISMATCH_MESSAGE,
  DELETE_REAUTH_REQUIRED_MESSAGE,
  deleteAccount,
  invokeDeleteAccount,
  outcomeFromDeleteResponse,
  type DeleteAccountResponse,
  type DeleteAccountTransport,
} from '@/features/account';

const NOW = 1_800_000_000_000;
const FRESH = NOW - 1_000;

function response(status: number, body: unknown): DeleteAccountResponse {
  return { status, body };
}

function transportReturning(
  result: DeleteAccountResponse,
): jest.MockedFunction<DeleteAccountTransport> {
  return jest.fn(async (_confirmation: string) => result);
}

describe('outcomeFromDeleteResponse', () => {
  it('treats the function success body as deleted', () => {
    expect(
      outcomeFromDeleteResponse(
        response(200, { success: true, account_deleted: true, photos_deleted: true }),
      ),
    ).toStrictEqual({ status: 'success' });
  });

  it('maps a stale auth window to re-authentication copy', () => {
    const outcome = outcomeFromDeleteResponse(
      response(401, { error: 'reauthentication_required' }),
    );

    expect(outcome).toStrictEqual({
      status: 'reauth_required',
      message: DELETE_REAUTH_REQUIRED_MESSAGE,
    });
  });

  it('maps a wrong confirmation to mismatch copy without ending the session', () => {
    expect(
      outcomeFromDeleteResponse(response(400, { error: 'confirmation_mismatch' })),
    ).toStrictEqual({
      status: 'confirmation_mismatch',
      message: DELETE_CONFIRMATION_MISMATCH_MESSAGE,
    });
    expect(
      outcomeFromDeleteResponse(response(400, { error: 'confirmation_required' })),
    ).toStrictEqual({
      status: 'confirmation_mismatch',
      message: DELETE_CONFIRMATION_MISMATCH_MESSAGE,
    });
  });

  it('keeps a cleanup failure honest about the account remaining active', () => {
    for (const code of [
      'photo_cleanup_failed_account_not_deleted',
      'photo_cleanup_incomplete_account_not_deleted',
      'photos_removed_account_deletion_failed',
    ]) {
      const outcome = outcomeFromDeleteResponse(response(500, { error: code }));
      expect(outcome.status).toBe('error');
      if (outcome.status === 'error') expect(outcome.message).toContain('still active');
    }
  });

  it('reports an invalid session without pretending deletion happened', () => {
    const outcome = outcomeFromDeleteResponse(response(401, { error: 'invalid_session' }));
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') expect(outcome.message).toContain('Sign in again');
  });

  it('never treats an unknown response as success', () => {
    expect(outcomeFromDeleteResponse(response(200, { success: false })).status).toBe('error');
    expect(outcomeFromDeleteResponse(response(500, null)).status).toBe('error');
    expect(outcomeFromDeleteResponse(response(0, null)).status).toBe('error');
  });
});

describe('deleteAccount', () => {
  it('does not call the function until the username and re-auth gate both pass', async () => {
    const transport = transportReturning(response(200, { success: true }));

    const wrongName = await deleteAccount(
      {
        username: 'crypticcatch',
        confirmation: 'wrong',
        reauthenticatedAt: FRESH,
      },
      { transport, now: () => NOW },
    );
    const staleAuth = await deleteAccount(
      {
        username: 'crypticcatch',
        confirmation: 'crypticcatch',
        reauthenticatedAt: null,
      },
      { transport, now: () => NOW },
    );

    expect(wrongName.status).toBe('error');
    expect(staleAuth.status).toBe('error');
    expect(transport).not.toHaveBeenCalled();
  });

  it('sends only the exact typed username once the gate passes', async () => {
    const transport = transportReturning(response(200, { success: true, account_deleted: true }));

    const outcome = await deleteAccount(
      {
        username: 'crypticcatch',
        confirmation: 'crypticcatch',
        reauthenticatedAt: FRESH,
      },
      { transport, now: () => NOW },
    );

    expect(outcome).toStrictEqual({ status: 'success' });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport).toHaveBeenCalledWith('crypticcatch');
  });

  it('lets a username-less account confirm with DELETE', async () => {
    const transport = transportReturning(response(200, { success: true, account_deleted: true }));

    const outcome = await deleteAccount(
      {
        username: null,
        confirmation: 'DELETE',
        reauthenticatedAt: FRESH,
      },
      { transport, now: () => NOW },
    );

    expect(outcome).toStrictEqual({ status: 'success' });
    expect(transport).toHaveBeenCalledWith('DELETE');
  });

  it('turns a transport failure into an error without throwing', async () => {
    const transport = jest.fn(async () => {
      throw new Error('network down');
    });

    const outcome = await deleteAccount(
      {
        username: 'crypticcatch',
        confirmation: 'crypticcatch',
        reauthenticatedAt: FRESH,
      },
      { transport, now: () => NOW },
    );

    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') expect(outcome.message).toContain("couldn't reach");
  });
});

describe('invokeDeleteAccount', () => {
  function fakeClient(result: {
    data: unknown;
    error: { context?: { status?: number; json?: () => Promise<unknown> } } | null;
  }) {
    return {
      functions: {
        invoke: jest.fn(async () => result),
      },
    };
  }

  it('posts the confirmation to the existing Edge Function', async () => {
    const client = fakeClient({ data: { success: true }, error: null });

    await invokeDeleteAccount('crypticcatch', client as never);

    expect(client.functions.invoke).toHaveBeenCalledWith('delete-account', {
      body: { confirmation: 'crypticcatch' },
    });
  });

  it('reads the error body and status from a failed invoke', async () => {
    const client = fakeClient({
      data: null,
      error: {
        context: {
          status: 401,
          json: async () => ({ error: 'reauthentication_required' }),
        },
      },
    });

    await expect(invokeDeleteAccount('crypticcatch', client as never)).resolves.toStrictEqual({
      status: 401,
      body: { error: 'reauthentication_required' },
    });
  });
});
