import { PrismaClient } from '@prisma/client';
import { VertexAIService } from '../services/VertexAIService';
import { OpenAIService } from '../services/OpenAIService';

const prisma = new PrismaClient();

export interface TransactionFeatures {
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  date: Date;
  accountType?: string;
  merchant?: string;
  location?: string;
  recurring?: boolean;
  timePatterns?: {
    dayOfWeek: number;
    hour: number;
    isWeekend: boolean;
    isHoliday: boolean;
  };
}

export interface CategoryPrediction {
  category: string;
  subCategory?: string;
  confidence: number;
  reasoning: string[];
  alternatives: Array<{
    category: string;
    confidence: number;
  }>;
  modelUsed: string;
  processingTime: number;
}

export interface LearningFeedback {
  transactionId: string;
  correctCategory: string;
  predictedCategory: string;
  userConfidence: number;
  feedback: string;
  timestamp: Date;
}

/**
 * 🧠 ADVANCED CATEGORIZATION ENGINE
 * Machine learning-powered transaction categorization with continuous improvement
 * 
 * Features:
 * • Multi-model ensemble approach
 * • Continuous learning from user feedback
 * • Context-aware categorization
 * • Confidence scoring and uncertainty handling
 * • Pattern recognition across transaction history
 * • Vendor intelligence and merchant mapping
 */
export class AdvancedCategorizationEngine {
  private vertexAI: VertexAIService;
  private openAI: OpenAIService;
  private modelWeights: Map<string, number> = new Map();
  private categoryPatterns: Map<string, any> = new Map();
  private merchantDatabase: Map<string, any> = new Map();

  constructor() {
    this.vertexAI = new VertexAIService({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    });
    this.openAI = new OpenAIService();
    this.initializeModels();
    this.loadCategoryPatterns();
    this.loadMerchantDatabase();
  }

