# 1. Monorepo Architecture using pnpm workspaces

Date: 2026-06-18

## Status

Accepted

## Context

The ShopSmart platform requires a scalable architecture where multiple components (frontend client, backend server, and shared libraries) coexist. We need a way to manage dependencies efficiently, ensure type safety across boundaries, and streamline the local development experience. Maintaining separate repositories for the frontend and backend creates friction in sharing types and configurations (like TypeScript, ESLint, and Prettier).

## Decision

We have decided to adopt a **monorepo architecture** using `pnpm workspaces`. 

The repository is structured as follows:
- `/client`: Next.js frontend application.
- `/server`: Express.js backend application.
- `/packages/shared-types`: Shared TypeScript definitions and Zod schemas used by both client and server.
- `/packages/shared-utils`: Shared utility functions.

We chose `pnpm` over `npm` or `yarn` because of its strict dependency resolution, excellent performance (via global store linking), and native support for workspaces without needing additional orchestration tools like Lerna.

## Consequences

### Positive
- **Single Source of Truth:** Types and schemas (e.g., Zod validation) are defined once in `/packages/shared-types` and consumed by both the frontend and backend.
- **Atomic Commits:** Features that require both frontend and backend changes can be developed and reviewed in a single Pull Request.
- **Performance:** `pnpm` symlinks workspace packages, so changes in `shared-types` are immediately reflected in `client` and `server` without publishing.
- **Consistent Tooling:** Global linting, formatting, and build scripts can be standardized at the root level.

### Negative
- **CI Complexity:** We will need to configure our CI/CD pipelines (e.g., GitHub Actions, Vercel, Railway) to understand the monorepo structure and only build affected projects.
- **Learning Curve:** Developers must learn `pnpm` workspace commands (e.g., `pnpm --filter`).
