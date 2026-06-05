# Milestone Report — M3: Database Schema Migration (Phase 1)
> **Branch:** `main`
> **Status:** ✅ COMPLETE

---

## 1. Summary

Rebuilt the database from the single-model `Product` structure to the complete Phase 1 schema, laying the foundation for authentication, categories, cart, address, and order modules. 

The schema uses UUID strings for all model IDs to prevent sequential ID enumeration, and PostgreSQL `Decimal` types for price fields to prevent floating-point precision errors.

---

## 2. Models Introduced

| Model | Type | Key Fields | Purpose |
|-------|------|------------|---------|
| `User` | New | `id(UUID)`, `email(unique)`, `password(hashed)`, `role(Enum)` | User accounts supporting CUSTOMER, ADMIN, SUPER_ADMIN roles |
| `RefreshToken` | New | `id(UUID)`, `token(SHA-256 hash)`, `userId`, `expiresAt` | Secure refresh tokens for auth session rotation |
| `PasswordResetToken` | New | `id(UUID)`, `token(SHA-256 hash)`, `userId`, `expiresAt` | Secure password reset tokens |
| `Category` | New | `id(UUID)`, `name(unique)`, `slug(unique)`, `parentId` | Hierarchical categories with self-referencing tree relation |
| `Product` | Modified | `id(UUID)`, `basePrice(Decimal)`, `categoryId(FK)`, `images(String[])` | Replaces the old Product model with UUID, category relation, and images |
| `Cart` | New | `id(UUID)`, `userId(unique)` | Server-side cart associated with users |
| `CartItem` | New | `id(UUID)`, `cartId`, `productId`, `quantity` | Items in user carts with unique constraints per product |
| `Address` | New | `id(UUID)`, `userId`, `country(default IN)`, `isDefault` | Addresses supporting multi-address setup |
| `Order` | New | `id(UUID)`, `userId`, `addressId`, `status(Enum)`, `totalAmount(Decimal)` | Orders for customer purchases |
| `OrderItem` | New | `id(UUID)`, `orderId`, `productId`, `priceAtPurchase(Decimal)` | Point-in-time snapshots of purchased products |

---

## 3. Database Migration & Pushing

Due to Dev TTY limitations for interactive migration prompts during destructive changes (dropping the old `Product` table and rebuilding it with UUID), schema changes were pushed using:
```bash
npx prisma db push --accept-data-loss
```
This dropped the old dev database tables and created the 10 models + relational indexes clean.

---

## 4. Seeding Strategy & Verification

A deterministic, idempotent seed script was executed (`npx prisma db seed`), creating:
- **7 categories** (e.g. electronics, apparel, home, books)
- **1 admin user** (`admin@shopsmart.com` / `AdminPass123!`)
- **15 curated products** correctly mapped to category IDs with base price, stock, images, and visibility.
- **1 empty cart** for the admin user.

Database structure verified via `psql` queries showing all tables and custom enums properly registered.

---

## 5. Rollback Strategy

Before the schema rebuild, a database backup was saved:
- Backup location: `/Users/mayanksharma/Downloads/New_Projects/shopsmart/server/prisma/backups/`
- Rollback Command:
  ```bash
  psql $DATABASE_URL < backup_filename.sql
  ```

---

## 6. Breaking Changes Details

- `Product.id` changed from `Int` to `UUID String` (requires updates in all controllers/services/tests).
- `Product.price` changed to `Product.basePrice` (`Decimal` type).
- `Product.category` free-text string changed to `categoryId` (UUID reference to Category table).
- `Product.imageUrl` string changed to `Product.images` string array.
