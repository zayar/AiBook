import { PrismaClient } from '@prisma/client';
import { EnhancedNLPEngine } from '../engines/EnhancedNLPEngine';
import { ContextTracker } from './ContextTracker';
import { DialogueState } from './DialogueState';
import { SmartReportGenerator } from '../reporting/SmartReportGenerator';

const prisma = new PrismaClient();

export interface ConversationContext {
  sessionId: string;
  userId?: string;
  tenantId: string;
  currentIntent?: string;
  entities: Record<string, any>;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    intent?: string;
    entities?: Record<string, any>;
  }>;
  userPreferences: Record<string, any>;
  businessContext: Record<string, any>;
}

export interface ConversationResponse {
  response: string;
  intent: string;
  confidence: number;
  actionRequired?: string;
  followUpQuestions?: string[];
  visualizations?: any[];
  executionTime: number;
}

export class ConversationManager {
  private nlpEngine: EnhancedNLPEngine;
  private contextTracker: ContextTracker;
  private dialogueState: DialogueState;
  private reportGenerator: SmartReportGenerator;

  constructor(tenantId: string) {
    this.nlpEngine = new EnhancedNLPEngine(tenantId);
    this.contextTracker = new ContextTracker();
    this.dialogueState = new DialogueState();
    this.reportGenerator = new SmartReportGenerator(tenantId);
  }

