import { z } from 'zod';

const uuid = (label) => z.string().uuid(`${label} must be a valid UUID`);

export const planIdParamsSchema = z.object({ planId: uuid('planId') });

export const changePlanSchema = z.object({ planId: uuid('planId') }).strict();

export const adminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED']).optional(),
  planId: uuid('planId').optional(),
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(['createdAt', 'startDate', 'endDate']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
