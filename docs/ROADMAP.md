# Roadmap

What's already built, what's next. Reality check on the original
roadmap — many infrastructure items are now done.

---

## ✅ Done (was on the original roadmap)

| Item | Where it lives |
|---|---|
| Terraform-managed VPC + subnets + IGW + SGs | `terraform/vpc.tf` |
| Terraform-managed S3 (versioned, encrypted, private) | `terraform/main.tf` |
| Terraform-managed ECR repos with image scanning | `terraform/main.tf` |
| Terraform-managed ECS Fargate (cluster + services) | `terraform/ecs.tf` |
| Terraform-managed EC2 jump host | `terraform/ec2.tf` |
| Terraform-managed CloudWatch log group | `terraform/ecs.tf` |
| Terraform-managed EKS cluster + node group | `terraform/eks.tf` |
| Production-grade Dockerfiles (multi-stage, non-root, healthcheck) | `server/Dockerfile`, `client/Dockerfile` |
| Kubernetes deployment manifests (replicas≥2, limits, probes, namespace) | `k8s/` |
| End-to-end CI pipeline (test → infra → build → deploy ECS+EKS) | `.github/workflows/rubric-deployment.yml` |
| Test report artifact upload (c8 + Jest coverage) | Same workflow |
| Multi-arch Docker builds | Buildx is set up; tag with `--platform=linux/amd64,linux/arm64` to enable |

---

## 🚧 In progress / nice-to-have

| Item | Why it's not done | Effort |
|---|---|---|
| **Application Load Balancer in front of ECS** | Not required by rubric; tasks have public IPs today | Small (1 ALB + target groups + listener rules) |
| **HPA (Horizontal Pod Autoscaler) for EKS** | No load to scale against in lab | Small (1 HPA manifest) |
| **Helm chart packaging** | Plain manifests cover the rubric | Medium (port `k8s/*.yaml` to a chart) |
| **CloudFront in front of frontend** | Not in rubric; would help cold-cache TTFB | Medium (cert in ACM + distribution + origin config) |
| **Move workloads to private subnets + NAT** | Lab cost — NAT is $30+/mo | Small infra change |
| **Immutable ECR tags (commit SHA)** | Mutable `latest` works for the lab | Trivial — change `IMAGE_TAG` in workflows |
| **E2E tests in CI** | Doubles test job time, low ROI today | Small (one workflow step) |
| **Pin Terraform versions in `versions.tf`** | `~> 5.0` is acceptable for now | Trivial |

---

## 🔮 Future product features (unchanged from original roadmap)

These are app-level rather than infra-level — orthogonal to the
deployment track.

- **Auth & RBAC** — NextAuth.js / Clerk; admin vs. customer roles.
- **Payments & orders** — Stripe checkout, order history, tracking.
- **Cart & wishlist** — persisted per user.
- **AI shopping assistant** — Gemini-backed chat.
- **Multi-address support** — per-user shipping/billing.
- **Admin dashboard** — inventory, sales analytics, user management.
- **Search** — Elasticsearch / Algolia.

---

## 🛡 Operational maturity (the next infra mile)

Once the rubric is satisfied, real production maturity needs:

1. **Observability**
   - Structured logs with request IDs.
   - CloudWatch metrics + ALB latency dashboards.
   - Distributed tracing (X-Ray / OpenTelemetry).

2. **Security**
   - WAF on the ALB / CloudFront.
   - Secrets rotation (Secrets Manager rather than `.env` for DB URL).
   - VPC endpoints for ECR / Secrets Manager / S3 to keep traffic off
     the public internet.
   - SBOM + image signing (cosign / sigstore).

3. **Resilience**
   - Multi-AZ Postgres (RDS Multi-AZ or Aurora Serverless v2).
   - Automated DB backups + restore drills.
   - Pod disruption budgets on EKS.
   - Read replicas for the product catalogue.

4. **Process**
   - Terraform modules + workspaces for dev/staging/prod separation.
   - Blue/green or canary deploys (CodeDeploy / Argo Rollouts).
   - PR-preview environments.

---

## 🤝 Contributing

Open an issue describing the change you'd like to make, then a PR.
Keep changes scoped — infra, app, and pipeline changes ideally go in
separate PRs so each can be reviewed independently.
