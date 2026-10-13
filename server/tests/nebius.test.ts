import {
  NebiusConfigurationError,
  NebiusRequestError,
  summarizeHydrologyData,
  verifyNebiusModel,
} from '../src/services/nebius.service';

const originalEnv = { ...process.env };

const observations = [
  { timestamp: '2026-10-12T04:25:00Z', metric: 'river_stage', value: 2.4, unit: 'm', source: 'synthetic-dhm' },
  { timestamp: '2026-10-12T04:25:00Z', metric: 'rainfall_24h', value: 61, unit: 'mm', source: 'synthetic-rain-gauge' },
];

afterEach(() => {
  process.env = { ...originalEnv };
  jest.restoreAllMocks();
  jest.useRealTimers();
});

beforeEach(() => {
  process.env.NEBIUS_API_KEY = 'test-only-key';
  process.env.NEBIUS_BASE_URL = 'https://api.tokenfactory.nebius.com/v1/';
  process.env.NEBIUS_MODEL = 'test/model';
  delete process.env.NEBIUS_MAX_TOKENS;
});

describe('Nebius experimental research client', () => {
  it('summarizes supplied observations and records model/usage/latency', async () => {
    process.env.NEBIUS_API_KEY = 'test-only-key';
    process.env.NEBIUS_MODEL = 'test/model';
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: 'Experimental summary.', }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 50, completion_tokens: 8, total_tokens: 58 },
    }), { status: 200 }));

    const result = await summarizeHydrologyData({ observations });
    expect(result.experimental).toBe(true);
    expect(result.model).toBe('test/model');
    expect(result.summary).toBe('Experimental summary.');
    expect(result.usage?.total_tokens).toBe(58);
    expect(result.truncated).toBe(false);
    expect(result.observations).toEqual(observations);
    const requestBody = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(requestBody.messages[1].content).not.toContain('test-only-key');
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/chat/completions'), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-only-key' }),
    }));
  });

  it('reports missing configuration without making a request', async () => {
    delete process.env.NEBIUS_API_KEY;
    const fetchMock = jest.spyOn(global, 'fetch');
    await expect(summarizeHydrologyData({ observations })).rejects.toBeInstanceOf(NebiusConfigurationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('handles auth, rate-limit, empty, and truncated responses', async () => {
    process.env.NEBIUS_API_KEY = 'test-only-key';
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(new Response('{}', { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: 'Partial' }, finish_reason: 'length' }] }), { status: 200 }));

    await expect(summarizeHydrologyData({ observations })).rejects.toMatchObject({ status: 401 });
    await expect(summarizeHydrologyData({ observations })).rejects.toMatchObject({ status: 429 });
    await expect(summarizeHydrologyData({ observations })).rejects.toBeInstanceOf(NebiusRequestError);
    await expect(summarizeHydrologyData({ observations })).resolves.toMatchObject({ truncated: true, summary: 'Partial' });
  });

  it('checks selected model availability through a minimal chat probe', async () => {
    process.env.NEBIUS_API_KEY = 'test-only-key';
    process.env.NEBIUS_MODEL = 'test/model';
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ choices: [{ finish_reason: 'length' }], usage: { total_tokens: 2 } }), { status: 200 }));

    await expect(verifyNebiusModel()).resolves.toMatchObject({ available: true, model: 'test/model', probe: 'chat_completion' });
  });

  it('aborts a hanging request after 20 seconds with no retry', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    const expectation = expect(summarizeHydrologyData({ observations })).rejects.toMatchObject({ code: 'NEBIUS_TIMEOUT' });
    await jest.advanceTimersByTimeAsync(20_000);
    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('sanitizes network errors and makes only one attempt', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('socket failure with sensitive internal context'));
    await expect(summarizeHydrologyData({ observations })).rejects.toMatchObject({
      code: 'NEBIUS_NETWORK_ERROR', message: 'Nebius network request failed; it was not retried',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403, 429, 500])('handles non-JSON HTTP %i errors without parsing their bodies', async status => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('sensitive upstream HTML', { status }));
    await expect(summarizeHydrologyData({ observations })).rejects.toMatchObject({ status });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('preserves usage when reasoning consumes the entire token budget', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: null, reasoning_content: 'not public' }, finish_reason: 'length' }],
      usage: { total_tokens: 900, internal_context: 'not public' },
    })));
    await expect(summarizeHydrologyData({ observations })).rejects.toMatchObject({
      code: 'NEBIUS_TRUNCATED_RESPONSE', metadata: { usage: { total_tokens: 900 }, finish_reason: 'length' },
    });
  });

  it('rejects invalid JSON responses', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('not-json'));
    await expect(summarizeHydrologyData({ observations })).rejects.toMatchObject({ code: 'NEBIUS_INVALID_RESPONSE' });
  });

  it('rejects unknown request fields before constructing a prompt', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    await expect(summarizeHydrologyData({ observations, api_key: 'must-not-be-forwarded' } as any))
      .rejects.toMatchObject({ code: 'INVALID_RESEARCH_INPUT' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
