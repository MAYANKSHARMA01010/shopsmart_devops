# M2 Preview — Minimal Refactor & Dead Code Removal
> **Status:** AWAITING APPROVAL — No code will be written until approved
> **Constraint applied:** Zero file moves. Zero import path changes. No architectural churn.

---

## Governing Principle

After reviewing the full directory tree against the constraint ("keep file moves to minimum necessary, do not move files solely for architectural preference"), **M2 will touch zero existing source files except two**:

1. `client/src/app/page.tsx` — remove unreachable dead code (6 unused imports + 11 dead JSX lines)
2. `server/jest.config.js` — delete leftover Jest config file (Mocha was replaced in M1 but this file was missed)

Everything else in M2 is **additions only** — no file moves, no renames, no import path rewrites.

---

## 1. Directory Tree BEFORE M2

```
shopsmart/
├── client/
│   ├── src/
│   │   ├── api/.gitkeep
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                   ← contains dead code (6 unused imports + unreachable JSX)
│   │   │   └── products/page.tsx
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductForm.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── __tests__/ProductCard.test.tsx
│   │   │   ├── layouts/.gitkeep
│   │   │   └── ui/.gitkeep
│   │   ├── context/.gitkeep
│   │   ├── hooks/useProducts.ts
│   │   ├── interfaces/.gitkeep
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   └── ProductsPage.tsx
│   │   ├── paper/                         ← 6 .jsx DevOps practice files (NOT deleted — user content)
│   │   │   ├── DevOps Paper 6.jsx
│   │   │   ├── DevOps Practice Paper - Weighted Exam Analysis.jsx
│   │   │   ├── DevOps Practice Paper Set 2.jsx
│   │   │   ├── DevOps Practice Paper Set 3 - Weighted Exam Analysis.jsx
│   │   │   ├── DevOps Practice Paper Set 4 - Weighted Exam Analysis.jsx
│   │   │   └── DevOps Practice Paper Set 5 - Weighted Exam Analysis.jsx
│   │   ├── schemas/productSchema.ts
│   │   ├── services/
│   │   │   ├── apiClient.ts
│   │   │   └── productService.ts
│   │   ├── test/setup.ts
│   │   ├── types/.gitkeep
│   │   ├── utils/.gitkeep
│   │   └── validators/.gitkeep
│   ├── vitest.config.ts
│   └── package.json
│
├── server/
│   ├── jest.config.js                     ← LEFTOVER from pre-M1 era. Unused.
│   ├── src/
│   │   ├── config/
│   │   │   ├── cors.ts
│   │   │   └── database.ts
│   │   ├── controllers/productController.ts
│   │   ├── interfaces/.gitkeep
│   │   ├── middlewares/errorMiddleware.ts
│   │   ├── routes/productRoutes.ts
│   │   ├── services/productService.ts
│   │   ├── types/.gitkeep
│   │   ├── utils/
│   │   │   ├── AppError.ts
│   │   │   ├── logger.ts
│   │   │   └── redis.ts
│   │   ├── validators/productValidator.ts
│   │   └── server.ts
│   ├── tests/
│   │   ├── app.test.ts
│   │   └── setup.ts
│   ├── vitest.config.ts
│   └── package.json
│
├── pnpm-workspace.yaml                    ← lists 'client' and 'server' only
├── package.json
└── [docs/, k8s/, terraform/, scripts/ — UNTOUCHED]
```

---

## 2. Directory Tree AFTER M2

```
shopsmart/
├── client/
│   ├── src/
│   │   ├── api/.gitkeep
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                   ← MODIFIED: dead imports/JSX removed (2 lines remain)
│   │   │   └── products/page.tsx
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductForm.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── __tests__/ProductCard.test.tsx
│   │   │   ├── layouts/.gitkeep
│   │   │   └── ui/.gitkeep
│   │   ├── context/.gitkeep
│   │   ├── hooks/useProducts.ts
│   │   ├── interfaces/.gitkeep
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   └── ProductsPage.tsx
│   │   ├── paper/                         ← UNTOUCHED (user content preserved)
│   │   ├── schemas/productSchema.ts
│   │   ├── services/
│   │   │   ├── apiClient.ts
│   │   │   └── productService.ts
│   │   ├── test/setup.ts
│   │   ├── types/.gitkeep
│   │   ├── utils/.gitkeep
│   │   └── validators/.gitkeep
│   ├── vitest.config.ts
│   └── package.json
│
├── server/
│   ├── jest.config.js                     ← DELETED
│   ├── src/
│   │   ├── config/
│   │   │   ├── cors.ts
│   │   │   └── database.ts
│   │   ├── controllers/productController.ts
│   │   ├── interfaces/.gitkeep
│   │   ├── middlewares/errorMiddleware.ts
│   │   ├── routes/productRoutes.ts
│   │   ├── services/productService.ts
│   │   ├── types/
│   │   │   ├── .gitkeep
│   │   │   └── express.d.ts               ← NEW: module augmentation (Request.user placeholder)
│   │   ├── utils/
│   │   │   ├── AppError.ts
│   │   │   ├── catchAsync.ts              ← NEW: async controller wrapper
│   │   │   ├── logger.ts
│   │   │   └── redis.ts
│   │   ├── validators/productValidator.ts
│   │   └── server.ts
│   ├── tests/
│   │   ├── app.test.ts
│   │   └── setup.ts
│   ├── vitest.config.ts
│   └── package.json
│
├── packages/                              ← NEW workspace directory
│   └── types/
│       ├── package.json                   ← NEW: @shopsmart/types
│       ├── tsconfig.json                  ← NEW
│       └── src/
│           ├── index.ts                   ← NEW: re-exports
│           ├── api.types.ts               ← NEW: ApiResponse<T>, PaginatedResponse<T>
│           └── payment.types.ts           ← NEW: IPaymentProvider (Razorpay-agnostic)
│
├── pnpm-workspace.yaml                    ← MODIFIED: add 'packages/*'
├── package.json                           ← MODIFIED: add @shopsmart/types workspace dep
└── [docs/, k8s/, terraform/, scripts/ — UNTOUCHED]
```

