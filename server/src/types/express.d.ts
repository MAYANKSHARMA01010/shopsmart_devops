import { JwtPayload } from './auth';

export {};

declare module 'express-serve-static-core' {
  interface Request {
    /**
     * Set by the `authenticate` middleware.
     */
    user?: JwtPayload;
  }
}
