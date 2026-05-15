#!/bin/bash

# =============================================================================
# nuke_aws_resources.sh — Full AWS Cleanup for ShopSmart (Learner Lab)
# =============================================================================
# Destroys ALL ShopSmart-tagged or named AWS resources:
#   EC2 Instances, Security Groups, Key Pairs
#   S3 Buckets (all versions + delete markers)
#   ECR Repositories
#   ECS Clusters, Services, Task Definitions
#   EKS Clusters + Node Groups
#   Load Balancers (ALB/NLB/Classic) + Target Groups + Listeners
#   VPCs + Subnets, Route Tables, Internet Gateways, NAT Gateways, EIPs
#   CloudWatch Log Groups
#   Auto Scaling Groups + Launch Templates
# =============================================================================
# NOTE: Learner Lab IAM is heavily restricted. This script uses "|| true"
# everywhere so a permission denial never stops the full cleanup run.
# =============================================================================

set -uo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
REGION="${AWS_REGION:-us-east-1}"
PROJECT="shopsmart"
CLUSTER_NAME="${PROJECT}-cluster"
EKS_CLUSTER="${PROJECT}-eks-cluster"
NODE_GROUP="${PROJECT}-node-group"
LOG_GROUP="/ecs/${PROJECT}"

# Colour helpers
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

step()  { echo -e "\n${CYAN}${BOLD}━━━ $* ━━━${NC}"; }
info()  { echo -e "  ${YELLOW}→${NC} $*"; }
ok()    { echo -e "  ${GREEN}✔${NC} $*"; }
warn()  { echo -e "  ${RED}✘${NC} $* (skipped — may lack permission)"; }

# ─── Preflight ───────────────────────────────────────────────────────────────
step "Preflight — verifying AWS identity"
aws sts get-caller-identity --region "$REGION" || { echo "AWS credentials not configured."; exit 1; }
echo ""
echo -e "${RED}${BOLD}⚠  WARNING: This will PERMANENTLY DELETE all ShopSmart AWS resources.${NC}"
echo -e "${RED}${BOLD}   Press Ctrl-C within 10 seconds to abort...${NC}"
sleep 10

# =============================================================================
# 1. ECS — Services → Cluster
# =============================================================================
step "ECS — Draining & Deleting Services"
EXISTING_SERVICES=$(aws ecs list-services \
  --cluster "$CLUSTER_NAME" \
  --region "$REGION" \
  --query 'serviceArns[]' \
  --output text 2>/dev/null || true)

for SVC_ARN in $EXISTING_SERVICES; do
  SVC_NAME=$(basename "$SVC_ARN")
  info "Force-deleting ECS service: $SVC_NAME"
  aws ecs update-service --cluster "$CLUSTER_NAME" --service "$SVC_NAME" \
    --desired-count 0 --region "$REGION" > /dev/null 2>&1 || true
  aws ecs delete-service --cluster "$CLUSTER_NAME" --service "$SVC_NAME" \
    --force --region "$REGION" > /dev/null 2>&1 || true
done

# Wait for all services to become INACTIVE
if [ -n "${EXISTING_SERVICES:-}" ]; then
  info "Waiting for ECS services to drain..."
  sleep 15
fi

step "ECS — Stopping Running Tasks"
TASKS=$(aws ecs list-tasks \
  --cluster "$CLUSTER_NAME" \
  --region "$REGION" \
  --query 'taskArns[]' \
  --output text 2>/dev/null || true)

for TASK_ARN in $TASKS; do
  info "Stopping task: $TASK_ARN"
  aws ecs stop-task --cluster "$CLUSTER_NAME" --task "$TASK_ARN" \
    --region "$REGION" > /dev/null 2>&1 || true
done

step "ECS — Deregistering Task Definitions"
TASK_DEFS=$(aws ecs list-task-definitions \
  --family-prefix "$PROJECT" \
  --region "$REGION" \
  --query 'taskDefinitionArns[]' \
  --output text 2>/dev/null || true)

for TD_ARN in $TASK_DEFS; do
  info "Deregistering task def: $TD_ARN"
  aws ecs deregister-task-definition --task-definition "$TD_ARN" \
    --region "$REGION" > /dev/null 2>&1 || true
done

step "ECS — Deleting Cluster"
if aws ecs describe-clusters --clusters "$CLUSTER_NAME" \
   --region "$REGION" \
   --query "clusters[?status=='ACTIVE'].clusterName" \
   --output text 2>/dev/null | grep -q "$CLUSTER_NAME"; then
  info "Deleting ECS cluster: $CLUSTER_NAME"
  aws ecs delete-cluster --cluster "$CLUSTER_NAME" --region "$REGION" > /dev/null 2>&1 || true
  ok "ECS cluster deleted"
