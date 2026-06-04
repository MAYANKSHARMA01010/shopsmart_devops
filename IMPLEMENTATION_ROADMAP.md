# ShopSmart — Implementation Roadmap
> **Status:** PLANNING — Awaiting Approval Before Any Code Changes
> **Verified Against:** Actual source code of ShopSmart, OIS, and MESSIA (June 4, 2026)
> **Rule:** All features from OIS/MESSIA re-written in production-quality TypeScript. No JS copy-paste.

---

## Audit Verification Notes

Every finding from the audit report was re-verified against the actual codebase. Corrections and new findings below.

### Confirmed Findings ✅
- **ShopSmart Prisma**: Only 1 model (`Product`). `id` is `Int @id @default(autoincrement())` — NOT UUID. `category` is `String?`. `imageUrl` is `String?`. `price` is `Float`.
- **ShopSmart server.ts**: No `helmet`. No auth. Only `cors`, `express.json`, `express.urlencoded`, rate-limit on `/api/health`.
- **ShopSmart logger.ts**: Plain 8-line `console.log` wrapper. Not Winston/Pino.
- **ShopSmart page.tsx**: Has 6 unreachable import lines after `return <HomePage />;`.
- **ShopSmart productService.ts**: Uses `Number.parseInt(id, 10)` — tied to Int ID. Changing to UUID requires updates throughout.
- **OIS schema**: UUID primary keys (`String @id @default(uuid())`). `price Decimal @db.Decimal(10,2)`. Category is hardcoded 7-value enum.
- **OIS adminUsersController.js L5**: `if (req.user.role !== "ADMIN")` — inside handler body, not middleware.
- **MESSIA schema**: `Int @id @default(autoincrement())` — conflicts with OIS's UUID approach.
- **MESSIA Category**: `parentId Int?` self-relation — well-designed.
- **MESSIA Address**: Has `district` field — India-specific. Will be generalised.

### New Findings (Not in Original Audit)
- **ShopSmart tsconfig.json**: `"paths": { "*": ["node_modules/*", "src/types/*"] }` — `src/types/` is `.gitkeep` only.
- **ShopSmart server/package.json**: Test runner is **Mocha** (not Jest). Client uses **Jest**. Mixed frameworks — must remain separate or unify.
- **ShopSmart next.config.mjs**: `output: 'standalone'` + `/api/:path*` rewrite to backend — Docker-ready.
- **ShopSmart pnpm-workspace.yaml**: Only `['client', 'server']`. No `packages/` layer yet.
- **ShopSmart apiClient.ts**: No auth header injection. Axios request interceptor must be added when auth lands.
- **OIS productService.js**: Has `createdById` FK on Product — ShopSmart/MESSIA don't. Conflict to resolve.
- **MESSIA productMiddleware.js**: `parseInt(categoryId)` — assumes integer IDs. Breaks when we switch to UUIDs.

---

## Identified Conflicts & Resolution Decisions

### C-1: Primary Key Strategy (ID Type)
| Project | ID Type |
|---------|---------|
| ShopSmart | `Int @id @default(autoincrement())` |
| OIS | `String @id @default(uuid())` ✅ |
| MESSIA | `Int @id @default(autoincrement())` |

**Decision → UUID Strings for ALL models.**
Rationale: UUIDs prevent sequential ID enumeration, are required for distributed systems, and are industry standard.
Impact: `Product.id` changes from `number` to `string`. Affects `productService.ts` (parseInt → string), `productSchema.ts`, `ProductCard.tsx`, all tests.

---

### C-2: Product Category Representation
| Project | Approach |
|---------|----------|
| ShopSmart | `category String?` (free text) |
| OIS | `category Category` (7-value Prisma enum) |
| MESSIA | `categoryId → Category model` (relational) ✅ |

**Decision → MESSIA's relational model, converted to UUID.**
Enums require schema migrations for new categories. Free text is unstructured. A dedicated `Category` table with UUID and `parentId` self-relation is the only scalable solution.

---

### C-3: Price Field Type
| Project | Type |
|---------|------|
| ShopSmart | `price Float` |
| OIS | `price Decimal @db.Decimal(10,2)` ✅ |
| MESSIA | `price Float` |

