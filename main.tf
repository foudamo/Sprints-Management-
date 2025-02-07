provider "aws" {
  region = var.aws_region
}

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# VPC and Network Configuration
module "vpc" {
  source = "./modules/vpc"

  environment = var.environment
  app_name    = var.app_name
}

# ECR Repositories
module "ecr" {
  source = "./modules/ecr"

  app_name = var.app_name
}

# ECS Cluster and Services
module "ecs" {
  source = "./modules/ecs"

  app_name                = var.app_name
  environment            = var.environment
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnets
  frontend_target_group_arn = module.alb.frontend_target_group_arn
  backend_target_group_arn  = module.alb.backend_target_group_arn
  alb_security_group_id     = module.alb.alb_security_group_id
  backend_ecr_repo_url     = module.ecr.backend_repository_url
  frontend_ecr_repo_url    = module.ecr.frontend_repository_url
  backend_image_tag        = var.backend_image_tag
  frontend_image_tag       = var.frontend_image_tag
  
  # Environment variables for containers
  backend_environment = {
    DB_NAME     = var.db_name
    DB_USER     = var.db_user
    DB_PASSWORD = var.db_password
    DB_HOST     = var.db_host
    DB_PORT     = var.db_port
    DB_SSL      = "true"
    NODE_ENV    = var.environment
  }

  frontend_environment = {
    REACT_APP_API_URL = "https://api.${var.domain_name}"
  }
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"

  app_name         = var.app_name
  environment     = var.environment
  vpc_id          = module.vpc.vpc_id
  public_subnets = module.vpc.public_subnets
}

# Docker module
module "docker" {
  source = "./modules/docker"

  aws_region       = var.aws_region
  backend_ecr_url  = module.ecr.backend_repository_url
  frontend_ecr_url = module.ecr.frontend_repository_url
  image_tag        = var.environment
  
  depends_on = [module.ecr]
} 