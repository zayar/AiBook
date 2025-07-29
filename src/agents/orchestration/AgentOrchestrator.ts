/**
 * 🎭 AGENT ORCHESTRATOR
 * 
 * Central coordination system for managing multiple AI agents including:
 * - Agent lifecycle management
 * - Task distribution and load balancing
 * - Inter-agent communication
 * - Workflow orchestration
 * - Conflict resolution
 * - Performance monitoring
 */

import { EventEmitter } from 'events';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  capabilities: AgentCapability[];
  currentTask?: Task;
  performance: AgentPerformance;
  config: AgentConfig;
  tenantId: string;
  createdAt: Date;
  lastActiveAt: Date;
}

export type AgentType = 
  | 'BOOKKEEPING'
  | 'AUDIT'
  | 'RECONCILIATION'
  | 'COMPLIANCE'
  | 'ANALYST'
  | 'ADVISOR'
  | 'CATEGORIZATION'
  | 'OCR_PROCESSOR'
  | 'REPORT_GENERATOR';

export type AgentStatus = 
  | 'IDLE'
  | 'BUSY'
  | 'LEARNING'
  | 'ERROR'
  | 'MAINTENANCE'
  | 'OFFLINE';

export interface AgentCapability {
  name: string;
  description: string;
  inputTypes: string[];
  outputTypes: string[];
  estimatedDuration: number; // in milliseconds
  confidenceLevel: number;
}

export interface AgentPerformance {
  tasksCompleted: number;
  successRate: number;
  averageResponseTime: number;
  accuracy: number;
  lastEvaluatedAt: Date;
  performanceScore: number; // 0-100
}

export interface AgentConfig {
  maxConcurrentTasks: number;
  timeout: number;
  retryAttempts: number;
  learningEnabled: boolean;
  autoScale: boolean;
  resourceLimits: {
    memory: number;
    cpu: number;
  };
}

export interface Task {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  input: any;
  output?: any;
  assignedAgentId?: string;
  dependencies?: string[];
  deadline?: Date;
  retryCount: number;
  estimatedDuration: number;
  actualDuration?: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  tenantId: string;
}

export type TaskType = 
  | 'CATEGORIZE_TRANSACTION'
  | 'PROCESS_RECEIPT'
  | 'RECONCILE_ACCOUNT'
  | 'GENERATE_REPORT'
  | 'AUDIT_ENTRIES'
  | 'EXTRACT_DATA'
  | 'VALIDATE_COMPLIANCE'
  | 'ANALYZE_TRENDS'
  | 'PREDICT_CASHFLOW'
  | 'DETECT_ANOMALIES';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskStatus = 
  | 'PENDING'
  | 'QUEUED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  isActive: boolean;
  tenantId: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  agentType: AgentType;
  taskType: TaskType;
  input: any;
  dependencies: string[];
  timeout: number;
  retryPolicy: RetryPolicy;
}

export interface WorkflowTrigger {
  type: 'EVENT' | 'SCHEDULE' | 'MANUAL';
  condition: any;
  parameters: Record<string, any>;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'LINEAR' | 'EXPONENTIAL';
  initialDelay: number;
  maxDelay: number;
}

export interface OrchestratorMetrics {
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageResponseTime: number;
  systemLoad: number;
  throughput: number; // tasks per minute
}

export class AgentOrchestrator extends EventEmitter {
  private tenantId: string;
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private taskQueue: Task[] = [];
  private isProcessing: boolean = false;
  private metrics: OrchestratorMetrics;

  constructor(tenantId: string) {
    super();
    this.tenantId = tenantId;
    this.metrics = this.initializeMetrics();
    this.startTaskProcessor();
  }

  /**
   * 🤖 AGENT MANAGEMENT
   */

  /**
   * Register a new agent with the orchestrator
   */
  async registerAgent(agentConfig: Omit<Agent, 'id' | 'createdAt' | 'tenantId'>): Promise<string> {
    const agent: Agent = {
      ...agentConfig,
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: this.tenantId,
      createdAt: new Date(),
      lastActiveAt: new Date()
    };

    this.agents.set(agent.id, agent);
    this.emit('agentRegistered', agent);
    
    console.log(`🤖 Agent registered: ${agent.name} (${agent.type})`);
    return agent.id;
  }

