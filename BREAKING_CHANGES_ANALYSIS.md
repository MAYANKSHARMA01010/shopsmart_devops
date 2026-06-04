# Breaking Changes Analysis — Phase 1 Schema Migration
> Verified against actual code in: productService.ts, productController.ts, productSchema.ts, ProductCard.tsx, ProductsPage.tsx, productService.ts (client), hooks/useProducts.ts

---

## Summary Table

| Change | Severity | Files Affected | Requires Code Change |
|--------|----------|----------------|---------------------|
| `Product.id` Int → UUID | 🔴 Breaking | 6 server + 3 client files | Yes |
| `Product.price` Float → `basePrice` Decimal | 🔴 Breaking | 3 server + 2 client files | Yes |
| `Product.category` String → `categoryId` FK | 🔴 Breaking | 3 server + 2 client files | Yes |
| `Product.imageUrl` → `images[]` | 🟡 Moderate | 2 server + 2 client files | Yes |
| `Product.isVisible` added | 🟢 Additive | 1 server file | Minor |
| `Product.slug` added | 🟢 Additive | 1 server file | Minor |
| `Product.comparePrice` added | 🟢 Additive | 0 files | None |
| New models (User, Cart, Order...) | 🟢 Additive | 0 existing files | None |

---

## 1. `Product.id` — Int → UUID

### Impact: BREAKING

#### Server Impact

**`server/src/services/productService.ts`**
```typescript
// BEFORE (line 54): Int-based lookup
where: { id: Number.parseInt(id, 10) }

// AFTER (UUID string — no parseInt):
where: { id }  // id is already a string
```
All 4 service methods (`getProductById`, `updateProduct`, `deleteProduct`) use `Number.parseInt(id, 10)` — all must be updated.

**`server/src/controllers/productController.ts`**
- No direct ID parsing — delegates to service. Service changes are sufficient.

**`server/src/routes/productRoutes.ts`**
- Route param `:id` stays as string. No change needed.

**`server/src/validators/productValidator.ts`** (to be reviewed)
- May have an `id` validation rule. Needs to switch from `z.number()` to `z.string().uuid()`.

#### Client Impact

**`client/src/schemas/productSchema.ts` (line 16)**
```typescript
// BEFORE:
export interface Product extends ProductData {
  id: number;    // ← BREAKING
  ...
}

// AFTER:
export interface Product extends ProductData {
  id: string;   // UUID string
  ...
}
```

**`client/src/services/productService.ts`**
```typescript
// BEFORE (lines 8, 14, 17):
getById: (id: number): Promise<Product>
update: (id: number, data: ...): Promise<Product>
delete: (id: number): Promise<...>

// AFTER:
getById: (id: string): Promise<Product>
update: (id: string, data: ...): Promise<Product>
delete: (id: string): Promise<...>
```

**`client/src/components/ProductCard.tsx` (line 100)**
```typescript
// BEFORE:
onDelete={product.id}   // product.id was number

// The component receives (id: number) in its prop type — must change to string
```

**`client/src/components/__tests__/ProductCard.test.tsx`**
```typescript
// BEFORE:
const mockProduct = { id: 1, ... }

// AFTER:
const mockProduct = { id: '550e8400-e29b-41d4-a716-446655440000', ... }
```

**`client/src/pages/ProductsPage.tsx` (line 261)**
```typescript
// BEFORE:
deleting={deletingId === product.id}  // number comparison

// AFTER:
deleting={deletingId === product.id}  // string comparison (no syntax change, but type changes)
```

**`client/src/hooks/useProducts.ts`**
- `deletingId` state type changes from `number | null` to `string | null`

#### Test Impact
- `server/tests/app.test.ts`: `GET /api/products/999999` test — the 999999 int will still return 404 (server tries to find by string "999999", not found). Test passes unchanged. However, update to use `GET /api/products/invalid-uuid-format` to be more explicit.

---

## 2. `Product.price` Float → `Product.basePrice` Decimal

### Impact: BREAKING (field renamed + type changed)

#### Why `basePrice` and not `price`?
Renaming from `price` to `basePrice` makes room for `comparePrice` (the "was" price). Keeping the old name `price` would be misleading once comparison pricing exists.

