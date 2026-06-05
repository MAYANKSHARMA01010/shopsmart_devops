# Milestone Report — M5: Auth System & Role-Based Authorization
> **Branch:** `main`
> **Status:** ✅ COMPLETE

---

## Summary

Implemented a production-grade, state-of-the-art authentication system with secure session handling (refresh token rotation) and role/permission-based access control. Registered security headers and rate limiters on the server side, migrated logging to Winston, and implemented Zustand-persisted client-side authentication, route guards, and forms.

---

## 1. Files Changed

### Created

#### Server
- `server/src/types/auth.ts`: Defines `JwtPayload` structure, `Permission` enum types, and central `RolePermissions` mapping.
- `server/src/middlewares/auth.middleware.ts`: Extracts and verifies Bearer JWT access tokens.
- `server/src/middlewares/rbac.middleware.ts`: Implements `requireRole` and role-to-permission checking `requirePermission` middlewares.
- `server/src/middlewares/rateLimit.middleware.ts`: Named rate-limiters (`globalLimiter`, `authLimiter`).
- `server/src/services/authService.ts`: Hashed password registry, session token creation, refresh token rotation (with JTI unique collision protection).
- `server/src/controllers/authController.ts`: Wraps register, login, refresh, logout, me, and profile update handlers in catchAsync.
- `server/src/routes/authRoutes.ts`: Exposes login, register, refresh, logout, profile update, and me endpoints.
- `server/src/validators/authValidator.ts`: Zod request validators for auth payloads.
- `server/tests/auth.test.ts`: Integration test suite covering all authentication endpoints (13 integration tests).

#### Client
- `client/src/schemas/authSchema.ts`: Login, registration, profile schemas and types.
- `client/src/stores/authStore.ts`: Persisted Zustand store for managing session variables (`user`, `accessToken`, `refreshToken`).
- `client/src/services/authService.ts`: Axios client wrapper for authentication endpoints.
- `client/src/context/AuthContext.tsx`: React auth context provider for global session management.
- `client/src/components/auth/LoginForm.tsx`: Sleek credentials login form with validation banners.
- `client/src/components/auth/RegisterForm.tsx`: Registration form with strict password checks.
- `client/src/components/auth/ProtectedRoute.tsx`: Client-side route guard with role restriction filters.
- `client/src/app/(auth)/login/page.tsx`: Next.js login page mount.
- `client/src/app/(auth)/register/page.tsx`: Next.js register page mount.

### Modified
| File | Change |
|------|--------|
| `server/src/types/express.d.ts` | Augmented Express request interface to type `req.user` with `JwtPayload`. |
| `server/src/server.ts` | Configured `helmet` security headers, global rate limiting, and mounted `/api/auth` routes. |
| `server/src/utils/logger.ts` | Replaced simple console logs with Winston colorized / JSON-transport structured logging. |
| `server/src/routes/productRoutes.ts` | Protected product write routes (POST, PUT, DELETE) with authentication and permission checks. |
| `server/tests/app.test.ts` | Updated product test runner to sign valid admin JWT tokens and attach authorization headers to validation calls. |
| `client/src/services/apiClient.ts` | Configured request headers injection and added response refresh interceptors for silent 401 token rotations. |
| `client/src/app/layout.tsx` | Wrapped the application structure inside client-side `AuthProvider`. |
| `client/src/components/Navbar.tsx` | Added session state greetings and sign-in/sign-out controls. |
| `client/src/components/ThemeToggle.tsx` | Suppressed synchronous effect warnings with standard ESLint annotations. |
| `client/src/paper/DevOps Practice Paper Set 2.jsx` | Escaped unescaped quote strings to enable full workspace build. |

---

## 2. Database Changes

**None** directly. (This milestone implements code layers consuming the `User`, `RefreshToken`, and `PasswordResetToken` tables defined in M3).

---

## 3. APIs Added

- `POST /api/auth/register` — User registration (with auto-username derivation).
- `POST /api/auth/login` — Sign in with email or username.
- `POST /api/auth/refresh` — Session renewal using refresh tokens.
- `POST /api/auth/logout` — Invalidation of refresh tokens.
- `GET /api/auth/me` — Fetches current user profile.
- `PUT /api/auth/profile` — Updates profile info.

---

## 4. Frontend Pages / Components Added

- **Login & Registration Pages**: Under `/login` and `/register`.
- **Protected Route Guard**: `<ProtectedRoute>` wrapper.
- **Dynamic Navbar**: Logged-in greetings and conditional buttons.

---

## 5. Security Improvements

- **Short-Lived Access Tokens**: JWTs expire in 15 minutes.
- **Refresh Token Hashing**: Hashed with SHA-256 in DB, rotated dynamically upon every call.
- **PBAC Security Pattern**: Explicit permissions (e.g. `products:create`) mapped to roles, preventing bypass or hardcoding of ADMIN tags.
- **HTTP Hardening**: Mounted Helmet middleware.
- **Rate Limiting**: Defends against brute-force attacks on login/register (15 req/15min) and general endpoints.

---

## 6. Testing

Auth integration tests are fully passing (13 tests under `server/tests/auth.test.ts`).

| Suite | Result |
|-------|--------|
| Server Auth Integration (`tests/auth.test.ts`) | ✅ 13/13 Passed |
| Workspace Tests | ✅ 25/25 Passed |
| Workspace Linter | ✅ Clean |
