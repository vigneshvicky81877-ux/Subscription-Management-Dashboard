import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

function normalize(err) {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    return new ApiError(
      400,
      'VALIDATION_ERROR',
      'Request validation failed',
      err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    );
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return ApiError.conflict('A record with this value already exists');
    if (err.code === 'P2025') return ApiError.notFound();
    if (err.code === 'P2003') return ApiError.badRequest('Related record does not exist');
  }

  // Malformed JSON body from express.json()
  if (err.type === 'entity.parse.failed') return ApiError.badRequest('Malformed JSON body');
  if (err.type === 'entity.too.large') {
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }

  return null;
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const apiError = normalize(err);

  if (!apiError) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong. Please try again later.',
        ...(env.isProduction ? {} : { stack: err.stack }),
      },
    });
  }

  const body = {
    success: false,
    error: { code: apiError.code, message: apiError.message },
  };
  if (apiError.details) body.error.details = apiError.details;
  return res.status(apiError.statusCode).json(body);
}
