import { VertexAI } from '@google-cloud/vertexai';
import { ReportingEngine } from '../../accounting/engines/ReportingEngine';

export interface ConversationContext {
  tenantId: string;
  userId?: string;
  language?: 'en' | 'my' | 'zh' | 'th';
  sessionId: string;
}

export interface ConversationResponse {
  response: string;
  intent: string;
  confidence: number;
  data?: any;
  report?: any;
  followUpQuestions?: string[];
  executionTime: number;
}

export interface FinancialQueryResult {
  type: 'summary' | 'report' | 'insight';
  data: any;
  formatted_response: string;
}

/**
 * 🌍 Multilingual AI Financial Assistant using Vertex AI
 * Supports Myanmar (မြန်မာ), Chinese (中文), Thai (ไทย), and English
 */
export class VertexAIConversationService {
  private vertexAI: VertexAI;
  private projectId: string;
  private location: string;
  private reportingEngine: ReportingEngine;

  // Language mappings for financial terms
  private readonly financialTerms = {
    en: {
      revenue: 'revenue',
      income: 'income',
      profit: 'profit',
      loss: 'loss',
      expense: 'expense',
      cash_flow: 'cash flow',
      balance_sheet: 'balance sheet',
      total: 'total',
      this_month: 'this month',
      sales: 'sales',
      report: 'report'
    },
    my: {
      revenue: 'ဝင်ငွေ',
      income: 'ငွေဝင်',
      profit: 'အမြတ်',
      loss: 'အရှုံး',
      expense: 'ကုန်ကျစရိတ်',
      cash_flow: 'ငွေကြေးစီးဆင်းမှု',
      balance_sheet: 'လက်ကျန်စာရင်း',
      total: 'စုစုပေါင်း',
      this_month: 'ဒီလ',
      sales: 'ရောင်းအား',
      report: 'အစီရင်ခံစာ'
    },
    zh: {
      revenue: '收入',
      income: '收益',
      profit: '利润',
      loss: '亏损',
      expense: '费用',
      cash_flow: '现金流',
      balance_sheet: '资产负债表',
      total: '总计',
      this_month: '本月',
      sales: '销售额',
      report: '报告'
    },
    th: {
      revenue: 'รายได้',
      income: 'รายได้',
      profit: 'กำไร',
      loss: 'ขาดทุน',
      expense: 'ค่าใช้จ่าย',
      cash_flow: 'กระแสเงินสด',
      balance_sheet: 'งบดุล',
      total: 'รวม',
      this_month: 'เดือนนี้',
      sales: 'ยอดขาย',
      report: 'รายงาน'
    }
  };

  constructor(tenantId: string) {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'aiaccount-1c845';
    this.location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    
    this.vertexAI = new VertexAI({
      project: this.projectId,
      location: this.location
    });

    this.reportingEngine = new ReportingEngine(tenantId);
  }

