import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getRemoteConfig, getValue, fetchAndActivate } from 'firebase/remote-config';

// Firebase AI Logic types and interfaces
interface FirebaseAIConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface GeminiPrompt {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface AIModelConfig {
  name: string;
  version: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
}

export class FirebaseAIService {
  private static instance: FirebaseAIService;
  private app: any;
  private storage: any;
  private remoteConfig: any;
  private initialized = false;

  private constructor() {}

  static getInstance(): FirebaseAIService {
    if (!FirebaseAIService.instance) {
      FirebaseAIService.instance = new FirebaseAIService();
    }
    return FirebaseAIService.instance;
  }

  /**
   * Initialize Firebase AI Logic
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      const firebaseConfig: FirebaseAIConfig = {
        apiKey: process.env.FIREBASE_API_KEY!,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN!,
        projectId: process.env.FIREBASE_PROJECT_ID!,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID!,
        appId: process.env.FIREBASE_APP_ID!,
      };

      // Initialize Firebase app for AI features
      this.app = initializeApp(firebaseConfig, 'ai-service');
      
      // Initialize storage for multimodal content
      this.storage = getStorage(this.app);
      
      // Initialize Remote Config for dynamic AI model management
      this.remoteConfig = getRemoteConfig(this.app);
      this.remoteConfig.settings.minimumFetchIntervalMillis = 300000; // 5 minutes

      await this.setupRemoteConfig();
      
      console.log('🤖 Firebase AI Logic initialized successfully');
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Firebase AI Logic:', error);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 Running Firebase AI in mock mode');
        this.initialized = true;
        return true;
      }
      
      return false;
    }
  }

  /**
   * Setup Remote Config for dynamic AI model management
   */
  private async setupRemoteConfig() {
    try {
      // Set default values for AI models and prompts
      this.remoteConfig.defaultConfig = {
        'gemini_model_name': 'gemini-1.5-flash',
        'gemini_temperature': '0.7',
        'gemini_max_tokens': '2048',
        'categorization_prompt': 'Analyze this financial transaction and categorize it for bookkeeping purposes',
        'insight_generation_prompt': 'Generate actionable financial insights based on this data',
        'anomaly_detection_threshold': '0.8',
        'enable_multimodal_processing': 'true'
      };

      await fetchAndActivate(this.remoteConfig);
      console.log('✅ Firebase Remote Config activated for AI models');
    } catch (error) {
      console.warn('⚠️ Remote Config setup failed, using defaults:', error);
    }
  }

  /**
   * 🎯 ENHANCED TRANSACTION CATEGORIZATION WITH GEMINI
   * Uses Firebase AI Logic for client-side processing
   */
  async categorizeTransactionAdvanced(
    description: string,
    amount: number,
    merchant?: string,
    receiptUrl?: string
  ): Promise<{
    category: string;
    subcategory: string;
    confidence: number;
    reasoning: string;
    suggestedAccount: string;
    tags: string[];
    taxImplications?: string[];
  }> {
    try {
      if (!this.initialized) await this.initialize();

      // Get dynamic prompt from Remote Config
      const basePrompt = getValue(this.remoteConfig, 'categorization_prompt').asString();
      
      // Build context-aware prompt
      const prompt = this.buildCategorizationPrompt(description, amount, merchant, basePrompt);
      
      // Call Gemini API through Firebase AI Logic
      const response = await this.callGeminiAPI(prompt, {
        includeReceipt: !!receiptUrl,
        receiptUrl
      });

      return this.parseCategorizationResponse(response);
    } catch (error) {
      console.error('Advanced categorization error:', error);
      throw error;
    }
  }

  /**
   * 📱 MULTIMODAL RECEIPT PROCESSING WITH GEMINI
   * Process receipts with text and image understanding
   */
  async processReceiptMultimodal(
    imageFile: File | Buffer,
    fileName: string,
    tenantId: string
  ): Promise<{
    extractedData: {
      merchant: string;
      date: string;
      total: number;
      tax: number;
      lineItems: Array<{
        description: string;
        amount: number;
        category: string;
      }>;
    };
    confidence: number;
    structuredData: any;
    aiInsights: string[];
  }> {
    try {
      if (!this.initialized) await this.initialize();

      // Upload image to Firebase Storage
      const imageUrl = await this.uploadReceiptImage(imageFile, fileName, tenantId);
      
      // Process with Gemini Vision
      const prompt = this.buildReceiptAnalysisPrompt();
      const response = await this.callGeminiAPI(prompt, {
        includeImage: true,
        imageUrl
      });

      return this.parseReceiptResponse(response);
    } catch (error) {
      console.error('Multimodal receipt processing error:', error);
      throw error;
    }
  }

  /**
   * 🔍 ADVANCED FINANCIAL INSIGHTS WITH GEMINI
   */
  async generateAdvancedInsights(
    financialData: any,
    period: string,
    focusArea: string
  ): Promise<{
    insights: Array<{
      type: string;
      title: string;
      description: string;
      actionable: boolean;
      priority: 'low' | 'medium' | 'high';
      estimatedImpact: string;
    }>;
    recommendations: string[];
    riskFactors: string[];
    opportunities: string[];
  }> {
    try {
      if (!this.initialized) await this.initialize();

      const prompt = this.buildInsightGenerationPrompt(financialData, period, focusArea);
      const response = await this.callGeminiAPI(prompt);

      return this.parseInsightResponse(response);
    } catch (error) {
      console.error('Advanced insights generation error:', error);
      throw error;
    }
  }

