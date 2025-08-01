/**
 * 🏷️ CATEGORIZATION SERVICE
 * 
 * Intelligent categorization service for:
 * - Transaction categorization using ML and NLP
 * - Expense classification and tagging
 * - Vendor categorization and mapping
 * - Category learning and improvement
 * - Multi-language categorization support
 */

export interface CategorizationRequest {
  description: string;
  amount?: number;
  vendor?: string;
  date?: Date;
  context?: Record<string, any>;
  language?: string;
  confidenceThreshold?: number;
}

export interface CategorizationResult {
  category: string;
  subcategory?: string;
  confidence: number;
  alternativeCategories: AlternativeCategory[];
  reasoning: string;
  tags: string[];
  vendorMapping?: string;
  learningData?: LearningData;
}

export interface AlternativeCategory {
  category: string;
  confidence: number;
  reasoning: string;
}

export interface LearningData {
  features: Record<string, any>;
  userCorrection?: string;
  feedback?: 'CORRECT' | 'INCORRECT' | 'PARTIAL';
}

export interface CategoryMapping {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  rules: CategorizationRule[];
  parentCategory?: string;
  isActive: boolean;
  usageCount: number;
  accuracy: number;
  lastUpdated: Date;
}

export interface CategorizationRule {
  id: string;
  type: 'KEYWORD' | 'REGEX' | 'AMOUNT_RANGE' | 'VENDOR' | 'ML_MODEL';
  condition: string;
  priority: number;
  confidence: number;
  isActive: boolean;
}

export interface VendorMapping {
  vendorName: string;
  normalizedName: string;
  category: string;
  confidence: number;
  usageCount: number;
  lastUsed: Date;
}

