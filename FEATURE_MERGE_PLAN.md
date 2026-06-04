# ShopSmart — Feature Merge Plan
> **Status:** PLANNING — Read-only reference. No code changes until implementation is approved.
> **Purpose:** Defines exactly HOW each feature from OIS and MESSIA will be translated into ShopSmart's TypeScript, Prisma, and Next.js architecture — not copy-pasted, but rewritten with improvements.

---

## Merge Philosophy

> [!IMPORTANT]
> This document answers three questions for every feature:
> 1. **What** is being brought over (or not)?
> 2. **What changes** must be made vs. the source?
> 3. **What is being discarded** and why?

**No JavaScript code will be directly imported.** Every feature is:
- Re-designed to fit ShopSmart's TypeScript/Prisma/Express 5 conventions
- Improved to address quality issues found in the source
- Tested before shipping

---

## Feature Merge Matrix

### A. Authentication Features

#### A.1 — Email/Password Registration

| Aspect | OIS Source | MESSIA Source | ShopSmart Implementation |
|--------|-----------|---------------|--------------------------|
| **Body fields** | `name, email, password` | `name, username, email, password, gender` | `name, username, email, password, phone?` |
| **Validation** | Zod schema (`registerSchema`) | Manual middleware | Zod (ShopSmart convention) |
| **Password** | `bcrypt.hash(password, 10)` | `bcrypt.hash(password, 10)` | `bcrypt.hash(password, 12)` — stronger cost factor |
| **Uniqueness** | Email unique check | Email + username unique check | Email + username unique (both throw descriptive errors) |
| **Response** | `{ message, user, token }` | `{ message, user, token }` | `{ user, accessToken, refreshToken }` |
| **Post-register** | Nothing | Nothing | Auto-create Cart for user |
| **Discard from OIS** | `gender` not included | — | See above |
| **Discard from MESSIA** | — | Raw `console.log` errors | Replaced by Winston + AppError |

**TypeScript Signature:**
```typescript
// server/src/modules/auth/auth.service.ts
async register(data: RegisterDto): Promise<AuthResponse> {
  // 1. Validate uniqueness
  // 2. Hash password (cost=12)
  // 3. Create User
  // 4. Create empty Cart for User
  // 5. Issue token pair
  // 6. Return AuthResponse
}
```

---

#### A.2 — Login (Email OR Username)

| Aspect | OIS Source | MESSIA Source | ShopSmart Implementation |
|--------|-----------|---------------|--------------------------|
| **Identifier** | Email only | Email OR username | Email OR username (MESSIA approach) |
| **Lookup** | `findUnique({ where: { email } })` | `findFirst({ where: { OR: [{ email }, { username }] } })` | `findFirst({ OR: [{ email: identifier }, { username: identifier }] })` |
| **Token** | JWT 7d | JWT 7d | Access 15m + Refresh 7d |
| **Response** | `{ token, user }` | `{ token, user }` | `{ accessToken, refreshToken, user }` |
| **Rate Limit** | None | None | 10 attempts / 15 minutes |

---

#### A.3 — Logout

| Aspect | OIS | MESSIA | ShopSmart |
|--------|-----|--------|-----------|
| **Mechanism** | Client deletes token (no server action) | Client deletes token (no server action) | **Server-side: revoke RefreshToken in DB** |
| **Improvement** | OIS/MESSIA have no server-side logout | Same | `isRevoked = true` on DB record → tokens can be blacklisted |

**Why this matters:** With 15-minute access tokens, logout from access token is effectively instant. But the refresh token must be revoked server-side to prevent re-authentication.

---

#### A.4 — Get Current User (`/me`)

| Aspect | OIS | MESSIA | ShopSmart |
|--------|-----|--------|-----------|
| **Auth check** | `authenticate` middleware | `authenticate` middleware | `authenticate` middleware |
| **Response** | Basic user fields | User with username, gender | User without password hash (explicit field selection) |
| **Improvement** | None needed | None needed | Explicit `select` to prevent accidental password exposure |

---

#### A.5 — Profile Update

