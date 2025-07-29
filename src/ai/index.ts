/**
 * 🤖 AI MODULE - Intelligent Automation
 * 
 * This module contains all AI-related functionality including:
 * - Machine learning models and predictions
 * - Natural language processing
 * - Computer vision and OCR
 * - Intelligent categorization
 * - Anomaly detection
 * - Predictive analytics
 */

// Core AI engines
export { MLEngine } from './engines/MLEngine';
export { NLPEngine } from './engines/NLPEngine';
export { OCREngine } from './engines/OCREngine';
export { PredictionEngine } from './engines/PredictionEngine';
export { AnomalyDetectionEngine } from './engines/AnomalyDetectionEngine';

// AI models and types
export * from './models/AIModel';
export * from './models/Prediction';
export * from './models/Classification';
export * from './models/Insight';

// AI services
export { CategorizationService } from './services/CategorizationService';
export { InsightsService } from './services/InsightsService';
export { ForecastingService } from './services/ForecastingService';
export { RecommendationService } from './services/RecommendationService';

// AI utilities
export { AIValidator } from './utils/AIValidator';
export { ModelTrainer } from './utils/ModelTrainer';
export { DataProcessor } from './utils/DataProcessor';
export { FeatureExtractor } from './utils/FeatureExtractor';

// AI providers and integrations
export { VertexAIProvider } from './providers/VertexAIProvider';
export { OpenAIProvider } from './providers/OpenAIProvider';
export { BigQueryMLProvider } from './providers/BigQueryMLProvider';

// Export main AI service
export { AIService } from './AIService'; 