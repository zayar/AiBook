import type { ConversationContext } from './ConversationManager';
import type { NLAnalysisResult } from '../engines/EnhancedNLPEngine';

export interface DialogueFlow {
  currentStep: string;
  totalSteps: number;
  completedSteps: string[];
  nextActions: string[];
  canComplete: boolean;
  requiresInput: boolean;
}

export interface TaskState {
  taskId: string;
  taskType: string;
  status: 'initiated' | 'in_progress' | 'waiting_input' | 'completed' | 'failed';
  progress: number; // 0-100
  requiredInputs: string[];
  collectedInputs: Record<string, any>;
  nextStep?: string;
}

export class DialogueState {
  private taskStates: Map<string, TaskState> = new Map();
  
  // Define conversation flows for different intents
  private conversationFlows = {
    financial_report: {
      steps: ['identify_report_type', 'specify_timeframe', 'gather_filters', 'generate_report', 'present_results'],
      requiredInputs: {
        identify_report_type: ['reportType'],
        specify_timeframe: ['timeframe'],
        gather_filters: [], // Optional
        generate_report: [],
        present_results: []
      }
    },
    data_inquiry: {
      steps: ['understand_query', 'identify_data_source', 'apply_filters', 'fetch_data', 'format_response'],
      requiredInputs: {
        understand_query: ['queryType'],
        identify_data_source: ['dataSource'],
        apply_filters: [], // Optional
        fetch_data: [],
        format_response: []
      }
    },
    transaction_query: {
      steps: ['specify_criteria', 'set_timeframe', 'apply_filters', 'search_transactions', 'display_results'],
      requiredInputs: {
        specify_criteria: ['searchCriteria'],
        set_timeframe: ['timeframe'],
        apply_filters: [], // Optional
        search_transactions: [],
        display_results: []
      }
    },
    insight_request: {
      steps: ['identify_focus_area', 'gather_context', 'run_analysis', 'generate_insights', 'provide_recommendations'],
      requiredInputs: {
        identify_focus_area: ['focusArea'],
        gather_context: ['analysisContext'],
        run_analysis: [],
        generate_insights: [],
        provide_recommendations: []
      }
    }
  };

  /**
   * Update dialogue state based on new analysis
   */
  updateState(
    analysis: NLAnalysisResult,
    context: ConversationContext
  ): DialogueFlow {
    const intent = analysis.intent;
    const taskId = this.getOrCreateTaskId(intent, context);
    
    let taskState = this.taskStates.get(taskId);
    
    if (!taskState) {
      taskState = this.initializeTask(taskId, intent);
      this.taskStates.set(taskId, taskState);
    }

    // Update task with new information
    this.updateTaskWithAnalysis(taskState, analysis);
    
    // Determine next step
    const nextStep = this.determineNextStep(taskState, intent);
    taskState.nextStep = nextStep;

    // Update progress
    taskState.progress = this.calculateProgress(taskState, intent);

    // Generate dialogue flow
    return this.generateDialogueFlow(taskState, intent);
  }

  /**
   * Get or create a task ID for the current conversation flow
   */
  private getOrCreateTaskId(intent: string, context: ConversationContext): string {
    // Use session ID and intent to create unique task ID
    return `${context.sessionId}_${intent}_${Date.now()}`;
  }

  /**
   * Initialize a new task state
   */
  private initializeTask(taskId: string, intent: string): TaskState {
    const flow = this.conversationFlows[intent as keyof typeof this.conversationFlows];
    
    return {
      taskId,
      taskType: intent,
      status: 'initiated',
      progress: 0,
      requiredInputs: flow ? this.getAllRequiredInputs(flow) : [],
      collectedInputs: {},
      nextStep: flow ? flow.steps[0] : 'general_response'
    };
  }

  /**
   * Update task state with new analysis results
   */
  private updateTaskWithAnalysis(
    taskState: TaskState,
    analysis: NLAnalysisResult
  ): void {
    // Collect entities as inputs
    for (const [key, value] of Object.entries(analysis.entities)) {
      if (value !== undefined && value !== null) {
        taskState.collectedInputs[key] = value;
      }
    }

    // Update status based on collected inputs
    if (this.hasAllRequiredInputs(taskState)) {
      taskState.status = 'in_progress';
    } else if (Object.keys(taskState.collectedInputs).length > 0) {
      taskState.status = 'waiting_input';
    }
  }

  /**
   * Determine the next step in the conversation flow
   */
  private determineNextStep(taskState: TaskState, intent: string): string {
    const flow = this.conversationFlows[intent as keyof typeof this.conversationFlows];
    
    if (!flow) {
      return 'general_response';
    }

    // Find current step based on collected inputs
    for (let i = 0; i < flow.steps.length; i++) {
      const step = flow.steps[i];
      const stepInputs = flow.requiredInputs[step as keyof typeof flow.requiredInputs];
      
      // Check if this step's inputs are collected
      const stepComplete = (stepInputs as string[]).every((input: string) => 
        taskState.collectedInputs[input] !== undefined
      );

      if (!stepComplete) {
        return step;
      }
    }

    // All steps complete
    return 'task_complete';
  }

