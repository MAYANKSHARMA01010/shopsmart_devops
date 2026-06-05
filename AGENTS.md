<!-- Project: ShopSmart

Rules:
- TypeScript only
- Prisma ORM only
- Vitest only
- Use Zod validation
- Use catchAsync wrappers
- Use centralized AppError handling
- Use Winston logging
- Use RBAC + PBAC authorization
- No any types
- No JavaScript files
- No file moves without approval
- No schema changes without migration review
- Follow existing project conventionsa
- Generate milestone reports
- Keep commits small and reviewable -->


# ShopSmart Engineering Standards

## Architecture Rules

* Business logic belongs in services only.
* Controllers must remain thin.
* Controllers should only:

  * validate request
  * call service
  * return response
* No database access from controllers.
* No Prisma calls from routes.
* No Prisma calls from React components.

## Database Rules

* UUID for all primary keys.
* Decimal for money values.
* Never use Float for currency.
* All schema changes require migration review.
* Add indexes for every frequently queried foreign key.
* Soft delete preferred over hard delete unless explicitly approved.

## API Rules

* Consistent response envelope.

Success:

```ts
{
  success: true,
  data: ...
}
```

Error:

```ts
{
  success: false,
  message: "...",
  errors?: [...]
}
```

* Never expose Prisma errors directly.
* Never expose stack traces.

## Security Rules

* Principle of least privilege.
* Every write endpoint requires authorization.
* Prefer requirePermission() over requireRole().
* Validate every request using Zod.
* Sanitize user-controlled input.
* Never trust client-side validation.

## Frontend Rules

* Server state → React Query/TanStack Query.
* Global state → Zustand only.
* Form validation → Zod.
* No duplicated API types.
* Reuse shared types from @shopsmart/types.

## Testing Rules

Every feature requires:

* Unit tests
* Integration tests
* Happy path tests
* Failure path tests

Critical flows:

* Auth
* Cart
* Checkout
* Orders

must always have integration coverage.

## Pull Request Rules

Before completing any milestone:

* TypeScript build passes
* Vitest passes
* Lint passes
* No TODO comments
* No console.log statements
* Milestone report generated

If any fail:
stop implementation and report issues.
