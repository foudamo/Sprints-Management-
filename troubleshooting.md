# Get the task ARN
TASK_ARN=$(aws ecs list-tasks --cluster sprints --service-name sprints-service --query 'taskArns[0]' --output text)

# Get the logs
aws logs get-log-events \
    --log-group-name /ecs/sprints \
    --log-stream-name $(aws ecs describe-tasks --cluster sprints --tasks $TASK_ARN --query 'tasks[0].containers[0].logStreamPrefix' --output text) \
    --query 'events[*].message'

# Update the service - this will restart the container
aws ecs update-service --cluster sprints --service sprints-service --force-new-deployment