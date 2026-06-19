# ShopSmart — Bug Log

This document tracks **real bugs** discovered during manual testing. Theoretical or hypothetical issues are explicitly excluded.

## Bug Priorities
- **P1**: Blocker / Critical functionality broken (e.g., cannot checkout).
- **P2**: Major UI issue / Annoying UX flaw (e.g., UI jumps, broken animations).
- **P3**: Minor polish issue (e.g., inconsistent padding).

---

### Open Bugs
*(None)*

---

### Resolved Bugs

| ID | Priority | Description | Fix | Released |
|----|----------|-------------|-----|----------|
| BUG-001 | P1 | `idempotency.ts` middleware caught Redis connection errors and propagated a `500` response, making the checkout endpoint completely unreachable when Redis was unavailable. | Added upfront `isRedisReady()` guard and changed the catch block to degrade gracefully (pass-through + log warning) instead of calling `next(new AppError(..., 500))`. | v1.0.1 |
| BUG-002 | P3 | `vitest.config.ts` lacked `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`, causing auth service and middleware to use different fallback secrets — all auth integration tests failed against the real database. | Added `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to the vitest env block. | v1.0.1 |
| BUG-003 | P3 | `apps/server/.env.example` was missing JWT secrets documentation, leaving new contributors without guidance on required environment variables. | Added all JWT and payment secret entries with generation instructions to `.env.example`. | v1.0.1 |