  /**
   * Get available agents for a specific task type
   */
  getAvailableAgents(taskType: TaskType): Agent[] {
    return Array.from(this.agents.values()).filter(agent => 
      agent.tenantId === this.tenantId &&
      agent.status === 'IDLE' &&
      agent.capabilities.some(cap => this.canHandleTask(cap, taskType))
    );
  }

  /**
   * Select the best agent for a task based on capabilities and performance
   */
  selectBestAgent(taskType: TaskType, priority: TaskPriority): Agent | null {
    const availableAgents = this.getAvailableAgents(taskType);
    
    if (availableAgents.length === 0) {
      return null;
    }

    // Score agents based on performance, capabilities, and current load
    const scoredAgents = availableAgents.map(agent => ({
      agent,
      score: this.calculateAgentScore(agent, taskType, priority)
    }));

    // Sort by score (highest first)
    scoredAgents.sort((a, b) => b.score - a.score);
    
    return scoredAgents[0].agent;
  }

  /**
   * 📋 TASK MANAGEMENT
   */

  /**
   * Submit a new task to the orchestrator
   */
  async submitTask(taskRequest: Omit<Task, 'id' | 'status' | 'retryCount' | 'createdAt' | 'tenantId'>): Promise<string> {
    const task: Task = {
      ...taskRequest,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'PENDING',
      retryCount: 0,
      createdAt: new Date(),
      tenantId: this.tenantId
    };

    this.tasks.set(task.id, task);
    this.taskQueue.push(task);
    
    // Sort queue by priority and deadline
    this.taskQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      
      if (a.deadline && b.deadline) {
        return a.deadline.getTime() - b.deadline.getTime();
      }
      
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    this.emit('taskSubmitted', task);
    console.log(`📋 Task submitted: ${task.type} (Priority: ${task.priority})`);
    
    return task.id;
  }

