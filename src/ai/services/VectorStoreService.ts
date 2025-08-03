/**
 * 🔍 VECTOR STORE SERVICE
 * 
 * Manages vector embeddings for semantic search and similarity matching.
 * Supports multiple vector store backends and provides unified interface.
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface VectorSearchResult {
  id: string;
  entityType: string;
  entityId: string;
  similarity: number;
  metadata: any;
  embedding?: number[];
}

export interface EmbeddingRequest {
  id: string;
  entityType: string;
  entityId: string;
  text: string;
  metadata?: any;
  tenantId: string;
}

export interface VectorStoreConfig {
  provider: 'in_memory' | 'pinecone' | 'weaviate' | 'chroma';
  apiKey?: string;
  endpoint?: string;
  indexName?: string;
  dimensions?: number;
}

/**
 * Vector Store Service for semantic search and similarity matching
 */
export class VectorStoreService {
  private config: VectorStoreConfig;
  private inMemoryStore: Map<string, { embedding: number[]; metadata: any }>;

  constructor(config: VectorStoreConfig = { provider: 'in_memory', dimensions: 1536 }) {
    this.config = config;
    this.inMemoryStore = new Map();
  }

  /**
   * 🔄 GENERATE EMBEDDINGS
   * Generate vector embeddings for text content
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // For now, use a simple hash-based embedding
    // In production, this would use OpenAI embeddings API
    const hash = crypto.createHash('sha256').update(text).digest();
    const embedding: number[] = [];
    
    // Convert hash to normalized vector
    for (let i = 0; i < Math.min(this.config.dimensions || 1536, hash.length * 8); i += 8) {
      const byte = hash[Math.floor(i / 8)];
      const normalized = (byte - 127.5) / 127.5; // Normalize to [-1, 1]
      embedding.push(normalized);
    }
    
    // Pad or trim to desired dimensions
    while (embedding.length < (this.config.dimensions || 1536)) {
      embedding.push(0);
    }
    
    return embedding.slice(0, this.config.dimensions || 1536);
  }

  /**
   * 💾 STORE EMBEDDING
   * Store entity embedding with metadata
   */
  async storeEmbedding(request: EmbeddingRequest): Promise<void> {
    const embedding = await this.generateEmbedding(request.text);
    const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);

