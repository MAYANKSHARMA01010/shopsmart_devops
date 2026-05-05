# ==========================================
# EKS Cluster
# ==========================================

resource "aws_eks_cluster" "shopsmart_eks" {
  name     = "${var.project_name}-eks-cluster"
  role_arn = data.aws_iam_role.lab_role.arn

  vpc_config {
    subnet_ids = [aws_subnet.public_1.id, aws_subnet.public_2.id]
  }
}

# ==========================================
# EKS Node Group
# ==========================================

resource "aws_eks_node_group" "shopsmart_nodes" {
  cluster_name    = aws_eks_cluster.shopsmart_eks.name
  node_group_name = "${var.project_name}-node-group"
  node_role_arn   = data.aws_iam_role.lab_role.arn
  subnet_ids      = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  scaling_config {
    desired_size = 2
    max_size     = 3
    min_size     = 2
  }

  instance_types = ["t3.medium"]
}