| Aspect | OIS | MESSIA | ShopSmart |
|--------|-----|--------|-----------|
| **Exists?** | ❌ No | ✅ Yes (`PUT /api/auth/update`) | ✅ Yes (`PUT /api/auth/profile`) |
| **Updatable fields** | N/A | `name, username, gender` | `name, username, phone, avatar, gender` |
| **Password change** | N/A | Not supported | Phase 2 (separate `POST /api/auth/change-password`) |
| **Source** | — | MESSIA | MESSIA logic, TypeScript rewrite |

**Improvement over MESSIA:**
- MESSIA's `verifyToken` is called twice (once in middleware, once manually) — eliminated
- MESSIA doesn't validate username uniqueness on update — fixed
- MESSIA uses manual field-by-field validation — replaced with Zod

---

### B. Authorization Features

#### B.1 — Role-Based Access Control

| Aspect | OIS | MESSIA | ShopSmart |
|--------|-----|--------|-----------|
| **Role storage** | `role: Role` enum on User | `role: Role` enum on User | Same — `role: Role` enum on User |
| **Roles available** | `ADMIN, USER` | `ADMIN, USER` | `SUPER_ADMIN, ADMIN, VENDOR, CUSTOMER` |
| **Check mechanism** | Inline: `if (req.user.role !== "ADMIN")` | Middleware: `verifyAdmin` (DB lookup) | Middleware factory: `requireRole(...roles)` (JWT payload, no DB call) |
| **Discard from OIS** | Inline role checks | — | All inline checks replaced |
| **Discard from MESSIA** | — | DB lookup on every admin route | JWT payload used instead |

---

#### B.2 — Auth Middleware (`authenticate`)

| Aspect | OIS Source | MESSIA Source | ShopSmart |
|--------|-----------|---------------|-----------|
| **Token extraction** | `req.headers.authorization.split(" ")[1]` | `req.headers.authorization.split(" ")[1]` | Same |
| **Verify method** | `jwt.verify(token, SECRET)` | `verifyToken(token)` wrapper | `jwt.verify(token, ACCESS_SECRET)` |
| **Error handling** | `return res.status(401).json({ ERROR: "..." })` | Same | `return next(new AppError("...", 401))` — centralized |
| **req.user** | `req.user = decoded` | `req.user = decoded` | `req.user = decoded` — TypeScript typed via `express.d.ts` |
| **Token expiry** | OIS: generic 401 | MESSIA: distinguishes `TokenExpiredError` | ShopSmart: distinguishes expiry (trigger refresh) vs invalid |

**ShopSmart express.d.ts:**
```typescript
// server/src/types/express.d.ts
import { JwtPayload } from '../modules/auth/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
```

---

### C. Product Features

#### C.1 — Product CRUD

| Aspect | OIS | MESSIA | ShopSmart |
|--------|-----|--------|-----------|
| **Create validation** | Manual inline checks | `validateProduct` middleware (manual) | Zod schema (`product.validator.ts`) |
| **Service layer** | ✅ Exists (`productService.js`) | ❌ Direct Prisma in controller | ✅ Service class pattern (keep ShopSmart) |
| **Category** | Enum field | FK to Category model | FK to Category model (MESSIA approach) |
| **Images** | Single `imageUrl` | `images: String[]` | `images: String[]` (MESSIA approach) |
| **Visibility** | `isVisible` boolean | `isVisible` boolean | `isVisible` boolean (both agree) |
| **Admin attribution** | `createdById` FK to User | None | Optional `createdById String?` (audit only, not exposed in API) |

**Discard from OIS:**
- Category enum — replaced by relational model
- Manual validation middleware — replaced by Zod
- `createdById` as required FK — made optional audit field

**Discard from MESSIA:**
- `parseInt(categoryId)` — replaced by string UUID
- Direct Prisma calls in controller — service layer maintained

---

#### C.2 — Product Listing with Pagination

