import type { ConversationContext } from './ConversationManager';
import type { NLAnalysisResult } from '../engines/EnhancedNLPEngine';

export interface ContextUpdate {
  entities: Record<string, any>;
  businessContext: Record<string, any>;
  userState: 'exploring' | 'focused' | 'completing_task';
  topicTransition?: boolean;
}

export class ContextTracker {
  private static readonly CONTEXT_WEIGHT_DECAY = 0.9;
  private static readonly MAX_CONTEXT_HISTORY = 5;

  /**
   * Update conversation context based on new analysis
   */
  updateContext(
    context: ConversationContext,
    analysis: NLAnalysisResult
  ): ContextUpdate {
    // Merge entities with context awareness
    const updatedEntities = this.mergeEntities(
      context.entities,
      analysis.entities
    );

    // Update business context
    const updatedBusinessContext = this.updateBusinessContext(
      context.businessContext,
      analysis.businessContext
    );

    // Determine user state
    const userState = this.determineUserState(context, analysis);

    // Detect topic transitions
    const topicTransition = this.detectTopicTransition(context, analysis);

    // Update the context object
    context.entities = updatedEntities;
    context.businessContext = updatedBusinessContext;
    context.currentIntent = analysis.intent;

    return {
      entities: updatedEntities,
      businessContext: updatedBusinessContext,
      userState,
      topicTransition
    };
  }

  /**
   * Merge entities with weighted importance
   */
  private mergeEntities(
    existingEntities: Record<string, any>,
    newEntities: Record<string, any>
  ): Record<string, any> {
    const merged = { ...existingEntities };

    for (const [key, value] of Object.entries(newEntities)) {
      if (value !== undefined && value !== null) {
        // New entities take precedence
        merged[key] = value;
        
        // Add timestamp for context decay
        merged[`${key}_timestamp`] = Date.now();
      }
    }

    // Apply context decay to old entities
    this.applyContextDecay(merged);

    return merged;
  }

  /**
   * Update business context with relevance scoring
   */
  private updateBusinessContext(
    existingContext: Record<string, any>,
    newContext: Record<string, any>
  ): Record<string, any> {
    const updated = { ...existingContext };

    // Update with new business context
    for (const [key, value] of Object.entries(newContext)) {
      updated[key] = value;
    }

    // Maintain business context relevance
    this.maintainBusinessRelevance(updated);

    return updated;
  }

  /**
   * Determine current user state based on conversation pattern
   */
  private determineUserState(
    context: ConversationContext,
    analysis: NLAnalysisResult
  ): 'exploring' | 'focused' | 'completing_task' {
    const recentIntents = context.conversationHistory
      .slice(-3)
      .map(h => h.intent)
      .filter(Boolean);

    // If same intent repeated, user is focused
    if (recentIntents.length >= 2 && 
        recentIntents.every(intent => intent === analysis.intent)) {
      return 'focused';
    }

    // If specific action required, user is completing task
    if (analysis.urgency === 'high' || 
        ['financial_report', 'transaction_query'].includes(analysis.intent)) {
      return 'completing_task';
    }

    // Default to exploring
    return 'exploring';
  }

  /**
   * Detect topic transitions in conversation
   */
  private detectTopicTransition(
    context: ConversationContext,
    analysis: NLAnalysisResult
  ): boolean {
    if (context.conversationHistory.length === 0) {
      return false;
    }

    const lastIntent = context.currentIntent;
    const currentIntent = analysis.intent;

    // Major topic categories
    const reportingTopics = ['financial_report', 'data_inquiry'];
    const transactionTopics = ['transaction_query', 'payment'];
    const analyticsTopics = ['insight_request', 'comparison', 'forecasting'];

    const getTopicCategory = (intent: string) => {
      if (reportingTopics.includes(intent)) return 'reporting';
      if (transactionTopics.includes(intent)) return 'transactions';
      if (analyticsTopics.includes(intent)) return 'analytics';
      return 'general';
    };

    const lastCategory = getTopicCategory(lastIntent || '');
    const currentCategory = getTopicCategory(currentIntent);

    return lastCategory !== currentCategory && lastCategory !== 'general';
  }

  /**
   * Apply time-based decay to context entities
   */
  private applyContextDecay(entities: Record<string, any>): void {
    const now = Date.now();
    const decayThreshold = 5 * 60 * 1000; // 5 minutes

    for (const key of Object.keys(entities)) {
      if (key.endsWith('_timestamp')) {
        const entityKey = key.replace('_timestamp', '');
        const timestamp = entities[key];

        if (now - timestamp > decayThreshold) {
          // Apply decay factor
          if (typeof entities[entityKey] === 'number') {
            entities[entityKey] *= ContextTracker.CONTEXT_WEIGHT_DECAY;
          }
        }
      }
    }
  }

  /**
   * Maintain business context relevance
   */
  private maintainBusinessRelevance(context: Record<string, any>): void {
    // Keep only most relevant business context items
    const contextKeys = Object.keys(context);
    
    if (contextKeys.length > 10) {
      // Remove oldest or least relevant items
      const sortedKeys = contextKeys.sort((a, b) => {
        const timestampA = context[`${a}_timestamp`] || 0;
        const timestampB = context[`${b}_timestamp`] || 0;
        return timestampB - timestampA;
      });

      // Keep top 10 most recent
      const keysToRemove = sortedKeys.slice(10);
      keysToRemove.forEach(key => {
        delete context[key];
        delete context[`${key}_timestamp`];
      });
    }
  }

  /**
   * Get context summary for debugging/logging
   */
  getContextSummary(context: ConversationContext): string {
    const entityCount = Object.keys(context.entities).length;
    const historyLength = context.conversationHistory.length;
    const currentIntent = context.currentIntent || 'none';

    return `Context: ${entityCount} entities, ${historyLength} messages, intent: ${currentIntent}`;
  }

  /**
   * Check if context has sufficient information for task completion
   */
  hasSufficientContext(
    context: ConversationContext,
    requiredEntities: string[]
  ): { sufficient: boolean; missing: string[] } {
    const missing = requiredEntities.filter(
      entity => !context.entities[entity]
    );

    return {
      sufficient: missing.length === 0,
      missing
    };
  }

  /**
   * Suggest context completion questions
   */
  suggestContextQuestions(
    context: ConversationContext,
    intent: string
  ): string[] {
    const questions: string[] = [];

    switch (intent) {
      case 'financial_report':
        if (!context.entities.timeframe) {
          questions.push('Which time period would you like to see?');
        }
        if (!context.entities.reportType) {
          questions.push('What type of report do you need?');
        }
        break;

      case 'data_inquiry':
        if (!context.entities.category) {
          questions.push('Which category or account are you interested in?');
        }
        break;

      case 'transaction_query':
        if (!context.entities.timeframe) {
          questions.push('For which time period?');
        }
        if (!context.entities.amount && !context.entities.category) {
          questions.push('Are you looking for specific amounts or categories?');
        }
        break;
    }

    return questions;
  }
}