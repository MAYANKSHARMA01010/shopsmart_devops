# CI / CD Pipeline Reference

Everything in `.github/workflows/` is reachable from this document.
After reading you'll know what each workflow does, when it runs, and
which secrets it needs.

---

## TL;DR

- **Auto-fire on push/PR**: `rubric-deployment.yml` — the canonical
  end-to-end pipeline, runs all rubric phases in one file.
- **Manual only**: `pipeline.yml` orchestrates `01-test.yml` →
  `02-terraform.yml` → `03-docker-build-push.yml` → `04-ecs-deploy.yml`,
  plus a failure-cleanup trap.
- `ec2-masterclass.yml` is unrelated to the rubric — it's a learning
  exercise for raw EC2-based deployments.

---

## GitHub secrets

Set these via `./scripts/sync_all_secrets.sh` (which reads them from the
root `.env`) or manually in **GitHub → Settings → Secrets and Variables → Actions**.

### Required for the rubric

| Secret | Used in | Purpose |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | every AWS step | Lab credentials |
| `AWS_SECRET_ACCESS_KEY` | every AWS step | Lab credentials |
| `AWS_SESSION_TOKEN` | every AWS step | Lab credentials (lab tokens are short-lived — refresh them often) |
| `AWS_REGION` | every AWS step | Defaults to `us-east-1` if unset |

### Optional (only if you keep the auxiliary paths)

| Secret | Used in | Purpose |
|---|---|---|
| `DATABASE_URL` | EKS deploy job | Wired into `shopsmart-secrets` k8s secret, consumed by backend pods |
| `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` | `ec2-masterclass.yml` (legacy) | SSH-based EC2 deploys |
| `DOCKERHUB_USERNAME`, `DOCKERHUB_PASSWORD` | (mirror to Docker Hub if you choose) | Not used by current rubric path |
| `AWS_ACCOUNT_ID` | scripts only | Convenience export |

`AWS_REGION` falls back to `us-east-1` everywhere via
`${{ secrets.AWS_REGION || 'us-east-1' }}`, so the pipeline works even
if you forget to sync that one secret. All other AWS secrets are hard
requirements — the pipeline fails fast without them.

---

## Workflow files

### `rubric-deployment.yml` — canonical pipeline

```
on:
  push:        branches: [main]
  pull_request: branches: [main]
  workflow_dispatch:
```

Five jobs, executed in this order:

```
testing
   ↓
terraform
   ↓
build-and-push
   ↓        ↓
deploy-ecs  deploy-eks   (parallel)
```

**testing** — Phase 1 of the rubric.
- Brings up a `postgres:15-alpine` and `redis:7-alpine` service for the
  job duration.
- Installs server + client deps with pnpm.
- Runs `pnpm prisma db push` to materialise the schema.
- Runs `pnpm test` for both packages — server uses `c8` for coverage;
  client uses Jest `--coverage`.
- Uploads `server/coverage/` and `client/coverage/` as the
  `shopsmart-test-reports` artifact (always, even if tests fail).

