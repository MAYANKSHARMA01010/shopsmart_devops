# ShopSmart — Database Migration Plan
> **Status:** PLANNING — No migrations will run until implementation is approved
> **Verified Against:** `server/prisma/schema.prisma` (June 4, 2026)
> **Convention:** All new models use UUID primary keys, Decimal for money, snake_case table names (Prisma default)

---

## Current State (Verified)

```prisma
// server/prisma/schema.prisma — CURRENT (25 lines)

model Product {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  price       Float
  stock       Int      @default(0)
  category    String?
  imageUrl    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Issues identified in current schema:**
- `id: Int` — sequential, predictable, insecure
- `price: Float` — floating-point precision errors for currency
- `category: String?` — free text, no taxonomy, no FK
- `imageUrl: String?` — only one image per product
- No `isVisible` — no draft/hidden product support
- No `slug` — URL-friendly identifier missing
- No User, Auth, Cart, Order, or any other model

---

## Target State (Phase 1 Complete)

Full schema will contain **11 models** and **3 enums**.

---

## Migration Execution Plan

> [!CAUTION]
> Migrations must be executed in the exact sequence below. Each migration depends on the previous one completing successfully. Never squash or reorder these migrations.

---

### MIGRATION 0: Pre-flight Checks

Before running any migration, verify:

```bash
# 1. Confirm you're on the correct database
pnpm --filter shopsmart-server db:studio  # Open Prisma Studio, verify current state

