import type Anthropic from '@anthropic-ai/sdk';

import { parseCatchVerdict, type CatchVerdict, type VerifyCatchRequest } from '../verdict';

/**
 * Server-only: judges catch photos with Claude. Only the API route imports this module, so neither
 * the SDK nor the key reaches the app bundle. The client is injected so tests run without a key.
 */

export const VERIFY_MODEL = 'claude-haiku-5-5';

/** The slice of the SDK this module calls. The real `Anthropic` client satisfies it. */
export type MessagesClient = {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming): PromiseLike<Anthropic.Message>;
  };
};

const SYSTEM_PROMPT = `You check photos for PlastiCatch, a game where players pick up litter and throw it away. Judge only what you can see in the photos. Be fair but not gullible: the photo must show a real scene, not a picture of a screen or a printed photo.

Answer with:
- pass: whether the photo meets the step's rule.
- item: a few words naming the main item you see, such as "plastic bottle" or "crisp packet".
- reason: one short sentence (under 15 words) written to the player. When the photo fails, write it so it reads naturally after "Catch failed: ", starting lowercase and ending with a full stop, for example "that looks like a shoe, not litter." When it passes, briefly say what you saw.`;

const STEP_RULES = {
  find: `This is STEP 1. Pass the photo if it clearly shows a real piece of litter or trash: any discarded item such as a bottle, can, wrapper, bag, cup, carton, cigarette butt or scrap of paper. Fail it if there is no litter, if the item is clearly not trash (a shoe being worn, a pet, a person, plants), if it is too dark or blurry to tell, or if it is a picture of a screen.`,
  dispose: `This is STEP 2. Photo 1 is the litter the player found in STEP 1. Photo 2 is the STEP 2 photo. Pass only if photo 2 shows the same item as photo 1 (same kind, colour and shape; the angle can differ) going into, or just placed in, a trash can, recycling bin or other waste bin. Fail if it is a different item, there is no bin, the item can't be seen, or photo 2 is a picture of a screen.`,
} as const;

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    item: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['pass', 'item', 'reason'],
  additionalProperties: false,
};

/** Claude answered, but not with a verdict. The route reports it as a server error. */
export class VerifyResponseError extends Error {}

function photoBlocks(photos: string[]): Anthropic.ContentBlockParam[] {
  return photos.flatMap((data, index): Anthropic.ContentBlockParam[] => [
    { type: 'text', text: `Photo ${index + 1}:` },
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } },
  ]);
}

/** Build the Messages API request for one step. Exported for tests. */
export function buildVerifyParams(
  request: VerifyCatchRequest,
): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: VERIFY_MODEL,
    // Thinking tokens count toward this cap, so leave room beyond the short JSON answer.
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    // A yes/no photo check doesn't need deep reasoning; low effort keeps it fast and cheap.
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: VERDICT_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: [...photoBlocks(request.photos), { type: 'text', text: STEP_RULES[request.step] }],
      },
    ],
  };
}

/** Judge a validated request. Returns the verdict plus token usage for the dev-server log. */
export async function verifyWithClaude(
  client: MessagesClient,
  request: VerifyCatchRequest,
): Promise<{ verdict: CatchVerdict; usage: Anthropic.Usage }> {
  const response = await client.messages.create(buildVerifyParams(request));

  // Check why the model stopped before reading content: a refusal or a cut-off answer has no
  // usable verdict.
  if (response.stop_reason !== 'end_turn') {
    throw new VerifyResponseError(`Claude stopped with ${response.stop_reason}`);
  }

  const text = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text',
  );
  let verdict: CatchVerdict | null = null;
  try {
    verdict = parseCatchVerdict(JSON.parse(text?.text ?? ''));
  } catch {
    // Fall through to the error below.
  }
  if (!verdict) throw new VerifyResponseError('Claude did not return a verdict');

  return { verdict, usage: response.usage };
}
