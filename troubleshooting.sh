#!/bin/bash

# Enhanced debugging
set -o pipefail
set -x  # Enable command tracing
export AWS_DEBUG=true
export DEBUG=*
export DEBUG_DEPTH=10
export AWS_PROFILE=${AWS_PROFILE:-default}
export AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1}

# Function definitions must come before they are used
function debug() {
  local level=$1
  shift
  echo "[$(date '+%Y-%m-%d %H:%M:%S.%N')] [${level}] $*" >&2
}

function check_network_detailed() {
  local target=$1
  local port=$2
  debug "INFO" "Checking network connectivity to ${target}:${port}"
  
  # DNS resolution
  debug "INFO" "DNS resolution for ${target}:"
  dig +trace ${target} || true
  
  # TCP connection
  debug "INFO" "TCP connection test to ${target}:${port}:"
  nc -zv -w 5 ${target} ${port} || true
  
  # Full connection details
  debug "INFO" "Connection details:"
  curl -v telnet://${target}:${port} || true
  
  # Test HTTP connection if port is 80 or 3001
  if [[ "$port" == "80" || "$port" == "3001" ]]; then
    debug "INFO" "HTTP connection test:"
    curl -v -H "Host: ${target}" "http://${target}:${port}/health" || true
  fi
}

function check_ecs_service_detailed() {
  local service_name=$1
  debug "INFO" "Checking ECS service ${service_name} in detail"
  
  # Service details
  debug "INFO" "Service configuration:"
  aws ecs describe-services \
    --cluster ${CLUSTER_NAME} \
    --services ${service_name} \
    --output json || true
  
  # Tasks
  debug "INFO" "Running tasks:"
  aws ecs list-tasks \
    --cluster ${CLUSTER_NAME} \
    --service-name ${service_name} \
    --output json || true
  
  # Task definitions
  local task_def=$(aws ecs describe-services \
    --cluster ${CLUSTER_NAME} \
    --services ${service_name} \
    --query 'services[0].taskDefinition' \
    --output text)
  
  if [ ! -z "$task_def" ]; then
    debug "INFO" "Task definition:"
    aws ecs describe-task-definition \
      --task-definition ${task_def} \
      --output json || true
  fi
}

function check_alb_detailed() {
  debug "INFO" "Checking ALB in detail"
  
  # Get ALB ARN
  ALB_ARN=$(aws elbv2 describe-load-balancers \
    --names "sprints-management-alb-dev" \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)
  
  if [ -z "$ALB_ARN" ]; then
    debug "ERROR" "Could not find ALB"
    return 1
  fi
  
  # ALB configuration
  debug "INFO" "ALB configuration:"
  aws elbv2 describe-load-balancers \
    --names "sprints-management-alb-dev" \
    --output json || true
  
  # Listeners
  debug "INFO" "ALB listeners:"
  aws elbv2 describe-listeners \
    --load-balancer-arn ${ALB_ARN} \
    --output json || true
  
  # Target groups
  debug "INFO" "Target groups:"
  aws elbv2 describe-target-groups \
    --load-balancer-arn ${ALB_ARN} \
    --output json || true
  
  # Target health
  local target_groups=$(aws elbv2 describe-target-groups \
    --load-balancer-arn ${ALB_ARN} \
    --query 'TargetGroups[*].TargetGroupArn' \
    --output text)
  
  for tg in ${target_groups}; do
    debug "INFO" "Target health for ${tg}:"
    aws elbv2 describe-target-health \
      --target-group-arn ${tg} \
      --output json || true
  done
}

