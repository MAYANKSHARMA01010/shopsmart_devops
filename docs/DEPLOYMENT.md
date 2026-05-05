# Deployment Runbook

Operational guide for shipping ShopSmart to AWS, rolling back, viewing
logs, and debugging failed deployments. Use this when the pipeline
breaks at 2 AM and you need a checklist.

---

## 1. Pre-flight checklist

Before triggering a deployment:

- [ ] Lab AWS credentials in root `.env` are fresh (session tokens
      last ≈ 3 hours).
- [ ] `./scripts/sync_all_secrets.sh` was run after the last `.env` edit.
- [ ] Tests pass locally: `cd server && pnpm test && cd ../client && pnpm test`.
- [ ] `terraform fmt -check -recursive && terraform validate` is clean
      from inside `terraform/`.
- [ ] You are deploying from `main` (the canonical pipeline only fires
      on `main`).

If any box is unchecked, fix that first. The pipeline will not save you.

---

## 2. Standard deployment

### Triggering

```bash
git push origin main          # auto-fires rubric-deployment.yml
# or
gh workflow run "Rubric: EKS Production Deployment"
gh run watch                  # tail the latest run
```

### What you should see

| Phase | Expected duration | Visible output |
|---|---|---|
| 1. testing | 1–3 min | "All tests passing", artifact upload |
| 2. terraform | 2–5 min (steady-state) / 15–25 min (first apply with EKS create) | `Apply complete! Resources: …` |
| 3. build-and-push | 2–4 min | Two ECR push lines |
| 4a. deploy-ecs | 1–3 min | Healthy services table |
| 4b. deploy-eks | 1–4 min | `deployment "frontend-deployment" successfully rolled out` + LB endpoint |

If the EKS cluster is being created for the first time, expect the
**terraform** phase to take ~20 minutes — that is normal.

### Verifying the deployment

```bash
# ECS
aws ecs describe-services \
  --cluster shopsmart-cluster \
  --services shopsmart-backend-service shopsmart-frontend-service \
  --query 'services[].{name:serviceName,running:runningCount,desired:desiredCount}'

# EKS
aws eks update-kubeconfig --name shopsmart-eks-cluster --region us-east-1
kubectl get pods -n shopsmart-prod
kubectl get svc frontend-service -n shopsmart-prod   # check EXTERNAL-IP

# Hit the frontend
curl http://<EKS_LB_HOSTNAME>/
```

---

## 3. Rolling back

### ECS rollback

ECS keeps the previous task definition. To revert:

```bash
# 1. Find the previous revision
aws ecs describe-task-definition --task-definition shopsmart-backend:LATEST_MINUS_1

# 2. Point the service at it
aws ecs update-service \
  --cluster shopsmart-cluster \
  --service shopsmart-backend-service \
  --task-definition shopsmart-backend:<previous-revision>

aws ecs wait services-stable \
  --cluster shopsmart-cluster \
  --services shopsmart-backend-service
```

