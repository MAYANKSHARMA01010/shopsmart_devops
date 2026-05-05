terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # Note: In a production environment, you would configure a remote backend here.
  backend "s3" {
    bucket = "shopsmart-terraform-state-mayank" # Ensure you create this bucket!
    key    = "shopsmart/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}