**Decision → `Decimal @db.Decimal(10,2)` throughout.**
`Float` has floating-point precision errors for currency. Non-negotiable for any payment system.

---

### C-4: Stock Field Name
| Project | Field |
|---------|-------|
| ShopSmart | `stock Int @default(0)` ✅ |
| OIS | `stockQuantity Int` |
| MESSIA | `stock Int @default(0)` ✅ |

**Decision → `stock` (ShopSmart/MESSIA convention).**

---

### C-5: Admin Authorization Pattern
| Project | Pattern |
|---------|---------|
| OIS | `if (req.user.role !== "ADMIN")` inside controller body |
| MESSIA | `verifyAdmin` middleware (DB lookup per request) |

**Decision → JWT payload-based middleware factory (new implementation).**

```typescript
// server/src/middlewares/rbac.middleware.ts
export const requireRole = (...roles: Role[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role as Role)) {
      return next(new AppError('Forbidden: Insufficient permissions', 403));
    }
    next();
  };

// Usage:
router.post('/', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), createProduct);
```

No DB lookup (uses JWT payload). Clean middleware chain. Cannot be bypassed by future code changes.

---

### C-6: Auth Token Design
| Project | Access Token | Refresh Token |
|---------|-------------|--------------|
| OIS | JWT 7d | None |
| MESSIA | JWT 7d | None |
| ShopSmart | None | None |

**Decision → 15min access token + 7d refresh token stored in DB (SHA-256 hashed).**
7-day JWTs cannot be revoked. Short-lived access + DB refresh tokens = logout, device management, token rotation.

---

### C-7: Error Response Shape
| Project | Shape |
|---------|-------|
| ShopSmart | `{ status: 'fail', message, errors[] }` ✅ |
| OIS | `{ ERROR: '...' }` (non-standard capitalization) |
| MESSIA | `{ message }` or `{ ERROR }` (inconsistent) |

**Decision → ShopSmart's centralized `AppError` + `errorHandler` pattern throughout.**

---

### C-8: Frontend State Management
| Project | State |
|---------|-------|
| ShopSmart | React hooks only |
| OIS | Context + Reducer |
| MESSIA | Context + Reducer |

**Decision → Zustand for global state (auth, cart) + React hooks for local UI.**
Context + Reducer at scale causes prop drilling and excessive re-renders. Zustand is lightweight and TypeScript-native.

---

### C-9: OIS `createdById` on Product
OIS links every product to its creator user. MESSIA and ShopSmart don't.

**Decision → Track `createdById` as optional audit field only. Not exposed in public API.**

---

### C-10: MESSIA `district` Address Field
MESSIA has India-specific `district` field in Address.

**Decision → Replace with `addressLine2?: String` (international standard).**

---

## Phase 1: Critical Foundation (Weeks 1–4)
**Goal:** Working authenticated e-commerce backend — auth, products, categories, cart, orders.
**Readiness target:** 0% → 45%

---

### TASK-1.1 — Repository Restructure & Shared Types

| Attribute | Detail |
|-----------|--------|
| **What** | Reorganize `server/src/` from flat to module-based. Add shared types package. Remove dead code. |
| **Risk** | 🟡 Medium — Many file moves; all existing imports must be updated |

**Before → After (server/src/):**
```
BEFORE:
  controllers/productController.ts
  services/productService.ts
  routes/productRoutes.ts
  validators/productValidator.ts
  middlewares/errorMiddleware.ts
  utils/{AppError.ts, redis.ts, logger.ts}
  config/{cors.ts, database.ts}
  types/           ← .gitkeep
  interfaces/      ← .gitkeep

AFTER:
  modules/
    products/
      product.controller.ts   (renamed)
      product.service.ts      (renamed)
      product.routes.ts       (renamed)
      product.validator.ts    (renamed)
      product.types.ts        (NEW)
    auth/           (NEW - Task 1.3)
    users/          (NEW)
    categories/     (NEW - Task 1.5)
    cart/           (NEW - Task 1.6)
    orders/         (NEW - Task 1.8)
    admin/          (NEW - Task 1.9)
  middlewares/
    error.middleware.ts    (renamed)
    auth.middleware.ts     (NEW - Task 1.3)
    rbac.middleware.ts     (NEW - Task 1.3)
    rateLimit.middleware.ts (NEW)
  shared/
    AppError.ts            (moved from utils/)
    catchAsync.ts          (NEW)
    logger.ts              (moved from utils/)
    redis.ts               (moved from utils/)
    pagination.ts          (NEW)
  config/
    cors.ts                (unchanged)
    database.ts            (unchanged)
  types/
    express.d.ts           (NEW: req.user augmentation)
  server.ts                (updated route mounts)
```

