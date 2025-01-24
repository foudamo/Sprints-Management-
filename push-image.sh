#!/bin/bash

# Get the ECR repository URL from Terraform output
ECR_REPO_URL=$(terraform output -raw ecr_repository_url)

# Build React client first
echo "Building React client..."
cd client && npm install && npm run build && cd ..

# Build the Docker image
echo "Building Docker image..."
docker build -t sprints .

# Tag the image
docker tag sprints:latest $ECR_REPO_URL:latest

# Login to ECR
aws ecr get-login-password --region $(terraform output -raw aws_region) | docker login --username AWS --password-stdin $ECR_REPO_URL

# Push the image
docker push $ECR_REPO_URL:latest 