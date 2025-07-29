import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import aiService from '@/services/aiService';
import mcpService from '@/services/mcpService';
import { AppError } from '@/middleware/errorHandler';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  },
});

export class AIController {
  /**
   * 🎯 AI TRANSACTION CATEGORIZATION
   * POST /api/v1/ai/categorize-transaction
   */
  static async categorizeTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { description, amount, merchant, date, currency, exchangeRate } = req.body;
      const tenantId = req.tenant?.tenantId;

      if (!description || !amount || !tenantId) {
        return res.status(400).json({
          error: 'Missing required fields: description, amount, tenantId'
        });
      }

      const request = {
        description,
        amount,
        merchant,
        date,
        currency,
        exchangeRate,
        tenantId
      };

      // Use enhanced categorization with OpenAI
      const result = await aiService.categorizeTransactionEnhanced(request);

      res.json({
        success: true,
        data: result,
        message: 'Transaction categorized successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 📱 OCR RECEIPT PROCESSING
   * POST /api/v1/ai/process-receipt
   */
  static async processReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded'
        });
      }

      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        return res.status(400).json({
          error: 'Tenant context required'
        });
      }

      const result = await aiService.processReceipt(
        req.file.buffer,
        req.file.originalname,
        tenantId
      );

      res.json({
        success: true,
        data: result,
        message: 'Receipt processed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 🔍 AI FINANCIAL INSIGHTS
   * GET /api/v1/ai/insights
   */
  static async getFinancialInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenant?.tenantId;
      const period = req.query.period as '1m' | '3m' | '6m' | '1y' || '3m';

      if (!tenantId) {
        return res.status(400).json({
          error: 'Tenant context required'
        });
      }

      const insights = await aiService.generateFinancialInsights(tenantId, period);

      res.json({
        success: true,
        data: {
          insights,
          period,
          generatedAt: new Date().toISOString(),
          summary: {
            total: insights.length,
            actionable: insights.filter(i => i.actionable).length,
            highImpact: insights.filter(i => i.impact === 'high').length,
            categories: {
              trends: insights.filter(i => i.type === 'expense_trend').length,
              recommendations: insights.filter(i => i.type === 'recommendation').length,
              anomalies: insights.filter(i => i.type === 'anomaly').length,
              forecasts: insights.filter(i => i.type === 'forecast').length
            }
          }
        },
        message: 'Financial insights generated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 📊 AI CASH FLOW FORECASTING
   * GET /api/v1/ai/forecast-cashflow
   */
  static async forecastCashFlow(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenant?.tenantId;
      const periods = parseInt(req.query.periods as string) || 6;

      if (!tenantId) {
        return res.status(400).json({
          error: 'Tenant context required'
        });
      }

      if (periods < 1 || periods > 24) {
        return res.status(400).json({
          error: 'Periods must be between 1 and 24'
        });
      }

      const forecast = await aiService.forecastCashFlow(tenantId, periods);

      res.json({
        success: true,
        data: {
          forecast,
          metadata: {
            periods,
            tenantId,
            generatedAt: new Date().toISOString(),
            model: 'BigQuery ML + Gemini Analysis',
            summary: {
              totalPeriods: forecast.periods.length,
              averageNetFlow: forecast.periods.reduce((sum, p) => sum + p.netCashFlow, 0) / forecast.periods.length,
              positiveFlowPeriods: forecast.periods.filter(p => p.netCashFlow > 0).length,
              riskPeriods: forecast.periods.filter(p => p.netCashFlow < 0).length
            }
          }
        },
        message: 'Cash flow forecast generated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 🕵️ AI ANOMALY DETECTION
   * GET /api/v1/ai/detect-anomalies
   */
  static async detectAnomalies(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenant?.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          error: 'Tenant context required'
        });
      }

      const anomalies = await aiService.detectAnomalies(tenantId);

      res.json({
        success: true,
        data: {
          anomalies,
          summary: {
            total: anomalies.length,
            high: anomalies.filter(a => a.severity === 'high').length,
            medium: anomalies.filter(a => a.severity === 'medium').length,
            low: anomalies.filter(a => a.severity === 'low').length
          },
          recommendations: [
            'Review high severity anomalies immediately',
            'Set up automated alerts for future detection',
            'Implement additional validation rules',
            'Consider expense policy updates'
          ]
        },
        message: 'Anomaly detection completed'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 🤖 MCP AGENT STATUS
   * GET /api/v1/ai/agents
   */
  static async getAgentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const agents = mcpService.getAgents();
      const activeTasks = mcpService.getActiveTasks();
      const mcpStatus = mcpService.getStatus();

      res.json({
        success: true,
        data: {
          agents,
          activeTasks,
          status: mcpStatus,
          capabilities: {
            'Transaction Categorization': 'AI-powered automatic transaction categorization',
            'Account Reconciliation': 'Smart reconciliation with anomaly detection',
            'Financial Analysis': 'Advanced pattern recognition and trend analysis',
            'Cash Flow Forecasting': 'ML-powered predictive analytics',
            'Compliance Auditing': 'Automated compliance and risk assessment',
            'OCR Processing': 'Receipt and invoice data extraction'
          }
        },
        message: 'AI agent status retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 🚀 AI SMART SUGGESTIONS
   * GET /api/v1/ai/suggestions
   */
  static async getSmartSuggestions(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenant?.tenantId;
      const context = req.query.context as string || 'general';

      if (!tenantId) {
        return res.status(400).json({
          error: 'Tenant context required'
        });
      }

      // Generate contextual AI suggestions
      const suggestions = await AIController.generateSmartSuggestions(tenantId, context);

      res.json({
        success: true,
        data: {
          suggestions,
          context,
          priority: 'high',
          actionable: suggestions.filter(s => s.actionable).length
        },
        message: 'Smart suggestions generated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 🗣️ NATURAL LANGUAGE QUERY PROCESSING
   * POST /api/v1/ai/query
   */
  static async processNaturalLanguageQuery(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = req.body;
      const tenantId = req.tenant?.tenantId;

      if (!query || !tenantId) {
        return res.status(400).json({
          error: 'Missing required fields: query, tenantId'
        });
      }

      // Use enhanced natural language processing with OpenAI
      const result = await aiService.processNaturalLanguageQuery(query, tenantId);

      res.json({
        success: true,
        data: result,
        message: 'Query processed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 🤖 AI ASSIST FOR INVOICE CREATION
   * Advanced AI-powered assistance for smart invoice creation
   */
  static async aiAssistInvoiceCreation(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { action, data } = req.body;
      // Use the imported aiService

      switch (action) {
        case 'smart_item_completion':
          const itemSuggestions = await aiService.processNaturalLanguageQuery(
            `For a business invoice, suggest complete details for this item: "${data.description}". Include realistic pricing, category, and tax information. Respond in JSON format with: {suggestions: [{description, unitPrice, category, taxRate, notes}]}`,
            tenantId
          );
          res.json(itemSuggestions);
          break;

        case 'customer_insights':
          // Get customer payment history and preferences
          const customerInsights = await AIController.generateCustomerInsights(data.customerId, tenantId);
          res.json(customerInsights);
          break;

        case 'pricing_optimization':
          const pricingAdvice = await aiService.processNaturalLanguageQuery(
            `Analyze this invoice data and suggest pricing optimizations: ${JSON.stringify(data)}. Consider market rates, customer history, and profitability.`,
            tenantId
          );
          res.json(pricingAdvice);
          break;

        case 'invoice_review':
          const reviewResults = await AIController.reviewInvoiceBeforeSend(data.invoice, tenantId);
          res.json(reviewResults);
          break;

        case 'voice_to_invoice':
          const voiceProcessing = await AIController.processVoiceInput(data.audioText, tenantId);
          res.json(voiceProcessing);
          break;

        default:
          res.status(400).json({ error: 'Unknown AI assist action' });
      }
    } catch (error) {
      console.error('AI Assist error:', error);
      res.status(500).json({ error: 'AI assistance failed' });
    }
  }

  /**
   * 🔍 GENERATE CUSTOMER INSIGHTS
   * Analyze customer data for intelligent suggestions
   */
  private static async generateCustomerInsights(customerId: string, tenantId: string) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      // Get customer with invoice history
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          invoices: {
            include: {
              items: true,
              payments: true
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      await prisma.$disconnect();

      if (!customer) {
        return { error: 'Customer not found' };
      }

      // Analyze customer patterns with AI
      const analysisPrompt = `Analyze this customer's invoice history and provide insights:
      
Customer: ${customer.name}
Payment Terms: ${customer.paymentTerms} days
Recent Invoices: ${customer.invoices.length}
Total Value: $${customer.invoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount.toString()), 0)}

Provide insights in JSON format:
{
  "paymentPattern": "description of payment behavior",
  "preferredItems": ["list of commonly purchased items"],
  "riskLevel": "low/medium/high",
  "suggestedPaymentTerms": number,
  "recommendedPricing": "pricing strategy recommendations",
  "insights": ["key insights about this customer"]
}`;

      const analysis = await aiService.processNaturalLanguageQuery(analysisPrompt, tenantId);
      
      return {
        customer: {
          name: customer.name,
          email: customer.email,
          totalInvoices: customer.invoices.length,
          totalValue: customer.invoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount.toString()), 0),
          averageInvoiceValue: customer.invoices.length > 0 
            ? customer.invoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount.toString()), 0) / customer.invoices.length 
            : 0
        },
        aiInsights: analysis,
        recentActivity: customer.invoices.slice(0, 3).map((inv: any) => ({
          invoiceNumber: inv.invoiceNumber,
          amount: inv.totalAmount,
          status: inv.status,
          date: inv.issueDate
        }))
      };
    } catch (error) {
      console.error('Customer insights error:', error);
      return { error: 'Failed to generate customer insights' };
    }
  }

  /**
   * 📋 REVIEW INVOICE BEFORE SEND
   * AI-powered invoice quality check and optimization
   */
  private static async reviewInvoiceBeforeSend(invoice: any, tenantId: string) {
    try {
      
      const reviewPrompt = `Review this invoice for completeness, accuracy, and professionalism:

Invoice Details:
- Customer: ${invoice.customer}
- Total: $${invoice.total}
- Items: ${invoice.items.length}
- Due Date: ${invoice.dueDate}

Items:
${invoice.items.map((item: any) => `- ${item.description}: ${item.quantity} x $${item.unitPrice}`).join('\n')}

Provide a comprehensive review in JSON format:
{
  "overallScore": number (1-10),
  "completenessCheck": {
    "missingFields": ["list of missing required fields"],
    "score": number (1-10)
  },
  "professionalism": {
    "suggestions": ["formatting and presentation improvements"],
    "score": number (1-10)
  },
  "pricing": {
    "analysis": "pricing analysis",
    "suggestions": ["pricing optimization suggestions"],
    "score": number (1-10)
  },
  "recommendations": ["overall recommendations for improvement"],
  "readyToSend": boolean,
  "priority": "low/medium/high"
}`;

      const review = await aiService.processNaturalLanguageQuery(reviewPrompt, tenantId);
      
      return {
        review,
        timestamp: new Date().toISOString(),
        invoiceId: invoice.id
      };
    } catch (error) {
      console.error('Invoice review error:', error);
      return { error: 'Failed to review invoice' };
    }
  }

  /**
   * 🎤 PROCESS VOICE INPUT
   * Convert voice commands to invoice actions
   */
  private static async processVoiceInput(audioText: string, tenantId: string) {
    try {
      
      const voicePrompt = `Convert this voice input into structured invoice data:

Voice Input: "${audioText}"

Extract and format as JSON:
{
  "action": "create_item|add_customer|set_amount|etc",
  "extractedData": {
    "description": "item description if mentioned",
    "quantity": number or null,
    "unitPrice": number or null,
    "customer": "customer name if mentioned",
    "dueDate": "date if mentioned",
    "notes": "any additional notes"
  },
  "confidence": number (0-1),
  "requiresClarification": boolean,
  "clarificationQuestions": ["questions to ask user if needed"]
}`;

      const voiceResult = await aiService.processNaturalLanguageQuery(voicePrompt, tenantId);
      
      return {
        voiceResult,
        timestamp: new Date().toISOString(),
        originalText: audioText
      };
    } catch (error) {
      console.error('Voice processing error:', error);
      return { error: 'Failed to process voice input' };
    }
  }

  // Private helper methods

  private static async generateSmartSuggestions(tenantId: string, context: string) {
    // Mock smart suggestions - replace with actual AI implementation
    const suggestions = [
      {
        id: 'suggest_001',
        title: 'Automate Recurring Transactions',
        description: 'Set up automatic categorization for recurring monthly expenses like office rent and utilities',
        type: 'automation',
        impact: 'medium',
        actionable: true,
        estimatedTimeSaving: '2 hours/month'
      },
      {
        id: 'suggest_002',
        title: 'Optimize Tax Deductions',
        description: 'Review meal & entertainment expenses for tax optimization opportunities',
        type: 'tax_optimization',
        impact: 'high',
        actionable: true,
        estimatedSaving: '$1,200/year'
      },
      {
        id: 'suggest_003',
        title: 'Improve Cash Flow',
        description: 'Negotiate 30-day payment terms with top 3 suppliers to improve cash flow',
        type: 'cash_flow',
        impact: 'high',
        actionable: true,
        estimatedImpact: '+$15,000 working capital'
      },
      {
        id: 'suggest_004',
        title: 'Expense Policy Compliance',
        description: 'Implement automated expense policy checks to prevent compliance issues',
        type: 'compliance',
        impact: 'medium',
        actionable: true,
        riskReduction: 'High'
      }
    ];

    return suggestions;
  }

  private static async processNLQuery(query: string, tenantId: string) {
    // Mock natural language processing - replace with actual AI implementation
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('cash flow') || queryLower.includes('money')) {
      return {
        type: 'cash_flow_query',
        answer: 'Your current cash flow is positive with $45,000 projected inflow and $38,000 outflow for next month. Net positive flow of $7,000.',
        data: {
          currentBalance: 125000,
          projectedInflow: 45000,
          projectedOutflow: 38000,
          netFlow: 7000
        },
        confidence: 0.89,
        followUpQuestions: [
          'Would you like a detailed cash flow forecast?',
          'Shall I analyze your largest expense categories?',
          'Do you want recommendations to improve cash flow?'
        ]
      };
    }

    if (queryLower.includes('expense') || queryLower.includes('spending')) {
      return {
        type: 'expense_query',
        answer: 'Your largest expense categories this month are: Office Expenses ($5,200), Travel ($3,800), and Marketing ($2,100).',
        data: {
          totalExpenses: 25600,
          topCategories: [
            { category: 'Office Expenses', amount: 5200 },
            { category: 'Travel', amount: 3800 },
            { category: 'Marketing', amount: 2100 }
          ]
        },
        confidence: 0.92,
        followUpQuestions: [
          'Would you like to see expense trends over time?',
          'Should I identify cost-saving opportunities?',
          'Do you want to set up expense alerts?'
        ]
      };
    }

    return {
      type: 'general_query',
      answer: 'I can help you with cash flow analysis, expense tracking, financial insights, and bookkeeping automation. What specific information would you like?',
      suggestions: [
        'Ask about cash flow forecasts',
        'Inquire about expense categories',
        'Request financial insights',
        'Get help with transaction categorization'
      ],
      confidence: 0.75
    };
  }

  /**
   * Get upload middleware for receipts
   */
  static getUploadMiddleware() {
    return upload.single('receipt');
  }
}

export default AIController; 