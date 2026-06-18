# Local verification script to check SSH accessibility

# Load environment variables from root .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
elif [ -f ../.env ]; then
    export $(grep -v '^#' ../.env | xargs)
fi

EC2_HOST=${EC2_HOST}

if [ -z "$EC2_HOST" ]; then
    echo "[ERROR] EC2_HOST is not set. Please check your .env file."
    exit 1
fi


echo "=> Checking if SSH (Port 22) is reachable at $EC2_HOST..."

if nc -zv -w 5 $EC2_HOST 22 2>&1 | grep -q 'succeeded'; then
    echo "✅ SSH port is OPEN! GitHub Actions should be able to connect."
    echo "🔗 You can connect manually with: ssh -i your-key.pem $EC2_USER@$EC2_HOST"
else
    echo "❌ SSH port is CLOSED or TIMED OUT."
    echo "   Troubleshooting steps:"
    echo "   1. Ensure your EC2 instance is 'Running'."
    echo "   2. Ensure Security Group has an inbound rule for Port 22 from 0.0.0.0/0."
    echo "   3. Double-check if the Public IP has changed (current: $EC2_HOST)."
fi
