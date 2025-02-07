output "application_url" {
  description = "URL of the application load balancer"
  value       = "http://${module.alb.alb_dns_name}"
}

output "backend_url" {
  description = "URL of the backend API"
  value       = "http://${module.alb.alb_dns_name}/api"
} 