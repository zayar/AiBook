#!/bin/bash

# AiBook Deployment Script for Google Cloud Run
# This script deploys the AiBook application to Google Cloud Run

set -e

# Configuration
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"your-project-id"}
REGION=${GOOGLE_CLOUD_REGION:-"us-central1"}
SERVICE_NAME=${SERVICE_NAME:-"aibook-api"}
FRONTEND_SERVICE_NAME=${FRONTEND_SERVICE_NAME:-"aibook-frontend"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check if user is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_error "Not authenticated with gcloud. Please run 'gcloud auth login' first."
        exit 1
    fi
    
    log_info "Prerequisites check passed!"
}

# Set up Google Cloud project
setup_project() {
    log_info "Setting up Google Cloud project..."
    
    # Set the project
    gcloud config set project $PROJECT_ID
    
    # Enable required APIs
    log_info "Enabling required APIs..."
    gcloud services enable \
        cloudbuild.googleapis.com \
        run.googleapis.com \
        containerregistry.googleapis.com \
        cloudresourcemanager.googleapis.com \
        sql-component.googleapis.com \
        sqladmin.googleapis.com \
        firebase.googleapis.com \
        aiplatform.googleapis.com \
        bigquery.googleapis.com \
        redis.googleapis.com
    
    log_info "Project setup completed!"
}

# Build and push Docker images
build_and_push_images() {
    log_info "Building and pushing Docker images..."
    
    # Build and push API image
    log_info "Building API image..."
    docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG .
    docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG
    
    # Build and push frontend image
    log_info "Building frontend image..."
    docker build -t gcr.io/$PROJECT_ID/$FRONTEND_SERVICE_NAME:$IMAGE_TAG ./frontend
    docker push gcr.io/$PROJECT_ID/$FRONTEND_SERVICE_NAME:$IMAGE_TAG
    
    log_info "Images built and pushed successfully!"
}

# Deploy to Cloud Run
deploy_to_cloud_run() {
    log_info "Deploying to Cloud Run..."
    
    # Deploy API service
    log_info "Deploying API service..."
    gcloud run deploy $SERVICE_NAME \
        --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG \
        --platform managed \
        --region $REGION \
        --allow-unauthenticated \
        --port 3000 \
        --memory 2Gi \
        --cpu 2 \
        --max-instances 10 \
        --set-env-vars NODE_ENV=production \
        --set-env-vars DATABASE_URL=$DATABASE_URL \
        --set-env-vars REDIS_URL=$REDIS_URL \
        --set-env-vars FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID \
        --set-env-vars FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL \
        --set-env-vars FIREBASE_PRIVATE_KEY="$FIREBASE_PRIVATE_KEY" \
        --set-env-vars OPENAI_API_KEY=$OPENAI_API_KEY \
        --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID
    
    # Get the API service URL
    API_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
    
    # Deploy frontend service
    log_info "Deploying frontend service..."
    gcloud run deploy $FRONTEND_SERVICE_NAME \
        --image gcr.io/$PROJECT_ID/$FRONTEND_SERVICE_NAME:$IMAGE_TAG \
        --platform managed \
        --region $REGION \
        --allow-unauthenticated \
        --port 3000 \
        --memory 1Gi \
        --cpu 1 \
        --max-instances 5 \
        --set-env-vars NEXT_PUBLIC_API_URL=$API_URL/api/v1 \
        --set-env-vars NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
        --set-env-vars NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
        --set-env-vars NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
    
    # Get the frontend service URL
    FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE_NAME --region=$REGION --format="value(status.url)")
    
    log_info "Deployment completed successfully!"
    log_info "API URL: $API_URL"
    log_info "Frontend URL: $FRONTEND_URL"
}

# Set up custom domain (optional)
setup_custom_domain() {
    if [ -n "$CUSTOM_DOMAIN" ]; then
        log_info "Setting up custom domain: $CUSTOM_DOMAIN"
        
        # Map custom domain to frontend service
        gcloud run domain-mappings create \
            --service $FRONTEND_SERVICE_NAME \
            --domain $CUSTOM_DOMAIN \
            --region $REGION
        
        log_info "Custom domain setup completed!"
    fi
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Create a temporary Cloud Run job to run migrations
    gcloud run jobs create db-migrate \
        --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG \
        --region $REGION \
        --set-env-vars DATABASE_URL=$DATABASE_URL \
        --command="npx" \
        --args="prisma,migrate,deploy" \
        --task-timeout=300s
    
    # Execute the job
    gcloud run jobs execute db-migrate --region $REGION
    
    log_info "Database migrations completed!"
}

# Main deployment function
main() {
    log_info "Starting AiBook deployment..."
    
    check_prerequisites
    setup_project
    build_and_push_images
    run_migrations
    deploy_to_cloud_run
    setup_custom_domain
    
    log_info "🎉 AiBook deployment completed successfully!"
    log_info "Your application is now live!"
}

# Check if environment variables are set
check_environment() {
    log_info "Checking environment variables..."
    
    required_vars=(
        "DATABASE_URL"
        "REDIS_URL"
        "FIREBASE_PROJECT_ID"
        "FIREBASE_CLIENT_EMAIL"
        "FIREBASE_PRIVATE_KEY"
        "OPENAI_API_KEY"
        "NEXT_PUBLIC_FIREBASE_API_KEY"
        "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        log_error "Please set these variables before running the deployment script."
        exit 1
    fi
    
    log_info "Environment variables check passed!"
}

# Run the deployment
if [ "$1" = "--check-env" ]; then
    check_environment
else
    check_environment
    main
fi 