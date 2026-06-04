# Seed Strategy — Phase 1
> Verified against: existing `server/prisma/seed.ts` (50-product random seed)
> The existing seed is replaced entirely. The new seed is deterministic and idempotent.

---

## Seed Execution Order

```
1. Seed roles → not applicable (roles are an enum, not a table)
2. Seed categories  ← must run BEFORE products
3. Seed admin user
4. Seed products    ← depends on categories
5. Seed dev data    ← only in development
```

---

## 1. Categories Seed

### Why categories must be seeded first
`Product.categoryId` is a required non-nullable FK. If the category rows don't exist when products are inserted, the FK constraint fails. Category seed is also required during the M3-6 data migration (SQL migration uses category slugs to map old string values).

### Required Categories (Phase 1)

| Name | Slug | Parent | Description |
|------|------|--------|-------------|
| Electronics | electronics | — | Gadgets, devices, computing |
| Clothing | clothing | — | Apparel and fashion |
| Home & Garden | home-garden | — | Furniture, decor, garden |
| Sports | sports | — | Equipment and activewear |
| Toys | toys | — | Games and toys |
| Books | books | — | Print and digital books |
| **Uncategorized** | **uncategorized** | — | Migration safety catch-all |

The `Uncategorized` category must always exist. It is the FK target for any products whose original `category` string didn't match a known category during migration.

### Seed Code
```typescript
async function seedCategories() {
  const categories = [
    { name: 'Electronics', slug: 'electronics', description: 'Gadgets, devices, and computing' },
    { name: 'Clothing', slug: 'clothing', description: 'Apparel and fashion' },
    { name: 'Home & Garden', slug: 'home-garden', description: 'Furniture, decor, and garden' },
    { name: 'Sports', slug: 'sports', description: 'Sports equipment and activewear' },
    { name: 'Toys', slug: 'toys', description: 'Games and toys for all ages' },
    { name: 'Books', slug: 'books', description: 'Print and digital books' },
    { name: 'Uncategorized', slug: 'uncategorized', description: 'Fallback category for migration' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},  // Do not overwrite existing categories
      create: cat,
    });
  }
  console.log(`✓ Categories seeded: ${categories.length}`);
}
```

**Idempotency:** Uses `upsert` with `update: {}` — running the seed twice will not duplicate or overwrite categories.

---

## 2. Roles

Roles are a PostgreSQL enum (`Role` type), not a database table. They cannot be "seeded" — they are defined in the schema and created via migration.

```
Role values:
- SUPER_ADMIN  ← created manually or via admin seed script
- ADMIN        ← assigned by SUPER_ADMIN
- VENDOR       ← Phase 3 feature
- CUSTOMER     ← default for all registered users
```

No seed step required.

---

## 3. Admin Account Seed

### Why an admin seed is necessary
Without at least one `ADMIN` or `SUPER_ADMIN` user, the admin-only endpoints (product create/update/delete, category management) cannot be tested during development. The admin account is created via seed, not via the public registration endpoint.

### Admin Account Values (Development Only)

| Field | Value |
|-------|-------|
| name | ShopSmart Admin |
| email | `admin@shopsmart.dev` |
| password | `Admin@123456` (hashed with bcrypt, cost factor 12) |
| role | `SUPER_ADMIN` |
| isEmailVerified | `true` |
| username | `admin` |

> **Security note:** The seed admin password is only for local development and staging. Production admin credentials must be set via a separate secure process (environment variable injection, not the seed file).

### Seed Code
```typescript
import bcrypt from 'bcrypt';

async function seedAdminUser() {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@shopsmart.dev' }
  });

  if (existingAdmin) {
    console.log('✓ Admin user already exists — skipping');
    return existingAdmin;
  }

  const hashedPassword = await bcrypt.hash('Admin@123456', 12);

  const admin = await prisma.user.create({
    data: {
      name: 'ShopSmart Admin',
      email: 'admin@shopsmart.dev',
      username: 'admin',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isEmailVerified: true,
    },
  });

  console.log(`✓ Admin user created: ${admin.email} (role: ${admin.role})`);
  return admin;
}
```

**Idempotency:** Checks for existing email before creating. Running twice is safe.

---

## 4. Development Products Seed

The existing seed creates 50 random products with random string categories and a single `imageUrl`. It is replaced with a deterministic seed that uses proper category FKs.

### Seed Products (15 deterministic entries across 6 categories)

