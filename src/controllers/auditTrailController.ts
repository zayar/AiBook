import { Request, Response } from 'express';
import { AuditTrailEngine, AuditAction, AuditFilter } from '../accounting/engines/AuditTrailEngine';

export class AuditTrailController {
  /**
   * 🔍 SEARCH AUDIT TRAIL
   * GET /api/v1/audit/search
   */
  static async searchAuditTrail(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.tenant!;
      const userId = req.user?.uid || 'system';
      const userEmail = req.user?.email;
      
      const {
        entityType,
        entityId,
        action,
        userId: filterUserId,
        startDate,
        endDate,
        ipAddress,
        page = 1,
        limit = 50
      } = req.query;

      const auditEngine = new AuditTrailEngine(tenantId);

      // Build filter
      const filter: AuditFilter = {};
      if (entityType) filter.entityType = entityType as string;
      if (entityId) filter.entityId = entityId as string;
      if (action) filter.action = action as AuditAction;
      if (filterUserId) filter.userId = filterUserId as string;
      if (ipAddress) filter.ipAddress = ipAddress as string;
      if (startDate) filter.startDate = new Date(startDate as string);
      if (endDate) filter.endDate = new Date(endDate as string);

      // Search audit trail
      const result = await auditEngine.searchAuditTrail(
        filter,
        parseInt(page as string),
        parseInt(limit as string)
      );

      // Log the search activity
      await auditEngine.logAuditEvent({
        entityType: 'AUDIT_TRAIL',
        entityId: 'SEARCH',
        action: 'VIEW',
        userId,
        userEmail,
        newValues: {
          filter,
          resultCount: result.entries.length
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Audit trail search'
      });

      res.json({
        message: 'Audit trail search completed',
        data: result.entries,
        pagination: {
          page: result.page,
          limit: parseInt(limit as string),
          total: result.total,
          totalPages: result.totalPages
        }
      });

    } catch (error) {
      console.error('Error searching audit trail:', error);
      res.status(500).json({ 
        error: 'Failed to search audit trail',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 📊 GENERATE COMPLIANCE REPORT
   * GET /api/v1/audit/compliance-report
   */
  static async generateComplianceReport(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.tenant!;
      const userId = req.user?.uid || 'system';
      const userEmail = req.user?.email;
      
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'Start date and end date are required' });
        return;
      }

      const auditEngine = new AuditTrailEngine(tenantId);

      // Generate compliance report
      const report = await auditEngine.generateComplianceReport(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      // Log report generation
      await auditEngine.logAuditEvent({
        entityType: 'COMPLIANCE_REPORT',
        entityId: `${startDate}-${endDate}`,
        action: 'EXPORT',
        userId,
        userEmail,
        newValues: {
          period: report.period,
          totalTransactions: report.totalTransactions,
          userCount: report.userActivity.length,
          criticalActionsCount: report.criticalActions.length
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Compliance report generation'
      });

      res.json({
        message: 'Compliance report generated successfully',
        report
      });

    } catch (error) {
      console.error('Error generating compliance report:', error);
      res.status(500).json({ 
        error: 'Failed to generate compliance report',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 📤 EXPORT AUDIT TRAIL
   * GET /api/v1/audit/export
   */
  static async exportAuditTrail(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.tenant!;
      const userId = req.user?.uid || 'system';
      const userEmail = req.user?.email;
      
      const {
        entityType,
        entityId,
        action,
        userId: filterUserId,
        startDate,
        endDate,
        ipAddress,
        format = 'JSON'
      } = req.query;

      const auditEngine = new AuditTrailEngine(tenantId);

      // Build filter
      const filter: AuditFilter = {};
      if (entityType) filter.entityType = entityType as string;
      if (entityId) filter.entityId = entityId as string;
      if (action) filter.action = action as AuditAction;
      if (filterUserId) filter.userId = filterUserId as string;
      if (ipAddress) filter.ipAddress = ipAddress as string;
      if (startDate) filter.startDate = new Date(startDate as string);
      if (endDate) filter.endDate = new Date(endDate as string);

      // Export audit trail
      const exportData = await auditEngine.exportAuditTrail(
        filter,
        (format as string).toUpperCase() as 'JSON' | 'CSV'
      );

      // Log export activity
      await auditEngine.logAuditEvent({
        entityType: 'AUDIT_TRAIL',
        entityId: 'EXPORT',
        action: 'EXPORT',
        userId,
        userEmail,
        newValues: {
          filter,
          format,
          exportSize: exportData.length
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Audit trail export'
      });

      // Set response headers based on format
      if (format === 'CSV') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-trail-${Date.now()}.csv"`);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="audit-trail-${Date.now()}.json"`);
      }

      res.send(exportData);

    } catch (error) {
      console.error('Error exporting audit trail:', error);
      res.status(500).json({ 
        error: 'Failed to export audit trail',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 👤 GET USER ACTIVITY
   * GET /api/v1/audit/user-activity/:userId
   */
  static async getUserActivity(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.tenant!;
      const { userId: targetUserId } = req.params;
      const { startDate, endDate, limit = 100 } = req.query;

      const auditEngine = new AuditTrailEngine(tenantId);

      // Build filter for user activity
      const filter: AuditFilter = {
        userId: targetUserId
      };
      
      if (startDate) filter.startDate = new Date(startDate as string);
      if (endDate) filter.endDate = new Date(endDate as string);

      // Get user activity
      const result = await auditEngine.searchAuditTrail(
        filter,
        1,
        parseInt(limit as string)
      );

      // Calculate activity summary
      const actionCounts = result.entries.reduce((acc, entry) => {
        acc[entry.action] = (acc[entry.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const entityCounts = result.entries.reduce((acc, entry) => {
        acc[entry.entityType] = (acc[entry.entityType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        message: 'User activity retrieved successfully',
        userId: targetUserId,
        period: {
          startDate: filter.startDate,
          endDate: filter.endDate
        },
        summary: {
          totalActions: result.entries.length,
          actionBreakdown: actionCounts,
          entityBreakdown: entityCounts,
          lastActivity: result.entries[0]?.timestamp
        },
        recentActivity: result.entries.slice(0, 20)
      });

    } catch (error) {
      console.error('Error getting user activity:', error);
      res.status(500).json({ 
        error: 'Failed to get user activity',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 🚨 GET CRITICAL ACTIONS
   * GET /api/v1/audit/critical-actions
   */
  static async getCriticalActions(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.tenant!;
      const { startDate, endDate, limit = 50 } = req.query;

      const auditEngine = new AuditTrailEngine(tenantId);

      // Build filter for critical actions
      const filter: AuditFilter = {};
      if (startDate) filter.startDate = new Date(startDate as string);
      if (endDate) filter.endDate = new Date(endDate as string);

      // Get all audit entries and filter for critical actions
      const result = await auditEngine.searchAuditTrail(filter, 1, 1000);
      
      const criticalActions = result.entries.filter(entry => 
        ['DELETE', 'VOID', 'REVERSE', 'APPROVE'].includes(entry.action)
      ).slice(0, parseInt(limit as string));

      res.json({
        message: 'Critical actions retrieved successfully',
        actions: criticalActions,
        count: criticalActions.length,
        period: {
          startDate: filter.startDate,
          endDate: filter.endDate
        }
      });

    } catch (error) {
      console.error('Error getting critical actions:', error);
      res.status(500).json({ 
        error: 'Failed to get critical actions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 🔍 GET ENTITY AUDIT HISTORY
   * GET /api/v1/audit/entity/:entityType/:entityId
   */
  static async getEntityAuditHistory(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.tenant!;
      const { entityType, entityId } = req.params;
      const { limit = 50 } = req.query;

      const auditEngine = new AuditTrailEngine(tenantId);

      // Get audit history for specific entity
      const result = await auditEngine.searchAuditTrail(
        { entityType, entityId },
        1,
        parseInt(limit as string)
      );

      res.json({
        message: 'Entity audit history retrieved successfully',
        entityType,
        entityId,
        history: result.entries,
        count: result.entries.length
      });

    } catch (error) {
      console.error('Error getting entity audit history:', error);
      res.status(500).json({ 
        error: 'Failed to get entity audit history',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}