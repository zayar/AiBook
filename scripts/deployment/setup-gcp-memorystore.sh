#!/bin/bash

# 🚀 Google Cloud Memorystore Redis Setup
# This script sets up a Redis instance on Google Cloud Memorystore

echo "🔧 Setting up Google Cloud Memorystore Redis for AiBook..."

# Configuration
PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID:-"your-project-id"}
REGION=${GOOGLE_CLOUD_REGION:-"us-central1"}
REDIS_INSTANCE_NAME="aibook-redis"
REDIS_TIER="BASIC"  # BASIC or STANDARD_HA
REDIS_SIZE="1"      # Size in GB
REDIS_VERSION="REDIS_6_X"

echo "📋 Configuration:"
echo "   Project ID: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Instance Name: $REDIS_INSTANCE_NAME"
echo "   Tier: $REDIS_TIER"
echo "   Memory Size: ${REDIS_SIZE}GB"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install Google Cloud SDK first."
    echo "   Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 > /dev/null; then
    echo "❌ Not authenticated with Google Cloud. Please run:"
    echo "   gcloud auth login"
    exit 1
fi

# Set the project
echo "🔧 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Enable the Redis API
echo "🔌 Enabling Redis API..."
gcloud services enable redis.googleapis.com

# Create the Redis instance
echo "🚀 Creating Redis instance '$REDIS_INSTANCE_NAME'..."
gcloud redis instances create $REDIS_INSTANCE_NAME \
    --size=$REDIS_SIZE \
    --region=$REGION \
    --redis-version=$REDIS_VERSION \
    --tier=$REDIS_TIER \
    --network=default

if [ $? -eq 0 ]; then
    echo "✅ Redis instance created successfully!"
else
    echo "❌ Failed to create Redis instance"
    exit 1
fi

# Wait for the instance to be ready
echo "⏳ Waiting for Redis instance to be ready..."
gcloud redis instances describe $REDIS_INSTANCE_NAME --region=$REGION --format="value(state)" | grep -q "READY"
while [ $? -ne 0 ]; do
    echo "   Still waiting..."
    sleep 10
    gcloud redis instances describe $REDIS_INSTANCE_NAME --region=$REGION --format="value(state)" | grep -q "READY"
done

# Get connection details
echo "📊 Getting connection details..."
REDIS_HOST=$(gcloud redis instances describe $REDIS_INSTANCE_NAME --region=$REGION --format="value(host)")
REDIS_PORT=$(gcloud redis instances describe $REDIS_INSTANCE_NAME --region=$REGION --format="value(port)")
REDIS_AUTH_STRING=$(gcloud redis instances describe $REDIS_INSTANCE_NAME --region=$REGION --format="value(authString)")

echo ""
echo "🎉 Google Cloud Memorystore Redis setup complete!"
echo ""
echo "📋 Connection Details:"
echo "   Host: $REDIS_HOST"
echo "   Port: $REDIS_PORT"
echo "   Auth String: $REDIS_AUTH_STRING"
echo ""
echo "🔧 Environment Variables to Set:"
echo "   export REDIS_HOST=$REDIS_HOST"
echo "   export REDIS_PORT=$REDIS_PORT"
if [ ! -z "$REDIS_AUTH_STRING" ]; then
    echo "   export REDIS_PASSWORD=$REDIS_AUTH_STRING"
fi
echo ""
echo "🌐 Or use the Redis URL format:"
if [ ! -z "$REDIS_AUTH_STRING" ]; then
    echo "   export REDIS_URL=redis://:$REDIS_AUTH_STRING@$REDIS_HOST:$REDIS_PORT"
else
    echo "   export REDIS_URL=redis://$REDIS_HOST:$REDIS_PORT"
fi
echo ""
echo "💰 Estimated Cost: ~\$30-50/month for 1GB Basic tier"
echo ""
echo "🧪 Test the connection with:"
echo "   node scripts/test-redis-connection.js"
echo ""
echo "🗑️ To delete this instance later (if needed):"
echo "   gcloud redis instances delete $REDIS_INSTANCE_NAME --region=$REGION"
