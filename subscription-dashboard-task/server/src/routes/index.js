import { Router } from 'express';
import * as plans from '../controllers/plan.controller.js';
import * as subs from '../controllers/subscription.controller.js';
import * as users from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/http.js';
import { changePasswordSchema, updateProfileSchema } from '../validators/auth.validators.js';
import {
  adminListQuerySchema,
  changePlanSchema,
  planIdParamsSchema,
} from '../validators/subscription.validators.js';
import authRoutes from './auth.routes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

router.use('/auth', authRoutes);

// Plans (public)
router.get('/plans', asyncHandler(plans.listPlans));
router.get('/plans/:planId', validate({ params: planIdParamsSchema }), asyncHandler(plans.getPlan));

// Current user's subscription
router.post(
  '/subscribe/:planId',
  authenticate,
  validate({ params: planIdParamsSchema }),
  asyncHandler(subs.subscribe),
);
router.get('/my-subscription', authenticate, asyncHandler(subs.getMySubscription));
router.get('/my-subscription/history', authenticate, asyncHandler(subs.getMyHistory));
router.patch(
  '/my-subscription',
  authenticate,
  validate({ body: changePlanSchema }),
  asyncHandler(subs.changePlan),
);
router.delete('/my-subscription', authenticate, asyncHandler(subs.cancelMySubscription));

// Profile
router.patch(
  '/users/me',
  authenticate,
  validate({ body: updateProfileSchema }),
  asyncHandler(users.updateProfile),
);
router.patch(
  '/users/me/password',
  authenticate,
  validate({ body: changePasswordSchema }),
  asyncHandler(users.changePassword),
);

// Admin
const admin = Router();
admin.use(authenticate, authorize('ADMIN'));
admin.get(
  '/subscriptions',
  validate({ query: adminListQuerySchema }),
  asyncHandler(subs.listAllSubscriptions),
);
admin.get('/stats', asyncHandler(subs.getStats));
router.use('/admin', admin);

export default router;
