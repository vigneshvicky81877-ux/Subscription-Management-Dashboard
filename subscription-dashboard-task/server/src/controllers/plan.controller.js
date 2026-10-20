import * as planService from '../services/plan.service.js';
import { sendSuccess } from '../utils/http.js';

export async function listPlans(_req, res) {
  const plans = await planService.listPlans();
  return sendSuccess(res, { data: { plans } });
}

export async function getPlan(req, res) {
  const plan = await planService.getPlan(req.params.planId);
  return sendSuccess(res, { data: { plan } });
}
