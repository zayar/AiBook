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

/**
 * 🌍 Improved Financial AI with Multilingual Support
 * Works without requiring Vertex AI credentials
 */
export class ImprovedFinancialAI {
  private reportingEngine: ReportingEngine;

  // Language mappings for financial terms
  private readonly financialTerms = {
    en: {
      revenue: ['revenue', 'income', 'sales', 'earnings'],
      profit: ['profit', 'net income', 'earnings'],
      loss: ['loss', 'deficit'],
      expense: ['expense', 'cost', 'spending'],
      cash_flow: ['cash flow', 'cashflow'],
      balance_sheet: ['balance sheet', 'balance'],
      total: ['total', 'sum'],
      this_month: ['this month', 'current month'],
      report: ['report', 'statement']
    },
    my: {
      revenue: ['ဝင်ငွေ', 'ငွေဝင်', 'ရောင်းအား'],
      profit: ['အမြတ်', 'အမြတ်ငွေ'],
      loss: ['အရှုံး', 'အရှုံးငွေ'],
      expense: ['ကုန်ကျစရိတ်', 'ကုန်ကျ'],
      cash_flow: ['ငွေကြေးစီးဆင်းမှု'],
      balance_sheet: ['လက်ကျန်စာရင်း'],
      total: ['စုစုပေါင်း', 'စုစုပါင်း'],
      this_month: ['ဒီလ', 'ယခုလ'],
      report: ['အစီရင်ခံစာ', 'စာရင်း']
    },
    zh: {
      revenue: ['收入', '收益', '销售额', '营收'],
      profit: ['利润', '净利润', '盈利'],
      loss: ['亏损', '损失'],
      expense: ['费用', '支出', '成本'],
      cash_flow: ['现金流', '资金流'],
      balance_sheet: ['资产负债表', '资产表'],
      total: ['总计', '总额', '合计'],
      this_month: ['本月', '这个月'],
      report: ['报告', '报表']
    },
    th: {
      revenue: ['รายได้', 'ยอดขาย', 'รายรับ'],
      profit: ['กำไร', 'ผลกำไร'],
      loss: ['ขาดทุน', 'การสูญเสีย'],
      expense: ['ค่าใช้จ่าย', 'รายจ่าย'],
      cash_flow: ['กระแสเงินสด', 'การไหลของเงิน'],
      balance_sheet: ['งบดุล', 'งบแสดงฐานะการเงิน'],
      total: ['รวม', 'ทั้งหมด'],
      this_month: ['เดือนนี้', 'ประจำเดือนนี้'],
      report: ['รายงาน', 'งบการเงิน']
    }
  };

  private readonly responses = {
    en: {
      greeting: "Hello! I'm your AI financial assistant. I can help you with revenue analysis, expenses, profit & loss, and cash flow reports.",
      revenue_summary: "Here's your revenue summary for this month:",
      profit_summary: "Here's your profit & loss summary:",
      no_data: "I couldn't find any financial data for your query. Please make sure you have transactions recorded.",
      error: "I'm sorry, I encountered an error processing your request. Please try again."
    },
    my: {
      greeting: "မင်္ဂလာပါ! ကျွန်ုပ်သည် သင့်ရဲ့ AI ဘဏ္ဍာရေးလက်ထောက်ဖြစ်ပါတယ်။ ဝင်ငွေခွဲခြမ်းစိတ်ဖြာမှု၊ ကုန်ကျစရိတ်၊ အမြတ်အရှုံးနှင့် ငွေကြေးစီးဆင်းမှုအစီရင်ခံစာများနှင့် ကူညီနိုင်ပါတယ်။",
      revenue_summary: "ဒီလအတွက် သင့်ရဲ့ ဝင်ငွေအကျဉ်းချုပ်ကို ဖော်ပြပေးပါမယ်:",
      profit_summary: "သင့်ရဲ့ အမြတ်အရှုံးအကျဉ်းချုပ်ကို ဖော်ပြပေးပါမယ်:",
      no_data: "သင့်မေးခွန်းအတွက် ဘဏ္ဍာရေးအချက်အလက်များ မတွေ့ရပါ။ ငွေကြေးလွှဲပြောင်းမှုများ မှတ်တမ်းတင်ထားကြောင်း သေချာပါစေ။",
      error: "ဝမ်းနည်းပါတယ်၊ သင့်တောင်းဆိုချက်ကို ကိုင်တွယ်ရာတွင် အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့ပါတယ်။ ကျေးဇူးပြု၍ ထပ်မံကြိုးစားကြည့်ပါ။"
    },
    zh: {
      greeting: "您好！我是您的AI财务助理。我可以帮您分析收入、费用、损益和现金流报告。",
      revenue_summary: "这是您本月的收入摘要：",
      profit_summary: "这是您的损益摘要：",
      no_data: "我无法找到您查询的财务数据。请确保您已记录了相关交易。",
      error: "抱歉，处理您的请求时遇到了错误。请重试。"
    },
    th: {
      greeting: "สวัสดีครับ! ฉันเป็นผู้ช่วย AI ด้านการเงินของคุณ ฉันสามารถช่วยวิเคราะห์รายได้ ค่าใช้จ่าย กำไรขาดทุน และรายงานกระแสเงินสดได้",
      revenue_summary: "นี่คือสรุปรายได้ของคุณสำหรับเดือนนี้:",
      profit_summary: "นี่คือสรุปกำไรขาดทุนของคุณ:",
      no_data: "ฉันไม่พบข้อมูลทางการเงินสำหรับคำถามของคุณ กรุณาตรวจสอบให้แน่ใจว่าคุณได้บันทึกธุรกรรมแล้ว",
      error: "ขออภัย เกิดข้อผิดพลาดในการประมวลผลคำขอของคุณ กรุณาลองใหม่อีกครั้ง"
    }
  };

