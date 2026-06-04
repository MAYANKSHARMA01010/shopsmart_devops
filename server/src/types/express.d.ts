/**
 * Express module augmentation — extends the Request interface.
 *
 * M2: Placeholder type (Record<string, unknown>) used until the real
 * JwtPayload type is defined in M5 (auth module implementation).
 *
 * M5 migration: Replace `Record<string, unknown>` with:
 *   import('../modules/auth/auth.types').JwtPayload
 */
export {};

declare global {
  namespace Express {
    interface Request {
      /**
       * Set by the `authenticate` middleware (implemented in M5).
       * Typed as a placeholder until JwtPayload is defined in M5.
       */
      user?: Record<string, unknown>;
    }
  }
}
