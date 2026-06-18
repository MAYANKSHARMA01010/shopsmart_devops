/**
 * ShopSmart — Phase 1 Seed
 * Deterministic, idempotent seed using upsert throughout.
 * Running this script multiple times is safe — it will not create duplicates.
 *
 * Execution order (strict — do not reorder):
 *   1. Categories   (required before products)
 *   2. Admin user
 *   3. Products     (requires category IDs)
 *   4. Admin cart   (dev/staging only)
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── Types ─────────────────────────────────────────────────────────────────

interface CategorySeed {
  name: string;
  slug: string;
  description: string;
}

interface ProductSeed {
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  stock: number;
  images: string[];
  categorySlug: string;
}

// ─── 1. Categories ─────────────────────────────────────────────────────────

const CATEGORIES: CategorySeed[] = [
  { name: 'Electronics', slug: 'electronics', description: 'Gadgets, devices, and computing' },
  { name: 'Clothing', slug: 'clothing', description: 'Apparel and fashion' },
  { name: 'Home & Garden', slug: 'home-garden', description: 'Furniture, decor, and garden' },
  { name: 'Sports', slug: 'sports', description: 'Sports equipment and activewear' },
  { name: 'Toys', slug: 'toys', description: 'Games and toys for all ages' },
  { name: 'Books', slug: 'books', description: 'Print and digital books' },
  {
    name: 'Uncategorized',
    slug: 'uncategorized',
    description: 'Migration safety catch-all — do not delete',
  },
];

async function seedCategories(): Promise<Map<string, string>> {
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  const all = await prisma.category.findMany({ select: { slug: true, id: true } });
  const map = new Map(all.map((c) => [c.slug, c.id]));
  console.log(`✓ Categories: ${all.length} seeded`);
  return map;
}

// ─── 2. Admin User ─────────────────────────────────────────────────────────

async function seedAdminUser(): Promise<string> {
  const email = 'admin@shopsmart.dev';
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log('✓ Admin user already exists — skipping');
    return existing.id;
  }

  const hashedPassword = await bcrypt.hash('Admin@123456', 12);

  const admin = await prisma.user.create({
    data: {
      name: 'ShopSmart Admin',
      email,
      username: 'admin',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isEmailVerified: true,
    },
  });

  console.log(`✓ Admin user created: ${admin.email} (role: ${admin.role})`);
  return admin.id;
}

// ─── 3. Products ───────────────────────────────────────────────────────────

const PRODUCTS: ProductSeed[] = [
  // Electronics
  {
    name: 'Mechanical Keyboard Pro',
    slug: 'mechanical-keyboard-pro',
    description:
      'Full-size mechanical keyboard with Cherry MX Red switches, RGB backlight, and aircraft-grade aluminium frame. Tactile, silent, and built for endurance.',
    basePrice: 7999.0,
    stock: 45,
    images: ['https://picsum.photos/seed/kbd1/400/400'],
    categorySlug: 'electronics',
  },
  {
    name: 'Wireless Mouse Ultra',
    slug: 'wireless-mouse-ultra',
    description:
      'Ergonomic wireless mouse with 25,600 DPI, 70-hour battery life, and 2.4GHz + Bluetooth connectivity.',
    basePrice: 2499.0,
    stock: 80,
    images: ['https://picsum.photos/seed/mouse1/400/400'],
    categorySlug: 'electronics',
  },
  {
    name: '27-inch 4K Monitor',
    slug: '27-inch-4k-monitor',
    description:
      'IPS 4K UHD display, 144Hz refresh rate, HDR600, USB-C 65W power delivery. Built for creative professionals.',
    basePrice: 32999.0,
    stock: 12,
    images: ['https://picsum.photos/seed/mon1/400/400'],
    categorySlug: 'electronics',
  },
  {
    name: 'Aluminium Laptop Stand',
    slug: 'aluminium-laptop-stand',
    description:
      'Adjustable aluminium laptop stand, compatible with 10–17 inch laptops. Folds flat for portability.',
    basePrice: 1899.0,
    stock: 60,
    images: ['https://picsum.photos/seed/stand1/400/400'],
    categorySlug: 'electronics',
  },
  {
    name: 'USB-C Hub 8-in-1',
    slug: 'usbc-hub-8-in-1',
    description:
      '8-in-1 USB-C hub with 4K HDMI, 100W PD pass-through, SD card reader, 3× USB-A 3.0, Ethernet.',
    basePrice: 3299.0,
    stock: 35,
    images: ['https://picsum.photos/seed/hub1/400/400'],
    categorySlug: 'electronics',
  },
  // Clothing
  {
    name: 'Cotton Classic T-Shirt',
    slug: 'cotton-classic-t-shirt',
    description: '100% organic cotton crew-neck T-shirt. Pre-shrunk, breathable, available in 8 colours.',
    basePrice: 799.0,
    stock: 200,
    images: ['https://picsum.photos/seed/tee1/400/400'],
    categorySlug: 'clothing',
  },
  {
    name: 'Slim Fit Chinos',
    slug: 'slim-fit-chinos',
    description:
      'Stretch slim-fit chinos in premium cotton blend. Wrinkle-resistant, 4-way stretch, ideal for office or casual wear.',
    basePrice: 1499.0,
    stock: 150,
    images: ['https://picsum.photos/seed/chinos1/400/400'],
    categorySlug: 'clothing',
  },
  {
    name: 'Running Sneakers Pro',
    slug: 'running-sneakers-pro',
    description:
      'Lightweight running shoes with responsive foam midsole, breathable mesh upper, and durable rubber outsole.',
    basePrice: 4999.0,
    stock: 40,
    images: ['https://picsum.photos/seed/shoe1/400/400'],
    categorySlug: 'clothing',
  },
  // Home & Garden
  {
    name: 'Wooden Desk Lamp',
    slug: 'wooden-desk-lamp',
    description:
      'Minimalist solid walnut desk lamp with 3-level dimmer, USB charging port, and warm LED bulb included.',
    basePrice: 2199.0,
    stock: 25,
    images: ['https://picsum.photos/seed/lamp1/400/400'],
    categorySlug: 'home-garden',
  },
  {
    name: 'Ergonomic Office Chair',
    slug: 'ergonomic-office-chair',
    description:
      'Fully adjustable ergonomic chair with lumbar support, 4D armrests, mesh back, and 5-year warranty.',
    basePrice: 18999.0,
    stock: 8,
    images: ['https://picsum.photos/seed/chair1/400/400'],
    categorySlug: 'home-garden',
  },
  // Sports
  {
    name: 'Yoga Mat Premium',
    slug: 'yoga-mat-premium',
    description:
      '6mm thick non-slip yoga mat with alignment lines, eco-friendly TPE material, carrying strap included.',
    basePrice: 1299.0,
    stock: 100,
    images: ['https://picsum.photos/seed/yoga1/400/400'],
    categorySlug: 'sports',
  },
  {
    name: 'Dumbbell Set 10kg',
    slug: 'dumbbell-set-10kg',
    description:
      'Pair of 10kg hex dumbbells with rubberised coating, anti-roll design, and textured grip handle.',
    basePrice: 2799.0,
    stock: 30,
    images: ['https://picsum.photos/seed/dumbbell1/400/400'],
    categorySlug: 'sports',
  },
  // Toys
  {
    name: 'LEGO Classic Creative Set',
    slug: 'lego-classic-creative-set',
    description:
      '1500-piece LEGO Classic set with 33 colour bricks, 6 project idea booklet, ages 4+. Award-winning design.',
    basePrice: 3499.0,
    stock: 55,
    images: ['https://picsum.photos/seed/lego1/400/400'],
    categorySlug: 'toys',
  },
  // Books
  {
    name: 'Atomic Habits',
    slug: 'atomic-habits',
    description:
      'James Clear — The #1 global bestseller on building good habits and breaking bad ones. Paperback, 320 pages.',
    basePrice: 499.0,
    stock: 120,
    images: ['https://picsum.photos/seed/book1/400/400'],
    categorySlug: 'books',
  },
  {
    name: 'Clean Code',
    slug: 'clean-code',
    description:
      'Robert C. Martin — A handbook of agile software craftsmanship. Essential reading for every software engineer.',
    basePrice: 899.0,
    stock: 65,
    images: ['https://picsum.photos/seed/book2/400/400'],
    categorySlug: 'books',
  },
];

async function seedProducts(categoryMap: Map<string, string>): Promise<void> {
  for (const product of PRODUCTS) {
    const categoryId = categoryMap.get(product.categorySlug);
    if (!categoryId) {
      throw new Error(`Category not found in map: "${product.categorySlug}". Run seedCategories first.`);
    }

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
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

  console.log(`✓ Products: ${PRODUCTS.length} seeded`);
}

// ─── 4. Admin Cart ─────────────────────────────────────────────────────────

async function seedAdminCart(adminId: string): Promise<void> {
  await prisma.cart.upsert({
    where: { userId: adminId },
    update: {},
    create: { userId: adminId },
  });
  console.log('✓ Admin cart created');
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`\n🌱 ShopSmart Phase 1 Seed (env: ${process.env.NODE_ENV ?? 'development'})\n`);

  // Step 1: Categories
  const categoryMap = await seedCategories();

  // Step 2: Admin user
  const adminId = await seedAdminUser();

  // Step 3: Products
  await seedProducts(categoryMap);

  // Step 4: Admin cart (dev/staging only)
  if (!isProduction) {
    await seedAdminCart(adminId);
  }

  console.log('\n✅ Seed complete\n');
}

main()
  .catch((e: unknown) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
