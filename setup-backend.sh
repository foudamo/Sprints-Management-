#!/bin/bash

# Set variables
BUCKET_NAME="sprints-management-terraform-state"
REGION="us-east-1"
DYNAMODB_TABLE="sprints-management-terraform-locks"

# Function to read .env file
load_env() {
    if [ -f .env ]; then
        echo "Loading environment variables from .env file..."
        
        # Read each line from .env file
        while IFS='=' read -r key value; do
            # Skip comments and empty lines
            [[ $key =~ ^#.*$ ]] && continue
            [[ -z $key ]] && continue
            
            # Remove any quotes from the value
            value=$(echo "$value" | tr -d '"' | tr -d "'")
            
            # Export the variable
            export "$key=$value"
        done < .env
    else
        echo -e "${RED}Error: .env file not found${NC}"
        exit 1
    fi
}

# Text colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up Terraform backend...${NC}"

# Load environment variables
load_env

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Verify required environment variables
required_vars=(
    "DB_NAME"
    "DB_USER"
    "DB_PASSWORD"
    "DB_HOST"
    "DB_PORT"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Error: $var is not set in .env file${NC}"
        exit 1
    fi
done

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS credentials are not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Create S3 bucket
echo "Creating S3 bucket..."
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo -e "${YELLOW}Bucket $BUCKET_NAME already exists${NC}"
else
    # Special handling for us-east-1 region
    if [ "$REGION" = "us-east-1" ]; then
        if aws s3api create-bucket \
            --bucket "$BUCKET_NAME" \
            --region "$REGION"; then
            echo -e "${GREEN}Successfully created S3 bucket: $BUCKET_NAME${NC}"
        else
            echo -e "${RED}Failed to create S3 bucket${NC}"
            exit 1
        fi
    else
        if aws s3api create-bucket \
            --bucket "$BUCKET_NAME" \
            --region "$REGION" \
            --create-bucket-configuration LocationConstraint="$REGION"; then
            echo -e "${GREEN}Successfully created S3 bucket: $BUCKET_NAME${NC}"
        else
            echo -e "${RED}Failed to create S3 bucket${NC}"
            exit 1
        fi
    fi
fi

# Enable versioning on the S3 bucket
echo "Enabling versioning on S3 bucket..."
aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled

# Block all public access
echo "Blocking public access..."
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable server-side encryption
echo "Enabling server-side encryption..."

# Add bucket policy to enforce encryption
echo "Adding bucket policy..."
cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DenyIncorrectEncryptionHeader",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:PutObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*",
            "Condition": {
                "StringNotEquals": {
                    "s3:x-amz-server-side-encryption": "AES256"
                }
            }
        },
        {
            "Sid": "DenyUnencryptedObjectUploads",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:PutObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*",
            "Condition": {
                "Null": {
                    "s3:x-amz-server-side-encryption": "true"
                }
            }
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file:///tmp/bucket-policy.json
rm /tmp/bucket-policy.json

aws s3api put-bucket-encryption \
    --bucket "$BUCKET_NAME" \
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }
        ]
    }'

# Create DynamoDB table for state locking
echo "Creating DynamoDB table for state locking..."
if aws dynamodb describe-table --table-name "$DYNAMODB_TABLE" &>/dev/null; then
    echo -e "${YELLOW}DynamoDB table $DYNAMODB_TABLE already exists${NC}"
else
    if aws dynamodb create-table \
        --table-name "$DYNAMODB_TABLE" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --region "$REGION"; then
        echo -e "${GREEN}Successfully created DynamoDB table: $DYNAMODB_TABLE${NC}"
    else
        echo -e "${RED}Failed to create DynamoDB table${NC}"
        exit 1
    fi
fi

# Update backend configuration in main.tf
echo "Updating backend configuration in main.tf..."
cat > terraform.tfvars << EOF
# Database configuration
db_name     = "${DB_NAME}"
db_user     = "${DB_USER}"
db_password = "${DB_PASSWORD}"
db_host     = "${DB_HOST}"
db_port     = "${DB_PORT}"

# Environment configuration
environment = "dev"
domain_name = "example.com"  # Replace with your domain
EOF

cat > backend.tf << EOF
terraform {
  backend "s3" {
    bucket         = "$BUCKET_NAME"
    key            = "terraform.tfstate"
    region         = "$REGION"
    dynamodb_table = "$DYNAMODB_TABLE"
    encrypt        = true
  }
}
EOF

echo -e "${GREEN}Backend setup completed successfully!${NC}"
echo -e "${GREEN}Created terraform.tfvars with database configuration${NC}"
echo -e "${YELLOW}You can now run 'terraform init' to initialize the backend.${NC}"

# Add terraform.tfvars to .gitignore if it's not already there
if ! grep -q "terraform.tfvars" .gitignore; then
    echo "terraform.tfvars" >> .gitignore
    echo -e "${GREEN}Added terraform.tfvars to .gitignore${NC}"
fi 