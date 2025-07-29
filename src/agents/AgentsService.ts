/**
 * 🤵 AGENTS SERVICE
 * 
 * Central orchestrator for all autonomous agents including:
 * - Specialized accounting agents
 * - Agent lifecycle management
 * - Task coordination and workflow execution
 * - Performance monitoring and optimization
 */

import { AgentOrchestrator } from './orchestration/AgentOrchestrator';
import { BookkeepingAgent } from './specialists/BookkeepingAgent';

/**
 * Main Agents Service that coordinates all agent functionality
 */
export class AgentsService {
  private tenantId: string;
  private orchestrator: AgentOrchestrator;
  private bookkeepingAgent?: BookkeepingAgent;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.orchestrator = new AgentOrchestrator(tenantId);
  }

  // Agent Orchestration
  async registerAgent(agentConfig: any) {
    return await this.orchestrator.registerAgent(agentConfig);
  }

  async submitTask(taskRequest: any) {
    return await this.orchestrator.submitTask(taskRequest);
  }

  async createWorkflow(workflow: any) {
    return await this.orchestrator.createWorkflow(workflow);
  }

  async executeWorkflow(workflowId: string, input: any) {
    return await this.orchestrator.executeWorkflow(workflowId, input);
  }

  getMetrics() {
    return this.orchestrator.getMetrics();
  }

  getAgentPerformance() {
    return this.orchestrator.getAgentPerformance();
  }

  // Specialized Agents
  async startBookkeepingAgent(config: any) {
    this.bookkeepingAgent = new BookkeepingAgent(this.tenantId, config);
    await this.bookkeepingAgent.start();
    return this.bookkeepingAgent;
  }

  async stopBookkeepingAgent() {
    if (this.bookkeepingAgent) {
      await this.bookkeepingAgent.stop();
      this.bookkeepingAgent = undefined;
    }
  }

  getBookkeepingAgent() {
    return this.bookkeepingAgent;
  }

  // Process transactions with bookkeeping agent
  async processTransaction(transaction: any) {
    if (!this.bookkeepingAgent) {
      throw new Error('Bookkeeping agent not started');
    }
    return await this.bookkeepingAgent.processTransaction(transaction);
  }

  async processBatch(transactions: any[]) {
    if (!this.bookkeepingAgent) {
      throw new Error('Bookkeeping agent not started');
    }
    return await this.bookkeepingAgent.processBatch(transactions);
  }

  // Cleanup
  async shutdown() {
    await this.stopBookkeepingAgent();
    await this.orchestrator.shutdown();
  }
} 