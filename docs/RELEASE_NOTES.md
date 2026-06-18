# v1.0.0 - Production Commerce Platform

ShopSmart has officially graduated from a basic CRUD prototype to a production-grade e-commerce engine!

## 🚀 Features
- **Transactional Checkout**: `SELECT ... FOR UPDATE` database row-level locking to completely eradicate overselling and race conditions.
- **Provider-Agnostic Payments**: A highly abstracted payment interface natively supporting Razorpay, with strict HMAC webhook verification.
- **Asynchronous Webhooks**: Decoupled, idempotent webhook processing using BullMQ and Redis to handle traffic spikes.
- **Order State Machine**: A unified state machine (`PENDING` -> `PAYMENT_PENDING` -> `CONFIRMED` -> `PROCESSING`) enforcing strict transitions and audit logging.
- **PBAC Authorization**: Policy-Based Access Control enforcing rigorous security boundaries across all API endpoints.

## 🏗️ Architecture
- **Next.js 16 (App Router)** Frontend with Zustand and React Query.
- **Express 5 + TypeScript** Backend using Prisma and PostgreSQL 15.
- **Dockerized Infrastructure** for deterministic, multi-stage deployments.
- **GitHub Actions CI** running automated Vitest and Playwright E2E suites.

## ⚠️ Breaking Changes
- The previous Redis Cache-Aside inventory reservation system has been entirely deprecated and removed in favor of robust PostgreSQL transaction locking.
- `Order` status transitions must now pass exclusively through the `OrderStateMachine.transition()` method. Manual updates to `status` will fail.
- All webhooks are now processed asynchronously. Clients polling for order status must rely on the background worker completing the job.

## 🛣️ Roadmap
ShopSmart v1.0.0 is officially feature-complete and frozen. Future updates will strictly be confined to:
- Dependency bumps and security patches.
- Enhancements to the OpenAPI Swagger documentation.
- Playwright E2E test coverage expansion.