  /**
   * Process tasks in the queue
   */
  private async processTaskQueue(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()!;
        
        if (this.shouldSkipTask(task)) {
          continue;
        }

        await this.processTask(task);
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error processing task queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single task
   */
  private async processTask(task: Task): Promise<void> {
    try {
      task.status = 'QUEUED';
      this.updateTask(task);

      // Check dependencies
      if (task.dependencies && !this.areDependenciesMet(task.dependencies)) {
        console.log(`⏳ Task ${task.id} waiting for dependencies`);
        this.taskQueue.push(task); // Put back in queue
        return;
      }

      // Find and assign agent
      const agent = this.selectBestAgent(task.type, task.priority);
      if (!agent) {
        console.log(`⏳ No available agent for task ${task.id}, requeueing`);
        this.taskQueue.push(task); // Put back in queue
        return;
      }

      await this.assignTaskToAgent(task, agent);
      
    } catch (error) {
      console.error(`❌ Error processing task ${task.id}:`, error);
      task.status = 'FAILED';
      this.updateTask(task);
      this.emit('taskFailed', task, error);
    }
  }

  /**
   * Assign a task to a specific agent
   */
  private async assignTaskToAgent(task: Task, agent: Agent): Promise<void> {
    task.assignedAgentId = agent.id;
    task.status = 'ASSIGNED';
    task.startedAt = new Date();
    
    agent.status = 'BUSY';
    agent.currentTask = task;
    agent.lastActiveAt = new Date();

    this.updateTask(task);
    this.updateAgent(agent);

    this.emit('taskAssigned', task, agent);
    console.log(`🎯 Task ${task.id} assigned to agent ${agent.name}`);

    try {
      // Execute the task
      const result = await this.executeTask(task, agent);
      
      task.output = result;
      task.status = 'COMPLETED';
      task.completedAt = new Date();
      task.actualDuration = task.completedAt.getTime() - task.startedAt!.getTime();

      // Update agent performance
      this.updateAgentPerformance(agent, task, true);
      
      agent.status = 'IDLE';
      agent.currentTask = undefined;

      this.updateTask(task);
      this.updateAgent(agent);

      this.emit('taskCompleted', task, result);
      console.log(`✅ Task ${task.id} completed successfully`);

    } catch (error) {
      console.error(`❌ Task ${task.id} failed:`, error);
      
      task.status = 'FAILED';
      task.retryCount++;

      // Update agent performance
      this.updateAgentPerformance(agent, task, false);
      
      agent.status = 'IDLE';
      agent.currentTask = undefined;

      // Retry logic
      if (task.retryCount < 3) { // Max 3 retries
        console.log(`🔄 Retrying task ${task.id} (attempt ${task.retryCount})`);
        task.status = 'PENDING';
        this.taskQueue.push(task);
      }

      this.updateTask(task);
      this.updateAgent(agent);
      this.emit('taskFailed', task, error);
    }
  }

  /**
   * 🔄 WORKFLOW MANAGEMENT
   */

  /**
   * Create a new workflow
   */
  async createWorkflow(workflow: Omit<WorkflowDefinition, 'id'>): Promise<string> {
    const workflowDef: WorkflowDefinition = {
      ...workflow,
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.workflows.set(workflowDef.id, workflowDef);
    this.emit('workflowCreated', workflowDef);
    
    console.log(`🔄 Workflow created: ${workflowDef.name}`);
    return workflowDef.id;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId: string, input: any): Promise<string[]> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (!workflow.isActive) {
      throw new Error(`Workflow ${workflowId} is not active`);
    }

    console.log(`🚀 Executing workflow: ${workflow.name}`);
    
    const taskIds: string[] = [];
    const stepResults: Map<string, any> = new Map();

    // Execute steps in dependency order
    for (const step of workflow.steps) {
      // Wait for dependencies
      for (const depId of step.dependencies) {
        if (!stepResults.has(depId)) {
          throw new Error(`Dependency ${depId} not satisfied for step ${step.id}`);
        }
      }

      // Prepare step input
      const stepInput = this.prepareStepInput(step, input, stepResults);

      // Submit task for this step
      const taskId = await this.submitTask({
        type: step.taskType,
        priority: 'MEDIUM',
        input: stepInput,
        estimatedDuration: step.timeout
      });

      taskIds.push(taskId);
      
      // Wait for task completion (simplified)
      const result = await this.waitForTaskCompletion(taskId, step.timeout);
      stepResults.set(step.id, result);
    }

    console.log(`✅ Workflow ${workflow.name} completed with ${taskIds.length} tasks`);
    return taskIds;
  }

  /**
   * 📊 MONITORING AND METRICS
   */

  /**
   * Get current orchestrator metrics
   */
  getMetrics(): OrchestratorMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get agent performance statistics
   */
  getAgentPerformance(): Array<{ agent: Agent; performance: AgentPerformance }> {
    return Array.from(this.agents.values())
      .filter(agent => agent.tenantId === this.tenantId)
      .map(agent => ({ agent, performance: agent.performance }));
  }

  /**
   * 🔧 PRIVATE METHODS
   */

  private canHandleTask(capability: AgentCapability, taskType: TaskType): boolean {
    // Simplified capability matching
    return capability.name.toUpperCase().includes(taskType.split('_')[0]);
  }

  private calculateAgentScore(agent: Agent, taskType: TaskType, priority: TaskPriority): number {
    let score = 0;
    
    // Performance score (0-100)
    score += agent.performance.performanceScore * 0.4;
    
    // Success rate (0-100)
    score += agent.performance.successRate * 100 * 0.3;
    
    // Response time bonus (inverse relationship)
    score += Math.max(0, 100 - agent.performance.averageResponseTime / 1000) * 0.2;
    
    // Capability match bonus
    const hasRelevantCapability = agent.capabilities.some(cap => 
      this.canHandleTask(cap, taskType)
    );
    if (hasRelevantCapability) score += 20;
    
    // Priority bonus for urgent tasks
    if (priority === 'URGENT') score += 10;
    
    return score;
  }

  private shouldSkipTask(task: Task): boolean {
    // Skip if task is too old or cancelled
    if (task.deadline && task.deadline < new Date()) {
      task.status = 'CANCELLED';
      this.updateTask(task);
      return true;
    }
    
    return false;
  }

  private areDependenciesMet(dependencies: string[]): boolean {
    return dependencies.every(depId => {
      const depTask = this.tasks.get(depId);
      return depTask && depTask.status === 'COMPLETED';
    });
  }

  private async executeTask(task: Task, agent: Agent): Promise<any> {
    // Simulate task execution based on type
    console.log(`🔧 Executing ${task.type} with agent ${agent.name}`);
    
    // Simulate processing time
    await new Promise(resolve => 
      setTimeout(resolve, Math.random() * 2000 + 500)
    );
    
    // Mock results based on task type
    switch (task.type) {
      case 'CATEGORIZE_TRANSACTION':
        return {
          category: 'Office Supplies',
          confidence: 0.85,
          subcategories: ['Paper', 'Supplies']
        };
      
      case 'PROCESS_RECEIPT':
        return {
          vendor: 'Acme Corp',
          amount: 125.50,
          date: '2024-01-15',
          items: ['Item 1', 'Item 2']
        };
      
      default:
        return { success: true, result: 'Task completed' };
    }
  }

  private updateAgentPerformance(agent: Agent, task: Task, success: boolean): void {
    const performance = agent.performance;
    
    performance.tasksCompleted++;
    performance.successRate = (performance.successRate * (performance.tasksCompleted - 1) + (success ? 1 : 0)) / performance.tasksCompleted;
    
    if (task.actualDuration) {
      performance.averageResponseTime = (performance.averageResponseTime + task.actualDuration) / 2;
    }
    
    performance.lastEvaluatedAt = new Date();
    
    // Calculate overall performance score
    performance.performanceScore = (
      performance.successRate * 50 +
      Math.min(performance.accuracy * 30, 30) +
      Math.max(0, 20 - performance.averageResponseTime / 1000)
    );
  }

  private updateTask(task: Task): void {
    this.tasks.set(task.id, task);
  }

  private updateAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  private prepareStepInput(step: WorkflowStep, workflowInput: any, stepResults: Map<string, any>): any {
    // Combine workflow input with previous step results
    return {
      ...workflowInput,
      ...step.input,
      previousResults: Object.fromEntries(stepResults)
    };
  }

  private async waitForTaskCompletion(taskId: string, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const task = this.tasks.get(taskId);
        if (task) {
          if (task.status === 'COMPLETED') {
            clearInterval(checkInterval);
            resolve(task.output);
          } else if (task.status === 'FAILED') {
            clearInterval(checkInterval);
            reject(new Error(`Task ${taskId} failed`));
          }
        }
      }, 500);

