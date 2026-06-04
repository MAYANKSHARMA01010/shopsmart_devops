# FINAL Phase 1 Prisma Schema
> **Status:** AWAITING APPROVAL — Schema review package. No migrations will run until this is approved.
> **Base:** Current schema has 1 model (Product, Int id, Float price). This document defines the complete target.
> **Verified against:** Current codebase + DATABASE_MIGRATION_PLAN.md decisions

---

## Design Justification: What's In Phase 1 vs Deferred

### Included in Phase 1 — Justification

| Model | Justification |
|-------|--------------|
| **User** | Required for auth system (M5). Without it, nothing else in Phase 1 can function. |
| **RefreshToken** | Required by the 15m access + 7d refresh token strategy. Without server-side storage, logout is impossible. |
| **PasswordResetToken** | Phase 1 only defines the table structure. Actual email sending (Resend) is Phase 2. Included now because it's part of the same auth table group — adding it later requires another migration on the User table. |
| **Category** | Required to replace `product.category: String?` with a relational FK. A relational category is a correctness fix, not an optional feature. |
| **Product** (revised) | Core entity. Schema changes are necessary to unblock every other Phase 1 feature. |
| **Cart + CartItem** | Required as a paired table. Cart is auto-created on registration and must exist before any order can be placed. |
| **Address** | Required by Order (FK). Cannot create an Order without at least one address. |
| **Order + OrderItem** | Core commerce feature. The entire Phase 1 goal is a functional order flow. |

### Deferred to Phase 2+

| Model | Reason Deferred |
|-------|----------------|
| **EmailVerification** | Needs Resend (Phase 2). Table can be added in Phase 2 without touching Phase 1 tables. |
| **OAuthAccount** | Google/GitHub OAuth is Phase 2 scope. |
| **Wishlist / WishlistItem** | Nice-to-have; no blocking dependency. |
| **Review** | Requires verified purchase check — better implemented with full order flow stabilized. |
| **Payment** | Razorpay integration is Phase 3. |
| **Refund** | Depends on Payment. Phase 3. |
| **Coupon / CouponUsage** | Phase 3 alongside payment. |
| **ProductVariant** | Phase 3. Requires UI + inventory management. |
| **InventoryMovement** | Phase 3. |
| **ReturnRequest** | Phase 4. |
| **Notification** | Phase 4. |
| **AuditLog** | Phase 4. |

---

## Migration Risk Summary

| Model | Risk | Reason |
|-------|------|--------|
| **Product** | 🔴 HIGH | Existing table with data. PK type change (Int→UUID), field renames, field type changes. |
| **Category** | 🟢 LOW | New table. Seed required before Product FK is added. |
| **User + tokens** | 🟢 LOW | New tables. No existing data dependency. |
| **Cart + CartItem** | 🟢 LOW | New tables. |
| **Address** | 🟢 LOW | New tables. |
| **Order + OrderItem** | 🟢 LOW | New tables. |

---

## UUID Now vs Later — Recommendation

### Option A: Migrate to UUID Now (Recommended)

**Pros:**
- All Phase 1 FKs (Cart → User, Address → User, Order → User, Order → Address, CartItem → Product, OrderItem → Product) are consistent UUID strings from day one
- No cross-type FK inconsistency to fix later
- Security: sequential Int IDs allow enumeration attacks (`GET /products/1`, `/2`, `/3`...)
- No second disruptive migration needed in Phase 2 when User and Order tables already reference Product

**Cons:**
- Breaking change to `GET /api/products/:id` — callers must pass UUID strings, not integers
- Existing seeded products will be replaced (clean slate)
- Migration complexity for existing `Product` rows (manageable with a multi-step SQL approach)

### Option B: Keep Int for Now, Migrate Later

**Pros:**
- Zero risk to existing data
- Simpler migration (additive fields only in Phase 1)