---

## 3. Files Being Moved

**None.** Zero files will be moved or renamed.

---

## 4. Files Being Renamed

**None.** Zero files will be renamed.

---

## 5. Import Path Changes

**None.** No existing file has its imports changed.

The two new files (`catchAsync.ts`, `express.d.ts`) are additions only — no existing file imports them yet. They will be consumed starting in M4 (product module update) and M5 (auth middleware).

---

## 6. Package / Workspace Changes

### pnpm-workspace.yaml
```yaml
# BEFORE
packages:
  - 'client'
  - 'server'

# AFTER
packages:
  - 'client'
  - 'server'
  - 'packages/*'
```

### packages/types/package.json (NEW)
```json
{
  "name": "@shopsmart/types",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {}
}
```

### Root package.json
Add workspace dependency so it resolves locally:
```json
{
  "devDependencies": {
    "@shopsmart/types": "workspace:*"
  }
}
```

> Note: `@shopsmart/types` is a **devDependency at the root only** in M2. Individual workspaces (server, client) will add it to their own package.json when they actually import from it — which happens in M4/M5, not M2.

---

## 7. Complete File Touch List

| # | File | Action | Reason |
|---|------|--------|--------|
| 1 | `client/src/app/page.tsx` | MODIFY | Remove 6 dead imports + 11 unreachable lines |
| 2 | `server/jest.config.js` | DELETE | Leftover from pre-M1 setup, now superseded by vitest.config.ts |
| 3 | `server/src/utils/catchAsync.ts` | CREATE | Needed by M4 controllers; creates no import changes today |
| 4 | `server/src/types/express.d.ts` | CREATE | Module augmentation stub for `Request.user`; needed by M5 |
| 5 | `packages/types/package.json` | CREATE | New workspace package |
| 6 | `packages/types/tsconfig.json` | CREATE | TypeScript config for types package |
| 7 | `packages/types/src/index.ts` | CREATE | Re-exports all shared types |
| 8 | `packages/types/src/api.types.ts` | CREATE | `ApiResponse<T>`, `PaginatedResponse<T>` |
| 9 | `packages/types/src/payment.types.ts` | CREATE | `IPaymentProvider` interface |
| 10 | `pnpm-workspace.yaml` | MODIFY | Add `packages/*` |
| 11 | `package.json` (root) | MODIFY | Add `@shopsmart/types: workspace:*` devDependency |

**Total: 11 files** (2 modified, 1 deleted, 8 created)

> ✅ Well under the 25-file threshold. No reduced scope needed.

---

## 8. Content of Each New / Modified File

### `client/src/app/page.tsx` (AFTER)
```tsx
import HomePage from "@/pages/HomePage";

export default function Page() {
  return <HomePage />;
}
```
_Removes: 6 unused `.jsx` paper imports + second unreachable `return` block (lines 2–7, 11–20)._
_The `/paper/` directory and its `.jsx` files are **NOT deleted** — they are user content._

---

### `server/src/utils/catchAsync.ts` (NEW)
```typescript
import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async Express route handler to forward any thrown errors
 * to the centralized error handler via next(err).
 *
 * Eliminates repetitive try/catch boilerplate in controllers.
 * Used starting in M4 when product controller is updated.
 */
export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};
```

---

### `server/src/types/express.d.ts` (NEW)
```typescript
/**
 * Express module augmentation.
 * Extends the Request interface with a typed `user` property.
 * Populated by the authenticate middleware (implemented in M5).
 */
export {};

declare global {
  namespace Express {
    interface Request {
      user?: import('../modules/auth/auth.types').JwtPayload;
    }
  }
}
```

