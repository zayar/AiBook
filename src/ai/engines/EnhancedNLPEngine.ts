import { OpenAIService } from '../services/OpenAIService';
import type { ConversationContext } from '../conversation/ConversationManager';

export interface NLAnalysisResult {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  urgency: 'low' | 'medium' | 'high';
  businessContext: Record<string, any>;
  suggestedActions: string[];
}

export interface IntentClassification {
  intent: string;
  confidence: number;
  subIntents?: string[];
}

export interface EntityExtraction {
  entities: Record<string, any>;
  dateRanges: Array<{
    start?: Date;
    end?: Date;
    period?: string;
  }>;
  amounts: Array<{
    value: number;
    currency?: string;
  }>;
  businessTerms: string[];
}

export class EnhancedNLPEngine {
  private openAI: OpenAIService;
  private tenantId: string;

  // Enhanced intent patterns for financial conversations
  private intentPatterns = {
    financial_report: [
      /show\s+me\s+(profit|loss|income|revenue|expense|balance|cash\s+flow)/i,
      /generate\s+(report|statement)/i,
      /(profit\s+and\s+loss|p&l|income\s+statement)/i,
      /balance\s+sheet/i,
      /cash\s+flow/i,
      /financial\s+summary/i
    ],
    data_inquiry: [
      /how\s+much/i,
      /what\s+(is|are)\s+my/i,
      /show\s+me\s+(total|sum|amount)/i,
      /list\s+(all|my)/i,
      /(top|biggest|largest|highest)\s+(expense|income|customer)/i
    ],
    transaction_query: [
      /transaction/i,
      /payment/i,
      /invoice/i,
      /receipt/i,
      /spent\s+on/i,
      /paid\s+(to|for)/i
    ],
    insight_request: [
      /insight/i,
      /trend/i,
      /analysis/i,
      /pattern/i,
      /anomaly/i,
      /recommendation/i,
      /suggest/i
    ],
    comparison: [
      /compare/i,
      /vs\.?|versus/i,
      /difference\s+between/i,
      /last\s+(month|quarter|year)/i,
      /this\s+(month|quarter|year)\s+vs/i
    ],
    forecasting: [
      /forecast/i,
      /predict/i,
      /estimate/i,
      /project/i,
      /what\s+will\s+be/i,
      /next\s+(month|quarter|year)/i
    ],
    greeting: [
      /^(hi|hello|hey|good\s+(morning|afternoon|evening))/i,
      /how\s+are\s+you/i,
      /what\s+can\s+you\s+do/i
    ],
    help: [
      /help/i,
      /how\s+do\s+i/i,
      /what\s+can\s+you\s+help/i,
      /commands/i,
      /features/i
    ]
  };

