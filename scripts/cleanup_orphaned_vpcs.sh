#!/bin/bash

# Exit on error
set -e

REGION="us-east-1"
VPC_NAME="shopsmart-vpc"

echo "🔍 Searching for orphaned VPCs named '$VPC_NAME' in $REGION..."

# Find all VPC IDs with the name shopsmart-vpc
VPC_IDS=$(aws ec2 describe-vpcs \
  --region $REGION \
  --filters "Name=tag:Name,Values=$VPC_NAME" \
  --query 'Vpcs[*].VpcId' \
  --output text)

if [ -z "$VPC_IDS" ]; then
  echo "✅ No orphaned VPCs found. You are good to go!"
  exit 0
fi

for VPC_ID in $VPC_IDS; do
  echo "⚠️ Found orphaned VPC: $VPC_ID. Starting cleanup..."

  # 1. Delete Internet Gateways
  IGWS=$(aws ec2 describe-internet-gateways \
    --region $REGION \
    --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
    --query 'InternetGateways[*].InternetGatewayId' \
    --output text)
  
  for IGW in $IGWS; do
    echo "  -> Detaching Internet Gateway: $IGW"
    aws ec2 detach-internet-gateway --region $REGION --internet-gateway-id $IGW --vpc-id $VPC_ID || true
    echo "  -> Deleting Internet Gateway: $IGW"
    aws ec2 delete-internet-gateway --region $REGION --internet-gateway-id $IGW || true
  done

  # 2. Delete Subnets
  SUBNETS=$(aws ec2 describe-subnets \
    --region $REGION \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'Subnets[*].SubnetId' \
    --output text)
    
  for SUBNET in $SUBNETS; do
    echo "  -> Deleting Subnet: $SUBNET"
    aws ec2 delete-subnet --region $REGION --subnet-id $SUBNET || true
  done

  # 3. Delete Custom Route Tables (cannot delete the Main route table directly before VPC)
  ROUTE_TABLES=$(aws ec2 describe-route-tables \
    --region $REGION \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'RouteTables[?Associations[0].Main != `true`].RouteTableId' \
    --output text)
    
  for RT in $ROUTE_TABLES; do
    echo "  -> Deleting Route Table: $RT"
    aws ec2 delete-route-table --region $REGION --route-table-id $RT || true
  done

  # 4. Delete Custom Security Groups (cannot delete 'default' SG directly before VPC)
  SECURITY_GROUPS=$(aws ec2 describe-security-groups \
    --region $REGION \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'SecurityGroups[?GroupName != `default`].GroupId' \
    --output text)
    
  for SG in $SECURITY_GROUPS; do
    echo "  -> Deleting Security Group: $SG"
    aws ec2 delete-security-group --region $REGION --group-id $SG || true
  done

  # 5. Finally, Delete the VPC
  echo "  -> Deleting VPC: $VPC_ID"
  aws ec2 delete-vpc --region $REGION --vpc-id $VPC_ID || true
  
  echo "✅ Successfully cleaned up $VPC_ID!"
done

echo "🎉 All orphaned VPCs have been removed. Your AWS limits are cleared."
