import * as subscriptionService from '../services/subscription.service.js';
import { sendSuccess } from '../utils/http.js';

// All user-scoped handlers use req.user.id (from the verified token) and never
// a client-supplied user id, which prevents insecure direct object references.

export async function subscribe(req, res) {
  const subscription = await subscriptionService.subscribe(req.user.id, req.params.planId);
  return sendSuccess(res, {
    status: 201,
    data: { subscription },
    message: `Subscribed to the ${subscription.plan.name} plan`,
  });
}

export async function getMySubscription(req, res) {
  const result = await subscriptionService.getMySubscription(req.user.id);
  return sendSuccess(res, { data: result });
}

export async function getMyHistory(req, res) {
  const subscriptions = await subscriptionService.getMySubscriptionHistory(req.user.id);
  return sendSuccess(res, { data: { subscriptions } });
}

export async function changePlan(req, res) {
  const result = await subscriptionService.changePlan(req.user.id, req.body.planId);
  const verb = { UPGRADE: 'Upgraded', DOWNGRADE: 'Downgraded', SWITCH: 'Switched' }[result.changeType];
  return sendSuccess(res, {
    data: result,
    message: `${verb} from ${result.previousPlan} to ${result.subscription.plan.name}`,
  });
}

export async function cancelMySubscription(req, res) {
  const subscription = await subscriptionService.cancelMySubscription(req.user.id);
  return sendSuccess(res, { data: { subscription }, message: 'Subscription cancelled' });
}

export async function listAllSubscriptions(req, res) {
  const { items, meta } = await subscriptionService.listAllSubscriptions(req.validatedQuery);
  return sendSuccess(res, { data: { subscriptions: items }, meta });
}

export async function getStats(_req, res) {
  const stats = await subscriptionService.getSubscriptionStats();
  return sendSuccess(res, { data: { stats } });
}
