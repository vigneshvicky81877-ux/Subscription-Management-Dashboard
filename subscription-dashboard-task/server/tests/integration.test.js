// End-to-end API tests against a real PostgreSQL database.
// They run against DATABASE_URL (migrated + seeded) and are skipped
// automatically when the database is unreachable.
import './helpers/env.js';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

let dbAvailable = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  const plans = await prisma.plan.count();
  dbAvailable = plans > 0;
  if (!dbAvailable) console.warn('Integration tests skipped: no plans found (run the seed first)');
} catch (err) {
  console.warn(`Integration tests skipped: database unavailable (${err.message.trim().split('\n').pop()})`);
}

const app = createApp();
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const userEmail = `it-user-${suffix}@test.local`;
const adminEmail = `it-admin-${suffix}@test.local`;
const password = 'Passw0rd!';

function cookieFrom(res) {
  const raw = res.headers['set-cookie'] ?? [];
  return raw.find((c) => c.startsWith('refreshToken='))?.split(';')[0];
}

describe('API integration', { skip: !dbAvailable }, () => {
  let plans;
  let userToken;
  let userCookie;
  let adminToken;

  before(async () => {
    await prisma.user.create({
      data: {
        name: 'IT Admin',
        email: adminEmail,
        password: await bcrypt.hash(password, 4),
        role: 'ADMIN',
      },
    });
  });

  after(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [userEmail, adminEmail] } } });
    await prisma.$disconnect();
  });

  it('lists seeded plans with decimal prices as strings', async () => {
    const res = await request(app).get('/api/plans');
    assert.equal(res.status, 200);
    plans = res.body.data.plans;
    assert.ok(plans.length >= 3);
    for (const p of plans) {
      assert.match(p.price, /^\d+\.\d{2}$/);
      assert.ok(Array.isArray(p.features));
      assert.ok(p.durationDays > 0);
    }
  });

  it('registers a user, sets an HTTP-only refresh cookie and never returns the password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'IT User', email: userEmail, password });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, 'USER');
    assert.equal(res.body.data.user.password, undefined);
    assert.ok(res.body.data.accessToken);
    const setCookie = res.headers['set-cookie'].join(';');
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /Path=\/api\/auth/);
  });

  it('rejects duplicate registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'IT User', email: userEmail.toUpperCase(), password });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'EMAIL_TAKEN');
  });

  it('rejects bad credentials and logs in with good ones', async () => {
    const bad = await request(app).post('/api/auth/login').send({ email: userEmail, password: 'wrong123' });
    assert.equal(bad.status, 401);
    assert.equal(bad.body.error.code, 'INVALID_CREDENTIALS');

    const res = await request(app).post('/api/auth/login').send({ email: userEmail, password });
    assert.equal(res.status, 200);
    userToken = res.body.data.accessToken;
    userCookie = cookieFrom(res);
    assert.ok(userCookie);

    const admin = await request(app).post('/api/auth/login').send({ email: adminEmail, password });
    adminToken = admin.body.data.accessToken;
  });

  it('returns the current user', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${userToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.email, userEmail);
  });

  it('rotates refresh tokens and detects reuse', async () => {
    const first = await request(app).post('/api/auth/refresh').set('Cookie', userCookie);
    assert.equal(first.status, 200);
    const rotated = cookieFrom(first);
    assert.ok(rotated && rotated !== userCookie);

    // Make the old token look like it was rotated long ago (outside the grace window).
    await prisma.refreshToken.updateMany({
      where: { user: { email: userEmail }, revokedAt: { not: null } },
      data: { revokedAt: new Date(Date.now() - 60_000) },
    });
    const replay = await request(app).post('/api/auth/refresh').set('Cookie', userCookie);
    assert.equal(replay.status, 401);

    // Reuse revokes every session, including the rotated one.
    const afterReuse = await request(app).post('/api/auth/refresh').set('Cookie', rotated);
    assert.equal(afterReuse.status, 401);

    const login = await request(app).post('/api/auth/login').send({ email: userEmail, password });
    userToken = login.body.data.accessToken;
    userCookie = cookieFrom(login);
  });

  it('reports NONE before the user subscribes', async () => {
    const res = await request(app).get('/api/my-subscription').set('Authorization', `Bearer ${userToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'NONE');
    assert.equal(res.body.data.subscription, null);
  });

  it('validates the planId and returns 404 for unknown plans', async () => {
    const invalid = await request(app).post('/api/subscribe/abc').set('Authorization', `Bearer ${userToken}`);
    assert.equal(invalid.status, 400);
    const missing = await request(app)
      .post('/api/subscribe/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${userToken}`);
    assert.equal(missing.status, 404);
  });

  it('subscribes and calculates the end date from the plan duration', async () => {
    const plan = plans.find((p) => p.name === 'Basic') ?? plans[0];
    const res = await request(app).post(`/api/subscribe/${plan.id}`).set('Authorization', `Bearer ${userToken}`);
    assert.equal(res.status, 201);
    const sub = res.body.data.subscription;
    assert.equal(sub.status, 'ACTIVE');
    assert.equal(sub.plan.id, plan.id);
    const days = (new Date(sub.endDate) - new Date(sub.startDate)) / 86_400_000;
    assert.equal(days, plan.durationDays);
  });

  it('prevents duplicate active subscriptions, including concurrent requests', async () => {
    const plan = plans.find((p) => p.name === 'Pro') ?? plans[1];
    const results = await Promise.all(
      [1, 2, 3].map(() =>
        request(app).post(`/api/subscribe/${plan.id}`).set('Authorization', `Bearer ${userToken}`),
      ),
    );
    for (const r of results) {
      assert.equal(r.status, 409);
      assert.equal(r.body.error.code, 'ACTIVE_SUBSCRIPTION_EXISTS');
    }
    const active = await prisma.subscription.count({ where: { user: { email: userEmail }, status: 'ACTIVE' } });
    assert.equal(active, 1);
  });

  it('returns the active subscription', async () => {
    const res = await request(app).get('/api/my-subscription').set('Authorization', `Bearer ${userToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'ACTIVE');
    assert.ok(res.body.data.subscription.daysRemaining > 0);
  });

  it('upgrades the plan in a transaction', async () => {
    const pro = plans.find((p) => p.name === 'Pro') ?? plans[plans.length - 1];
    const res = await request(app)
      .patch('/api/my-subscription')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ planId: pro.id });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.changeType, 'UPGRADE');
    const history = await request(app)
      .get('/api/my-subscription/history')
      .set('Authorization', `Bearer ${userToken}`);
    const statuses = history.body.data.subscriptions.map((s) => s.status).sort();
    assert.deepEqual(statuses, ['ACTIVE', 'CANCELLED']);
  });

  it('marks subscriptions past their end date as EXPIRED', async () => {
    const active = await prisma.subscription.findFirst({ where: { user: { email: userEmail }, status: 'ACTIVE' } });
    await prisma.subscription.update({
      where: { id: active.id },
      data: { startDate: new Date(Date.now() - 40 * 86_400_000), endDate: new Date(Date.now() - 1000) },
    });
    const res = await request(app).get('/api/my-subscription').set('Authorization', `Bearer ${userToken}`);
    assert.equal(res.body.data.status, 'EXPIRED');
    assert.equal(res.body.data.subscription.daysRemaining, 0);

    // After expiry the user may subscribe again.
    const again = await request(app).post(`/api/subscribe/${plans[0].id}`).set('Authorization', `Bearer ${userToken}`);
    assert.equal(again.status, 201);
  });

  it('forbids regular users from admin endpoints', async () => {
    for (const path of ['/api/admin/subscriptions', '/api/admin/stats']) {
      const res = await request(app).get(path).set('Authorization', `Bearer ${userToken}`);
      assert.equal(res.status, 403, path);
      assert.equal(res.body.error.code, 'FORBIDDEN');
    }
  });

  it('lets admins list, filter and paginate all subscriptions without leaking passwords', async () => {
    const res = await request(app)
      .get('/api/admin/subscriptions')
      .query({ search: userEmail, limit: 2 })
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 3);
    assert.equal(res.body.data.subscriptions.length, 2);
    assert.equal(res.body.meta.totalPages, 2);
    for (const s of res.body.data.subscriptions) {
      assert.equal(s.user.email, userEmail);
      assert.equal(s.user.password, undefined);
    }

    const expired = await request(app)
      .get('/api/admin/subscriptions')
      .query({ search: userEmail, status: 'EXPIRED' })
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(expired.body.meta.total, 1);

    const stats = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${adminToken}`);
    assert.equal(stats.status, 200);
    assert.ok(stats.body.data.stats.byStatus.ACTIVE >= 1);
  });

  it('updates the profile name', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Renamed User' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.name, 'Renamed User');
  });

  it('logs out and revokes the refresh token', async () => {
    const res = await request(app).post('/api/auth/logout').set('Cookie', userCookie);
    assert.equal(res.status, 200);
    const refresh = await request(app).post('/api/auth/refresh').set('Cookie', userCookie);
    assert.equal(refresh.status, 401);
  });
});
