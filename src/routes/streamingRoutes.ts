import { Router } from 'express';
import { StreamingController } from '../controllers/streamingController';
import { authMiddleware } from '../middleware/authMiddleware';
import { enhancedTenantMiddleware } from '../middleware/enhancedTenantMiddleware';

const router = Router();

/**
 * 🔄 STREAMING ROUTES
 * Monitor and manage real-time financial event streaming
 */

// Apply authentication and tenant middleware
router.use(authMiddleware);
router.use(enhancedTenantMiddleware);

/**
 * @route   GET /api/v1/streaming/status
 * @desc    Get streaming infrastructure status and metrics
 * @access  Private
 */
router.get('/status', StreamingController.getStreamingStatus);

/**
 * @route   POST /api/v1/streaming/test
 * @desc    Run streaming infrastructure test
 * @access  Private
 */
router.post('/test', StreamingController.testStreaming);

/**
 * @route   POST /api/v1/streaming/restart
 * @desc    Restart streaming services
 * @access  Private (Admin only)
 */
router.post('/restart', StreamingController.restartStreaming);

/**
 * @route   POST /api/v1/streaming/events/test
 * @desc    Publish test financial event
 * @access  Private
 * @body    { eventType: string, testData?: object }
 */
router.post('/events/test', StreamingController.publishTestEvent);

/**
 * @route   GET /api/v1/streaming/topics
 * @desc    Get available Kafka topics
 * @access  Private
 */
router.get('/topics', StreamingController.getKafkaTopics);

export default router;
