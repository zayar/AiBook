#!/bin/bash

# AiBook Production Deployment Script
set -e

echo "🚀 Starting AiBook Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PORT=${BACKEND_PORT:-3000}
FRONTEND_PORT=${FRONTEND_PORT:-3001}
NODE_ENV=${NODE_ENV:-production}

echo -e "${BLUE}📁 Project root: ${PROJECT_ROOT}${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        print_error "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_VERSION or higher"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Clean up previous builds
cleanup() {
    echo -e "${BLUE}🧹 Cleaning up previous builds...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Clean backend
    rm -rf node_modules/.cache
    rm -rf dist
    
    # Clean frontend
    cd frontend
    rm -rf .next
    rm -rf out
    rm -rf node_modules/.cache
    
    cd "$PROJECT_ROOT"
    print_status "Cleanup completed"
}

# Install dependencies
install_dependencies() {
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Backend dependencies
    print_status "Installing backend dependencies..."
    npm ci --only=production
    
    # Frontend dependencies
    cd frontend
    print_status "Installing frontend dependencies..."
    npm ci --only=production
    
    cd "$PROJECT_ROOT"
    print_status "Dependencies installed"
}

# Build backend
build_backend() {
    echo -e "${BLUE}🏗️  Building backend...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # TypeScript compilation check
    if command -v tsc &> /dev/null; then
        npx tsc --noEmit
        print_status "Backend TypeScript check passed"
    else
        print_warning "TypeScript compiler not found, skipping type check"
    fi
    
    print_status "Backend build completed"
}

# Build frontend
build_frontend() {
    echo -e "${BLUE}🏗️  Building frontend...${NC}"
    
    cd "$PROJECT_ROOT/frontend"
    
    # Copy production config
    if [ -f "next.config.prod.js" ]; then
        cp next.config.prod.js next.config.js
        print_status "Production config applied"
    fi
    
    # Build Next.js application
    NODE_ENV=production npm run build
    
    # Generate static export if needed
    # npm run export
    
    print_status "Frontend build completed"
}

# Database migrations
run_migrations() {
    echo -e "${BLUE}🗄️  Running database migrations...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Check if Prisma is available
    if command -v npx prisma &> /dev/null; then
        # Generate Prisma client
        npx prisma generate
        
        # Run migrations
        npx prisma migrate deploy
        
        print_status "Database migrations completed"
    else
        print_warning "Prisma not found, skipping migrations"
    fi
}

# Performance optimizations
optimize_performance() {
    echo -e "${BLUE}⚡ Applying performance optimizations...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Backend optimizations
    export NODE_ENV=production
    export NODE_OPTIONS="--max-old-space-size=4096"
    
    # Frontend optimizations
    cd frontend
    
    # Optimize images (if sharp is installed)
    if npm list sharp &> /dev/null; then
        print_status "Image optimization enabled"
    else
        print_warning "Sharp not installed, image optimization disabled"
    fi
    
    # Bundle analysis (optional)
    if [ "$ANALYZE_BUNDLE" = "true" ]; then
        echo -e "${BLUE}📊 Analyzing bundle size...${NC}"
        ANALYZE=true npm run build
    fi
    
    cd "$PROJECT_ROOT"
    print_status "Performance optimizations applied"
}

# Health checks
health_check() {
    echo -e "${BLUE}🔍 Running health checks...${NC}"
    
    # Start backend temporarily for health check
    cd "$PROJECT_ROOT"
    timeout 30s npm start &
    BACKEND_PID=$!
    
    sleep 10
    
    # Check backend health
    if curl -f -s "http://localhost:$BACKEND_PORT/health" > /dev/null; then
        print_status "Backend health check passed"
    else
        print_error "Backend health check failed"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    
    # Stop backend
    kill $BACKEND_PID 2>/dev/null || true
    
    print_status "Health checks completed"
}

# Security check
security_check() {
    echo -e "${BLUE}🔒 Running security checks...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Check for known vulnerabilities
    if command -v npm audit &> /dev/null; then
        npm audit --audit-level=high
        print_status "Security audit completed"
    else
        print_warning "npm audit not available"
    fi
}

# Start services
start_services() {
    echo -e "${BLUE}🚀 Starting production services...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Create PM2 ecosystem file if it doesn't exist
    if [ ! -f "ecosystem.config.js" ]; then
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'aibook-backend',
      script: 'npm',
      args: 'start',
      cwd: '$PROJECT_ROOT',
      env: {
        NODE_ENV: 'production',
        PORT: $BACKEND_PORT
      },
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      log_file: './logs/backend.log',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log'
    },
    {
      name: 'aibook-frontend',
      script: 'npm',
      args: 'start',
      cwd: '$PROJECT_ROOT/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: $FRONTEND_PORT
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      log_file: './logs/frontend.log',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log'
    }
  ]
};
EOF
        print_status "PM2 ecosystem file created"
    fi
    
    # Create logs directory
    mkdir -p logs
    
    # Start with PM2 if available
    if command -v pm2 &> /dev/null; then
        pm2 start ecosystem.config.js
        pm2 save
        print_status "Services started with PM2"
    else
        print_warning "PM2 not found, starting services manually"
        
        # Start backend
        nohup npm start > logs/backend.log 2>&1 &
        echo $! > backend.pid
        
        # Start frontend
        cd frontend
        nohup npm start > ../logs/frontend.log 2>&1 &
        echo $! > ../frontend.pid
        
        cd "$PROJECT_ROOT"
        print_status "Services started manually"
    fi
    
    # Wait for services to start
    sleep 10
    
    # Final health check
    if curl -f -s "http://localhost:$BACKEND_PORT/health" > /dev/null && \
       curl -f -s "http://localhost:$FRONTEND_PORT" > /dev/null; then
        print_status "All services are running successfully"
        echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
        echo -e "${BLUE}📱 Frontend: http://localhost:$FRONTEND_PORT${NC}"
        echo -e "${BLUE}🔧 Backend:  http://localhost:$BACKEND_PORT${NC}"
    else
        print_error "Some services failed to start properly"
        exit 1
    fi
}

# Main deployment process
main() {
    echo -e "${GREEN}🚀 AiBook Production Deployment${NC}"
    echo -e "${BLUE}================================${NC}"
    
    check_prerequisites
    cleanup
    install_dependencies
    build_backend
    build_frontend
    run_migrations
    optimize_performance
    security_check
    health_check
    start_services
    
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --analyze)
            ANALYZE_BUNDLE=true
            shift
            ;;
        --skip-health)
            SKIP_HEALTH=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --analyze     Analyze bundle size"
            echo "  --skip-health Skip health checks"
            echo "  --help        Show this help"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main deployment
main