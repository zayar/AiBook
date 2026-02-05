# GitHub Actions Setup Instructions

Due to GitHub permissions, the workflow file needs to be added through the GitHub web interface or with a Personal Access Token that has workflow permissions.

## Option 1: Add via GitHub Web Interface (Recommended)

1. **Navigate to your repository** on GitHub: https://github.com/zayar/AiBook

2. **Go to Actions tab**
   - Click on "Actions" in the top navigation
   - Click "New workflow" or "Set up a workflow yourself"

3. **Create the workflow file**
   - Name it: `.github/workflows/deploy-frontend.yml`
   - Copy and paste the content from the workflow file below

4. **Commit the workflow**
   - Commit directly to the `main` branch
   - Or commit to a new branch and create a PR

## Option 2: Add via Git with Personal Access Token

1. **Create a Personal Access Token**
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Select scopes: `repo` and `workflow`
   - Generate and copy the token

2. **Configure Git to use the token**
   ```bash
   cd /home/user/webapp
   git remote set-url origin https://YOUR_USERNAME:YOUR_TOKEN@github.com/zayar/AiBook.git
   ```

3. **Add and push the workflow**
   ```bash
   git add .github/workflows/deploy-frontend.yml
   git commit -m "ci: add GitHub Actions workflow for frontend deployment"
   git push origin genspark_ai_developer
   ```

## Workflow File Content

Create file: `.github/workflows/deploy-frontend.yml`

\`\`\`yaml
name: Deploy Frontend to GCP Cloud Run

on:
  push:
    branches:
      - main
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy-frontend.yml'
  pull_request:
    branches:
      - main
    paths:
      - 'frontend/**'
  workflow_dispatch:

env:
  PROJECT_ID: \${{ secrets.GCP_PROJECT_ID }}
  REGION: us-central1
  SERVICE_NAME: aibook-frontend
  REGISTRY: gcr.io

jobs:
  # Build and test job
  build-and-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint --if-present || echo "No lint script found"

      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: \${{ secrets.NEXT_PUBLIC_API_URL || 'https://api.aibook.app' }}

      - name: Upload build artifacts
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: actions/upload-artifact@v4
        with:
          name: frontend-build
          path: frontend/.next
          retention-days: 1

  # Deploy to GCP Cloud Run
  deploy:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    permissions:
      contents: read
      id-token: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: \${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2
        with:
          project_id: \${{ secrets.GCP_PROJECT_ID }}

      - name: Configure Docker for GCR
        run: |
          gcloud auth configure-docker gcr.io

      - name: Build Docker image
        run: |
          docker build \\
            --build-arg NEXT_PUBLIC_API_URL=\${{ secrets.NEXT_PUBLIC_API_URL || 'https://api.aibook.app' }} \\
            -t \${{ env.REGISTRY }}/\${{ env.PROJECT_ID }}/\${{ env.SERVICE_NAME }}:\${{ github.sha }} \\
            -t \${{ env.REGISTRY }}/\${{ env.PROJECT_ID }}/\${{ env.SERVICE_NAME }}:latest \\
            -f frontend/Dockerfile.cloudrun \\
            ./frontend

      - name: Push Docker image to GCR
        run: |
          docker push \${{ env.REGISTRY }}/\${{ env.PROJECT_ID }}/\${{ env.SERVICE_NAME }}:\${{ github.sha }}
          docker push \${{ env.REGISTRY }}/\${{ env.PROJECT_ID }}/\${{ env.SERVICE_NAME }}:latest

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy \${{ env.SERVICE_NAME }} \\
            --image \${{ env.REGISTRY }}/\${{ env.PROJECT_ID }}/\${{ env.SERVICE_NAME }}:\${{ github.sha }} \\
            --platform managed \\
            --region \${{ env.REGION }} \\
            --allow-unauthenticated \\
            --port 3000 \\
            --memory 512Mi \\
            --cpu 1 \\
            --min-instances 0 \\
            --max-instances 10 \\
            --set-env-vars "NEXT_PUBLIC_API_URL=\${{ secrets.NEXT_PUBLIC_API_URL || 'https://api.aibook.app' }}" \\
            --set-env-vars "NODE_ENV=production" \\
            --timeout 300 \\
            --concurrency 80

      - name: Get Cloud Run URL
        id: get-url
        run: |
          URL=\$(gcloud run services describe \${{ env.SERVICE_NAME }} \\
            --platform managed \\
            --region \${{ env.REGION }} \\
            --format 'value(status.url)')
          echo "url=\$URL" >> \$GITHUB_OUTPUT
          echo "🚀 Frontend deployed to: \$URL"

      - name: Create deployment summary
        run: |
          cat >> \$GITHUB_STEP_SUMMARY << EOF
          ## 🚀 Frontend Deployment Successful
          
          **Service:** \${{ env.SERVICE_NAME }}
          **Region:** \${{ env.REGION }}
          **Image:** \${{ env.REGISTRY }}/\${{ env.PROJECT_ID }}/\${{ env.SERVICE_NAME }}:\${{ github.sha }}
          **URL:** \${{ steps.get-url.outputs.url }}
          
          ### Deployment Details
          - Commit: \${{ github.sha }}
          - Branch: \${{ github.ref_name }}
          - Author: \${{ github.actor }}
          - Timestamp: \$(date -u)
          EOF

  # Notify on deployment status
  notify:
    needs: deploy
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Deployment Status
        run: |
          if [ "\${{ needs.deploy.result }}" == "success" ]; then
            echo "✅ Frontend deployment completed successfully!"
          else
            echo "❌ Frontend deployment failed!"
            exit 1
          fi
\`\`\`

## Required GitHub Secrets

Before the workflow can run, add these secrets in your repository:

**Settings → Secrets and variables → Actions → New repository secret**

1. **GCP_PROJECT_ID**
   - Your Google Cloud Project ID
   - Example: `aibook-prod-12345`

2. **GCP_SA_KEY**
   - Service account JSON key (entire JSON content)
   - Create with:
     ```bash
     gcloud iam service-accounts keys create key.json \
       --iam-account=github-actions@PROJECT_ID.iam.gserviceaccount.com
     cat key.json
     ```

3. **NEXT_PUBLIC_API_URL**
   - Your backend API URL
   - Example: `https://api.aibook.app`

## Verify Setup

Once the workflow is added:

1. Push a change to the `frontend/` directory
2. Go to Actions tab to see the workflow run
3. Check the deployment summary for the Cloud Run URL

## Troubleshooting

- **Workflow not triggering**: Check that it's committed to the correct branch
- **Permission errors**: Verify service account has required roles
- **Build failures**: Check GitHub Actions logs for specific errors

For detailed troubleshooting, see `FRONTEND_DEPLOYMENT.md`
