# Service Discovery Namespace
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = var.app_name
  vpc         = var.vpc_id
  description = "Service discovery namespace for ${var.app_name}"
}

# Service Discovery Service - Backend
resource "aws_service_discovery_service" "backend" {
  name = "${var.app_name}-backend-service-${var.environment}"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    
    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
} 