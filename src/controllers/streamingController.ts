import { Request, Response } from 'express';
import { financialEventIntegration } from '../services/financialEventIntegration';
import { streamProcessingService } from '../services/streamProcessingService';
import { kafkaEventProducer } from '../services/kafkaEventProducer';

/**
 * 🔄 Streaming Controller
 * Monitor and manage streaming infrastructure
 */
export class StreamingController {
  
  /**
   * 📊 GET STREAMING STATUS
   * Return comprehensive streaming metrics
   */
  static async getStreamingStatus(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      
      const metrics = financialEventIntegration.getMetrics();
      
      res.json({
        success: true,
        data: {
          streaming: {
            enabled: metrics.isStreamingEnabled,
            eventCount: metrics.eventCount,
            errorCount: metrics.errorCount,
            errorRate: `${metrics.errorRate.toFixed(2)}%`,
            status: metrics.isStreamingEnabled ? 'active' : 'disabled',
          },
          kafka: metrics.kafkaMetrics,
          streamProcessing: metrics.streamProcessingStatus,
          health: {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV,
          }
        },
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error('Error getting streaming status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get streaming status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 🧪 TEST STREAMING
   * Send test events to validate streaming pipeline
   */
  static async testStreaming(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'test-tenant';
      
      console.log('🧪 Starting streaming test...');
      
      const testResult = await financialEventIntegration.testStreaming();
      
      if (testResult) {
        res.json({
          success: true,
          message: 'Streaming test completed successfully',
          data: {
            testPassed: true,
            timestamp: new Date().toISOString(),
            tenantId,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Streaming test failed or streaming is disabled',
          data: {
            testPassed: false,
            timestamp: new Date().toISOString(),
            tenantId,
          },
        });
      }
      
    } catch (error) {
      console.error('Error testing streaming:', error);
      res.status(500).json({
        success: false,
        error: 'Streaming test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 🔄 RESTART STREAMING
   * Restart streaming services
   */
  static async restartStreaming(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔄 Restarting streaming services...');
      
      // Shutdown current streaming
      await financialEventIntegration.shutdown();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reinitialize streaming
      await financialEventIntegration.initialize();
      
      const metrics = financialEventIntegration.getMetrics();
      
      res.json({
        success: true,
        message: 'Streaming services restarted successfully',
        data: {
          status: metrics.isStreamingEnabled ? 'active' : 'disabled',
          timestamp: new Date().toISOString(),
        },
      });
      
    } catch (error) {
      console.error('Error restarting streaming:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to restart streaming services',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 📤 PUBLISH TEST EVENT
   * Manually publish a test financial event
   */
  static async publishTestEvent(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'test-tenant';
      const { eventType, testData } = req.body;
      
      if (!eventType) {
        res.status(400).json({
          success: false,
          error: 'Event type is required',
        });
        return;
      }

      let result = false;

      switch (eventType) {
        case 'transaction.created':
          await financialEventIntegration.publishTransactionCreated({
            transactionId: `test_tx_${Date.now()}`,
            journalId: `test_journal_${Date.now()}`,
            tenantId,
            userId: 'test-user',
            entries: [
              {
                entryId: 'test_entry_1',
                accountId: 'test_acc_cash',
                accountCode: '1000',
                accountName: 'Test Cash Account',
                amount: testData?.amount || 100,
                type: 'DEBIT',
                currency: 'USD',
                exchangeRate: 1.0,
              },
              {
                entryId: 'test_entry_2',
                accountId: 'test_acc_revenue',
                accountCode: '4000',
                accountName: 'Test Revenue Account',
                amount: testData?.amount || 100,
                type: 'CREDIT',
                currency: 'USD',
                exchangeRate: 1.0,
              },
            ],
            totalAmount: testData?.amount || 100,
            currency: 'USD',
            memo: testData?.memo || 'Test transaction from API',
            reference: `TEST-API-${Date.now()}`,
            postedAt: new Date(),
          });
          result = true;
          break;

        case 'payment.received':
          await financialEventIntegration.publishPaymentReceived({
            paymentId: `test_pay_${Date.now()}`,
            tenantId,
            customerId: 'test-customer',
            customerName: 'Test Customer',
            amount: testData?.amount || 50,
            currency: 'USD',
            paymentMethod: 'BANK_TRANSFER',
            paymentDate: new Date(),
            notes: testData?.notes || 'Test payment from API',
          });
          result = true;
          break;

        case 'invoice.created':
          await financialEventIntegration.publishInvoiceCreated({
            invoiceId: `test_inv_${Date.now()}`,
            invoiceNumber: `TEST-INV-${Date.now()}`,
            tenantId,
            customerId: 'test-customer',
            customerName: 'Test Customer',
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            currency: 'USD',
            subtotal: testData?.amount || 100,
            taxAmount: testData?.taxAmount || 10,
            totalAmount: (testData?.amount || 100) + (testData?.taxAmount || 10),
            status: 'DRAFT',
            items: [
              {
                description: testData?.description || 'Test item',
                quantity: 1,
                unitPrice: testData?.amount || 100,
                totalPrice: testData?.amount || 100,
                taxRate: 10,
              },
            ],
          });
          result = true;
          break;

        default:
          res.status(400).json({
            success: false,
            error: `Unsupported event type: ${eventType}`,
            supportedTypes: ['transaction.created', 'payment.received', 'invoice.created'],
          });
          return;
      }

      if (result) {
        res.json({
          success: true,
          message: `Test ${eventType} event published successfully`,
          data: {
            eventType,
            tenantId,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to publish test event',
        });
      }
      
    } catch (error) {
      console.error('Error publishing test event:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to publish test event',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 📋 GET KAFKA TOPICS
   * List available Kafka topics
   */
  static async getKafkaTopics(req: Request, res: Response): Promise<void> {
    try {
      // For now, return the configured topics
      // In production, you could query Kafka admin to get actual topics
      const topics = [
        'financial.transactions',
        'financial.payments',
        'financial.ai-events',
        'financial.business-events',
        'financial.dlq',
      ];

      res.json({
        success: true,
        data: {
          topics,
          totalCount: topics.length,
          timestamp: new Date().toISOString(),
        },
      });
      
    } catch (error) {
      console.error('Error getting Kafka topics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Kafka topics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