#### Financial Precision Impact
```javascript
// BEFORE (Float): 
product.price = 19.9900000000001  // possible floating point error

// AFTER (Decimal → serialized as string from PostgreSQL):
product.basePrice = "19.99"       // exact string representation
```

> **Critical:** Prisma returns `Decimal` fields as JavaScript `Decimal` objects (from the `decimal.js` library), not native numbers. When serialized to JSON, they become strings like `"19.99"`. All client-side code that does `product.price.toFixed(2)` must change to handle string or Decimal correctly.

#### Server Impact

**`server/src/services/productService.ts`**
```typescript
// BEFORE (line 68):
price: Number.parseFloat(data.price)

// AFTER:
basePrice: new Decimal(data.basePrice),
// Or: let Prisma coerce — Prisma accepts number/string for Decimal fields
basePrice: data.basePrice,
```

**`server/src/controllers/productController.ts`**
- No direct price handling. Service changes sufficient.

#### Client Impact

**`client/src/schemas/productSchema.ts`**
```typescript
// BEFORE:
price: z.union([z.number(), z.string()]).transform(...)

// AFTER:
basePrice: z.union([z.number(), z.string()]).transform(...)
  .refine((val) => !isNaN(val) && val >= 0, "Price must be a positive number"),
```

**`client/src/components/ProductCard.tsx` (line 82-84)**
```typescript
// BEFORE:
aria-label={`Price: $${product.price.toFixed(2)}`}
${product.price.toFixed(2)}

// AFTER (Decimal serialized as string from API):
aria-label={`Price: $${parseFloat(product.basePrice as string).toFixed(2)}`}
${parseFloat(product.basePrice as string).toFixed(2)}
```
Or use a shared currency formatter utility (recommended).

**`client/src/pages/ProductsPage.tsx` (line 109)**
```typescript
// BEFORE:
const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

// AFTER:
const totalValue = products.reduce((sum, p) => sum + parseFloat(p.basePrice as string) * p.stock, 0);
```

---

## 3. `Product.category` String → `categoryId` FK

### Impact: BREAKING (field replaced entirely)

The existing `category: String?` field is replaced by `categoryId: String` (UUID FK) + a joined `category: Category` object.

#### API Response Change (BEFORE vs AFTER)

```json
// BEFORE:
{
  "id": 1,
  "category": "Electronics"
}

// AFTER (with Prisma include):
{
  "id": "550e8400-...",
  "categoryId": "a4f2c...",
  "category": {
    "id": "a4f2c...",
    "name": "Electronics",
    "slug": "electronics"
  }
}
```

OR (flat, without include — categoryId only):
```json
{
  "id": "550e8400-...",
  "categoryId": "a4f2c..."
}
```

**Decision required at M4:** Whether product responses include the full `category` object (nested) or just `categoryId` (flat, with separate categories endpoint). **Recommendation: include nested category object** — eliminates an extra API call on the product listing page.

#### Server Impact

**`server/src/services/productService.ts`**
```typescript
// BEFORE (line 27):
if (category) where.category = category;

// AFTER: category filter becomes a nested where on the relation
if (category) {
  where.category = { slug: category };
}

// And all findMany/findUnique calls need:
include: { category: true }
```

**Create product:**
```typescript
// BEFORE:
{ ...data, price: ..., stock: ... }

// AFTER:
{ ...data, basePrice: ..., stock: ..., categoryId: data.categoryId }
// The raw 'category' string field no longer exists
```

#### Client Impact

**`client/src/schemas/productSchema.ts`**
```typescript
// BEFORE:
category: z.string().optional().nullable()

// AFTER (form sends categoryId):
categoryId: z.string().uuid("Invalid category"),
```

**`client/src/components/ProductCard.tsx` (line 70-72)**
```typescript
// BEFORE:
{product.category && <span>{product.category}</span>}

// AFTER:
{product.category && <span>{product.category.name}</span>}
```

**`client/src/pages/ProductsPage.tsx`**
- `CATEGORIES` array is currently hardcoded strings → should become fetched from `/api/categories`
- Category filter currently sends string → should send category slug

---

## 4. `Product.imageUrl` String? → `Product.images` String[]

### Impact: MODERATE

Field renamed from `imageUrl` to `images` and changed from a single string to an array.

#### API Response Change