  // Business entity patterns
  private entityPatterns = {
    timeframe: {
      patterns: [
        /this\s+(week|month|quarter|year)/i,
        /last\s+(week|month|quarter|year)/i,
        /past\s+(\d+)\s+(days?|weeks?|months?)/i,
        /(january|february|march|april|may|june|july|august|september|october|november|december)/i,
        /q[1-4]/i,
        /(\d{4})/i
      ]
    },
    reportType: {
      patterns: [
        /(profit\s+and\s+loss|p&l|income\s+statement)/i,
        /balance\s+sheet/i,
        /cash\s+flow/i,
        /trial\s+balance/i,
        /general\s+ledger/i
      ]
    },
    amount: {
      patterns: [
        /\$[\d,]+(\.\d{2})?/,
        /[\d,]+\s*(dollars?|usd|mmk|kyats?)/i
      ]
    },
    category: {
      patterns: [
        /(revenue|income|sales)/i,
        /(expense|cost|spending)/i,
        /(inventory|stock)/i,
        /(accounts?\s+receivable|ar)/i,
        /(accounts?\s+payable|ap)/i
      ]
    }
  };

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.openAI = new OpenAIService();
  }

  /**
   * Analyze conversational query with enhanced context awareness
   */
  async analyzeConversationalQuery(
    query: string,
    context: ConversationContext
  ): Promise<NLAnalysisResult> {
    try {
      // Step 1: Basic intent classification
      const intentResult = this.classifyIntent(query);
      
      // Step 2: Entity extraction
      const entityResult = this.extractEntities(query);
      
      // Step 3: Context-aware analysis using OpenAI
      const contextAwareAnalysis = await this.performContextAwareAnalysis(
        query,
        context,
        intentResult,
        entityResult
      );

      // Step 4: Sentiment and urgency analysis
      const sentiment = this.analyzeSentiment(query);
      const urgency = this.analyzeUrgency(query, intentResult);

      // Step 5: Generate suggested actions
      const suggestedActions = this.generateSuggestedActions(
        intentResult.intent,
        entityResult.entities
      );

      return {
        intent: contextAwareAnalysis.intent || intentResult.intent,
        entities: { ...entityResult.entities, ...contextAwareAnalysis.entities },
        confidence: Math.max(intentResult.confidence, contextAwareAnalysis.confidence || 0),
        sentiment,
        urgency,
        businessContext: contextAwareAnalysis.businessContext || {},
        suggestedActions
      };

    } catch (error) {
      console.error('❌ Error in NLP analysis:', error);
      return {
        intent: 'general',
        entities: {},
        confidence: 0.3,
        sentiment: 'neutral',
        urgency: 'low',
        businessContext: {},
        suggestedActions: []
      };
    }
  }

  /**
   * Classify user intent based on patterns and ML
   */
  private classifyIntent(query: string): IntentClassification {
    let bestMatch = { intent: 'general', confidence: 0.3 };

    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          const confidence = this.calculatePatternConfidence(query, pattern);
          if (confidence > bestMatch.confidence) {
            bestMatch = { intent, confidence };
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Extract entities from user query
   */
  private extractEntities(query: string): EntityExtraction {
    const entities: Record<string, any> = {};
    const dateRanges: any[] = [];
    const amounts: any[] = [];
    const businessTerms: string[] = [];

    // Extract timeframes
    for (const pattern of this.entityPatterns.timeframe.patterns) {
      const match = query.match(pattern);
      if (match) {
        entities.timeframe = match[0];
        dateRanges.push(this.parseTimeframe(match[0]));
      }
    }

    // Extract report types
    for (const pattern of this.entityPatterns.reportType.patterns) {
      const match = query.match(pattern);
      if (match) {
        entities.reportType = this.normalizeReportType(match[0]);
      }
    }

    // Extract amounts
    for (const pattern of this.entityPatterns.amount.patterns) {
      const matches = query.match(new RegExp(pattern.source, 'gi'));
      if (matches) {
        matches.forEach(match => {
          amounts.push(this.parseAmount(match));
        });
      }
    }

    // Extract categories
    for (const pattern of this.entityPatterns.category.patterns) {
      const match = query.match(pattern);
      if (match) {
        entities.category = match[0].toLowerCase();
        businessTerms.push(match[0]);
      }
    }

    return {
      entities,
      dateRanges,
      amounts,
      businessTerms
    };
  }

  /**
   * Perform context-aware analysis using OpenAI
   */
  private async performContextAwareAnalysis(
    query: string,
    context: ConversationContext,
    intentResult: IntentClassification,
    entityResult: EntityExtraction
  ): Promise<{
    intent?: string;
    entities?: Record<string, any>;
    confidence?: number;
    businessContext?: Record<string, any>;
  }> {
    try {
      const systemPrompt = `You are an AI financial assistant analyzing user queries in context.
      
Context:
- Current intent: ${intentResult.intent}
- Entities found: ${JSON.stringify(entityResult.entities)}
- Conversation history: ${context.conversationHistory.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}
- User preferences: ${JSON.stringify(context.userPreferences)}

Analyze the query and provide:
1. Refined intent (if different from current)
2. Additional entities or corrections
3. Business context relevance
4. Confidence score (0-1)

Return as JSON with keys: intent, entities, businessContext, confidence`;

      const response = await this.openAI.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Query: "${query}"` }
      ]);

      return JSON.parse(response.content || '{}');
    } catch (error) {
      console.error('❌ Error in context-aware analysis:', error);
      return {};
    }
  }

  /**
   * Analyze sentiment of the query
   */
  private analyzeSentiment(query: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'great', 'excellent', 'perfect', 'amazing', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'problem', 'issue', 'wrong'];

    const lowerQuery = query.toLowerCase();
    
    const positiveCount = positiveWords.filter(word => lowerQuery.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerQuery.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Analyze urgency of the request
   */
  private analyzeUrgency(
    query: string,
    intentResult: IntentClassification
  ): 'low' | 'medium' | 'high' {
    const urgentWords = ['urgent', 'asap', 'immediately', 'critical', 'emergency'];
    const lowerQuery = query.toLowerCase();

    if (urgentWords.some(word => lowerQuery.includes(word))) {
      return 'high';
    }

    // Financial reports are typically medium urgency
    if (intentResult.intent === 'financial_report') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Generate suggested actions based on intent and entities
   */
  private generateSuggestedActions(
    intent: string,
    entities: Record<string, any>
  ): string[] {
    const actions: Record<string, string[]> = {
      financial_report: [
        'Generate the requested report',
        'Offer report customization options',
        'Suggest related reports'
      ],
      data_inquiry: [
        'Query the database for requested information',
        'Present data in visual format',
        'Offer drill-down options'
      ],
      transaction_query: [
        'Search transaction records',
        'Filter by specified criteria',
        'Show transaction details'
      ],
      insight_request: [
        'Run analytics algorithms',
        'Generate business insights',
        'Provide actionable recommendations'
      ]
    };

    return actions[intent] || ['Provide general assistance'];
  }

  /**
   * Helper methods for entity parsing
   */
  private calculatePatternConfidence(query: string, pattern: RegExp): number {
    const match = query.match(pattern);
    if (!match) return 0;
    
    // Simple confidence based on match length vs query length
    return Math.min(0.9, (match[0].length / query.length) * 2);
  }

  private parseTimeframe(timeStr: string): any {
    const now = new Date();
    const lowerTimeStr = timeStr.toLowerCase();

    if (lowerTimeStr.includes('this month')) {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        period: 'this_month'
      };
    }

    if (lowerTimeStr.includes('last month')) {
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0),
        period: 'last_month'
      };
    }

    // Add more timeframe parsing logic
    return { period: timeStr };
  }

  private normalizeReportType(reportStr: string): string {
    const lowerReport = reportStr.toLowerCase();
    
    if (lowerReport.includes('profit') || lowerReport.includes('p&l')) {
      return 'profit_loss';
    }
    if (lowerReport.includes('balance')) {
      return 'balance_sheet';
    }
    if (lowerReport.includes('cash')) {
      return 'cash_flow';
    }
    
    return 'general';
  }

  private parseAmount(amountStr: string): any {
    const cleanAmount = amountStr.replace(/[^\d.]/g, '');
    return {
      value: parseFloat(cleanAmount),
      currency: amountStr.includes('$') ? 'USD' : 'MMK'
    };
  }
}