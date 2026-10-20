import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { toPlanDto } from '../utils/serializers.js';

export async function listPlans() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
  });
  return plans.map(toPlanDto);
}

export async function getPlan(id) {
  const plan = await prisma.plan.findFirst({ where: { id, isActive: true } });
  if (!plan) throw ApiError.notFound('Plan not found');
  return toPlanDto(plan);
}
