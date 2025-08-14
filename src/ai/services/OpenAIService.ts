/**
 * 🤖 OPENAI SERVICE
 * 
 * Handles all OpenAI API interactions including:
 * - Text embeddings generation
 * - Chat completions for conversational AI
 * - Function calling for complex queries
 * - Content moderation and safety
 */

import OpenAI from 'openai';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
  function_call?: any;
}

export interface EmbeddingResponse {
  embedding: number[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionResponse {
  content: string;
  function_call?: any;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason: string;
}

export interface FinancialFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * OpenAI Service for AI-powered financial operations
 */
export class OpenAIService {
  private client: OpenAI;
  private model: string;
  private embeddingModel: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
    this.embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  }

  /**
   * 🔤 GENERATE EMBEDDINGS
   * Create vector embeddings for text content
   */
  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: text.trim(),
        encoding_format: 'float'
      });

      return {
        embedding: response.data[0].embedding,
        usage: response.usage
      };
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * 💬 CHAT COMPLETION
   * Generate conversational responses with function calling
   */
  async chatCompletion(
    messages: ChatMessage[],
    functions?: FinancialFunction[],
    options: {
      temperature?: number;
      max_tokens?: number;
      function_call?: 'auto' | 'none' | { name: string };
    } = {}
  ): Promise<ChatCompletionResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 1500,
        ...(functions && {
          functions,
          function_call: options.function_call || 'auto'
        })
      });

      const choice = response.choices[0];
      
      return {
        content: choice.message.content || '',
        function_call: choice.message.function_call,
        usage: response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        finish_reason: choice.finish_reason || 'stop'
      };
    } catch (error) {
      console.error('OpenAI chat completion error:', error);
      throw new Error('Failed to generate chat completion');
    }
  }

  /**
   * 🏦 FINANCIAL COPILOT
   * Process natural language financial queries
   */
  async processFinancialQuery(
    query: string,
    context: {
      tenantId: string;
      userId?: string;
      businessProfile?: any;
      profitLoss?: any;
      cashFlow?: any;
      trialBalance?: any;
      topCustomers?: any;
      topVendors?: any;
      inventory?: any;
      cogs?: any;
      banking?: any;
      recentActivity?: any;
      recentTransactions?: any[];
      financialSummary?: any;
    }
  ): Promise<{
    response: string;
    intent: string;
    confidence: number;
    function_calls?: any[];
    suggestions?: string[];
  }> {
    const systemPrompt = this.buildFinancialSystemPrompt(context);
    
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ];

    const functions = this.getFinancialFunctions();

    const completion = await this.chatCompletion(messages, functions, {
      temperature: 0.3, // Lower temperature for more consistent financial advice
      max_tokens: 2000
    });

    // Extract intent and confidence from the response
    const intent = this.extractIntent(query, completion.content);
    const confidence = this.calculateConfidence(completion);

    return {
      response: completion.content,
      intent,
      confidence,
      function_calls: completion.function_call ? [completion.function_call] : [],
      suggestions: this.generateFollowUpSuggestions(intent, context)
    };
  }

  /**
   * 📊 ANALYZE FINANCIAL DATA
   * Provide AI insights on financial data
   */
  async analyzeFinancialData(
    data: any,
    analysisType: 'cash_flow' | 'expense_analysis' | 'revenue_trends' | 'risk_assessment',
    context: { tenantId: string; timeframe?: string }
  ): Promise<{
    insights: string[];
    recommendations: string[];
    risk_level: 'low' | 'medium' | 'high';
    confidence: number;
  }> {
    const prompt = this.buildAnalysisPrompt(data, analysisType, context);
    
    const completion = await this.chatCompletion([
      { role: 'system', content: 'You are a financial analyst AI. Provide clear, actionable insights.' },
      { role: 'user', content: prompt }
    ], undefined, {
      temperature: 0.2,
      max_tokens: 1500
    });

    return this.parseFinancialAnalysis(completion.content);
  }

  /**
   * 🔍 CATEGORIZE TRANSACTION
   * AI-powered transaction categorization
   */
  async categorizeTransaction(
    transaction: {
      description: string;
      amount: number;
      vendor?: string;
      date: string;
    },
    historicalCategories: string[] = []
  ): Promise<{
    category: string;
    confidence: number;
    reasoning: string;
    suggested_account: string;
  }> {
    const prompt = `
Categorize this financial transaction:
Description: ${transaction.description}
Amount: $${transaction.amount}
Vendor: ${transaction.vendor || 'Unknown'}
Date: ${transaction.date}

Historical categories used: ${historicalCategories.join(', ')}

Provide a JSON response with:
{
  "category": "expense category",
  "confidence": 0.95,
  "reasoning": "why this category was chosen",
  "suggested_account": "account code or name"
}
`;

    const completion = await this.chatCompletion([
      { role: 'system', content: 'You are a financial categorization expert. Always respond with valid JSON.' },
      { role: 'user', content: prompt }
    ], undefined, {
      temperature: 0.1,
      max_tokens: 500
    });

    try {
      return JSON.parse(completion.content);
    } catch {
      // Fallback if JSON parsing fails
      return {
        category: 'Uncategorized',
        confidence: 0.5,
        reasoning: 'Could not parse AI response',
        suggested_account: '6000'
      };
    }
  }

  // ===== PRIVATE METHODS =====

  /**
   * Build system prompt for financial copilot
   */
  private buildFinancialSystemPrompt(context: any): string {
    const business = context.businessProfile || {};
    const pl = context.profitLoss || {};
    const cf = context.cashFlow || {};
    const tb = context.trialBalance || {};
    const inventory = context.inventory || {};
    const banking = context.banking || {};
    const cogs = context.cogs || {};
    
    return `You are an advanced Financial AI Copilot for "${business.name || 'this business'}" - an intelligent accounting assistant with comprehensive access to real financial data and business intelligence.

=== BUSINESS PROFILE ===
Company: ${business.name || 'Business'}
Currency: ${business.baseCurrency || 'USD'}
Tenant: ${context.tenantId}

=== CURRENT FINANCIAL POSITION ===
📊 PROFIT & LOSS (Current Period):
- Revenue: $${pl.revenue?.toLocaleString() || '0'}
- COGS: $${pl.cogs?.toLocaleString() || '0'}
- Gross Profit: $${pl.grossProfit?.toLocaleString() || '0'} (${pl.grossMargin?.toFixed(1) || '0'}% margin)
- Operating Expenses: $${pl.expenses?.toLocaleString() || '0'}
- Net Income: $${pl.netIncome?.toLocaleString() || '0'} (${pl.netMargin?.toFixed(1) || '0'}% margin)

💰 CASH FLOW (${cf.period || 'Recent'}):
- Operating Cash Flow: $${cf.operatingCashFlow?.toLocaleString() || '0'}
- Net Cash Flow: $${cf.netCashFlow?.toLocaleString() || '0'}
- Cash Position: $${cf.cashPosition?.toLocaleString() || '0'}

🏦 BALANCE SHEET SUMMARY:
- Total Assets: $${tb.totalAssets?.toLocaleString() || '0'}
- Total Liabilities: $${tb.totalLiabilities?.toLocaleString() || '0'}
- Total Equity: $${tb.totalEquity?.toLocaleString() || '0'}

📦 INVENTORY INTELLIGENCE:
- Total Inventory Value: $${inventory.totalValue?.toLocaleString() || '0'}
- Total Quantity on Hand: ${inventory.totalQuantity?.toLocaleString() || '0'} units
- Low Stock Items: ${inventory.lowStockItems?.length || 0} items
- Active SKUs: ${inventory.items?.length || 0}

🏭 COST OF GOODS SOLD (COGS):
- Recent COGS: $${cogs.totalCOGS?.toLocaleString() || '0'}
- Units Sold: ${cogs.totalQuantity?.toLocaleString() || '0'}
- Average Cost per Unit: $${cogs.averageCostPerUnit?.toFixed(2) || '0'}
- COGS Transactions: ${cogs.recentCalculations || 0}

🏪 BANKING SUMMARY:
- Total Cash: $${banking.totalCash?.toLocaleString() || '0'}
- Bank Accounts: ${banking.accountCount || 0}

=== TOP CUSTOMERS (This Year) ===
${context.topCustomers?.map((tc: any, i: number) => 
  `${i+1}. ${tc.customer?.name || 'Unknown'} - $${tc.revenue?.toLocaleString()} (${tc.invoiceCount} invoices)`
).join('\n') || 'No customer data available'}

=== TOP VENDORS (This Year) ===
${context.topVendors?.map((tv: any, i: number) => 
  `${i+1}. ${tv.vendor?.name || 'Unknown'} - $${tv.spending?.toLocaleString()} (${tv.billCount} bills)`
).join('\n') || 'No vendor data available'}

=== RECENT ACTIVITY ===
- Journal Entries: ${context.recentActivity?.journalEntries || 0} (last 30 days)
- Last Transaction: ${context.recentActivity?.lastTransactionDate ? new Date(context.recentActivity.lastTransactionDate).toLocaleDateString() : 'N/A'}

=== AI CAPABILITIES ===
As a Financial Copilot, you can:
✅ Analyze profit & loss trends and provide business insights
✅ Explain cash flow patterns and forecast needs
✅ Identify top customers and revenue opportunities  
✅ Analyze vendor spending and cost optimization
✅ Provide COGS analysis and inventory intelligence
✅ Explain accounting concepts using actual data
✅ Generate actionable financial recommendations
✅ Detect financial anomalies and risks
✅ Answer questions about specific accounts and balances
✅ Help with financial planning and budgeting

=== RESPONSE GUIDELINES ===
🎯 Be conversational but professional - you're a trusted financial advisor
📊 Always use ACTUAL DATA from above when answering questions
💡 Provide specific, actionable insights based on real numbers
🔍 Explain the "why" behind financial patterns
📈 Suggest concrete next steps and improvements
💰 Reference specific dollar amounts, percentages, and trends
🚨 Highlight important alerts or concerns
🎉 Celebrate positive financial performance
📋 When discussing financial metrics, include embedded report summaries and suggest related reports
🔗 CRITICAL: Always end financial responses with this EXACT format:

📋 **Related Reports:**
• Report Name - Brief description
• Report Name - Brief description
• Report Name - Brief description

Do NOT use markdown links or brackets. Use bullet points (•) followed by report name, dash, and description.

=== EXAMPLES OF INTELLIGENT RESPONSES ===
Question: "How is my business doing?"
Great Response: "Your business is performing well! You have a ${pl.grossMargin?.toFixed(1)}% gross margin on $${pl.revenue?.toLocaleString()} in revenue.

📊 **Quick P&L Summary:**
• Revenue: $${pl.revenue?.toLocaleString()}
• Expenses: $${pl.expenses?.toLocaleString()}  
• Net Income: $${pl.netIncome?.toLocaleString()}
• Profit Margin: ${pl.netMargin?.toFixed(1)}%

Your top customer ${context.topCustomers?.[0]?.customer?.name} generated $${context.topCustomers?.[0]?.revenue?.toLocaleString()} this year.

📋 **Related Reports:**
• Profit & Loss Statement - Full financial performance breakdown
• Cash Flow Report - Understand your cash position  
• Trial Balance - Complete account balances"

Question: "What are my biggest expenses?"
Great Response: "Looking at your data, you spent $${pl.expenses?.toLocaleString()} on operating expenses. Your top vendor ${context.topVendors?.[0]?.vendor?.name} received $${context.topVendors?.[0]?.spending?.toLocaleString()} in payments.

📋 **Related Reports:**
• [Profit & Loss Statement →](/reports/profit-loss) - Full expense breakdown
• [Account Transactions →](/reports/account-transactions) - Individual expense details
• [Cash Flow Report →](/reports/cash-flow) - Payment analysis"

Question: "How's my inventory?"
Great Response: "You have $${inventory.totalValue?.toLocaleString()} in inventory across ${inventory.items?.length} SKUs. ${inventory.lowStockItems?.length} items are running low. Your COGS averaged $${cogs.averageCostPerUnit?.toFixed(2)} per unit.

📦 **Inventory Quick View:**
• Total Value: $${inventory.totalValue?.toLocaleString()}
• Items on Hand: ${inventory.totalQuantity?.toLocaleString()} units
• Low Stock Alerts: ${inventory.lowStockItems?.length} items

📋 **Related Reports:**
• Items & Inventory - Detailed inventory management
• Profit & Loss Statement - COGS analysis and breakdown"

REMEMBER: You have access to comprehensive, real-time financial data. Use it to provide intelligent, specific, data-driven responses that help the business owner make informed decisions.`;
  }

  /**
   * Get available financial functions for function calling
   */
  private getFinancialFunctions(): FinancialFunction[] {
    return [
      {
        name: 'get_cash_flow_forecast',
        description: 'Get cash flow prediction for specified periods',
        parameters: {
          type: 'object',
          properties: {
            periods: { type: 'number', description: 'Number of periods to forecast' },
            period_type: { type: 'string', enum: ['days', 'weeks', 'months'] }
          },
          required: ['periods']
        }
      },
      {
        name: 'analyze_expense_trends',
        description: 'Analyze expense patterns and trends',
        parameters: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Expense category to analyze' },
            timeframe: { type: 'string', description: 'Time period for analysis' }
          },
          required: ['timeframe']
        }
      },
      {
        name: 'get_top_customers',
        description: 'Get top customers by revenue or other metrics',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of customers to return' },
            metric: { type: 'string', enum: ['revenue', 'transactions', 'profit'] },
            timeframe: { type: 'string', description: 'Time period for analysis' }
          },
          required: ['limit']
        }
      },
      {
        name: 'detect_anomalies',
        description: 'Detect unusual patterns in financial data',
        parameters: {
          type: 'object',
          properties: {
            data_type: { type: 'string', enum: ['expenses', 'revenue', 'cash_flow'] },
            sensitivity: { type: 'string', enum: ['low', 'medium', 'high'] }
          },
          required: ['data_type']
        }
      }
    ];
  }

  /**
   * Extract intent from query and response
   */
  private extractIntent(query: string, response: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('cash flow') || queryLower.includes('cashflow')) {
      return 'cash_flow_inquiry';
    } else if (queryLower.includes('expense') || queryLower.includes('spending')) {
      return 'expense_analysis';
    } else if (queryLower.includes('revenue') || queryLower.includes('income') || queryLower.includes('sales')) {
      return 'revenue_analysis';
    } else if (queryLower.includes('customer') || queryLower.includes('client')) {
      return 'customer_analysis';
    } else if (queryLower.includes('forecast') || queryLower.includes('predict')) {
      return 'forecasting';
    } else if (queryLower.includes('report') || queryLower.includes('statement')) {
      return 'reporting';
    } else {
      return 'general_inquiry';
    }
  }

  /**
   * Calculate confidence score based on completion
   */
  private calculateConfidence(completion: ChatCompletionResponse): number {
    // Base confidence on completion quality indicators
    let confidence = 0.7;
    
    if (completion.finish_reason === 'stop') confidence += 0.2;
    if (completion.content.length > 100) confidence += 0.1;
    if (completion.function_call) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Generate follow-up suggestions based on intent
   */
  private generateFollowUpSuggestions(intent: string, context: any): string[] {
    const suggestions: Record<string, string[]> = {
      cash_flow_inquiry: [
        'Show me cash flow forecast for next 3 months',
        'What are my biggest cash drains?',
        'When will I have cash flow issues?'
      ],
      expense_analysis: [
        'Which expense categories are growing?',
        'Show me unusual expenses this month',
        'Compare expenses to last year'
      ],
      revenue_analysis: [
        'Who are my top customers?',
        'What are my revenue trends?',
        'Show me seasonal revenue patterns'
      ],
      general_inquiry: [
        'Show me financial health summary',
        'What should I focus on this month?',
        'Are there any red flags in my finances?'
      ]
    };

    return suggestions[intent] || suggestions.general_inquiry;
  }

  /**
   * Build analysis prompt for financial data
   */
  private buildAnalysisPrompt(data: any, analysisType: string, context: any): string {
    const dataJson = JSON.stringify(data, null, 2);
    
    return `Analyze this financial data for ${analysisType}:

${dataJson}

Context:
- Business: ${context.tenantId}
- Timeframe: ${context.timeframe || 'Current period'}

Please provide:
1. Key insights (3-5 bullet points)
2. Actionable recommendations (3-5 items)
3. Risk assessment (low/medium/high)
4. Confidence level in analysis

Format as JSON:
{
  "insights": ["insight 1", "insight 2", ...],
  "recommendations": ["rec 1", "rec 2", ...],
  "risk_level": "medium",
  "confidence": 0.85
}`;
  }

  /**
   * Parse financial analysis response
   */
  private parseFinancialAnalysis(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      // Fallback parsing
      return {
        insights: ['Analysis completed with limited confidence'],
        recommendations: ['Review data quality and try again'],
        risk_level: 'medium',
        confidence: 0.5
      };
    }
  }
}