else
  ok "No active ECS cluster found"
fi

# =============================================================================
# 2. EC2 Instances
# =============================================================================
step "EC2 — Terminating Instances"
EC2_IDS=$(aws ec2 describe-instances \
  --region "$REGION" \
  --filters "Name=tag:Name,Values=${PROJECT}*" "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query 'Reservations[*].Instances[*].InstanceId' \
  --output text 2>/dev/null || true)

if [ -n "$EC2_IDS" ]; then
  info "Terminating EC2 instances: $EC2_IDS"
  aws ec2 terminate-instances --region "$REGION" --instance-ids $EC2_IDS > /dev/null 2>&1 || true
  info "Waiting for instances to terminate..."
  aws ec2 wait instance-terminated --region "$REGION" --instance-ids $EC2_IDS 2>/dev/null || true
  ok "EC2 instances terminated"
else
  ok "No running EC2 instances found"
fi

# =============================================================================
# 3. Load Balancers — ALB / NLB / Classic
# =============================================================================
step "Load Balancers — Deleting ALBs & NLBs"
LB_ARNS=$(aws elbv2 describe-load-balancers \
  --region "$REGION" \
  --query "LoadBalancers[?contains(LoadBalancerName, '${PROJECT}')].LoadBalancerArn" \
  --output text 2>/dev/null || true)

for LB_ARN in $LB_ARNS; do
  LB_NAME=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns "$LB_ARN" --region "$REGION" \
    --query 'LoadBalancers[0].LoadBalancerName' --output text 2>/dev/null)
  info "Deleting Load Balancer: $LB_NAME"
  aws elbv2 delete-load-balancer --load-balancer-arn "$LB_ARN" --region "$REGION" 2>/dev/null || true
done

if [ -n "${LB_ARNS:-}" ]; then
  info "Waiting for load balancers to be deleted..."
  sleep 20
fi

step "Load Balancers — Deleting Target Groups"
TG_ARNS=$(aws elbv2 describe-target-groups \
  --region "$REGION" \
  --query "TargetGroups[?contains(TargetGroupName, '${PROJECT}')].TargetGroupArn" \
  --output text 2>/dev/null || true)

for TG_ARN in $TG_ARNS; do
  info "Deleting Target Group: $TG_ARN"
  aws elbv2 delete-target-group --target-group-arn "$TG_ARN" --region "$REGION" 2>/dev/null || true
done

step "Load Balancers — Deleting Classic ELBs"
CLASSIC_LBS=$(aws elb describe-load-balancers \
  --region "$REGION" \
  --query "LoadBalancerDescriptions[?contains(LoadBalancerName, '${PROJECT}')].LoadBalancerName" \
  --output text 2>/dev/null || true)

for CLB in $CLASSIC_LBS; do
  info "Deleting Classic ELB: $CLB"
  aws elb delete-load-balancer --load-balancer-name "$CLB" --region "$REGION" 2>/dev/null || true
done

# =============================================================================
# 4. Auto Scaling Groups & Launch Templates
# =============================================================================
step "Auto Scaling — Deleting ASGs"
ASGS=$(aws autoscaling describe-auto-scaling-groups \
  --region "$REGION" \
  --query "AutoScalingGroups[?contains(AutoScalingGroupName, '${PROJECT}')].AutoScalingGroupName" \
  --output text 2>/dev/null || true)

for ASG in $ASGS; do
  info "Deleting ASG: $ASG"
  aws autoscaling delete-auto-scaling-group --auto-scaling-group-name "$ASG" \
    --force-delete --region "$REGION" 2>/dev/null || true
done

step "Auto Scaling — Deleting Launch Templates"
LTS=$(aws ec2 describe-launch-templates \
  --region "$REGION" \
  --query "LaunchTemplates[?contains(LaunchTemplateName, '${PROJECT}')].LaunchTemplateId" \
  --output text 2>/dev/null || true)

for LT in $LTS; do
  info "Deleting Launch Template: $LT"
  aws ec2 delete-launch-template --launch-template-id "$LT" --region "$REGION" 2>/dev/null || true
done