| Aspect | OIS | MESSIA | ShopSmart |
|--------|-----|--------|-----------|
| **Pagination** | ✅ `page` + `limit` query params | ✅ Same | Same (OIS pattern) |
| **Filter: visible only** | `where: { isVisible: true }` | Same | Same |
| **Filter: category** | By enum value | By categoryId (FK) | By categoryId (UUID string) |
| **Filter: search** | ❌ None | ✅ `name ILIKE` | ✅ Name + description (ShopSmart existing) |
| **Sort** | By `createdAt desc` | ✅ `sortBy` + `order` params | `sortBy: 'price' \| 'createdAt' \| 'name'`, `order: 'asc' \| 'desc'` |
| **Response shape** | `{ products, total, totalPages }` | Same | `{ products, total, page, totalPages, limit }` — add `page` and `limit` |

**Source of sort logic:** MESSIA. Source of stock validation: OIS.

---

#### C.3 — Product Visibility Toggle

| Aspect | OIS | MESSIA | ShopSmart |
|--------|-----|--------|-----------|
| **Exists?** | ✅ `PATCH /:id/toggle-visibility` | ✅ (via PUT with isVisible) | `PATCH /api/products/:id/visibility` with explicit `{ isVisible: boolean }` |
| **Toggle** | Auto-toggle (reads current, flips) | Explicit value in body | **Explicit value** (PATCH body: `{ isVisible: boolean }`) — avoids race conditions |
| **Auth** | Admin only | Admin only | `requireRole('ADMIN', 'SUPER_ADMIN')` |

**Why explicit over toggle:** Auto-toggle creates a race condition when two admins act simultaneously.

---

#### C.4 — Redis Cache Strategy (ShopSmart-specific)

Existing ShopSmart caching on `products:all` will be extended:

| Cache Key | TTL | Invalidated On |
|-----------|-----|----------------|
| `products:all` | 1 hour | Create, Update, Delete, Visibility change |
| `products:page:{page}:{limit}:{filters}` | 30 min | Create, Update, Delete |
| `categories:tree` | 2 hours | Category Create, Update, Delete |
| `product:{id}` | 1 hour | Update, Delete of that product |

**Note:** OIS and MESSIA have no caching. ShopSmart's Redis caching is kept and extended.

---

### D. Category Features

#### D.1 — Hierarchical Category CRUD

**Source:** MESSIA. Fully rewritten in TypeScript.

| Aspect | MESSIA Source | ShopSmart Implementation |
|--------|--------------|--------------------------|
| **Model** | `parentId: Int?` self-relation | `parentId: String?` UUID self-relation |
| **Get all** | Returns flat list | Returns **tree structure** (parent + children nested) |
| **Create** | No parent validation | Validates `parentId` exists if provided |
| **Delete** | Hard delete | Blocked if products assigned to category |
| **Slug** | Not present | Auto-generated from name on create |

**Tree Response Shape:**
```typescript
interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  children: CategoryNode[];
  productCount?: number;
}
```

**Discard from MESSIA:**
- `parseInt(id)` everywhere — replaced by string UUID
- No slug — added
- No product count in response — added as optional include

---

### E. Cart Features

#### E.1 — Cart System (Best of OIS + MESSIA)

The ShopSmart cart implementation combines the best from both:

| Feature | Source | Reason |
|---------|--------|--------|
| **Stock validation before add** | OIS | Prevents overselling |
| **`clear` endpoint** | MESSIA | Convenience for checkout |
| **Total calculation in response** | MESSIA | Better DX for frontend |
| **Cascade delete on user delete** | MESSIA | Data integrity |
| **UUID primary keys** | OIS | Security |

**Cart Response (new):**
```typescript
interface CartResponse {
  id: string;
  items: CartItemWithProduct[];
  subtotal: string;     // Decimal serialized as string
  itemCount: number;
  updatedAt: string;
}

interface CartItemWithProduct {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: string;
    images: string[];
    stock: number;
    isVisible: boolean;
    category: { id: string; name: string; slug: string };
  };
  lineTotal: string;   // quantity * basePrice
}
```

**Discard from MESSIA:**
- `dbError: err.message` in error responses — critical security issue. Replaced by centralized error handler.
- `meta: err.meta` exposure — same issue.

**Discard from OIS:**
- No cart total in response — MESSIA's computed total is better.

---

#### E.2 — Stock Validation Logic (from OIS)