      // Timeout handling
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error(`Task ${taskId} timed out`));
      }, timeout);
    });
  }

  private startTaskProcessor(): void {
    // Process queue every 2 seconds
    setInterval(() => {
      this.processTaskQueue();
    }, 2000);
  }

  private initializeMetrics(): OrchestratorMetrics {
    return {
      totalAgents: 0,
      activeAgents: 0,
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageResponseTime: 0,
      systemLoad: 0,
      throughput: 0
    };
  }

  private updateMetrics(): void {
    const agents = Array.from(this.agents.values()).filter(a => a.tenantId === this.tenantId);
    const tasks = Array.from(this.tasks.values()).filter(t => t.tenantId === this.tenantId);
    
    this.metrics.totalAgents = agents.length;
    this.metrics.activeAgents = agents.filter(a => a.status === 'BUSY').length;
    this.metrics.totalTasks = tasks.length;
    this.metrics.completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    this.metrics.failedTasks = tasks.filter(t => t.status === 'FAILED').length;
    
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED' && t.actualDuration);
    if (completedTasks.length > 0) {
      this.metrics.averageResponseTime = completedTasks.reduce((sum, t) => sum + t.actualDuration!, 0) / completedTasks.length;
    }
    
    this.metrics.systemLoad = (this.metrics.activeAgents / Math.max(this.metrics.totalAgents, 1)) * 100;
    
    // Calculate throughput (tasks completed in last minute)
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentCompletions = tasks.filter(t => 
      t.status === 'COMPLETED' && 
      t.completedAt && 
      t.completedAt > oneMinuteAgo
    );
    this.metrics.throughput = recentCompletions.length;
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Agent Orchestrator...');
    
    // Cancel pending tasks
    this.taskQueue.forEach(task => {
      task.status = 'CANCELLED';
      this.updateTask(task);
    });
    
    // Set all agents to offline
    this.agents.forEach(agent => {
      agent.status = 'OFFLINE';
      this.updateAgent(agent);
    });
    
    this.removeAllListeners();
    console.log('✅ Agent Orchestrator shutdown complete');
  }
} 