# =============================================================================
# 5. EKS — Node Groups → Cluster
# =============================================================================
step "EKS — Deleting Node Group"
if aws eks describe-node-group \
   --cluster-name "$EKS_CLUSTER" \
   --node-group-name "$NODE_GROUP" \
   --region "$REGION" > /dev/null 2>&1; then
  info "Deleting EKS Node Group: $NODE_GROUP (can take 5-10 min)..."
  aws eks delete-node-group \
    --cluster-name "$EKS_CLUSTER" \
    --node-group-name "$NODE_GROUP" \
    --region "$REGION" 2>/dev/null || true
  aws eks wait node-group-deleted \
    --cluster-name "$EKS_CLUSTER" \
    --node-group-name "$NODE_GROUP" \
    --region "$REGION" 2>/dev/null || true
  ok "EKS Node Group deleted"
else
  ok "No EKS Node Group found"
fi

step "EKS — Deleting Cluster"
if aws eks describe-cluster --name "$EKS_CLUSTER" --region "$REGION" > /dev/null 2>&1; then
  info "Deleting EKS Cluster: $EKS_CLUSTER (can take 10-15 min)..."
  aws eks delete-cluster --name "$EKS_CLUSTER" --region "$REGION" 2>/dev/null || true
  aws eks wait cluster-deleted --name "$EKS_CLUSTER" --region "$REGION" 2>/dev/null || true
  ok "EKS Cluster deleted"
else
  ok "No EKS Cluster found"
fi

step "Kubernetes — Cleaning up local namespace (if kubeconfig valid)"
if kubectl get ns "${PROJECT}-prod" > /dev/null 2>&1; then
  info "Deleting K8s namespace: ${PROJECT}-prod"
  kubectl delete ns "${PROJECT}-prod" --timeout=60s 2>/dev/null || true
fi

# =============================================================================
# 6. ECR — Repositories
# =============================================================================
step "ECR — Deleting Repositories"
ECR_REPOS=$(aws ecr describe-repositories \
  --region "$REGION" \
  --query "repositories[?contains(repositoryName, '${PROJECT}')].repositoryName" \
  --output text 2>/dev/null || true)

for REPO in $ECR_REPOS; do
  info "Force-deleting ECR repository: $REPO"
  aws ecr delete-repository --repository-name "$REPO" \
    --force --region "$REGION" > /dev/null 2>&1 || warn "ECR delete failed: $REPO"
  ok "Deleted ECR repo: $REPO"
done

if [ -z "${ECR_REPOS:-}" ]; then ok "No ECR repositories found"; fi

# =============================================================================
# 7. S3 — Buckets (all versions + delete markers)
# =============================================================================
step "S3 — Emptying & Deleting Buckets"
S3_BUCKETS=$(aws s3api list-buckets \
  --query "Buckets[?contains(Name, '${PROJECT}')].Name" \
  --output text 2>/dev/null || true)

for BUCKET in $S3_BUCKETS; do
  info "Emptying bucket: $BUCKET"

  # Remove all object versions (needed for versioned buckets)
  aws s3api list-object-versions \
    --bucket "$BUCKET" \
    --query '{Objects: Versions[].{Key: Key, VersionId: VersionId}}' \
    --output json 2>/dev/null | \
  jq -c 'select(.Objects != null) | {Objects: .Objects, Quiet: true}' | \
  xargs -I{} aws s3api delete-objects --bucket "$BUCKET" --delete '{}' 2>/dev/null || true

  # Remove all delete markers
  aws s3api list-object-versions \
    --bucket "$BUCKET" \
    --query '{Objects: DeleteMarkers[].{Key: Key, VersionId: VersionId}}' \
    --output json 2>/dev/null | \
  jq -c 'select(.Objects != null) | {Objects: .Objects, Quiet: true}' | \
  xargs -I{} aws s3api delete-objects --bucket "$BUCKET" --delete '{}' 2>/dev/null || true

  # Fallback: recursive rm for unversioned objects
  aws s3 rm "s3://$BUCKET" --recursive 2>/dev/null || true

  info "Deleting bucket: $BUCKET"
  aws s3api delete-bucket --bucket "$BUCKET" --region "$REGION" 2>/dev/null || \
    aws s3 rb "s3://$BUCKET" --force 2>/dev/null || \
    warn "Could not delete bucket $BUCKET"

  ok "Bucket deleted: $BUCKET"
done

if [ -z "${S3_BUCKETS:-}" ]; then ok "No S3 buckets found"; fi

# =============================================================================
# 8. NAT Gateways & Elastic IPs (must go before VPC deletion)
# =============================================================================
step "NAT Gateways — Deleting"
NAT_IDS=$(aws ec2 describe-nat-gateways \
  --region "$REGION" \
  --filter "Name=tag:Name,Values=${PROJECT}*" \
  --query 'NatGateways[?State!=`deleted`].NatGatewayId' \
  --output text 2>/dev/null || true)

