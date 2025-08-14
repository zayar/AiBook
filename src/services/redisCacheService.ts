import { createClient, RedisClientType } from 'redis';
import { FinancialMetrics, CachedReport, FeatureStore } from '../types/cache';

/**
 * 🚀 Redis Cache Service
 * High-performance caching for financial data and AI features
 * 
 * Key Features:
 * • Financial metrics caching with smart TTL
 * • AI feature store for real-time inference
 * • Multi-tenant data isolation
 * • Intelligent cache invalidation
 * • Performance monitoring
 */
export class RedisCacheService {
  private client: RedisClientType;
  private isConnected: boolean = false;
  private metricsCache: Map<string, any> = new Map();

  constructor() {
    // Redis configuration with multiple fallback options
    const redisConfig = this.getRedisConfig();
    this.client = createClient(redisConfig);

    this.setupEventListeners();
    this.connect();
  }

  private getRedisConfig() {
    // Try different Redis configuration options
    console.log('🔧 Configuring Redis connection...');

    // Option 1: Environment variables (recommended for production)
    if (process.env.REDIS_URL) {
      console.log('📡 Using REDIS_URL from environment');
      return { url: process.env.REDIS_URL };
    }

    // Option 2: Google Cloud Memorystore (recommended for GCP)
    if (process.env.REDIS_HOST) {
      console.log('📡 Using Google Cloud Memorystore configuration');
      const config: any = {
        socket: {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379')
        }
      };
      
      // Add password if provided (some Memorystore instances use AUTH)
      if (process.env.REDIS_PASSWORD) {
        config.password = process.env.REDIS_PASSWORD;
      }
      
      return config;
    }

    // Option 3: Local Redis fallback (development)
    if (process.env.NODE_ENV === 'development') {
      console.log('📡 Using local Redis for development');
      return {
        socket: {
          host: 'localhost',
          port: 6379
        }
      };
    }

    // Option 4: Redis Cloud fallback (your current setup)
    console.log('📡 Falling back to Redis Cloud configuration');
    return {
      password: 'A31pzlkw1td0ndm6lvhqfmgx3de5uxa28732n0v7wjcz80s4wtq',
      socket: {
        host: 'redis-13267.c323.us-east-1-2.ec2.cloud.redislabs.com',
        port: 13267,
        tls: true
      }
    };
  }

  private setupEventListeners() {
    this.client.on('connect', () => {
      console.log('🔗 Redis Cache Service connected successfully');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
      this.isConnected = false;
    });

    this.client.on('disconnect', () => {
      console.log('📴 Redis disconnected');
      this.isConnected = false;
    });
  }

  private async connect() {
    try {
      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
    }
  }

  /**
   * 📊 CACHE FINANCIAL METRICS
   * Cache frequently accessed financial metrics with tenant isolation
   */
  async cacheFinancialMetrics(tenantId: string, metrics: FinancialMetrics, ttlSeconds: number = 300): Promise<boolean> {
    try {
      if (!this.isConnected) {
        console.warn('Redis not connected, using in-memory fallback');
        this.metricsCache.set(`metrics:${tenantId}`, { metrics, expiry: Date.now() + (ttlSeconds * 1000) });
        return true;
      }

      const key = `tenant:${tenantId}:metrics:${metrics.period}`;
      const data = JSON.stringify({
        ...metrics,
        cachedAt: new Date().toISOString(),
        ttl: ttlSeconds
      });

      await this.client.setEx(key, ttlSeconds, data);
      
      // Also cache individual metric components for faster access
      await Promise.all([
        this.client.setEx(`tenant:${tenantId}:revenue:${metrics.period}`, ttlSeconds, metrics.totalRevenue.toString()),
        this.client.setEx(`tenant:${tenantId}:expenses:${metrics.period}`, ttlSeconds, metrics.totalExpenses.toString()),
        this.client.setEx(`tenant:${tenantId}:profit:${metrics.period}`, ttlSeconds, metrics.netIncome.toString())
      ]);

      console.log(`✅ Cached financial metrics for tenant ${tenantId} (${metrics.period})`);
      return true;
    } catch (error) {
      console.error('Failed to cache financial metrics:', error);
      return false;
    }
  }

  /**
   * 📈 GET CACHED FINANCIAL METRICS
   * Retrieve cached financial metrics with fallback to in-memory
   */
  async getFinancialMetrics(tenantId: string, period: string): Promise<FinancialMetrics | null> {
    try {
      if (!this.isConnected) {
        const cached = this.metricsCache.get(`metrics:${tenantId}`);
        if (cached && cached.expiry > Date.now()) {
          return cached.metrics;
        }
        return null;
      }

      const key = `tenant:${tenantId}:metrics:${period}`;
      const cachedData = await this.client.get(key);
      
      if (cachedData) {
        const metrics = JSON.parse(cachedData);
        console.log(`🎯 Cache HIT for financial metrics: tenant ${tenantId} (${period})`);
        return metrics;
      }

      console.log(`❌ Cache MISS for financial metrics: tenant ${tenantId} (${period})`);
      return null;
    } catch (error) {
      console.error('Failed to get cached financial metrics:', error);
      return null;
    }
  }

