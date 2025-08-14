#!/bin/bash

# ===========================================
# 🚀 Cashflow Copilot - Complete Startup Script
# ===========================================

echo "🚀 Starting Cashflow Copilot Application..."
echo ""

# Run environment setup first
echo "🔧 Setting up environment and database..."
./scripts/development/setup-environment.sh

if [ $? -ne 0 ]; then
    echo "❌ Environment setup failed. Exiting..."
    exit 1
fi

echo ""
echo "🚀 Starting both backend and frontend..."

# Start backend in background
echo "🖥️  Starting backend server..."
./scripts/development/start-backend.sh &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 5

# Start frontend in background  
echo "🌐 Starting frontend server..."
./scripts/development/start-frontend.sh &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are starting..."
echo "📊 Backend:  http://localhost:3000"
echo "🌐 Frontend: http://localhost:3001"
echo ""
echo "To stop both servers, press Ctrl+C"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
