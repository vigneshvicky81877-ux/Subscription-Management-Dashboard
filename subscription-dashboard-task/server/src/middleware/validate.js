/**
 * Validates and replaces req.body / req.params / req.query with the parsed
 * (trimmed, coerced) Zod output. ZodErrors are formatted by the error handler.
 */
export const validate =
  (schemas) =>
  (req, _res, next) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
      // req.query is a getter in Express 5 and read-only in some setups, so
      // validated query values live on req.validatedQuery.
      if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
      next();
    } catch (err) {
      next(err);
    }
  };
