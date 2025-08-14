#!/bin/bash

# ===========================================
# 🚀 Cashflow Copilot - Frontend Startup Script  
# ===========================================

echo "🌐 Starting Cashflow Copilot Frontend..."

# Navigate to frontend directory
cd frontend

echo "✅ Frontend configured for port 3001"
echo "✅ API proxy configured for backend on port 3000"

echo ""
echo "🚀 Starting frontend server..."
PORT=3001 npm run dev
