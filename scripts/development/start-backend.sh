#!/bin/bash

# ===========================================
# 🚀 Cashflow Copilot - Backend Startup Script
# ===========================================

echo "🚀 Starting Cashflow Copilot Backend..."

# Set environment variables
export NODE_ENV=development
export DATABASE_URL="mysql://gtadmin:gtapp456$%^@34.123.50.107:3306/aiAccount?sslmode=disable"
export DEFAULT_TENANT_ID=default
export REDIS_URL="redis://localhost:6379"
export KAFKAJS_NO_PARTITIONER_WARNING=1

echo "✅ Environment configured for Cloud SQL"

# Quick tenant check
echo "🔍 Verifying default tenant..."
node scripts/development/check-tenant-quick.js 2>/dev/null

echo ""
echo "🚀 Starting backend server..."
npm run dev
