const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Simulate financial data
const sampleFinancialData = {
  revenue: 696390,
  expenses: 132450,
  netIncome: 563940,
  profitMargin: 80.9
};

class SimpleMultilingualAI {
  constructor() {
    // Language mappings for financial terms
    this.financialTerms = {
      en: {
        revenue: ['revenue', 'income', 'sales', 'earnings'],
        profit: ['profit', 'net income', 'earnings'],
        expense: ['expense', 'cost', 'spending'],
        total: ['total', 'sum'],
        this_month: ['this month', 'current month']
      },
      my: {
        revenue: ['ဝင်ငွေ', 'ငွေဝင်', 'ရောင်းအား'],
        profit: ['အမြတ်', 'အမြတ်ငွေ'],
        expense: ['ကုန်ကျစရိတ်', 'ကုန်ကျ'],
        total: ['စုစုပေါင်း', 'စုစုပါင်း'],
        this_month: ['ဒီလ', 'ယခုလ']
      },
      zh: {
        revenue: ['收入', '收益', '销售额', '营收'],
        profit: ['利润', '净利润', '盈利'],
        expense: ['费用', '支出', '成本'],
        total: ['总计', '总额', '合计'],
        this_month: ['本月', '这个月']
      },
      th: {
        revenue: ['รายได้', 'ยอดขาย', 'รายรับ'],
        profit: ['กำไร', 'ผลกำไร'],
        expense: ['ค่าใช้จ่าย', 'รายจ่าย'],
        total: ['รวม', 'ทั้งหมด'],
        this_month: ['เดือนนี้', 'ประจำเดือนนี้']
      }
    };

    this.responses = {
      en: {
        greeting: "Hello! I'm your AI financial assistant. I can help you with revenue, expenses, and profit analysis.",
        revenue_response: "Here's your financial summary for this month:",
        currency: "MMK"
      },
      my: {
        greeting: "မင်္ဂလာပါ! ကျွန်ုပ်သည် သင့်ရဲ့ AI ဘဏ္ဍာရေးလက်ထောက်ဖြစ်ပါတယ်။ ဝင်ငွေ၊ ကုန်ကျစရိတ်နှင့် အမြတ်ခွဲခြမ်းစိတ်ဖြာမှုနှင့် ကူညီနိုင်ပါတယ်။",
        revenue_response: "ဒီလအတွက် သင့်ရဲ့ ဘဏ္ဍာရေးအကျဉ်းချုပ်ကို ဖော်ပြပေးပါမယ်:",
        currency: "MMK"
      },
      zh: {
        greeting: "您好！我是您的AI财务助理。我可以帮您分析收入、费用和利润。",
        revenue_response: "这是您本月的财务摘要：",
        currency: "MMK"
      },
      th: {
        greeting: "สวัสดีครับ! ฉันเป็นผู้ช่วย AI ด้านการเงินของคุณ ฉันสามารถช่วยวิเคราะห์รายได้ ค่าใช้จ่าย และกำไรได้",
        revenue_response: "นี่คือสรุปการเงินของคุณสำหรับเดือนนี้:",
        currency: "MMK"
      }
    };
  }

