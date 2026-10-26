import Anthropic from '@anthropic-ai/sdk';

import { VerifyResponseError, verifyWithClaude } from '@/features/catch/server/verify-with-claude';
import { parseVerifyCatchRequest } from '@/features/catch/verdict';

/**
 * POST /api/verify-catch: judge a catch step's photos with Claude.
 *
 * Runs on the Expo dev server, never on the phone. The key comes from `.env` and, being an API
 * route, stays out of the app bundle.
 */

let client: Anthropic | undefined;

function getClient(apiKey: string) {
  client ??= new Anthropic({ apiKey });
  return client;
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[verify-catch] ANTHROPIC_API_KEY is not set. Add it to .env and restart Expo.');
    return Response.json({ error: 'Verification is not configured.' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const parsed = parseVerifyCatchRequest(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  try {
    const { verdict, usage } = await verifyWithClaude(getClient(apiKey), parsed.request);
    console.log(
      `[verify-catch] ${parsed.request.step}: ${verdict.pass ? 'pass' : 'fail'} (${verdict.item})` +
        ` - ${usage.input_tokens} in / ${usage.output_tokens} out tokens`,
    );
    return Response.json(verdict);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('[verify-catch] The API key was rejected. Check ANTHROPIC_API_KEY in .env.');
    } else if (error instanceof Anthropic.RateLimitError) {
      console.error('[verify-catch] Rate limited or out of credit:', error.message);
    } else if (error instanceof Anthropic.APIError) {
      console.error(`[verify-catch] Claude API error ${error.status}:`, error.message);
    } else if (error instanceof VerifyResponseError) {
      console.error('[verify-catch]', error.message);
    } else {
      console.error('[verify-catch] Unexpected error:', error);
    }
    return Response.json({ error: 'Could not check the photo.' }, { status: 502 });
  }
}
