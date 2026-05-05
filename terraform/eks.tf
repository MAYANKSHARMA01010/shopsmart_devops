# ==========================================
# EKS Cluster (managed by Terraform)
# ==========================================
# Uses LabRole for both cluster and node group, since lab environments
# restrict creating new IAM roles. LabRole's trust policy already
# permits eks.amazonaws.com and ec2.amazonaws.com.

resource "aws_eks_cluster" "shopsmart_eks" {
  name     = "${var.project_name}-eks-cluster"
  role_arn = data.aws_iam_role.lab_role.arn
  version  = "1.30"

  vpc_config {
    subnet_ids              = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    endpoint_public_access  = true
    endpoint_private_access = false
  }

  tags = {
    Project = var.project_name
  }
}

# ==========================================
# EKS Managed Node Group
# ==========================================

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

  update_config {
    max_unavailable = 1
  }

  tags = {
    Project = var.project_name
  }
}
