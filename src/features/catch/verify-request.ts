import { parseCatchVerdict, type CatchVerdict, type VerifyCatchRequest } from './verdict';

/**
 * The verification route. In development a relative path resolves to the Expo dev server, which is
 * where the API route (and the key) live.
 */
export const VERIFY_CATCH_PATH = '/api/verify-catch';

/**
 * Ask the server to judge a step's photos. Throws when the photos could not be checked at all (no
 * signal, server error, a malformed answer), which the step shows as "try again" rather than as a
 * failed catch. `fetchFn` is injectable so tests never touch the network.
 */
export async function requestCatchVerdict(
  request: VerifyCatchRequest,
  fetchFn: typeof fetch = fetch,
): Promise<CatchVerdict> {
  const response = await fetchFn(VERIFY_CATCH_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`Verification failed with status ${response.status}`);
  }

  const verdict = parseCatchVerdict(await response.json());
  if (!verdict) throw new Error('Verification returned an unexpected answer');
  return verdict;
}
