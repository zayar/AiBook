# Frontend Deployment Guide - GCP Cloud Run

Complete guide for deploying the AiBook frontend to Google Cloud Platform using Cloud Run with automated CI/CD via GitHub Actions.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [GitHub Actions Setup](#github-actions-setup)
- [Manual Deployment](#manual-deployment)
- [Environment Variables](#environment-variables)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The frontend deployment uses:
- **Platform**: Google Cloud Run (serverless containers)
- **CI/CD**: GitHub Actions (automated deployment on push to main)
- **Container Registry**: Google Container Registry (GCR)
- **Build**: Docker multi-stage build with Next.js standalone output
- **Auto-scaling**: 0-10 instances based on traffic

### Architecture

```
GitHub (push) → GitHub Actions → Docker Build → GCR → Cloud Run → Public URL
```

## ✅ Prerequisites

### 1. Google Cloud Platform Setup

1. **Create or select a GCP project**
   ```bash
   gcloud projects create aibook-prod --name="AiBook Production"
   # Or use existing project
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable required APIs**
   ```bash
   gcloud services enable \
     run.googleapis.com \
     containerregistry.googleapis.com \
     cloudbuild.googleapis.com
   ```

3. **Create a service account for GitHub Actions**
   ```bash
   # Create service account
   gcloud iam service-accounts create github-actions \
     --display-name="GitHub Actions Deployment"
   
   # Grant necessary permissions
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.admin"
   
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/storage.admin"
   
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountUser"
   
   # Create and download key
   gcloud iam service-accounts keys create key.json \
     --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

### 2. Local Development Setup

- **Node.js 18+**
- **Docker Desktop** (for local testing)
- **gcloud CLI** (for manual deployments)

## 🚀 Quick Start

### Option 1: Automated Deployment (Recommended)

GitHub Actions automatically deploys when you push to the `main` branch.

1. **Set up GitHub Secrets** (see [GitHub Actions Setup](#github-actions-setup))
2. **Push to main branch**
   ```bash
   git push origin main
   ```
3. **Monitor deployment** in GitHub Actions tab

### Option 2: Manual Deployment

Use the provided deployment script:

```bash
cd frontend

# Set environment variables
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
export NEXT_PUBLIC_API_URL="https://api.aibook.app"

# Run deployment script
./deploy.sh
```

## 🔧 GitHub Actions Setup

### Required GitHub Secrets

Add these secrets in your GitHub repository: **Settings → Secrets and variables → Actions**

| Secret Name | Description | Example |
|------------|-------------|---------|
| `GCP_PROJECT_ID` | Your GCP project ID | `aibook-prod-12345` |
| `GCP_SA_KEY` | Service account JSON key | `{ "type": "service_account", ... }` |
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://api.aibook.app` |

### Setting Up Secrets

1. **GCP_PROJECT_ID**
   ```bash
   # Get your project ID
   gcloud config get-value project
   ```
   Add this value as a secret named `GCP_PROJECT_ID`

2. **GCP_SA_KEY**
   ```bash
   # Use the key.json created earlier
   cat key.json
   ```
   Copy the entire JSON content and add as secret `GCP_SA_KEY`

3. **NEXT_PUBLIC_API_URL**
   - Add your backend API URL (e.g., `https://api.aibook.app`)

### Workflow Configuration

The workflow file (`.github/workflows/deploy-frontend.yml`) automatically:

1. ✅ Triggers on push to `main` branch (when frontend files change)
2. ✅ Runs lint and build checks
3. ✅ Builds Docker image
4. ✅ Pushes to Google Container Registry
5. ✅ Deploys to Cloud Run
6. ✅ Reports deployment URL

### Customizing the Workflow

Edit `.github/workflows/deploy-frontend.yml`:

```yaml
env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: us-central1              # Change region if needed
  SERVICE_NAME: aibook-frontend    # Change service name if needed
```

## 🛠 Manual Deployment

### Using the Deployment Script

```bash
cd frontend

# Configure environment
export GCP_PROJECT_ID="aibook-prod"
export GCP_REGION="us-central1"
export NEXT_PUBLIC_API_URL="https://api.aibook.app"

# Run deployment
./deploy.sh
```

### Using gcloud CLI Directly

```bash
cd frontend

# Build image
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.aibook.app \
  -t gcr.io/YOUR_PROJECT_ID/aibook-frontend:latest \
  -f Dockerfile.cloudrun .

# Push to GCR
docker push gcr.io/YOUR_PROJECT_ID/aibook-frontend:latest

# Deploy to Cloud Run
gcloud run deploy aibook-frontend \
  --image gcr.io/YOUR_PROJECT_ID/aibook-frontend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NEXT_PUBLIC_API_URL=https://api.aibook.app,NODE_ENV=production"
```

## 🌍 Environment Variables

### Build-time Variables

Set during Docker build:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes | - |

### Runtime Variables

Set in Cloud Run service:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Node environment | Yes | `production` |
| `PORT` | Server port | Yes | `3000` |
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes | - |

### Adding Environment Variables

**Via gcloud CLI:**
```bash
gcloud run services update aibook-frontend \
  --region us-central1 \
  --set-env-vars "NEW_VAR=value"
```

**Via GitHub Actions:**
Edit `.github/workflows/deploy-frontend.yml`:
```yaml
--set-env-vars "NEXT_PUBLIC_API_URL=${{ secrets.NEXT_PUBLIC_API_URL }},NEW_VAR=value"
```

## 📊 Monitoring & Logging

### View Logs

**Using gcloud CLI:**
```bash
gcloud run services logs read aibook-frontend \
  --region us-central1 \
  --limit 50
```

**Using Cloud Console:**
1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Click on `aibook-frontend` service
3. Click **LOGS** tab

### Metrics

View service metrics in Cloud Console:
- Request count
- Request latency
- Container instance count
- Memory and CPU usage

### Setting Up Alerts

```bash
# Example: Alert on high error rate
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Frontend High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Build Fails - "npm ci" Error

**Problem:** Dependencies not installing correctly

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "fix: update package-lock.json"
```

#### 2. Container Fails to Start

**Problem:** Application crashes on startup

**Check logs:**
```bash
gcloud run services logs read aibook-frontend --region us-central1 --limit 100
```

**Common causes:**
- Missing environment variables
- Port configuration mismatch
- Memory limit too low

**Solution:**
```bash
# Increase memory
gcloud run services update aibook-frontend \
  --memory 1Gi \
  --region us-central1
```

#### 3. 403 Forbidden Error

**Problem:** GitHub Actions can't deploy

**Solution:**
- Verify service account has correct permissions
- Check `GCP_SA_KEY` secret is valid JSON
- Ensure APIs are enabled

```bash
# Re-enable APIs
gcloud services enable run.googleapis.com containerregistry.googleapis.com
```

#### 4. Environment Variables Not Set

**Problem:** `NEXT_PUBLIC_API_URL` is undefined

**Solution:**
- Must be set at **build time** (Docker build arg)
- Also set at runtime for consistency

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.aibook.app ...
```

#### 5. Deployment Timeout

**Problem:** Deployment takes too long

**Solution:**
```bash
# Increase timeout
gcloud run services update aibook-frontend \
  --timeout 600 \
  --region us-central1
```

### Debug Commands

```bash
# Check service status
gcloud run services describe aibook-frontend --region us-central1

# List all revisions
gcloud run revisions list --service aibook-frontend --region us-central1

# Rollback to previous revision
gcloud run services update-traffic aibook-frontend \
  --to-revisions REVISION_NAME=100 \
  --region us-central1

# Delete service (careful!)
gcloud run services delete aibook-frontend --region us-central1
```

## 🔐 Security Best Practices

1. **Use least privilege IAM roles**
   - Service account should only have necessary permissions

2. **Rotate service account keys regularly**
   ```bash
   gcloud iam service-accounts keys create new-key.json \
     --iam-account=github-actions@PROJECT_ID.iam.gserviceaccount.com
   ```

3. **Use Secret Manager for sensitive data**
   ```bash
   echo -n "secret-value" | gcloud secrets create my-secret --data-file=-
   ```

4. **Enable VPC Service Controls** (for production)

5. **Use Custom Domains with SSL**
   ```bash
   gcloud run domain-mappings create \
     --service aibook-frontend \
     --domain app.aibook.com \
     --region us-central1
   ```

## 💰 Cost Optimization

### Pricing Structure

Cloud Run pricing is based on:
- **Request count**: First 2 million free per month
- **Compute time**: Billed per 100ms
- **Memory**: GB-seconds
- **Network egress**: After 1GB free

### Optimization Tips

1. **Use minimum instances wisely**
   ```yaml
   --min-instances 0  # Scale to zero when idle (recommended for dev)
   --min-instances 1  # Keep 1 instance warm (recommended for prod)
   ```

2. **Right-size resources**
   ```yaml
   --memory 512Mi  # Start small, increase if needed
   --cpu 1         # 1 CPU is usually sufficient for frontend
   ```

3. **Optimize image size**
   - Use multi-stage builds (already implemented)
   - Use Alpine Linux base image
   - Minimize layer count

4. **Enable HTTP/2**
   - Automatically enabled on Cloud Run
   - Reduces connection overhead

## 📚 Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [GitHub Actions for GCP](https://github.com/google-github-actions)
- [Container Registry](https://cloud.google.com/container-registry/docs)

## 🆘 Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review Cloud Run logs
3. Check GitHub Actions workflow logs
4. Open an issue in the repository

---

**Last Updated:** 2024-12-28
**Version:** 1.0.0