function check_container_logs_detailed() {
  local log_group=$1
  local start_time=$2
  debug "INFO" "Checking container logs for ${log_group}"
  
  # Get log streams
  debug "INFO" "Log streams:"
  aws logs describe-log-streams \
    --log-group-name ${log_group} \
    --order-by LastEventTime \
    --descending \
    --limit 5 \
    --output json || true
  
  # Get detailed logs with patterns
  debug "INFO" "Error patterns:"
  aws logs filter-log-events \
    --log-group-name ${log_group} \
    --start-time ${start_time} \
    --filter-pattern "?ERROR ?Error ?error ?WARN ?Warn ?warn ?FATAL ?Fatal ?fatal" \
    --output json || true
  
  debug "INFO" "Health check patterns:"
  aws logs filter-log-events \
    --log-group-name ${log_group} \
    --start-time ${start_time} \
    --filter-pattern "?health ?Health ?HEALTH ?check ?Check ?CHECK" \
    --output json || true
}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Service ARNs
FRONTEND_SERVICE_ARN="arn:aws:ecs:us-east-1:651706782157:service/sprints-management-cluster-dev/sprints-management-frontend-service-dev"
BACKEND_SERVICE_ARN="arn:aws:ecs:us-east-1:651706782157:service/sprints-management-cluster-dev/sprints-management-backend-service-dev"
CLUSTER_NAME="sprints-management-cluster-dev"

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names "sprints-management-alb-dev" \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Function to check ALB configuration
check_alb_config() {
  echo -e "\n${BLUE}Checking ALB Configuration:${NC}"
  
  # Get ALB listener rules
  echo -e "\n${BLUE}ALB Listener Rules:${NC}"
  aws elbv2 describe-rules \
    --listener-arn $(aws elbv2 describe-listeners \
      --load-balancer-arn $(aws elbv2 describe-load-balancers \
        --names "sprints-management-alb-dev" \
        --query 'LoadBalancers[0].LoadBalancerArn' \
        --output text) \
      --query 'Listeners[0].ListenerArn' \
      --output text) \
    --query 'Rules[*].{Priority:Priority,PathPattern:Conditions[?Field==`path-pattern`].Values[]}' \
    --output table
  
  # Get target group health
  echo -e "\n${BLUE}Backend Target Group Health Details:${NC}"
  aws elbv2 describe-target-health \
    --target-group-arn $(aws elbv2 describe-target-groups \
      --names sprints-management-be-tg-dev \
      --query 'TargetGroups[0].TargetGroupArn' \
      --output text) \
    --query 'TargetHealthDescriptions[*].{Target:Target.Id,Port:Target.Port,Health:TargetHealth.State,Reason:TargetHealth.Reason,Description:TargetHealth.Description}' \
    --output table
}

# Function to check service discovery
check_service_discovery() {
  echo -e "\n${BLUE}Checking Service Discovery:${NC}"
  
  # Get service discovery service details
  aws servicediscovery list-services \
    --query 'Services[?starts_with(Name, `sprints-management`)].{Name:Name,Id:Id}' \
    --output table
  
  # Get service discovery instances
  for service in $(aws servicediscovery list-services --query 'Services[?starts_with(Name, `sprints-management`)].Id' --output text); do
    echo -e "\n${BLUE}Instances for service $service:${NC}"
    aws servicediscovery list-instances \
      --service-id $service \
      --query 'Instances[*].{InstanceId:Id,IpAddress:Attributes.AWS_INSTANCE_IPV4}' \
      --output table
  done
}

# Function to test TCP connectivity
test_tcp_connectivity() {
  local service=$1
  local ip=$2
  local port=$3
  
  echo -e "\nTesting connectivity to $service via ECS Exec..."
  
  # Get latest task ID
  local task_id=$(aws ecs list-tasks \
    --cluster $CLUSTER_NAME \
    --service-name $service \
    --query 'taskArns[0]' \
    --output text | cut -d'/' -f3)
  
  if [ -z "$task_id" ]; then
    echo -e "${RED}No running tasks found for $service${NC}"
    return 1
  fi
  
  # Test connection using ECS Exec
  if aws ecs execute-command \
    --cluster $CLUSTER_NAME \
    --task $task_id \
    --container $(if [[ $service == *"frontend"* ]]; then echo "frontend"; else echo "backend"; fi) \
    --command "curl -s localhost:$port/health" \
    --interactive; then
    echo -e "${GREEN}✓ Container health check successful${NC}"
    return 0
  else
    echo -e "${RED}✗ Container health check failed${NC}"
    return 1
  fi
}

# Function to test DNS resolution
test_dns_resolution() {
  local service=$1
  local domain="$service.sprints-management"
  
  echo -e "\nTesting DNS resolution for $domain..."
  if nslookup $domain 2>/dev/null; then
    echo -e "${GREEN}✓ DNS resolution successful for $domain${NC}"
    return 0
  else
    echo -e "${RED}✗ DNS resolution failed for $domain${NC}"
    return 1
  fi
}