| # | Name | Category | Base Price | Stock | Images |
|---|------|----------|-----------|-------|--------|
| 1 | Mechanical Keyboard Pro | Electronics | ₹7,999.00 | 45 | picsum |
| 2 | Wireless Mouse Ultra | Electronics | ₹2,499.00 | 80 | picsum |
| 3 | 27" 4K Monitor | Electronics | ₹32,999.00 | 12 | picsum |
| 4 | Laptop Stand Aluminium | Electronics | ₹1,899.00 | 60 | picsum |
| 5 | USB-C Hub 8-in-1 | Electronics | ₹3,299.00 | 35 | picsum |
| 6 | Cotton Classic T-Shirt | Clothing | ₹799.00 | 200 | picsum |
| 7 | Slim Fit Chinos | Clothing | ₹1,499.00 | 150 | picsum |
| 8 | Running Sneakers Pro | Clothing | ₹4,999.00 | 40 | picsum |
| 9 | Wooden Desk Lamp | Home & Garden | ₹2,199.00 | 25 | picsum |
| 10 | Ergonomic Office Chair | Home & Garden | ₹18,999.00 | 8 | picsum |
| 11 | Yoga Mat Premium | Sports | ₹1,299.00 | 100 | picsum |
| 12 | Dumbbell Set 10kg | Sports | ₹2,799.00 | 30 | picsum |
| 13 | LEGO Classic Set | Toys | ₹3,499.00 | 55 | picsum |
| 14 | Atomic Habits | Books | ₹499.00 | 120 | picsum |
| 15 | Clean Code | Books | ₹899.00 | 65 | picsum |

Products 3 and 10 have low stock (≤12) — useful for testing low-stock UI states.

### Seed Code

```typescript
async function seedProducts(categoryMap: Map<string, string>) {
  const products = [
    {
      name: 'Mechanical Keyboard Pro',
      slug: 'mechanical-keyboard-pro',
      description: 'Full-size mechanical keyboard with Cherry MX Red switches, RGB backlight, and aluminium frame.',
      basePrice: 7999.00,
      stock: 45,
      images: ['https://picsum.photos/seed/kb1/400/400'],
      categorySlug: 'electronics',
    },
    // ... (all 15 entries)
  ];

  for (const product of products) {
    const categoryId = categoryMap.get(product.categorySlug);
    if (!categoryId) throw new Error(`Category not found: ${product.categorySlug}`);

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},  // Do not overwrite existing products
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        basePrice: product.basePrice,
        stock: product.stock,
        images: product.images,
        isVisible: true,
        categoryId,
      },
    });
  }
  console.log(`✓ Products seeded: ${products.length}`);
}
```

**Idempotency:** Uses `upsert` with slug as the where key. Safe to run multiple times.

---

## 5. Cart Seed (Development Only)

The seed optionally creates a cart for the admin user. This is not strictly necessary but speeds up development:

```typescript
async function seedAdminCart(adminId: string) {
  await prisma.cart.upsert({
    where: { userId: adminId },
    update: {},
    create: { userId: adminId },
  });
  console.log('✓ Admin cart created');
}
```

---

## 6. Complete `seed.ts` Structure

```typescript
// server/prisma/seed.ts (replacement for current random seed)
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Phase 1 seed...');

  // Step 1: Categories (must be first)
  await seedCategories();

  // Step 2: Build category slug → id map for product seeding
  const categories = await prisma.category.findMany();
  const categoryMap = new Map(categories.map(c => [c.slug, c.id]));

  // Step 3: Admin user
  const admin = await seedAdminUser();

  // Step 4: Products (uses categoryMap)
  await seedProducts(categoryMap);

  // Step 5: Admin cart (dev convenience)
  if (process.env.NODE_ENV !== 'production') {
    await seedAdminCart(admin.id);
  }

  console.log('✅ Seed complete');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

---

## 7. Seed Idempotency Guarantee

| Seed step | Idempotency mechanism |
|-----------|----------------------|
| Categories | `upsert` on `slug` — safe to run multiple times |
| Admin user | Check-before-create on `email` — safe to run multiple times |
| Products | `upsert` on `slug` — safe to run multiple times |
| Admin cart | `upsert` on `userId` — safe to run multiple times |

Running `pnpm db:seed` twice on a clean database will not create duplicates.

---

## 8. Environment Behaviour

| Seed step | Development | Staging | Production |
|-----------|------------|---------|-----------|
| Categories | ✅ Run | ✅ Run | ✅ Run |
| Admin user | ✅ Run | ✅ Run | ⚠️ Run once then remove admin password from env |
| Products (15 items) | ✅ Run | ✅ Run | ❌ Skip (use real product import) |
| Admin cart | ✅ Run | ❌ Skip | ❌ Skip |

The seed script checks `process.env.NODE_ENV` and `process.env.SEED_PRODUCTS` to gate development-only steps.

---

## 9. Dependencies Required

| Package | Already Present | Needed For |
|---------|----------------|-----------|
| `@prisma/client` | ✅ Yes | All DB access |
| `bcrypt` | ❌ No | Hashing admin password in seed |
| `@types/bcrypt` | ❌ No | TypeScript types |

`bcrypt` must be added to `server/package.json` as a production dependency (it's also needed in M5 for auth). Adding it in the seed now means M5 can depend on it being present.