  /**
   * 🎨 NATURAL LANGUAGE FINANCIAL QUERY PROCESSING
   */
  async processFinancialQuery(
    query: string,
    context: any,
    tenantId: string
  ): Promise<{
    answer: string;
    data: any;
    confidence: number;
    followUpQuestions: string[];
    actionableSuggestions: string[];
  }> {
    try {
      if (!this.initialized) await this.initialize();

      const prompt = this.buildQueryPrompt(query, context);
      const response = await this.callGeminiAPI(prompt);

      return this.parseQueryResponse(response, query);
    } catch (error) {
      console.error('Natural language query processing error:', error);
      throw error;
    }
  }

  /**
   * 🔄 SMART RECONCILIATION WITH AI
   */
  async performSmartReconciliation(
    bankTransactions: any[],
    bookEntries: any[],
    accountCode: string
  ): Promise<{
    automaticMatches: Array<{
      bankTransaction: any;
      bookEntry: any;
      confidence: number;
      reason: string;
    }>;
    suggestedMatches: Array<{
      bankTransaction: any;
      possibleMatches: Array<{
        bookEntry: any;
        confidence: number;
      }>;
    }>;
    discrepancies: Array<{
      type: string;
      description: string;
      amount: number;
      suggestion: string;
    }>;
  }> {
    try {
      if (!this.initialized) await this.initialize();

      const prompt = this.buildReconciliationPrompt(bankTransactions, bookEntries, accountCode);
      const response = await this.callGeminiAPI(prompt);

      return this.parseReconciliationResponse(response);
    } catch (error) {
      console.error('Smart reconciliation error:', error);
      throw error;
    }
  }

  // Private helper methods

  private async callGeminiAPI(
    prompt: string | GeminiPrompt[],
    options?: {
      includeImage?: boolean;
      imageUrl?: string;
      includeReceipt?: boolean;
      receiptUrl?: string;
    }
  ): Promise<GeminiResponse> {
    // Mock implementation for development
    if (process.env.NODE_ENV === 'development') {
      return this.mockGeminiResponse(prompt);
    }

    // Real Gemini API call implementation
    // This would use the actual Firebase AI Logic SDK
    throw new Error('Gemini API not implemented in production yet');
  }

  private buildCategorizationPrompt(
    description: string,
    amount: number,
    merchant?: string,
    basePrompt?: string
  ): string {
    return `
      ${basePrompt || 'Analyze this financial transaction'}
      
      Transaction Details:
      - Description: ${description}
      - Amount: $${amount}
      - Merchant: ${merchant || 'Unknown'}
      
      Provide a JSON response with:
      {
        "category": "primary category",
        "subcategory": "specific subcategory",
        "confidence": 0.0-1.0,
        "reasoning": "explanation",
        "suggestedAccount": "account code",
        "tags": ["tag1", "tag2"],
        "taxImplications": ["tax consideration 1", "tax consideration 2"]
      }
    `;
  }

  private buildReceiptAnalysisPrompt(): string {
    return `
      Analyze this receipt image and extract structured data.
      
      Extract:
      1. Merchant name and address
      2. Transaction date and time
      3. Total amount and tax amount
      4. Individual line items with descriptions and amounts
      5. Payment method if visible
      6. Any relevant business context
      
      Return structured JSON data with high accuracy.
    `;
  }

  private buildInsightGenerationPrompt(
    financialData: any,
    period: string,
    focusArea: string
  ): string {
    return `
      Analyze this financial data and generate actionable business insights.
      
      Data: ${JSON.stringify(financialData)}
      Period: ${period}
      Focus: ${focusArea}
      
      Generate insights focusing on:
      - Expense optimization opportunities
      - Revenue growth patterns
      - Cash flow improvements
      - Tax optimization strategies
      - Risk mitigation recommendations
    `;
  }

  private buildQueryPrompt(query: string, context: any): string {
    return `
      Answer this financial question based on the provided context:
      
      Question: ${query}
      Context: ${JSON.stringify(context)}
      
      Provide a comprehensive answer with:
      - Direct answer to the question
      - Supporting data/evidence
      - Follow-up questions
      - Actionable recommendations
    `;
  }

  private buildReconciliationPrompt(
    bankTransactions: any[],
    bookEntries: any[],
    accountCode: string
  ): string {
    return `
      Perform intelligent reconciliation between bank transactions and book entries.
      
      Bank Transactions: ${JSON.stringify(bankTransactions)}
      Book Entries: ${JSON.stringify(bookEntries)}
      Account: ${accountCode}
      
      Find matches, identify discrepancies, and suggest corrections.
    `;
  }

