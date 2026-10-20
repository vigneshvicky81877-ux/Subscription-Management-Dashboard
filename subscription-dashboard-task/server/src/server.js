import { createApp } from './app.js';
import { env } from './config/env.js';
import { startMaintenanceJob } from './jobs/maintenance.js';
import { prisma } from './lib/prisma.js';

async function start() {
  await prisma.$connect();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
  const stopJob = startMaintenanceJob();

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    stopJob();
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch(async (err) => {
  console.error('Failed to start server:', err.message);
  await prisma.$disconnect();
  process.exit(1);
});
