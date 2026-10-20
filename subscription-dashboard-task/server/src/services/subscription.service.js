import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { toSubscriptionDto } from '../utils/serializers.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateEndDate(startDate, durationDays) {
  return new Date(startDate.getTime() + durationDays * DAY_MS);
}

/**
 * Marks ACTIVE subscriptions whose end date has passed as EXPIRED.
 * Runs lazily before reads/writes and periodically from a background job,
 * so status is correct even if the job hasn't run yet.
 */
export async function expireStaleSubscriptions({ userId, tx = prisma, now = new Date() } = {}) {
  const { count } = await tx.subscription.updateMany({
    where: { status: 'ACTIVE', endDate: { lte: now }, ...(userId ? { userId } : {}) },
    data: { status: 'EXPIRED' },
  });
  return count;
}

const withPlan = { plan: true };

function isActiveSubscriptionConflict(err) {
  // P2002 from the partial unique index "subscriptions_one_active_per_user".
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

async function findPurchasablePlan(planId, tx = prisma) {
  const plan = await tx.plan.findFirst({ where: { id: planId, isActive: true } });
  if (!plan) throw ApiError.notFound('Plan not found');
  return plan;
}

export async function subscribe(userId, planId) {
  try {
    return await prisma.$transaction(async (tx) => {
      const plan = await findPurchasablePlan(planId, tx);
      await expireStaleSubscriptions({ userId, tx });

      const active = await tx.subscription.findFirst({
        where: { userId, status: 'ACTIVE' },
        include: withPlan,
      });
      if (active) {
        throw ApiError.conflict(
          active.planId === planId
            ? `You are already subscribed to the ${active.plan.name} plan`
            : `You already have an active ${active.plan.name} subscription. Change your plan instead.`,
          'ACTIVE_SUBSCRIPTION_EXISTS',
          { currentPlanId: active.planId, subscriptionId: active.id },
        );
      }

      const startDate = new Date();
      const subscription = await tx.subscription.create({
        data: {
          userId,
          planId: plan.id,
          startDate,
          endDate: calculateEndDate(startDate, plan.durationDays),
          amount: plan.price,
          status: 'ACTIVE',
        },
        include: withPlan,
      });
      return toSubscriptionDto(subscription);
    });
  } catch (err) {
    // Two concurrent requests can both pass the check above; the database
    // index lets exactly one of them commit.
    if (isActiveSubscriptionConflict(err)) {
      throw ApiError.conflict('You already have an active subscription', 'ACTIVE_SUBSCRIPTION_EXISTS');
    }
    throw err;
  }
}

/**
 * Returns the user's subscription state:
 *   ACTIVE    -> current active subscription
 *   EXPIRED / CANCELLED -> most recent past subscription
 *   NONE      -> user has never subscribed
 */
export async function getMySubscription(userId) {
  await expireStaleSubscriptions({ userId });

  const active = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: withPlan,
  });
  if (active) return { status: 'ACTIVE', subscription: toSubscriptionDto(active) };

  const latest = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: [{ endDate: 'desc' }, { createdAt: 'desc' }],
    include: withPlan,
  });
  if (latest) return { status: latest.status, subscription: toSubscriptionDto(latest) };

  return { status: 'NONE', subscription: null };
}

export async function getMySubscriptionHistory(userId) {
  await expireStaleSubscriptions({ userId });
  const items = await prisma.subscription.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: withPlan,
  });
  return items.map((s) => toSubscriptionDto(s));
}

/** Upgrade/downgrade: cancels the active subscription and starts the new plan now. */
export async function changePlan(userId, planId) {
  try {
    return await prisma.$transaction(async (tx) => {
      const plan = await findPurchasablePlan(planId, tx);
      await expireStaleSubscriptions({ userId, tx });

      const active = await tx.subscription.findFirst({
        where: { userId, status: 'ACTIVE' },
        include: withPlan,
      });
      if (!active) {
        throw ApiError.notFound('You have no active subscription to change. Subscribe to a plan first.');
      }
      if (active.planId === planId) {
        throw ApiError.conflict(`You are already on the ${plan.name} plan`, 'SAME_PLAN');
      }

      const now = new Date();
      const { count } = await tx.subscription.updateMany({
        where: { id: active.id, status: 'ACTIVE' },
        data: { status: 'CANCELLED', cancelledAt: now },
      });
      if (count === 0) throw ApiError.conflict('Subscription changed concurrently, please retry');

      const subscription = await tx.subscription.create({
        data: {
          userId,
          planId: plan.id,
          startDate: now,
          endDate: calculateEndDate(now, plan.durationDays),
          amount: plan.price,
          status: 'ACTIVE',
        },
        include: withPlan,
      });

      const changeType = plan.price.greaterThan(active.plan.price)
        ? 'UPGRADE'
        : plan.price.lessThan(active.plan.price)
          ? 'DOWNGRADE'
          : 'SWITCH';

      return { changeType, previousPlan: active.plan.name, subscription: toSubscriptionDto(subscription) };
    });
  } catch (err) {
    if (isActiveSubscriptionConflict(err)) {
      throw ApiError.conflict('Subscription changed concurrently, please retry');
    }
    throw err;
  }
}

export async function cancelMySubscription(userId) {
  await expireStaleSubscriptions({ userId });
  const active = await prisma.subscription.findFirst({ where: { userId, status: 'ACTIVE' } });
  if (!active) throw ApiError.notFound('You have no active subscription');

  const subscription = await prisma.subscription.update({
    where: { id: active.id },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
    include: withPlan,
  });
  return toSubscriptionDto(subscription);
}

export async function listAllSubscriptions({ page, limit, status, planId, search, sortBy, order }) {
  await expireStaleSubscriptions();

  const where = {
    ...(status ? { status } : {}),
    ...(planId ? { planId } : {}),
    ...(search
      ? {
          user: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        }
      : {}),
  };

  const [total, items] = await prisma.$transaction([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        plan: true,
        user: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
      },
    }),
  ]);

  return {
    items: items.map((s) => toSubscriptionDto(s)),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getSubscriptionStats() {
  await expireStaleSubscriptions();

  const [byStatus, activeByPlan, totalUsers, plans] = await prisma.$transaction([
    prisma.subscription.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } }),
    prisma.subscription.groupBy({
      by: ['planId'],
      where: { status: 'ACTIVE' },
      _count: { _all: true },
      _sum: { amount: true },
      orderBy: { planId: 'asc' },
    }),
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.plan.findMany({ select: { id: true, name: true }, orderBy: { sortOrder: 'asc' } }),
  ]);

  const counts = { ACTIVE: 0, EXPIRED: 0, CANCELLED: 0 };
  for (const row of byStatus) counts[row.status] = row._count._all;

  const activeRevenue = activeByPlan.reduce(
    (sum, row) => sum.plus(row._sum.amount ?? 0),
    new Prisma.Decimal(0),
  );

  return {
    totalUsers,
    totalSubscriptions: counts.ACTIVE + counts.EXPIRED + counts.CANCELLED,
    byStatus: counts,
    activeRevenue: activeRevenue.toFixed(2),
    activeByPlan: plans.map((p) => {
      const row = activeByPlan.find((r) => r.planId === p.id);
      return { planId: p.id, planName: p.name, count: row?._count._all ?? 0 };
    }),
  };
}
