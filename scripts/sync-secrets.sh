#!/bin/bash

# Master Script to Sync all .env secrets to GitHub
# Required: GitHub CLI (gh) installed and authenticated.

# Configuration - Update this if your repo name is different
REPO="MAYANKSHARMA01010/shopsmart"

# Function to extract from .env
get_from_env() {
    grep "^$1=" .env | cut -d'=' -f2 | sed 's/^"//;s/"$//' | sed "s/^'//;s/'$//"
}

if [ ! -f .env ]; then
    echo "❌ Error: .env file not found in the current directory."
    exit 1
fi

if ! command -v gh &> /dev/null; then
    echo "❌ Error: GitHub CLI (gh) is not installed."
    exit 1
fi

echo "🔄 Starting Master Sync for $REPO..."

# List of all secrets to sync
SECRETS=(
    "AWS_REGION"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_SESSION_TOKEN"
    "AWS_ACCOUNT_ID"
    "DATABASE_URL"
    "DOCKERHUB_USERNAME"
    "DOCKERHUB_PASSWORD"
    "EC2_HOST"
    "EC2_USER"
    "EC2_SSH_KEY"
    "EC2_SECURITY_GROUP_ID"
)

for SECRET in "${SECRETS[@]}"; do
    VALUE=$(get_from_env "$SECRET")
    
    # Trim whitespace and check if not empty
    TRIMMED=$(echo "$VALUE" | xargs)
    
    if [ -n "$TRIMMED" ]; then
        echo "  -> Syncing $SECRET..."
        gh secret set "$SECRET" --body "$TRIMMED" --repo "$REPO"
    else
        echo "  -  Skipping $SECRET (empty or not found in .env)"
    fi
done

echo "✅ All secrets have been synchronized to GitHub!"