  private async uploadReceiptImage(
    imageFile: File | Buffer,
    fileName: string,
    tenantId: string
  ): Promise<string> {
    if (process.env.NODE_ENV === 'development') {
      return `https://mock-storage.firebase.com/receipts/${tenantId}/${fileName}`;
    }

    // Real Firebase Storage upload
    const storageRef = ref(this.storage, `receipts/${tenantId}/${Date.now()}-${fileName}`);
    const snapshot = await uploadBytes(storageRef, imageFile as any);
    return await getDownloadURL(snapshot.ref);
  }

  private mockGeminiResponse(prompt: string | GeminiPrompt[]): GeminiResponse {
    return {
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              category: 'Office Expenses',
              subcategory: 'Software Subscription',
              confidence: 0.92,
              reasoning: 'Based on merchant pattern and amount analysis',
              suggestedAccount: '5110',
              tags: ['recurring', 'software', 'productivity'],
              taxImplications: ['Fully deductible business expense']
            })
          }]
        },
        finishReason: 'STOP',
        safetyRatings: []
      }],
      usageMetadata: {
        promptTokenCount: 150,
        candidatesTokenCount: 80,
        totalTokenCount: 230
      }
    };
  }

  private parseCategorizationResponse(response: GeminiResponse): any {
    try {
      const text = response.candidates[0].content.parts[0].text;
      return JSON.parse(text);
    } catch (error) {
      // Fallback parsing
      return {
        category: 'General Expenses',
        subcategory: 'Miscellaneous',
        confidence: 0.6,
        reasoning: 'Default categorization due to parsing error',
        suggestedAccount: '5000',
        tags: ['review-needed']
      };
    }
  }

  private parseReceiptResponse(response: GeminiResponse): any {
    // Mock receipt parsing response
    return {
      extractedData: {
        merchant: 'Office Depot',
        date: '2024-01-15',
        total: 58.49,
        tax: 4.68,
        lineItems: [
          { description: 'Paper Supplies', amount: 45.99, category: 'Office Supplies' },
          { description: 'Pens', amount: 7.82, category: 'Office Supplies' }
        ]
      },
      confidence: 0.94,
      structuredData: {},
      aiInsights: [
        'Regular office supply purchase pattern detected',
        'Consider bulk purchasing for better rates',
        'Tax-deductible business expense'
      ]
    };
  }

  private parseInsightResponse(response: GeminiResponse): any {
    // Mock insights response
    return {
      insights: [
        {
          type: 'cost_optimization',
          title: 'Software Subscription Optimization',
          description: 'Consolidate 3 overlapping tools to save $150/month',
          actionable: true,
          priority: 'high' as const,
          estimatedImpact: '$1,800 annual savings'
        }
      ],
      recommendations: [
        'Review all software subscriptions quarterly',
        'Negotiate annual contracts for better rates'
      ],
      riskFactors: ['Rising software costs'],
      opportunities: ['Bundle discounts available']
    };
  }

  private parseQueryResponse(response: GeminiResponse, originalQuery: string): any {
    // Mock query response
    return {
      answer: 'Based on your financial data, your cash flow is strong with positive trends.',
      data: { summary: 'positive_trends' },
      confidence: 0.88,
      followUpQuestions: [
        'Would you like a detailed breakdown by category?',
        'Should I analyze seasonal patterns?'
      ],
      actionableSuggestions: [
        'Consider investing excess cash',
        'Review payment terms with suppliers'
      ]
    };
  }

  private parseReconciliationResponse(response: GeminiResponse): any {
    // Mock reconciliation response
    return {
      automaticMatches: [
        {
          bankTransaction: { id: 'bank_001', amount: 1500, description: 'DEPOSIT' },
          bookEntry: { id: 'book_001', amount: 1500, description: 'Customer Payment' },
          confidence: 0.98,
          reason: 'Perfect amount and timing match'
        }
      ],
      suggestedMatches: [],
      discrepancies: []
    };
  }

  /**
   * Get current AI model configuration from Remote Config
   */
  getModelConfig(): AIModelConfig {
    if (!this.remoteConfig) {
      return this.getDefaultModelConfig();
    }

    try {
      return {
        name: getValue(this.remoteConfig, 'gemini_model_name').asString(),
        version: '1.5',
        temperature: parseFloat(getValue(this.remoteConfig, 'gemini_temperature').asString()),
        maxTokens: parseInt(getValue(this.remoteConfig, 'gemini_max_tokens').asString()),
        topP: 0.8,
        topK: 40
      };
    } catch (error) {
      console.warn('Failed to get model config from Remote Config, using defaults');
      return this.getDefaultModelConfig();
    }
  }

  private getDefaultModelConfig(): AIModelConfig {
    return {
      name: 'gemini-1.5-flash',
      version: '1.5',
      temperature: 0.7,
      maxTokens: 2048,
      topP: 0.8,
      topK: 40
    };
  }

  /**
   * Check if Firebase AI Logic is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      modelConfig: this.getModelConfig(),
      capabilities: [
        'transaction_categorization',
        'multimodal_receipt_processing',
        'financial_insights',
        'natural_language_queries',
        'smart_reconciliation'
      ]
    };
  }
}

export default FirebaseAIService.getInstance(); 