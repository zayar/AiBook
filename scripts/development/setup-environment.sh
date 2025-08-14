#!/bin/bash

# ===========================================
# 🚀 Cashflow Copilot - Environment Setup Script
# ===========================================

echo "🔧 Setting up Cashflow Copilot environment..."

# Export all necessary environment variables
export NODE_ENV=development
export DATABASE_URL="mysql://gtadmin:gtapp456$%^@34.123.50.107:3306/aiAccount?sslmode=disable"
export DEFAULT_TENANT_ID=default
export REDIS_URL="redis://localhost:6379"
export KAFKAJS_NO_PARTITIONER_WARNING=1

echo "✅ Environment variables configured:"
echo "   NODE_ENV: $NODE_ENV"
echo "   DATABASE_URL: [CONFIGURED - Cloud SQL]"
echo "   DEFAULT_TENANT_ID: $DEFAULT_TENANT_ID"
echo "   REDIS_URL: $REDIS_URL"

# Check and create default tenant
echo ""
echo "🔍 Checking for default tenant in database..."
node scripts/development/check-tenant.js

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "To start the application:"
echo "  Backend:  npm run dev"
echo "  Frontend: cd frontend && PORT=3001 npm run dev"
