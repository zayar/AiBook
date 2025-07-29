/**
 * 🤵 AGENTS MODULE - Intelligent Automation Agents
 * 
 * This module contains autonomous agents for accounting automation:
 * - Specialized accounting agents
 * - MCP (Model Context Protocol) integration
 * - Agent orchestration and workflows
 * - Task automation and scheduling
 * - Multi-agent coordination
 */

// Core agent orchestration
export { AgentOrchestrator } from './orchestration/AgentOrchestrator';
export { TaskScheduler } from './orchestration/TaskScheduler';
export { WorkflowEngine } from './orchestration/WorkflowEngine';

// Specialized accounting agents
export { BookkeepingAgent } from './specialists/BookkeepingAgent';
export { AuditAgent } from './specialists/AuditAgent';
export { ReconciliationAgent } from './specialists/ReconciliationAgent';
export { ComplianceAgent } from './specialists/ComplianceAgent';
export { AnalystAgent } from './specialists/AnalystAgent';
export { AdvisorAgent } from './specialists/AdvisorAgent';

// MCP integration
export { MCPClient } from './mcp/MCPClient';
export { MCPServer } from './mcp/MCPServer';
export { MCPToolRegistry } from './mcp/MCPToolRegistry';

// Agent models and types
export * from './models/Agent';
export * from './models/Task';
export * from './models/Workflow';
export * from './models/Context';

// Agent utilities
export { AgentFactory } from './utils/AgentFactory';
export { ContextManager } from './utils/ContextManager';
export { MessageRouter } from './utils/MessageRouter';

// Export main agents service
export { AgentsService } from './AgentsService'; 