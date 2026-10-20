// DTO mappers: control exactly which fields leave the API (never passwords).
// Decimal values are serialised as strings to avoid floating point loss.

export function toUserDto(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function toPlanDto(plan) {
  if (!plan) return null;
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: plan.price.toFixed(2),
    currency: plan.currency,
    features: plan.features,
    durationDays: plan.durationDays,
    isPopular: plan.isPopular,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function toSubscriptionDto(sub, now = new Date()) {
  if (!sub) return null;
  const msLeft = sub.endDate.getTime() - now.getTime();
  return {
    id: sub.id,
    status: sub.status,
    startDate: sub.startDate,
    endDate: sub.endDate,
    amount: sub.amount.toFixed(2),
    cancelledAt: sub.cancelledAt,
    createdAt: sub.createdAt,
    daysRemaining: sub.status === 'ACTIVE' ? Math.max(0, Math.ceil(msLeft / DAY_MS)) : 0,
    plan: sub.plan ? toPlanDto(sub.plan) : undefined,
    user: sub.user ? toUserDto(sub.user) : undefined,
  };
}
