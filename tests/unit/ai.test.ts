import { AIService } from '../../src/ai/AIService';

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = new AIService('test-tenant');
  });

  describe('classifyTransaction', () => {
    it('should classify transaction successfully', async () => {
      const mockClassification = {
        originalText: 'STAPLES OFFICE SUPPLIES',
        processedText: 'staples office supplies',
        category: 'Office Supplies',
        confidence: 0.95,
        probability: { 'Office Supplies': 0.95, 'Travel': 0.03, 'Meals': 0.02 },
        metadata: {}
      };

      const mockNLPEngine = {
        classifyTransaction: jest.fn().mockResolvedValue(mockClassification)
      };

      (aiService as any).nlpEngine = mockNLPEngine;

      const description = 'STAPLES OFFICE SUPPLIES';

      const result = await aiService.classifyTransaction(description);

      expect(result).toBe(mockClassification);
      expect(result.category).toBe('Office Supplies');
      expect(mockNLPEngine.classifyTransaction).toHaveBeenCalledWith(description);
    });
  });

  describe('categorizeExpense', () => {
    it('should categorize expense successfully', async () => {
      const mockClassification = {
        originalText: 'DELTA AIRLINES TICKET',
        processedText: 'delta airlines ticket',
        category: 'Travel',
        confidence: 0.92,
        probability: { 'Travel': 0.92, 'Transportation': 0.06, 'Meals': 0.02 },
        metadata: {}
      };

      const mockNLPEngine = {
        classifyExpense: jest.fn().mockResolvedValue(mockClassification)
      };

      (aiService as any).nlpEngine = mockNLPEngine;

      const description = 'DELTA AIRLINES TICKET';
      const amount = 450;

      const result = await aiService.categorizeExpense(description, amount);

      expect(result).toBe(mockClassification);
      expect(result.category).toBe('Travel');
      expect(mockNLPEngine.classifyExpense).toHaveBeenCalledWith(description, amount, undefined);
    });
  });

  describe('extractEntities', () => {
    it('should extract entities from text', async () => {
      const mockEntities = {
        originalText: 'STAPLES OFFICE SUPPLIES $45.99',
        processedText: 'staples office supplies $45.99',
        entities: [
          { text: 'STAPLES', type: 'VENDOR', startIndex: 0, endIndex: 6, confidence: 0.95 },
          { text: '$45.99', type: 'AMOUNT', startIndex: 20, endIndex: 26, confidence: 0.98 }
        ],
        confidence: 0.96,
        metadata: {}
      };

      const mockNLPEngine = {
        extractEntities: jest.fn().mockResolvedValue(mockEntities)
      };

      (aiService as any).nlpEngine = mockNLPEngine;

      const text = 'STAPLES OFFICE SUPPLIES $45.99';

      const result = await aiService.extractEntities(text);

      expect(result).toBe(mockEntities);
      expect(result.entities).toHaveLength(2);
      expect(mockNLPEngine.extractEntities).toHaveBeenCalledWith(text);
    });
  });

  describe('detectIntent', () => {
    it('should detect user intent from query', async () => {
      const mockIntent = {
        originalText: 'How is my cash flow this month?',
        processedText: 'how is my cash flow this month',
        intent: 'GET_BALANCE',
        parameters: { accountType: 'cash', period: 'month' },
        requiredParameters: ['accountType'],
        missingParameters: [],
        confidence: 0.88,
        metadata: {}
      };

      const mockNLPEngine = {
        detectIntent: jest.fn().mockResolvedValue(mockIntent)
      };

      (aiService as any).nlpEngine = mockNLPEngine;

      const query = 'How is my cash flow this month?';

      const result = await aiService.detectIntent(query);

      expect(result).toBe(mockIntent);
      expect(result.intent).toBe('GET_BALANCE');
      expect(mockNLPEngine.detectIntent).toHaveBeenCalledWith(query);
    });
  });

  describe('understandQuery', () => {
    it('should understand natural language query', async () => {
      const mockUnderstanding = {
        originalText: 'Show me my cash flow for this month',
        processedText: 'show me my cash flow for this month',
        queryType: 'FINANCIAL_REPORT',
        filters: { period: 'month', type: 'cash_flow' },
        confidence: 0.91,
        metadata: {}
      };

      const mockNLPEngine = {
        understandQuery: jest.fn().mockResolvedValue(mockUnderstanding)
      };

      (aiService as any).nlpEngine = mockNLPEngine;

      const query = 'Show me my cash flow for this month';

      const result = await aiService.understandQuery(query);

      expect(result).toBe(mockUnderstanding);
      expect(result.queryType).toBe('FINANCIAL_REPORT');
      expect(mockNLPEngine.understandQuery).toHaveBeenCalledWith(query);
    });
  });

  describe('predict', () => {
    it('should make predictions using ML engine', async () => {
      const mockPrediction = {
        prediction: 'expense_increase',
        confidence: 0.85,
        factors: ['seasonal_trend', 'historical_pattern']
      };

      const mockMLEngine = {
        predict: jest.fn().mockResolvedValue(mockPrediction)
      };

      (aiService as any).mlEngine = mockMLEngine;

      const request = {
        modelId: 'expense-predictor',
        input: { historicalExpenses: [1000, 1200, 1100] }
      };

      const result = await aiService.predict(request);

      expect(result).toBe(mockPrediction);
      expect(result.prediction).toBe('expense_increase');
      expect(mockMLEngine.predict).toHaveBeenCalledWith(request);
    });
  });

  describe('trainModel', () => {
    it('should train ML model', async () => {
      const mockTraining = {
        accuracy: 0.92,
        precision: 0.89,
        recall: 0.91,
        f1Score: 0.90,
        auc: 0.95,
        featureImportance: { 'merchant': 0.8, 'amount': 0.6 }
      };

      const mockMLEngine = {
        trainModel: jest.fn().mockResolvedValue(mockTraining)
      };

      (aiService as any).mlEngine = mockMLEngine;

      const modelId = 'categorization-model-001';
      const dataset = { transactions: [] };
      const hyperparameters = { learningRate: 0.001 };

      const result = await aiService.trainModel(modelId, dataset, hyperparameters);

      expect(result).toBe(mockTraining);
      expect(result.accuracy).toBe(0.92);
      expect(mockMLEngine.trainModel).toHaveBeenCalledWith(modelId, dataset, hyperparameters);
    });
  });

  describe('extractTransactionFeatures', () => {
    it('should extract features from transaction', async () => {
      const mockFeatures = {
        merchant: 'Staples',
        category: 'office_supplies',
        amount: 45.99,
        features: ['merchant_name', 'amount_range', 'time_pattern']
      };

      const mockMLEngine = {
        extractTransactionFeatures: jest.fn().mockResolvedValue(mockFeatures)
      };

      (aiService as any).mlEngine = mockMLEngine;

      const transaction = {
        description: 'STAPLES OFFICE SUPPLIES',
        amount: 45.99,
        date: '2024-01-15'
      };

      const result = await aiService.extractTransactionFeatures(transaction);

      expect(result).toBe(mockFeatures);
      expect(result.merchant).toBe('Staples');
      expect(mockMLEngine.extractTransactionFeatures).toHaveBeenCalledWith(transaction);
    });
  });

  describe('getModels', () => {
    it('should return available models', () => {
      const mockModels = [
        { id: 'model-1', name: 'Transaction Categorizer', status: 'deployed' },
        { id: 'model-2', name: 'Fraud Detector', status: 'training' }
      ];

      const mockMLEngine = {
        getModels: jest.fn().mockReturnValue(mockModels)
      };

      (aiService as any).mlEngine = mockMLEngine;

      const result = aiService.getModels();

      expect(result).toBe(mockModels);
      expect(result).toHaveLength(2);
      expect(mockMLEngine.getModels).toHaveBeenCalled();
    });
  });
}); 