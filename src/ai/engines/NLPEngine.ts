/**
 * 📝 NATURAL LANGUAGE PROCESSING ENGINE
 * 
 * Advanced NLP capabilities for accounting including:
 * - Text classification and categorization
 * - Named entity recognition (NER)
 * - Sentiment analysis
 * - Intent detection
 * - Text summarization
 * - Query understanding
 */

export interface NLPResult {
  originalText: string;
  processedText: string;
  confidence: number;
  metadata: Record<string, any>;
}

export interface ClassificationResult extends NLPResult {
  category: string;
  subcategory?: string;
  probability: Record<string, number>;
}

export interface EntityExtractionResult extends NLPResult {
  entities: Entity[];
}

export interface Entity {
  text: string;
  type: EntityType;
  startIndex: number;
  endIndex: number;
  confidence: number;
  normalizedValue?: string;
}

export type EntityType = 
  | 'AMOUNT'
  | 'DATE'
  | 'VENDOR'
  | 'ACCOUNT'
  | 'CATEGORY'
  | 'INVOICE_NUMBER'
  | 'TAX_ID'
  | 'BANK_ACCOUNT'
  | 'PERSON'
  | 'ORGANIZATION'
  | 'LOCATION'
  | 'PRODUCT';

export interface SentimentResult extends NLPResult {
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number; // -1 to 1
  aspects: AspectSentiment[];
}

export interface AspectSentiment {
  aspect: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number;
}

export interface IntentResult extends NLPResult {
  intent: AccountingIntent;
  parameters: Record<string, any>;
  requiredParameters: string[];
  missingParameters: string[];
}

export type AccountingIntent = 
  | 'CREATE_TRANSACTION'
  | 'CATEGORIZE_EXPENSE'
  | 'GENERATE_REPORT'
  | 'RECONCILE_ACCOUNT'
  | 'SEARCH_TRANSACTIONS'
  | 'UPDATE_VENDOR'
  | 'PROCESS_INVOICE'
  | 'CALCULATE_TAX'
  | 'GET_BALANCE'
  | 'EXPORT_DATA';

export interface SummaryResult extends NLPResult {
  summary: string;
  keyPoints: string[];
  wordCount: number;
  compressionRatio: number;
}

export interface QueryUnderstandingResult extends NLPResult {
  queryType: QueryType;
  filters: Record<string, any>;
  sortBy?: string;
  groupBy?: string;
  dateRange?: { start: Date; end: Date };
  aggregations?: string[];
}

export type QueryType = 
  | 'TRANSACTION_SEARCH'
  | 'FINANCIAL_REPORT'
  | 'BALANCE_INQUIRY'
  | 'VENDOR_ANALYSIS'
  | 'TAX_CALCULATION'
  | 'RECONCILIATION'
  | 'TREND_ANALYSIS';