**terraform** — Phase 2.
- `terraform init` (S3 backend).
- `terraform validate` (catches HCL syntax / type errors).
- `Terraform Import Existing Resources` (best-effort `terraform import`
  for ECR, CloudWatch, ECS, EKS — see [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md#importing-existing-resources-ci-behaviour)).
- `terraform plan -out=tfplan`.
- `terraform apply -auto-approve tfplan`.

**build-and-push** — Phase 3.
- `aws-actions/amazon-ecr-login@v2` for Docker auth.
- `docker build` from `server/` and `client/` (multi-stage Dockerfiles).
- `docker push` to `…/shopsmart-server:latest` and `…/shopsmart-client:latest`.

**deploy-ecs** — Phase 4a.
- `aws ecs update-service --force-new-deployment` for both services.
- `aws ecs wait services-stable` (blocks until rollout complete).
- Verification step that fails the job if any service has
  `runningCount < desiredCount`.

**deploy-eks** — Phase 4b.
- `aws eks update-kubeconfig` for cluster auth.
- Renders manifests with the live AWS account ID into
  `k8s-rendered/` (gitignored — never mutates tracked YAML).
- `kubectl apply -f k8s/namespace.yaml` (idempotent).
- Creates / updates the `shopsmart-secrets` Secret from `DATABASE_URL`.
- `kubectl apply -f k8s-rendered/{backend,frontend}-deployment.yaml`.
- `kubectl rollout status` for both deployments.
- Prints the LoadBalancer endpoint of `frontend-service`.
- On failure, prints namespace/pod/event diagnostics so failed runs are
  debuggable without re-triggering.

---

### `pipeline.yml` — modular pipeline (manual)

```
on: workflow_dispatch
```

Calls reusable workflows in sequence:

```
phase-1-qa            (uses: 01-test.yml)
   ↓
phase-2-infra         (uses: 02-terraform.yml)
   ↓
phase-3-docker        (uses: 03-docker-build-push.yml)
   ↓
phase-4-ecs-deploy    (uses: 04-ecs-deploy.yml)
   ↓
cleanup-on-failure    (if any prior phase failed)
```

The cleanup trap runs only on failure — it terminates EC2 instances
tagged `shopsmart` to avoid leaving runaway compute.

Use this workflow when you want **per-phase manual control** (e.g. only
re-run terraform without re-running tests).

---

### `01-test.yml` — Phase 1 (reusable)

Same shape as the `testing` job in `rubric-deployment.yml`, but exposed
as a reusable workflow (`workflow_call`) so `pipeline.yml` can call it.
Also runnable standalone via `workflow_dispatch`.

Key steps:
- pnpm install for server + client.
- ESLint for both packages.
- `pnpm audit --audit-level high` (reported, not enforced).
- Tests + coverage upload.

---

### `02-terraform.yml` — Phase 2 (reusable)

```
init → validate → plan → apply
```

Reusable + manually dispatchable. Note this file does **not** run the
import step — it assumes the state file already has everything. Use the
`rubric-deployment.yml` flow for first-run / drift recovery.

---

### `03-docker-build-push.yml` — Phase 3 (reusable)

- `docker/setup-buildx-action@v3` (BuildKit).
- ECR login.
- Build + push for both server and client.
- Uses GitHub Actions cache (`cache-from/cache-to: type=gha`) to speed
  up subsequent builds.

---

### `04-ecs-deploy.yml` — Phase 4 ECS (reusable)

```
update-service --force-new-deployment   (backend, frontend)
wait services-stable
describe-services + healthcheck gate
```

Fails with `::error::Services not fully running: …` if any service has
fewer running tasks than desired after the wait.

---

### `ec2-masterclass.yml` — legacy / out-of-rubric

A separate "raw EC2" deployment workflow kept for reference. Not part
of the rubric path. Safe to delete if you're not teaching from it.

---

## Concurrency

`pipeline.yml` declares:

```yaml
concurrency:
  group: production_pipeline
  cancel-in-progress: true
```

So if you fire two pipeline runs back-to-back, the older one is
cancelled to keep one rollout in flight at a time. `rubric-deployment.yml`
does **not** use this — back-to-back pushes will queue serially.

---

## Failure modes worth knowing

| Where | Symptom | Likely cause | Fix |
|---|---|---|---|
| `Configure AWS Credentials` | `Could not load credentials` | `AWS_SESSION_TOKEN` expired (lab tokens last 3 hours) | Refresh in `.env`, re-run `sync_all_secrets.sh` |
| `Terraform Apply` | `EntityAlreadyExistsException` for ECS / EKS / ECR | Resource exists, Terraform doesn't know about it | The import step usually catches this; if it doesn't, run `terraform import …` once locally and commit nothing — state is in S3 |
| `Build and Push Backend` | `denied: 401 Unauthorized` | ECR login token expired (only happens in long-running jobs) | Re-trigger; the login step generates a fresh token each run |
| `aws ecs wait services-stable` | times out at 10 minutes | Tasks failing to pull image or failing healthcheck | Read CloudWatch `/ecs/shopsmart` log group + `aws ecs describe-services` events |
| `kubectl rollout status` | times out | Image pull error, probe failure, or insufficient nodes | The `Debug Deployment Failure` step prints `kubectl describe pods` and recent events |

For a step-by-step debugging walkthrough see
[`DEPLOYMENT.md`](./DEPLOYMENT.md#debugging).

---

## Local replication

Every step in CI is replicable on your laptop:

```bash
# Phase 1 — tests
cd server && pnpm test
cd ../client && pnpm test

# Phase 2 — terraform
cd ../terraform
terraform init
terraform validate
terraform plan
terraform apply

# Phase 3 — build + push (after `aws ecr get-login-password ...`)
docker build -t $REG/shopsmart-server:latest ./server && docker push $REG/shopsmart-server:latest
docker build -t $REG/shopsmart-client:latest ./client && docker push $REG/shopsmart-client:latest

# Phase 4a — ECS
aws ecs update-service --cluster shopsmart-cluster --service shopsmart-backend-service --force-new-deployment
aws ecs wait services-stable --cluster shopsmart-cluster --services shopsmart-backend-service shopsmart-frontend-service

# Phase 4b — EKS
aws eks update-kubeconfig --name shopsmart-eks-cluster --region us-east-1
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

If a CI step works locally but fails in Actions, the difference is
almost always an **expired session token** or a **missing secret**.
