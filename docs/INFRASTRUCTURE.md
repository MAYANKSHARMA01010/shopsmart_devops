# Infrastructure (Terraform)

Everything in `terraform/` is the source of truth for what runs in AWS.
This document walks through each file, explains what is provisioned and
why, and calls out gotchas that bite people the first time.

---

## File layout

```
terraform/
├── providers.tf   AWS provider + S3 backend for shared state
├── variables.tf   project_name, aws_region
├── main.tf        S3 bucket (rubric) + ECR repos (server, client)
├── vpc.tf         VPC, subnets, IGW, route table, security group
├── ec2.tf         AL2 jump host + its security group + AMI lookup
├── ecs.tf         CloudWatch log group, ECS cluster, task defs, services
├── eks.tf         EKS cluster + managed node group
└── iam.tf         LabRole data source (lab-env IAM strategy)
```

---

## providers.tf — provider + remote state

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket = "shopsmart-terraform-state-mayank"
    key    = "shopsmart/terraform.tfstate"
    region = "us-east-1"
  }
}
```

- **State is in S3**, not local. Every CI run reads/writes the same
  state file, so `terraform import` outcomes persist between runs.
- The state bucket is **created out-of-band** — chicken-and-egg:
  Terraform can't create its own backend bucket. It already exists in
  the lab account. If you fork this, run
  `aws s3 mb s3://my-state-bucket` first and update the `bucket =`.
- `terraform_state_bucket.txt` records the actual bucket name used. It
  is not consumed by Terraform — purely for human reference.

---

## variables.tf — inputs

| Variable | Default | Why |
|---|---|---|
| `aws_region` | `us-east-1` | All resources land here |
| `project_name` | `shopsmart` | Prefix for every resource name |

Override at apply time:
```bash
terraform apply -var="aws_region=us-east-2"
```

---

## main.tf — S3 (rubric phase 2) + ECR

### S3 bucket

The rubric explicitly requires a bucket with four properties:

| Requirement | How it's enforced |
|---|---|
| **Unique name** | `bucket_prefix = "shopsmart-artifacts-"` — AWS appends a random suffix |
| **Versioning enabled** | `aws_s3_bucket_versioning` resource sets `status = Enabled` |
| **Encryption enabled** | `aws_s3_bucket_server_side_encryption_configuration` with `AES256` |
| **Public access blocked** | `aws_s3_bucket_public_access_block` with all four `block_*` flags `true` |

Each property is its own resource in keeping with current AWS provider
practice (single-resource S3 config has been deprecated since v4).

### ECR repositories

```hcl
resource "aws_ecr_repository" "shopsmart_server" {
  name                 = "${var.project_name}-server"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
}
```

- **Mutable tags** — required because the `latest` tag is overwritten on
  every push. If you switch to immutable tags, also switch off `latest`
  and use commit SHAs.
- **Scan on push** — free-tier ECR scanning. Findings are visible in the
  AWS console under "Image vulnerability findings".

---

## vpc.tf — networking

```
VPC 10.0.0.0/16
├── public_1 (10.0.1.0/24, AZ a)
├── public_2 (10.0.2.0/24, AZ b)
├── IGW
├── route table (0.0.0.0/0 → IGW)
└── SG ecs_tasks (3000, 5001 ingress)
```

### EKS-required subnet tags

Both public subnets carry:
```
"kubernetes.io/role/elb"                          = "1"
"kubernetes.io/cluster/${project_name}-eks-cluster" = "shared"
```
Without these, **EKS Service of type LoadBalancer never gets an ELB
provisioned** — the AWS Load Balancer Controller skips untagged
subnets silently. The frontend Service is type `LoadBalancer`, so
this is non-negotiable.

### Why public-only?

Lab environments don't always permit NAT gateways (cost + IAM). Putting
ECS tasks and EKS nodes in public subnets with public IPs lets them
reach ECR / Secrets Manager / DNS without a NAT. **For production**,
move workloads to private subnets and add a NAT gateway.

---

## ec2.tf — jump host

```hcl
resource "aws_instance" "app_host" {
  ami                         = data.aws_ami.amazon_linux_2.id
  instance_type               = "t3.micro"
  subnet_id                   = aws_subnet.public_1.id
  vpc_security_group_ids      = [aws_security_group.ec2_app.id]
  associate_public_ip_address = true
  user_data                   = "<install Docker>"
}
```

- **AMI is looked up dynamically** via `data.aws_ami.amazon_linux_2`,
  filtered to `amzn2-ami-hvm-*-x86_64-gp2`, owner Amazon. New AMIs
  ship monthly; pinning an ID would mean re-applying after each rotation.
- **user_data installs Docker on first boot** so you can SSH in and
  `docker run` ad-hoc, or use it as a Compose host.
- The `ec2_public_ip` output exposes the address for `ssh ec2-user@…`.

This instance is here primarily to satisfy "the rubric should cover
EC2". For day-to-day use you do not need it — the actual workloads run
on Fargate / EKS.

---

## ecs.tf — Fargate cluster

Three resource families:

1. **CloudWatch log group** `/ecs/shopsmart` (7-day retention).
2. **ECS cluster** `shopsmart-cluster` with container insights enabled.
3. **Task definitions + services** for backend (`:5001`) and frontend
   (`:3000`), both Fargate, both using `LabRole` as execution + task role.

### Why one task per service (`desired_count = 1`)?

Lab cost. The k8s deployments use 2 replicas (rubric requirement). For
ECS the rubric does not mandate replica count, so we keep cost low.

### Network mode `awsvpc`

Each task gets its own ENI with its own public IP. That's why
`assign_public_ip = true` and the SG allows inbound on the container
port — there's no ALB in front.

