# 🌐 Google Cloud Setup Guide for AiBook

This guide will help you set up Google Cloud Platform to power AiBook's advanced AI features with Vertex AI and BigQuery.

## 🚀 Quick Setup (Automated)

Run our automated setup script:

```bash
./scripts/setup-google-cloud.sh
```

## 📋 Manual Setup Steps

### 1. Prerequisites

- [ ] Google Cloud Account
- [ ] Google Cloud CLI installed
- [ ] Billing account enabled

#### Install Google Cloud CLI:

**macOS:**
```bash
brew install --cask google-cloud-sdk
```

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
```

**Windows:**
Download from [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)

### 2. Authentication & Project Setup

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
export PROJECT_ID="aibook-project-$(date +%s)"
gcloud projects create $PROJECT_ID --name="AiBook AI Platform"

# Set as default project
gcloud config set project $PROJECT_ID
```

### 3. Enable Required APIs

```bash
# Enable all required APIs
gcloud services enable aiplatform.googleapis.com
gcloud services enable bigquery.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable iam.googleapis.com
```

### 4. Set Up Billing

⚠️ **Important:** Enable billing for your project at https://console.cloud.google.com/billing

Vertex AI and BigQuery require an active billing account.

### 5. Create Service Account

```bash
# Create service account
export SERVICE_ACCOUNT_NAME="aibook-service-account"
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
    --display-name="AiBook AI Service Account"

# Get service account email
export SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/bigquery.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/ml.admin"
```

### 6. Create Service Account Key

```bash
# Create credentials directory
mkdir -p ./credentials

# Generate service account key
gcloud iam service-accounts keys create ./credentials/aibook-service-account-key.json \
    --iam-account=$SERVICE_ACCOUNT_EMAIL
```

### 7. Set Up BigQuery Dataset

```bash
# Create BigQuery dataset
export REGION="us-central1"
export DATASET_ID="aibook_analytics"
bq mk --dataset --location=$REGION $PROJECT_ID:$DATASET_ID
```

### 8. Configure Environment Variables

Add these variables to your `.env` file:

```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./credentials/aibook-service-account-key.json

# BigQuery Configuration
BIGQUERY_DATASET_ID=aibook_analytics
BIGQUERY_LOCATION=us-central1

# Vertex AI Configuration
ENABLE_VERTEX_AI=true
VERTEX_AI_ENDPOINT=https://us-central1-aiplatform.googleapis.com

# BigQuery ML Configuration
ENABLE_BIGQUERY_ML=true

# AI Models
GEMINI_MODEL=gemini-1.5-pro
GEMINI_VISION_MODEL=gemini-1.5-pro-vision
AI_MODEL_VERSION=v2.0
```

### 9. Security Setup

```bash
# Add to .gitignore
echo "credentials/" >> .gitignore
echo "*.json" >> .gitignore
echo ".env.google-cloud" >> .gitignore
```

## 🧪 Testing Your Setup

### Test BigQuery Access

```bash
# List datasets
bq ls $PROJECT_ID:$DATASET_ID

# Test query
bq query --use_legacy_sql=false "SELECT 1 as test"
```

### Test Vertex AI Access

```bash
# List available models
gcloud ai models list --region=us-central1
```

### Test AiBook Integration

```bash
# Start your AiBook application
npm run dev

# Test Vertex AI endpoint
curl -X GET "http://localhost:3000/api/v1/ai/advanced/status" \
  -H "X-Tenant-ID: default"
```

## 📊 Available AI Features

Once set up, you'll have access to:

### 🔮 Predictive Analytics
- **Cash Flow Forecasting:** `/api/v1/ai/advanced/predict/cashflow`
- **Revenue Predictions:** `/api/v1/ai/advanced/predict/revenue`

### 🚨 Anomaly Detection
- **Real-time Detection:** `/api/v1/ai/advanced/anomalies/detect`
- **Pattern Recognition:** Advanced fraud detection

### 👥 Customer Intelligence
- **ML Segmentation:** `/api/v1/ai/advanced/customers/segment`
- **Lifetime Value:** Predictive customer analytics

### 📄 Document Processing
- **AI Vision:** `/api/v1/ai/advanced/documents/process`
- **OCR & Extraction:** Invoice and receipt processing

### 💡 Smart Insights
- **Business Intelligence:** `/api/v1/ai/advanced/insights/generate`
- **Real-time Dashboard:** `/api/v1/ai/advanced/dashboard`

## 💰 Cost Management

### Free Tier Limits
- **Vertex AI:** Limited free usage per month
- **BigQuery:** 1TB queries per month free
- **Storage:** 5GB free per month

### Cost Optimization Tips
1. **Monitor Usage:** Use Google Cloud Console billing dashboard
2. **Set Alerts:** Configure budget alerts
3. **Optimize Queries:** Efficient BigQuery queries reduce costs
4. **Model Selection:** Choose appropriate model sizes
5. **Regional Deployment:** Keep resources in same region

## 🔒 Security Best Practices

### 1. Service Account Security
- Rotate keys regularly (every 90 days)
- Use least-privilege principle
- Monitor service account usage

### 2. API Security
- Restrict API keys to specific IPs
- Use VPC for production deployments
- Enable audit logging

### 3. Data Protection
- Enable encryption at rest
- Use private endpoints for sensitive data
- Implement proper access controls

## 🆘 Troubleshooting

### Common Issues

#### "Permission denied" errors
```bash
# Check your roles
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --format='table(bindings.role)' \
  --filter="bindings.members:$SERVICE_ACCOUNT_EMAIL"
```

#### "Quota exceeded" errors
- Check quotas in Google Cloud Console
- Request quota increases if needed
- Monitor usage patterns

#### "Billing not enabled" errors
- Verify billing account is linked
- Check billing account permissions
- Ensure billing APIs are enabled

### Support Resources

- **Google Cloud Documentation:** https://cloud.google.com/docs
- **Vertex AI Docs:** https://cloud.google.com/vertex-ai/docs
- **BigQuery Docs:** https://cloud.google.com/bigquery/docs
- **AiBook Issues:** https://github.com/your-repo/issues

## 🎯 Next Steps

After setup, you can:

1. **Fine-tune Models:** Train with your specific data
2. **Custom Dashboards:** Build domain-specific insights
3. **Production Deployment:** Scale for real workloads
4. **Advanced Features:** Explore custom ML models

## 📞 Support

If you need help with the setup:

1. Check the troubleshooting section above
2. Review Google Cloud documentation
3. Open an issue in the AiBook repository
4. Contact the development team

---

🎉 **Congratulations!** Your AiBook platform now has enterprise-grade AI capabilities powered by Google Cloud!