variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "backend_ecr_url" {
  description = "Backend ECR repository URL"
  type        = string
}

variable "frontend_ecr_url" {
  description = "Frontend ECR repository URL"
  type        = string
}

variable "image_tag" {
  description = "Docker image tag"
  type        = string
  default     = "latest"
}

variable "backend_source_path" {
  description = "Path to backend source code"
  type        = string
  default     = "."
}

variable "frontend_source_path" {
  description = "Path to frontend source code"
  type        = string
  default     = "./client"
} 