The image tag in our task definitions is `latest`, so you can also just
push the previous image to `:latest` and run `--force-new-deployment`.
Pinning to immutable tags (commit SHAs) makes rollback cleaner — see
[`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md#ecr-repositories) for the
mutability decision.

### EKS rollback

```bash
# Roll back to the previous ReplicaSet
kubectl rollout undo deployment/backend-deployment  -n shopsmart-prod
kubectl rollout undo deployment/frontend-deployment -n shopsmart-prod

# Wait for stability
kubectl rollout status deployment/backend-deployment  -n shopsmart-prod
kubectl rollout status deployment/frontend-deployment -n shopsmart-prod
```

`kubectl rollout history deployment/<name> -n shopsmart-prod` shows the
revision list. Add `--to-revision=N` to roll back to a specific one.

### Terraform rollback

There is no first-class rollback. Options:

1. **Revert the commit** that introduced the bad change, push, the
   pipeline applies the prior state.
2. **`terraform apply` with the prior state file** (last resort —
   manually fetch from the S3 versioned state bucket). Requires manual
   `terraform state pull` / `state push`. Coordinate offline.

---

## 4. Viewing logs

### ECS task logs

All container output goes to CloudWatch in `/ecs/shopsmart`, with
streams prefixed by service:

```bash
# Tail the latest stream for the backend
aws logs tail /ecs/shopsmart --since 15m --follow \
  --filter-pattern '?ERROR ?error'

# List streams
aws logs describe-log-streams \
  --log-group-name /ecs/shopsmart \
  --order-by LastEventTime --descending --max-items 10
```

### EKS pod logs

```bash
kubectl logs -n shopsmart-prod -l app=shopsmart-backend  --tail=200 -f
kubectl logs -n shopsmart-prod -l app=shopsmart-frontend --tail=200 -f

# Previous container instance (after a crash loop)
kubectl logs -n shopsmart-prod <pod> --previous
```

### Pipeline logs

```bash
gh run list --workflow="Rubric: EKS Production Deployment" --limit 5
gh run view <run-id> --log
gh run view <run-id> --log-failed   # only the failing step's output
```

---

## 5. Debugging

### "ECS service stuck pending"

Most common cause: tasks can't pull the image or fail healthcheck.

```bash
# 1. What does the service say about its events?
aws ecs describe-services \
  --cluster shopsmart-cluster \
  --services shopsmart-backend-service \
  --query 'services[0].events[0:5]'

# 2. Are there stopped tasks with reasons?
aws ecs list-tasks --cluster shopsmart-cluster \
  --service-name shopsmart-backend-service --desired-status STOPPED
aws ecs describe-tasks --cluster shopsmart-cluster \
  --tasks <task-arn> --query 'tasks[0].{stopReason:stoppedReason,containers:containers[].reason}'

# 3. Check container logs (CloudWatch)
aws logs tail /ecs/shopsmart --since 30m
```

Top hits:
- `CannotPullContainerError` → ECR repo empty (Phase 3 didn't run) or
  task role missing ECR perms.
- `ResourceInitializationError` → SG / subnet routing problem.
- Container exits 0 immediately → app crashed on boot (read logs).

### "EKS rollout never completes"

```bash
kubectl describe pods -l app=shopsmart-backend -n shopsmart-prod | tail -40
kubectl get events -n shopsmart-prod --sort-by='.lastTimestamp' | tail -20
```

Top hits:
- `ImagePullBackOff` → image not pushed yet, or wrong account ID
  injected. Check `k8s-rendered/backend-deployment.yaml` in the run logs.
- `CrashLoopBackOff` → app crashing. `kubectl logs <pod> --previous`.
- `Pending` with `0/2 nodes available` → node group still scaling. Wait
  or bump `desired_size` in `eks.tf`.
- LB Service `EXTERNAL-IP` stuck `<pending>` → subnets missing
  `kubernetes.io/role/elb=1` tag. The current `vpc.tf` sets it.

### "Terraform plan wants to destroy something"

Read the plan output carefully before approving:

```
# aws_eks_cluster.shopsmart_eks must be replaced
-/+ resource "aws_eks_cluster" "shopsmart_eks" { ... }
```

`-/+` means destroy + recreate, which for EKS = 20 minutes of downtime.
Common causes are mutable-after-create attributes being changed (e.g.
`role_arn`, `vpc_config.subnet_ids`). Either:
- Accept the recreate (lab fine, prod NOT FINE).
- Use `lifecycle { ignore_changes = [vpc_config[0].subnet_ids] }` to
  pin the attribute.

### "Pipeline failed at AWS step but worked yesterday"

90% of the time: **session token expired**. Lab tokens are short-lived.

```bash
# Refresh:
nano .env                                       # paste fresh creds
./scripts/sync_all_secrets.sh                   # push to GitHub
gh workflow run "Rubric: EKS Production Deployment"
```

---

## 6. Tear-down (stop the meter)

When you're done demoing:

```bash
cd terraform
terraform destroy -auto-approve
```

Order of teardown matters — Terraform handles it:
1. EKS node group → EKS cluster (slow, 5–10 min).
2. ECS services → task defs → cluster.
3. EC2 instance, log group, ECR repos.
4. Subnets / route table / IGW / VPC / SGs.
5. S3 bucket (only if empty — versioned objects must be purged first).

If `destroy` complains about non-empty buckets:
```bash
aws s3 rm s3://shopsmart-artifacts-<suffix>/ --recursive
aws s3api delete-bucket --bucket shopsmart-artifacts-<suffix>
```

---

## 7. Manual / partial deploys

When the canonical pipeline is too heavy:

| Want | Run |
|---|---|
| Just rebuild + push images | `gh workflow run "Phase 3: Containerization"` |
| Just redeploy ECS without rebuild | `gh workflow run "Phase 4: ECS Fargate Deployment"` |
| Just terraform apply | `gh workflow run "Phase 2: Infrastructure Validation"` |
| Just tests | `gh workflow run "Phase 1: Quality Assurance"` |

These reusable workflows all carry `workflow_dispatch`. See
[`CICD.md`](./CICD.md) for the full list.

---

## 8. On-call quick reference

| Symptom | First command | Second command |
|---|---|---|
| Site is down (EKS) | `kubectl get pods -n shopsmart-prod` | `kubectl describe svc frontend-service -n shopsmart-prod` |
| Site is down (ECS) | `aws ecs describe-services …` (above) | `aws logs tail /ecs/shopsmart --since 5m` |
| Latest deploy hung | `gh run list --limit 3` | `gh run view <id> --log-failed` |
| AWS auth failures | check `AWS_SESSION_TOKEN` expiry | refresh `.env`, re-sync secrets |
| 5xx spikes | tail backend logs + Postgres / Redis health | scale up: `kubectl scale deployment/backend-deployment --replicas=4 -n shopsmart-prod` |

Keep this page open while you operate. If a workaround isn't here yet,
add it after you find it.
