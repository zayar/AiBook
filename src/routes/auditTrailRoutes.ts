import { Router } from 'express';
import { AuditTrailController } from '../controllers/auditTrailController';

const router = Router();

/**
 * 📝 AUDIT TRAIL ROUTES
 * 
 * Comprehensive audit trail functionality for compliance and tracking
 */

// Search audit trail
router.get('/search', AuditTrailController.searchAuditTrail);

// Generate compliance report
router.get('/compliance-report', AuditTrailController.generateComplianceReport);

// Export audit trail
router.get('/export', AuditTrailController.exportAuditTrail);

// Get user activity
router.get('/user-activity/:userId', AuditTrailController.getUserActivity);

// Get critical actions
router.get('/critical-actions', AuditTrailController.getCriticalActions);

// Get entity audit history
router.get('/entity/:entityType/:entityId', AuditTrailController.getEntityAuditHistory);

export default router; 