**New Package:**
```
packages/types/
  src/index.ts         ← shared types: ApiResponse, PaginatedResponse, etc.
  package.json
  tsconfig.json
```

**pnpm-workspace.yaml update:**
```yaml
packages:
  - 'client'
  - 'server'
  - 'packages/*'   ← ADD
```

**Files Affected:**
- All existing `server/src/**` files (import paths updated)
- `client/src/app/page.tsx` — remove lines 2–7 and 11–20 (dead code)
- `pnpm-workspace.yaml` — add `packages/*`
- Root `package.json` — add workspace scripts

**Dependencies:** None new
**API Changes:** None (internal restructure only)
**Frontend Changes:** Remove dead code from `page.tsx`

---

### TASK-1.2 — Database: Full Phase 1 Schema

| Attribute | Detail |
|-----------|--------|
| **What** | Replace single `Product` model with full Phase 1 schema |
| **Risk** | 🔴 High — Schema change on existing table. Migration ordering critical. |

**New Enums:**
```prisma
enum Role         { SUPER_ADMIN ADMIN VENDOR CUSTOMER }
enum OrderStatus  { PENDING CONFIRMED PROCESSING SHIPPED DELIVERED CANCELLED REFUNDED }
enum PaymentStatus { PENDING PAID FAILED REFUNDED PARTIAL }
```

**New/Modified Models:**
| Model | Action | Key Changes |
|-------|--------|-------------|
| `Product` | MODIFY | `id: Int→String(uuid)`, `price: Float→Decimal(10,2)`, `category: String?` removed, `categoryId: String` added, `imageUrl` → `images: String[]`, add `isVisible`, `slug`, `sku?` |
| `User` | NEW | `id(uuid), name, username(unique), email(unique), password, phone?, avatar?, gender?, role(Role), isEmailVerified(false)` |
| `RefreshToken` | NEW | `id(uuid), token(unique), userId, expiresAt, isRevoked, deviceInfo?` |
| `PasswordResetToken` | NEW | `id(uuid), userId, token(unique), expiresAt, usedAt?` |
| `Category` | NEW | `id(uuid), name(unique), slug(unique), description?, image?, parentId?` — self-relation |
| `Cart` | NEW | `id(uuid), userId(unique), updatedAt` |
| `CartItem` | NEW | `id(uuid), cartId, productId, quantity, @@unique([cartId,productId])` |
| `Address` | NEW | `id(uuid), userId, name, email, phone, line1, line2?, city, state, country, postalCode, isDefault` |
| `Order` | NEW | `id(uuid), userId, addressId, status(OrderStatus), subtotal, discountAmount(0), taxAmount(0), shippingAmount(0), totalAmount — all Decimal(10,2)` |
| `OrderItem` | NEW | `id(uuid), orderId, productId, name(snapshot), quantity, priceAtPurchase(Decimal), @@unique([orderId,productId])` |

**Migration Sequence (MUST follow this order):**
1. Migration: Create `Category` table
2. Seed: Insert "Uncategorized" category (UUID hardcoded in seed for repeatability)
3. Migration: Create `User` table
4. Migration: Add `categoryId String` to `Product` with default "uncategorized-uuid", set FK to `Category`
5. Migration: Change `Product.id` from `Int` to `String @id @default(uuid())`
6. Migration: Change `Product.price` from `Float` to `Decimal @db.Decimal(10,2)`
7. Migration: Add `images String[]`, `isVisible Boolean @default(true)`, `slug String?` to Product; DROP `category String?`, DROP `imageUrl String?`
8. Migration: Add `RefreshToken`, `PasswordResetToken`, `Cart`, `CartItem`, `Address`, `Order`, `OrderItem`

> **⚠️ Data preservation:** Steps 4–7 must set existing products' `categoryId` to the seeded "Uncategorized" UUID. Add this to the migration SQL.

