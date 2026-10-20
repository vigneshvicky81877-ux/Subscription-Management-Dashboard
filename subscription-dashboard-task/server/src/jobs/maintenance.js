import { purgeExpiredRefreshTokens } from '../services/auth.service.js';
import { expireStaleSubscriptions } from '../services/subscription.service.js';

const INTERVAL_MS = 15 * 60 * 1000;

async function runOnce() {
  try {
    const expired = await expireStaleSubscriptions();
    const purged = await purgeExpiredRefreshTokens();
    if (expired || purged) {
      console.log(`[maintenance] expired ${expired} subscription(s), purged ${purged} refresh token(s)`);
    }
  } catch (err) {
    console.error('[maintenance] failed:', err.message);
  }
}

export function startMaintenanceJob() {
  runOnce();
  const timer = setInterval(runOnce, INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}