**Cons:**
- Phase 1 will have mixed ID types: `User.id = UUID`, `Product.id = Int`
- All `OrderItem.productId` and `CartItem.productId` FKs would be `Int`, inconsistent with every other FK
- A second breaking UUID migration for Product in Phase 2 or 3 would be even more disruptive (by then CartItem and OrderItem will have FK constraints referencing the Int ID)
- **Enumeration attacks remain until Phase 3+**

**Decision recommendation: Option A (UUID now)**

The inconsistency cost of Option B compounds over time. Phase 1 is the right window — there is no downstream FK dependency on `Product.id` yet. After Phase 1, CartItem and OrderItem will both have FK constraints to Product, making UUID migration far more complex.

---

## Complete Target Schema

```prisma
// server/prisma/schema.prisma
// Phase 1 Target — pending approval

generator client {
  provider   = "prisma-client-js"
  engineType = "library"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

enum Role {
  SUPER_ADMIN
  ADMIN
  VENDOR
  CUSTOMER
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

// ═══════════════════════════════════════════════════════════════
// AUTH MODELS
// ═══════════════════════════════════════════════════════════════

model User {
  id              String    @id @default(uuid())
  name            String
  username        String?   @unique
  email           String    @unique
  password        String
  phone           String?
  avatar          String?
  gender          String?
  role            Role      @default(CUSTOMER)
  isEmailVerified Boolean   @default(false)

  // Relations
  refreshTokens   RefreshToken[]
  passwordResets  PasswordResetToken[]
  orders          Order[]
  cart            Cart?
  addresses       Address[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
  @@index([username])
  @@map("users")
}

model RefreshToken {
  id         String   @id @default(uuid())
  // Stored as SHA-256 hash of the raw token. Never store raw tokens.
  token      String   @unique
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  deviceInfo String?
  expiresAt  DateTime
  isRevoked  Boolean  @default(false)
  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([token])
  @@map("refresh_tokens")
}

model PasswordResetToken {
  id        String    @id @default(uuid())
  // Stored as SHA-256 hash of the raw token.
  token     String    @unique
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
  @@map("password_reset_tokens")
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT MODELS
// ═══════════════════════════════════════════════════════════════

model Category {
  id          String     @id @default(uuid())
  name        String     @unique
  slug        String     @unique
  description String?
  image       String?
  parentId    String?

  // Self-referential tree
  parent      Category?  @relation("CategoryTree", fields: [parentId], references: [id], onDelete: SetNull)
  children    Category[] @relation("CategoryTree")
  products    Product[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([parentId])
  @@map("categories")
}

model Product {
  id           String   @id @default(uuid())
  name         String
  slug         String   @unique
  description  String?
  // Decimal prevents floating-point currency errors. db.Decimal(10,2) = max 99,999,999.99
  basePrice    Decimal  @db.Decimal(10, 2)
  comparePrice Decimal? @db.Decimal(10, 2)
  stock        Int      @default(0)
  sku          String?  @unique
  images       String[] // Array of image URLs
  isVisible    Boolean  @default(true)
  categoryId   String

  // Relations
  category   Category    @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  orderItems OrderItem[]
  cartItems  CartItem[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([categoryId])
  @@index([isVisible])
  @@index([slug])
  @@map("products")
}

// ═══════════════════════════════════════════════════════════════
// CART MODELS
// ═══════════════════════════════════════════════════════════════

model Cart {
  id     String     @id @default(uuid())
  userId String     @unique
  user   User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items  CartItem[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("carts")
}

model CartItem {
  id        String  @id @default(uuid())
  cartId    String
  cart      Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  quantity  Int     @default(1)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // A product can only appear once per cart
  @@unique([cartId, productId])
  @@index([cartId])
  @@index([productId])
  @@map("cart_items")
}

// ═══════════════════════════════════════════════════════════════
// ADDRESS MODEL
// ═══════════════════════════════════════════════════════════════

model Address {
  id         String  @id @default(uuid())
  userId     String
  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  name       String
  email      String
  phone      String
  line1      String
  line2      String?
  city       String
  state      String
  country    String  @default("IN")
  postalCode String
  isDefault  Boolean @default(false)

  // Relations
  orders Order[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@map("addresses")
}

// ═══════════════════════════════════════════════════════════════
// ORDER MODELS
// ═══════════════════════════════════════════════════════════════

model Order {
  id             String      @id @default(uuid())
  userId         String
  user           User        @relation(fields: [userId], references: [id], onDelete: Restrict)
  addressId      String
  address        Address     @relation(fields: [addressId], references: [id], onDelete: Restrict)
  status         OrderStatus @default(PENDING)

  // Amounts — all Decimal for correctness
  subtotal       Decimal     @db.Decimal(10, 2)
  discountAmount Decimal     @default(0) @db.Decimal(10, 2)
  taxAmount      Decimal     @default(0) @db.Decimal(10, 2)
  shippingAmount Decimal     @default(0) @db.Decimal(10, 2)
  totalAmount    Decimal     @db.Decimal(10, 2)

  couponCode String?
  notes      String?
  items      OrderItem[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([status])
  @@index([createdAt])
  @@map("orders")
}

model OrderItem {
  id        String  @id @default(uuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Restrict)

  // Point-in-time snapshots — preserve price/name even if product is edited/deleted
  productName     String
  productSku      String?
  quantity        Int
  priceAtPurchase Decimal @db.Decimal(10, 2)

  createdAt DateTime @default(now())

  // A product can only appear once per order (quantities are consolidated)
  @@unique([orderId, productId])
  @@index([orderId])
  @@index([productId])
  @@map("order_items")
}
```