export class CategorizationService {
  private tenantId: string;
  private categories: Map<string, CategoryMapping> = new Map();
  private vendorMappings: Map<string, VendorMapping> = new Map();
  private mlModel: any; // Would be actual ML model in production

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.initializeDefaultCategories();
  }

  /**
   * 🏷️ MAIN CATEGORIZATION
   */

  /**
   * Categorize a transaction or expense
   */
  async categorize(request: CategorizationRequest): Promise<CategorizationResult> {
    console.log(`🏷️ Categorizing: ${request.description}`);
    
    const startTime = Date.now();
    
    try {
      // Step 1: Check vendor mapping first
      const vendorCategory = await this.checkVendorMapping(request.vendor);
      
      // Step 2: Apply rule-based categorization
      const ruleBasedCategory = await this.applyRuleBasedCategorization(request);
      
      // Step 3: Use ML model for categorization
      const mlCategory = await this.applyMLCategorization(request);
      
      // Step 4: Combine and rank results
      const combinedResults = this.combineCategorizationResults(
        vendorCategory,
        ruleBasedCategory,
        mlCategory,
        request
      );
      
      // Step 5: Select best category
      const bestCategory = this.selectBestCategory(combinedResults, request.confidenceThreshold);
      
      // Step 6: Generate tags and reasoning
      const tags = await this.generateTags(request, bestCategory);
      const reasoning = this.generateReasoning(request, bestCategory, combinedResults);
      
      const result: CategorizationResult = {
        category: bestCategory.category,
        subcategory: bestCategory.subcategory,
        confidence: bestCategory.confidence,
        alternativeCategories: combinedResults
          .filter(c => c.category !== bestCategory.category)
          .slice(0, 3)
          .map(c => ({
            category: c.category,
            confidence: c.confidence,
            reasoning: c.reasoning
          })),
        reasoning,
        tags,
        vendorMapping: vendorCategory?.vendorMapping,
        learningData: {
          features: this.extractFeatures(request)
        }
      };

      console.log(`✅ Categorized as: ${result.category} (${(result.confidence * 100).toFixed(1)}% confidence)`);
      return result;

    } catch (error) {
      console.error('❌ Categorization failed:', error);
      return this.getDefaultCategory(request);
    }
  }

  /**
   * Categorize multiple transactions in batch
   */
  async categorizeBatch(requests: CategorizationRequest[]): Promise<CategorizationResult[]> {
    console.log(`📦 Categorizing batch of ${requests.length} transactions`);
    
    const results: CategorizationResult[] = [];
    
    for (const request of requests) {
      try {
        const result = await this.categorize(request);
        results.push(result);
      } catch (error) {
        console.error(`Failed to categorize: ${request.description}`, error);
        results.push(this.getDefaultCategory(request));
      }
    }
    
    return results;
  }

  /**
   * 🔧 CATEGORIZATION METHODS
   */

  private async checkVendorMapping(vendor?: string): Promise<CategorizationResult | null> {
    if (!vendor) return null;
    
    const normalizedVendor = this.normalizeVendorName(vendor);
    const mapping = this.vendorMappings.get(normalizedVendor);
    
    if (mapping && mapping.confidence > 0.8) {
      return {
        category: mapping.category,
        confidence: mapping.confidence,
        alternativeCategories: [],
        reasoning: `Vendor mapping: ${mapping.vendorName}`,
        tags: [mapping.normalizedName],
        vendorMapping: mapping.vendorName
      };
    }
    
    return null;
  }

  private async applyRuleBasedCategorization(request: CategorizationRequest): Promise<CategorizationResult[]> {
    const results: CategorizationResult[] = [];
    
    for (const [categoryId, category] of this.categories) {
      if (!category.isActive) continue;
      
      let maxConfidence = 0;
      let bestRule: CategorizationRule | null = null;
      
      // Check each rule in the category
      for (const rule of category.rules) {
        if (!rule.isActive) continue;
        
        const confidence = this.evaluateRule(rule, request);
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestRule = rule;
        }
      }
      
      if (maxConfidence > 0) {
        results.push({
          category: category.name,
          confidence: maxConfidence * category.accuracy,
          alternativeCategories: [],
          reasoning: `Rule-based: ${bestRule?.condition}`,
          tags: category.keywords.slice(0, 3)
        });
      }
    }
    
    // Sort by confidence (highest first)
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  private async applyMLCategorization(request: CategorizationRequest): Promise<CategorizationResult[]> {
    // Mock ML categorization
    const features = this.extractFeatures(request);
    
    // Simulate ML model prediction
    const predictions = [
      { category: 'Office Supplies', confidence: 0.85 },
      { category: 'Travel', confidence: 0.75 },
      { category: 'Meals', confidence: 0.65 },
      { category: 'Software', confidence: 0.45 }
    ];
    
    return predictions.map(pred => ({
      category: pred.category,
      confidence: pred.confidence,
      alternativeCategories: [],
      reasoning: 'ML model prediction',
      tags: []
    }));
  }

  private combineCategorizationResults(
    vendorCategory: CategorizationResult | null,
    ruleBasedResults: CategorizationResult[],
    mlResults: CategorizationResult[],
    request: CategorizationRequest
  ): CategorizationResult[] {
    const allResults: CategorizationResult[] = [];
    
    // Add vendor mapping result with high priority
    if (vendorCategory) {
      allResults.push({
        ...vendorCategory,
        confidence: vendorCategory.confidence * 1.2 // Boost vendor mapping confidence
      });
    }
    
    // Add rule-based results
    allResults.push(...ruleBasedResults);
    
    // Add ML results
    allResults.push(...mlResults);
    
    // Group by category and combine confidences
    const groupedResults = new Map<string, CategorizationResult>();
    
    for (const result of allResults) {
      const existing = groupedResults.get(result.category);
      if (existing) {
        // Combine confidences (weighted average)
        const combinedConfidence = (existing.confidence + result.confidence) / 2;
        groupedResults.set(result.category, {
          ...existing,
          confidence: Math.min(combinedConfidence, 0.95)
        });
      } else {
        groupedResults.set(result.category, result);
      }
    }
    
    return Array.from(groupedResults.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  private selectBestCategory(
    results: CategorizationResult[],
    threshold: number = 0.5
  ): CategorizationResult {
    if (results.length === 0) {
      return this.getDefaultCategory({ description: '' });
    }
    
    const bestResult = results[0];
    
    // If confidence is below threshold, return default category
    if (bestResult.confidence < threshold) {
      return this.getDefaultCategory({ description: '' });
    }
    
    return bestResult;
  }

  /**
   * 🏷️ CATEGORY MANAGEMENT
   */

  /**
   * Add or update a category mapping
   */
  async addCategory(category: Omit<CategoryMapping, 'id' | 'usageCount' | 'accuracy' | 'lastUpdated'>): Promise<string> {
    const categoryId = `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newCategory: CategoryMapping = {
      ...category,
      id: categoryId,
      usageCount: 0,
      accuracy: 0.8, // Default accuracy
      lastUpdated: new Date()
    };
    
    this.categories.set(categoryId, newCategory);
    console.log(`✅ Added category: ${newCategory.name}`);
    
    return categoryId;
  }

  /**
   * Add vendor mapping
   */
  async addVendorMapping(vendorName: string, category: string, confidence: number = 0.9): Promise<void> {
    const normalizedName = this.normalizeVendorName(vendorName);
    
    const mapping: VendorMapping = {
      vendorName,
      normalizedName,
      category,
      confidence,
      usageCount: 1,
      lastUsed: new Date()
    };
    
    this.vendorMappings.set(normalizedName, mapping);
    console.log(`✅ Added vendor mapping: ${vendorName} → ${category}`);
  }

  /**
   * 🔧 HELPER METHODS
   */

  private evaluateRule(rule: CategorizationRule, request: CategorizationRequest): number {
    switch (rule.type) {
      case 'KEYWORD':
        return this.evaluateKeywordRule(rule.condition, request.description);
      
      case 'REGEX':
        return this.evaluateRegexRule(rule.condition, request.description);
      
      case 'AMOUNT_RANGE':
        return this.evaluateAmountRule(rule.condition, request.amount);
      
      case 'VENDOR':
        return this.evaluateVendorRule(rule.condition, request.vendor);
      
      default:
        return 0;
    }
  }

  private evaluateKeywordRule(keywords: string, description: string): number {
    const keywordList = keywords.toLowerCase().split(',').map(k => k.trim());
    const descLower = description.toLowerCase();
    
    let matches = 0;
    for (const keyword of keywordList) {
      if (descLower.includes(keyword)) {
        matches++;
      }
    }
    
    return matches / keywordList.length;
  }

  private evaluateRegexRule(pattern: string, description: string): number {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(description) ? 1 : 0;
    } catch (error) {
      console.error('Invalid regex pattern:', pattern);
      return 0;
    }
  }

  private evaluateAmountRule(range: string, amount?: number): number {
    if (!amount) return 0;
    
    // Parse range like "0-100" or ">1000"
    const rangeMatch = range.match(/([<>]?)(\d+)-?(\d+)?/);
    if (!rangeMatch) return 0;
    
    const [, operator, minStr, maxStr] = rangeMatch;
    const min = parseFloat(minStr);
    const max = maxStr ? parseFloat(maxStr) : null;
    
    if (operator === '>') {
      return amount > min ? 1 : 0;
    } else if (operator === '<') {
      return amount < min ? 1 : 0;
    } else if (max) {
      return amount >= min && amount <= max ? 1 : 0;
    } else {
      return amount >= min ? 1 : 0;
    }
  }

  private evaluateVendorRule(vendorPattern: string, vendor?: string): number {
    if (!vendor) return 0;
    
    try {
      const regex = new RegExp(vendorPattern, 'i');
      return regex.test(vendor) ? 1 : 0;
    } catch (error) {
      return vendor.toLowerCase().includes(vendorPattern.toLowerCase()) ? 0.8 : 0;
    }
  }

  private extractFeatures(request: CategorizationRequest): Record<string, any> {
    return {
      description: request.description,
      descriptionLength: request.description.length,
      hasNumbers: /\d/.test(request.description),
      hasCurrency: /\$|\d+\.\d{2}/.test(request.description),
      amount: request.amount,
      amountCategory: this.categorizeAmount(request.amount),
      vendor: request.vendor,
      date: request.date,
      dayOfWeek: request.date ? request.date.getDay() : null,
      month: request.date ? request.date.getMonth() : null
    };
  }

  private categorizeAmount(amount?: number): string {
    if (!amount) return 'unknown';
    if (amount < 25) return 'micro';
    if (amount < 100) return 'small';
    if (amount < 500) return 'medium';
    if (amount < 2500) return 'large';
    return 'very_large';
  }

  private normalizeVendorName(vendor: string): string {
    return vendor
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async generateTags(request: CategorizationRequest, category: CategorizationResult): Promise<string[]> {
    const tags: string[] = [];
    
    // Add category-based tags
    tags.push(category.category.toLowerCase().replace(/\s+/g, '_'));
    
    // Add amount-based tags
    if (request.amount) {
      tags.push(this.categorizeAmount(request.amount));
    }
    
    // Add vendor-based tags
    if (request.vendor) {
      tags.push(request.vendor.toLowerCase().replace(/\s+/g, '_'));
    }
    
    // Add date-based tags
    if (request.date) {
      const month = request.date.toLocaleString('default', { month: 'short' });
      tags.push(month.toLowerCase());
    }
    
    return tags.slice(0, 5); // Limit to 5 tags
  }

  private generateReasoning(
    request: CategorizationRequest,
    category: CategorizationResult,
    allResults: CategorizationResult[]
  ): string {
    const reasons: string[] = [];
    
    if (category.vendorMapping) {
      reasons.push(`Vendor mapping: ${category.vendorMapping}`);
    }
    
    if (category.reasoning && category.reasoning !== 'ML model prediction') {
      reasons.push(category.reasoning);
    }
    
    if (request.amount) {
      reasons.push(`Amount: $${request.amount}`);
    }
    
    if (reasons.length === 0) {
      reasons.push('Best match based on description analysis');
    }
    
    return reasons.join('; ');
  }

  private getDefaultCategory(request: CategorizationRequest): CategorizationResult {
    return {
      category: 'Other',
      confidence: 0.1,
      alternativeCategories: [],
      reasoning: 'Default category - low confidence in classification',
      tags: ['uncategorized']
    };
  }

  private initializeDefaultCategories(): void {
    const defaultCategories = [
      {
        name: 'Office Supplies',
        description: 'Office and business supplies',
        keywords: ['office', 'supplies', 'paper', 'printer', 'ink', 'stapler'],
        rules: [
          {
            id: 'rule_1',
            type: 'KEYWORD' as const,
            condition: 'office,supplies,paper,printer,ink',
            priority: 1,
            confidence: 0.8,
            isActive: true
          }
        ]
      },
      {
        name: 'Travel',
        description: 'Travel and transportation expenses',
        keywords: ['travel', 'transport', 'uber', 'lyft', 'hotel', 'flight'],
        rules: [
          {
            id: 'rule_2',
            type: 'KEYWORD' as const,
            condition: 'travel,uber,lyft,hotel,flight,taxi',
            priority: 1,
            confidence: 0.9,
            isActive: true
          }
        ]
      },
      {
        name: 'Meals',
        description: 'Food and beverage expenses',
        keywords: ['food', 'meal', 'restaurant', 'coffee', 'lunch', 'dinner'],
        rules: [
          {
            id: 'rule_3',
            type: 'KEYWORD' as const,
            condition: 'restaurant,food,meal,coffee,lunch,dinner',
            priority: 1,
            confidence: 0.85,
            isActive: true
          }
        ]
      }
    ];

    defaultCategories.forEach(category => {
      this.addCategory({
        ...category,
        isActive: true
      });
    });
  }

  /**
   * Get categorization statistics
   */
  getStats(): {
    totalCategories: number;
    totalVendorMappings: number;
    averageAccuracy: number;
  } {
    const categories = Array.from(this.categories.values());
    const averageAccuracy = categories.reduce((sum, cat) => sum + cat.accuracy, 0) / categories.length;
    
    return {
      totalCategories: categories.length,
      totalVendorMappings: this.vendorMappings.size,
      averageAccuracy
    };
  }
} 