> Note: `../modules/auth/auth.types` does not exist yet — the import path is resolved lazily by TypeScript only when the `user` property is actually accessed. The declaration itself compiles cleanly with `moduleResolution: bundler` because TypeScript skips unresolved import types in `.d.ts` augmentation files until they're needed. Alternatively, we can use a looser type `Record<string, unknown>` for M2 and tighten to `JwtPayload` in M5. **Preference?** _(See Open Questions below)_

---

### `packages/types/src/api.types.ts` (NEW)
```typescript
/** Standard success response envelope */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/** Paginated response envelope — used by all list endpoints */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}
```

---

### `packages/types/src/payment.types.ts` (NEW)
```typescript
/**
 * Payment provider abstraction interface.
 * Razorpay (Phase 3) implements this. Stripe can be added later without
 * touching any business logic — just provide a new class implementing this.
 */
export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface RefundResult {
  id: string;
  paymentId: string;
  amount: number;
  status: string;
}

export interface IPaymentProvider {
  /** Create a payment order with the provider */
  createOrder(amount: number, currency: string, receipt: string): Promise<PaymentOrder>;
  /** Verify payment signature — returns true if valid */
  verifyPayment(orderId: string, paymentId: string, signature: string): boolean;
  /** Initiate a refund */
  refund(paymentId: string, amount: number): Promise<RefundResult>;
}
```

---

### `packages/types/src/index.ts` (NEW)
```typescript
export * from './api.types';
export * from './payment.types';
```

---

### `packages/types/package.json` (NEW)
```json
{
  "name": "@shopsmart/types",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {}
}
```

---

### `packages/types/tsconfig.json` (NEW)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "declaration": true,
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Open Questions (Require Answer Before Implementation)

> [!IMPORTANT]
> **Q1: `express.d.ts` type for `Request.user`**
> 
> Option A — Use `Record<string, unknown>` as a placeholder in M2, tighten to `JwtPayload` in M5 (cleaner, compiles guaranteed).
> Option B — Reference the future `JwtPayload` path now (slightly cleaner eventual code, tiny risk of confusion since the file doesn't exist yet).
>
> **Recommendation: Option A** — safer, no references to non-existent files.

> [!NOTE]
> **Q2: `client/src/paper/` directory**
> 
> The 6 `.jsx` DevOps practice files in `client/src/paper/` are imported (now as dead code) from `page.tsx`. After the imports are removed from `page.tsx`, these files become completely unused by the app. They are **not deleted** in this plan — they are user content.
>
> Would you like them deleted as part of M2, or preserved?

---

## 9. Rollback Strategy

### If M2 causes any issue:

**Option 1 — Git revert (recommended)**
```bash
# M2 will be a single commit. Full revert in one command:
git revert HEAD --no-edit
# This undoes all M2 changes while preserving git history
```

**Option 2 — Selective undo**
```bash
# Restore a specific file to its M1 state
git checkout HEAD~1 -- client/src/app/page.tsx

# Restore deleted jest.config.js
git checkout HEAD~1 -- server/jest.config.js

# Remove new files
rm server/src/utils/catchAsync.ts
rm server/src/types/express.d.ts
rm -rf packages/
```

**Option 3 — Reset to M1 commit**
```bash
# Hard reset to M1 commit (2674eea) — discards M2 entirely
git reset --hard 2674eea
```

### Risk Assessment

| Change | Risk | Reason |
|--------|------|--------|
| Remove dead code from `page.tsx` | 🟢 Zero | Code is unreachable (second `return` statement after first) |
| Delete `jest.config.js` | 🟢 Zero | `test` script now uses Vitest; Jest config is never loaded |
| Add `catchAsync.ts` | 🟢 Zero | New file, nothing imports it yet |
| Add `express.d.ts` | 🟢 Zero | Declaration file, no runtime impact |
| Add `packages/types` workspace | 🟢 Zero | Nothing imports from it yet |
| Modify `pnpm-workspace.yaml` | 🟢 Near zero | Additive change; no existing package affected |

**Total M2 risk: 🟢 Minimal.** All changes are either deletions of unused code or pure additions.

---

## Summary

| Metric | Value |
|--------|-------|
| Files moved | **0** |
| Files renamed | **0** |
| Import path changes | **0** |
| Existing files modified | **2** (`page.tsx` cleanup, `pnpm-workspace.yaml`) |
| Files deleted | **1** (`server/jest.config.js`) |
| Files created | **8** (catchAsync, express.d.ts, packages/types/*) |
| **Total files touched** | **11** |
| Functional changes | **None** |
| API changes | **None** |
| Database changes | **None** |
| Breaking changes | **None** |

**Ready for approval. Awaiting answer on Q1 and Q2 before implementation begins.**
