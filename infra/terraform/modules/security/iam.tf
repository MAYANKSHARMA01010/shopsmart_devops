# ==========================================
# IAM — LabRole strategy
# ==========================================
# AWS Academy / lab environments restrict creating new IAM roles, so we
# rely on the pre-provisioned `LabRole`. It is the only role students
# can use as the trust anchor for ECS tasks, EKS clusters/nodes, and
# Lambda — its trust policy already covers ec2/ecs/eks service principals.
#
# Every component that needs an IAM identity in this project pulls from
# this single data source:
#
#   - aws_ecs_task_definition.execution_role_arn   → ECS pulls images / writes logs
#   - aws_ecs_task_definition.task_role_arn        → ECS task runtime permissions
#   - aws_eks_cluster.role_arn                     → EKS control plane
#   - aws_eks_node_group.node_role_arn             → EKS worker nodes (EC2)
#   - aws_instance (via instance profile, optional) → EC2 jump host
#
# If you move out of a lab environment, replace the data source with
# dedicated `aws_iam_role` resources scoped to least-privilege policies
# (AmazonEKSClusterPolicy, AmazonEKSWorkerNodePolicy, AmazonECSTaskExecutionRolePolicy, etc.).

data "aws_iam_role" "lab_role" {
  name = "LabRole"
}

output "iam_role_arn" {
  description = "IAM role used by ECS, EKS, and EC2"
  value       = data.aws_iam_role.lab_role.arn
}