```typescript
// server/src/modules/cart/cart.service.ts
async addToCart(userId: string, productId: string, quantity: number): Promise<CartResponse> {
  // Get existing cart item quantity if any
  const cart = await this.getUserCart(userId);
  const existingItem = cart.items.find(i => i.productId === productId);
  const existingQty = existingItem?.quantity ?? 0;
  const totalRequested = existingQty + quantity;

  // Validate stock
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stock: true, isVisible: true, name: true },
  });

  if (!product || !product.isVisible) {
    throw new AppError('Product not found or unavailable', 404);
  }
  if (product.stock < totalRequested) {
    throw new AppError(
      `Insufficient stock. Available: ${product.stock}, Requested: ${totalRequested}`,
      400
    );
  }

  // Upsert CartItem
  // ... prisma upsert logic
}
```

---

### F. Address Features

#### F.1 — Address Management (from MESSIA)

**Source:** MESSIA's `Address` model + controller. Rewritten in TypeScript.

| Aspect | MESSIA Source | ShopSmart Implementation |
|--------|--------------|--------------------------|
| **Fields** | `name, email, phone, address1, address2?, city, state, district, pincode` | `name, email, phone, line1, line2?, city, state, country, postalCode` |
| **`district`** | Required, India-specific | Removed (non-standard internationally) |
| **`country`** | Not present | Added, defaults to "IN" |
| **Default address** | `isDefault: Boolean` | Same |
| **Set default logic** | Update one → doesn't clear others automatically | Atomic: clear all → set one |

**Atomic Set-Default Logic:**
```typescript
async setDefaultAddress(userId: string, addressId: string): Promise<Address> {
  // Must be atomic to prevent two defaults at once
  return await prisma.$transaction(async (tx) => {
    // Clear all defaults for this user
    await tx.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
    // Set the new default
    return tx.address.update({
      where: { id: addressId, userId }, // ownership check built in
      data: { isDefault: true },
    });
  });
}
```

**Discard from MESSIA:**
- `district` field
- Non-atomic default address logic
- Manual validation → replaced by Zod

---

### G. Order Features

#### G.1 — Order Placement (from OIS)

**Source:** OIS's `orderController.js`. Rewritten in TypeScript with improvements.

| Aspect | OIS Source | ShopSmart Implementation |
|--------|-----------|--------------------------|
| **Transaction** | ✅ `prisma.$transaction` | ✅ Same — required |
| **Stock deduction** | ✅ Per-item atomic | ✅ Same |
| **Price snapshot** | ✅ `priceAtPurchase` field | ✅ Same — keeps order integrity |
| **Cart clearing** | ✅ After order | ✅ Same |
| **Address** | ❌ Not required | ✅ Required (`addressId` in body) |
| **Order total** | ✅ Calculated | ✅ Extended: subtotal + tax + shipping + discount |
| **Cancellation** | ❌ None | ✅ Cancel PENDING orders + restore stock |

**Unused import from OIS (removed):**
`orderController.js` imports `get` from Node's `http` module but never uses it — this is dead code.

---

#### G.2 — Admin Order Management (from OIS)

| Aspect | OIS Source | ShopSmart Implementation |
|--------|-----------|--------------------------|
| **List all orders** | ✅ `GET /api/admin/orders` | Same |
| **Update status** | ✅ `PATCH /api/admin/orders/:id/status` | Same + validates status transition |
| **Filter by status** | ❌ Returns all | ✅ Add `?status=` filter |
| **Pagination** | ❌ Returns all | ✅ Add `?page=&limit=` |

**Status Transition Rules (new):**
```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
PENDING → CANCELLED (user or admin)
DELIVERED → REFUNDED (admin only, after return request)
```

Invalid transitions (e.g., DELIVERED → PENDING) will return 400.

---

### H. Admin Features

#### H.1 — Admin Dashboard Stats (from OIS)

**Source:** OIS's `adminStatsController.js`. Rewritten in TypeScript.

| Metric | OIS | ShopSmart |
|--------|-----|-----------|
| User count | ✅ `prisma.user.count()` | ✅ |
| Product count | ✅ | ✅ |
| Order count | ✅ | ✅ |
| Revenue total | ✅ `prisma.order.aggregate({ _sum: { totalAmount: true } })` | ✅ + filter by status (exclude CANCELLED/REFUNDED) |
| Orders by status | ❌ | ✅ Added |
| Today's revenue | ❌ | ✅ Added |

