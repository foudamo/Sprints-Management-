# Service Discovery Namespace
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = coalesce(var.service_discovery_namespace, "sprints-management")
  vpc         = var.vpc_id
  description = "Service discovery namespace for ${var.app_name} in ${var.environment}"
}

# Service Discovery Service - Backend
resource "aws_service_discovery_service" "backend" {
  name = "backend"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    
    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 3
  }

  # Add tags for easier debugging
  tags = {
    Name = "${var.app_name}-backend-service-${var.environment}"
    Environment = var.environment
    Service = "backend"
  }

  # Forcefully handle service discovery
  lifecycle {
    prevent_destroy = false
    ignore_changes = [
      dns_config[0].dns_records[0].ttl,
      health_check_custom_config[0].failure_threshold
    ]
  }
} 