import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import aiService from './aiService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import { AccountingService } from './accountingService';

interface MCPAgent {
  id: string;
  name: string;
  role: 'categorizer' | 'reconciler' | 'analyst' | 'advisor' | 'auditor';
  capabilities: string[];
  status: 'active' | 'idle' | 'error';
}

interface TaskRequest {
  id: string;
  type: 'categorize_transaction' | 'reconcile_account' | 'generate_insights' | 'audit_entries' | 'forecast_cashflow';
  data: any;
  tenantId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requestedBy: string;
}

interface TaskResult {
  taskId: string;
  agentId: string;
  result: any;
  confidence: number;
  recommendations?: string[];
  nextSteps?: string[];
  timestamp: Date;
}

export class MCPService {
  private static instance: MCPService;
  private server: Server;
  private agents: Map<string, MCPAgent> = new Map();
  private activeTasks: Map<string, TaskRequest> = new Map();
  private taskResults: Map<string, TaskResult> = new Map();

  private constructor() {
    this.server = new Server(
      {
        name: 'aibook-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
    this.initializeAgents();
  }

  static getInstance(): MCPService {
    if (!MCPService.instance) {
      MCPService.instance = new MCPService();
    }
    return MCPService.instance;
  }

  /**
   * Initialize AI agents for different bookkeeping tasks
   */
  private initializeAgents() {
    const agents: MCPAgent[] = [
      {
        id: 'categorizer-001',
        name: 'Transaction Categorizer',
        role: 'categorizer',
        capabilities: ['transaction_categorization', 'expense_classification', 'merchant_analysis'],
        status: 'active'
      },
      {
        id: 'reconciler-001', 
        name: 'Account Reconciler',
        role: 'reconciler',
        capabilities: ['bank_reconciliation', 'balance_verification', 'discrepancy_detection'],
        status: 'active'
      },
      {
        id: 'analyst-001',
        name: 'Financial Analyst',
        role: 'analyst',
        capabilities: ['trend_analysis', 'pattern_recognition', 'performance_metrics'],
        status: 'active'
      },
      {
        id: 'advisor-001',
        name: 'Financial Advisor',
        role: 'advisor',
        capabilities: ['cash_flow_optimization', 'cost_reduction', 'investment_advice'],
        status: 'active'
      },
      {
        id: 'auditor-001',
        name: 'Compliance Auditor',
        role: 'auditor',
        capabilities: ['compliance_check', 'anomaly_detection', 'risk_assessment'],
        status: 'active'
      }
    ];

    agents.forEach(agent => this.agents.set(agent.id, agent));
    console.log(`🤖 Initialized ${agents.length} AI agents for bookkeeping tasks`);
  }

  /**
   * Setup MCP tools for AI agents
   */
  private setupTools() {
    // Transaction categorization tool
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'categorize_transaction',
            description: 'Categorize a financial transaction using AI',
            inputSchema: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                amount: { type: 'number' },
                merchant: { type: 'string' },
                date: { type: 'string' },
                tenantId: { type: 'string' }
              },
              required: ['description', 'amount', 'date', 'tenantId']
            }
          },
          {
            name: 'reconcile_account',
            description: 'Perform AI-assisted account reconciliation',
            inputSchema: {
              type: 'object',
              properties: {
                accountCode: { type: 'string' },
                statementBalance: { type: 'number' },
                statementDate: { type: 'string' },
                tenantId: { type: 'string' }
              },
              required: ['accountCode', 'statementBalance', 'statementDate', 'tenantId']
            }
          },
          {
            name: 'generate_insights',
            description: 'Generate AI-powered financial insights',
            inputSchema: {
              type: 'object',
              properties: {
                tenantId: { type: 'string' },
                period: { type: 'string', enum: ['1m', '3m', '6m', '1y'] },
                focusArea: { type: 'string', enum: ['expenses', 'revenue', 'cashflow', 'all'] }
              },
              required: ['tenantId']
            }
          },
          {
            name: 'audit_entries',
            description: 'Perform AI-powered audit of journal entries',
            inputSchema: {
              type: 'object',
              properties: {
                tenantId: { type: 'string' },
                startDate: { type: 'string' },
                endDate: { type: 'string' },
                riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] }
              },
              required: ['tenantId']
            }
          },
          {
            name: 'forecast_cashflow',
            description: 'Generate AI-powered cash flow forecasts',
            inputSchema: {
              type: 'object',
              properties: {
                tenantId: { type: 'string' },
                periods: { type: 'number', minimum: 1, maximum: 24 },
                scenario: { type: 'string', enum: ['conservative', 'optimistic', 'pessimistic'] }
              },
              required: ['tenantId']
            }
          },
          {
            name: 'smart_reconciliation',
            description: 'AI-powered intelligent reconciliation suggestions',
            inputSchema: {
              type: 'object',
              properties: {
                tenantId: { type: 'string' },
                accountCode: { type: 'string' },
                unmatched_transactions: { type: 'array' }
              },
              required: ['tenantId', 'accountCode']
            }
          }
        ]
      };
    });

    // Tool execution handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'categorize_transaction':
            return await this.handleTransactionCategorization(args);
          
          case 'reconcile_account':
            return await this.handleAccountReconciliation(args);
          
          case 'generate_insights':
            return await this.handleInsightGeneration(args);
          
          case 'audit_entries':
            return await this.handleEntryAudit(args);
          
          case 'forecast_cashflow':
            return await this.handleCashFlowForecast(args);
          
          case 'smart_reconciliation':
            return await this.handleSmartReconciliation(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
        };
      }
    });
  }

  /**
   * 🎯 INTELLIGENT TRANSACTION CATEGORIZATION AGENT
   */
  private async handleTransactionCategorization(args: any) {
    const result = await aiService.categorizeTransaction({
      description: args.description,
      amount: args.amount,
      merchant: args.merchant,
      date: args.date,
      tenantId: args.tenantId
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            category: result.category,
            subcategory: result.subcategory,
            confidence: result.confidence,
            reasoning: result.reasoning,
            suggestedAccount: result.suggestedAccount,
            tags: result.tags,
            recommendations: [
              `Auto-assign to account ${result.suggestedAccount}`,
              `Set recurring rule for ${args.merchant}`,
              'Review similar transactions for consistency'
            ]
          }, null, 2)
        }
      ]
    };
  }

  /**
   * 🔄 SMART ACCOUNT RECONCILIATION AGENT
   */
  private async handleAccountReconciliation(args: any) {
    // Get account balance and recent transactions
    const accountingService = new AccountingService({ tenantId: args.tenantId });
    const balance = await accountingService.getAccountBalance(args.accountCode);
    
    const reconciliationResult = {
      accountCode: args.accountCode,
      bookBalance: balance.netBalance,
      statementBalance: args.statementBalance,
      difference: args.statementBalance - balance.netBalance,
      status: Math.abs(args.statementBalance - balance.netBalance) < 0.01 ? 'balanced' : 'unbalanced',
      suggestions: [] as string[]
    };

    if (reconciliationResult.status === 'unbalanced') {
      reconciliationResult.suggestions = [
        'Check for outstanding checks or deposits in transit',
        'Review bank fees or service charges',
        'Look for duplicate or missing transactions',
        'Verify exchange rates for foreign currency transactions'
      ];
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(reconciliationResult, null, 2)
        }
      ]
    };
  }

  /**
   * 📊 FINANCIAL INSIGHTS GENERATION AGENT
   */
  private async handleInsightGeneration(args: any) {
    const insights = await aiService.generateFinancialInsights(
      args.tenantId,
      args.period || '3m'
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            insights,
            summary: `Generated ${insights.length} insights for ${args.period || '3m'} period`,
            actionableItems: insights.filter(i => i.actionable).length,
            highImpactItems: insights.filter(i => i.impact === 'high').length
          }, null, 2)
        }
      ]
    };
  }

  /**
   * 🕵️ AUDIT AGENT
   */
  private async handleEntryAudit(args: any) {
    const anomalies = await aiService.detectAnomalies(args.tenantId);
    
    const auditResult = {
      tenantId: args.tenantId,
      auditDate: new Date().toISOString(),
      anomaliesFound: anomalies.length,
      riskLevel: anomalies.some(a => a.severity === 'high') ? 'high' : 
                 anomalies.some(a => a.severity === 'medium') ? 'medium' : 'low',
      anomalies,
      recommendations: [
        'Implement approval workflows for large transactions',
        'Set up automated expense policy compliance checks',
        'Review and update transaction limits',
        'Enable real-time fraud detection alerts'
      ]
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(auditResult, null, 2)
        }
      ]
    };
  }

  /**
   * 📈 CASH FLOW FORECASTING AGENT
   */
  private async handleCashFlowForecast(args: any) {
    const forecast = await aiService.forecastCashFlow(
      args.tenantId,
      args.periods || 6
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            forecast,
            scenario: args.scenario || 'realistic',
            summary: {
              totalPeriods: forecast.periods.length,
              averageNetFlow: forecast.periods.reduce((sum, p) => sum + p.netCashFlow, 0) / forecast.periods.length,
              riskPeriods: forecast.periods.filter(p => p.netCashFlow < 0).length
            }
          }, null, 2)
        }
      ]
    };
  }

  /**
   * 🔍 SMART RECONCILIATION AGENT
   */
  private async handleSmartReconciliation(args: any) {
    // AI-powered matching of unmatched transactions
    const suggestions = {
      automaticMatches: [
        {
          bankTransaction: 'DEPOSIT $1,500.00',
          bookEntry: 'Customer Payment - Invoice #1234',
          confidence: 0.95,
          reason: 'Amount and timing match perfectly'
        }
      ],
      possibleMatches: [
        {
          bankTransaction: 'AMAZON.COM $45.67',
          bookEntries: [
            { entry: 'Office Supplies $45.67', confidence: 0.89 },
            { entry: 'Amazon Purchase $45.67', confidence: 0.92 }
          ]
        }
      ],
      recommendedActions: [
        'Auto-match high confidence transactions (>90%)',
        'Review possible matches for manual approval',
        'Create recurring rules for frequent merchants',
        'Set up automatic categorization for known payees'
      ]
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(suggestions, null, 2)
        }
      ]
    };
  }

  /**
   * Assign task to appropriate agent
   */
  async assignTask(task: TaskRequest): Promise<string> {
    // Simple agent selection based on task type
    const agentMap: Record<string, string> = {
      'categorize_transaction': 'categorizer-001',
      'reconcile_account': 'reconciler-001', 
      'generate_insights': 'analyst-001',
      'audit_entries': 'auditor-001',
      'forecast_cashflow': 'advisor-001'
    };

    const agentId = agentMap[task.type];
    if (!agentId) {
      throw new Error(`No agent available for task type: ${task.type}`);
    }

    this.activeTasks.set(task.id, task);
    console.log(`📋 Task ${task.id} assigned to agent ${agentId}`);
    
    return agentId;
  }

  /**
   * Get agent status and capabilities
   */
  getAgents(): MCPAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get active tasks
   */
  getActiveTasks(): TaskRequest[] {
    return Array.from(this.activeTasks.values());
  }

  /**
   * Get task results
   */
  getTaskResults(taskId: string): TaskResult | undefined {
    return this.taskResults.get(taskId);
  }

  /**
   * Start MCP server
   */
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('🤖 MCP server started for AI agent collaboration');
  }

  /**
   * Health check for MCP service
   */
  getStatus() {
    return {
      server: 'running',
      agentCount: this.agents.size,
      activeTaskCount: this.activeTasks.size,
      completedTaskCount: this.taskResults.size
    };
  }
}

export default MCPService.getInstance(); 