#!/bin/bash

# 🌐 Google Cloud Setup Script for AiBook
# This script sets up Google Cloud Platform for Vertex AI and BigQuery integration

set -e  # Exit on any error

echo "🚀 GOOGLE CLOUD SETUP FOR AIBOOK"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="aibook-project-$(date +%s)"
REGION="us-central1"
DATASET_ID="aibook_analytics"
SERVICE_ACCOUNT_NAME="aibook-service-account"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Dataset ID: $DATASET_ID"
echo "  Service Account: $SERVICE_ACCOUNT_NAME"
echo ""

# Step 1: Check if gcloud is installed
echo -e "${YELLOW}1️⃣ Checking Google Cloud CLI...${NC}"
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI not found!${NC}"
    echo ""
    echo "Please install Google Cloud CLI:"
    echo "  macOS: brew install --cask google-cloud-sdk"
    echo "  Linux: curl https://sdk.cloud.google.com | bash"
    echo "  Windows: Download from https://cloud.google.com/sdk/docs/install"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Google Cloud CLI found${NC}"
gcloud version
echo ""

# Step 2: Login and set up project
echo -e "${YELLOW}2️⃣ Setting up Google Cloud Project...${NC}"

# Check if user is logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "Please log in to Google Cloud:"
    gcloud auth login
fi

echo ""
echo "Creating new project: $PROJECT_ID"
read -p "Do you want to use this project ID? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Create project
    echo "Creating project..."
    gcloud projects create $PROJECT_ID --name="AiBook AI Platform"
    
    # Set default project
    gcloud config set project $PROJECT_ID
    
    echo -e "${GREEN}✅ Project created and set as default${NC}"
else
    echo "Please enter your existing project ID:"
    read -r PROJECT_ID
    gcloud config set project $PROJECT_ID
    echo -e "${GREEN}✅ Using existing project: $PROJECT_ID${NC}"
fi

echo ""

# Step 3: Enable required APIs
echo -e "${YELLOW}3️⃣ Enabling Required APIs...${NC}"

APIS=(
    "aiplatform.googleapis.com"
    "bigquery.googleapis.com"
    "storage.googleapis.com"
    "compute.googleapis.com"
    "iam.googleapis.com"
    "serviceusage.googleapis.com"
)

for api in "${APIS[@]}"; do
    echo "Enabling $api..."
    gcloud services enable $api
done

echo -e "${GREEN}✅ All APIs enabled${NC}"
echo ""

# Step 4: Set up billing (informational)
echo -e "${YELLOW}4️⃣ Billing Account Setup${NC}"
echo "⚠️  Make sure billing is enabled for your project:"
echo "   1. Go to https://console.cloud.google.com/billing"
echo "   2. Link a billing account to project: $PROJECT_ID"
echo "   3. Vertex AI and BigQuery require billing to be enabled"
echo ""
read -p "Press Enter when billing is set up..."
echo ""

# Step 5: Create service account
echo -e "${YELLOW}5️⃣ Creating Service Account...${NC}"

gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
    --display-name="AiBook AI Service Account" \
    --description="Service account for AiBook AI features"

SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"

# Grant necessary roles
ROLES=(
    "roles/aiplatform.user"
    "roles/bigquery.admin"
    "roles/storage.admin"
    "roles/ml.admin"
)

for role in "${ROLES[@]}"; do
    echo "Granting role: $role"
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="$role"
done

echo -e "${GREEN}✅ Service account created with proper roles${NC}"
echo ""

# Step 6: Create and download service account key
echo -e "${YELLOW}6️⃣ Creating Service Account Key...${NC}"

KEY_FILE="./credentials/aibook-service-account-key.json"
mkdir -p ./credentials

gcloud iam service-accounts keys create $KEY_FILE \
    --iam-account=$SERVICE_ACCOUNT_EMAIL

echo -e "${GREEN}✅ Service account key created: $KEY_FILE${NC}"
echo ""

# Step 7: Set up BigQuery dataset
echo -e "${YELLOW}7️⃣ Setting up BigQuery Dataset...${NC}"

bq mk --dataset --location=$REGION $PROJECT_ID:$DATASET_ID

echo -e "${GREEN}✅ BigQuery dataset created: $DATASET_ID${NC}"
echo ""

# Step 8: Create environment variables
echo -e "${YELLOW}8️⃣ Creating Environment Configuration...${NC}"

cat > .env.google-cloud << EOF
# Google Cloud Configuration for AiBook
GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID
GOOGLE_CLOUD_LOCATION=$REGION
GOOGLE_APPLICATION_CREDENTIALS=./credentials/aibook-service-account-key.json
BIGQUERY_DATASET_ID=$DATASET_ID

# Vertex AI Configuration
ENABLE_VERTEX_AI=true
VERTEX_AI_ENDPOINT=https://$REGION-aiplatform.googleapis.com

# BigQuery Configuration
ENABLE_BIGQUERY_ML=true
BIGQUERY_LOCATION=$REGION

# AI Model Configuration
AI_MODEL_VERSION=v2.0
GEMINI_MODEL=gemini-1.5-pro
GEMINI_VISION_MODEL=gemini-1.5-pro-vision
EOF

echo -e "${GREEN}✅ Environment configuration created: .env.google-cloud${NC}"
echo ""

# Step 9: Test the setup
echo -e "${YELLOW}9️⃣ Testing the Setup...${NC}"

echo "Testing BigQuery access..."
if bq ls $PROJECT_ID:$DATASET_ID &> /dev/null; then
    echo -e "${GREEN}✅ BigQuery access working${NC}"
else
    echo -e "${RED}❌ BigQuery access failed${NC}"
fi

echo "Testing Vertex AI access..."
if gcloud ai models list --region=$REGION &> /dev/null; then
    echo -e "${GREEN}✅ Vertex AI access working${NC}"
else
    echo -e "${RED}❌ Vertex AI access failed${NC}"
fi

echo ""

# Step 10: Security setup
echo -e "${YELLOW}🔒 Security Setup...${NC}"

# Add credentials to .gitignore
if ! grep -q "credentials/" .gitignore 2>/dev/null; then
    echo "credentials/" >> .gitignore
    echo "*.json" >> .gitignore
    echo ".env.google-cloud" >> .gitignore
fi

echo -e "${GREEN}✅ Added credentials to .gitignore${NC}"
echo ""

# Final instructions
echo -e "${GREEN}🎉 GOOGLE CLOUD SETUP COMPLETE!${NC}"
echo "=================================="
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Copy the environment variables from .env.google-cloud to your .env file"
echo "2. Restart your application to load the new configuration"
echo "3. Test the Vertex AI endpoints"
echo ""
echo -e "${BLUE}🔗 Important URLs:${NC}"
echo "  • Google Cloud Console: https://console.cloud.google.com/home/dashboard?project=$PROJECT_ID"
echo "  • Vertex AI Console: https://console.cloud.google.com/vertex-ai?project=$PROJECT_ID"
echo "  • BigQuery Console: https://console.cloud.google.com/bigquery?project=$PROJECT_ID"
echo ""
echo -e "${YELLOW}⚠️  Security Notes:${NC}"
echo "  • Keep your service account key secure"
echo "  • Never commit credentials to version control"
echo "  • Rotate keys regularly in production"
echo ""
echo -e "${GREEN}✅ Your AiBook AI platform is ready for Google Cloud!${NC}"