for NAT in $NAT_IDS; do
  info "Deleting NAT Gateway: $NAT"
  aws ec2 delete-nat-gateway --nat-gateway-id "$NAT" --region "$REGION" > /dev/null 2>&1 || true
done

if [ -n "${NAT_IDS:-}" ]; then
  info "Waiting for NAT Gateways to delete (60s)..."
  sleep 60
fi

step "Elastic IPs — Releasing"
EIP_ALLOCS=$(aws ec2 describe-addresses \
  --region "$REGION" \
  --query "Addresses[?Tags[?Key=='Name' && contains(Value, '${PROJECT}')]].AllocationId" \
  --output text 2>/dev/null || true)

for EIP in $EIP_ALLOCS; do
  info "Releasing EIP: $EIP"
  aws ec2 release-address --allocation-id "$EIP" --region "$REGION" 2>/dev/null || true
done

# =============================================================================
# 9. VPC — Full teardown
# =============================================================================
step "VPC — Full Teardown (all shopsmart VPCs)"
VPC_IDS=$(aws ec2 describe-vpcs \
  --region "$REGION" \
  --filters "Name=tag:Name,Values=${PROJECT}*" \
  --query 'Vpcs[*].VpcId' \
  --output text 2>/dev/null || true)

for VPC_ID in $VPC_IDS; do
  info "Cleaning VPC: $VPC_ID"

  # a) Internet Gateways
  IGWS=$(aws ec2 describe-internet-gateways \
    --region "$REGION" \
    --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
    --query 'InternetGateways[*].InternetGatewayId' \
    --output text 2>/dev/null || true)
  for IGW in $IGWS; do
    info "  Detaching & deleting IGW: $IGW"
    aws ec2 detach-internet-gateway --region "$REGION" --internet-gateway-id "$IGW" --vpc-id "$VPC_ID" 2>/dev/null || true
    aws ec2 delete-internet-gateway --region "$REGION" --internet-gateway-id "$IGW" 2>/dev/null || true
  done

  # b) Subnets
  SUBNETS=$(aws ec2 describe-subnets \
    --region "$REGION" \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'Subnets[*].SubnetId' \
    --output text 2>/dev/null || true)
  for SUBNET in $SUBNETS; do
    info "  Deleting subnet: $SUBNET"
    aws ec2 delete-subnet --region "$REGION" --subnet-id "$SUBNET" 2>/dev/null || true
  done

  # c) Non-main Route Tables
  ROUTE_TABLES=$(aws ec2 describe-route-tables \
    --region "$REGION" \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'RouteTables[?Associations[0].Main != `true`].RouteTableId' \
    --output text 2>/dev/null || true)
  for RT in $ROUTE_TABLES; do
    info "  Deleting route table: $RT"
    aws ec2 delete-route-table --region "$REGION" --route-table-id "$RT" 2>/dev/null || true
  done

  # d) Non-default Security Groups
  SECURITY_GROUPS=$(aws ec2 describe-security-groups \
    --region "$REGION" \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'SecurityGroups[?GroupName != `default`].GroupId' \
    --output text 2>/dev/null || true)
  for SG in $SECURITY_GROUPS; do
    info "  Deleting security group: $SG"
    aws ec2 delete-security-group --region "$REGION" --group-id "$SG" 2>/dev/null || true
  done

  # e) VPC Endpoints
  VPC_ENDPOINTS=$(aws ec2 describe-vpc-endpoints \
    --region "$REGION" \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'VpcEndpoints[*].VpcEndpointId' \
    --output text 2>/dev/null || true)
  for EP in $VPC_ENDPOINTS; do
    info "  Deleting VPC endpoint: $EP"
    aws ec2 delete-vpc-endpoints --vpc-endpoint-ids "$EP" --region "$REGION" 2>/dev/null || true
  done

  # f) VPC Peering Connections
  PEERING=$(aws ec2 describe-vpc-peering-connections \
    --region "$REGION" \
    --filters "Name=requester-vpc-info.vpc-id,Values=$VPC_ID" \
    --query 'VpcPeeringConnections[*].VpcPeeringConnectionId' \
    --output text 2>/dev/null || true)
  for PC in $PEERING; do
    info "  Deleting VPC peering: $PC"
    aws ec2 delete-vpc-peering-connection --vpc-peering-connection-id "$PC" --region "$REGION" 2>/dev/null || true
  done

  # g) Delete VPC
  info "  Deleting VPC: $VPC_ID"
  aws ec2 delete-vpc --region "$REGION" --vpc-id "$VPC_ID" 2>/dev/null || warn "Could not delete VPC $VPC_ID"
  ok "VPC $VPC_ID cleaned"
done