**New Files:**
- `server/prisma/schema.prisma` — full rewrite
- `server/prisma/seed.ts` — seeds roles, default categories, admin user
- `server/prisma/migrations/` — one migration per step above

**API Response Changes:**
- `id`: `number` → `string`
- `price`: `number` → `string` (Decimal serializes as string in JSON)
- `category`: `string` → `{ id: string, name: string, slug: string }`
- `imageUrl`: `string` → `images: string[]`

**Frontend Changes:**
- `client/src/schemas/productSchema.ts` — update field types
- `client/src/components/ProductCard.tsx` — update for `id: string`, `images[0]`
- `client/src/services/productService.ts` — update response types

---

### TASK-1.3 — Auth System (Register, Login, Refresh, Logout, Me, Profile)

| Attribute | Detail |
|-----------|--------|
| **What** | Complete JWT auth with short-lived access tokens + DB-stored refresh tokens |
| **Risk** | 🔴 High — Foundation for all protected features |
| **Source** | Re-written in TypeScript; logic informed by OIS + MESSIA (not copy-pasted) |

**New Server Files:**
```
server/src/modules/auth/
  auth.controller.ts
  auth.service.ts
  auth.routes.ts
  auth.validator.ts
  auth.types.ts

server/src/middlewares/
  auth.middleware.ts    ← authenticate(req, res, next)
  rbac.middleware.ts    ← requireRole(...roles)

server/src/types/
  express.d.ts          ← augments Request with req.user
```

**New API Endpoints:**
```
POST /api/auth/register    (rate: 5/15min)
POST /api/auth/login       (rate: 10/15min)
POST /api/auth/logout      (requires authenticate)
POST /api/auth/refresh     (validates refresh token)
GET  /api/auth/me          (requires authenticate)
PUT  /api/auth/profile     (requires authenticate)
```

**Auth Flow Design:**
```
Register:
  validate(body) → check email/username unique → hash(password, cost=12)
  → create User → create Cart (empty) → create access+refresh tokens
  → store hashed refresh token in DB → return { user, accessToken, refreshToken }

Login:
  validate(body) → find by email OR username → compare(password, hash)
  → create RefreshToken row (SHA-256(rawToken) stored) → return tokens

Refresh:
  validate refresh token signature → find SHA-256(token) in DB
  → check !isRevoked && !expired → rotate (revoke old, issue new pair)

Logout:
  find refresh token in DB → set isRevoked=true → 200 OK
```

**Token Design:**
```typescript
// Access token: 15 minutes — JWT_ACCESS_SECRET
// Payload: { sub: userId, role: 'CUSTOMER', email, iat, exp }

// Refresh token: 7 days — JWT_REFRESH_SECRET (different key)
// DB stores SHA-256 hash of the raw token string
// Raw token only ever sent to client, never stored
```

**Zod Schemas:**
```typescript
registerSchema = z.object({
  name:     z.string().min(2).max(100),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/i),
  email:    z.string().email(),
  password: z.string().min(8)
              .regex(/[A-Z]/, 'Must contain uppercase')
              .regex(/[0-9]/, 'Must contain number')
              .regex(/[^a-zA-Z0-9]/, 'Must contain special character'),
  phone:    z.string().optional(),
});

loginSchema = z.object({
  identifier: z.string(),   // email OR username
  password:   z.string(),
});
```

**New ENV Variables:**
```env
JWT_ACCESS_SECRET=<min-64-chars>
JWT_REFRESH_SECRET=<different-min-64-chars>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
```

**New Frontend Files:**
```
client/src/
  app/(auth)/login/page.tsx
  app/(auth)/register/page.tsx
  app/(auth)/logout/page.tsx
  context/AuthContext.tsx      ← { user, login, logout, isLoading }
  stores/authStore.ts          ← Zustand
  services/authService.ts
  schemas/authSchema.ts
  components/auth/
    LoginForm.tsx
    RegisterForm.tsx
    ProtectedRoute.tsx         ← redirects unauthenticated users
```

**Updated Frontend Files:**
- `client/src/services/apiClient.ts` — add request interceptor (attach Bearer token) + response interceptor (401 → auto-refresh → retry)