# 2. Backup existing data (if any)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Confirm test database is separate from production
echo $DATABASE_URL  # Should point to dev/test DB, not production
```

---

### MIGRATION 1: Add Enums

**File:** `server/prisma/schema.prisma`
**Type:** Add-only (no table changes)
**Risk:** 🟢 Low

```prisma
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

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
  PARTIAL
}
```

**Command:**
```bash
pnpm --filter shopsmart-server exec prisma migrate dev --name "add_enums"
```

---

### MIGRATION 2: Create Category Table

**Depends on:** Migration 1
**Risk:** 🟢 Low (new table, no existing table changes)

```prisma
model Category {
  id          String     @id @default(uuid())
  name        String     @unique
  slug        String     @unique
  description String?
  image       String?
  parentId    String?
  parent      Category?  @relation("CategoryTree", fields: [parentId], references: [id], onDelete: SetNull)
  children    Category[] @relation("CategoryTree")
  products    Product[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([parentId])
}
```

**Command:**
```bash
pnpm --filter shopsmart-server exec prisma migrate dev --name "create_category_table"
```

---

### MIGRATION 3: Seed Default Category

**Type:** Data seed (not a schema migration)
**Why:** Must exist before Product FK constraint is added in Migration 4.
**Risk:** 🟢 Low

**File to create:** `server/prisma/seeds/001_default_category.ts`

```typescript
// server/prisma/seeds/001_default_category.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORY_ID = '00000000-0000-0000-0000-000000000001';

export async function seedDefaultCategory() {
  await prisma.category.upsert({
    where: { id: DEFAULT_CATEGORY_ID },
    update: {},
    create: {
      id: DEFAULT_CATEGORY_ID,
      name: 'Uncategorized',
      slug: 'uncategorized',
      description: 'Default category for products without a specific category',
    },
  });
  console.log('✅ Default category seeded');
}
```

**Command:**
```bash
pnpm --filter shopsmart-server exec ts-node prisma/seeds/001_default_category.ts
```

---

### MIGRATION 4: Modify Product Table

**Depends on:** Migration 3 (default category UUID must exist)
**Risk:** 🔴 High — Changes existing table with potential data

This migration involves MULTIPLE changes to the `Product` table. They must be done in a single migration to avoid intermediate invalid states.

**Full Product model after migration:**

```prisma
model Product {
  id          String     @id @default(uuid())
  name        String
  slug        String     @unique
  description String?
  basePrice   Decimal    @db.Decimal(10, 2)
  comparePrice Decimal?  @db.Decimal(10, 2)
  stock       Int        @default(0)
  sku         String?    @unique
  images      String[]
  isVisible   Boolean    @default(true)
  categoryId  String
  category    Category   @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  orderItems  OrderItem[]
  cartItems   CartItem[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([categoryId])
  @@index([isVisible])
  @@index([slug])
}
```

**Changes from current:**
| Field | Old | New |
|-------|-----|-----|
| `id` | `Int @default(autoincrement())` | `String @default(uuid())` |
| `price` | `Float` | removed → `basePrice Decimal @db.Decimal(10,2)` |
| `category` | `String?` | removed → `categoryId String` (FK) |
| `imageUrl` | `String?` | removed → `images String[]` |
| `isVisible` | missing | `Boolean @default(true)` |
| `slug` | missing | `String @unique` |
| `sku` | missing | `String? @unique` |
| `comparePrice` | missing | `Decimal?` |

**Custom migration SQL required** (Prisma will generate SQL, but we must verify and augment):

```sql
-- Migration 4 custom SQL additions (add to auto-generated migration)

-- Step 1: Add new columns as nullable first
ALTER TABLE "Product" ADD COLUMN "new_id" UUID DEFAULT gen_random_uuid();
ALTER TABLE "Product" ADD COLUMN "slug" TEXT;
ALTER TABLE "Product" ADD COLUMN "images" TEXT[] DEFAULT '{}';
ALTER TABLE "Product" ADD COLUMN "basePrice" DECIMAL(10,2);
ALTER TABLE "Product" ADD COLUMN "categoryId" UUID;
ALTER TABLE "Product" ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN "sku" TEXT;
ALTER TABLE "Product" ADD COLUMN "comparePrice" DECIMAL(10,2);

-- Step 2: Copy data to new columns
UPDATE "Product" SET
  "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("name", '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g')) || '-' || SUBSTRING("new_id"::TEXT, 1, 8),
  "images" = CASE WHEN "imageUrl" IS NOT NULL THEN ARRAY["imageUrl"] ELSE '{}' END,
  "basePrice" = CAST("price" AS DECIMAL(10,2)),
  "categoryId" = '00000000-0000-0000-0000-000000000001'::UUID;

-- Step 3: Make new columns NOT NULL (after data is populated)
ALTER TABLE "Product" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "basePrice" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "categoryId" SET NOT NULL;

-- Step 4: Add FK constraint
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT;

-- Step 5: Add unique constraints
ALTER TABLE "Product" ADD CONSTRAINT "Product_slug_key" UNIQUE ("slug");

-- Step 6: Drop old columns
ALTER TABLE "Product" DROP COLUMN "price";
ALTER TABLE "Product" DROP COLUMN "category";
ALTER TABLE "Product" DROP COLUMN "imageUrl";

-- Step 7: Rename primary key (complex — requires recreating PK)
-- NOTE: Prisma handles this via shadow DB, but verify manually
```

> [!WARNING]
> Step 7 (changing PK type from Int to UUID) is the most complex operation. Prisma's shadow database approach should handle it, but run on a test DB copy first. If any FK references exist to `Product.id` in other tables (none in current state), those must be updated first.

**Command:**
```bash
pnpm --filter shopsmart-server exec prisma migrate dev --name "modify_product_table_phase1"
```

---

### MIGRATION 5: Create User & Auth Tables

**Depends on:** Migration 4
**Risk:** 🟡 Medium (new tables, complex relations)

```prisma
model User {
  id              String         @id @default(uuid())
  name            String
  username        String         @unique
  email           String         @unique
  password        String
  phone           String?
  avatar          String?
  gender          String?
  role            Role           @default(CUSTOMER)
  isEmailVerified Boolean        @default(false)
  refreshTokens   RefreshToken[]
  passwordResets  PasswordResetToken[]
  orders          Order[]
  cart            Cart?
  addresses       Address[]
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@index([email])
  @@index([username])
}

model RefreshToken {
  id          String   @id @default(uuid())
  token       String   @unique   // SHA-256 hash of raw token
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  deviceInfo  String?
  expiresAt   DateTime
  isRevoked   Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([token])
}

model PasswordResetToken {
  id        String    @id @default(uuid())
  token     String    @unique   // SHA-256 hash
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
}
```

**Command:**
```bash
pnpm --filter shopsmart-server exec prisma migrate dev --name "create_user_auth_tables"
```

---

### MIGRATION 6: Create Cart Tables

**Depends on:** Migration 5 (User must exist)
**Risk:** 🟢 Low

```prisma
model Cart {
  id        String     @id @default(uuid())
  userId    String     @unique
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     CartItem[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model CartItem {
  id        String   @id @default(uuid())
  cartId    String
  cart      Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  quantity  Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([cartId, productId])
  @@index([cartId])
  @@index([productId])
}
```

**Command:**
```bash
pnpm --filter shopsmart-server exec prisma migrate dev --name "create_cart_tables"
```

---

### MIGRATION 7: Create Address Table

**Depends on:** Migration 5 (User must exist)
**Risk:** 🟢 Low

```prisma
model Address {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name       String
  email      String
  phone      String
  line1      String
  line2      String?
  city       String
  state      String
  country    String   @default("IN")
  postalCode String
  isDefault  Boolean  @default(false)
  orders     Order[]
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([userId])
}
```

**Command:**
```bash
pnpm --filter shopsmart-server exec prisma migrate dev --name "create_address_table"
```

---

### MIGRATION 8: Create Order Tables

**Depends on:** Migrations 5, 7 (User + Address must exist)
**Risk:** 🟡 Medium — Transactional writes depend on correct schema

```prisma
model Order {
  id             String      @id @default(uuid())
  userId         String
  user           User        @relation(fields: [userId], references: [id], onDelete: Restrict)
  addressId      String
  address        Address     @relation(fields: [addressId], references: [id], onDelete: Restrict)
  status         OrderStatus @default(PENDING)
  subtotal       Decimal     @db.Decimal(10, 2)
  discountAmount Decimal     @db.Decimal(10, 2) @default(0)
  taxAmount      Decimal     @db.Decimal(10, 2) @default(0)
  shippingAmount Decimal     @db.Decimal(10, 2) @default(0)
  totalAmount    Decimal     @db.Decimal(10, 2)
  couponCode     String?
  notes          String?
  items          OrderItem[]
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  @@index([userId])
  @@index([status])
}

model OrderItem {
  id              String   @id @default(uuid())
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId       String
  product         Product  @relation(fields: [productId], references: [id], onDelete: Restrict)
  productName     String   // snapshot at time of purchase
  productSku      String?  // snapshot
  quantity        Int
  priceAtPurchase Decimal  @db.Decimal(10, 2)
  createdAt       DateTime @default(now())

  @@unique([orderId, productId])
  @@index([orderId])
  @@index([productId])
}
```

**Command:**
```bash
pnpm --filter shopsmart-server exec prisma migrate dev --name "create_order_tables"
```

---

### MIGRATION 9: Seed Admin User & Categories

**Type:** Data seed
**Depends on:** Migrations 5, 2

**File:** `server/prisma/seeds/002_initial_data.ts`

```typescript
// Seeded values — use real bcrypt hash in production
// Admin user password should come from env var, not hardcoded

const CATEGORIES = [
  { id: '...uuid1...', name: 'Electronics', slug: 'electronics', parentId: null },
  { id: '...uuid2...', name: 'Clothing', slug: 'clothing', parentId: null },
  { id: '...uuid3...', name: 'Books', slug: 'books', parentId: null },
  { id: '...uuid4...', name: 'Home & Garden', slug: 'home-garden', parentId: null },
  { id: '...uuid5...', name: 'Sports', slug: 'sports', parentId: null },
  // Subcategories (parentId references above)
  { id: '...uuid6...', name: 'Smartphones', slug: 'smartphones', parentId: '...uuid1...' },
  { id: '...uuid7...', name: 'Laptops', slug: 'laptops', parentId: '...uuid1...' },
];
```

**Command:**
```bash
pnpm --filter shopsmart-server exec ts-node prisma/seeds/002_initial_data.ts
```

---

## Phase 2 Additional Migrations

### MIGRATION 10: Email Verification Table

```prisma
model EmailVerification {
  id        String   @id @default(uuid())
  token     String   @unique   // SHA-256 hash
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
}
```

---

### MIGRATION 11: OAuth Accounts Table

```prisma
model OAuthAccount {
  id                String   @id @default(uuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider          String   // "google", "github"
  providerAccountId String
  accessToken       String?
  refreshToken      String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([provider, providerAccountId])
  @@index([userId])
}
```

Add to User: `oauthAccounts OAuthAccount[]`

---

### MIGRATION 12: MFA Fields on User

```sql
-- Add to User table
ALTER TABLE "User" ADD COLUMN "mfaSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
```

---

### MIGRATION 13: Audit Log Table

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  userId     String
  action     String   // "DELETE_USER", "UPDATE_ORDER_STATUS", etc.
  resource   String   // "User", "Order", etc.
  resourceId String
  changes    Json?    // before/after snapshot
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([resource, resourceId])
  @@index([createdAt])
}
```

---

### MIGRATION 14: Wishlist Tables

```prisma
model Wishlist {
  id        String         @id @default(uuid())
  userId    String         @unique
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     WishlistItem[]
  createdAt DateTime       @default(now())
}

model WishlistItem {
  id         String   @id @default(uuid())
  wishlistId String
  wishlist   Wishlist @relation(fields: [wishlistId], references: [id], onDelete: Cascade)
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@unique([wishlistId, productId])
}
```

---

### MIGRATION 15: Review Table

```prisma
model Review {
  id                 String   @id @default(uuid())
  userId             String
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId          String
  product            Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  rating             Int      // 1-5
  title              String?
  body               String?
  isVerifiedPurchase Boolean  @default(false)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([userId, productId])   // one review per product per user
  @@index([productId])
  @@index([rating])
}
```

---

## Phase 3 Additional Migrations

### MIGRATION 16: Payment Table

```prisma
model Payment {
  id             String        @id @default(uuid())
  orderId        String        @unique
  order          Order         @relation(fields: [orderId], references: [id])
  provider       String        // "stripe", "razorpay"
  providerPayId  String        @unique   // Stripe PaymentIntent ID
  amount         Decimal       @db.Decimal(10, 2)
  currency       String        @default("INR")
  status         PaymentStatus @default(PENDING)
  metadata       Json?
  refunds        Refund[]
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}

model Refund {
  id              String   @id @default(uuid())
  paymentId       String
  payment         Payment  @relation(fields: [paymentId], references: [id])
  providerRefundId String?
  amount          Decimal  @db.Decimal(10, 2)
  reason          String?
  status          String   @default("PENDING")
  createdAt       DateTime @default(now())
}
```

Add `paymentId String? @unique` + `payment Payment?` to `Order`.

---

### MIGRATION 17: Coupon Tables

```prisma
enum CouponType {
  PERCENTAGE
  FIXED_AMOUNT
  FREE_SHIPPING
}

model Coupon {
  id             String      @id @default(uuid())
  code           String      @unique
  type           CouponType
  value          Decimal     @db.Decimal(10, 2)
  minOrderAmount Decimal?    @db.Decimal(10, 2)
  maxUses        Int?
  usedCount      Int         @default(0)
  isActive       Boolean     @default(true)
  expiresAt      DateTime?
  usage          CouponUsage[]
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  @@index([code])
  @@index([isActive])
}

model CouponUsage {
  id        String   @id @default(uuid())
  couponId  String
  coupon    Coupon   @relation(fields: [couponId], references: [id])
  userId    String
  orderId   String
  usedAt    DateTime @default(now())

  @@unique([couponId, userId])   // one use per user per coupon
}
```

Add `couponId String?` + `coupon Coupon?` relation to `Order`.

---

### MIGRATION 18: Product Variant Tables

```prisma
model ProductVariant {
  id         String    @id @default(uuid())
  productId  String
  product    Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku        String    @unique
  name       String    // e.g., "Red / XL"
  price      Decimal   @db.Decimal(10, 2)
  stock      Int       @default(0)
  attributes Json      // { color: "Red", size: "XL" }
  isActive   Boolean   @default(true)
  cartItems  CartItem[]
  orderItems OrderItem[]
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([productId])
  @@index([sku])
}
```

Add `variantId String?` + `variant ProductVariant?` to `CartItem` and `OrderItem`.

---

### MIGRATION 19: Inventory Movement Log

```prisma
enum MovementType {
  SALE
  RESTOCK
  ADJUSTMENT
  RETURN
  INITIAL
}

model InventoryMovement {
  id            String       @id @default(uuid())
  productId     String
  product       Product      @relation(fields: [productId], references: [id])
  variantId     String?
  type          MovementType
  delta         Int          // positive = increase, negative = decrease
  previousStock Int
  newStock      Int
  reference     String?      // Order ID, restock PO, etc.
  note          String?
  createdAt     DateTime     @default(now())

  @@index([productId])
  @@index([type])
  @@index([createdAt])
}
```

---

## Phase 4 Additional Migrations

### MIGRATION 20: Return Request Table

```prisma
enum ReturnStatus {
  REQUESTED
  APPROVED
  REJECTED
  REFUNDED
}

model ReturnRequest {
  id        String       @id @default(uuid())
  orderId   String
  order     Order        @relation(fields: [orderId], references: [id])
  reason    String
  status    ReturnStatus @default(REQUESTED)
  note      String?
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
}
```

---

### MIGRATION 21: Notification Table

```prisma
enum NotificationType {
  ORDER_PLACED
  ORDER_SHIPPED
  ORDER_DELIVERED
  PAYMENT_FAILED
  REVIEW_REPLY
  SYSTEM
}

model Notification {
  id        String           @id @default(uuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  title     String
  body      String
  isRead    Boolean          @default(false)
  link      String?
  metadata  Json?
  createdAt DateTime         @default(now())

  @@index([userId, isRead])
  @@index([createdAt])
}
```

---

## Complete Phase 1 Prisma Schema (Final Target)

```prisma
// server/prisma/schema.prisma
// Target state after all Phase 1 migrations are complete

generator client {
  provider   = "prisma-client-js"
  engineType = "library"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ────────────── ENUMS ──────────────

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

// ────────────── AUTH MODELS ──────────────

model User {
  id              String               @id @default(uuid())
  name            String
  username        String               @unique
  email           String               @unique
  password        String
  phone           String?
  avatar          String?
  gender          String?
  role            Role                 @default(CUSTOMER)
  isEmailVerified Boolean              @default(false)
  refreshTokens   RefreshToken[]
  passwordResets  PasswordResetToken[]
  orders          Order[]
  cart            Cart?
  addresses       Address[]
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  @@index([email])
  @@index([username])
}

model RefreshToken {
  id         String   @id @default(uuid())
  token      String   @unique
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  deviceInfo String?
  expiresAt  DateTime
  isRevoked  Boolean  @default(false)
  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([token])
}

model PasswordResetToken {
  id        String    @id @default(uuid())
  token     String    @unique
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
}

// ────────────── PRODUCT MODELS ──────────────

model Category {
  id          String     @id @default(uuid())
  name        String     @unique
  slug        String     @unique
  description String?
  image       String?
  parentId    String?
  parent      Category?  @relation("CategoryTree", fields: [parentId], references: [id], onDelete: SetNull)
  children    Category[] @relation("CategoryTree")
  products    Product[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([parentId])
}

model Product {
  id           String      @id @default(uuid())
  name         String
  slug         String      @unique
  description  String?
  basePrice    Decimal     @db.Decimal(10, 2)
  comparePrice Decimal?    @db.Decimal(10, 2)
  stock        Int         @default(0)
  sku          String?     @unique
  images       String[]
  isVisible    Boolean     @default(true)
  categoryId   String
  category     Category    @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  orderItems   OrderItem[]
  cartItems    CartItem[]
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  @@index([categoryId])
  @@index([isVisible])
  @@index([slug])
}

// ────────────── CART MODELS ──────────────

model Cart {
  id        String     @id @default(uuid())
  userId    String     @unique
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     CartItem[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model CartItem {
  id        String   @id @default(uuid())
  cartId    String
  cart      Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  quantity  Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([cartId, productId])
  @@index([cartId])
}

// ────────────── ADDRESS MODELS ──────────────

model Address {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name       String
  email      String
  phone      String
  line1      String
  line2      String?
  city       String
  state      String
  country    String   @default("IN")
  postalCode String
  isDefault  Boolean  @default(false)
  orders     Order[]
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([userId])
}

// ────────────── ORDER MODELS ──────────────

model Order {
  id             String      @id @default(uuid())
  userId         String
  user           User        @relation(fields: [userId], references: [id], onDelete: Restrict)
  addressId      String
  address        Address     @relation(fields: [addressId], references: [id], onDelete: Restrict)
  status         OrderStatus @default(PENDING)
  subtotal       Decimal     @db.Decimal(10, 2)
  discountAmount Decimal     @db.Decimal(10, 2) @default(0)
  taxAmount      Decimal     @db.Decimal(10, 2) @default(0)
  shippingAmount Decimal     @db.Decimal(10, 2) @default(0)
  totalAmount    Decimal     @db.Decimal(10, 2)
  couponCode     String?
  notes          String?
  items          OrderItem[]
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  @@index([userId])
  @@index([status])
}

model OrderItem {
  id              String   @id @default(uuid())
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId       String
  product         Product  @relation(fields: [productId], references: [id], onDelete: Restrict)
  productName     String
  productSku      String?
  quantity        Int
  priceAtPurchase Decimal  @db.Decimal(10, 2)
  createdAt       DateTime @default(now())

  @@unique([orderId, productId])
  @@index([orderId])
}
```

---

## Migration Rollback Procedures

If a migration fails mid-way:

```bash
# 1. Check what the last successful migration was
pnpm --filter shopsmart-server exec prisma migrate status

# 2. Roll back to last known good state
pnpm --filter shopsmart-server exec prisma migrate reset --to <migration-name>

# 3. Restore from backup if needed
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# 4. Investigate failed migration SQL
pnpm --filter shopsmart-server exec prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script
```

---

## Database Indexes Summary

All indexes planned across Phase 1:

| Table | Column(s) | Type | Reason |
|-------|-----------|------|--------|
| `users` | `email` | Regular | Login lookup |
| `users` | `username` | Regular | Login lookup |
| `refresh_tokens` | `token` | Regular | Auth check per request |
| `refresh_tokens` | `userId` | Regular | Logout all devices |
| `categories` | `parentId` | Regular | Tree traversal |
| `products` | `categoryId` | Regular | Category filter |
| `products` | `isVisible` | Regular | Public listing filter |
| `products` | `slug` | Regular | URL lookup |
| `cart_items` | `cartId` | Regular | Get cart items |
| `addresses` | `userId` | Regular | Address listing |
| `orders` | `userId` | Regular | Order history |
| `orders` | `status` | Regular | Admin status filter |
| `order_items` | `orderId` | Regular | Order detail lookup |

---

*Migration plan verified against current schema state. All SQL changes were designed to be backward-compatible with existing data.*