if [ -z "${VPC_IDS:-}" ]; then ok "No ShopSmart VPCs found"; fi

# =============================================================================
# 10. Key Pairs
# =============================================================================
step "EC2 — Deleting Key Pairs"
KEY_PAIRS=$(aws ec2 describe-key-pairs \
  --region "$REGION" \
  --query "KeyPairs[?contains(KeyName, '${PROJECT}')].KeyName" \
  --output text 2>/dev/null || true)

for KP in $KEY_PAIRS; do
  info "Deleting key pair: $KP"
  aws ec2 delete-key-pair --key-name "$KP" --region "$REGION" 2>/dev/null || true
done

# =============================================================================
# 11. CloudWatch Log Groups
# =============================================================================
step "CloudWatch — Deleting Log Groups"
LOG_GROUPS=$(aws logs describe-log-groups \
  --region "$REGION" \
  --log-group-name-prefix "/ecs/${PROJECT}" \
  --query 'logGroups[*].logGroupName' \
  --output text 2>/dev/null || true)

# Also catch any /aws/eks or /aws/ec2 shopsmart groups
EKS_LOGS=$(aws logs describe-log-groups \
  --region "$REGION" \
  --log-group-name-prefix "/aws/eks/${PROJECT}" \
  --query 'logGroups[*].logGroupName' \
  --output text 2>/dev/null || true)

for LG in $LOG_GROUPS $EKS_LOGS; do
  info "Deleting log group: $LG"
  aws logs delete-log-group --log-group-name "$LG" --region "$REGION" 2>/dev/null || true
done

if [ -z "${LOG_GROUPS:-}" ] && [ -z "${EKS_LOGS:-}" ]; then ok "No log groups found"; fi

# =============================================================================
# 12. IAM Roles & Instance Profiles (Learner Lab may deny — best effort)
# =============================================================================
step "IAM — Cleaning Up Roles (best effort — may be denied)"
IAM_ROLES=$(aws iam list-roles \
  --query "Roles[?contains(RoleName, '${PROJECT}')].RoleName" \
  --output text 2>/dev/null || true)

for ROLE in $IAM_ROLES; do
  info "Detaching policies from role: $ROLE"
  ATTACHED=$(aws iam list-attached-role-policies --role-name "$ROLE" \
    --query 'AttachedPolicies[*].PolicyArn' --output text 2>/dev/null || true)
  for POLICY_ARN in $ATTACHED; do
    aws iam detach-role-policy --role-name "$ROLE" --policy-arn "$POLICY_ARN" 2>/dev/null || true
  done

  # Remove from instance profiles
  PROFILES=$(aws iam list-instance-profiles-for-role --role-name "$ROLE" \
    --query 'InstanceProfiles[*].InstanceProfileName' --output text 2>/dev/null || true)
  for PROFILE in $PROFILES; do
    aws iam remove-role-from-instance-profile --instance-profile-name "$PROFILE" \
      --role-name "$ROLE" 2>/dev/null || true
    aws iam delete-instance-profile --instance-profile-name "$PROFILE" 2>/dev/null || true
  done

  aws iam delete-role --role-name "$ROLE" 2>/dev/null || warn "Could not delete IAM role: $ROLE"
done

# =============================================================================
# Final Summary
# =============================================================================
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════╗"
echo -e "║           🎉 AWS CLEANUP COMPLETE — ShopSmart                ║"
echo -e "╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Region  : ${BOLD}$REGION${NC}"
echo -e "  Project : ${BOLD}$PROJECT${NC}"
echo ""
echo -e "  Resources targeted:"
echo -e "    ✔ ECS  — Services, Tasks, Task Defs, Cluster"
echo -e "    ✔ EC2  — Instances, Key Pairs, Security Groups"
echo -e "    ✔ ELB  — ALBs, NLBs, Classic ELBs, Target Groups"
echo -e "    ✔ EKS  — Node Groups, Cluster"
echo -e "    ✔ ECR  — All ${PROJECT}-* repositories"
echo -e "    ✔ S3   — All ${PROJECT}-* buckets (versioned)"
echo -e "    ✔ VPC  — IGW, Subnets, Route Tables, SGs, Endpoints"
echo -e "    ✔ NAT  — NAT Gateways + Elastic IPs"
echo -e "    ✔ CW   — CloudWatch Log Groups"
echo -e "    ✔ ASG  — Auto Scaling Groups + Launch Templates"
echo -e "    ✔ IAM  — Roles (best-effort, may be denied by Lab)"
echo ""
echo -e "  ${YELLOW}⚡ Run Terraform apply to redeploy fresh infrastructure.${NC}"
echo ""