---

## Model-by-Model Field Justifications

### User
| Field | Type | Why |
|-------|------|-----|
| `username` | `String? @unique` | Optional per approved decision. Auto-derived from email if omitted. |
| `password` | `String` | bcrypt hash, cost factor 12. Never raw. |
| `isEmailVerified` | `Boolean` | Column exists in Phase 1; verification email implemented Phase 2. |
| `role` | `Role` enum | `CUSTOMER` default. `ADMIN`/`SUPER_ADMIN` set via seed or SUPER_ADMIN action only. |
| `gender` | `String?` | From MESSIA source. Optional, no validation constraint. |

### RefreshToken
| Field | Type | Why |
|-------|------|-----|
| `token` | `String @unique` | SHA-256 hash only. Never store raw JWT. |
| `isRevoked` | `Boolean` | Allows single-device logout without deleting the row. Row deletion happens during cleanup job (Phase 2). |
| `deviceInfo` | `String?` | Future: display "logged in from iPhone" to user. Optional now. |
| `expiresAt` | `DateTime` | Hard expiry check independent of JWT `exp` claim. |

### Category
| Field | Type | Why |
|-------|------|-----|
| `slug` | `String @unique` | URL-friendly identifier. Auto-generated. Needed for SEO-friendly product listing URLs. |
| `parentId` | `String?` | Self-referential tree. `SetNull` on parent delete (children become root-level). |

### Product
| Field | Type | Why |
|-------|------|-----|
| `slug` | `String @unique` | Auto-generated from name. Used for SEO URLs (`/products/mechanical-keyboard`). |
| `basePrice` | `Decimal(10,2)` | Replaces `Float`. Prevents 0.1+0.2=0.30000000000000004 class of bugs in order totals. |
| `comparePrice` | `Decimal?(10,2)` | Strike-through "was" price for sale display. Optional. |
| `images` | `String[]` | PostgreSQL native array. Replaces single `imageUrl`. |
| `sku` | `String? @unique` | Stock Keeping Unit. Optional but unique when set. |
| `isVisible` | `Boolean` | Draft/hidden product support without deletion. |
| `categoryId` | `String` | Required FK. `onDelete: Restrict` prevents orphaned products. |

### Cart / CartItem
| Field | Type | Why |
|-------|------|-----|
| `@@unique([cartId, productId])` | Constraint | Prevents duplicate cart line items. Quantity updated via PATCH, not new rows. |
| CartItem `onDelete: Cascade` for product | Intent | If a product is deleted, its cart items disappear. This is intentional — the product no longer exists. |

