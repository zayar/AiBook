# 🚀 Google Cloud Memorystore Redis Setup for AiBook

## 🎯 **Why Google Cloud Memorystore is Perfect for You**

Since you're already using GCP, Memorystore will give you:
- ✅ **Better Performance** - Lower latency within GCP network
- ✅ **Simpler Configuration** - No API keys, uses your existing GCP setup
- ✅ **Better Cost** - More predictable pricing than Redis Cloud
- ✅ **Integrated Security** - Works with your VPC and IAM

## 📋 **Step-by-Step Setup**

### **Step 1: Enable Redis API**
```bash
# Make sure you're in the right project
gcloud config set project YOUR_PROJECT_ID

# Enable the Redis API
gcloud services enable redis.googleapis.com
```

### **Step 2: Create Redis Instance**
```bash
# Create a basic Redis instance (1GB, ~$30/month)
gcloud redis instances create aibook-redis \
    --size=1 \
    --region=us-central1 \
    --redis-version=REDIS_6_X \
    --tier=BASIC \
    --network=default
```

### **Step 3: Wait for Instance to be Ready**
```bash
# Check status (should show "READY")
gcloud redis instances describe aibook-redis --region=us-central1
```

### **Step 4: Get Connection Details**
```bash
# Get the host and port
gcloud redis instances describe aibook-redis --region=us-central1 --format="value(host,port)"
```

## 🔧 **Easy Setup Script**

I've created a script to do this automatically:

```bash
# Make the script executable
chmod +x scripts/setup-gcp-memorystore.sh

# Run the setup (will prompt for project ID if needed)
./scripts/setup-gcp-memorystore.sh
```

## 🌐 **Environment Configuration**

After creating the instance, set these environment variables:

```bash
# Add to your .env file or export in your shell
export REDIS_HOST=10.x.x.x  # (IP from the setup)
export REDIS_PORT=6379
# No password needed for basic Memorystore
```

## 🧪 **Test the Connection**

```bash
# Test our enhanced connection
node scripts/test-redis-connection.js
```

## 💰 **Cost Estimation**

- **Basic 1GB**: ~$30/month
- **Standard HA 1GB**: ~$60/month
- **Basic 5GB**: ~$150/month

For your AI caching needs, **Basic 1GB is perfect to start**.

## 🔄 **Migration from Redis Cloud**

1. **Set up Memorystore** (steps above)
2. **Update environment variables** (Redis host/port)
3. **Test connection** with our script
4. **Deploy with new config**
5. **Cancel Redis Cloud** subscription

## ⚡ **What You'll Get**

Once connected, your AiBook will have:
- **10-40x faster** financial metric queries
- **Instant** AI feature serving
- **Smart caching** with automatic invalidation
- **Better user experience** with sub-100ms responses

## 🚀 **Next Steps**

**Option A: Quick Local Test (immediate)**
```bash
# Install local Redis for immediate testing
brew install redis
brew services start redis
export REDIS_HOST=localhost
export REDIS_PORT=6379
node scripts/test-redis-connection.js
```

**Option B: Production GCP Setup (recommended)**
1. Run: `./scripts/setup-gcp-memorystore.sh`
2. Copy the connection details it provides
3. Set environment variables
4. Test with: `node scripts/test-redis-connection.js`

## 🤔 **Which Should You Choose?**

**I recommend Option B (GCP Memorystore)** because:
- Better integration with your existing GCP setup
- Lower latency and better performance
- More predictable costs
- Easier maintenance

Would you like me to help you set it up? Just let me know your GCP project ID and I can guide you through the exact commands!