**Dependencies:**
| Package | Add to | Purpose |
|---------|--------|---------|
| `bcryptjs` | server deps | Password hashing |
| `@types/bcryptjs` | server devDeps | Types |
| `jsonwebtoken` | server deps | JWT sign/verify |
| `@types/jsonwebtoken` | server devDeps | Types |
| `zustand@5` | client deps | Global state |

---

### TASK-1.4 — Products: Auth Guards + Pagination + Visibility

| Attribute | Detail |
|-----------|--------|
| **What** | Add auth guards to write routes, pagination, visibility toggle, updated schema support |
| **Risk** | 🟡 Medium — Extends existing module |

**Files Affected:**
- `server/src/modules/products/product.routes.ts` — add `authenticate` + `requireRole` to POST/PUT/DELETE/PATCH
- `server/src/modules/products/product.service.ts` — pagination, visibility filter, category JOIN
- `server/src/modules/products/product.validator.ts` — update schema for new fields + pagination query

**Updated API:**
```
GET /api/products?page=1&limit=20&category=<uuid>&search=<q>&sortBy=price&order=asc&includeHidden=false
→ { products[], total, page, totalPages, limit }

PATCH /api/products/:id/visibility  (Admin only)
→ Body: { isVisible: boolean }
```

---

### TASK-1.5 — Category Module (Hierarchical CRUD)

| Attribute | Detail |
|-----------|--------|
| **What** | Category management API with parent/child hierarchy |
| **Risk** | 🟢 Low — Straightforward CRUD with self-referencing Prisma relation |

**New Server Files:**
```
server/src/modules/categories/
  category.controller.ts
  category.service.ts
  category.routes.ts
  category.validator.ts
  category.types.ts
```

**New API Endpoints:**
```
GET    /api/categories              (public: tree structure)
GET    /api/categories/:id          (public: category + children)
POST   /api/categories              (Admin only)
PUT    /api/categories/:id          (Admin only)
DELETE /api/categories/:id          (Admin only — blocked if products exist)
```

**New Frontend Files:**
```
client/src/
  services/categoryService.ts
  schemas/categorySchema.ts
  components/categories/
    CategoryFilter.tsx     ← UPDATE: replace string filter with category select
    CategoryTree.tsx       ← NEW: admin category management
```

---

### TASK-1.6 — Cart Module (Persistent, Stock-Validated)

| Attribute | Detail |
|-----------|--------|
| **What** | Server-side cart with stock validation. Auto-created on registration. |
| **Risk** | 🟡 Medium — Transaction handling for stock validation |
| **Source** | OIS cart logic pattern, improved and type-safe |

**New Server Files:**
```
server/src/modules/cart/
  cart.controller.ts
  cart.service.ts
  cart.routes.ts
  cart.validator.ts
  cart.types.ts
```

**Cart Business Logic:**
```typescript
addToCart:
  1. Fetch user's cart (auto-created on register, should always exist)
  2. Check product.isVisible && product exists
  3. Check product.stock >= requestedQty (throw 400 if insufficient)
  4. Upsert CartItem (increment if exists)
  5. Return full cart with computed totals

getCart:
  Include items → product (name, price, images[0], stock, isVisible)
  Compute: subtotal (sum of qty * price), itemCount

clearCart: deleteMany CartItems where cartId = user.cart.id
```

**New API Endpoints:**
```
GET    /api/cart                 (authenticate)
POST   /api/cart                 Body: { productId, quantity }
PUT    /api/cart/:productId      Body: { quantity }
DELETE /api/cart/:productId
DELETE /api/cart/clear
```

**New Frontend Files:**
```
client/src/
  stores/cartStore.ts            ← Zustand: { items, itemCount, subtotal, ... }
  context/CartContext.tsx        ← Provider
  services/cartService.ts
  schemas/cartSchema.ts
  app/(user)/cart/page.tsx
  components/cart/
    CartItem.tsx
    CartSummary.tsx
    CartDrawer.tsx               ← slide-out from Navbar
  components/layout/
    Navbar.tsx                   ← UPDATE: cart icon with badge count
```

---

### TASK-1.7 — Address Module

| Attribute | Detail |
|-----------|--------|
| **What** | Multi-address per user with default address support |
| **Risk** | 🟢 Low — Standard CRUD |
| **Source** | MESSIA's Address model, generalised (removed `district`, added `country`, `postalCode`) |