# Function to test endpoint with retries
test_endpoint_with_retry() {
  local endpoint=$1
  local description=$2
  local expected_status=$3
  local max_retries=3
  local retry_count=0
  local timeout=10
  
  while [ $retry_count -lt $max_retries ]; do
    echo -e "\n${BLUE}Testing $description (Attempt $(($retry_count + 1))/${max_retries})...${NC}"
    
    response=$(curl -v -s -m $timeout \
      -H "Connection: close" \
      -H "X-Debug: true" \
      -H "X-Request-ID: $(uuidgen)" \
      -H "Accept: application/json" \
      --http1.1 \
      "$endpoint" 2>&1)
    
    status_code=$(echo "$response" | grep "< HTTP" | awk '{print $3}')
    
    if [ ! -z "$status_code" ]; then
      if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ Success: $description (Status: $status_code)${NC}"
        echo -e "${YELLOW}Response Headers:${NC}"
        echo "$response" | grep "< " | grep -v "< HTTP"
        echo -e "${YELLOW}Response Body:${NC}"
        echo "$response" | sed -n '/^{/,/^}/p' | jq '.'
        return 0
      else
        echo -e "${RED}✗ Failed: $description (Expected: $expected_status, Got: $status_code)${NC}"
        echo -e "${RED}Full Response:${NC}"
        echo "$response"
        echo -e "\n${YELLOW}Checking backend logs...${NC}"
        check_backend_logs
      fi
    else
      echo -e "${RED}✗ No response received${NC}"
      echo -e "${RED}Curl output:${NC}"
      echo "$response"
      echo -e "\n${YELLOW}Checking backend logs...${NC}"
      check_backend_logs
    fi
    
    retry_count=$((retry_count + 1))
    if [ $retry_count -lt $max_retries ]; then
      echo "Retrying in 5 seconds..."
      sleep 5
    fi
  done
  return 1
}

# Function to check backend logs
check_backend_logs() {
  echo -e "\n${BLUE}Recent backend logs:${NC}"
  aws logs get-log-events \
    --log-group-name "/ecs/sprints-management-backend-dev" \
    --log-stream-name $(aws logs describe-log-streams \
      --log-group-name "/ecs/sprints-management-backend-dev" \
      --order-by LastEventTime \
      --descending \
      --max-items 1 \
      --query 'logStreams[0].logStreamName' \
      --output text) \
    --limit 20 \
    --query 'events[*].message' \
    --output text
}

# Function to check container status
check_container_status() {
  local task_id=$1
  local container_name=$2
  
  echo -e "\n${BLUE}Container Status for $container_name:${NC}"
  aws ecs describe-container-instances \
    --cluster $CLUSTER_NAME \
    --container-instances $(aws ecs describe-tasks \
      --cluster $CLUSTER_NAME \
      --tasks $task_id \
      --query 'tasks[0].containerInstanceArn' \
      --output text) \
    --query 'containerInstances[0].{status:status,runningTasksCount:runningTasksCount,pendingTasksCount:pendingTasksCount,agentConnected:agentConnected,agentUpdateStatus:agentUpdateStatus}' \
    --output table
}

# Function to test backend endpoints
test_backend_endpoints() {
  local backend_ip=$1
  echo -e "\n${BLUE}Testing Backend Endpoints Directly:${NC}"
  
  # Get latest backend task ID
  local task_id=$(aws ecs list-tasks \
    --cluster $CLUSTER_NAME \
    --service-name sprints-management-backend-service-dev \
    --query 'taskArns[0]' \
    --output text | cut -d'/' -f3)
  
  if [ -z "$task_id" ]; then
    echo -e "${RED}No running backend tasks found${NC}"
    return 1
  fi
  
  echo -e "${YELLOW}Testing backend endpoints via ECS Exec on task $task_id${NC}"
  check_container_status $task_id "backend"
  
  # Test endpoints using ECS Exec
  local endpoints=("/health" "/api/health" "/sprints" "/api/sprints")
  for endpoint in "${endpoints[@]}"; do
    echo -e "\nTesting $endpoint..."
    if aws ecs execute-command \
      --cluster $CLUSTER_NAME \
      --task $task_id \
      --container backend \
      --command "curl -v -s -H 'X-Debug: true' -H 'Accept: application/json' http://localhost:3001$endpoint" \
      --interactive; then
      echo -e "${GREEN}✓ Endpoint $endpoint is accessible${NC}"
    else
      echo -e "${RED}✗ Failed to access $endpoint${NC}"
      check_backend_logs
    fi
  done
}

