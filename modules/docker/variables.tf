variable "environment" {
  description = "Environment name (e.g., dev, prod)"
  type        = string
}

variable "backend_image_url" {
  description = "URL for the backend ECR repository"
  type        = string
}

variable "frontend_image_url" {
  description = "URL for the frontend ECR repository"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
} 