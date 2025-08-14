# 🚀 AiBook Streaming Infrastructure Guide

## Overview

This guide covers the complete real-time streaming infrastructure for AiBook's AI-first financial platform. The streaming system enables real-time financial event processing, instant AI feature computation, and live data pipelines.

## 🏗️ Architecture Components

### Core Infrastructure
- **Apache Kafka** - Message streaming platform
- **Zookeeper** - Kafka coordination service
- **Schema Registry** - Data governance and evolution
- **Kafka Connect** - Data integration platform
- **KSQL DB** - Stream processing SQL engine
- **Redis** - Feature store and caching layer

### Management Tools
- **Kafka UI** - Web-based management interface
- **KSQL CLI** - Interactive SQL interface for streams

## 🚀 Quick Start

### 1. Start Streaming Infrastructure

```bash
# Start all streaming services
./scripts/start-streaming.sh

# Check service status
docker-compose -f docker-compose.streaming.yml -p aibook-streaming ps
```

### 2. Verify Installation

```bash
# Run comprehensive tests
node scripts/test-streaming.js

# Manual Kafka test
docker exec -it aibook-kafka kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic financial.transactions
```

### 3. Access Management UIs

- **Kafka UI**: http://localhost:8080
- **Schema Registry**: http://localhost:8081
- **Kafka Connect**: http://localhost:8083
- **KSQL DB**: http://localhost:8088

## 📊 Service Configuration

### Kafka Topics

| Topic | Partitions | Use Case | Retention |
|-------|------------|----------|-----------|
| `financial.transactions` | 6 | High-volume transaction events | 7 days |
| `financial.payments` | 3 | Payment events | 30 days |
| `financial.ai-events` | 3 | AI-generated insights/anomalies | 90 days |
| `financial.business-events` | 2 | Business configuration changes | 1 year |
| `financial.dlq` | 1 | Dead letter queue for failed events | 30 days |

### Performance Settings

```yaml
# Kafka Broker Configuration
KAFKA_LOG_RETENTION_HOURS: 168  # 7 days
KAFKA_LOG_SEGMENT_BYTES: 1073741824  # 1GB
KAFKA_NUM_PARTITIONS: 3
KAFKA_DEFAULT_REPLICATION_FACTOR: 1
```

## 🔄 Event Processing Flow

### 1. Event Production

```typescript
import { kafkaEventProducer } from './src/services/kafkaEventProducer';

// Financial transaction event
const transactionEvent = {
  eventId: 'tx_12345',
  eventType: 'transaction.created',
  tenantId: 'tenant_abc',
  timestamp: new Date().toISOString(),
  data: {
    transactionId: 'tx_12345',
    totalAmount: 1000,
    currency: 'USD',
    entries: [/* journal entries */]
  }
};

await kafkaEventProducer.publishEvent(transactionEvent);
```

### 2. Stream Processing

```typescript
import { streamProcessingService } from './src/services/streamProcessingService';

// Start real-time processing
await streamProcessingService.start();

// Processing includes:
// - Real-time balance updates
// - AI feature extraction
// - Anomaly detection
// - Metrics aggregation
```

### 3. Feature Store Updates

```typescript
// Automatic feature store updates
const featureUpdate = {
  tenantId: 'tenant_abc',
  featureName: 'daily_cash_inflow',
  featureValue: 1000,
  computedAt: new Date().toISOString()
};

// Stored in Redis for instant AI model access
```

## 🎯 Event Types & Schemas

### Financial Events

#### Transaction Created
```json
{
  "eventType": "transaction.created",
  "data": {
    "transactionId": "tx_12345",
    "journalId": "journal_456",
    "entries": [
      {
        "accountId": "acc_cash",
        "amount": 1000,
        "type": "DEBIT"
      }
    ],
    "totalAmount": 1000,
    "currency": "USD"
  }
}
```

#### Payment Received
```json
{
  "eventType": "payment.received",
  "data": {
    "paymentId": "pay_789",
    "customerId": "cust_123",
    "amount": 500,
    "paymentMethod": "bank_transfer"
  }
}
```