# Function to test endpoint
test_endpoint() {
  local endpoint=$1
  local expected_status=$2
  local description=$3

  echo -e "\n${BLUE}Testing $description...${NC}"
  response=$(curl -v -s "$endpoint" 2>&1)
  status_code=$(echo "$response" | grep "< HTTP" | awk '{print $3}')
  
  if [ "$status_code" = "$expected_status" ]; then
    echo -e "${GREEN}✓ Success: $description (Status: $status_code)${NC}"
    echo -e "${YELLOW}Response Headers:${NC}"
    echo "$response" | grep "< " | grep -v "< HTTP"
  else
    echo -e "${RED}✗ Failed: $description (Expected: $expected_status, Got: $status_code)${NC}"
    echo -e "${RED}Full Response:${NC}"
    echo "$response"
  fi
}

# Function to test API endpoint with data
test_api_endpoint() {
  local endpoint=$1
  local method=$2
  local description=$3

  echo -e "\n${BLUE}Testing $description...${NC}"
  response=$(curl -s -X $method \
    -H "Content-Type: application/json" \
    "$endpoint")
  
  if [ ! -z "$response" ]; then
    echo -e "${GREEN}✓ Success: $description${NC}"
    echo -e "${YELLOW}Response: $response${NC}"
  else
    echo -e "${RED}✗ Failed: $description (No response)${NC}"
  fi
}

# Function to format timestamp
format_timestamp() {
  date -r $(($1/1000)) "+%Y-%m-%d %H:%M:%S"
}

# Function to check system info
check_system_info() {
  echo -e "\n${BLUE}Checking system info for Backend...${NC}"
  
  # Get latest backend task ID
  local task_id=$(aws ecs list-tasks \
    --cluster $CLUSTER_NAME \
    --service-name sprints-management-backend-service-dev \
    --query 'taskArns[0]' \
    --output text | cut -d'/' -f3)
  
  if [ -z "$task_id" ]; then
    echo -e "${RED}No running backend tasks found${NC}"
    return 1
  fi
  
  # Get system info using ECS Exec
  if response=$(aws ecs execute-command \
    --cluster $CLUSTER_NAME \
    --task $task_id \
    --container backend \
    --command "curl -s localhost:3001/system-info" \
    --interactive); then
    echo -e "${GREEN}✓ System info retrieved successfully:${NC}"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
  else
    echo -e "${RED}✗ Failed to retrieve system info${NC}"
    return 1
  fi
}

# Function to check network connectivity
check_network() {
  local service=$1
  
  echo -e "\n${BLUE}Checking network connectivity for $service...${NC}"
  
  # Get task details
  task_id=$(aws ecs list-tasks \
    --cluster $CLUSTER_NAME \
    --service-name $service \
    --query 'taskArns[0]' \
    --output text)
  
  if [ -z "$task_id" ] || [ "$task_id" == "None" ]; then
    echo -e "${RED}No running tasks found for $service${NC}"
    return 1
  fi
  
  # Get ENI ID
  eni_id=$(aws ecs describe-tasks \
    --cluster $CLUSTER_NAME \
    --tasks $task_id \
    --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
    --output text)
  
  if [ -z "$eni_id" ]; then
    echo -e "${RED}Could not find network interface for $service${NC}"
    return 1
  fi
  
  # Get private IP
  private_ip=$(aws ec2 describe-network-interfaces \
    --network-interface-ids $eni_id \
    --query 'NetworkInterfaces[0].PrivateIpAddress' \
    --output text)
  
  if [ ! -z "$private_ip" ]; then
    echo -e "${GREEN}Found private IP: $private_ip${NC}"
    
    # Test connectivity to appropriate port
    if [[ $service == *"frontend"* ]]; then
      test_tcp_connectivity $service $private_ip 80
    else
      test_tcp_connectivity $service $private_ip 3001
    fi
    
    # Test DNS resolution
    test_dns_resolution $service
    
    # Store IP for later use
    if [[ $service == *"backend"* ]]; then
      BACKEND_IP=$private_ip
    else
      FRONTEND_IP=$private_ip
    fi
    
    return 0
  else
    echo -e "${RED}Could not find private IP for $service${NC}"
    return 1
  fi
}

# Initialize variables
FRONTEND_IP=""
BACKEND_IP=""

echo -e "\n${BLUE}Starting comprehensive service tests with enhanced debugging...${NC}\n"

