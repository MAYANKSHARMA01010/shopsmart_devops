# Migration Strategy — Phase 1
> **Status:** AWAITING APPROVAL — No migrations will be executed until approved.
> **Context:** Current DB has 1 table: `products` with 8 columns (Int PK, Float price, String category, String imageUrl).

---

## Migration Overview

| Step | Name | Risk | Reversible |
|------|------|------|-----------|
| M3-1 | Create enums | 🟢 Low | Yes (drop enum) |
| M3-2 | Create `categories` table + seed | 🟢 Low | Yes (drop table) |
| M3-3 | Create `users` table | 🟢 Low | Yes (drop table) |
| M3-4 | Create `refresh_tokens` table | 🟢 Low | Yes (drop table) |
| M3-5 | Create `password_reset_tokens` table | 🟢 Low | Yes (drop table) |
| M3-6 | **Migrate `products` table** | 🔴 High | See rollback plan |
| M3-7 | Create `carts` + `cart_items` | 🟢 Low | Yes (drop tables) |
| M3-8 | Create `addresses` | 🟢 Low | Yes (drop table) |
| M3-9 | Create `orders` + `order_items` | 🟢 Low | Yes (drop tables) |
| M3-10 | Verify data integrity | 🟢 Low | N/A |

---

## Detailed Migration Steps

### M3-1: Create Enums
```sql
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'VENDOR', 'CUSTOMER');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');
```
**Rollback:** `DROP TYPE "Role"; DROP TYPE "OrderStatus";`

---

### M3-2: Create `categories` + Seed
```sql
CREATE TABLE "categories" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "name"        TEXT NOT NULL,
  "slug"        TEXT NOT NULL,
  "description" TEXT,
  "image"       TEXT,
  "parentId"    UUID,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

**Seed immediately after (required before M3-6):**
These exact slugs/IDs will be referenced during Product data transformation.

| name | slug |
|------|------|
| Electronics | electronics |
| Clothing | clothing |
| Home & Garden | home-garden |
| Sports | sports |
| Toys | toys |
| Books | books |
| Uncategorized | uncategorized |

The `Uncategorized` category is a safety catch-all for any existing products with unrecognised category strings.

**Rollback:** `DROP TABLE "categories";`

---

### M3-3: Create `users` table
```sql
CREATE TABLE "users" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "name"            TEXT NOT NULL,
  "username"        TEXT,
  "email"           TEXT NOT NULL,
  "password"        TEXT NOT NULL,
  "phone"           TEXT,
  "avatar"          TEXT,
  "gender"          TEXT,
  "role"            "Role" NOT NULL DEFAULT 'CUSTOMER',
  "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_username_idx" ON "users"("username");