#### AI Anomaly Detected
```json
{
  "eventType": "ai.anomaly_detected",
  "data": {
    "anomalyType": "amount",
    "severity": "high",
    "confidence": 0.95,
    "description": "Unusually large transaction amount"
  }
}
```

## 🔧 Development Workflow

### Local Development

1. **Start Streaming Stack**
   ```bash
   ./scripts/start-streaming.sh
   ```

2. **Develop Event Producers**
   ```typescript
   // Add to your service
   import { kafkaEventProducer } from './services/kafkaEventProducer';
   
   // Publish events
   await kafkaEventProducer.publishEvent(event);
   ```

3. **Create Stream Processors**
   ```typescript
   // Custom stream processor
   streamProcessingService.addProcessor('my-processor', topics, handler);
   ```

4. **Test with UI**
   - View events: http://localhost:8080
   - Query streams: http://localhost:8088

### Production Deployment

1. **Environment Variables**
   ```bash
   KAFKA_BROKERS=your-kafka-cluster:9092
   SCHEMA_REGISTRY_URL=http://your-schema-registry:8081
   REDIS_HOST=your-redis-host
   ```

2. **Scaling Configuration**
   ```yaml
   # Higher replication for production
   replicationFactor: 3
   partitions: 12  # Scale based on throughput
   ```

## 📊 Monitoring & Observability

### Key Metrics

1. **Event Throughput**
   - Events per second by topic
   - Processing latency
   - Error rates

2. **Consumer Lag**
   - Processing delays
   - Backlog size

3. **Resource Usage**
   - CPU, memory, disk
   - Network throughput

### Monitoring Tools

```bash
# Check consumer groups
docker exec aibook-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 --list

# View topic details
docker exec aibook-kafka kafka-topics \
  --bootstrap-server localhost:9092 --describe
```

## 🚨 Troubleshooting

### Common Issues

1. **Kafka Connection Failed**
   ```bash
   # Check if Kafka is running
   docker-compose -f docker-compose.streaming.yml ps
   
   # View Kafka logs
   docker logs aibook-kafka
   ```

2. **Topic Creation Failed**
   ```bash
   # Manual topic creation
   docker exec aibook-kafka kafka-topics --create \
     --bootstrap-server localhost:9092 \
     --topic test-topic --partitions 1 --replication-factor 1
   ```

3. **Consumer Lag Issues**
   ```bash
   # Check consumer group status
   docker exec aibook-kafka kafka-consumer-groups \
     --bootstrap-server localhost:9092 \
     --describe --group aibook-transaction-processor
   ```

### Performance Tuning

1. **Increase Partitions**
   ```bash
   docker exec aibook-kafka kafka-topics --alter \
     --bootstrap-server localhost:9092 \
     --topic financial.transactions --partitions 12
   ```

2. **Adjust Consumer Configuration**
   ```typescript
   // Increase batch size for higher throughput
   maxBytesPerPartition: 10485760,  // 10MB
   minBytes: 1024,  // 1KB
   maxWaitTimeInMs: 1000,  // 1 second
   ```

## 🔐 Security Considerations

### Authentication & Authorization
- SASL/SCRAM authentication for production
- Role-based access control (RBAC)
- SSL/TLS encryption for data in transit

### Data Privacy
- Event-level encryption for sensitive data
- Tenant isolation through topic partitioning
- Audit logging for compliance

## 🚀 Next Steps

1. **Start Stream Processing Service** - Complete the real-time processing implementation
2. **BigQuery Integration** - Set up streaming data warehouse ingestion
3. **Vector Database** - Add semantic search capabilities
4. **Monitoring Stack** - Implement Grafana/Prometheus monitoring

## 📚 Additional Resources

- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [KSQL DB Guide](https://docs.ksqldb.io/)
- [Schema Registry](https://docs.confluent.io/platform/current/schema-registry/index.html)
- [AiBook Event Schema](./src/types/streaming.ts)

---

🎉 **Your streaming infrastructure is ready!** Start with `./scripts/start-streaming.sh` and begin building real-time financial AI features.
