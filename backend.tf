terraform {
  backend "s3" {
    bucket         = "sprints-management-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "sprints-management-terraform-locks"
    encrypt        = true
  }
}
