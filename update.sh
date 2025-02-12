#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_NAME="sprints-management-cluster-dev"
FRONTEND_SERVICE="sprints-management-frontend-service-dev"
BACKEND_SERVICE="sprints-management-backend-service-dev"
REGION="us-east-1"

echo -e "${BLUE}Starting service updates...${NC}\n"

# Function to check service status
check_service_status() {
    local service_name=$1
    local deployment_status
    
    echo -e "${YELLOW}Checking status for ${service_name}...${NC}"
    
    deployment_status=$(aws ecs describe-services \
        --cluster ${CLUSTER_NAME} \
        --services ${service_name} \
        --region ${REGION} \
        --query 'services[0].deployments[0].status' \
        --output text)
    
    echo -e "Deployment status: ${deployment_status}"
    
    if [ "$deployment_status" == "PRIMARY" ]; then
        return 0
    else
        return 1
    fi
}

# Function to wait for service stability
wait_for_service_stability() {
    local service_name=$1
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}Waiting for ${service_name} to stabilize...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if check_service_status "$service_name"; then
            echo -e "${GREEN}${service_name} is stable!${NC}"
            return 0
        fi
        echo -e "Attempt $attempt of $max_attempts. Waiting 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    echo -e "${RED}${service_name} failed to stabilize after $max_attempts attempts${NC}"
    return 1
}

# Update backend service
echo -e "${BLUE}Updating backend service...${NC}"
aws ecs update-service \
    --cluster ${CLUSTER_NAME} \
    --service ${BACKEND_SERVICE} \
    --region ${REGION} \
    --force-new-deployment

if ! wait_for_service_stability "${BACKEND_SERVICE}"; then
    echo -e "${RED}Backend service update failed${NC}"
    exit 1
fi

# Update frontend service
echo -e "\n${BLUE}Updating frontend service...${NC}"
aws ecs update-service \
    --cluster ${CLUSTER_NAME} \
    --service ${FRONTEND_SERVICE} \
    --region ${REGION} \
    --force-new-deployment

if ! wait_for_service_stability "${FRONTEND_SERVICE}"; then
    echo -e "${RED}Frontend service update failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}Both services have been successfully updated!${NC}"

# Show current tasks
echo -e "\n${BLUE}Current running tasks:${NC}"
aws ecs list-tasks \
    --cluster ${CLUSTER_NAME} \
    --region ${REGION} \
    --query 'taskArns[]' \
    --output table

# Show service URLs
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --names sprints-management-alb-dev \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

echo -e "\n${GREEN}Service URLs:${NC}"
echo -e "Frontend: http://${ALB_DNS}"
echo -e "Backend: http://${ALB_DNS}/api"
echo -e "Health Check: http://${ALB_DNS}/health" 