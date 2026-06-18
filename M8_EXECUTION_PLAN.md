# M8 Execution Plan: Checkout & Order Pipeline

This document defines the execution strategy for Milestone 8 (M8), broken down into 5 independent, deployable, and reversible sub-milestones. 

Each milestone adheres strictly to ShopSmart's constraints: **TypeScript only, Prisma only, Vitest only, Zod validation, catchAsync, AppError, Winston logging, and PBAC authorization**.

---

## M8A: Database (Schema & Models)

### 1. Scope
Introduce all necessary database tables (`Coupon`, `Payment`, `ProcessedWebhook`, `OrderAuditLog`) and update the existing `Order` model with JSONB address snapshot fields. This establishes the persistent foundation for the entire checkout pipeline.
### 2. Files created
* `server/prisma/migrations/<timestamp>_checkout_pipeline_init/migration.sql`
### 3. Files modified
* `server/prisma/schema.prisma`
### 4. APIs
* *None*
### 5. Tests
* Migration safety test (Verify DB push and rollback logic).
### 6. Risks
* Destructive changes to existing models. (Mitigation: Additive schema changes only; JSONB columns are optional or defaulted).
### 7. Rollback strategy
* Run `npx prisma migrate resolve --rolled-back <migration_name>` and restore from the most recent Postgres `.sql` backup.
### 8. Review checkpoints
* Review the generated SQL migration file to ensure no `DROP TABLE` or `DROP COLUMN` commands affect existing M7 data.
### 9. Estimated LOC
* ~150 lines (Prisma schema additions + generated SQL).
### 10. Production readiness score
* **9.5 / 10**

---

## M8B: Payment (Provider Abstraction)

### 1. Scope
Build the `PaymentGateway` abstraction engine and the specific `RazorpayGateway` adapter. This milestone only implements the service layer (no HTTP endpoints) to ensure the financial integration is completely decoupled from web traffic.
### 2. Files created
* `server/src/modules/payment/payment.interface.ts`
* `server/src/modules/payment/payment.service.ts`
* `server/src/modules/payment/razorpay.gateway.ts`
* `server/src/modules/payment/stripe.gateway.ts` (Stub)
### 3. Files modified
* *None* (Purely additive service files)
### 4. APIs
* *None*
### 5. Tests
* `server/tests/payment.service.test.ts` (Unit testing provider resolution).
* `server/tests/razorpay.gateway.test.ts` (Mocking the Razorpay SDK to ensure `createOrderSession` and signature verification logic mathematically hold).
### 6. Risks
* Cryptographic signature mismatches or precision errors during `Decimal` conversions.
### 7. Rollback strategy
* Safely revert the git commits adding the payment module directory. No existing routes are affected.
### 8. Review checkpoints
* Code review on the `PaymentGateway` TypeScript interface to ensure it accommodates both PaymentIntent (Stripe) and Orders (Razorpay) paradigms.
### 9. Estimated LOC
* ~250 lines.
### 10. Production readiness score
* **9.5 / 10**

---

## M8C: Checkout (Initialization & Order Placement)

### 1. Scope
Implement the core checkout logic: pricing calculations (math), idempotency middleware, Redis stock reservations (fast-path), and pessimistic database locking (final-path).
### 2. Files created
* `server/src/modules/checkout/checkout.types.ts`
* `server/src/modules/checkout/checkout.validator.ts`
* `server/src/modules/checkout/checkout.service.ts`
* `server/src/modules/checkout/checkout.controller.ts`
* `server/src/modules/checkout/checkout.routes.ts`
* `server/src/routes/checkoutRoutes.ts`
* `server/src/middlewares/idempotency.middleware.ts`
### 3. Files modified
* `server/src/server.ts` (Mount `/api/checkout` router)
* `server/src/types/auth.ts` (Add `checkout:read`, `checkout:write` permissions)
### 4. APIs
* `POST /api/checkout/initialize` (PBAC: `checkout:write`)
* `POST /api/checkout/place-order` (PBAC: `checkout:write` | Required Header: `Idempotency-Key`)
### 5. Tests
* `server/tests/checkout.validator.test.ts` (100% Zod coverage).
* `server/tests/checkout.service.test.ts` (Pure math tests for discount and tax calculations).
* `server/tests/checkout.integration.test.ts` (Test DB `FOR UPDATE` transaction blocks and idempotency intercepts).
### 6. Risks
* Deadlocks during high-concurrency checkouts (flash sales) due to Postgres lock wait timeouts.
### 7. Rollback strategy
* Detach `checkoutRoutes` from `server.ts` to instantly kill traffic to the new endpoints without reverting the entire codebase.
### 8. Review checkpoints
* Review the Prisma `$transaction` scope to ensure lock ordering (sort product IDs before `SELECT ... FOR UPDATE` to avoid deadlocks).
### 9. Estimated LOC
* ~600 lines.
### 10. Production readiness score
* **9.0 / 10**

