# ==========================================
# output.tf — ShopSmart Terraform Outputs
# ==========================================
# NOTE: Three outputs already live inline in other files to satisfy
# cross-file references at plan/apply time:
#   - alb.tf       → ecs_alb_dns_name
#   - ec2.tf       → ec2_public_ip
#   - iam.tf       → iam_role_arn
# All remaining outputs are declared here for a single source of truth.

# ------------------------------------------
# Networking / VPC
# ------------------------------------------

output "vpc_id" {
  description = "ID of the main VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_1_id" {
  description = "ID of public subnet in AZ-a"
  value       = aws_subnet.public_1.id
}

output "public_subnet_2_id" {
  description = "ID of public subnet in AZ-b"
  value       = aws_subnet.public_2.id
}

# ------------------------------------------
# S3 Artifact Bucket
# ------------------------------------------

output "s3_artifact_bucket_name" {
  description = "Name of the S3 bucket used for build artifacts"
  value       = aws_s3_bucket.shopsmart_artifacts.id
}

output "s3_artifact_bucket_arn" {
  description = "ARN of the S3 artifact bucket"
  value       = aws_s3_bucket.shopsmart_artifacts.arn
}

# ------------------------------------------
# ECR Repositories
# ------------------------------------------

output "ecr_server_repository_url" {
  description = "ECR repository URL for the backend (server) image"
  value       = aws_ecr_repository.shopsmart_server.repository_url
}

output "ecr_client_repository_url" {
  description = "ECR repository URL for the frontend (client) image"
  value       = aws_ecr_repository.shopsmart_client.repository_url
}

# ------------------------------------------
# ECS
# ------------------------------------------

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.shopsmart_cluster.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.shopsmart_cluster.arn
}

output "ecs_backend_service_name" {
  description = "Name of the ECS backend service"
  value       = aws_ecs_service.backend.name
}

output "ecs_frontend_service_name" {
  description = "Name of the ECS frontend service"
  value       = aws_ecs_service.frontend.name
}

output "cloudwatch_log_group_name" {
  description = "CloudWatch log group used by ECS tasks"
  value       = aws_cloudwatch_log_group.ecs_logs.name
}

# ------------------------------------------
# ALB (also declared inline in alb.tf)
# ------------------------------------------

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.ecs_alb.arn
}

output "alb_zone_id" {
  description = "Hosted zone ID of the ALB (useful for Route 53 alias records)"
  value       = aws_lb.ecs_alb.zone_id
}

output "app_url" {
  description = "Full HTTP URL of the ShopSmart application via ALB"
  value       = "http://${aws_lb.ecs_alb.dns_name}"
}

# ------------------------------------------
# EKS
# ------------------------------------------

output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = aws_eks_cluster.shopsmart_eks.name
}

output "eks_cluster_endpoint" {
  description = "API endpoint of the EKS cluster"
  value       = aws_eks_cluster.shopsmart_eks.endpoint
}

output "eks_cluster_ca_certificate" {
  description = "Base64-encoded CA certificate for the EKS cluster"
  value       = aws_eks_cluster.shopsmart_eks.certificate_authority[0].data
  sensitive   = true
}

output "eks_node_group_name" {
  description = "Name of the EKS managed node group"
  value       = aws_eks_node_group.shopsmart_nodes.node_group_name
}
