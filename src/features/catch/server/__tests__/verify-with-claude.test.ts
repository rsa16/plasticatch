import type Anthropic from '@anthropic-ai/sdk';

import {
  buildVerifyParams,
  VERIFY_MODEL,
  VerifyResponseError,
  verifyWithClaude,
  type MessagesClient,
} from '@/features/catch/server/verify-with-claude';

const USAGE = { input_tokens: 1500, output_tokens: 60 } as Anthropic.Usage;

function fakeClient(response: Partial<Anthropic.Message>) {
  const create = jest.fn(
    async (_params: Anthropic.MessageCreateParamsNonStreaming) =>
      ({ stop_reason: 'end_turn', usage: USAGE, content: [], ...response }) as Anthropic.Message,
  );
  const client: MessagesClient = { messages: { create } };
  return { client, create };
}

function textReply(text: string): Partial<Anthropic.Message> {
  return { content: [{ type: 'text', text } as Anthropic.TextBlock] };
}

describe('buildVerifyParams', () => {
  it('sends the Find photo with the STEP 1 rule on Haiku', () => {
    const params = buildVerifyParams({ step: 'find', photos: ['aGk='] });

    expect(params.model).toBe(VERIFY_MODEL);
    expect(params.model).toBe('claude-haiku-5-5');
    expect(params.output_config?.format?.type).toBe('json_schema');

    const content = params.messages[0].content as Anthropic.ContentBlockParam[];
    expect(content.filter((block) => block.type === 'image')).toHaveLength(1);
    expect(content.at(-1)).toMatchObject({ type: 'text', text: expect.stringContaining('STEP 1') });
  });

  it('labels both Dispose photos in order', () => {
    const params = buildVerifyParams({ step: 'dispose', photos: ['Zmlu', 'ZGlz'] });
    const content = params.messages[0].content as Anthropic.ContentBlockParam[];

    expect(content.map((block) => (block.type === 'image' ? 'image' : block.type))).toStrictEqual([
      'text',
      'image',
      'text',
      'image',
      'text',
    ]);
    expect(content[1]).toMatchObject({ source: { data: 'Zmlu', media_type: 'image/jpeg' } });
    expect(content[3]).toMatchObject({ source: { data: 'ZGlz' } });
    expect(content[4]).toMatchObject({ text: expect.stringContaining('same item') });
  });
});

describe('verifyWithClaude', () => {
  const request = { step: 'find' as const, photos: ['aGk='] };

  it('returns the parsed verdict and usage', async () => {
    const verdict = { pass: false, item: 'shoe', reason: 'that looks like a shoe, not litter.' };
    const { client, create } = fakeClient(textReply(JSON.stringify(verdict)));

    await expect(verifyWithClaude(client, request)).resolves.toStrictEqual({
      verdict,
      usage: USAGE,
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it.each(['refusal', 'max_tokens'] as const)(
    'throws when Claude stops with %s',
    async (reason) => {
      const { client } = fakeClient({ ...textReply('{"pass": tr'), stop_reason: reason });

      await expect(verifyWithClaude(client, request)).rejects.toBeInstanceOf(VerifyResponseError);
    },
  );

  it.each([
    ['no text block', { content: [] }],
    ['text that is not JSON', textReply('Looks like litter to me!')],
    ['JSON that is not a verdict', textReply('{"pass": "yes"}')],
  ])('throws on %s', async (_, response) => {
    const { client } = fakeClient(response);

    await expect(verifyWithClaude(client, request)).rejects.toBeInstanceOf(VerifyResponseError);
  });
});