  /**
   * Process a user message and generate an intelligent response
   */
  async processMessage(
    message: string,
    context: ConversationContext
  ): Promise<ConversationResponse> {
    const startTime = Date.now();

    try {
      // Update conversation context
      await this.updateConversationContext(context, message);

      // Analyze the message with enhanced NLP
      const analysis = await this.nlpEngine.analyzeConversationalQuery(
        message,
        context
      );

      // Track context and maintain dialogue state
      this.contextTracker.updateContext(context, analysis);
      this.dialogueState.updateState(analysis, context);

      // Generate response based on intent
      const response = await this.generateResponse(analysis, context);

      // Store conversation in database
      await this.storeConversation(context, message, response);

      // Learn from interaction
      await this.learnFromInteraction(context, analysis, response);

      return {
        ...response,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Error processing conversation:', error);
      return {
        response: "I'm sorry, I encountered an error processing your request. Could you please try again?",
        intent: 'error',
        confidence: 0,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Start a new conversation session
   */
  async startSession(
    userId?: string,
    tenantId: string = 'default'
  ): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await prisma.conversationSession.create({
      data: {
        sessionId,
        userId,
        tenantId,
        status: 'ACTIVE',
        context: {},
        preferences: await this.loadUserPreferences(userId, tenantId)
      }
    });

    return sessionId;
  }

  /**
   * End a conversation session
   */
  async endSession(sessionId: string): Promise<void> {
    await prisma.conversationSession.update({
      where: { sessionId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date()
      }
    });
  }

  /**
   * Get conversation history for a session
   */
  async getConversationHistory(sessionId: string): Promise<any[]> {
    const messages = await prisma.conversationMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' }
    });

    return messages.map(msg => ({
      role: msg.messageType.toLowerCase(),
      content: msg.content,
      timestamp: msg.createdAt,
      intent: msg.intent,
      entities: msg.entities,
      confidence: msg.confidence
    }));
  }

  /**
   * Load user preferences for personalization
   */
  private async loadUserPreferences(
    userId?: string,
    tenantId: string = 'default'
  ): Promise<Record<string, any>> {
    if (!userId) return {};

    const preferences = await prisma.userPreference.findMany({
      where: { userId, tenantId }
    });

    return preferences.reduce((acc, pref) => {
      acc[`${pref.preferenceType}_${pref.key}`] = pref.value;
      return acc;
    }, {} as Record<string, any>);
  }

  /**
   * Update conversation context with new message
   */
  private async updateConversationContext(
    context: ConversationContext,
    message: string
  ): Promise<void> {
    // Add user message to history
    context.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Keep only last 10 messages for context
    if (context.conversationHistory.length > 10) {
      context.conversationHistory = context.conversationHistory.slice(-10);
    }

    // Update session activity
    await prisma.conversationSession.update({
      where: { sessionId: context.sessionId },
      data: {
        lastActiveAt: new Date(),
        totalMessages: { increment: 1 }
      }
    });
  }

  /**
   * Generate intelligent response based on analysis
   */
  private async generateResponse(
    analysis: any,
    context: ConversationContext
  ): Promise<Omit<ConversationResponse, 'executionTime'>> {
    const { intent, entities, confidence } = analysis;

    switch (intent) {
      case 'financial_report':
        return await this.handleReportRequest(entities, context);
      
      case 'data_inquiry':
        return await this.handleDataInquiry(entities, context);
      
      case 'transaction_query':
        return await this.handleTransactionQuery(entities, context);
      
      case 'insight_request':
        return await this.handleInsightRequest(entities, context);
      
      case 'greeting':
        return this.handleGreeting(context);
      
      case 'help':
        return this.handleHelp(context);
      
      default:
        return await this.handleGeneral(analysis, context);
    }
  }

  /**
   * Handle financial report requests
   */
  private async handleReportRequest(
    entities: any,
    context: ConversationContext
  ): Promise<Omit<ConversationResponse, 'executionTime'>> {
    try {
      const report = await this.reportGenerator.generateFromNaturalLanguage(
        entities.reportType || 'profit_loss',
        entities,
        context
      );

      return {
        response: `I've generated your ${entities.reportType || 'financial'} report. Here are the key insights:`,
        intent: 'financial_report',
        confidence: 0.9,
        visualizations: [report],
        followUpQuestions: [
          'Would you like to see this data for a different time period?',
          'Should I create a comparison with the previous period?',
          'Would you like to drill down into any specific category?'
        ]
      };
    } catch (error) {
      return {
        response: "I couldn't generate the report right now. Could you be more specific about what kind of report you need?",
        intent: 'financial_report',
        confidence: 0.7,
        followUpQuestions: [
          'Try: "Show me profit and loss for this month"',
          'Or: "Generate cash flow report for Q3"'
        ]
      };
    }
  }

  /**
   * Handle data inquiry requests
   */
  private async handleDataInquiry(
    entities: any,
    context: ConversationContext
  ): Promise<Omit<ConversationResponse, 'executionTime'>> {
    // Implementation for data inquiries
    return {
      response: `Let me look up that information for you about ${entities.subject || 'your business data'}.`,
      intent: 'data_inquiry',
      confidence: 0.8,
      followUpQuestions: [
        'Would you like me to show this as a chart?',
        'Should I compare this with historical data?'
      ]
    };
  }

  /**
   * Handle transaction queries
   */
  private async handleTransactionQuery(
    entities: any,
    context: ConversationContext
  ): Promise<Omit<ConversationResponse, 'executionTime'>> {
    // Implementation for transaction queries
    return {
      response: `I found information about transactions ${entities.timeframe ? `from ${entities.timeframe}` : ''}.`,
      intent: 'transaction_query',
      confidence: 0.85,
      followUpQuestions: [
        'Would you like to see more details?',
        'Should I filter by a specific category?'
      ]
    };
  }

  /**
   * Handle insight requests
   */
  private async handleInsightRequest(
    entities: any,
    context: ConversationContext
  ): Promise<Omit<ConversationResponse, 'executionTime'>> {
    // Implementation for insight requests
    return {
      response: "Based on your financial data, I've identified some key insights that might interest you.",
      intent: 'insight_request',
      confidence: 0.9,
      followUpQuestions: [
        'Would you like me to explain any of these insights in detail?',
        'Should I set up alerts for similar patterns?'
      ]
    };
  }

  /**
   * Handle greetings
   */
  private handleGreeting(
    context: ConversationContext
  ): Omit<ConversationResponse, 'executionTime'> {
    const timeOfDay = new Date().getHours() < 12 ? 'morning' : 
                     new Date().getHours() < 18 ? 'afternoon' : 'evening';
    
    return {
      response: `Good ${timeOfDay}! I'm your AI financial assistant. I can help you with reports, analyze your data, answer questions about your finances, and provide insights. What would you like to explore today?`,
      intent: 'greeting',
      confidence: 0.95,
      followUpQuestions: [
        'Show me today\'s financial summary',
        'What are my biggest expenses this month?',
        'Generate a cash flow report'
      ]
    };
  }

  /**
   * Handle help requests
   */
  private handleHelp(
    context: ConversationContext
  ): Omit<ConversationResponse, 'executionTime'> {
    return {
      response: `I can help you with various financial tasks:
      
📊 **Reports**: "Show me profit & loss for this quarter"
💰 **Data Analysis**: "What are my top expenses?"
📈 **Insights**: "Give me business insights"
💳 **Transactions**: "Show recent transactions"
🔍 **Custom Queries**: Just ask in natural language!

What would you like to do?`,
      intent: 'help',
      confidence: 0.95,
      followUpQuestions: [
        'Generate a financial report',
        'Analyze my expenses',
        'Show business insights'
      ]
    };
  }

  /**
   * Handle general queries
   */
  private async handleGeneral(
    analysis: any,
    context: ConversationContext
  ): Promise<Omit<ConversationResponse, 'executionTime'>> {
    return {
      response: "I understand you're asking about your financial data. Could you be more specific about what you'd like to know? I can help with reports, data analysis, transaction details, and business insights.",
      intent: 'general',
      confidence: analysis.confidence || 0.6,
      followUpQuestions: [
        'Try asking: "Show me this month\'s revenue"',
        'Or: "What are my biggest expenses?"',
        'Or: "Generate a cash flow report"'
      ]
    };
  }

  /**
   * Store conversation in database
   */
  private async storeConversation(
    context: ConversationContext,
    userMessage: string,
    response: Omit<ConversationResponse, 'executionTime'>
  ): Promise<void> {
    try {
      // Store user message
      await prisma.conversationMessage.create({
        data: {
          sessionId: context.sessionId,
          messageType: 'USER',
          content: userMessage,
          intent: response.intent,
          confidence: response.confidence
        }
      });

      // Store assistant response
      await prisma.conversationMessage.create({
        data: {
          sessionId: context.sessionId,
          messageType: 'ASSISTANT',
          content: response.response,
          intent: response.intent,
          confidence: response.confidence,
          metadata: {
            followUpQuestions: response.followUpQuestions,
            visualizations: response.visualizations
          }
        }
      });

      // Update conversation history in context
      context.conversationHistory.push({
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        intent: response.intent
      });

    } catch (error) {
      console.error('❌ Error storing conversation:', error);
    }
  }

  /**
   * Learn from user interactions
   */
  private async learnFromInteraction(
    context: ConversationContext,
    analysis: any,
    response: any
  ): Promise<void> {
    // Implementation for learning from interactions
    // This would update user preferences and improve future responses
    console.log('🧠 Learning from interaction...');
  }
}