# Check ALB configuration
check_alb_config

# Check service discovery
check_service_discovery

# Check network connectivity
check_network "sprints-management-frontend-service-dev"
check_network "sprints-management-backend-service-dev"

# Check system info
if [ ! -z "$BACKEND_IP" ]; then
  check_system_info
else
  echo -e "${RED}No backend IP available for system info check${NC}"
fi

# Test frontend endpoints
test_endpoint "http://$ALB_DNS" "200" "Frontend main page"
test_endpoint "http://$ALB_DNS/health" "200" "Frontend health check"

# Test backend endpoints
test_endpoint "http://$ALB_DNS/api/health" "200" "Backend health check"
test_endpoint "http://$ALB_DNS/api/sprints" "200" "Backend sprints endpoint"

# Test backend endpoints directly if we have the IP
if [ ! -z "$BACKEND_IP" ]; then
  test_backend_endpoints "$BACKEND_IP"
else
  echo -e "${RED}Could not find backend IP address${NC}"
fi

# Print service status
echo -e "\n${BLUE}Service Status:${NC}"
aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services sprints-management-frontend-service-dev sprints-management-backend-service-dev \
  --query 'services[*].{name:serviceName,desired:desiredCount,running:runningCount,status:events[0].message}' \
  --output table

# Print test summary
echo -e "\n${BLUE}Test Summary:${NC}"
echo "- Frontend Service: http://$ALB_DNS"
echo "- Backend API: http://$ALB_DNS/api"
echo "- Service Discovery: sprints-management-backend-service-dev.sprints-management"
echo "- Health Checks: /health"

# Function to check container logs
check_container_logs() {
  local service_name=$1
  local container_name=$2
  
  echo -e "\n${BLUE}Checking $container_name container logs...${NC}"
  aws ecs describe-container-instances \
    --cluster $CLUSTER_NAME \
    --container-instances $(aws ecs list-container-instances \
      --cluster $CLUSTER_NAME \
      --service-name $service_name \
      --query 'containerInstanceArns[0]' \
      --output text)
}

# Function to check container health
check_container_health() {
  local service_name=$1
  
  echo -e "\n${BLUE}Checking container health for $service_name...${NC}"
  aws ecs describe-tasks \
    --cluster $CLUSTER_NAME \
    --tasks $(aws ecs list-tasks \
      --cluster $CLUSTER_NAME \
      --service-name $service_name \
      --query 'taskArns[0]' \
      --output text) \
    --query 'tasks[0].containers[0].healthStatus'
}

# Function to check target group health
check_target_group_health() {
  local target_group_arn=$1
  local description=$2
  
  echo -e "\n${BLUE}Checking $description target group health...${NC}"
  aws elbv2 describe-target-health \
    --target-group-arn $target_group_arn \
    --query 'TargetHealthDescriptions[*].{Target:Target.Id,Health:TargetHealth.State,Reason:TargetHealth.Reason}'
}

# Function to check system metrics
check_system_metrics() {
  local service_name=$1
  local task_id=$2
  
  echo -e "\n${BLUE}Checking system metrics for $service_name...${NC}"
  aws cloudwatch get-metric-statistics \
    --namespace AWS/ECS \
    --metric-name CPUUtilization \
    --dimensions Name=ServiceName,Value=$service_name Name=ClusterName,Value=$CLUSTER_NAME \
    --start-time $(date -u -v-1H +"%Y-%m-%dT%H:%M:%SZ") \
    --end-time $(date -u +"%Y-%m-%dT%H:%M:%SZ") \
    --period 300 \
    --statistics Average Maximum

  aws cloudwatch get-metric-statistics \
    --namespace AWS/ECS \
    --metric-name MemoryUtilization \
    --dimensions Name=ServiceName,Value=$service_name Name=ClusterName,Value=$CLUSTER_NAME \
    --start-time $(date -u -v-1H +"%Y-%m-%dT%H:%M:%SZ") \
    --end-time $(date -u +"%Y-%m-%dT%H:%M:%SZ") \
    --period 300 \
    --statistics Average Maximum
}

# Make the script executable
chmod +x troubleshooting.sh

echo -e "\nChecking Container Logs:"

echo -e "\nFrontend Logs (last 50 lines):"
echo "---------------------------------------- (last 200 lines)"
# Get most recent frontend logs directly from log group
aws logs tail "/ecs/sprints-management-frontend-dev" \
  --since 1h \
  --format short \
  | tail -n 200 || echo "No frontend logs found"