  constructor(tenantId: string) {
    this.reportingEngine = new ReportingEngine(tenantId);
  }

  /**
   * Process user query in multiple languages
   */
  async processQuery(message: string, context: ConversationContext): Promise<ConversationResponse> {
    const startTime = Date.now();
    
    try {
      // 1. Detect language if not provided
      const detectedLanguage = context.language || this.detectLanguage(message);
      
      // 2. Extract intent and entities
      const analysis = this.analyzeMessage(message, detectedLanguage);
      
      // 3. Get financial data if needed
      let financialData = null;
      let report = null;
      
      if (analysis.intent === 'financial_query') {
        try {
          const queryResult = await this.executeFinancialQuery(analysis.entities);
          financialData = queryResult.data;
          report = queryResult;
        } catch (error) {
          console.error('Error executing financial query:', error);
          // Continue with generic response
        }
      }
      
      // 4. Generate response in appropriate language
      const response = this.generateResponse(analysis, financialData, detectedLanguage);
      
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
      const language = context.language || 'en';
      return {
        response: this.responses[language].error,
        intent: 'error',
        confidence: 0,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Analyze user message to extract intent and entities
   */
  private analyzeMessage(message: string, language: string) {
    const lowerMessage = message.toLowerCase();
    const terms = this.financialTerms[language as keyof typeof this.financialTerms];
    
    let intent = 'general';
    let confidence = 0.3;
    let entities: any = {};

    // Check for financial terms
    if (this.containsAnyTerm(lowerMessage, terms.revenue) || 
        this.containsAnyTerm(lowerMessage, terms.profit) ||
        this.containsAnyTerm(lowerMessage, terms.expense)) {
      intent = 'financial_query';
      confidence = 0.8;

      // Determine report type
      if (this.containsAnyTerm(lowerMessage, terms.revenue)) {
        entities.reportType = 'revenue';
      } else if (this.containsAnyTerm(lowerMessage, terms.profit)) {
        entities.reportType = 'profit_loss';
      } else if (this.containsAnyTerm(lowerMessage, terms.expense)) {
        entities.reportType = 'expenses';
      } else if (this.containsAnyTerm(lowerMessage, terms.cash_flow)) {
        entities.reportType = 'cash_flow';
      } else if (this.containsAnyTerm(lowerMessage, terms.balance_sheet)) {
        entities.reportType = 'balance_sheet';
      }

      // Check for timeframe
      if (this.containsAnyTerm(lowerMessage, terms.this_month)) {
        entities.timeframe = 'this_month';
      }
    }

    // Check for greeting
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'မင်္ဂလာပါ', '你好', 'สวัสดี'];
    if (greetings.some(greeting => lowerMessage.includes(greeting))) {
      intent = 'greeting';
      confidence = 0.9;
    }

    return {
      intent,
      confidence,
      entities,
      detectedLanguage: language
    };
  }

  /**
   * Check if message contains any of the given terms
   */
  private containsAnyTerm(message: string, terms: string[]): boolean {
    return terms.some(term => message.includes(term.toLowerCase()));
  }

  /**
   * Execute financial query and get real data
   */
  private async executeFinancialQuery(entities: any) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    try {
      switch (entities.reportType) {
        case 'profit_loss':
        case 'revenue':
          const incomeStmt = await this.reportingEngine.generateIncomeStatement(startOfMonth, endOfMonth);
          return {
            type: 'report',
            data: incomeStmt,
            summary: {
              revenue: incomeStmt.totals.totalRevenue,
              netIncome: incomeStmt.totals.netIncome,
              profitMargin: (incomeStmt.totals.netIncome / incomeStmt.totals.totalRevenue * 100)
            }
          };

        case 'cash_flow':
          const cashFlow = await this.reportingEngine.generateCashFlowStatement(startOfMonth, endOfMonth);
          return {
            type: 'report',
            data: cashFlow,
            summary: {
              operatingCashFlow: cashFlow.totals.operatingCashFlow,
              netCashFlow: cashFlow.totals.netCashFlow
            }
          };

        case 'balance_sheet':
          const balanceSheet = await this.reportingEngine.generateBalanceSheet(endOfMonth);
          return {
            type: 'report',
            data: balanceSheet,
            summary: {
              totalAssets: balanceSheet.totals.totalAssets,
              totalEquity: balanceSheet.totals.totalEquity
            }
          };

        case 'expenses':
          const expenseStmt = await this.reportingEngine.generateIncomeStatement(startOfMonth, endOfMonth);
          return {
            type: 'summary',
            data: { totalExpenses: expenseStmt.totals.totalOperatingExpenses },
            summary: {
              totalExpenses: expenseStmt.totals.totalOperatingExpenses
            }
          };

        default:
          // Default to revenue summary
          const summary = await this.reportingEngine.generateIncomeStatement(startOfMonth, endOfMonth);
          return {
            type: 'summary',
            data: summary.totals,
            summary: {
              revenue: summary.totals.totalRevenue,
              profit: summary.totals.netIncome,
              profitMargin: (summary.totals.netIncome / summary.totals.totalRevenue * 100)
            }
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
  private generateResponse(analysis: any, financialData: any, language: string) {
    const lang = language as keyof typeof this.responses;
    const langResponses = this.responses[lang] || this.responses.en;

    let text = '';
    let followUpQuestions: string[] = [];

    if (analysis.intent === 'greeting') {
      text = langResponses.greeting;
      followUpQuestions = this.getGreetingFollowUps(language);
    } else if (analysis.intent === 'financial_query' && financialData) {
      const { summary } = financialData;
      
      if (analysis.entities.reportType === 'revenue' || analysis.entities.reportType === 'profit_loss') {
        text = `${langResponses.revenue_summary}\n\n`;
        if (summary.revenue) {
          text += this.formatCurrency(summary.revenue, language) + ' ' + this.getTerm('revenue', language);
          if (summary.netIncome) {
            text += '\n' + this.getTerm('profit', language) + ': ' + this.formatCurrency(summary.netIncome, language);
            if (summary.profitMargin) {
              text += '\n' + this.getTerm('profit_margin', language) + ': ' + summary.profitMargin.toFixed(1) + '%';
            }
          }
        }
      } else if (analysis.entities.reportType === 'expenses') {
        text = this.getTerm('total', language) + ' ' + this.getTerm('expense', language) + ': ' + this.formatCurrency(summary.totalExpenses, language);
      } else {
        text = langResponses.revenue_summary + '\n' + this.formatFinancialSummary(summary, language);
      }
      
      followUpQuestions = this.getFinancialFollowUps(language);
    } else {
      text = langResponses.no_data;
      followUpQuestions = this.getHelpFollowUps(language);
    }

    return {
      text,
      followUpQuestions
    };
  }

  /**
   * Detect language from user input
   */
  private detectLanguage(message: string): string {
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
   * Format currency based on language
   */
  private formatCurrency(amount: number, language: string): string {
    const formatted = amount.toLocaleString();
    return `MMK ${formatted}`;
  }

  /**
   * Get financial term in specified language
   */
  private getTerm(term: string, language: string): string {
    const termMap: any = {
      en: {
        revenue: 'Revenue',
        profit: 'Profit',
        expense: 'Expenses',
        total: 'Total',
        profit_margin: 'Profit Margin'
      },
      my: {
        revenue: 'ဝင်ငွေ',
        profit: 'အမြတ်',
        expense: 'ကုန်ကျစရိတ်',
        total: 'စုစုပေါင်း',
        profit_margin: 'အမြတ်ရာခိုင်နှုန်း'
      },
      zh: {
        revenue: '收入',
        profit: '利润',
        expense: '费用',
        total: '总计',
        profit_margin: '利润率'
      },
      th: {
        revenue: 'รายได้',
        profit: 'กำไร',
        expense: 'ค่าใช้จ่าย',
        total: 'รวม',
        profit_margin: 'อัตรากำไร'
      }
    };

    return termMap[language]?.[term] || termMap.en[term] || term;
  }

  /**
   * Format financial summary
   */
  private formatFinancialSummary(summary: any, language: string): string {
    let text = '';
    if (summary.revenue) {
      text += this.getTerm('revenue', language) + ': ' + this.formatCurrency(summary.revenue, language);
    }
    if (summary.profit || summary.netIncome) {
      text += '\n' + this.getTerm('profit', language) + ': ' + this.formatCurrency(summary.profit || summary.netIncome, language);
    }
    return text;
  }

  /**
   * Get follow-up questions for greetings
   */
  private getGreetingFollowUps(language: string): string[] {
    const questions = {
      en: [
        "What's our revenue this month?",
        "Show me profit and loss",
        "How are our expenses?",
        "Generate cash flow report"
      ],
      my: [
        "ဒီလ ဝင်ငွေ ဘယ်လောက်လဲ?",
        "အမြတ်အရှုံး ပြပါ",
        "ကုန်ကျစရိတ် ဘယ်လိုလဲ?",
        "ငွေကြေးစီးဆင်းမှု အစီရင်ခံစာ ပြပါ"
      ],
      zh: [
        "这个月的收入是多少？",
        "显示损益情况",
        "我们的费用如何？",
        "生成现金流报告"
      ],
      th: [
        "รายได้เดือนนี้เท่าไหร่?",
        "แสดงกำไรขาดทุน",
        "ค่าใช้จ่ายของเราเป็นอย่างไร?",
        "สร้างรายงานกระแสเงินสด"
      ]
    };

    return questions[language as keyof typeof questions] || questions.en;
  }

  /**
   * Get follow-up questions for financial queries
   */
  private getFinancialFollowUps(language: string): string[] {
    const questions = {
      en: [
        "Compare with last month?",
        "Show detailed breakdown?",
        "View cash flow?",
        "Check expenses?"
      ],
      my: [
        "ပြီးခဲ့သောလနှင့် နှိုင်းယှဉ်မလား?",
        "အသေးစိတ် ပြမလား?",
        "ငွေကြေးစီးဆင်းမှု ကြည့်မလား?",
        "ကုန်ကျစရိတ် စစ်ဆေးမလား?"
      ],
      zh: [
        "与上月比较？",
        "显示详细分解？",
        "查看现金流？",
        "检查费用？"
      ],
      th: [
        "เปรียบเทียบกับเดือนที่แล้ว？",
        "แสดงรายละเอียด？",
        "ดูกระแสเงินสด？",
        "ตรวจสอบค่าใช้จ่าย？"
      ]
    };

    return questions[language as keyof typeof questions] || questions.en;
  }

  /**
   * Get help follow-up questions
   */
  private getHelpFollowUps(language: string): string[] {
    const questions = {
      en: [
        "Ask about revenue",
        "Check profit & loss",
        "View expenses",
        "Get financial summary"
      ],
      my: [
        "ဝင်ငွေအကြောင်း မေးပါ",
        "အမြတ်အရှုံး စစ်ဆေးပါ",
        "ကုန်ကျစရိတ် ကြည့်ပါ",
        "ဘဏ္ဍာရေးအကျဉ်းချုပ် ယူပါ"
      ],
      zh: [
        "询问收入",
        "检查损益",
        "查看费用",
        "获取财务摘要"
      ],
      th: [
        "ถามเกี่ยวกับรายได้",
        "ตรวจสอบกำไรขาดทุน",
        "ดูค่าใช้จ่าย",
        "รับสรุปทางการเงิน"
      ]
    };

    return questions[language as keyof typeof questions] || questions.en;
  }
}
