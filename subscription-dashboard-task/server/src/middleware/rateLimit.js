import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const handler = (_req, res, _next, options) =>
  res.status(options.statusCode).json({
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message: options.message },
  });

const common = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler,
};

export const apiLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: 'Too many requests, please try again later.',
});

// Stricter limit on credential endpoints to slow down brute-force attempts.
export const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: 'Too many authentication attempts, please try again in 15 minutes.',
});
