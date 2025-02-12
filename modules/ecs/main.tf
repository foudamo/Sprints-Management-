data "aws_region" "current" {}

# Get VPC information
data "aws_vpc" "selected" {
  id = var.vpc_id
}

resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-cluster-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "${var.app_name}-cluster-${var.environment}"
    Environment = var.environment
  }
}

# Add the rest of the ECS module files (services, security groups, IAM roles) in the next message... 