echo -e "\nBackend Logs (last 50 lines):"
echo "---------------------------------------- (last 200 lines)"
# Get most recent backend logs directly from log group
aws logs tail "/ecs/sprints-management-backend-dev" \
  --since 1h \
  --format short \
  | tail -n 200 || echo "No backend logs found"

echo -e "\nTask Definitions:"
echo -e "${YELLOW}Frontend Image:${NC}"
aws ecs describe-task-definition \
  --task-definition sprints-management-frontend-dev \
  --query 'taskDefinition.containerDefinitions[0].image' \
  --output text

echo -e "${YELLOW}Backend Image:${NC}"
aws ecs describe-task-definition \
  --task-definition sprints-management-backend-dev \
  --query 'taskDefinition.containerDefinitions[0].image' \
  --output text

# Function to log with timestamp
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check DNS resolution
check_dns() {
  local host=$1
  log "Checking DNS resolution for $host..."
  dig +short $host
  host $host
  nslookup $host
}

# Function to test TCP connection
test_connection() {
  local host=$1
  local port=$2
  log "Testing TCP connection to $host:$port..."
  nc -zv -w 5 $host $port
}

# Check environment
log "Environment Details:"
env | sort

# Check system resources
log "System Resources:"
free -h
df -h
top -b -n 1

# Check network configuration
log "Network Configuration:"
ip addr
netstat -tulpn

# Check DNS configuration
log "DNS Configuration:"
cat /etc/resolv.conf

# Check AWS configuration
log "AWS Configuration:"
aws configure list
aws sts get-caller-identity

# Check ECS service details
log "ECS Service Details:"
aws ecs list-services --cluster sprints-management-cluster-dev
aws ecs describe-services --cluster sprints-management-cluster-dev --services sprints-management-frontend-service-dev sprints-management-backend-service-dev

# Check container logs
log "Container Logs:"
aws logs tail /ecs/sprints-management-frontend-dev --since 1h
aws logs tail /ecs/sprints-management-backend-dev --since 1h

# Main execution
log "INFO" "Starting comprehensive service tests with enhanced debugging..."

# Check environment and AWS configuration
log "INFO" "Environment variables:"
env | sort

log "INFO" "AWS configuration:"
aws configure list
aws sts get-caller-identity

# Run detailed checks
check_alb_detailed
check_ecs_service_detailed "sprints-management-frontend-service-dev"
check_ecs_service_detailed "sprints-management-backend-service-dev"
check_container_logs_detailed "/ecs/sprints-management-frontend-dev" $(date -u -v-1H +%s)000
check_container_logs_detailed "/ecs/sprints-management-backend-dev" $(date -u -v-1H +%s)000

# Network connectivity tests
check_network_detailed "sprints-management-backend-service-dev.sprints-management" 3001
check_network_detailed "${ALB_DNS}" 80

# Function for detailed logging
debug() {
  local level=$1
  shift
  echo "[$(date '+%Y-%m-%d %H:%M:%S.%N')] [${level}] $*" >&2
}

# Function to dump detailed info about a resource
dump_resource_info() {
  local resource_type=$1
  local resource_id=$2
  debug "INFO" "Dumping details for ${resource_type} ${resource_id}"
  
  case ${resource_type} in
    "task")
      aws ecs describe-tasks \
        --cluster ${CLUSTER_NAME} \
        --tasks ${resource_id} \
        --query 'tasks[0]' \
        --output json | jq '.'
      ;;
    "container")
      aws ecs describe-container-instances \
        --cluster ${CLUSTER_NAME} \
        --container-instances ${resource_id} \
        --output json | jq '.'
      ;;
    "service")
      aws ecs describe-services \
        --cluster ${CLUSTER_NAME} \
        --services ${resource_id} \
        --output json | jq '.'
      ;;
  esac
}

# Function to check network connectivity in detail
check_network_detailed() {
  local target=$1
  local port=$2
  debug "INFO" "Checking network connectivity to ${target}:${port}"
  
  # DNS resolution
  debug "INFO" "DNS resolution for ${target}:"
  dig +trace ${target} || true
  
  # TCP connection
  debug "INFO" "TCP connection test to ${target}:${port}:"
  nc -zv -w 5 ${target} ${port} || true
  
  # Full connection details
  debug "INFO" "Connection details:"
  curl -v telnet://${target}:${port} || true
}

