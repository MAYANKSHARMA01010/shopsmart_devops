# Testing Strategy

Three layers of automated tests. Each one has a specific purpose, runs
in a specific place, and produces specific evidence.

---

## Test pyramid

```
              ┌─────────────────┐
              │  E2E (Playwright)│   client/e2e/
              │  full browser    │
              └─────────────────┘
              ┌──────────────────────┐
              │  Integration         │   server/tests/
              │  Mocha + Supertest   │   real Postgres
              │  + real Express app  │
              └──────────────────────┘
              ┌────────────────────────────┐
              │  Unit (Jest + RTL)         │   client/src/.../__tests__/
              │  components in isolation   │
              └────────────────────────────┘
```

Both lower layers run on every push/PR via
`.github/workflows/rubric-deployment.yml`. E2E is run on demand
(documented below) but not gated in CI today.

---

## Layer 1 — Backend integration (Mocha + Chai + Supertest)

| Property | Value |
|---|---|
| Location | `server/tests/app.test.ts` |
| Command | `cd server && pnpm test` |
| Coverage tool | `c8` (V8-native) |
| Coverage output | `server/coverage/` (lcov + text) |
| CI artifact | `shopsmart-test-reports` (uploaded by `rubric-deployment.yml`) |

### What the tests do
- Spin up a real Postgres (provided by the `services.postgres` block in
  the workflow, or your local DB).
- Boot the Express app via the default export from `src/server.ts`.
- Hit `/api/health`, `/api/products`, etc. with Supertest.
- Assert HTTP status, response shape, and side effects.

### Why integration over unit (for the backend)
The interesting bugs are at the seams: Prisma + Postgres, Express +
Zod, Redis fallback. Pure unit tests of route handlers tend to mock the
seams and miss the actual failures. Spinning up the real app and DB is
fast enough at this scale and gives you real signal.

### Local setup
```bash
# Postgres must be running on localhost:5432
cd server
cp .env.example .env                 # set DATABASE_URL
pnpm db:push                         # sync schema to test DB
pnpm test                            # runs c8 + mocha → coverage/
```

---

## Layer 2 — Frontend unit (Jest + React Testing Library)

| Property | Value |
|---|---|
| Location | `client/src/components/__tests__/` |
| Command | `cd client && pnpm test` |
| Coverage | `--coverage` flag set in the `test` script → `client/coverage/` |
| CI artifact | Same `shopsmart-test-reports` archive |

### Conventions
- Test file lives next to the component, in `__tests__/` directory.
- Use `@testing-library/react` `render` + `screen` queries.
- No snapshot tests by default — they tend to grow stale and get
  rubber-stamped.
- Mock Axios at the module boundary; don't mock individual functions.

```bash
cd client
pnpm test                            # runs Jest with --coverage
pnpm test:watch                      # local TDD loop
```

---

## Layer 3 — E2E (Playwright)

| Property | Value |
|---|---|
| Location | `client/e2e/*.spec.ts` |
| Command | `cd client && npx playwright test` |
| Interactive UI | `npx playwright test --ui` |
| In CI? | No (documented for completeness) |

### Setup
```bash
cd client
npx playwright install               # one-time browser download
# Backend + Postgres must be running
npx playwright test                  # runs full suite headless
```

### What's covered
- Landing on home page.
- Navigating to product detail.
- Creating a product end-to-end.

### Why not in CI today
E2E pulls in a full headless Chrome/Firefox/Webkit per run, which:
- Doubles the testing job duration.
- Needs the entire stack (frontend + backend + DB + cache) up.

For a hackathon-scale project the current ROI is low. Wire it in once
the system has multiple developers who actually break user flows on PRs.

---

## How CI runs the tests

`.github/workflows/rubric-deployment.yml`, job `testing`:

```yaml
services:
  postgres: ...      # real DB for the duration of the job
  redis: ...

steps:
  - uses: pnpm/action-setup@v2
  - uses: actions/setup-node@v4
  - name: Install Dependencies
    run: |
      cd server && pnpm install --no-frozen-lockfile
      cd ../client && pnpm install --no-frozen-lockfile
  - name: Run Tests & Generate Reports
    env:
      DATABASE_URL: postgresql://postgres:password@localhost:5432/shopsmart_test
    run: |
      cd server && pnpm prisma db push && pnpm test
      cd ../client && pnpm test
  - name: Upload Test Reports
    if: always()
    uses: actions/upload-artifact@v4
    with:
      name: shopsmart-test-reports
      path: |
        server/coverage/
        client/coverage/
```

Note `if: always()` — reports upload even when tests fail, so you can
download and inspect them.

---

## Reading the coverage report

After CI completes:

```bash
gh run download <run-id> -n shopsmart-test-reports
# → ./server/coverage/lcov.info  ./client/coverage/lcov.info
```

Open `coverage/lcov-report/index.html` in a browser, or pipe the lcov
file into your IDE's coverage view.

For local runs the same paths exist after `pnpm test`.

---

## Conventions

- **File naming**: `*.test.ts` (server, frontend unit) and `*.spec.ts` (E2E).
- **One assertion per behaviour, not per file**. Group related
  assertions in the same `it`.
- **Don't swallow errors**. `try/catch` in tests is almost always wrong
  — let the test fail loudly so you see the stack trace.
- **No mocking the database** in the integration layer. The point is to
  catch DB-shaped bugs.
