import './helpers/env.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { createApp } from '../src/app.js';
import { calculateEndDate } from '../src/services/subscription.service.js';
import { toSubscriptionDto } from '../src/utils/serializers.js';
import { loginSchema, registerSchema } from '../src/validators/auth.validators.js';
import { adminListQuerySchema, planIdParamsSchema } from '../src/validators/subscription.validators.js';

const app = createApp();

describe('subscription date logic', () => {
  it('adds the plan duration in days to the start date', () => {
    const start = new Date('2026-01-01T10:00:00.000Z');
    assert.equal(calculateEndDate(start, 30).toISOString(), '2026-01-31T10:00:00.000Z');
    assert.equal(calculateEndDate(start, 365).toISOString(), '2027-01-01T10:00:00.000Z');
  });

  it('reports days remaining only for active subscriptions', () => {
    const now = new Date('2026-01-10T00:00:00.000Z');
    const base = {
      id: 'x',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-01-31T00:00:00.000Z'),
      amount: new Prisma.Decimal('499'),
      cancelledAt: null,
      createdAt: now,
    };
    assert.equal(toSubscriptionDto({ ...base, status: 'ACTIVE' }, now).daysRemaining, 21);
    assert.equal(toSubscriptionDto({ ...base, status: 'EXPIRED' }, now).daysRemaining, 0);
    assert.equal(toSubscriptionDto({ ...base, status: 'ACTIVE' }, now).amount, '499.00');
  });
});

describe('validators', () => {
  it('normalises register input', () => {
    const data = registerSchema.parse({ name: '  Jane  ', email: ' JANE@Example.com ', password: 'secret123' });
    assert.deepEqual(data, { name: 'Jane', email: 'jane@example.com', password: 'secret123' });
  });

  it('rejects weak passwords and unknown fields', () => {
    assert.equal(registerSchema.safeParse({ name: 'Jo', email: 'a@b.co', password: 'short' }).success, false);
    assert.equal(registerSchema.safeParse({ name: 'Jo', email: 'a@b.co', password: 'longpassword' }).success, false);
    assert.equal(
      registerSchema.safeParse({ name: 'Jo', email: 'a@b.co', password: 'secret123', role: 'ADMIN' }).success,
      false,
      'clients must not be able to self-assign a role',
    );
  });

  it('requires valid login fields', () => {
    assert.equal(loginSchema.safeParse({ email: 'nope', password: 'x' }).success, false);
    assert.equal(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success, false);
  });

  it('validates plan ids and admin query params', () => {
    assert.equal(planIdParamsSchema.safeParse({ planId: '123' }).success, false);
    const q = adminListQuerySchema.parse({ page: '2', limit: '5' });
    assert.equal(q.page, 2);
    assert.equal(q.limit, 5);
    assert.equal(adminListQuerySchema.safeParse({ limit: '1000' }).success, false);
    assert.equal(adminListQuerySchema.safeParse({ status: 'BOGUS' }).success, false);
  });
});

describe('HTTP layer (no database required)', () => {
  it('serves a health check', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it('returns structured 404s for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('rejects protected routes without a token', async () => {
    for (const path of ['/api/my-subscription', '/api/admin/subscriptions', '/api/auth/me']) {
      const res = await request(app).get(path);
      assert.equal(res.status, 401, path);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    }
  });

  it('rejects invalid and expired access tokens', async () => {
    const bad = await request(app).get('/api/my-subscription').set('Authorization', 'Bearer not-a-jwt');
    assert.equal(bad.status, 401);
    assert.equal(bad.body.error.code, 'INVALID_TOKEN');

    const expired = jwt.sign(
      { role: 'USER', type: 'access', exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_ACCESS_SECRET,
      { subject: '00000000-0000-0000-0000-000000000000', issuer: 'subscription-dashboard' },
    );
    const res = await request(app).get('/api/my-subscription').set('Authorization', `Bearer ${expired}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'TOKEN_EXPIRED');
  });

  it('rejects a refresh token used as an access token', async () => {
    const refreshLike = jwt.sign({ type: 'refresh' }, process.env.JWT_ACCESS_SECRET, {
      subject: '00000000-0000-0000-0000-000000000000',
      issuer: 'subscription-dashboard',
      expiresIn: '5m',
    });
    const res = await request(app).get('/api/my-subscription').set('Authorization', `Bearer ${refreshLike}`);
    assert.equal(res.status, 401);
  });

  it('returns validation errors with field details', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'bad' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field);
    assert.ok(fields.includes('email'));
    assert.ok(fields.includes('password'));
    assert.ok(fields.includes('name'));
  });

  it('handles malformed JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    assert.equal(res.status, 400);
    assert.equal(res.body.error.message, 'Malformed JSON body');
  });

  it('returns 401 for refresh without a cookie', async () => {
    const res = await request(app).post('/api/auth/refresh');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'REFRESH_TOKEN_MISSING');
  });

  it('sets security headers', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-powered-by'], undefined);
  });
});