**New Server Files:**
```
server/src/modules/addresses/
  address.controller.ts
  address.service.ts
  address.routes.ts
  address.validator.ts
```

**New API Endpoints:**
```
GET    /api/addresses              (authenticate)
POST   /api/addresses
PUT    /api/addresses/:id          (ownership check)
DELETE /api/addresses/:id          (ownership check)
PATCH  /api/addresses/:id/default
```

**New Frontend Files:**
```
client/src/
  app/(user)/addresses/page.tsx
  services/addressService.ts
  schemas/addressSchema.ts
  components/address/
    AddressCard.tsx
    AddressForm.tsx
```

---

### TASK-1.8 — Order Module (Place, History, Cancel)

| Attribute | Detail |
|-----------|--------|
| **What** | Transactional order placement with stock deduction. User order history. |
| **Risk** | 🔴 High — Atomic stock deduction is critical |
| **Source** | OIS order logic, extended for address + price snapshot |

**New Server Files:**
```
server/src/modules/orders/
  order.controller.ts
  order.service.ts
  order.routes.ts
  order.validator.ts
  order.types.ts
```

**Order Placement (Atomic Transaction):**
```typescript
// ALL inside prisma.$transaction([]):
1. Load cart + items + products
2. Validate cart not empty
3. Validate addressId belongs to auth user
4. For EACH CartItem: product.stock >= item.quantity → throw if any fail
5. Calculate: subtotal (qty * priceAtPurchase), tax=0, total=subtotal
6. Create Order + OrderItems (snapshot product.price, product.name)
7. Decrement each product.stock by item.quantity
8. Clear cart (deleteMany CartItems)
// End transaction — if any step fails, ALL roll back
```

**New API Endpoints:**
```
POST   /api/orders                  Body: { addressId, notes? }
GET    /api/orders                  Paginated: { orders[], total, page }
GET    /api/orders/:id              Own orders only (ownership check)
PUT    /api/orders/:id/cancel       Only PENDING status; restores stock
```

**New Frontend Files:**
```
client/src/
  app/(user)/orders/page.tsx
  app/(user)/orders/[id]/page.tsx
  services/orderService.ts
  schemas/orderSchema.ts
  components/orders/
    OrderCard.tsx
    OrderDetail.tsx
    OrderStatus.tsx                ← status badge with colors
```

---

### TASK-1.9 — Admin Module

| Attribute | Detail |
|-----------|--------|
| **What** | Admin dashboard: stats, user management, order status management |
| **Risk** | 🟢 Low — All protected by `requireRole('ADMIN', 'SUPER_ADMIN')` |
| **Source** | OIS admin controllers, converted to TypeScript + centralized error handling |

**New Server Files:**
```
server/src/modules/admin/
  admin.controller.ts
  admin.routes.ts
  admin.types.ts
```

**New API Endpoints:**
```
GET    /api/admin/stats
GET    /api/admin/users?page=&search=
DELETE /api/admin/users/:id
GET    /api/admin/orders?status=&page=
PATCH  /api/admin/orders/:id/status     Body: { status: OrderStatus }
GET    /api/admin/products              (all, including hidden)
```

**New Frontend Files:**
```
client/src/
  app/(admin)/
    layout.tsx              ← admin sidebar layout + auth guard
    dashboard/page.tsx      ← stats cards
    users/page.tsx
    orders/page.tsx
    products/page.tsx       ← with visibility toggle
  components/admin/
    StatsCard.tsx
    DataTable.tsx           ← sortable, paginated table component
    AdminSidebar.tsx
```

---

### TASK-1.10 — Security Hardening

| Attribute | Detail |
|-----------|--------|
| **What** | Helmet, global rate limiter, Winston logging, dead code removal |
| **Risk** | 🟢 Low — Additive, non-breaking |

**Changes:**
- `server/src/server.ts` — add `helmet()` before all other middleware, global rate limiter on `/api/`
- `server/src/middlewares/rateLimit.middleware.ts` — NEW: named limiters (`authLimiter`, `globalLimiter`, `productLimiter`)
- `server/src/shared/logger.ts` — replace 8-line console wrapper with Winston (JSON transport for prod, pretty for dev)
- `client/src/app/page.tsx` — remove lines 2–7 + 11–20 (dead DevOps paper imports)