```json
// BEFORE:
{ "imageUrl": "https://picsum.photos/seed/1/400/400" }

// AFTER:
{ "images": ["https://picsum.photos/seed/1/400/400"] }
```

Empty image: `"imageUrl": null` → `"images": []`

#### Server Impact

**`server/src/services/productService.ts`** (create/update)
```typescript
// BEFORE:
imageUrl: data.imageUrl

// AFTER:
images: data.images || []
```

#### Client Impact

**`client/src/schemas/productSchema.ts`**
```typescript
// BEFORE:
imageUrl: z.string().url("Invalid image URL").optional().nullable().or(z.literal(""))

// AFTER:
images: z.array(z.string().url("Invalid image URL")).default([])
```

**`client/src/components/ProductCard.tsx` (lines 53-65)**
```typescript
// BEFORE:
{product.imageUrl ? (
  <img src={product.imageUrl} ... />
) : (
  <IconProductPlaceholder />
)}

// AFTER:
{product.images && product.images.length > 0 ? (
  <img src={product.images[0]} ... />
) : (
  <IconProductPlaceholder />
)}
```

---

## 5. API Response Envelope Change

Currently the product endpoints return raw Prisma objects with no envelope:
```json
GET /api/products → Product[]
GET /api/products/:id → Product
```

The `@shopsmart/types` package (created in M2) defines:
```typescript
interface ApiResponse<T> { data: T; message?: string; }
interface PaginatedResponse<T> { data: T[]; total: number; page: number; ... }
```

**Recommendation for M4:** Wrap responses in the standard envelope. This IS a breaking API change.

```json
// AFTER wrapping:
GET /api/products → { "data": [...], "total": 50, "page": 1, "totalPages": 5, "limit": 10 }
GET /api/products/:id → { "data": { ... } }
```

**Client impact:** The client's `productService.ts` currently destructures the response directly. After wrapping, it will need to access `response.data`.

> **This change is documented here but will be implemented in M4 (Product Service update), not M3.**

---

## 6. Frontend Impact Summary

| Component / File | Change Required | Risk |
|-----------------|----------------|------|
| `productSchema.ts` | id: number→string, price→basePrice, category→categoryId, imageUrl→images | 🔴 |
| `productService.ts` (client) | id types: number→string | 🔴 |
| `ProductCard.tsx` | imageUrl→images[0], price→basePrice, category→category.name | 🟡 |
| `ProductsPage.tsx` | price→basePrice arithmetic, categories from API | 🟡 |
| `useProducts.ts` | deletingId: number|null → string|null | 🟡 |
| `ProductForm.tsx` | imageUrl→images, category→categoryId select | 🟡 |
| `ProductCard.test.tsx` | mockProduct: id→UUID, imageUrl→images | 🟡 |

---

## 7. Test Impact

### Server Tests (`server/tests/app.test.ts`)

| Test | Change Required |
|------|----------------|
| `GET /api/products/999999` → 404 | Still works (string "999999" not found), but update to use a proper invalid UUID for clarity |
| `POST /api/products` validation | Must send `categoryId` (UUID) instead of `category` string, `basePrice` instead of `price`, `images` instead of `imageUrl` |
| `GET /api/health` | No change |
| `GET /api/products` | No change to test assertion; response shape changes internally |

### Client Tests (`client/src/components/__tests__/ProductCard.test.tsx`)

| Test | Change Required |
|------|----------------|
| All tests use `mockProduct.id: 1` | Change to `id: '550e8400-...'` (UUID string) |
| `renders product name and price` | Update: `$99.99` display now from `basePrice`, not `price` |
| `renders stock status` | No change |
| `calls onDelete with product id` | `onDelete` called with string UUID instead of number |
| Stock state tests | No change |

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Client-side `price.toFixed()` fails on Decimal string | High | UX broken | Implement shared `formatCurrency(val)` utility that handles both `number` and `string` |
| Category FK migration maps wrong category | Low | Data corruption | Verification query (Step M3-10, check 3) catches this |
| Slug collision during data migration | Low | Migration error | Migration SQL appends 6-char UUID suffix to guarantee uniqueness |
| `parseInt(id)` calls missed somewhere | Medium | 500 errors on ID routes | TypeScript will catch at compile time after `id` type changes to `string` |
| Frontend calling old `imageUrl` field | Medium | No image shown | TypeScript catches (field no longer exists on type) |