  /**
   * Process user query in multiple languages
   */
  async processQuery(message: string, context: ConversationContext): Promise<ConversationResponse> {
    const startTime = Date.now();
    
    try {
      // 1. Detect language if not provided
      const detectedLanguage = context.language || await this.detectLanguage(message);
      
      // 2. Extract intent and entities using Vertex AI
      const analysis = await this.analyzeWithVertexAI(message, detectedLanguage);
      
      // 3. Get financial data if needed
      let financialData = null;
      let report = null;
      
      if (analysis.intent === 'financial_query') {
        const queryResult = await this.executeFinancialQuery(analysis.entities, context.tenantId);
        financialData = queryResult.data;
        report = queryResult;
      }
      
      // 4. Generate response in appropriate language
      const response = await this.generateResponse(analysis, financialData, detectedLanguage, context);
      
      return {
        response: response.text,
        intent: analysis.intent,
        confidence: analysis.confidence,
        data: financialData,
        report: report,
        followUpQuestions: response.followUpQuestions,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Error processing query:', error);
      return {
        response: this.getErrorMessage(context.language || 'en'),
        intent: 'error',
        confidence: 0,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Analyze user message using Vertex AI Gemini Pro
   */
  private async analyzeWithVertexAI(message: string, language: string) {
    const model = this.vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro'
    });

    const prompt = `
You are a multilingual financial AI assistant. Analyze this user query and extract:
1. Intent (financial_query, greeting, question, other)
2. Entities (what financial data they want)
3. Timeframe (this_month, last_month, this_year, etc.)
4. Report type (profit_loss, cash_flow, balance_sheet, revenue, expenses)

User message: "${message}"
Language: ${language}

Financial terms in different languages:
- Revenue/Income: English: revenue, income, sales | Myanmar: ဝင်ငွေ, ငွေဝင်, ရောင်းအား | Chinese: 收入, 收益, 销售额 | Thai: รายได้, ยอดขาย
- Profit: English: profit, net income | Myanmar: အမြတ် | Chinese: 利润 | Thai: กำไร  
- Expenses: English: expenses, costs | Myanmar: ကုန်ကျစရိတ် | Chinese: 费用 | Thai: ค่าใช้จ่าย
- Cash Flow: English: cash flow | Myanmar: ငွေကြေးစီးဆင်းမှု | Chinese: 现金流 | Thai: กระแสเงินสด
- This month: English: this month | Myanmar: ဒီလ | Chinese: 本月 | Thai: เดือนนี้

Respond with JSON only:
{
  "intent": "financial_query|greeting|question|other",
  "entities": {
    "reportType": "profit_loss|cash_flow|balance_sheet|revenue|expenses|null",
    "timeframe": "this_month|last_month|this_year|null",
    "metric": "total|summary|detailed|null"
  },
  "confidence": 0.95,
  "detectedLanguage": "${language}"
}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      // Clean up the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse Vertex AI response:', response);
      return {
        intent: 'question',
        entities: {},
        confidence: 0.5,
        detectedLanguage: language
      };
    }
  }

  /**
   * Execute financial query and get real data
   */
  private async executeFinancialQuery(entities: any, tenantId: string): Promise<FinancialQueryResult> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    try {
      switch (entities.reportType) {
        case 'profit_loss':
        case 'revenue':
        case 'income':
          const incomeStmt = await this.reportingEngine.generateIncomeStatement(startOfMonth, endOfMonth);
          return {
            type: 'report',
            data: incomeStmt,
            formatted_response: `Revenue: MMK ${incomeStmt.totals.totalRevenue.toLocaleString()}, Net Income: MMK ${incomeStmt.totals.netIncome.toLocaleString()}, Profit Margin: ${(incomeStmt.totals.netIncome / incomeStmt.totals.totalRevenue * 100).toFixed(1)}%`
          };

        case 'cash_flow':
          const cashFlow = await this.reportingEngine.generateCashFlowStatement(startOfMonth, endOfMonth);
          return {
            type: 'report',
            data: cashFlow,
            formatted_response: `Operating Cash Flow: MMK ${cashFlow.totals.operatingCashFlow.toLocaleString()}, Net Cash Flow: MMK ${cashFlow.totals.netCashFlow.toLocaleString()}`
          };

        case 'balance_sheet':
          const balanceSheet = await this.reportingEngine.generateBalanceSheet(endOfMonth);
          return {
            type: 'report',
            data: balanceSheet,
            formatted_response: `Total Assets: MMK ${balanceSheet.totals.totalAssets.toLocaleString()}, Total Equity: MMK ${balanceSheet.totals.totalEquity.toLocaleString()}`
          };

        case 'expenses':
          // Get expense data from income statement
          const expenseStmt = await this.reportingEngine.generateIncomeStatement(startOfMonth, endOfMonth);
          return {
            type: 'summary',
            data: { totalExpenses: expenseStmt.totals.totalOperatingExpenses },
            formatted_response: `Total Expenses: MMK ${expenseStmt.totals.totalOperatingExpenses.toLocaleString()}`
          };

        default:
          // Default to revenue summary
          const summary = await this.reportingEngine.generateIncomeStatement(startOfMonth, endOfMonth);
          return {
            type: 'summary',
            data: summary.totals,
            formatted_response: `Revenue: MMK ${summary.totals.totalRevenue.toLocaleString()}, Profit: MMK ${summary.totals.netIncome.toLocaleString()}`
          };
      }
    } catch (error) {
      console.error('Error executing financial query:', error);
      throw error;
    }
  }

  /**
   * Generate multilingual response
   */
  private async generateResponse(analysis: any, financialData: any, language: string, context: ConversationContext) {
    const model = this.vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro'
    });

    let responsePrompt = '';
    
    if (analysis.intent === 'financial_query' && financialData) {
      const dataString = JSON.stringify(financialData, null, 2);
      
      responsePrompt = `
You are a helpful financial AI assistant. Generate a response in ${language} language.

User asked about financial data and here's the real data from their accounting system:
${dataString}

Requirements:
1. Respond in ${language} language (${language === 'my' ? 'Myanmar/Burmese' : language === 'zh' ? 'Chinese' : language === 'th' ? 'Thai' : 'English'})
2. Use appropriate financial terms for the language
3. Be concise but informative
4. Include key numbers with proper formatting
5. Suggest relevant follow-up questions

Financial terms reference:
${JSON.stringify(this.financialTerms[language as keyof typeof this.financialTerms], null, 2)}

Generate a natural, helpful response that answers their question with the real data.`;
    } else {
      responsePrompt = `
You are a helpful financial AI assistant. The user said: "${analysis.originalMessage || 'financial question'}"

Respond in ${language} language. Be helpful and explain that you can help with financial questions like:
- Revenue analysis (ဝင်ငွေ / 收入 / รายได้)  
- Profit & Loss (အမြတ်အရှုံး / 损益 / กำไรขาดทุน)
- Cash flow (ငွေကြေးစီးဆင်းမှု / 现金流 / กระแสเงินสด)
- Expenses (ကုန်ကျစရိတ် / 费用 / ค่าใช้จ่าย)

Keep it concise and friendly.`;
    }

    const result = await model.generateContent(responsePrompt);
    const responseText = result.response.text();

    // Generate follow-up questions in appropriate language
    const followUpQuestions = this.generateFollowUpQuestions(language, analysis.entities);

    return {
      text: responseText,
      followUpQuestions
    };
  }

  /**
   * Detect language from user input
   */
  private async detectLanguage(message: string): Promise<string> {
    // Simple language detection based on character sets
    if (/[\u1000-\u109F]/.test(message)) return 'my'; // Myanmar
    if (/[\u4e00-\u9fff]/.test(message)) return 'zh'; // Chinese
    if (/[\u0e00-\u0e7f]/.test(message)) return 'th'; // Thai
    
    // Check for common words
    const myanmarWords = ['ဝင်ငွေ', 'အမြတ်', 'ကုန်ကျစရိတ်', 'ဒီလ'];
    const chineseWords = ['收入', '利润', '费用', '本月'];
    const thaiWords = ['รายได้', 'กำไร', 'ค่าใช้จ่าย', 'เดือนนี้'];
    
    if (myanmarWords.some(word => message.includes(word))) return 'my';
    if (chineseWords.some(word => message.includes(word))) return 'zh';
    if (thaiWords.some(word => message.includes(word))) return 'th';
    
    return 'en'; // Default to English
  }

  /**
   * Generate follow-up questions in appropriate language
   */
  private generateFollowUpQuestions(language: string, entities: any): string[] {
    const questions = {
      en: [
        "Would you like to see a detailed breakdown?",
        "Should I compare this with last month?",
        "Do you want to see the cash flow report?",
        "Would you like expense analysis?"
      ],
      my: [
        "အသေးစိတ်ကြည့်ရှုလိုပါသလား?",
        "ပြီးခဲ့သောလနှင့်နှိုင်းယှဉ်ကြည့်ရမလား?",
        "ငွေကြေးစီးဆင်းမှုအစီရင်ခံစာကြည့်ရမလား?",
        "ကုန်ကျစရိတ်ခွဲခြမ်းစိတ်ဖြာမှုလိုပါသလား?"
      ],
      zh: [
        "您想看详细分解吗？",
        "要与上个月比较吗？",
        "您想看现金流报告吗？",
        "需要费用分析吗？"
      ],
      th: [
        "คุณต้องการดูรายละเอียดไหม?",
        "ต้องการเปรียบเทียบกับเดือนที่แล้วไหม?",
        "อยากดูรายงานกระแสเงินสดไหม?",
        "ต้องการวิเคราะห์ค่าใช้จ่ายไหม?"
      ]
    };

    return questions[language as keyof typeof questions] || questions.en;
  }

  /**
   * Get error message in appropriate language
   */
  private getErrorMessage(language: string): string {
    const messages = {
      en: "I'm sorry, I couldn't process your request right now. Please try asking about your revenue, expenses, or profit.",
      my: "ဝမ်းနည်းပါတယ်၊ အခု သင့်တောင်းဆိုချက်ကို ကိုင်တွယ်မရပါ။ သင့်ဝင်ငွေ၊ ကုန်ကျစရိတ် သို့မဟုတ် အမြတ်အကြောင်း မေးကြည့်ပါ။",
      zh: "抱歉，我现在无法处理您的请求。请尝试询问您的收入、费用或利润。",
      th: "ขออภัย ไม่สามารถประมวลผลคำขอของคุณได้ในขณะนี้ ลองถามเกี่ยวกับรายได้ ค่าใช้จ่าย หรือกำไรของคุณ"
    };

    return messages[language as keyof typeof messages] || messages.en;
  }
}