**Dependencies:**
| Package | Add to | Purpose |
|---------|--------|---------|
| `helmet` | server deps | Security headers |
| `winston` | server deps | Structured logging |

**New ENV Variables:**
```env
LOG_LEVEL=info
LOG_FORMAT=json
```

---

### TASK-1.11 — Test Suite: Phase 1 Coverage

| Attribute | Detail |
|-----------|--------|
| **What** | Integration tests for all Phase 1 endpoints. Target: 60%+ coverage. |
| **Risk** | 🟢 Low — Test-only work |

**Test Files:**
```
server/tests/integration/
  auth.test.ts
  products.test.ts
  categories.test.ts
  cart.test.ts
  orders.test.ts
  admin.test.ts

server/tests/unit/
  auth.service.test.ts
  product.service.test.ts

client/__tests__/
  LoginForm.test.tsx
  RegisterForm.test.tsx
  CartItem.test.tsx
  ProductCard.test.tsx    ← UPDATE for new schema
```

---

## Phase 2: Security & Advanced Auth (Weeks 5–8)
**Goal:** Password reset, email verification, OAuth, MFA, audit logs, wishlist, reviews.
**Readiness target:** 45% → 65%

### Task Summary

| Task | Files | Risk | Dependencies |
|------|-------|------|-------------|
| **2.1** Email Service | `shared/email.ts`, templates/ | 🟢 Low | `resend`, `nodemailer` |
| **2.2** Password Reset | auth module, `PasswordResetToken` | 🟡 Medium | email service |
| **2.3** Email Verification | auth module, `EmailVerification` model | 🟡 Medium | email service |
| **2.4** Google/GitHub OAuth | `config/passport.ts`, auth module | 🟡 Medium | `passport`, `passport-google-oauth20`, `passport-github2` |
| **2.5** MFA / TOTP | auth module, `mfaSecret` on User | 🟡 Medium | `speakeasy`, `qrcode` |
| **2.6** Winston Full Config | `shared/logger.ts`, request logger | 🟢 Low | `winston-daily-rotate-file` |
| **2.7** Audit Logs | `modules/admin/audit.service.ts`, `AuditLog` model | 🟢 Low | none |
| **2.8** Wishlist | `modules/wishlist/`, `Wishlist`+`WishlistItem` models | 🟢 Low | none |
| **2.9** Product Reviews | `modules/reviews/`, `Review` model | 🟡 Medium | none |
| **2.10** BullMQ Queue | `jobs/queue.ts`, workers | 🟡 Medium | `bullmq` |
| **2.11** Admin Analytics | `modules/admin/`, Prisma aggregations | 🟢 Low | `recharts` (client) |

---

## Phase 3: Payments & Checkout (Weeks 9–14)
**Goal:** End-to-end purchase flow with Stripe, coupons, shipping, returns, email automation.
**Readiness target:** 65% → 82%

### Task Summary

| Task | Files | Risk | Dependencies |
|------|-------|------|-------------|
| **3.1** Stripe Integration | `modules/payments/`, `Payment` model, webhook handler | 🔴 High | `stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js` |
| **3.2** Checkout Flow | `modules/payments/checkout.*`, checkout UI | 🔴 High | Stripe (3.1) |
| **3.3** Coupon Engine | `modules/coupons/`, `Coupon`+`CouponUsage` models | 🟡 Medium | none |
| **3.4** Order Lifecycle | cancel, return, tracking endpoints | 🟡 Medium | Stripe for refunds |
| **3.5** Email Automation | BullMQ workers + email templates | 🔴 High | BullMQ (2.10) + email (2.1) |
| **3.6** Product Variants | `modules/products/variants.*`, `ProductVariant` model | 🟡 Medium | none |
| **3.7** Inventory Log | `InventoryMovement` model, triggers in order service | 🟢 Low | none |
| **3.8** Razorpay (optional) | `modules/payments/razorpay.*` | 🟡 Medium | `razorpay` |

---

## Phase 4: Enterprise Scaling (Weeks 15–20)
**Goal:** API versioning, monitoring, CDN, secrets management, load testing.
**Readiness target:** 82% → 95%

### Task Summary

