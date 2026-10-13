import express from 'express';
import request from 'supertest';
import researchRouter from '../src/routes/research.routes';

const app = express();
app.use(express.json());
app.use('/api/v1/research', researchRouter);
const originalEnv = { ...process.env };
const input = {
  data_kind: 'historical',
  observations: [{ timestamp: '2024-07-01T04:25:00+05:45', metric: 'river_stage', value: 2.4, unit: 'm', source: 'historical-test', station_number: 289.95 }],
};
let fetchMock: jest.SpyInstance;
beforeEach(() => {
  process.env.NEBIUS_API_KEY = 'test-only-key';
  process.env.NEBIUS_MODEL = 'test/model';
  process.env.NEBIUS_BASE_URL = 'https://api.tokenfactory.nebius.com/v1/';
  delete process.env.NEBIUS_MAX_TOKENS;
  fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('unexpected request'));
});
afterEach(() => { process.env = { ...originalEnv }; jest.restoreAllMocks(); });

it('GET status never calls the provider or discloses the key', async () => {
  const response = await request(app).get('/api/v1/research/nebius/status');
  expect(response.status).toBe(200);
  expect(response.body.data.configured).toBe(true);
  expect(JSON.stringify(response.body)).not.toContain('test-only-key');
  expect(fetchMock).not.toHaveBeenCalled();
});

it('POST probe explicitly checks model acceptance', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ choices: [{ finish_reason: 'length' }] })));
  const response = await request(app).post('/api/v1/research/nebius/probe');
  expect(response.status).toBe(200);
  expect(response.body.data.available).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('returns original measurements alongside the experimental explanation', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({
    choices: [{ message: { content: 'Experimental explanation' }, finish_reason: 'stop' }],
    usage: { total_tokens: 30, internal_context: 'discard' },
  })));
  const response = await request(app).post('/api/v1/research/nebius/hydrology-summary').send(input);
  expect(response.status).toBe(200);
  expect(response.body.data.observations).toEqual(input.observations);
  expect(response.body.data.experimental).toBe(true);
  expect(response.body.data.data_kind).toBe('historical');
  expect(response.body.data.usage).toEqual({ total_tokens: 30 });
  expect(response.body.data).not.toHaveProperty('alert_decision');
});

it('validates timestamp and source before spending tokens', async () => {
  const response = await request(app).post('/api/v1/research/nebius/hydrology-summary')
    .send({ observations: [{ ...input.observations[0], timestamp: 'yesterday', source: '' }] });
  expect(response.status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('reports missing credentials clearly without requesting the provider', async () => {
  delete process.env.NEBIUS_API_KEY;
  const response = await request(app).post('/api/v1/research/nebius/hydrology-summary').send(input);
  expect(response.status).toBe(503);
  expect(response.body.code).toBe('NEBIUS_CONFIGURATION_ERROR');
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each([[401, 502], [429, 429], [500, 503]])('maps provider HTTP %i to backend HTTP %i', async (providerStatus, backendStatus) => {
  fetchMock.mockResolvedValue(new Response('private upstream body', { status: providerStatus }));
  const response = await request(app).post('/api/v1/research/nebius/hydrology-summary').send(input);
  expect(response.status).toBe(backendStatus);
  expect(JSON.stringify(response.body)).not.toContain('private upstream body');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
