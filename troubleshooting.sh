#!/bin/bash

echo "1. Checking ECS Service Status..."
aws ecs describe-services --cluster sprints --services sprints-service

echo -e "\n2. Getting Task ARNs..."
TASK_ARNS=$(aws ecs list-tasks --cluster sprints --service-name sprints-service --query 'taskArns[*]' --output text)

if [ -n "$TASK_ARNS" ]; then
    echo -e "\n3. Getting Task Details..."
    aws ecs describe-tasks --cluster sprints --tasks $TASK_ARNS
else
    echo "No tasks found running"
fi

echo -e "\n4. Checking if container can pull from ECR..."
aws ecr get-login-password --region $(terraform output -raw aws_region) | docker login --username AWS --password-stdin $(terraform output -raw ecr_repository_url)

echo -e "\n5. Checking Security Groups..."
aws ec2 describe-security-groups --group-ids $(terraform output -raw ecs_security_group_id)

echo -e "\n6. Checking Target Group Health..."
aws elbv2 describe-target-health --target-group-arn $(terraform output -raw target_group_arn)

echo -e "\n7. Testing DynamoDB Connection..."
ALB_DNS=$(aws elbv2 describe-load-balancers --names sprints-alb --query 'LoadBalancers[0].DNSName' --output text)
echo "DynamoDB test response:"
curl -s "http://${ALB_DNS}/debug/dynamodb" | jq '.'

echo -e "\n8. Testing Socket.IO Connection..."
echo "Opening Socket.IO test page at: http://${ALB_DNS}/debug/socket"
echo "You can visit this URL in your browser to test WebSocket connectivity"
curl -s "http://${ALB_DNS}/debug/socket" > /dev/null

echo -e "\n9. Checking application endpoints..."
echo "Debug endpoint response:"
curl -s "http://${ALB_DNS}/debug" | jq '.'
echo -e "\nHealth endpoint response:"
curl -s "http://${ALB_DNS}/health"

echo -e "\n10. Checking CloudWatch logs..."

# Get the latest log stream
LATEST_LOG_STREAM=$(aws logs describe-log-streams \
    --log-group-name /ecs/sprints \
    --order-by LastEventTime \
    --descending \
    --limit 1 \
    --query 'logStreams[0].logStreamName' \
    --output text)

echo "Latest log stream: $LATEST_LOG_STREAM"

# Get the last 50 log events
echo -e "\nLast 50 log events:"
aws logs get-log-events \
    --log-group-name /ecs/sprints \
    --log-stream-name "$LATEST_LOG_STREAM" \
    --limit 50 \
    --query 'events[*].{timestamp:timestamp,message:message}' \
    --output table

# Search for specific error patterns
echo -e "\nSearching for errors in the last hour..."
START_TIME=$(($(date +%s) - 3600))000

aws logs filter-log-events \
    --log-group-name /ecs/sprints \
    --start-time $START_TIME \
    --filter-pattern "ERROR" \
    --query 'events[*].{timestamp:timestamp,message:message}' \
    --output table

# Search for WebSocket related logs
echo -e "\nSearching for WebSocket related logs in the last hour..."
aws logs filter-log-events \
    --log-group-name /ecs/sprints \
    --start-time $START_TIME \
    --filter-pattern "?socket ?Socket ?websocket ?WebSocket" \
    --query 'events[*].{timestamp:timestamp,message:message}' \
    --output table

# Update the service - this will restart the container
aws ecs update-service --cluster sprints --service sprints-service --force-new-deployment

# Get the ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers --names sprints-alb --query 'LoadBalancers[0].DNSName' --output text)

echo -e "\n10. Checking application endpoints..."
echo "Debug endpoint response:"
curl -s "http://${ALB_DNS}/debug" | jq '.'
echo -e "\nHealth endpoint response:"
curl -s "http://${ALB_DNS}/health"

# Test WebSocket connectivity
echo -e "\n11. Testing WebSocket connectivity..."

# Get security group rules
echo -e "\nSecurity Group Rules for ALB:"
aws ec2 describe-security-group-rules \
    --filters Name=group-id,Values=$(aws elbv2 describe-load-balancers --names sprints-alb --query 'LoadBalancers[0].SecurityGroups[0]' --output text) \
    --query 'SecurityGroupRules[*].{Type:IsEgress,Port:FromPort,Protocol:IpProtocol,Source:CidrIpv4}' \
    --output table

echo -e "\nSecurity Group Rules for ECS Tasks:"
aws ec2 describe-security-group-rules \
    --filters Name=group-id,Values=$(aws ecs describe-services --cluster sprints --services sprints-service --query 'services[0].networkConfiguration.awsvpcConfiguration.securityGroups[0]' --output text) \
    --query 'SecurityGroupRules[*].{Type:IsEgress,Port:FromPort,Protocol:IpProtocol,Source:ReferencedGroupId}' \
    --output table

# Test WebSocket endpoint
echo -e "\nTesting WebSocket endpoint:"
WS_KEY=$(openssl rand -base64 16)
curl -v -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Host: ${ALB_DNS}" \
     -H "Origin: http://${ALB_DNS}" \
     -H "Sec-WebSocket-Key: ${WS_KEY}" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Protocol: socket.io" \
     "http://${ALB_DNS}/socket.io/?EIO=4&transport=websocket"

# Test Socket.IO handshake
echo -e "\nTesting Socket.IO handshake:"
curl -v "http://${ALB_DNS}/socket.io/?EIO=4&transport=polling"

# Get ECS container logs
echo -e "\nLatest ECS container logs:"
TASK_ID=$(aws ecs list-tasks --cluster sprints --service-name sprints-service --query 'taskArns[0]' --output text | cut -d'/' -f3)
aws logs get-log-events \
    --log-group-name /ecs/sprints \
    --log-stream-name "sprints/${TASK_ID}" \
    --limit 50 \
    --query 'events[*].{timestamp:timestamp,message:message}' \
    --output table

# Check ALB access logs
echo -e "\nChecking ALB access logs for WebSocket requests:"
aws logs filter-log-events \
    --log-group-name /aws/alb/sprints \
    --filter-pattern "socket.io" \
    --start-time $(($(date +%s) - 300))000 \
    --query 'events[*].{timestamp:timestamp,message:message}' \
    --output table

# Get recent WebSocket connection attempts
echo -e "\nRecent WebSocket connection attempts (last 5 minutes):"
START_TIME=$(($(date +%s) - 300))000
aws logs filter-log-events \
    --log-group-name /ecs/sprints \
    --start-time $START_TIME \
    --filter-pattern "Socket connection attempt" \
    --query 'events[*].{timestamp:timestamp,message:message}' \
    --output table

# Get recent WebSocket errors
echo -e "\nRecent WebSocket errors (last 5 minutes):"
aws logs filter-log-events \
    --log-group-name /ecs/sprints \
    --start-time $START_TIME \
    --filter-pattern "?Socket ?Error ?error ?connection" \
    --query 'events[*].{timestamp:timestamp,message:message}' \
    --output table 