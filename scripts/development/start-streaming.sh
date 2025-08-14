#!/bin/bash

# 🚀 AiBook Streaming Infrastructure Startup Script
# This script starts the complete streaming stack for development

echo "🚀 Starting AiBook Streaming Infrastructure..."

# ===========================================
# Configuration
# ===========================================
COMPOSE_FILE="docker-compose.streaming.yml"
PROJECT_NAME="aibook-streaming"

# ===========================================
# Helper Functions
# ===========================================
check_dependency() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is required but not installed."
        exit 1
    fi
}

wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    echo "⏳ Waiting for $service to be ready on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z localhost $port 2>/dev/null; then
            echo "✅ $service is ready!"
            return 0
        fi
        
        echo "   Attempt $attempt/$max_attempts - $service not ready yet..."
        sleep 2
        ((attempt++))
    done
    
    echo "❌ $service failed to start after $max_attempts attempts"
    return 1
}

# ===========================================
# Check Dependencies
# ===========================================
echo "🔍 Checking dependencies..."
check_dependency "docker"
check_dependency "docker-compose"

# ===========================================
# Start Streaming Stack
# ===========================================
echo "🏗️ Starting streaming infrastructure..."

# Start services in order
echo "📦 Starting Zookeeper..."
docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d zookeeper

if ! wait_for_service "Zookeeper" 2181; then
    echo "❌ Failed to start Zookeeper"
    exit 1
fi

echo "📦 Starting Kafka..."
docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d kafka

if ! wait_for_service "Kafka" 9092; then
    echo "❌ Failed to start Kafka"
    exit 1
fi

echo "📦 Starting Schema Registry..."
docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d schema-registry

if ! wait_for_service "Schema Registry" 8081; then
    echo "❌ Failed to start Schema Registry"
    exit 1
fi

echo "📦 Starting remaining services..."
docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d

# Wait for all services
echo "⏳ Waiting for all services to be ready..."
sleep 10

# ===========================================
# Verify Services
# ===========================================
echo "🔍 Verifying services..."

services=(
    "Kafka UI:8080"
    "Kafka Connect:8083"
    "KSQL DB:8088"
    "Redis:6380"
)

all_healthy=true
for service_port in "${services[@]}"; do
    service_name=$(echo $service_port | cut -d':' -f1)
    port=$(echo $service_port | cut -d':' -f2)
    
    if nc -z localhost $port 2>/dev/null; then
        echo "✅ $service_name is running on port $port"
    else
        echo "❌ $service_name is not responding on port $port"
        all_healthy=false
    fi
done

# ===========================================
# Create Kafka Topics
# ===========================================
if [ "$all_healthy" = true ]; then
    echo "🏗️ Creating Kafka topics..."
    
    topics=(
        "financial.transactions:6:1"
        "financial.payments:3:1"
        "financial.ai-events:3:1"
        "financial.business-events:2:1"
        "financial.dlq:1:1"
    )
    
    for topic_config in "${topics[@]}"; do
        topic_name=$(echo $topic_config | cut -d':' -f1)
        partitions=$(echo $topic_config | cut -d':' -f2)
        replication=$(echo $topic_config | cut -d':' -f3)
        
        echo "📝 Creating topic: $topic_name"
        docker exec aibook-kafka kafka-topics --create \
            --bootstrap-server localhost:9092 \
            --topic $topic_name \
            --partitions $partitions \
            --replication-factor $replication \
            --if-not-exists \
            --config retention.ms=604800000 \
            --config compression.type=lz4 2>/dev/null || echo "   Topic $topic_name may already exist"
    done
    
    echo "📋 Listing created topics:"
    docker exec aibook-kafka kafka-topics --list --bootstrap-server localhost:9092
fi

# ===========================================
# Display Status
# ===========================================
echo ""
echo "🎉 AiBook Streaming Infrastructure Started!"
echo ""
echo "📊 Service URLs:"
echo "   Kafka UI:        http://localhost:8080"
echo "   Schema Registry: http://localhost:8081"
echo "   Kafka Connect:   http://localhost:8083"
echo "   KSQL DB:         http://localhost:8088"
echo "   Redis:           localhost:6380"
echo ""
echo "🔧 Kafka Configuration:"
echo "   Bootstrap Servers: localhost:9092"
echo "   Schema Registry:   http://localhost:8081"
echo ""
echo "📋 Available Topics:"
docker exec aibook-kafka kafka-topics --list --bootstrap-server localhost:9092 2>/dev/null | sed 's/^/   /'
echo ""
echo "💡 Quick Commands:"
echo "   View logs:    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f"
echo "   Stop stack:   docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME down"
echo "   Restart:      docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME restart"
echo ""
echo "🧪 Test Kafka:"
echo "   Producer: docker exec -it aibook-kafka kafka-console-producer --bootstrap-server localhost:9092 --topic financial.transactions"
echo "   Consumer: docker exec -it aibook-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic financial.transactions --from-beginning"
echo ""

if [ "$all_healthy" = true ]; then
    echo "✅ All services are healthy and ready for use!"
    exit 0
else
    echo "⚠️  Some services may not be fully ready. Check logs for details:"
    echo "   docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME logs"
    exit 1
fi
