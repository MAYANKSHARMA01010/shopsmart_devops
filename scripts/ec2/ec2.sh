set -e

REGION="us-east-1"
KEY_NAME="vockey"
INSTANCE_TYPE="t3.micro"
SG_NAME="ubuntu-auto-sg"
TAG_NAME="Ubuntu-CLI-Auto"

VPC_ID=$(aws ec2 describe-vpcs \
  --region $REGION \
  --filters "Name=isDefault,Values=true" \
  --query "Vpcs[0].VpcId" \
  --output text)

echo "Using VPC: $VPC_ID"

echo "Fetching latest Ubuntu 24.04 AMI..."

AMI_ID=$(aws ec2 describe-images \
  --region $REGION \
  --owners 099720109477 \
  --filters \
    "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" \
    "Name=state,Values=available" \
  --query "reverse(sort_by(Images, &CreationDate))[0].ImageId" \
  --output text)

echo "Using AMI: $AMI_ID"

echo "Checking security group..."

SG_ID=$(aws ec2 describe-security-groups \
  --region $REGION \
  --filters "Name=group-name,Values=$SG_NAME" \
  --query "SecurityGroups[0].GroupId" \
  --output text 2>/dev/null || true)

if [[ -z "$SG_ID" || "$SG_ID" == "None" ]]; then
  echo "Creating security group..."

  SG_ID=$(aws ec2 create-security-group \
    --region $REGION \
    --group-name $SG_NAME \
    --description "Auto-created SG for Ubuntu EC2" \
    --vpc-id $VPC_ID \
    --query "GroupId" \
    --output text)

  aws ec2 authorize-security-group-ingress \
    --region $REGION \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0

  echo "Security group created: $SG_ID"
else
  echo "Using existing security group: $SG_ID"
fi

echo "Checking for existing running instance with name: $TAG_NAME..."

EXISTING_INSTANCE_ID=$(aws ec2 describe-instances \
  --region $REGION \
  --filters "Name=tag:Name,Values=$TAG_NAME" "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].InstanceId" \
  --output text 2>/dev/null || true)

if [[ -n "$EXISTING_INSTANCE_ID" && "$EXISTING_INSTANCE_ID" != "None" ]]; then
  echo "✅ Found existing instance: $EXISTING_INSTANCE_ID. Reusing it."
  INSTANCE_ID=$EXISTING_INSTANCE_ID
else
  echo "🚀 No running instance found. Launching new EC2 instance..."
  INSTANCE_ID=$(aws ec2 run-instances \
    --region $REGION \
    --image-id $AMI_ID \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $SG_ID \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$TAG_NAME}]" \
    --query "Instances[0].InstanceId" \
    --output text)
  echo "Instance launched: $INSTANCE_ID"
fi

echo "Instance ID: $INSTANCE_ID"

echo "Waiting for instance to enter running state..."
aws ec2 wait instance-running \
  --region $REGION \
  --instance-ids $INSTANCE_ID


PUBLIC_IP=$(aws ec2 describe-instances \
  --region $REGION \
  --instance-ids $INSTANCE_ID \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text)

echo "======================================"
echo "✅ EC2 INSTANCE READY"
echo "🆔 Instance ID : $INSTANCE_ID"
echo "🌍 Public IP  : $PUBLIC_IP"
echo "🔑 SSH Command:"
echo "ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo "======================================"


# ======================================
# ✅ EC2 INSTANCE READY
# 🆔 Instance ID : i-0c1fa252e9426517c
# 🌍 Public IP  : 98.92.132.49
# 🔑 SSH Command:
# ssh -i vockey.pem ubuntu@98.92.132.49
# ======================================
