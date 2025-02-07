#!/bin/bash

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

echo -e "${BLUE}Fetching last 50 log entries...${NC}\n"

# Function to format timestamp
format_timestamp() {
  date -r $(($1/1000)) "+%Y-%m-%d %H:%M:%S"
}

# Function to get latest task and its logs
get_latest_task_logs() {
  local service_name=$1
  local log_group_name=$2
  local color_prefix=$3

  echo -e "${GREEN}Fetching $service_name logs...${NC}"

  # Get the latest log stream
  local latest_stream=$(aws logs describe-log-streams \
    --log-group-name $log_group_name \
    --order-by LastEventTime \
    --descending \
    --limit 1 \
    --query 'logStreams[0].logStreamName' \
    --output text)

  if [ ! -z "$latest_stream" ] && [ "$latest_stream" != "None" ]; then
    echo -e "${YELLOW}Latest Log Stream: $latest_stream${NC}"
    
    aws logs get-log-events \
      --log-group-name $log_group_name \
      --log-stream-name "$latest_stream" \
      --limit 50 \
      --no-start-from-head \
      --query 'events[*].{timestamp:timestamp,message:message}' \
      --output json | jq -r '.[] | [(.timestamp|tostring), .message] | @tsv' | \
      while IFS=$'\t' read -r timestamp message; do
        formatted_time=$(format_timestamp "$timestamp")
        echo -e "${color_prefix}[$formatted_time]${NC} $message"
      done
  else
    echo -e "${RED}No log streams found for $service_name${NC}"
  fi
}

# Get the frontend task ARN
get_latest_task_logs \
  "sprints-management-frontend-service-dev" \
  "/ecs/sprints-management-frontend-dev" \
  "${YELLOW}"

echo -e "\n${GREEN}Fetching backend logs...${NC}"
get_latest_task_logs \
  "sprints-management-backend-service-dev" \
  "/ecs/sprints-management-backend-dev" \
  "${GREEN}"

# Check service status
echo -e "\n${BLUE}Service Status:${NC}"
aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services sprints-management-frontend-service-dev sprints-management-backend-service-dev \
  --query 'services[*].{name:serviceName,running:runningCount,desired:desiredCount,status:events[0].message}' \
  --output table

# Show task definitions
echo -e "\n${BLUE}Task Definitions:${NC}"
echo -e "${GREEN}Frontend Image:${NC}"
aws ecs describe-task-definition \
  --task-definition sprints-management-frontend-dev \
  --query 'taskDefinition.containerDefinitions[0].image' \
  --output text

echo -e "${GREEN}Backend Image:${NC}"
aws ecs describe-task-definition \
  --task-definition sprints-management-backend-dev \
  --query 'taskDefinition.containerDefinitions[0].image' \
  --output text

# Make the script executable
chmod +x troubleshooting.sh 