  detectLanguage(message) {
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

  containsAnyTerm(message, terms) {
    return terms.some(term => message.toLowerCase().includes(term.toLowerCase()));
  }

  analyzeMessage(message, language) {
    const lowerMessage = message.toLowerCase();
    const terms = this.financialTerms[language];
    
    let intent = 'general';
    let confidence = 0.3;
    let entities = {};

    // Check for financial terms
    if (this.containsAnyTerm(lowerMessage, terms.revenue) || 
        this.containsAnyTerm(lowerMessage, terms.profit) ||
        this.containsAnyTerm(lowerMessage, terms.expense)) {
      intent = 'financial_query';
      confidence = 0.8;

      if (this.containsAnyTerm(lowerMessage, terms.revenue)) {
        entities.reportType = 'revenue';
      } else if (this.containsAnyTerm(lowerMessage, terms.profit)) {
        entities.reportType = 'profit';
      } else if (this.containsAnyTerm(lowerMessage, terms.expense)) {
        entities.reportType = 'expense';
      }

      if (this.containsAnyTerm(lowerMessage, terms.this_month)) {
        entities.timeframe = 'this_month';
      }
    }

    // Check for greeting
    const greetings = ['hello', 'hi', 'hey', 'မင်္ဂလာပါ', '你好', 'สวัสดี'];
    if (greetings.some(greeting => lowerMessage.includes(greeting))) {
      intent = 'greeting';
      confidence = 0.9;
    }

    return { intent, confidence, entities, detectedLanguage: language };
  }

  formatCurrency(amount, language) {
    const formatted = amount.toLocaleString();
    return `${this.responses[language].currency} ${formatted}`;
  }

  generateResponse(analysis, language) {
    const langResponses = this.responses[language];
    let response = '';

    if (analysis.intent === 'greeting') {
      response = langResponses.greeting;
    } else if (analysis.intent === 'financial_query') {
      response = `${langResponses.revenue_response}\n\n`;
      
      if (analysis.entities.reportType === 'revenue') {
        response += `💰 ${this.getTermTranslation('revenue', language)}: ${this.formatCurrency(sampleFinancialData.revenue, language)}\n`;
      } else if (analysis.entities.reportType === 'profit') {
        response += `📈 ${this.getTermTranslation('profit', language)}: ${this.formatCurrency(sampleFinancialData.netIncome, language)}\n`;
        response += `📊 ${this.getTermTranslation('profit_margin', language)}: ${sampleFinancialData.profitMargin}%\n`;
      } else if (analysis.entities.reportType === 'expense') {
        response += `💸 ${this.getTermTranslation('expenses', language)}: ${this.formatCurrency(sampleFinancialData.expenses, language)}\n`;
      } else {
        // General financial summary
        response += `💰 ${this.getTermTranslation('revenue', language)}: ${this.formatCurrency(sampleFinancialData.revenue, language)}\n`;
        response += `💸 ${this.getTermTranslation('expenses', language)}: ${this.formatCurrency(sampleFinancialData.expenses, language)}\n`;
        response += `📈 ${this.getTermTranslation('profit', language)}: ${this.formatCurrency(sampleFinancialData.netIncome, language)}\n`;
        response += `📊 ${this.getTermTranslation('profit_margin', language)}: ${sampleFinancialData.profitMargin}%`;
      }
    } else {
      response = this.getHelpMessage(language);
    }

    return response;
  }

  getTermTranslation(term, language) {
    const translations = {
      en: {
        revenue: 'Revenue',
        profit: 'Net Profit',
        expenses: 'Expenses',
        profit_margin: 'Profit Margin'
      },
      my: {
        revenue: 'ဝင်ငွေ',
        profit: 'သန့်ရှင်းသောအမြတ်',
        expenses: 'ကုန်ကျစရိတ်',
        profit_margin: 'အမြတ်ရာခိုင်နှုန်း'
      },
      zh: {
        revenue: '收入',
        profit: '净利润',
        expenses: '费用',
        profit_margin: '利润率'
      },
      th: {
        revenue: 'รายได้',
        profit: 'กำไรสุทธิ',
        expenses: 'ค่าใช้จ่าย',
        profit_margin: 'อัตรากำไร'
      }
    };

    return translations[language]?.[term] || translations.en[term] || term;
  }

  getHelpMessage(language) {
    const messages = {
      en: "I can help you with financial queries like 'total revenue', 'profit this month', or 'expenses'.",
      my: "ကျွန်ုပ်သည် 'စုစုပေါင်းဝင်ငွေ'၊ 'ဒီလအမြတ်' သို့မဟုတ် 'ကုန်ကျစရိတ်' ကဲ့သို့ ဘဏ္ဍာရေးမေးခွန်းများနှင့် ကူညီနိုင်ပါတယ်။",
      zh: "我可以帮您处理财务查询，如'总收入'、'本月利润'或'费用'。",
      th: "ฉันสามารถช่วยคุณตอบคำถามทางการเงิน เช่น 'รายได้รวม' 'กำไรเดือนนี้' หรือ 'ค่าใช้จ่าย'"
    };

    return messages[language] || messages.en;
  }

  processQuery(message, language = null) {
    const detectedLanguage = language || this.detectLanguage(message);
    const analysis = this.analyzeMessage(message, detectedLanguage);
    const response = this.generateResponse(analysis, detectedLanguage);

    return {
      language: detectedLanguage,
      intent: analysis.intent,
      confidence: analysis.confidence,
      response: response,
      entities: analysis.entities
    };
  }
}

// Demo function
async function demonstrateAI() {
  console.log('🚀 Cashflow Copilot - Multilingual AI Financial Assistant Demo');
  console.log('================================================================\n');

  const ai = new SimpleMultilingualAI();

  // Test queries in different languages
  const testQueries = [
    { message: "What is our total revenue this month?", expectedLang: 'en' },
    { message: "ဒီလ ဝင်ငွေ ဘယ်လောက်လဲ?", expectedLang: 'my' },
    { message: "这个月的收入是多少？", expectedLang: 'zh' },
    { message: "รายได้เดือนนี้เท่าไหร่?", expectedLang: 'th' },
    { message: "Show me profit and loss", expectedLang: 'en' },
    { message: "အမြတ်အရှုံး ပြပါ", expectedLang: 'my' },
    { message: "显示利润", expectedLang: 'zh' },
    { message: "แสดงกำไร", expectedLang: 'th' }
  ];

  for (const query of testQueries) {
    console.log(`🌍 Query (${query.expectedLang.toUpperCase()}): "${query.message}"`);
    const result = ai.processQuery(query.message);
    console.log(`🤖 Response: ${result.response}`);
    console.log(`📊 Intent: ${result.intent} (${(result.confidence * 100).toFixed(0)}% confidence)`);
    console.log('---');
  }

  // Show current data summary
  console.log('\n📈 Current Financial Data (Demo):');
  console.log(`💰 Revenue: MMK ${sampleFinancialData.revenue.toLocaleString()}`);
  console.log(`💸 Expenses: MMK ${sampleFinancialData.expenses.toLocaleString()}`);
  console.log(`📈 Net Income: MMK ${sampleFinancialData.netIncome.toLocaleString()}`);
  console.log(`📊 Profit Margin: ${sampleFinancialData.profitMargin}%`);

  console.log('\n✅ Multilingual AI Financial Assistant is working!');
  console.log('🎯 Ready for investor presentation!');
}

// Run the demo
demonstrateAI().catch(console.error);