# Function to check ECS service in detail
check_ecs_service_detailed() {
  local service_name=$1
  debug "INFO" "Checking ECS service ${service_name} in detail"
  
  # Service details
  debug "INFO" "Service configuration:"
  aws ecs describe-services \
    --cluster ${CLUSTER_NAME} \
    --services ${service_name} \
    --output json | jq '.'
  
  # Tasks
  debug "INFO" "Running tasks:"
  aws ecs list-tasks \
    --cluster ${CLUSTER_NAME} \
    --service-name ${service_name} \
    --output json | jq '.'
  
  # Task definitions
  debug "INFO" "Task definition:"
  aws ecs describe-task-definition \
    --task-definition $(aws ecs describe-services \
      --cluster ${CLUSTER_NAME} \
      --services ${service_name} \
      --query 'services[0].taskDefinition' \
      --output text) \
    --output json | jq '.'
  
  # Container insights
  debug "INFO" "Container insights metrics:"
  aws cloudwatch get-metric-data \
    --metric-data-queries '[
      {
        "Id": "cpu",
        "MetricStat": {
          "Metric": {
            "Namespace": "ECS/ContainerInsights",
            "MetricName": "CpuUtilized",
            "Dimensions": [
              {"Name": "ClusterName", "Value": "'${CLUSTER_NAME}'"},
              {"Name": "ServiceName", "Value": "'${service_name}'"}
            ]
          },
          "Period": 300,
          "Stat": "Average"
        }
      },
      {
        "Id": "memory",
        "MetricStat": {
          "Metric": {
            "Namespace": "ECS/ContainerInsights",
            "MetricName": "MemoryUtilized",
            "Dimensions": [
              {"Name": "ClusterName", "Value": "'${CLUSTER_NAME}'"},
              {"Name": "ServiceName", "Value": "'${service_name}'"}
            ]
          },
          "Period": 300,
          "Stat": "Average"
        }
      }
    ]' \
    --start-time $(date -u -v-1H +"%Y-%m-%dT%H:%M:%SZ") \
    --end-time $(date -u +"%Y-%m-%dT%H:%M:%SZ") \
    --output json | jq '.'
}

# Function to check ALB in detail
check_alb_detailed() {
  debug "INFO" "Checking ALB in detail"
  
  # ALB configuration
  debug "INFO" "ALB configuration:"
  aws elbv2 describe-load-balancers \
    --names "sprints-management-alb-dev" \
    --output json | jq '.'
  
  # Listeners
  debug "INFO" "ALB listeners:"
  aws elbv2 describe-listeners \
    --load-balancer-arn ${ALB_ARN} \
    --output json | jq '.'
  
  # Target groups
  debug "INFO" "Target groups:"
  aws elbv2 describe-target-groups \
    --load-balancer-arn ${ALB_ARN} \
    --output json | jq '.'
  
  # Target health
  for tg in $(aws elbv2 describe-target-groups \
    --load-balancer-arn ${ALB_ARN} \
    --query 'TargetGroups[*].TargetGroupArn' \
    --output text); do
    debug "INFO" "Target health for ${tg}:"
    aws elbv2 describe-target-health \
      --target-group-arn ${tg} \
      --output json | jq '.'
  done
}

# Function to check container logs in detail
check_container_logs_detailed() {
  local log_group=$1
  local start_time=$2
  debug "INFO" "Checking container logs for ${log_group}"
  
  # Get log streams
  debug "INFO" "Log streams:"
  aws logs describe-log-streams \
    --log-group-name ${log_group} \
    --order-by LastEventTime \
    --descending \
    --limit 5 \
    --output json | jq '.'
  
  # Get detailed logs with patterns
  debug "INFO" "Error patterns:"
  aws logs filter-log-events \
    --log-group-name ${log_group} \
    --start-time ${start_time} \
    --filter-pattern "?ERROR ?Error ?error ?WARN ?Warn ?warn ?FATAL ?Fatal ?fatal" \
    --output json | jq '.'
  
  debug "INFO" "Health check patterns:"
  aws logs filter-log-events \
    --log-group-name ${log_group} \
    --start-time ${start_time} \
    --filter-pattern "?health ?Health ?HEALTH ?check ?Check ?CHECK" \
    --output json | jq '.'
} 