---

#### H.2 — Admin User Management (from OIS)

**Source:** OIS's `adminUsersController.js`. Improvements:

| Aspect | OIS Source | ShopSmart |
|--------|-----------|-----------|
| **Role check** | Inline `if (req.user.role !== "ADMIN")` | `requireRole` middleware (pre-verified) |
| **User list** | `role: "USER"` hardcoded | `role: { in: ['CUSTOMER', 'VENDOR'] }` (enum-aware) |
| **Fields returned** | `id, name, email, createdAt, totalOrders, totalSpent` | Same + `username, isEmailVerified, role` |
| **Delete user** | Hard delete | Phase 1: Hard delete. Phase 4: Soft delete with `deletedAt` |

---

### I. Frontend Features

#### I.1 — Auth Pages (Login, Register, Forgot Password)

**Source:** MESSIA pages. Rewritten as TypeScript + Zod + Zustand.

| Component | MESSIA Source | ShopSmart Target |
|-----------|--------------|------------------|
| Login form | JS, Context state | TSX, Zustand, Zod validation |
| Register form | JS, manual validation | TSX, Zustand, Zod `registerSchema` |
| Show/hide password | ✅ (toggle) | ✅ Same behavior |
| Error display | Alert boxes | Inline Zod field errors |
| Loading state | ✅ | ✅ |
| Redirect after login | Hardcoded path | `callbackUrl` query param support |

---

#### I.2 — Cart UI (from MESSIA)

**Source:** MESSIA's cart page. Rewritten as TSX.

Key improvements over MESSIA source:
- Quantity controls with min=1, max=product.stock validation
- Optimistic updates (update UI immediately, sync with server)
- CartDrawer (slide-out) accessible from Navbar (new — not in any source project)
- Persisted in Zustand (survives page navigation)

---

#### I.3 — Admin Dashboard UI (from OIS)

**Source:** OIS's admin pages. Rewritten as TSX.

| Page | OIS Source | ShopSmart Target |
|------|-----------|-----------------|
| Dashboard | Basic stats cards (JSX) | Stats cards + revenue chart (TSX + Recharts) |
| Users table | Paginated table (JSX) | Sortable paginated DataTable (TSX) |
| Orders table | Paginated table (JSX) | Same + status filter dropdown |
| Products table | Product CRUD (JSX) | Same + visibility toggle + category filter |

---

#### I.4 — Static Pages (from MESSIA)

**Source:** MESSIA's `about/`, `faqs/`, `privacy/`, `terms/`, `contact/`, `cookie-policy/` pages.

**Migration approach:** Content is migrated, layout is rebuilt to match ShopSmart's design system (dark/light theme, Fraunces + DM Sans fonts, CSS variables).

---

#### I.5 — Theme System (ShopSmart-only)

ShopSmart's dark/light theme system (CSS variables + `data-theme` attribute + `localStorage` flash prevention) is **kept exactly as-is** and extended to new pages.

OIS and MESSIA have no theme system — this is a ShopSmart competitive advantage.

---

### J. Features Being Completely Rebuilt (Not from Any Source)

| Feature | Why New | Phase |
|---------|---------|-------|
| Refresh token system | None of the three have it | Phase 1 |
| RBAC middleware factory | Both existing approaches have flaws | Phase 1 |
| Slug auto-generation | None have it | Phase 1 |
| Atomic set-default address | MESSIA's is not atomic | Phase 1 |
| Order status transition validation | OIS has none | Phase 1 |
| Password reset flow | None have it | Phase 2 |
| Email verification | None have it | Phase 2 |
| Google/GitHub OAuth | None have it | Phase 2 |
| MFA/TOTP | None have it | Phase 2 |
| Stripe payment flow | None have it | Phase 3 |
| Checkout multi-step | None have it | Phase 3 |
| Coupon engine | None have it | Phase 3 |
| BullMQ job queue | None have it | Phase 2 |
| Transactional email | None have it | Phase 3 |
| Inventory movement log | None have it | Phase 3 |
| Product slugs | None have it | Phase 1 |
| CartDrawer component | None have it | Phase 1 |
| Zustand global stores | None have it | Phase 1 |

