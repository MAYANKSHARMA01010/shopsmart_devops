terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.43"
    }
  }
  # Note: In a production environment, you would configure a remote backend here.
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "shopsmart/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
}
