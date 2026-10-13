import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';

// Exercise the upstream regressions against the packages resolved from the lockfile.
const proxyAddress = require('proxy-addr');
const qs = require('qs');

describe('Patched Express dependency regressions', () => {
  it('does not trust every IPv4 client for a short mapped IPv6 proxy subnet', () => {
    const trust = proxyAddress.compile('::ffff:10.0.0.0/8');
    expect(trust('198.51.100.40')).toBe(false);
    expect(trust('127.0.0.1')).toBe(false);
    const correctlyMapped = proxyAddress.compile('::ffff:10.0.0.0/104');
    expect(correctlyMapped('10.2.3.4')).toBe(true);
    expect(correctlyMapped('198.51.100.40')).toBe(false);
  });

  it('does not accept a spoofed forwarded address from an untrusted client', async () => {
    const app = express();
    app.set('trust proxy', '::ffff:10.0.0.0/8');
    app.get('/address', (req, res) => res.json({ address: req.ip }));
    const response = await request(app).get('/address').set('X-Forwarded-For', '198.51.100.40');
    expect(response.status).toBe(200);
    expect(response.body.address).not.toBe('198.51.100.40');
  });

  it('serializes an untrusted constructor.isBuffer field without throwing', () => {
    const parsed = qs.parse('payload[constructor][isBuffer]=untrusted', { plainObjects: true });
    expect(() => qs.stringify(parsed)).not.toThrow();
  });

  it('continues enforcing JSON body size limits', async () => {
    const app = express();
    app.use(express.json({ limit: '1kb' }));
    app.post('/body', (req, res) => res.json({ value: req.body.value }));
    app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
      res.status(error.status ?? 500).json({ type: error.type });
    });
    expect((await request(app).post('/body').send({ value: 'small' })).status).toBe(200);
    const oversized = await request(app).post('/body').send({ value: 'x'.repeat(2048) });
    expect(oversized.status).toBe(413);
    expect(oversized.body.type).toBe('entity.too.large');
  });
});