---

## Anti-Patterns Explicitly Banned

The following patterns appear in OIS/MESSIA and must **never** appear in ShopSmart:

| Anti-pattern | Found in | ShopSmart Rule |
|-------------|----------|----------------|
| `res.json({ ERROR: '...' })` | OIS | Always use `AppError` → centralized handler |
| `console.error(error)` | Both | Always use `logger.error(message, { context })` |
| `dbError: err.message` in response | MESSIA | Never expose internal error details to client |
| `parseInt(id)` for UUID | MESSIA | IDs are `string`, no parsing needed |
| Role check inside controller body | OIS | Always use `requireRole` middleware |
| DB lookup for role verification | MESSIA | Always use JWT payload role |
| 7-day access tokens | Both | 15-minute access + 7-day refresh |
| Manual field validation in middleware | MESSIA | Always use Zod schemas |
| `const { prisma } = require(...)` | OIS | Use `import prisma from '../../config/database'` |
| `module.exports = { ... }` | Both | Use ES module `export` / `export default` |
| `any` as a TypeScript type | — | Explicit types always; `unknown` for errors |

---

## TypeScript Convention Guide

All code written for ShopSmart must follow these conventions:

```typescript
// ✅ DO: Explicit return types on service methods
async createProduct(data: CreateProductDto): Promise<ProductResponse> { ... }

// ❌ DON'T: Implicit return types
async createProduct(data: any) { ... }

// ✅ DO: AppError for business errors
throw new AppError('Product not found', 404);

// ❌ DON'T: Generic Error or string
throw new Error('not found');
throw 'Product not found';

// ✅ DO: catchAsync wrapper for async controllers
export const getProduct = catchAsync(async (req, res) => { ... });

// ❌ DON'T: Manual try/catch in every controller
export const getProduct = async (req, res, next) => {
  try { ... } catch (err) { next(err); }
};

// ✅ DO: Explicit Prisma select to prevent field leakage
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, name: true, email: true, role: true },
});

// ❌ DON'T: findUnique without select (leaks password hash)
const user = await prisma.user.findUnique({ where: { id } });
```

---

## Merge Progress Tracker

> This table will be updated during implementation as tasks complete.

| Feature | Source | Status | Phase |
|---------|--------|--------|-------|
| Repo restructure | New | ⏳ Pending | 1 |
| Schema migration | New | ⏳ Pending | 1 |
| Auth system | OIS + MESSIA → New TS | ⏳ Pending | 1 |
| Product guards + pagination | OIS + MESSIA | ⏳ Pending | 1 |
| Category CRUD | MESSIA → TS | ⏳ Pending | 1 |
| Cart system | OIS + MESSIA | ⏳ Pending | 1 |
| Address management | MESSIA → TS | ⏳ Pending | 1 |
| Order placement | OIS → TS | ⏳ Pending | 1 |
| Admin dashboard | OIS → TS | ⏳ Pending | 1 |
| Security hardening | New | ⏳ Pending | 1 |
| Phase 1 tests | New | ⏳ Pending | 1 |
| Password reset | New | ⏳ Pending | 2 |
| Email verification | New | ⏳ Pending | 2 |
| OAuth | New | ⏳ Pending | 2 |
| MFA | New | ⏳ Pending | 2 |
| Wishlist | New | ⏳ Pending | 2 |
| Reviews | New | ⏳ Pending | 2 |
| BullMQ jobs | New | ⏳ Pending | 2 |
| Stripe payments | New | ⏳ Pending | 3 |
| Checkout flow | New | ⏳ Pending | 3 |
| Coupons | New | ⏳ Pending | 3 |
| Transactional email | New | ⏳ Pending | 3 |
| Product variants | New | ⏳ Pending | 3 |
| Inventory log | New | ⏳ Pending | 3 |
| API versioning | New | ⏳ Pending | 4 |
| OpenAPI docs | New | ⏳ Pending | 4 |
| S3 uploads | New | ⏳ Pending | 4 |
| Monitoring | New | ⏳ Pending | 4 |

---

*Feature merge plan — no code will be written until implementation is approved.*
