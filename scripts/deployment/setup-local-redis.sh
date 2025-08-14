#!/bin/bash

# 🚀 Local Redis Setup Script
# This script sets up a local Redis instance for development

echo "🔧 Setting up local Redis for AiBook development..."

# Check if Redis is already installed
if command -v redis-server &> /dev/null; then
    echo "✅ Redis is already installed"
else
    echo "📦 Installing Redis..."
    
    # Install Redis based on the operating system
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install redis
        else
            echo "❌ Homebrew not found. Please install Homebrew first:"
            echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y redis-server
        elif command -v yum &> /dev/null; then
            sudo yum install -y redis
        else
            echo "❌ Package manager not found. Please install Redis manually."
            exit 1
        fi
    else
        echo "❌ Unsupported operating system: $OSTYPE"
        echo "Please install Redis manually for your system."
        exit 1
    fi
fi

# Start Redis server
echo "🚀 Starting Redis server..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS with Homebrew
    brew services start redis
    echo "✅ Redis started with Homebrew services"
else
    # Linux
    if command -v systemctl &> /dev/null; then
        sudo systemctl start redis
        sudo systemctl enable redis
        echo "✅ Redis started with systemctl"
    else
        # Start Redis in background
        redis-server --daemonize yes
        echo "✅ Redis started as daemon"
    fi
fi

# Wait a moment for Redis to start
sleep 2

# Test the connection
echo "🧪 Testing Redis connection..."
if redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis is running and responding to ping"
    
    # Set some test data
    redis-cli set "test:aibook:setup" "success" > /dev/null
    result=$(redis-cli get "test:aibook:setup")
    
    if [ "$result" = "success" ]; then
        echo "✅ Redis read/write test successful"
        redis-cli del "test:aibook:setup" > /dev/null
    else
        echo "❌ Redis read/write test failed"
        exit 1
    fi
else
    echo "❌ Redis is not responding to ping"
    exit 1
fi

echo ""
echo "🎉 Local Redis setup complete!"
echo ""
echo "📋 Redis Connection Details:"
echo "   Host: localhost"
echo "   Port: 6379"
echo "   Password: (none)"
echo ""
echo "🔧 To use this Redis instance, set these environment variables:"
echo "   export REDIS_HOST=localhost"
echo "   export REDIS_PORT=6379"
echo "   # No password needed for local Redis"
echo ""
echo "🧪 Test the connection with:"
echo "   node scripts/test-redis-connection.js"
echo ""
echo "🛑 To stop Redis later:"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "   brew services stop redis"
else
    echo "   sudo systemctl stop redis"
fi
echo ""
echo "✨ You can now run your AiBook application with Redis caching!"