  /**
   * 🤖 CACHE AI FEATURES
   * Store AI features for real-time inference
   */
  async cacheAIFeatures(tenantId: string, features: FeatureStore, ttlSeconds: number = 600): Promise<boolean> {
    try {
      if (!this.isConnected) {
        this.metricsCache.set(`features:${tenantId}`, { features, expiry: Date.now() + (ttlSeconds * 1000) });
        return true;
      }

      const key = `tenant:${tenantId}:ai:features`;
      const data = JSON.stringify({
        ...features,
        cachedAt: new Date().toISOString(),
        version: features.version || '1.0'
      });

      await this.client.setEx(key, ttlSeconds, data);
      
      // Cache individual features for granular access
      const featurePromises = Object.entries(features.features).map(([featureName, featureValue]) => 
        this.client.setEx(`tenant:${tenantId}:feature:${featureName}`, ttlSeconds, JSON.stringify(featureValue))
      );
      
      await Promise.all(featurePromises);

      console.log(`🧠 Cached AI features for tenant ${tenantId}`);
      return true;
    } catch (error) {
      console.error('Failed to cache AI features:', error);
      return false;
    }
  }

  /**
   * 🎯 GET AI FEATURES
   * Retrieve AI features for real-time inference
   */
  async getAIFeatures(tenantId: string): Promise<FeatureStore | null> {
    try {
      if (!this.isConnected) {
        const cached = this.metricsCache.get(`features:${tenantId}`);
        if (cached && cached.expiry > Date.now()) {
          return cached.features;
        }
        return null;
      }

      const key = `tenant:${tenantId}:ai:features`;
      const cachedData = await this.client.get(key);
      
      if (cachedData) {
        const features = JSON.parse(cachedData);
        console.log(`🎯 Cache HIT for AI features: tenant ${tenantId}`);
        return features;
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached AI features:', error);
      return null;
    }
  }

  /**
   * 📋 CACHE REPORTS
   * Cache generated financial reports
   */
  async cacheReport(tenantId: string, reportType: string, report: CachedReport, ttlSeconds: number = 1800): Promise<boolean> {
    try {
      const key = `tenant:${tenantId}:report:${reportType}:${report.period}`;
      const data = JSON.stringify({
        ...report,
        cachedAt: new Date().toISOString()
      });

      if (this.isConnected) {
        await this.client.setEx(key, ttlSeconds, data);
      } else {
        this.metricsCache.set(key, { report, expiry: Date.now() + (ttlSeconds * 1000) });
      }

      console.log(`📊 Cached ${reportType} report for tenant ${tenantId}`);
      return true;
    } catch (error) {
      console.error('Failed to cache report:', error);
      return false;
    }
  }

  /**
   * 📈 GET CACHED REPORT
   * Retrieve cached financial report
   */
  async getCachedReport(tenantId: string, reportType: string, period: string): Promise<CachedReport | null> {
    try {
      const key = `tenant:${tenantId}:report:${reportType}:${period}`;
      
      if (!this.isConnected) {
        const cached = this.metricsCache.get(key);
        if (cached && cached.expiry > Date.now()) {
          return cached.report;
        }
        return null;
      }

      const cachedData = await this.client.get(key);
      
      if (cachedData) {
        const report = JSON.parse(cachedData);
        console.log(`🎯 Cache HIT for ${reportType} report: tenant ${tenantId}`);
        return report;
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached report:', error);
      return null;
    }
  }

  /**
   * 🔄 INVALIDATE CACHE
   * Smart cache invalidation for tenant data
   */
  async invalidateTenantCache(tenantId: string, pattern?: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        // Clear in-memory cache
        const keysToDelete = Array.from(this.metricsCache.keys()).filter(key => key.includes(tenantId));
        keysToDelete.forEach(key => this.metricsCache.delete(key));
        return true;
      }

      const searchPattern = pattern || `tenant:${tenantId}:*`;
      const keys = await this.client.keys(searchPattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(`🗑️ Invalidated ${keys.length} cache keys for tenant ${tenantId}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
      return false;
    }
  }

  /**
   * 📊 GET CACHE STATS
   * Monitor cache performance
   */
  async getCacheStats(tenantId: string): Promise<{
    hitRate: number;
    totalKeys: number;
    memoryUsage: string;
    uptime: number;
  } | null> {
    try {
      if (!this.isConnected) {
        return {
          hitRate: 0,
          totalKeys: this.metricsCache.size,
          memoryUsage: 'N/A (in-memory)',
          uptime: 0
        };
      }

      const info = await this.client.info('stats');
      const keys = await this.client.keys(`tenant:${tenantId}:*`);
      
      // Parse Redis stats (simplified)
      const hitRate = parseFloat(info.split('keyspace_hits:')[1]?.split('\r\n')[0] || '0');
      const missRate = parseFloat(info.split('keyspace_misses:')[1]?.split('\r\n')[0] || '1');
      
      return {
        hitRate: hitRate / (hitRate + missRate) * 100,
        totalKeys: keys.length,
        memoryUsage: info.split('used_memory_human:')[1]?.split('\r\n')[0] || 'Unknown',
        uptime: parseFloat(info.split('uptime_in_seconds:')[1]?.split('\r\n')[0] || '0')
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return null;
    }
  }

  /**
   * 🛑 CLOSE CONNECTION
   * Gracefully close Redis connection
   */
  async close(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.quit();
        console.log('✅ Redis connection closed gracefully');
      }
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
}

// Export singleton instance
export const redisCacheService = new RedisCacheService();
