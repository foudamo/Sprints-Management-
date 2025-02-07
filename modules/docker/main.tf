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

# ECR authentication
resource "null_resource" "ecr_login" {
  provisioner "local-exec" {
    command = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
  }
}

# Build and push backend image
resource "null_resource" "backend_image" {
  triggers = {
    dir_sha1 = sha1(join("", [for f in fileset(var.backend_source_path, "**"): filesha1("${var.backend_source_path}/${f}")]))
  }

  provisioner "local-exec" {
    command = <<-EOF
      docker build \
        --platform linux/amd64 \
        -t ${var.backend_ecr_url}:${var.image_tag} \
        -f Dockerfile.backend \
        ${var.backend_source_path}
      docker push ${var.backend_ecr_url}:${var.image_tag}
    EOF
  }

  depends_on = [null_resource.ecr_login]
}

# Build and push frontend image
resource "null_resource" "frontend_image" {
  triggers = {
    dir_sha1 = sha1(join("", [for f in fileset(var.frontend_source_path, "**"): filesha1("${var.frontend_source_path}/${f}")]))
  }

  provisioner "local-exec" {
    command = <<-EOF
      cd ${var.frontend_source_path} && \
      docker build \
        --platform linux/amd64 \
        --no-cache \
        -t ${var.frontend_ecr_url}:${var.image_tag} \
        -f Dockerfile.frontend .
      docker push ${var.frontend_ecr_url}:${var.image_tag}
    EOF
  }

  depends_on = [null_resource.ecr_login]
} 