| Task | Files | Risk | Dependencies |
|------|-------|------|-------------|
| **4.1** API Versioning `/api/v1/` | `server.ts` route mounts | 🟡 Medium | none |
| **4.2** OpenAPI Docs | `@asteasolutions/zod-to-openapi`, `/api/docs` | 🟢 Low | `swagger-ui-express` |
| **4.3** S3 Image Upload | presign endpoint, `modules/uploads/` | 🟡 Medium | `@aws-sdk/client-s3` |
| **4.4** Monitoring (Sentry) | `@sentry/node`, `@sentry/nextjs` | 🟢 Low | Sentry account |
| **4.5** Secrets Manager | `terraform/secrets.tf`, ECS task definition | 🟡 Medium | AWS Secrets Manager |
| **4.6** PgBouncer | `docker-compose.yml`, `k8s/pgbouncer.yaml` | 🟡 Medium | none |
| **4.7** Staging Environment | New GH Actions workflow, Terraform workspace | 🟡 Medium | none |
| **4.8** Load Testing | `scripts/load-tests/*.js` (k6) | 🟢 Low | `k6` |
| **4.9** SAST/DAST in CI | Snyk action in `01-test.yml` | 🟢 Low | Snyk |

---

## What is NOT Being Migrated

| Item | Reason |
|------|--------|
| OIS `Category` enum | Replaced by relational model |
| OIS inline admin checks | Replaced by RBAC middleware |
| MESSIA `validateProduct` middleware | Replaced by Zod schema |
| MESSIA raw DB error responses | Replaced by centralized error handler |
| MESSIA client-side-only logout | Replaced by refresh token revocation |
| MESSIA `district` required field | Made optional string `addressLine2` |
| Both projects' JS code | ALL new code is TypeScript |
| Both frontend projects' JS components | Rewritten as TSX React components |
| `console.error` patterns | Replaced by Winston |

---

## Infrastructure Preservation Rules

The following must **never be broken** during implementation:

| Asset | Rule |
|-------|------|
| `.github/workflows/*.yml` | Extend only. Never delete or rename. |
| `terraform/` | Update only when adding new AWS resources. |
| `k8s/` | Update env refs + image tags only. |
| `docker-compose.yml` | Add services only. Never remove existing. |
| `server/Dockerfile` | Change only if build process changes. |
| `client/Dockerfile` | Change only if build process changes. |
| `client/next.config.mjs` | Extend `remotePatterns` only. Keep `output: 'standalone'`. |
| `server/src/config/cors.ts` | Extend `allowedOrigins`. Keep existing logic. |
| `server/src/config/database.ts` | Add logging config only. |
| `server/src/utils/redis.ts` | Unchanged. Only path changes in import. |
| `server/src/middlewares/errorMiddleware.ts` | Extend to handle Prisma errors. Keep shape. |

---

## Phase 1 Dependency Summary

### Server Additions (Phase 1 only)
```json
{
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "helmet": "^8.x",
  "winston": "^3.x"
}
```

### Client Additions (Phase 1 only)
```json
{
  "zustand": "^5.x"
}
```

---

## Open Questions (Require Your Decision Before Phase 1)

> [!IMPORTANT]
> These decisions affect implementation approach. Please review and decide.

1. **Email Provider (Phase 2):** Resend (modern REST API, quick setup) vs AWS SES (AWS-native, already in Terraform infra)?
   - **Recommendation:** Resend for Phase 1–2 speed, migrate to SES in Phase 4.

2. **Test Runner:** Keep Mocha (server) + Jest (client) as separate frameworks, OR unify to Vitest?
   - **Recommendation:** Keep existing Mocha + Jest. Vitest migration is low-priority.

3. **Market Target:** India-first (Razorpay primary, INR default, WhatsApp notifications) OR international (Stripe primary, USD/INR both)?
   - **Recommendation:** Stripe primary (Phase 3), Razorpay as secondary in Phase 3.8.

4. **Username at Registration:** Required (like MESSIA) OR optional (auto-generated from email)?
   - **Recommendation:** Required at registration. No auto-generation — users should choose.

5. **Product Slug:** Auto-generated from name on create OR user-specified?
   - **Recommendation:** Auto-generated (slugify name, append short UUID if collision).

> [!CAUTION]
> **No code will be written until this plan is explicitly approved.**

---

*Planning document — verified against source code, not assumptions.*
HEREDOC_END