  /**
   * 🏷️ CATEGORIZE TRANSACTION
   * Main categorization method using ensemble approach
   */
  async categorizeTransaction(
    tenantId: string, 
    transaction: any
  ): Promise<CategoryPrediction> {
    const startTime = Date.now();
    
    console.log(`🏷️ Categorizing transaction for tenant: ${tenantId}`);

    try {
      // 1. Extract comprehensive features
      const features = await this.extractFeatures(transaction);

      // 2. Get historical context for this tenant
      const context = await this.getTenantContext(tenantId, features);

      // 3. Apply ensemble of models
      const predictions = await this.runEnsembleModels(tenantId, features, context);

      // 4. Combine predictions with weighted voting
      const finalPrediction = await this.combineEnsemblePredictions(predictions);

      // 5. Apply business rules and constraints
      const validatedPrediction = await this.applyBusinessRules(
        tenantId, 
        finalPrediction, 
        features
      );

      // 6. Calculate final confidence score
      const confidence = this.calculateConfidence(validatedPrediction, predictions, context);

      // 7. Generate human-readable reasoning
      const reasoning = this.generateReasoning(validatedPrediction, features, context);

      // 8. Get alternative suggestions
      const alternatives = this.getAlternativePredictions(predictions, 3);

      const result: CategoryPrediction = {
        category: validatedPrediction.category,
        subCategory: validatedPrediction.subCategory,
        confidence,
        reasoning,
        alternatives,
        modelUsed: 'ensemble_v2',
        processingTime: Date.now() - startTime
      };

      // 9. Store prediction for learning
      await this.storePrediction(tenantId, transaction.id, result);

      return result;

    } catch (error) {
      console.error('Advanced categorization error:', error);
      return {
        category: 'Uncategorized',
        confidence: 0,
        reasoning: ['Error in categorization process'],
        alternatives: [],
        modelUsed: 'fallback',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * 📚 LEARN FROM FEEDBACK
   * Continuous learning from user corrections
   */
  async learnFromFeedback(
    tenantId: string,
    feedback: LearningFeedback
  ): Promise<void> {
    console.log(`📚 Learning from feedback for tenant: ${tenantId}`);

    try {
      // 1. Store feedback in database
      await this.storeFeedback(tenantId, feedback);

      // 2. Update model weights based on prediction accuracy
      await this.updateModelWeights(feedback);

      // 3. Update category patterns
      await this.updateCategoryPatterns(tenantId, feedback);

      // 4. Retrain models if enough feedback accumulated
      const shouldRetrain = await this.shouldTriggerRetraining(tenantId);
      if (shouldRetrain) {
        await this.triggerModelRetraining(tenantId);
      }

      // 5. Update performance metrics
      await this.updatePerformanceMetrics(tenantId, feedback);

    } catch (error) {
      console.error('Learning from feedback error:', error);
    }
  }

  /**
   * 📊 GET CATEGORIZATION INSIGHTS
   * Analytics about categorization patterns and performance
   */
  async getCategorizationInsights(tenantId: string): Promise<any> {
    try {
      // Get categorization performance metrics
      const performance = await this.getCategorizationPerformance(tenantId);
      
      // Get category distribution
      const distribution = await this.getCategoryDistribution(tenantId);
      
      // Get trend analysis
      const trends = await this.getCategorizationTrends(tenantId);
      
      // Get learning progress
      const learningProgress = await this.getLearningProgress(tenantId);

      return {
        performance,
        distribution,
        trends,
        learningProgress,
        recommendations: await this.generateImprovementRecommendations(tenantId)
      };

    } catch (error) {
      console.error('Categorization insights error:', error);
      return { error: 'Failed to generate insights' };
    }
  }

  // Private methods

  private async extractFeatures(transaction: any): Promise<TransactionFeatures> {
    const date = new Date(transaction.date || transaction.postedAt);
    
    return {
      description: transaction.description || transaction.memo || '',
      amount: parseFloat(transaction.amount?.toString() || '0'),
      type: transaction.type || 'DEBIT',
      date,
      accountType: transaction.account?.type,
      merchant: await this.extractMerchant(transaction.description),
      location: await this.extractLocation(transaction.description),
      recurring: await this.detectRecurring(transaction),
      timePatterns: {
        dayOfWeek: date.getDay(),
        hour: date.getHours(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isHoliday: await this.isHoliday(date)
      }
    };
  }

  private async getTenantContext(tenantId: string, features: TransactionFeatures): Promise<any> {
    // Get recent categorization history
    const recentTransactions = await prisma.entry.findMany({
      where: {
        tenantId,
        aiInsights: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Get business context
    const businessContexts = await prisma.businessContext.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Analyze patterns
    const patterns = this.analyzeTransactionPatterns(recentTransactions);
    
    return {
      recentTransactions,
      businessContexts,
      patterns,
      tenantMetadata: {
        totalTransactions: recentTransactions.length,
        commonCategories: patterns.topCategories,
        averageAmount: patterns.averageAmount
      }
    };
  }

  private async runEnsembleModels(
    tenantId: string, 
    features: TransactionFeatures, 
    context: any
  ): Promise<any[]> {
    const predictions = [];

    // Model 1: Rule-based categorization
    predictions.push(await this.ruleBasedCategorization(features, context));

    // Model 2: NLP-based categorization (OpenAI)
    predictions.push(await this.nlpCategorization(features));

    // Model 3: Pattern matching
    predictions.push(await this.patternMatchingCategorization(features, context));

    // Model 4: Merchant database lookup
    predictions.push(await this.merchantCategorization(features));

    // Model 5: Tenant-specific model (if available)
    const tenantModel = await this.getTenantSpecificModel(tenantId);
    if (tenantModel) {
      predictions.push(await this.tenantModelCategorization(features, tenantModel));
    }

    return predictions.filter(p => p !== null);
  }

  private async ruleBasedCategorization(features: TransactionFeatures, context: any): Promise<any> {
    const rules = [
      {
        condition: (f: TransactionFeatures) => f.description.toLowerCase().includes('aws') || f.description.toLowerCase().includes('amazon web services'),
        category: 'Cloud Infrastructure',
        confidence: 0.95
      },
      {
        condition: (f: TransactionFeatures) => f.description.toLowerCase().includes('office') && f.amount < 1000,
        category: 'Office Supplies',
        confidence: 0.85
      },
      {
        condition: (f: TransactionFeatures) => f.description.toLowerCase().includes('salary') || f.description.toLowerCase().includes('payroll'),
        category: 'Payroll',
        confidence: 0.98
      },
      {
        condition: (f: TransactionFeatures) => f.description.toLowerCase().includes('rent') && f.amount > 500,
        category: 'Rent',
        confidence: 0.90
      },
      {
        condition: (f: TransactionFeatures) => f.recurring && f.amount > 0 && f.type === 'CREDIT',
        category: 'Recurring Revenue',
        confidence: 0.80
      }
    ];

    for (const rule of rules) {
      if (rule.condition(features)) {
        return {
          category: rule.category,
          confidence: rule.confidence,
          source: 'rule_based'
        };
      }
    }

    return null;
  }

  private async nlpCategorization(features: TransactionFeatures): Promise<any> {
    try {
      const prompt = `Categorize this financial transaction:
      Description: "${features.description}"
      Amount: $${features.amount}
      Type: ${features.type}
      
      Choose from these categories: Office Supplies, Cloud Infrastructure, Payroll, Rent, Marketing, Travel, Equipment, Software, Consulting, Utilities, Insurance, Legal, Accounting, Bank Fees, Interest, Taxes, Recurring Revenue, Sales, Other Revenue, Uncategorized
      
      Respond in JSON format: {"category": "...", "confidence": 0.0-1.0, "reasoning": "..."}`;

      const response = await this.openAI.generateCompletion(prompt, {
        maxTokens: 150,
        temperature: 0.1
      });

      const result = JSON.parse(response);
      return {
        ...result,
        source: 'nlp_openai'
      };

    } catch (error) {
      console.warn('NLP categorization failed:', error);
      return null;
    }
  }

  private async patternMatchingCategorization(features: TransactionFeatures, context: any): Promise<any> {
    // Look for similar transactions in history
    const similar = context.recentTransactions.filter((t: any) => {
      const similarity = this.calculateSimilarity(features, t);
      return similarity > 0.7;
    });

    if (similar.length > 0) {
      // Get most common category from similar transactions
      const categories = similar.map((t: any) => t.aiInsights?.category).filter(Boolean);
      const mostCommon = this.getMostFrequent(categories);
      
      if (mostCommon) {
        return {
          category: mostCommon,
          confidence: Math.min(0.9, 0.6 + (similar.length * 0.1)),
          source: 'pattern_matching'
        };
      }
    }

    return null;
  }

  private async merchantCategorization(features: TransactionFeatures): Promise<any> {
    if (features.merchant) {
      const merchantInfo = this.merchantDatabase.get(features.merchant.toLowerCase());
      if (merchantInfo) {
        return {
          category: merchantInfo.category,
          confidence: merchantInfo.confidence || 0.8,
          source: 'merchant_database'
        };
      }
    }

    return null;
  }

  private combineEnsemblePredictions(predictions: any[]): any {
    if (predictions.length === 0) {
      return { category: 'Uncategorized', confidence: 0 };
    }

    // Weighted voting based on model performance
    const categoryVotes: Map<string, number> = new Map();
    
    predictions.forEach(pred => {
      const weight = this.modelWeights.get(pred.source) || 1.0;
      const weightedScore = pred.confidence * weight;
      
      categoryVotes.set(
        pred.category, 
        (categoryVotes.get(pred.category) || 0) + weightedScore
      );
    });

    // Find category with highest weighted score
    let topCategory = 'Uncategorized';
    let topScore = 0;

    for (const [category, score] of categoryVotes) {
      if (score > topScore) {
        topCategory = category;
        topScore = score;
      }
    }

    return {
      category: topCategory,
      confidence: Math.min(topScore / predictions.length, 1.0)
    };
  }

  private calculateConfidence(prediction: any, allPredictions: any[], context: any): number {
    let confidence = prediction.confidence || 0.5;
    
    // Boost confidence if multiple models agree
    const agreementCount = allPredictions.filter(p => p.category === prediction.category).length;
    confidence += (agreementCount - 1) * 0.1;
    
    // Boost confidence based on historical accuracy for this category
    const categoryAccuracy = this.categoryPatterns.get(prediction.category)?.accuracy || 0.5;
    confidence = (confidence + categoryAccuracy) / 2;
    
    // Reduce confidence for rare/new categories
    const categoryFrequency = context.patterns?.categoryFrequency?.[prediction.category] || 0;
    if (categoryFrequency < 5) {
      confidence *= 0.8;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  private generateReasoning(prediction: any, features: TransactionFeatures, context: any): string[] {
    const reasoning = [];
    
    if (features.merchant) {
      reasoning.push(`Merchant identified: ${features.merchant}`);
    }
    
    if (features.recurring) {
      reasoning.push('Detected as recurring transaction');
    }
    
    if (features.amount > 1000) {
      reasoning.push('Large amount suggests significant expense');
    }
    
    const similarCount = context.recentTransactions?.filter((t: any) => 
      t.aiInsights?.category === prediction.category
    ).length || 0;
    
    if (similarCount > 0) {
      reasoning.push(`${similarCount} similar transactions categorized as ${prediction.category}`);
    }
    
    return reasoning.length > 0 ? reasoning : ['Automated categorization based on transaction details'];
  }

  // Helper methods
  private async extractMerchant(description: string): Promise<string | undefined> {
    // Extract merchant name from description using regex patterns
    const patterns = [
      /^([A-Z\s]+\*?[A-Z\s]*)/,  // All caps merchant names
      /^([\w\s]+) \d+/,          // Merchant name followed by numbers
      /^([^0-9]*)/               // Everything before first number
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1] && match[1].trim().length > 2) {
        return match[1].trim();
      }
    }
    
    return undefined;
  }

  private calculateSimilarity(features: TransactionFeatures, historical: any): number {
    let similarity = 0;
    
    // Description similarity
    const desc1 = features.description.toLowerCase();
    const desc2 = (historical.memo || '').toLowerCase();
    const commonWords = desc1.split(' ').filter(word => desc2.includes(word)).length;
    similarity += commonWords / Math.max(desc1.split(' ').length, desc2.split(' ').length) * 0.4;
    
    // Amount similarity
    const amount1 = features.amount;
    const amount2 = parseFloat(historical.amount?.toString() || '0');
    const amountDiff = Math.abs(amount1 - amount2) / Math.max(amount1, amount2);
    similarity += (1 - amountDiff) * 0.3;
    
    // Type similarity
    if (features.type === historical.type) {
      similarity += 0.3;
    }
    
    return Math.min(1, similarity);
  }

  private getMostFrequent<T>(array: T[]): T | null {
    if (array.length === 0) return null;
    
    const frequency: Map<T, number> = new Map();
    array.forEach(item => {
      frequency.set(item, (frequency.get(item) || 0) + 1);
    });
    
    let maxCount = 0;
    let mostFrequent: T | null = null;
    
    for (const [item, count] of frequency) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = item;
      }
    }
    
    return mostFrequent;
  }

  private analyzeTransactionPatterns(transactions: any[]): any {
    const categories = transactions.map(t => t.aiInsights?.category).filter(Boolean);
    const amounts = transactions.map(t => parseFloat(t.amount?.toString() || '0'));
    
    return {
      topCategories: this.getTopCategories(categories, 5),
      averageAmount: amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length,
      categoryFrequency: this.getCategoryFrequency(categories)
    };
  }

  private getTopCategories(categories: string[], limit: number): string[] {
    const frequency: Map<string, number> = new Map();
    categories.forEach(cat => {
      frequency.set(cat, (frequency.get(cat) || 0) + 1);
    });
    
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([category]) => category);
  }

  private getCategoryFrequency(categories: string[]): Record<string, number> {
    const frequency: Record<string, number> = {};
    categories.forEach(cat => {
      frequency[cat] = (frequency[cat] || 0) + 1;
    });
    return frequency;
  }

  private getAlternativePredictions(predictions: any[], limit: number): Array<{category: string; confidence: number}> {
    return predictions
      .map(p => ({ category: p.category, confidence: p.confidence }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(1, limit + 1); // Skip the top prediction, get alternatives
  }

  // Initialization methods
  private initializeModels(): void {
    // Initialize model weights based on historical performance
    this.modelWeights.set('rule_based', 1.2);
    this.modelWeights.set('nlp_openai', 1.0);
    this.modelWeights.set('pattern_matching', 1.1);
    this.modelWeights.set('merchant_database', 1.3);
    this.modelWeights.set('tenant_model', 1.5);
  }

  private loadCategoryPatterns(): void {
    // Load category patterns from configuration or database
    // This would be populated from actual usage data
  }

  private loadMerchantDatabase(): void {
    // Load merchant categorization database
    this.merchantDatabase.set('amazon', { category: 'Office Supplies', confidence: 0.8 });
    this.merchantDatabase.set('aws', { category: 'Cloud Infrastructure', confidence: 0.95 });
    this.merchantDatabase.set('microsoft', { category: 'Software', confidence: 0.9 });
    this.merchantDatabase.set('google', { category: 'Advertising', confidence: 0.85 });
    // ... more merchant mappings
  }

  // Placeholder methods for advanced features
  private async applyBusinessRules(tenantId: string, prediction: any, features: TransactionFeatures): Promise<any> { return prediction; }
  private async storePrediction(tenantId: string, transactionId: string, prediction: CategoryPrediction): Promise<void> {}
  private async storeFeedback(tenantId: string, feedback: LearningFeedback): Promise<void> {}
  private async updateModelWeights(feedback: LearningFeedback): Promise<void> {}
  private async updateCategoryPatterns(tenantId: string, feedback: LearningFeedback): Promise<void> {}
  private async shouldTriggerRetraining(tenantId: string): Promise<boolean> { return false; }
  private async triggerModelRetraining(tenantId: string): Promise<void> {}
  private async updatePerformanceMetrics(tenantId: string, feedback: LearningFeedback): Promise<void> {}
  private async getCategorizationPerformance(tenantId: string): Promise<any> { return {}; }
  private async getCategoryDistribution(tenantId: string): Promise<any> { return {}; }
  private async getCategorizationTrends(tenantId: string): Promise<any> { return {}; }
  private async getLearningProgress(tenantId: string): Promise<any> { return {}; }
  private async generateImprovementRecommendations(tenantId: string): Promise<any[]> { return []; }
  private async extractLocation(description: string): Promise<string | undefined> { return undefined; }
  private async detectRecurring(transaction: any): Promise<boolean> { return false; }
  private async isHoliday(date: Date): Promise<boolean> { return false; }
  private async getTenantSpecificModel(tenantId: string): Promise<any> { return null; }
  private async tenantModelCategorization(features: TransactionFeatures, model: any): Promise<any> { return null; }
}