export class NLPEngine {
  private tenantId: string;
  private accountingTerms: Map<string, string[]> = new Map();
  private categoryKeywords: Map<string, string[]> = new Map();

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.initializeAccountingTerms();
    this.initializeCategoryKeywords();
  }

  /**
   * 🏷️ TEXT CLASSIFICATION
   */

  /**
   * Classify transaction description into categories
   */
  async classifyTransaction(description: string): Promise<ClassificationResult> {
    const processedText = this.preprocessText(description);
    const tokens = this.tokenize(processedText);
    
    // Extract features for classification
    const features = this.extractTextFeatures(tokens, description);
    
    // Perform classification using keyword matching and ML
    const classification = await this.performClassification(features, tokens);
    
    return {
      originalText: description,
      processedText,
      confidence: classification.confidence,
      category: classification.category,
      subcategory: classification.subcategory,
      probability: classification.probability,
      metadata: {
        tokens: tokens.length,
        features: Object.keys(features).length,
        method: 'hybrid_classification'
      }
    };
  }

  /**
   * Classify expense based on description and context
   */
  async classifyExpense(description: string, amount?: number, vendor?: string): Promise<ClassificationResult> {
    // Enhanced classification with additional context
    const baseClassification = await this.classifyTransaction(description);
    
    // Refine classification with amount and vendor context
    if (amount) {
      baseClassification.category = this.refineByAmount(baseClassification.category, amount);
    }
    
    if (vendor) {
      const vendorCategory = await this.classifyByVendor(vendor);
      if (vendorCategory.confidence > baseClassification.confidence) {
        baseClassification.category = vendorCategory.category;
        baseClassification.confidence = vendorCategory.confidence;
      }
    }
    
    return baseClassification;
  }

  /**
   * 🎯 NAMED ENTITY RECOGNITION
   */

  /**
   * Extract accounting entities from text
   */
  async extractEntities(text: string): Promise<EntityExtractionResult> {
    const processedText = this.preprocessText(text);
    const entities: Entity[] = [];
    
    // Extract different types of entities
    entities.push(...await this.extractAmounts(text));
    entities.push(...await this.extractDates(text));
    entities.push(...await this.extractVendors(text));
    entities.push(...await this.extractInvoiceNumbers(text));
    entities.push(...await this.extractAccountNumbers(text));
    
    // Sort entities by position
    entities.sort((a, b) => a.startIndex - b.startIndex);
    
    return {
      originalText: text,
      processedText,
      confidence: this.calculateOverallConfidence(entities),
      entities,
      metadata: {
        entityCount: entities.length,
        entityTypes: [...new Set(entities.map(e => e.type))]
      }
    };
  }

  /**
   * 💭 SENTIMENT ANALYSIS
   */

  /**
   * Analyze sentiment of accounting-related text
   */
  async analyzeSentiment(text: string): Promise<SentimentResult> {
    const processedText = this.preprocessText(text);
    const tokens = this.tokenize(processedText);
    
    // Calculate sentiment score
    const sentimentScore = this.calculateSentimentScore(tokens);
    const sentiment = this.scoresToSentiment(sentimentScore);
    
    // Analyze aspect-based sentiment
    const aspects = await this.extractAspectSentiments(text, tokens);
    
    return {
      originalText: text,
      processedText,
      confidence: Math.abs(sentimentScore),
      sentiment,
      score: sentimentScore,
      aspects,
      metadata: {
        tokens: tokens.length,
        aspectCount: aspects.length
      }
    };
  }

  /**
   * 🎯 INTENT DETECTION
   */

  /**
   * Detect user intent from natural language query
   */
  async detectIntent(query: string): Promise<IntentResult> {
    const processedText = this.preprocessText(query);
    const tokens = this.tokenize(processedText);
    
    // Extract intent using pattern matching and ML
    const intentClassification = await this.classifyIntent(tokens, query);
    
    // Extract parameters for the detected intent
    const parameters = await this.extractIntentParameters(intentClassification.intent, query);
    
    // Determine required vs missing parameters
    const requiredParams = this.getRequiredParameters(intentClassification.intent);
    const missingParams = requiredParams.filter(param => !(param in parameters));
    
    return {
      originalText: query,
      processedText,
      confidence: intentClassification.confidence,
      intent: intentClassification.intent,
      parameters,
      requiredParameters: requiredParams,
      missingParameters: missingParams,
      metadata: {
        tokens: tokens.length,
        parameterCount: Object.keys(parameters).length
      }
    };
  }

  /**
   * 📋 TEXT SUMMARIZATION
   */

  /**
   * Summarize financial documents or long text
   */
  async summarizeText(text: string, maxLength: number = 150): Promise<SummaryResult> {
    const processedText = this.preprocessText(text);
    const sentences = this.splitIntoSentences(text);
    
    // Score sentences by importance
    const sentenceScores = await this.scoreSentences(sentences, processedText);
    
    // Select top sentences for summary
    const topSentences = this.selectTopSentences(sentences, sentenceScores, maxLength);
    
    // Extract key points
    const keyPoints = await this.extractKeyPoints(text);
    
    const summary = topSentences.join(' ');
    
    return {
      originalText: text,
      processedText,
      confidence: 0.85, // Mock confidence
      summary,
      keyPoints,
      wordCount: summary.split(' ').length,
      compressionRatio: summary.length / text.length,
      metadata: {
        originalSentences: sentences.length,
        summarySentences: topSentences.length,
        originalWords: text.split(' ').length
      }
    };
  }

  /**
   * 🔍 QUERY UNDERSTANDING
   */

  /**
   * Understand natural language queries about financial data
   */
  async understandQuery(query: string): Promise<QueryUnderstandingResult> {
    const processedText = this.preprocessText(query);
    const entities = await this.extractEntities(query);
    
    // Determine query type
    const queryType = this.determineQueryType(query, entities.entities);
    
    // Extract filters from query
    const filters = await this.extractQueryFilters(query, entities.entities);
    
    // Extract sorting and grouping preferences
    const sortBy = this.extractSortPreference(query);
    const groupBy = this.extractGroupPreference(query);
    
    // Extract date range
    const dateRange = this.extractDateRange(entities.entities);
    
    // Extract aggregation requirements
    const aggregations = this.extractAggregations(query);
    
    return {
      originalText: query,
      processedText,
      confidence: 0.8, // Mock confidence
      queryType,
      filters,
      sortBy,
      groupBy,
      dateRange,
      aggregations,
      metadata: {
        entityCount: entities.entities.length,
        filterCount: Object.keys(filters).length
      }
    };
  }

  /**
   * 🔧 PRIVATE METHODS
   */

  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s.-]/g, ' ') // Remove special characters except periods and hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private tokenize(text: string): string[] {
    return text.split(/\s+/).filter(token => token.length > 0);
  }

  private extractTextFeatures(tokens: string[], originalText: string): Record<string, any> {
    return {
      tokenCount: tokens.length,
      avgTokenLength: tokens.reduce((sum, token) => sum + token.length, 0) / tokens.length,
      hasNumbers: /\d/.test(originalText),
      hasAmount: /\$|\d+\.\d{2}/.test(originalText),
      hasDate: /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/.test(originalText),
      uniqueTokens: new Set(tokens).size,
      containsAccountingTerms: tokens.some(token => this.isAccountingTerm(token))
    };
  }

  private async performClassification(features: Record<string, any>, tokens: string[]): Promise<{
    category: string;
    subcategory?: string;
    confidence: number;
    probability: Record<string, number>;
  }> {
    // Keyword-based classification
    const keywordScores = this.calculateKeywordScores(tokens);
    
    // Find best matching category
    const sortedCategories = Object.entries(keywordScores)
      .sort(([,a], [,b]) => b - a);
    
    const [topCategory, topScore] = sortedCategories[0] || ['Other', 0];
    
    // Create probability distribution
    const totalScore = Object.values(keywordScores).reduce((sum, score) => sum + score, 0.01);
    const probability = Object.entries(keywordScores).reduce((acc, [cat, score]) => {
      acc[cat] = score / totalScore;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      category: topCategory,
      confidence: Math.min(topScore, 0.95),
      probability
    };
  }

  private calculateKeywordScores(tokens: string[]): Record<string, number> {
    const scores: Record<string, number> = {};
    
    // Initialize scores for all categories
    for (const [category] of this.categoryKeywords) {
      scores[category] = 0;
    }
    
    // Score based on keyword matches
    for (const token of tokens) {
      for (const [category, keywords] of this.categoryKeywords) {
        if (keywords.includes(token)) {
          scores[category] += 1;
        }
      }
    }
    
    return scores;
  }

  private async extractAmounts(text: string): Promise<Entity[]> {
    const amountRegex = /\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g;
    const entities: Entity[] = [];
    let match;
    
    while ((match = amountRegex.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'AMOUNT',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.9,
        normalizedValue: match[0].replace(/[$,]/g, '')
      });
    }
    
    return entities;
  }

  private async extractDates(text: string): Promise<Entity[]> {
    const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi;
    const entities: Entity[] = [];
    let match;
    
    while ((match = dateRegex.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'DATE',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.85
      });
    }
    
    return entities;
  }

  private async extractVendors(text: string): Promise<Entity[]> {
    // This would use a more sophisticated approach in practice
    const commonVendors = ['amazon', 'walmart', 'target', 'starbucks', 'uber', 'lyft'];
    const entities: Entity[] = [];
    
    for (const vendor of commonVendors) {
      const regex = new RegExp(`\\b${vendor}\\b`, 'gi');
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'VENDOR',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: 0.8
        });
      }
    }
    
    return entities;
  }

  private async extractInvoiceNumbers(text: string): Promise<Entity[]> {
    const invoiceRegex = /\b(?:inv|invoice|bill)[-\s#]*(\d+|\w+-\d+)\b/gi;
    const entities: Entity[] = [];
    let match;
    
    while ((match = invoiceRegex.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'INVOICE_NUMBER',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.75
      });
    }
    
    return entities;
  }

  private async extractAccountNumbers(text: string): Promise<Entity[]> {
    const accountRegex = /\b\d{4}-?\d{4}-?\d{4}-?\d{4}\b|\b\d{8,12}\b/g;
    const entities: Entity[] = [];
    let match;
    
    while ((match = accountRegex.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'ACCOUNT',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.6
      });
    }
    
    return entities;
  }

  private calculateOverallConfidence(entities: Entity[]): number {
    if (entities.length === 0) return 0;
    return entities.reduce((sum, entity) => sum + entity.confidence, 0) / entities.length;
  }

  private initializeAccountingTerms(): void {
    this.accountingTerms.set('general', [
      'invoice', 'bill', 'payment', 'expense', 'revenue', 'account', 'transaction',
      'debit', 'credit', 'balance', 'ledger', 'journal', 'reconcile', 'tax'
    ]);
  }

  private initializeCategoryKeywords(): void {
    this.categoryKeywords.set('Office Supplies', [
      'paper', 'pen', 'printer', 'ink', 'stapler', 'office', 'supplies', 'desk'
    ]);
    
    this.categoryKeywords.set('Travel', [
      'hotel', 'flight', 'taxi', 'uber', 'lyft', 'gas', 'mileage', 'travel', 'trip'
    ]);
    
    this.categoryKeywords.set('Meals', [
      'restaurant', 'food', 'lunch', 'dinner', 'coffee', 'starbucks', 'meal'
    ]);
    
    this.categoryKeywords.set('Software', [
      'software', 'subscription', 'saas', 'license', 'app', 'digital', 'cloud'
    ]);
    
    this.categoryKeywords.set('Marketing', [
      'advertising', 'marketing', 'promotion', 'ads', 'campaign', 'social', 'media'
    ]);
  }

  private isAccountingTerm(token: string): boolean {
    for (const [, terms] of this.accountingTerms) {
      if (terms.includes(token)) return true;
    }
    return false;
  }

  private refineByAmount(category: string, amount: number): string {
    // Example refinement logic
    if (amount > 5000 && category === 'Other') {
      return 'Equipment';
    }
    return category;
  }

  private async classifyByVendor(vendor: string): Promise<{ category: string; confidence: number }> {
    const vendorCategories: Record<string, string> = {
      'amazon': 'Office Supplies',
      'starbucks': 'Meals',
      'uber': 'Travel',
      'microsoft': 'Software'
    };
    
    const category = vendorCategories[vendor.toLowerCase()] || 'Other';
    const confidence = category !== 'Other' ? 0.9 : 0.3;
    
    return { category, confidence };
  }

  // Additional private methods would be implemented here...
  private calculateSentimentScore(tokens: string[]): number {
    // Mock sentiment calculation
    return Math.random() * 2 - 1;
  }

  private scoresToSentiment(score: number): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
    if (score > 0.1) return 'POSITIVE';
    if (score < -0.1) return 'NEGATIVE';
    return 'NEUTRAL';
  }

  private async extractAspectSentiments(text: string, tokens: string[]): Promise<AspectSentiment[]> {
    // Mock aspect sentiment extraction
    return [];
  }

  private async classifyIntent(tokens: string[], query: string): Promise<{ intent: AccountingIntent; confidence: number }> {
    // Mock intent classification
    return { intent: 'SEARCH_TRANSACTIONS', confidence: 0.8 };
  }

  private async extractIntentParameters(intent: AccountingIntent, query: string): Promise<Record<string, any>> {
    // Mock parameter extraction
    return {};
  }

  private getRequiredParameters(intent: AccountingIntent): string[] {
    const requirements: Record<AccountingIntent, string[]> = {
      'CREATE_TRANSACTION': ['amount', 'description'],
      'CATEGORIZE_EXPENSE': ['description'],
      'GENERATE_REPORT': ['reportType'],
      'RECONCILE_ACCOUNT': ['accountId'],
      'SEARCH_TRANSACTIONS': [],
      'UPDATE_VENDOR': ['vendorId'],
      'PROCESS_INVOICE': ['invoiceData'],
      'CALCULATE_TAX': ['amount'],
      'GET_BALANCE': ['accountId'],
      'EXPORT_DATA': ['format']
    };
    
    return requirements[intent] || [];
  }

  private splitIntoSentences(text: string): string[] {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  }

  private async scoreSentences(sentences: string[], processedText: string): Promise<number[]> {
    // Mock sentence scoring
    return sentences.map(() => Math.random());
  }

  private selectTopSentences(sentences: string[], scores: number[], maxLength: number): string[] {
    // Mock sentence selection
    return sentences.slice(0, 2);
  }

  private async extractKeyPoints(text: string): Promise<string[]> {
    // Mock key point extraction
    return ['Key point 1', 'Key point 2'];
  }

  private determineQueryType(query: string, entities: Entity[]): QueryType {
    // Mock query type determination
    return 'TRANSACTION_SEARCH';
  }

  private async extractQueryFilters(query: string, entities: Entity[]): Promise<Record<string, any>> {
    // Mock filter extraction
    return {};
  }

  private extractSortPreference(query: string): string | undefined {
    // Mock sort preference extraction
    return undefined;
  }

  private extractGroupPreference(query: string): string | undefined {
    // Mock group preference extraction
    return undefined;
  }

  private extractDateRange(entities: Entity[]): { start: Date; end: Date } | undefined {
    // Mock date range extraction
    return undefined;
  }

  private extractAggregations(query: string): string[] {
    // Mock aggregation extraction
    return [];
  }
} 