### Order / OrderItem
| Field | Type | Why |
|-------|------|-----|
| `subtotal` vs `totalAmount` | Both `Decimal` | Subtotal before adjustments. Total is the amount actually charged. |
| `priceAtPurchase` | `Decimal` | Snapshot. If product price changes after order, order history is unaffected. |
| `productName` | `String` | Snapshot. If product is renamed or deleted, order history remains readable. |
| Order `onDelete: Restrict` for User | Intent | Cannot delete a User with orders — data integrity. Must be anonymized (Phase 4) or manually handled. |
| Order `onDelete: Restrict` for Address | Intent | Cannot delete an address used in an order. UI must warn user. |
| OrderItem `onDelete: Restrict` for Product | Intent | Cannot delete a product that has been ordered. Must use `isVisible: false` instead. |

---

## Complete Index List

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| `users` | `email` | Regular | Login lookup |
| `users` | `username` | Regular | Login lookup (nullable but indexed) |
| `refresh_tokens` | `token` | Regular | Auth check on every protected request |
| `refresh_tokens` | `userId` | Regular | Logout all devices for a user |
| `password_reset_tokens` | `userId` | Regular | List pending reset requests |
| `categories` | `parentId` | Regular | Tree traversal (get children) |
| `products` | `categoryId` | Regular | Category product listing |
| `products` | `isVisible` | Regular | Public listing filter (WHERE isVisible=true) |
| `products` | `slug` | Regular | URL-based product lookup |
| `cart_items` | `cartId` | Regular | Get all items in a cart |
| `cart_items` | `productId` | Regular | Check if product is in any cart |
| `addresses` | `userId` | Regular | User address listing |
| `orders` | `userId` | Regular | User order history |
| `orders` | `status` | Regular | Admin filter by status |
| `orders` | `createdAt` | Regular | Admin date-range queries, today's stats |
| `order_items` | `orderId` | Regular | Order detail lookup |
| `order_items` | `productId` | Regular | Admin: which orders contain a product |

---

## Unique Constraints Summary

| Table | Constraint | Enforcement |
|-------|-----------|-------------|
| `users` | `email` | `@unique` |
| `users` | `username` | `@unique` (nullable — two NULLs allowed in PostgreSQL) |
| `refresh_tokens` | `token` | `@unique` |
| `password_reset_tokens` | `token` | `@unique` |
| `categories` | `name` | `@unique` |
| `categories` | `slug` | `@unique` |
| `products` | `slug` | `@unique` |
| `products` | `sku` | `@unique` (nullable) |
| `carts` | `userId` | `@unique` — one cart per user |
| `cart_items` | `(cartId, productId)` | `@@unique` — one line per product per cart |
| `order_items` | `(orderId, productId)` | `@@unique` — one line per product per order |

---

## Cascade / Restrict / SetNull Behaviour

| Parent Deleted | Relation | Child Behaviour |
|----------------|----------|----------------|
| User | RefreshToken | CASCADE → tokens deleted |
| User | PasswordResetToken | CASCADE → reset tokens deleted |
| User | Cart | CASCADE → cart deleted |
| User | CartItem (via Cart) | CASCADE (chain) |
| User | Address | CASCADE → addresses deleted |
| User | Order | RESTRICT → cannot delete user with orders |
| Category | Product | RESTRICT → cannot delete category with products |
| Category | Category (children) | SET NULL → children become top-level |
| Product | CartItem | CASCADE → removed from carts |
| Product | OrderItem | RESTRICT → cannot delete product with orders |
| Address | Order | RESTRICT → cannot delete address used in order |
| Order | OrderItem | CASCADE → items deleted with order |

---

## Table Name Map (Prisma `@@map`)

| Prisma Model | PostgreSQL Table |
|-------------|-----------------|
| `User` | `users` |
| `RefreshToken` | `refresh_tokens` |
| `PasswordResetToken` | `password_reset_tokens` |
| `Category` | `categories` |
| `Product` | `products` |
| `Cart` | `carts` |
| `CartItem` | `cart_items` |
| `Address` | `addresses` |
| `Order` | `orders` |
| `OrderItem` | `order_items` |