  /**
   * Calculate task progress percentage
   */
  private calculateProgress(taskState: TaskState, intent: string): number {
    const flow = this.conversationFlows[intent as keyof typeof this.conversationFlows];
    
    if (!flow) {
      return 50; // Default progress for unknown intents
    }

    const totalInputs = taskState.requiredInputs.length;
    const collectedInputs = Object.keys(taskState.collectedInputs).length;

    if (totalInputs === 0) {
      return 100;
    }

    return Math.min(100, (collectedInputs / totalInputs) * 100);
  }

  /**
   * Generate dialogue flow object
   */
  private generateDialogueFlow(taskState: TaskState, intent: string): DialogueFlow {
    const flow = this.conversationFlows[intent as keyof typeof this.conversationFlows];
    
    if (!flow) {
      return {
        currentStep: 'general',
        totalSteps: 1,
        completedSteps: [],
        nextActions: ['Provide general assistance'],
        canComplete: true,
        requiresInput: false
      };
    }

    const currentStepIndex = flow.steps.indexOf(taskState.nextStep || flow.steps[0]);
    const completedSteps = flow.steps.slice(0, Math.max(0, currentStepIndex));
    
    return {
      currentStep: taskState.nextStep || flow.steps[0],
      totalSteps: flow.steps.length,
      completedSteps,
      nextActions: this.generateNextActions(taskState, intent),
      canComplete: taskState.progress >= 100,
      requiresInput: taskState.status === 'waiting_input'
    };
  }

  /**
   * Generate next actions based on current state
   */
  private generateNextActions(taskState: TaskState, intent: string): string[] {
    const flow = this.conversationFlows[intent as keyof typeof this.conversationFlows];
    const nextStep = taskState.nextStep;

    if (!flow || !nextStep) {
      return ['Continue conversation'];
    }

    const actionMap: Record<string, Record<string, string[]>> = {
      financial_report: {
        identify_report_type: ['Ask for report type', 'Suggest common reports'],
        specify_timeframe: ['Request time period', 'Suggest default timeframe'],
        gather_filters: ['Ask for additional filters', 'Proceed with basic report'],
        generate_report: ['Generate the financial report'],
        present_results: ['Display report results', 'Offer export options']
      },
      data_inquiry: {
        understand_query: ['Clarify the data request'],
        identify_data_source: ['Determine data source'],
        apply_filters: ['Apply any filters'],
        fetch_data: ['Retrieve the requested data'],
        format_response: ['Format and present the data']
      },
      transaction_query: {
        specify_criteria: ['Ask for search criteria'],
        set_timeframe: ['Request time period'],
        apply_filters: ['Apply transaction filters'],
        search_transactions: ['Search transaction records'],
        display_results: ['Show transaction results']
      }
    };

    const intentActions = actionMap[intent];
    return intentActions?.[nextStep] || ['Continue with next step'];
  }

  /**
   * Get all required inputs for a conversation flow
   */
  private getAllRequiredInputs(flow: any): string[] {
    const allInputs = new Set<string>();
    
    for (const stepInputs of Object.values(flow.requiredInputs)) {
      (stepInputs as string[]).forEach(input => allInputs.add(input));
    }

    return Array.from(allInputs);
  }

  /**
   * Check if task has all required inputs
   */
  private hasAllRequiredInputs(taskState: TaskState): boolean {
    return taskState.requiredInputs.every(input => 
      taskState.collectedInputs[input] !== undefined
    );
  }

  /**
   * Get missing inputs for current task
   */
  getMissingInputs(taskId: string): string[] {
    const taskState = this.taskStates.get(taskId);
    
    if (!taskState) {
      return [];
    }

    return taskState.requiredInputs.filter(input => 
      taskState.collectedInputs[input] === undefined
    );
  }

  /**
   * Mark task as completed
   */
  completeTask(taskId: string): void {
    const taskState = this.taskStates.get(taskId);
    
    if (taskState) {
      taskState.status = 'completed';
      taskState.progress = 100;
    }
  }

  /**
   * Get current task state
   */
  getTaskState(taskId: string): TaskState | undefined {
    return this.taskStates.get(taskId);
  }

  /**
   * Clear old task states (cleanup)
   */
  cleanup(maxAge: number = 30 * 60 * 1000): void { // 30 minutes
    const now = Date.now();
    
    for (const [taskId, taskState] of this.taskStates.entries()) {
      const taskAge = now - parseInt(taskId.split('_').pop() || '0');
      
      if (taskAge > maxAge && taskState.status === 'completed') {
        this.taskStates.delete(taskId);
      }
    }
  }

  /**
   * Generate conversational prompts for missing inputs
   */
  generateInputPrompts(taskState: TaskState): string[] {
    const prompts: Record<string, string> = {
      reportType: "What type of report would you like to see? (e.g., Profit & Loss, Balance Sheet, Cash Flow)",
      timeframe: "For which time period? (e.g., this month, last quarter, 2023)",
      queryType: "What specific information are you looking for?",
      dataSource: "Which data would you like me to analyze?",
      searchCriteria: "What criteria should I use to search transactions?",
      focusArea: "Which area of your business would you like insights on?"
    };

    const missingInputs = this.getMissingInputs(taskState.taskId);
    return missingInputs.map(input => prompts[input] || `Please provide: ${input}`);
  }
}