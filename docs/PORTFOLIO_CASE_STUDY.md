# Case Study: ShopSmart

**ShopSmart** is a production-grade e-commerce platform designed to solve transactional consistency and payment reliability challenges in a distributed, high-concurrency environment.

## The Problem
Typical e-commerce tutorials demonstrate a basic CRUD approach: a user clicks "checkout", the server checks inventory, and if available, places the order. In a real-world, high-concurrency environment, this approach leads to massive race conditions (overselling). Furthermore, integrating with third-party payment gateways (like Razorpay/Stripe) synchronously introduces single points of failure. If the gateway times out, the user is left in an unknown state, and webhooks might be processed multiple times, leading to duplicate fulfillment.

## The Architecture
To solve these challenges, ShopSmart implements a highly resilient, asynchronous architecture using Next.js, Express, PostgreSQL, Redis, and BullMQ.

![System Architecture](./architecture/system-architecture.md)

## Folder Structure
The project is organized as a monorepo, keeping the Next.js client, Express server, and shared TypeScript types modular and independently scalable.

![Folder Structure](./architecture/folder-structure.md)

## Database Design
The Prisma-managed PostgreSQL database acts as the strict source of truth for transactional consistency. The schema utilizes UUIDs, Decimal types for all monetary values, and strict foreign-key indexes. 

Crucially, the `ProcessedWebhook` table utilizes a unique constraint on the `eventId` to guarantee idempotent webhook processing.

## The Checkout Flow: Eradicating Race Conditions
Initially, the system utilized a Redis Cache-Aside reservation system. While fast, this introduced potential inconsistencies between the cache and PostgreSQL if the server crashed mid-transaction.

**The Solution**: We removed the Redis reservation entirely and implemented a strict transactional boundary using PostgreSQL `SELECT ... FOR UPDATE` row-level locks.
1. The user initializes checkout.
2. The server begins a PostgreSQL transaction.
3. The cart items are **sorted by ID** (to prevent deadlocks).
4. `SELECT ... FOR UPDATE` locks the specific product rows.
5. Stock is verified and deducted.
6. The `PENDING` order is created and the transaction is committed.

![Checkout Flow](./architecture/checkout-flow.md)

## The Webhook Flow: Idempotency and Reliability
Synchronously processing payment gateway webhooks is dangerous. If our server takes too long to process the database updates, the gateway will timeout and retry, potentially fulfilling the order twice.

**The Solution**: 
1. We intercept the webhook using `express.raw()` to verify the cryptographic HMAC signature.
2. We immediately insert the `eventId` into the `ProcessedWebhook` table. If it violates the unique constraint, it's a duplicate and is instantly ignored.
3. If it's new, we push the event payload into a **BullMQ** queue (backed by Redis) and immediately return a `200 OK` to the gateway.
4. A background worker picks up the job, transitions the `OrderStateMachine`, and inserts an `OrderAuditLog`.

![Webhook Flow](./architecture/webhook-flow.md)

## Testing
Reliability requires rigorous testing. The backend is validated using **Vitest**, mocking the external payment providers and validating the service layer integrations. 

The frontend uses **Playwright** for complete End-to-End testing of the critical user journeys (Login -> Browse -> Cart -> Checkout -> Payment -> Success), which run automatically in our GitHub Actions CI pipeline.

## Deployment
ShopSmart is fully containerized using multi-stage, non-root Docker images. 
The recommended production topology distributes the workload to maximize performance and minimize latency:
- **Frontend**: Vercel (Edge-cached Next.js)
- **Backend**: Railway or Fly.io (Dockerized Node.js)
- **Database**: Neon (Serverless Postgres)
- **Cache & Queue**: Upstash (Serverless Redis)

## Lessons Learned
1. **Never trust client state for prices**: Always re-calculate totals securely on the backend before creating an order.
2. **Row locks must be ordered**: When using `SELECT ... FOR UPDATE` on multiple rows, always sort the IDs first. If concurrent transactions lock rows in different orders, it guarantees a deadlock.
3. **Webhooks must be fast**: Offload webhook processing to a background worker to prevent gateway timeouts and ensure the system can absorb sudden spikes in traffic.
4. **State Machines prevent spaghetti**: Utilizing an `OrderStateMachine` instead of scattering `if (order.status === 'CONFIRMED')` checks throughout the codebase drastically reduced bugs and made testing trivial.
