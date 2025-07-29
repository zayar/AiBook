/**
 * 🤖 AI SERVICE
 * 
 * Central orchestrator for all AI capabilities including:
 * - Machine learning models and predictions
 * - Natural language processing
 * - Computer vision and OCR
 * - Intelligent categorization and insights
 * - Predictive analytics and forecasting
 */

import { MLEngine } from './engines/MLEngine';
import { NLPEngine } from './engines/NLPEngine';

/**
 * Main AI Service that coordinates all AI functionality
 */
export class AIService {
  private tenantId: string;
  private mlEngine: MLEngine;
  private nlpEngine: NLPEngine;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.mlEngine = new MLEngine(tenantId);
    this.nlpEngine = new NLPEngine(tenantId);
  }

  // Machine Learning operations
  async createModel(modelConfig: any) {
    return await this.mlEngine.createModel(modelConfig);
  }

  async trainModel(modelId: string, dataset: any, hyperparameters?: any) {
    return await this.mlEngine.trainModel(modelId, dataset, hyperparameters);
  }

  async predict(request: any) {
    return await this.mlEngine.predict(request);
  }

  async evaluateModel(modelId: string, testDataset: any) {
    return await this.mlEngine.evaluateModel(modelId, testDataset);
  }

  // Natural Language Processing operations
  async classifyTransaction(description: string) {
    return await this.nlpEngine.classifyTransaction(description);
  }

  async extractEntities(text: string) {
    return await this.nlpEngine.extractEntities(text);
  }

  async analyzeSentiment(text: string) {
    return await this.nlpEngine.analyzeSentiment(text);
  }

  async detectIntent(query: string) {
    return await this.nlpEngine.detectIntent(query);
  }

  async summarizeText(text: string, maxLength?: number) {
    return await this.nlpEngine.summarizeText(text, maxLength);
  }

  async understandQuery(query: string) {
    return await this.nlpEngine.understandQuery(query);
  }

  // Specialized AI tasks for accounting
  async categorizeExpense(description: string, amount?: number, vendor?: string) {
    return await this.nlpEngine.classifyExpense(description, amount, vendor);
  }

  async extractTransactionFeatures(transaction: any) {
    return await this.mlEngine.extractTransactionFeatures(transaction);
  }

  async trainCategorizationModel(transactions: any[]) {
    return await this.mlEngine.trainCategorizationModel(transactions);
  }

  // Get available models
  getModels() {
    return this.mlEngine.getModels();
  }

  // Deploy model
  async deployModel(modelId: string) {
    return await this.mlEngine.deployModel(modelId);
  }
} 