---

## M8D: Verification/Webhooks (Async Processing)

### 1. Scope
Deploy the client-facing `/verify-payment` handshake, setup asynchronous webhooks (the ultimate source of truth), and deploy BullMQ workers for event ingestion and stalled-order reconciliation.
### 2. Files created
* `server/src/modules/webhook/webhook.controller.ts`
* `server/src/modules/webhook/webhook.routes.ts`
* `server/src/jobs/queue.ts` (BullMQ connection setup)
* `server/src/jobs/workers/webhook.worker.ts`
* `server/src/jobs/workers/reconciliation.worker.ts`
### 3. Files modified
* `server/src/modules/checkout/checkout.service.ts` (Add `verifyPayment` business logic)
* `server/src/modules/checkout/checkout.controller.ts`
* `server/src/modules/checkout/checkout.routes.ts`
* `server/src/server.ts` (Mount `/api/webhooks` router and bootstrap BullMQ workers)
### 4. APIs
* `POST /api/checkout/verify-payment` (PBAC: `checkout:write`)
* `POST /api/webhooks/razorpay` (Public | HMAC Signature Verified)
### 5. Tests
* `server/tests/webhook.integration.test.ts` (Test raw payload parsing and `X-Razorpay-Signature` spoof-rejection).
* `server/tests/queue.test.ts` (Mock BullMQ to ensure retry logic is registered).
### 6. Risks
* Race conditions: the frontend `/verify-payment` call and the background webhook firing in the exact same millisecond. (Mitigated by atomic `status = 'PENDING'` DB updates).
### 7. Rollback strategy
* Unmount `/api/webhooks` and comment out BullMQ worker bootstrapping in `server.ts`. Does not impact the core checkout path.
### 8. Review checkpoints
* Ensure webhook express router utilizes `express.raw({ type: 'application/json' })` so that the HMAC signature validation buffer is preserved.
### 9. Estimated LOC
* ~400 lines.
### 10. Production readiness score
* **9.0 / 10**

---

## M8E: Frontend (UI & Razorpay SDK Integration)

### 1. Scope
Construct the React UI for the checkout flow, integrate global state (Zustand) for multi-step persistence, execute API requests, and spawn the Razorpay standard checkout modal.
### 2. Files created
* `client/src/schemas/checkoutSchema.ts`
* `client/src/services/checkoutService.ts`
* `client/src/stores/checkoutStore.ts`
* `client/src/pages/CheckoutPage.tsx`
* `client/src/components/checkout/PaymentModal.tsx`
### 3. Files modified
* `client/src/App.tsx` (Register `/checkout` route)
* `client/index.html` (Inject `<script src="https://checkout.razorpay.com/v1/checkout.js"></script>`)
* `client/src/pages/CartPage.tsx` (Wire up the "Proceed to Checkout" button)
### 4. APIs
* Consumes M8C and M8D APIs.
### 5. Tests
* `client/tests/CheckoutPage.test.tsx` (Mock API responses and ensure UI properly handles 400 Out of Stock / Invalid Coupon errors).
### 6. Risks
* Users closing the Razorpay modal mid-transaction without firing success/failure callbacks (handled by M8D BullMQ reconciliation worker).
### 7. Rollback strategy
* Revert the "Proceed to Checkout" button linkage in `CartPage.tsx` and disable the `/checkout` route in React Router. Instantly drops frontend traffic to the pipeline.
### 8. Review checkpoints
* Verify frontend Zod validation strictly mirrors backend rules to prevent unnecessary network roundtrips.
* Verify the idempotency key generation (`uuidv4()`) persists correctly across component re-renders.
### 9. Estimated LOC
* ~500 lines.
### 10. Production readiness score
* **8.5 / 10** (Frontend modal integrations depend heavily on external network stability).