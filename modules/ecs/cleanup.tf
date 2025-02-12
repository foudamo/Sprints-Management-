resource "null_resource" "service_discovery_cleanup" {
  triggers = {
    service_discovery_id = aws_service_discovery_service.backend.id
    namespace_id         = aws_service_discovery_private_dns_namespace.main.id
  }

  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      # Forcefully deregister all instances
      INSTANCES=$(aws servicediscovery list-instances \
        --service-id ${self.triggers.service_discovery_id} \
        --region us-east-1 \
        --query 'Instances[*].Id' \
        --output text)

      if [ ! -z "$INSTANCES" ]; then
        for INSTANCE in $INSTANCES; do
          # Force deregister with multiple attempts
          for attempt in {1..5}; do
            aws servicediscovery deregister-instance \
              --service-id ${self.triggers.service_discovery_id} \
              --instance-id $INSTANCE \
              --region us-east-1 && break
            sleep 2
          done
        done
      fi

      # Attempt to delete service with multiple retries
      for attempt in {1..10}; do
        aws servicediscovery delete-service \
          --id ${self.triggers.service_discovery_id} \
          --region us-east-1 && break
        sleep 5
      done

      # Force delete namespace if no services remain
      SERVICE_COUNT=$(aws servicediscovery list-services \
        --filters Name="NAMESPACE_ID",Values="${self.triggers.namespace_id}" \
        --region us-east-1 \
        --query 'ServiceSummaries[*].Id' \
        --output text | wc -w)

      if [ "$SERVICE_COUNT" -eq 0 ]; then
        aws servicediscovery delete-namespace \
          --id ${self.triggers.namespace_id} \
          --region us-east-1 || true
      fi
    EOT
  }

  lifecycle {
    ignore_changes = all
  }
} 