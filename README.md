# ShopSmart

A production-grade, full-stack e-commerce reference project. The codebase
is intentionally small but covers an end-to-end industrial pipeline:
TypeScript app code, Postgres + Redis, Docker, Terraform-provisioned AWS
infrastructure (VPC, S3, ECR, ECS Fargate, EKS, EC2, IAM, CloudWatch),
and a GitHub Actions pipeline that runs tests, provisions infra, builds
and pushes images, and deploys to **both ECS and EKS** in parallel.

> If you're grading this against the deployment rubric, jump straight to
> [`docs/RUBRIC.md`](./docs/RUBRIC.md) for a line-by-line compliance map.

---

## Table of contents

1. [What's in the repo](#whats-in-the-repo)
2. [Tech stack](#tech-stack)
3. [Quick start (local)](#quick-start-local)
4. [Environment variables](#environment-variables)
5. [Running the pipeline (cloud)](#running-the-pipeline-cloud)
6. [Repository layout](#repository-layout)
7. [Documentation index](#documentation-index)
8. [Common commands cheat-sheet](#common-commands-cheat-sheet)
9. [Troubleshooting](#troubleshooting)

---

## What's in the repo

| Layer | Tech | Where |
|---|---|---|
| Frontend | Next.js 16 (App Router), React 19, Axios, Zod | `client/` |
| Backend | Node.js, Express 5, TypeScript, Prisma, Zod | `server/` |
| Database | PostgreSQL 15 (Prisma ORM) | external (Neon / RDS / Docker) |
| Cache | Redis 7 (ioredis) | external or Docker |
| Containers | Multi-stage, non-root, healthcheck-equipped Dockerfiles | `server/Dockerfile`, `client/Dockerfile` |
| Infrastructure | Terraform (AWS provider) | `terraform/` |
| Orchestration | ECS Fargate **and** EKS (Kubernetes 1.30) | `terraform/ecs.tf`, `terraform/eks.tf`, `k8s/` |
| CI/CD | GitHub Actions (5 workflows) | `.github/workflows/` |
| Tests | Mocha + Chai + Supertest (server), Jest + RTL (client), Playwright (E2E) | `server/tests/`, `client/src/.../__tests__/`, `client/e2e/` |

---

## Tech stack

```
            ┌──────────────────────┐
            │   Next.js 16 (App)   │   ── client/
            │   React 19 + Zod     │
            └──────────┬───────────┘
                       │ HTTP
            ┌──────────▼───────────┐
            │  Express 5 + TS API  │   ── server/
            │  Prisma ORM + Zod    │
            └────┬─────────┬───────┘
                 │         │
        ┌────────▼─┐    ┌──▼─────────┐
        │ Postgres │    │   Redis    │
        └──────────┘    └────────────┘
```

Containerised, then deployed via Terraform to:

- **ECS Fargate** — managed task scheduling, no nodes to maintain.
- **EKS** — Kubernetes 1.30, managed node group, t3.medium workers.

---

## Quick start (local)

### Prerequisites
- Node 20+
- pnpm 10+ (`npm i -g pnpm`)
- Docker + Docker Compose (recommended)
- Postgres 15 (only if not using Docker)

### Option A — Docker Compose (everything in one go)

```bash
docker compose up --build
```

Brings up backend (5001), frontend (3000), Postgres (5432), Redis (6379).

### Option B — Manual (faster iteration)

```bash
# 1. Install all workspace deps from the root
pnpm install

# 2. Backend
cd server
cp .env.example .env        # set DATABASE_URL + REDIS_LOCAL_URL
pnpm db:generate
pnpm db:push                # sync schema
pnpm dev                    # nodemon + ts-node, http://localhost:5001

# 3. Frontend (new terminal)
cd client
cp .env.example .env
pnpm dev                    # http://localhost:3000
```

---

## Environment variables

Three `.env` files are involved. None are committed.

| File | Purpose |
|---|---|
| `./.env` | Root: AWS creds, EC2 host, DB URL — used by `scripts/*.sh` and `scripts/sync_all_secrets.sh` |
| `./server/.env` | Backend runtime: `DATABASE_URL`, `REDIS_LOCAL_URL`, `PORT` |
| `./client/.env` | Frontend runtime: `NEXT_PUBLIC_API_URL` |

Templates live alongside each one as `*.env.example`. Copy → fill in → never commit.

### Syncing secrets to GitHub Actions

```bash
# After editing the root .env with your AWS lab creds:
./scripts/sync_all_secrets.sh
```

This calls `gh secret set` for every key in the script's `SECRETS=(...)` list,
including `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
`AWS_SESSION_TOKEN`, `DATABASE_URL`, etc. See [`docs/CICD.md`](./docs/CICD.md#github-secrets)
for the full secret list and what each one is used for.

---

## Running the pipeline (cloud)

The canonical pipeline is **`.github/workflows/rubric-deployment.yml`**. It
fires on push/PR to `main` *and* manual dispatch:

```
Push / PR / dispatch
        │
        ▼
┌──────────────────┐
│ Phase 1: Tests   │  c8 + Jest coverage uploaded as artifact
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Phase 2: Terraform│  init → validate → import-existing → plan → apply
└────────┬─────────┘   provisions VPC, S3, ECR×2, CloudWatch, ECS, EKS, EC2, IAM
         ▼
┌──────────────────┐
│ Phase 3: Build    │  docker build + push to ECR (server + client)
└────────┬─────────┘
         ▼
   ┌─────┴─────┐
   ▼           ▼
┌───────┐  ┌───────┐
│ ECS   │  │ EKS   │   parallel — both run after build-and-push
│ Fargate│ │ k8s   │
└───────┘  └───────┘
```

To run it: `git push origin main` (or open a PR), or trigger
`Actions → Rubric: EKS Production Deployment → Run workflow`.

The split-phase variant (`pipeline.yml` calling `01-test.yml`,
`02-terraform.yml`, `03-docker-build-push.yml`, `04-ecs-deploy.yml`) is
manual-dispatch only. See [`docs/CICD.md`](./docs/CICD.md) for when to use which.

---

## Repository layout

```
shopsmart/
├── .github/workflows/      # GitHub Actions pipelines (5 workflows)
├── client/                 # Next.js 16 frontend
│   ├── src/                # App router pages, components, tests
│   ├── e2e/                # Playwright E2E specs
│   └── Dockerfile          # Multi-stage, non-root, healthcheck
├── server/                 # Express + TypeScript backend
│   ├── src/                # Routes, controllers, prisma client
│   ├── prisma/             # schema.prisma + migrations
│   ├── tests/              # Mocha + Chai + Supertest integration tests
│   └── Dockerfile          # Multi-stage, non-root, healthcheck
├── terraform/              # Infrastructure as Code
│   ├── main.tf             # S3 bucket + ECR repos
│   ├── vpc.tf              # VPC, subnets, IGW, route table, SG
│   ├── ec2.tf              # Amazon Linux 2 jump host
│   ├── ecs.tf              # ECS Fargate cluster, task defs, services
│   ├── eks.tf              # EKS cluster + managed node group
│   ├── iam.tf              # LabRole reference (lab IAM strategy)
│   ├── providers.tf        # Provider + S3 backend
│   └── variables.tf
├── k8s/                    # Kubernetes manifests for EKS deployment
│   ├── namespace.yaml      # shopsmart-prod (non-default)
│   ├── backend-deployment.yaml   # 2 replicas, probes, limits
│   └── frontend-deployment.yaml  # 2 replicas, LoadBalancer Service
├── docker/                 # (reserved for shared docker assets)
├── scripts/                # Operational scripts (EC2 control, secret sync)
├── docs/                   # Detailed documentation (see index below)
├── docker-compose.yml      # Local dev stack
├── pnpm-workspace.yaml
└── README.md               # ← you are here
```

---

## Documentation index

Start at the top, drill in as needed.

| Doc | Purpose |
|---|---|
| **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | System overview, request lifecycle, component diagrams |
| **[INFRASTRUCTURE.md](./docs/INFRASTRUCTURE.md)** | Terraform module-by-module breakdown, AWS resources, gotchas |
| **[CICD.md](./docs/CICD.md)** | GitHub Actions pipeline reference, secrets, triggers, workflow per phase |
| **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** | Operational runbook: deploy, rollback, debug, view logs |
| **[RUBRIC.md](./docs/RUBRIC.md)** | Rubric requirement → exact file/line compliance map |
| [API.md](./docs/API.md) | REST endpoints, request/response examples |
| [DATABASE.md](./docs/DATABASE.md) | Prisma schema, migrations, Redis caching |
| [DOCKER.md](./docs/DOCKER.md) | Image design (multi-stage, non-root, healthcheck) |
| [FRONTEND.md](./docs/FRONTEND.md) | Component structure, state, styling |
| [TESTING.md](./docs/TESTING.md) | Test pyramid: unit, integration, E2E |
| [ROADMAP.md](./docs/ROADMAP.md) | What's done, what's next |

---

## Common commands cheat-sheet

```bash
# Backend
cd server
pnpm dev              # ts-node + nodemon
pnpm test             # Mocha + c8 coverage → server/coverage/
pnpm db:push          # Prisma → push schema
pnpm db:studio        # Prisma Studio web UI

# Frontend
cd client
pnpm dev              # Next.js dev server
pnpm test             # Jest with --coverage
npx playwright test   # E2E

# Infra (after configuring AWS creds)
cd terraform
terraform init
terraform plan
terraform apply

# Container builds (replicates CI)
docker build -t shopsmart-server:dev ./server
docker build -t shopsmart-client:dev ./client

# Pipeline triggers
gh workflow run "Rubric: EKS Production Deployment"
gh run watch
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Backend TypeScript errors after pulling | Prisma client is stale | `cd server && pnpm db:generate` |
| Docker compose port already in use | Another service on 3000/5001/5432/6379 | `docker compose down -v` then retry |
| `terraform apply` fails with `AlreadyExists` | Resource exists, not in state | The `Terraform Import Existing Resources` step in `rubric-deployment.yml` adopts existing resources. Run the workflow once to import. |
| EKS LoadBalancer pending forever | Subnets missing `kubernetes.io/role/elb` tag | Re-apply terraform — `vpc.tf` now sets the tag |
| ECS service stuck pending | Task pulling from ECR but no image | Make sure Phase 3 (build & push) ran successfully before deploy |
| GitHub Actions `AWS_REGION` empty | Secret not synced | `./scripts/sync_all_secrets.sh` |

For deeper failure modes, see [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md#debugging).

---

## License

See [`LICENSE`](./LICENSE).
