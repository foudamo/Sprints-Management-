terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

# Get AWS account ID
data "aws_caller_identity" "current" {}

# Get current AWS region
data "aws_region" "current" {}

# ECR authentication
resource "null_resource" "ecr_login" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      aws ecr get-login-password --region ${data.aws_region.current.name} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com
      sleep 5  # Wait for authentication to propagate
    EOT
  }
}

# Build and push backend image
resource "null_resource" "backend_image" {
  triggers = {
    always_run = timestamp()
  }

  depends_on = [null_resource.ecr_login]

  provisioner "local-exec" {
    command = <<-EOT
      aws ecr get-login-password --region ${data.aws_region.current.name} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com
      docker build -t ${var.backend_image_url}:${var.environment} -f server/Dockerfile ./server
      docker push ${var.backend_image_url}:${var.environment}
    EOT
  }
}

# Build and push frontend image
resource "null_resource" "frontend_image" {
  triggers = {
    always_run = timestamp()
  }

  depends_on = [null_resource.ecr_login]

  provisioner "local-exec" {
    command = <<-EOT
      aws ecr get-login-password --region ${data.aws_region.current.name} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com
      docker build -t ${var.frontend_image_url}:${var.environment} -f client/Dockerfile ./client
      docker push ${var.frontend_image_url}:${var.environment}
    EOT
  }
} 