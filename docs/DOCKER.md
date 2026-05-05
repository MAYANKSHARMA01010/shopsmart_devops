# Docker — Image Design & Compose

How ShopSmart packages itself for both local development and AWS
deployment, why each Dockerfile looks the way it does, and how to
operate the local Compose stack.

---

## Two Dockerfiles, two profiles

| File | Used by | Profile |
|---|---|---|
| `server/Dockerfile` | CI (ECR push), Compose | Multi-stage, non-root, healthcheck — production grade |
| `client/Dockerfile` | CI (ECR push), Compose | Multi-stage, non-root, healthcheck — production grade |

Both satisfy the deployment rubric's container requirements
(see [`RUBRIC.md`](./RUBRIC.md#dockerfile-sub-rubric)).

---

## Anatomy of `server/Dockerfile`

```
Stage 1 — builder (node:20-alpine)
  ├── install pnpm
  ├── COPY package.json pnpm-lock.yaml prisma/
  ├── pnpm install
  ├── COPY src/, tsconfig.json, ...
  ├── pnpm prisma generate
  └── pnpm build                        → /app/dist

Stage 2 — runner (node:20-alpine)
  ├── install pnpm
  ├── create system user nodejs (uid 1001)
  ├── COPY --from=builder --chown=nodejs:nodejs (package.json, lock, node_modules, dist, prisma)
  ├── ENV NODE_ENV=production
  ├── EXPOSE 5001
  ├── USER nodejs
  ├── HEALTHCHECK wget --spider http://localhost:5001/api/health
  └── CMD ["pnpm", "start"]
```

**Why multi-stage**: the `builder` stage carries the TypeScript
compiler, dev deps, and Prisma binaries — none of which we want in the
runtime image. The `runner` stage starts from scratch and only copies
what the running app actually needs.

**Why non-root**: defence in depth. If the app process ever pops a
remote-code-execution bug, the attacker is constrained to a uid 1001
without home directory or shell, not `root`.

**Why a healthcheck**: container-level liveness signal that's visible
to Docker Compose, ECS, and (via translation) Kubernetes. ECS uses it
directly; Kubernetes prefers its own probes (defined in `k8s/*.yaml`)
but the Docker `HEALTHCHECK` still appears in `docker ps` output for
local introspection.

`client/Dockerfile` follows the same pattern with a 3-stage build
(`deps`, `builder`, `runner`) leveraging Next.js's standalone output
mode for minimal runtime size.

---

## docker-compose.yml — local stack

Four services:

```
frontend  ── port 3000 ── builds client/Dockerfile
   │
   ▼
backend   ── port 5001 ── builds server/Dockerfile
   │
   ├──→ db    (postgres:16, volume postgres_data)
   └──→ redis (redis:7,    volume redis_data)
```

Useful commands:

```bash
docker compose up --build          # build all + run in foreground
docker compose up -d               # detached
docker compose down                # stop, keep data
docker compose down -v             # stop + wipe volumes (destructive)
docker compose logs -f backend     # tail one service
docker compose exec backend sh     # shell into backend
docker compose exec backend pnpm db:studio   # Prisma Studio UI
```

The Compose file uses the same `Dockerfile`s that CI uses, so what runs
locally is byte-equivalent (modulo build-args) to what runs on ECS/EKS.

---

## Build args

| Arg | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` (client) | `http://backend:5001` | Frontend's runtime API base; baked at build time |

Override per-environment:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
  -t shopsmart-client:prod ./client
```

In CI, the EKS deployment overrides this at runtime via the pod's
`env` block — set to the in-cluster service DNS
`http://backend-service.shopsmart-prod.svc.cluster.local:5001`.

---

## Image tagging conventions

| Where | Tag |
|---|---|
| Local Compose | implicit `latest` |
| ECR (CI) | `:latest` (mutable, overwritten each push) |

If you fork for production, switch to commit-SHA tags for ECR pushes
(see [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md#ecr-repositories)).

---

## Debugging

| Symptom | Where to look |
|---|---|
| Build fails on `pnpm install` | Lockfile drift — ensure `pnpm-lock.yaml` is committed and matches `package.json` |
| Build fails on `pnpm prisma generate` | Schema syntax error — run `pnpm prisma validate` locally |
| Container starts then exits | `docker compose logs backend` → look for unhandled exception or DB connection error |
| Container marked unhealthy | The `HEALTHCHECK` is failing — `docker inspect <container>` shows last 5 healthcheck outputs |
| Image is huge (> 1 GB) | Final stage is copying dev deps — verify `COPY --from=builder` only pulls `dist` + production `node_modules` |

---

## Running ECR images locally (for debugging)

```bash
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

docker pull <account>.dkr.ecr.us-east-1.amazonaws.com/shopsmart-server:latest
docker run --rm -p 5001:5001 \
  -e DATABASE_URL=$DATABASE_URL \
  <account>.dkr.ecr.us-east-1.amazonaws.com/shopsmart-server:latest
```

Useful when an EKS pod is crashing — pull the same image locally and
reproduce.
