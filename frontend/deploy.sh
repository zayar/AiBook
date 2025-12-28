#!/bin/bash
set -e

# Frontend Deployment Script for Google Cloud Run
# This script builds and deploys the Next.js frontend to Cloud Run

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="aibook-frontend"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.aibook.app}"

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install it from https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    # Check if PROJECT_ID is set
    if [ -z "$PROJECT_ID" ]; then
        print_error "GCP_PROJECT_ID is not set. Please set it: export GCP_PROJECT_ID=your-project-id"
        exit 1
    fi
    
    print_info "Prerequisites check passed ✓"
}

authenticate_gcloud() {
    print_info "Authenticating with Google Cloud..."
    
    # Set the project
    gcloud config set project "$PROJECT_ID"
    
    # Configure Docker to use gcloud as a credential helper
    gcloud auth configure-docker gcr.io --quiet
    
    print_info "Authentication complete ✓"
}

enable_apis() {
    print_info "Enabling required GCP APIs..."
    
    gcloud services enable \
        run.googleapis.com \
        containerregistry.googleapis.com \
        cloudbuild.googleapis.com \
        --project="$PROJECT_ID" \
        --quiet
    
    print_info "APIs enabled ✓"
}

build_image() {
    print_info "Building Docker image..."
    
    docker build \
        --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
        -t "$IMAGE_NAME:latest" \
        -t "$IMAGE_NAME:$(date +%Y%m%d-%H%M%S)" \
        -f Dockerfile.cloudrun \
        .
    
    print_info "Docker image built ✓"
}

push_image() {
    print_info "Pushing Docker image to GCR..."
    
    docker push "$IMAGE_NAME:latest"
    docker push "$IMAGE_NAME:$(date +%Y%m%d-%H%M%S)"
    
    print_info "Image pushed to GCR ✓"
}

deploy_to_cloudrun() {
    print_info "Deploying to Cloud Run..."
    
    gcloud run deploy "$SERVICE_NAME" \
        --image "$IMAGE_NAME:latest" \
        --platform managed \
        --region "$REGION" \
        --allow-unauthenticated \
        --port 3000 \
        --memory 512Mi \
        --cpu 1 \
        --min-instances 0 \
        --max-instances 10 \
        --set-env-vars "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL,NODE_ENV=production" \
        --timeout 300 \
        --concurrency 80 \
        --project="$PROJECT_ID" \
        --quiet
    
    print_info "Deployment complete ✓"
}

get_service_url() {
    print_info "Getting service URL..."
    
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
        --platform managed \
        --region "$REGION" \
        --project="$PROJECT_ID" \
        --format 'value(status.url)')
    
    echo ""
    print_info "=========================================="
    print_info "🚀 Frontend deployed successfully!"
    print_info "=========================================="
    print_info "Service URL: $SERVICE_URL"
    print_info "=========================================="
    echo ""
}

# Main execution
main() {
    print_info "Starting frontend deployment process..."
    echo ""
    
    check_prerequisites
    authenticate_gcloud
    enable_apis
    build_image
    push_image
    deploy_to_cloudrun
    get_service_url
    
    print_info "Deployment completed successfully! 🎉"
}

# Run main function
main
