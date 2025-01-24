terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Configure Docker provider
provider "docker" {
  registry_auth {
    address  = local.aws_ecr_url
    username = data.aws_ecr_authorization_token.token.user_name
    password = data.aws_ecr_authorization_token.token.password
  }
}

# Get ECR authorization token
data "aws_ecr_authorization_token" "token" {}

locals {
  aws_ecr_url = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# ECR Repository
resource "aws_ecr_repository" "app" {
  name                 = "sprints"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "sprints"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "sprints-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# VPC for ECS
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "sprints-vpc"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count             = length(var.public_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnets[count.index]
  availability_zone = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "sprints-public-subnet-${count.index + 1}"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "sprints-igw"
  }
}

# Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "sprints-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(var.public_subnets)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name        = "sprints-ecs-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.main.id

  lifecycle {
    create_before_destroy = true
  }

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow all inbound traffic from ALB
  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

# Replace the docker_image and docker_registry_image resources with this:
resource "null_resource" "docker_build_push" {
  triggers = {
    dockerfile_hash = filesha256("${path.module}/Dockerfile")
    source_hash     = filesha256("${path.module}/server.js")
  }

  provisioner "local-exec" {
    command = <<EOF
      aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${local.aws_ecr_url}
      docker build -t ${aws_ecr_repository.app.repository_url}:latest .
      docker push ${aws_ecr_repository.app.repository_url}:latest
    EOF
  }

  depends_on = [
    aws_ecr_repository.app
  ]
}

# Update the ECS task definition to use the ECR image directly
resource "aws_ecs_task_definition" "app" {
  family                   = "sprints"
  requires_compatibilities = ["FARGATE"]
  network_mode            = "awsvpc"
  cpu                     = 256
  memory                  = 512
  execution_role_arn      = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "sprints"
      image     = "${aws_ecr_repository.app.repository_url}:latest"
      essential = true
      
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = "3000"
        },
        {
          name  = "DEBUG"
          value = "express:*"  # Enable Express debug logging
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "AWS_SDK_LOAD_CONFIG"
          value = "1"
        },
        {
          name = "AWS_ACCESS_KEY_ID"
          value = aws_iam_access_key.task_key.id
        },
        {
          name = "AWS_SECRET_ACCESS_KEY"
          value = aws_iam_access_key.task_key.secret
        }
      ]

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 10
        retries     = 3
        startPeriod = 120
      }

      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/sprints"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "sprints"
        }
      }

      mountPoints = []
      volumesFrom = []
    }
  ])

  depends_on = [
    null_resource.docker_build_push
  ]
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/sprints"
  retention_in_days = 30
}

# Add ALB Security Group
resource "aws_security_group" "alb" {
  name        = "sprints-alb-sg"
  description = "Security group for ALB"
  vpc_id      = aws_vpc.main.id

  lifecycle {
    create_before_destroy = true
  }

  ingress {
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

# Create ALB
resource "aws_lb" "main" {
  name               = "sprints-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = aws_subnet.public[*].id

  tags = {
    Name = "sprints-alb"
  }
}

# Create ALB Target Group
resource "aws_lb_target_group" "app" {
  name        = "sprints-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 45
    matcher             = "200-399"
    path                = "/health"
    port               = "traffic-port"
    protocol           = "HTTP"
    timeout            = 5
    unhealthy_threshold = 3
  }

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  # Increase deregistration delay to allow WebSocket connections to drain
  deregistration_delay = 120
}

# Create ALB Listener
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# Add listener rule for WebSocket
resource "aws_lb_listener_rule" "websocket" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 1

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }

  condition {
    path_pattern {
      values = ["/socket.io/*"]
    }
  }
}

# ECS Service
resource "aws_ecs_service" "app" {
  name            = "sprints-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  force_new_deployment = true
  health_check_grace_period_seconds = 120

  # Add lifecycle rule to handle security group changes
  lifecycle {
    create_before_destroy = true
  }

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "sprints"
    container_port   = 3000
  }

  # Force deployment after service creation/update
  provisioner "local-exec" {
    command = "aws ecs update-service --cluster ${aws_ecs_cluster.main.name} --service ${self.name} --force-new-deployment"
  }
}

# Add IAM role policy for CloudWatch Logs
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_logs" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Add policy for ECR access
resource "aws_iam_role_policy" "ecs_task_execution_role_policy" {
  name = "sprints-task-execution-role-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

# ECS Task Role
resource "aws_iam_role" "ecs_task_role" {
  name = "sprints-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Add DynamoDB permissions to ECS task role
resource "aws_iam_role_policy" "ecs_task_dynamodb" {
  name = "sprints-task-dynamodb-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.tasks.arn,
          aws_dynamodb_table.team_members.arn,
          aws_dynamodb_table.meeting_notes.arn
        ]
      }
    ]
  })
}

# DynamoDB Tables
resource "aws_dynamodb_table" "tasks" {
  name           = "sprints-tasks"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "memberName"
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "memberName"
    type = "S"
  }

  tags = {
    Environment = "production"
  }
}

resource "aws_dynamodb_table" "team_members" {
  name           = "sprints-team-members"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "name"
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "name"
    type = "S"
  }

  tags = {
    Environment = "production"
  }
}

resource "aws_dynamodb_table" "meeting_notes" {
  name           = "sprints-meeting-notes"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "date"
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "date"
    type = "S"
  }

  tags = {
    Environment = "production"
  }
}

# Create IAM user for task
resource "aws_iam_user" "task_user" {
  name = "sprints-task-user"
}

# Create access key for the IAM user
resource "aws_iam_access_key" "task_key" {
  user = aws_iam_user.task_user.name
}

# Create policy for the IAM user
resource "aws_iam_policy" "task_user_policy" {
  name = "sprints-task-user-policy"
  description = "Policy for Sprints task user to access DynamoDB"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.tasks.arn,
          aws_dynamodb_table.team_members.arn,
          aws_dynamodb_table.meeting_notes.arn
        ]
      }
    ]
  })
}

# Attach the DynamoDB policy to the IAM user
resource "aws_iam_user_policy_attachment" "task_policy" {
  user       = aws_iam_user.task_user.name
  policy_arn = aws_iam_policy.task_user_policy.arn
} 