```
**Rollback:** `DROP TABLE "users";`

---

### M3-4: Create `refresh_tokens` table
```sql
CREATE TABLE "refresh_tokens" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "token"      TEXT NOT NULL,
  "userId"     UUID NOT NULL,
  "deviceInfo" TEXT,
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "isRevoked"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```
**Rollback:** `DROP TABLE "refresh_tokens";`

---

### M3-5: Create `password_reset_tokens` table
```sql
CREATE TABLE "password_reset_tokens" (
  "id"        UUID NOT NULL DEFAULT gen_random_uuid(),
  "token"     TEXT NOT NULL,
  "userId"    UUID NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```
**Rollback:** `DROP TABLE "password_reset_tokens";`

---

### M3-6: Migrate `products` table ⚠️ HIGHEST RISK STEP

This is the only destructive step. Strategy: **rename-and-rebuild**.

#### Step-by-step

**6a. Rename existing table (preserve data during migration)**
```sql
ALTER TABLE "products" RENAME TO "products_v1_backup";
```

**6b. Create new `products` table with final schema**
```sql
CREATE TABLE "products" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "name"         TEXT NOT NULL,
  "slug"         TEXT NOT NULL,
  "description"  TEXT,
  "basePrice"    DECIMAL(10,2) NOT NULL,
  "comparePrice" DECIMAL(10,2),
  "stock"        INTEGER NOT NULL DEFAULT 0,
  "sku"          TEXT,
  "images"       TEXT[] NOT NULL DEFAULT '{}',
  "isVisible"    BOOLEAN NOT NULL DEFAULT true,
  "categoryId"   UUID NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");
CREATE INDEX "products_isVisible_idx" ON "products"("isVisible");
CREATE INDEX "products_slug_idx" ON "products"("slug");
```

**6c. Copy and transform existing product data**
```sql
-- Map old category strings to new category UUIDs
-- Products with unrecognised categories go to 'uncategorized'
INSERT INTO "products" (
  "id", "name", "slug", "description", "basePrice",
  "stock", "images", "isVisible", "categoryId", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  v1."name",
  -- Generate slug: lowercase name, spaces to hyphens, append last 6 chars of UUID
  lower(regexp_replace(v1."name", '[^a-zA-Z0-9\s]', '', 'g'))
    || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6),
  v1."description",
  -- Float → Decimal conversion (cast is lossless for stored Float values)
  CAST(v1."price" AS DECIMAL(10,2)),
  v1."stock",
  -- imageUrl → images array
  CASE
    WHEN v1."imageUrl" IS NOT NULL AND v1."imageUrl" != ''
    THEN ARRAY[v1."imageUrl"]
    ELSE ARRAY[]::TEXT[]
  END,
  true, -- isVisible
  -- Map category string → Category UUID (case-insensitive)
  COALESCE(
    (SELECT c."id" FROM "categories" c
     WHERE lower(c."name") = lower(v1."category")
       OR c."slug" = lower(regexp_replace(v1."category", '[^a-zA-Z0-9]', '-', 'g'))
     LIMIT 1),
    -- Fallback: 'uncategorized' category
    (SELECT c."id" FROM "categories" c WHERE c."slug" = 'uncategorized' LIMIT 1)
  ),
  v1."createdAt",
  v1."updatedAt"
FROM "products_v1_backup" v1;
```

**6d. Add FK constraint**
```sql
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

**6e. Verify row counts match**
```sql
SELECT
  (SELECT COUNT(*) FROM "products_v1_backup") AS original_count,
  (SELECT COUNT(*) FROM "products") AS migrated_count;
-- Must be equal before proceeding
```

**6f. After successful verification, drop backup (run separately, after confidence period)**
```sql
-- DO NOT run this immediately after migration.
-- Keep the backup table for at least 24h in staging, 72h in production.
DROP TABLE "products_v1_backup";
```

#### M3-6 Rollback Plan (if migration fails at any step)
```sql
-- Step 1: Drop the new (partially built) products table
DROP TABLE IF EXISTS "products";

-- Step 2: Restore original table
ALTER TABLE "products_v1_backup" RENAME TO "products";

-- Step 3: Verify
SELECT COUNT(*) FROM "products";
-- Should match the number before migration started
```

---

### M3-7: Create `carts` + `cart_items`
```sql
CREATE TABLE "carts" (
  "id"        UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId"    UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "carts_userId_key" ON "carts"("userId");
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cart_items" (
  "id"        UUID NOT NULL DEFAULT gen_random_uuid(),
  "cartId"    UUID NOT NULL,
  "productId" UUID NOT NULL,
  "quantity"  INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cart_items_cartId_productId_key" ON "cart_items"("cartId", "productId");
CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");
CREATE INDEX "cart_items_productId_idx" ON "cart_items"("productId");
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey"
  FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```
**Rollback:** `DROP TABLE "cart_items"; DROP TABLE "carts";`

---

### M3-8: Create `addresses`
```sql
CREATE TABLE "addresses" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId"     UUID NOT NULL,
  "name"       TEXT NOT NULL,
  "email"      TEXT NOT NULL,
  "phone"      TEXT NOT NULL,
  "line1"      TEXT NOT NULL,
  "line2"      TEXT,
  "city"       TEXT NOT NULL,
  "state"      TEXT NOT NULL,
  "country"    TEXT NOT NULL DEFAULT 'IN',
  "postalCode" TEXT NOT NULL,
  "isDefault"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "addresses_userId_idx" ON "addresses"("userId");
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```
**Rollback:** `DROP TABLE "addresses";`

---

### M3-9: Create `orders` + `order_items`
```sql
CREATE TABLE "orders" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId"         UUID NOT NULL,
  "addressId"      UUID NOT NULL,
  "status"         "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "subtotal"       DECIMAL(10,2) NOT NULL,
  "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "taxAmount"      DECIMAL(10,2) NOT NULL DEFAULT 0,
  "shippingAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalAmount"    DECIMAL(10,2) NOT NULL,
  "couponCode"     TEXT,
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "orders_userId_idx" ON "orders"("userId");
CREATE INDEX "orders_status_idx" ON "orders"("status");
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_addressId_fkey"
  FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "order_items" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId"         UUID NOT NULL,
  "productId"       UUID NOT NULL,
  "productName"     TEXT NOT NULL,
  "productSku"      TEXT,
  "quantity"        INTEGER NOT NULL,
  "priceAtPurchase" DECIMAL(10,2) NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "order_items_orderId_productId_key" ON "order_items"("orderId", "productId");
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```
**Rollback:** `DROP TABLE "order_items"; DROP TABLE "orders";`

---

### M3-10: Verification Queries
Run these after all migrations complete to confirm integrity:

```sql
-- 1. All tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Expected: addresses, cart_items, carts, categories, order_items, orders, password_reset_tokens, products, refresh_tokens, users

-- 2. Product row count match
SELECT
  (SELECT COUNT(*) FROM "products_v1_backup") AS original,
  (SELECT COUNT(*) FROM "products") AS migrated;

-- 3. All products have valid category FK
SELECT COUNT(*) FROM "products" p
LEFT JOIN "categories" c ON p."categoryId" = c."id"
WHERE c."id" IS NULL;
-- Must be 0

-- 4. All products have a slug
SELECT COUNT(*) FROM "products" WHERE "slug" IS NULL OR "slug" = '';
-- Must be 0

-- 5. No duplicate slugs
SELECT "slug", COUNT(*) FROM "products"
GROUP BY "slug" HAVING COUNT(*) > 1;
-- Must return 0 rows

-- 6. Enum types exist
SELECT typname FROM pg_type WHERE typname IN ('Role', 'OrderStatus');
-- Must return both
```

---

## Production-Safe Deployment Sequence

### Prerequisites
- [ ] Run full migrations on staging environment first
- [ ] Run full test suite on staging with migrated DB
- [ ] Take a production database snapshot/backup
- [ ] Put application in maintenance mode (or use blue-green deployment)
- [ ] Deploy new application code **after** migration completes

### Deployment Order

```
1. [DB] Take snapshot of production database
2. [DB] Run M3-1 through M3-5 (all safe, additive only)
3. [DB] Run M3-6a (rename products → products_v1_backup)
           ← Point of no return. After this, old code cannot run.
4. [DB] Run M3-6b (create new products table)
5. [DB] Run M3-2 seed (categories)
6. [DB] Run M3-6c (data migration from backup)
7. [DB] Run M3-6d (add FK constraint)
8. [DB] Run M3-6e (verify row counts)
           ← If counts don't match, execute rollback NOW.
9. [DB] Run M3-7 through M3-9 (new tables)
10. [APP] Deploy new application code
11. [DB] Run M3-10 verification queries
12. [OPS] Monitor error rates for 30 minutes
13. [DB] After 72h confidence period: run M3-6f (drop backup table)
```

### Maintenance Window Estimate
- M3-1 through M3-5: ~15 seconds
- M3-6 (rename + create + data copy + FK): ~30 seconds per 10,000 rows
- M3-7 through M3-9: ~10 seconds
- **Total for 50 existing rows: ~2 minutes**
- **Total for 50,000 rows: ~15 minutes**

### Zero-Downtime Alternative (Not Recommended for Phase 1)
A true zero-downtime migration would require dual-write logic during transition. Given Phase 1 is pre-launch with no real production traffic, a brief maintenance window is simpler and safer.