> **Production note**: Putting Fargate tasks directly on the public
> internet without an ALB is fine for a lab, lousy for prod. Add an ALB
> + target groups when you go live.

---

## eks.tf — managed Kubernetes

```hcl
resource "aws_eks_cluster" "shopsmart_eks" {
  name     = "${var.project_name}-eks-cluster"
  role_arn = data.aws_iam_role.lab_role.arn
  version  = "1.30"
  vpc_config {
    subnet_ids             = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    endpoint_public_access = true
  }
}

resource "aws_eks_node_group" "shopsmart_nodes" {
  cluster_name    = aws_eks_cluster.shopsmart_eks.name
  node_group_name = "${var.project_name}-node-group"
  node_role_arn   = data.aws_iam_role.lab_role.arn
  subnet_ids      = [aws_subnet.public_1.id, aws_subnet.public_2.id]
  instance_types  = ["t3.medium"]
  scaling_config {
    desired_size = 2
    min_size     = 1
    max_size     = 3
  }
}
```

### Gotchas

- **First create takes 15–20 min**. EKS control plane provisioning is slow.
- **Node group creation needs subnets with auto-assigned public IPs**
  *or* a NAT gateway to reach ECR. Public subnets with `map_public_ip_on_launch = true`
  satisfy this.
- **`role_arn` is `LabRole`** for both the cluster and the nodes. In a
  proper account you'd create dedicated roles with
  `AmazonEKSClusterPolicy` (cluster) and
  `AmazonEKSWorkerNodePolicy + AmazonEC2ContainerRegistryReadOnly + AmazonEKS_CNI_Policy`
  (nodes). LabRole is permissive enough to cover both.
- **aws-auth ConfigMap**: when EKS is created by Terraform, the IAM
  identity that ran `terraform apply` (the CI session role) becomes the
  cluster admin automatically. The `deploy-eks` job uses that same role
  via `aws eks update-kubeconfig`, so kubectl auth just works.

---

## iam.tf — LabRole strategy

```hcl
data "aws_iam_role" "lab_role" {
  name = "LabRole"
}
```

That's the entire file. It exists because:

- AWS Academy / hackathon labs **forbid `iam:CreateRole`** for student
  accounts.
- `LabRole` is pre-provisioned with a trust policy covering ec2, ecs,
  ecs-tasks, eks, lambda, etc. and a permissions policy that's roughly
  PowerUser.
- Every component that needs an IAM identity (`aws_ecs_task_definition`,
  `aws_eks_cluster`, `aws_eks_node_group`) references
  `data.aws_iam_role.lab_role.arn`, so there's exactly one place to
  swap roles when you migrate out of the lab.

If you fork to a real account, replace the data source with dedicated
`aws_iam_role` + `aws_iam_role_policy_attachment` blocks per service.
The exact attachments needed are listed inline in `iam.tf`'s comments.

---

## Apply order (what depends on what)

Terraform figures this out from references, but conceptually:

```
S3 (independent)
ECR (independent)
LabRole (data, independent)
       │
VPC ───┼──── Subnets ──── IGW + RT + SG
       │            │
       │            ├──── EC2 instance
       │            ├──── ECS services
       │            └──── EKS cluster ─── Node group
       │
CloudWatch log group ── ECS task defs ── ECS services
```

Most-likely failure point on a clean account: **the EKS node group**
takes longest and has the most failure modes (subnet routing, IAM trust,
service quotas). Watch the `Terraform Apply` step in the workflow.

---

## Importing existing resources (CI behaviour)

`rubric-deployment.yml` runs an `import_if_missing` shell helper before
`terraform plan`. It tries to import:

```
aws_ecr_repository.shopsmart_server      shopsmart-server
aws_ecr_repository.shopsmart_client      shopsmart-client
aws_cloudwatch_log_group.ecs_logs        /ecs/shopsmart
aws_ecs_cluster.shopsmart_cluster        shopsmart-cluster
aws_ecs_service.backend                  shopsmart-cluster/shopsmart-backend-service
aws_ecs_service.frontend                 shopsmart-cluster/shopsmart-frontend-service
aws_eks_cluster.shopsmart_eks            shopsmart-eks-cluster
aws_eks_node_group.shopsmart_nodes       shopsmart-eks-cluster:shopsmart-node-group
```

Each import is best-effort: if the AWS object doesn't exist, the
import fails silently and the next `apply` simply creates it. If the
object exists, it gets adopted into state and apply reconciles
(no `AlreadyExists` error).

This is what makes the same workflow work on:
- A clean account → creates everything from scratch.
- A lab account that already has these resources → adopts them.

---

## Outputs

| Output | Source | Use |
|---|---|---|
| `iam_role_arn` | `iam.tf` | Quick reference for the LabRole ARN |
| `ec2_public_ip` | `ec2.tf` | `ssh ec2-user@$(terraform output -raw ec2_public_ip)` |

Add more as your operations needs grow — outputs are cheap and
self-documenting.

---

## Cost notes (us-east-1, lab pricing)

| Resource | Approx idle cost |
|---|---|
| EKS control plane | ~$0.10/hr (≈ $73/mo) |
| EKS node group (2× t3.medium) | ~$60/mo |
| ECS Fargate (2 tasks, 256/512) | ~$15/mo |
| EC2 jump host (t3.micro) | ~$8/mo |
| NAT gateway (NOT used here) | $30+/mo |
| S3 / ECR / CloudWatch | < $1/mo at this scale |

If you only need to demonstrate the pipeline once, run it, grab the
artefacts, and `terraform destroy` to stop the meter.