    switch (this.config.provider) {
      case 'in_memory':
        this.inMemoryStore.set(request.id, {
          embedding,
          metadata: {
            ...request.metadata,
            entityType: request.entityType,
            entityId: request.entityId,
            tenantId: request.tenantId,
            text: request.text.substring(0, 500) // Store snippet for debugging
          }
        });
        break;

      default:
        // Store in database as fallback
        await this.storeInDatabase(request, embeddingBuffer);
    }
  }

  /**
   * 🔍 SEMANTIC SEARCH
   * Find similar entities using vector similarity
   */
  async semanticSearch(
    queryText: string, 
    tenantId: string, 
    options: {
      entityTypes?: string[];
      limit?: number;
      threshold?: number;
    } = {}
  ): Promise<VectorSearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(queryText);
    const { entityTypes, limit = 10, threshold = 0.7 } = options;

    switch (this.config.provider) {
      case 'in_memory':
        return this.searchInMemory(queryEmbedding, tenantId, { entityTypes, limit, threshold });
      
      default:
        return this.searchInDatabase(queryEmbedding, tenantId, { entityTypes, limit, threshold });
    }
  }

  /**
   * 🎯 FIND SIMILAR ENTITIES
   * Find entities similar to a given entity
   */
  async findSimilarEntities(
    entityId: string,
    entityType: string,
    tenantId: string,
    limit: number = 5
  ): Promise<VectorSearchResult[]> {
    // Get the entity's embedding
    const entity = await this.getEntityEmbedding(entityId, entityType, tenantId);
    if (!entity || !entity.embedding) {
      return [];
    }

    return this.vectorSimilaritySearch(entity.embedding, tenantId, {
      entityTypes: [entityType],
      limit: limit + 1, // +1 to exclude self
      excludeEntityId: entityId
    });
  }

  /**
   * 📊 BATCH STORE EMBEDDINGS
   * Efficiently store multiple embeddings
   */
  async batchStoreEmbeddings(requests: EmbeddingRequest[]): Promise<void> {
    const batchPromises = requests.map(request => this.storeEmbedding(request));
    await Promise.all(batchPromises);
  }

  /**
   * 🔄 UPDATE ENTITY EMBEDDING
   * Update embedding when entity content changes
   */
  async updateEntityEmbedding(
    entityId: string,
    entityType: string,
    newText: string,
    tenantId: string,
    metadata?: any
  ): Promise<void> {
    const request: EmbeddingRequest = {
      id: `${entityType}_${entityId}`,
      entityType,
      entityId,
      text: newText,
      metadata,
      tenantId
    };

    await this.storeEmbedding(request);
  }

  /**
   * 🗑️ DELETE ENTITY EMBEDDING
   * Remove embedding when entity is deleted
   */
  async deleteEntityEmbedding(entityId: string, entityType: string, tenantId: string): Promise<void> {
    const id = `${entityType}_${entityId}`;

    switch (this.config.provider) {
      case 'in_memory':
        this.inMemoryStore.delete(id);
        break;
      
      default:
        // Delete from database
        await prisma.aIInsight.deleteMany({
          where: {
            entityId,
            entityType,
            tenantId,
            type: 'PATTERN_RECOGNITION' // Use this type for embeddings
          }
        });
    }
  }

  // ===== PRIVATE METHODS =====

  /**
   * Store embedding in database
   */
  private async storeInDatabase(request: EmbeddingRequest, embeddingBuffer: Buffer): Promise<void> {
    await prisma.aIInsight.upsert({
      where: {
        id: request.id
      },
      create: {
        id: request.id,
        type: 'PATTERN_RECOGNITION',
        entityType: request.entityType,
        entityId: request.entityId,
        insight: {
          text: request.text.substring(0, 1000),
          ...request.metadata
        },
        confidence: 1.0,
        embedding: embeddingBuffer,
        tags: ['semantic_search', 'embedding'],
        tenantId: request.tenantId
      },
      update: {
        insight: {
          text: request.text.substring(0, 1000),
          ...request.metadata
        },
        embedding: embeddingBuffer,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Search in memory store
   */
  private async searchInMemory(
    queryEmbedding: number[],
    tenantId: string,
    options: { entityTypes?: string[]; limit: number; threshold: number }
  ): Promise<VectorSearchResult[]> {
    const results: VectorSearchResult[] = [];

    for (const [id, data] of this.inMemoryStore.entries()) {
      if (data.metadata.tenantId !== tenantId) continue;
      
      if (options.entityTypes && !options.entityTypes.includes(data.metadata.entityType)) {
        continue;
      }

      const similarity = this.cosineSimilarity(queryEmbedding, data.embedding);
      
      if (similarity >= options.threshold) {
        results.push({
          id,
          entityType: data.metadata.entityType,
          entityId: data.metadata.entityId,
          similarity,
          metadata: data.metadata,
          embedding: data.embedding
        });
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.limit);
  }

  /**
   * Search in database
   */
  private async searchInDatabase(
    queryEmbedding: number[],
    tenantId: string,
    options: { entityTypes?: string[]; limit: number; threshold: number }
  ): Promise<VectorSearchResult[]> {
    // For MySQL, we'll need to fetch all embeddings and compute similarity in memory
    // In production, consider using a proper vector database
    const insights = await prisma.aIInsight.findMany({
      where: {
        tenantId,
        type: 'PATTERN_RECOGNITION',
        embedding: { not: null },
        ...(options.entityTypes && {
          entityType: { in: options.entityTypes }
        })
      },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        embedding: true,
        insight: true,
        confidence: true
      }
    });

    const results: VectorSearchResult[] = [];

    for (const insight of insights) {
      if (!insight.embedding) continue;

      // Convert buffer back to number array
      const embedding = Array.from(new Float32Array(insight.embedding.buffer));
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);

      if (similarity >= options.threshold) {
        results.push({
          id: insight.id,
          entityType: insight.entityType,
          entityId: insight.entityId,
          similarity,
          metadata: insight.insight,
          embedding
        });
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.limit);
  }

  /**
   * Get entity embedding from storage
   */
  private async getEntityEmbedding(entityId: string, entityType: string, tenantId: string) {
    const id = `${entityType}_${entityId}`;

    switch (this.config.provider) {
      case 'in_memory':
        return this.inMemoryStore.get(id);
      
      default:
        const insight = await prisma.aIInsight.findFirst({
          where: {
            entityId,
            entityType,
            tenantId,
            type: 'PATTERN_RECOGNITION',
            embedding: { not: null }
          }
        });

        if (insight?.embedding) {
          return {
            embedding: Array.from(new Float32Array(insight.embedding.buffer)),
            metadata: insight.insight
          };
        }
        return null;
    }
  }

  /**
   * Vector similarity search with exclusions
   */
  private async vectorSimilaritySearch(
    embedding: number[],
    tenantId: string,
    options: { entityTypes?: string[]; limit: number; excludeEntityId?: string }
  ): Promise<VectorSearchResult[]> {
    switch (this.config.provider) {
      case 'in_memory':
        const memoryResults = await this.searchInMemory(embedding, tenantId, { 
          ...options, 
          threshold: 0.0 
        });
        return memoryResults.filter(result => result.entityId !== options.excludeEntityId);
      
      default:
        const dbResults = await this.searchInDatabase(embedding, tenantId, { 
          ...options, 
          threshold: 0.0 
        });
        return dbResults.filter(result => result.entityId !== options.excludeEntityId);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * 🧹 CLEANUP EXPIRED CACHE
   * Remove old embeddings and optimize storage
   */
  async cleanup(): Promise<void> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    await prisma.aIInsight.deleteMany({
      where: {
        type: 'PATTERN_RECOGNITION',
        createdAt: { lt: oneMonthAgo },
        confidence: { lt: 0.5 } // Remove low-confidence old embeddings
      }
    });
  }
}