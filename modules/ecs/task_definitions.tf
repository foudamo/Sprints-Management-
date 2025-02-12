resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.app_name}-frontend-${var.environment}"
  requires_compatibilities = ["FARGATE"]
  network_mode            = "awsvpc"
  cpu                     = 256
  memory                  = 512

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "${var.frontend_ecr_repo_url}:${var.environment}"
      essential = true

      entryPoint = ["/bin/sh", "-c"]
      command    = ["apk add --no-cache curl && nginx -g 'daemon off;'"]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "REACT_APP_API_URL"
          value = "http://backend.${var.service_discovery_namespace}:3001"
        },
        {
          name  = "BACKEND_URL"
          value = "http://backend.${var.service_discovery_namespace}:3001"
        },
        {
          name  = "NGINX_PORT"
          value = "80"
        },
        {
          name  = "BACKEND_HOST"
          value = "backend.${var.service_discovery_namespace}"
        }
      ]

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:80 || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      portMappings = [
        {
          containerPort = 80
          hostPort     = 80
          protocol     = "tcp"
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.app_name}-frontend-${var.environment}"
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  execution_role_arn = aws_iam_role.ecs_execution_role.arn
  task_role_arn      = aws_iam_role.ecs_task_role.arn

  tags = {
    Name        = "${var.app_name}-frontend-task-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.app_name}-backend-${var.environment}"
  requires_compatibilities = ["FARGATE"]
  network_mode            = "awsvpc"
  cpu                     = 256
  memory                  = 512

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${var.backend_ecr_repo_url}:${var.environment}"
      essential = true

      entryPoint = ["/bin/sh", "-c"]
      command    = ["apk add --no-cache curl && node server.js"]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3001"
        },
        {
          name  = "HOST"
          value = "0.0.0.0"
        },
        {
          name = "API_PREFIX"
          value = "/api"
        },
        {
          name = "SERVICE_DISCOVERY_NAMESPACE"
          value = var.service_discovery_namespace
        }
      ]

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3001/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      portMappings = [
        {
          containerPort = 3001
          hostPort      = 3001
          protocol      = "tcp"
          appProtocol   = "http"
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.app_name}-backend-${var.environment}"
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  execution_role_arn = aws_iam_role.ecs_execution_role.arn
  task_role_arn      = aws_iam_role.ecs_task_role.arn

  tags = {
    Name        = "${var.app_name}-backend-task-${var.environment}"
    Environment = var.environment
  }
} 