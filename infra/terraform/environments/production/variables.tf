variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "shopsmart"
}

variable "database_url" {
  description = "Database URL for the backend"
  type        = string
  sensitive   = true
}

variable "redis_url" {
  description = "Redis URL for the backend"
  type        = string
  sensitive   = true
}
