# Frontend Service
resource "aws_ecs_service" "frontend" {
  name                   = "${var.app_name}-frontend-service-${var.environment}"
  cluster               = aws_ecs_cluster.main.id
  task_definition       = aws_ecs_task_definition.frontend.arn
  desired_count         = 1
  launch_type           = "FARGATE"
  platform_version      = "LATEST"
  force_new_deployment  = true

  # Force stop existing tasks
  lifecycle {
    create_before_destroy = true
    ignore_changes = [
      service_registries
    ]
  }

  # Deployment configuration
  deployment_controller {
    type = "ECS"
  }

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 50
  enable_ecs_managed_tags           = true
  health_check_grace_period_seconds = 120

  # Circuit breaker settings
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.frontend_target_group_arn
    container_name   = "frontend"
    container_port   = 80
  }

  depends_on = [aws_ecs_task_definition.frontend]
}

# Backend Service
resource "aws_ecs_service" "backend" {
  name            = "${var.app_name}-backend-service-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  enable_execute_command = true
  force_new_deployment = true

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 50
  enable_ecs_managed_tags           = true
  health_check_grace_period_seconds = 120

  # Circuit breaker settings
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.backend.arn
    container_name = "backend"
  }

  load_balancer {
    target_group_arn = var.backend_target_group_arn
    container_name   = "backend"
    container_port   = 3001
  }

  depends_on = [aws_ecs_task_definition.backend]

  # Ensure service discovery is handled carefully
  lifecycle {
    ignore_changes = [
      service_registries, 
      task_definition
    ]
    
    # Ensure clean removal of service discovery
    precondition {
      condition = can(aws_service_discovery_service.backend.id)
      error_message = "Service discovery service must exist before creating the service."
    }
  }
}

# Security group for ECS tasks
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.app_name}-ecs-tasks-sg-${var.environment}"
  description = "Security group for ECS tasks"
  vpc_id      = var.vpc_id

  # Allow ALB to frontend
  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
    description     = "Allow ALB to frontend"
  }

  # Allow ALB to backend
  ingress {
    from_port       = 3001
    to_port          = 3001
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
    description     = "Allow ALB to backend"
  }

  # Allow internal communication between tasks
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
    description = "Allow all internal traffic"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  lifecycle {
    create_before_destroy = true
    ignore_changes = [
      ingress,
      egress
    ]
  }

  tags = {
    Name        = "${var.app_name}-ecs-tasks-sg-${var.environment}"
    Environment = var.environment
  }
} 