# ShopSmart — System Architecture

This document explains how the running system fits together at every
level: code, runtime, network, and AWS resources.

---

## 1. High-level system view

```
                    ┌─────────────────────────────────┐
                    │         End users (HTTP)        │
                    └────────────────┬────────────────┘
                                     │
                ┌────────────────────┼────────────────────┐
                │                    │                    │
        ┌───────▼─────────┐  ┌───────▼──────────┐  ┌──────▼──────┐
        │  EKS LB Service │  │  ECS Fargate ALB │  │   EC2 Host  │
        │  (frontend)     │  │  (optional)      │  │  (admin)    │
        └───────┬─────────┘  └───────┬──────────┘  └─────────────┘
                │                    │
        ┌───────▼─────────┐  ┌───────▼──────────┐
        │  Frontend Pods  │  │  Frontend Tasks  │
        │  (Next.js 16)   │  │  (Next.js 16)    │
        └───────┬─────────┘  └───────┬──────────┘
                │                    │
                └─────────┬──────────┘
                          │ internal HTTP
                ┌─────────▼─────────┐
                │  Backend Pods /   │
                │  Backend Tasks    │
                │  (Express 5 + TS) │
                └─────┬──────┬──────┘
                      │      │
              ┌───────▼─┐  ┌─▼────────┐
              │Postgres │  │  Redis   │
              │ (Neon)  │  │ (cache)  │
              └─────────┘  └──────────┘
```

The same container images run on **both** ECS Fargate and EKS. A given
deployment cycle pushes one image per service to ECR and rolls both
runtimes simultaneously.

---

## 2. Code organisation

```
client/src/
  app/                     Next.js App Router pages
  components/              UI components (typed with Zod-derived types)
  components/__tests__/    Jest + RTL unit tests
  e2e/                     Playwright E2E (out of CI today)
server/src/
  server.ts                Express bootstrap (default export for tests)
  config/                  Database client, env loader
  routes/                  Route handlers (products, health)
  utils/                   Redis client wrapper, helpers
server/prisma/
  schema.prisma            Single-source-of-truth data model
server/tests/
  app.test.ts              Mocha + Chai + Supertest integration
```

Why this shape: server-side TypeScript is split by concern (routes →
controllers → prisma) with a single `default export app` so Supertest
can spin it up without bringing up the listener.

---

## 3. Request lifecycle

`GET /api/products?category=electronics` from the browser:

1. **Frontend** — React component calls `/api/products` via Axios.
2. **Frontend container** — Next.js proxies to backend at the URL set by
   `NEXT_PUBLIC_API_URL`. On EKS this is
   `http://backend-service.shopsmart-prod.svc.cluster.local:5001` (in-cluster DNS).
3. **Backend** — Express route handler validates query params with Zod,
   asks Prisma for products, optionally caches in Redis.
4. **Postgres** returns rows; Prisma maps to objects.
5. **Backend** returns JSON. Caches the result for 60s in Redis.
6. **Frontend** renders the list.

Failure modes are explicit:
- Redis unreachable → fall back straight to DB (decided at runtime — no
  hard dep).
- DB unreachable → 503 from `/api/health`, k8s readinessProbe fails, pod
  is taken out of rotation.

---

## 4. Container architecture

Both Dockerfiles follow the same pattern:

```
Stage 1 (builder, full toolchain)
  │ install deps
  │ generate Prisma / build Next.js
  ▼
Stage 2 (runner, slim)
  │ COPY only build artefacts
  │ create non-root user (uid 1001)
  │ HEALTHCHECK via wget on /api/health (server) or / (client)
  │ USER nodejs / nextjs
  │ CMD node entrypoint
```

This satisfies the rubric's *multi-stage / non-root / healthcheck*
requirement and is also good practice independently — smaller surface,
no toolchain in the runtime image, container-runtime-aware liveness.

---

## 5. AWS resource map

Provisioned by Terraform, all in `us-east-1`:

```
VPC 10.0.0.0/16
├── Subnet public_1  10.0.1.0/24  (us-east-1a, k8s/role/elb)
├── Subnet public_2  10.0.2.0/24  (us-east-1b, k8s/role/elb)
├── Internet Gateway
├── Route table (0.0.0.0/0 → IGW)
└── Security Groups
    ├── ecs_tasks       :3000,:5001 ingress
    └── ec2_app         :22,:80     ingress

ECR
├── shopsmart-server   (mutable, scan-on-push)
└── shopsmart-client   (mutable, scan-on-push)

ECS
└── Cluster shopsmart-cluster (Fargate, container insights)
    ├── Task def shopsmart-backend  (256 cpu / 512 mem)
    ├── Task def shopsmart-frontend (256 cpu / 512 mem)
    ├── Service shopsmart-backend-service  (1 task)
    └── Service shopsmart-frontend-service (1 task)

EKS
└── Cluster shopsmart-eks-cluster (k8s 1.30, public endpoint)
    └── Node group shopsmart-node-group (t3.medium, 1–3 nodes)

EC2
└── i-… app_host (t3.micro AL2 + Docker user-data, public IP)

S3
└── shopsmart-artifacts-… (versioned, AES256, public access blocked)

CloudWatch
└── /ecs/shopsmart (7-day retention)

IAM
└── LabRole (data source — see iam.tf for rationale)
```

See [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md) for module-by-module detail.

---

## 6. Why both ECS and EKS?

Most teams pick one. We provision both for two reasons:

1. **Rubric coverage**: the deployment rubric has Phase 3 (ECS) **OR**
   Phase 4 (EKS). Doing both demonstrates competence with each runtime.
2. **Cost of switching**: with infra and pipelines already in place, the
   marginal cost of running both is small, and it doubles as a sandbox
   for comparing operational ergonomics (rollout speed, log access,
   service discovery, LB cost).

If you fork this for production, **delete one of the two**. You don't
want both runtimes in your real ops surface.

---

## 7. Where things live in CI

| Concern | Workflow |
|---|---|
| Run tests | `01-test.yml` (called by `pipeline.yml`); also inlined in `rubric-deployment.yml` |
| Provision infra | `02-terraform.yml` and the `terraform` job in `rubric-deployment.yml` |
| Build + push images | `03-docker-build-push.yml` and `build-and-push` in `rubric-deployment.yml` |
| Deploy to ECS | `04-ecs-deploy.yml` and `deploy-ecs` in `rubric-deployment.yml` |
| Deploy to EKS | `deploy-eks` in `rubric-deployment.yml` |

`rubric-deployment.yml` is the **canonical** single-file pipeline; the
split-phase workflows are kept for granular manual runs and for the
rubric's modular-pipeline expectation. See [`CICD.md`](./CICD.md).
