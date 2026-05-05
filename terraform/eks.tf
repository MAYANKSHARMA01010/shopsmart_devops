# ==========================================
# EKS Cluster (Using Data source to prevent ResourceInUseException)
# ==========================================

data "aws_eks_cluster" "shopsmart_eks" {
  name = "${var.project_name}-eks-cluster"
}

# ==========================================
# EKS Node Group (Using Data source to prevent ResourceInUseException)
# ==========================================

data "aws_eks_node_group" "shopsmart_nodes" {
  cluster_name    = data.aws_eks_cluster.shopsmart_eks.name
  node_group_name = "${var.project_name}-node-group"
}
