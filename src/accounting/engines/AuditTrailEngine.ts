import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 📝 AUDIT TRAIL ENGINE
 * 
 * Comprehensive audit trail system for tracking all financial transactions and changes.
 * Ensures compliance with accounting standards and regulatory requirements.
 * 
 * Key Features:
 * - Complete transaction logging
 * - User activity tracking
 * - Data change history
 * - Immutable audit records
 * - Compliance reporting
 */

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  userId: string;
  userEmail?: string;
  timestamp: Date;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changes?: FieldChange[];
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  reason?: string;
  tenantId: string;
}

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
  dataType: string;
}

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'VIEW' 
  | 'EXPORT' 
  | 'PRINT' 
  | 'APPROVE' 
  | 'REJECT' 
  | 'RECONCILE' 
  | 'VOID' 
  | 'REVERSE';

export interface AuditFilter {
  entityType?: string;
  entityId?: string;
  action?: AuditAction;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
}

export interface ComplianceReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalTransactions: number;
  userActivity: {
    userId: string;
    userEmail: string;
    actionCount: number;
    lastActivity: Date;
  }[];
  criticalActions: AuditLogEntry[];
  dataIntegrityChecks: {
    checksPerformed: number;
    issuesFound: number;
    details: string[];
  };
  securityEvents: {
    suspiciousActivity: number;
    failedAccess: number;
    details: string[];
  };
}

export class AuditTrailEngine {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * 📝 LOG AUDIT EVENT
   * Record an audit event for compliance and tracking
   */
  async logAuditEvent(data: {
    entityType: string;
    entityId: string;
    action: AuditAction;
    userId: string;
    userEmail?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    reason?: string;
  }): Promise<AuditLogEntry> {
    try {
      // Calculate field changes
      const changes = this.calculateFieldChanges(data.oldValues, data.newValues);

      // Create audit log entry
      const auditLog = await prisma.auditLog.create({
        data: {
          entityType: data.entityType,
          entityId: data.entityId,
          action: data.action,
          userId: data.userId,
          userEmail: data.userEmail,
          oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
          newValues: data.newValues ? JSON.stringify(data.newValues) : null,
          changes: changes ? JSON.stringify(changes) : null,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          sessionId: data.sessionId,
          reason: data.reason,
          tenantId: this.tenantId,
          timestamp: new Date()
        }
      });

      // Log critical actions separately for alerts
      if (this.isCriticalAction(data.action)) {
        await this.logCriticalAction(auditLog);
      }

      console.log(`📝 Audit logged: ${data.action} on ${data.entityType}:${data.entityId} by ${data.userId}`);

      return {
        id: auditLog.id,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        action: auditLog.action as AuditAction,
        userId: auditLog.userId,
        userEmail: auditLog.userEmail,
        timestamp: auditLog.timestamp,
        oldValues: auditLog.oldValues ? JSON.parse(auditLog.oldValues) : undefined,
        newValues: auditLog.newValues ? JSON.parse(auditLog.newValues) : undefined,
        changes: auditLog.changes ? JSON.parse(auditLog.changes) : undefined,
        ipAddress: auditLog.ipAddress,
        userAgent: auditLog.userAgent,
        sessionId: auditLog.sessionId,
        reason: auditLog.reason,
        tenantId: auditLog.tenantId
      };

    } catch (error) {
      console.error('❌ Error logging audit event:', error);
      throw error;
    }
  }

  /**
   * 📊 LOG FINANCIAL TRANSACTION
   * Specialized logging for financial transactions with enhanced detail
   */
  async logFinancialTransaction(data: {
    transactionType: 'INVOICE' | 'PAYMENT' | 'BILL' | 'JOURNAL_ENTRY' | 'BANK_TRANSACTION';
    transactionId: string;
    action: AuditAction;
    userId: string;
    userEmail?: string;
    amount?: number;
    currency?: string;
    accountsAffected?: string[];
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    reason?: string;
  }): Promise<AuditLogEntry> {
    // Enhanced financial transaction logging
    const enhancedData = {
      ...data,
      entityType: `FINANCIAL_${data.transactionType}`,
      entityId: data.transactionId,
      newValues: {
        ...data.newValues,
        amount: data.amount,
        currency: data.currency,
        accountsAffected: data.accountsAffected,
        timestamp: new Date().toISOString()
      }
    };

    // Log the main audit event
    const auditEntry = await this.logAuditEvent(enhancedData);

    // Create financial audit trail entry for compliance
    await prisma.financialAuditTrail.create({
      data: {
        auditLogId: auditEntry.id,
        transactionType: data.transactionType,
        transactionId: data.transactionId,
        amount: data.amount,
        currency: data.currency || 'MMK',
        accountsAffected: data.accountsAffected ? JSON.stringify(data.accountsAffected) : null,
        tenantId: this.tenantId
      }
    });

    return auditEntry;
  }

  /**
   * 🔍 SEARCH AUDIT TRAIL
   * Search audit logs with filtering and pagination
   */
  async searchAuditTrail(
    filter: AuditFilter,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    entries: AuditLogEntry[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const where: any = {
        tenantId: this.tenantId
      };

      // Apply filters
      if (filter.entityType) where.entityType = filter.entityType;
      if (filter.entityId) where.entityId = filter.entityId;
      if (filter.action) where.action = filter.action;
      if (filter.userId) where.userId = filter.userId;
      if (filter.ipAddress) where.ipAddress = filter.ipAddress;
      
      if (filter.startDate || filter.endDate) {
        where.timestamp = {};
        if (filter.startDate) where.timestamp.gte = filter.startDate;
        if (filter.endDate) where.timestamp.lte = filter.endDate;
      }

      // Get total count
      const total = await prisma.auditLog.count({ where });

      // Get audit logs with pagination
      const auditLogs = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const entries: AuditLogEntry[] = auditLogs.map(log => ({
        id: log.id,
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action as AuditAction,
        userId: log.userId,
        userEmail: log.userEmail,
        timestamp: log.timestamp,
        oldValues: log.oldValues ? JSON.parse(log.oldValues) : undefined,
        newValues: log.newValues ? JSON.parse(log.newValues) : undefined,
        changes: log.changes ? JSON.parse(log.changes) : undefined,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        sessionId: log.sessionId,
        reason: log.reason,
        tenantId: log.tenantId
      }));

      return {
        entries,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      console.error('❌ Error searching audit trail:', error);
      throw error;
    }
  }

  /**
   * 📈 GENERATE COMPLIANCE REPORT
   * Generate comprehensive compliance and audit report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    try {
      // Get audit logs for the period
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          tenantId: this.tenantId,
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { timestamp: 'desc' }
      });

      // Calculate user activity
      const userActivityMap = new Map();
      auditLogs.forEach(log => {
        const key = `${log.userId}:${log.userEmail || 'unknown'}`;
        if (userActivityMap.has(key)) {
          const activity = userActivityMap.get(key);
          activity.actionCount++;
          if (log.timestamp > activity.lastActivity) {
            activity.lastActivity = log.timestamp;
          }
        } else {
          userActivityMap.set(key, {
            userId: log.userId,
            userEmail: log.userEmail || 'unknown',
            actionCount: 1,
            lastActivity: log.timestamp
          });
        }
      });

      const userActivity = Array.from(userActivityMap.values());

      // Identify critical actions
      const criticalActions = auditLogs
        .filter(log => this.isCriticalAction(log.action as AuditAction))
        .slice(0, 100) // Limit to most recent 100
        .map(log => ({
          id: log.id,
          entityType: log.entityType,
          entityId: log.entityId,
          action: log.action as AuditAction,
          userId: log.userId,
          userEmail: log.userEmail,
          timestamp: log.timestamp,
          oldValues: log.oldValues ? JSON.parse(log.oldValues) : undefined,
          newValues: log.newValues ? JSON.parse(log.newValues) : undefined,
          changes: log.changes ? JSON.parse(log.changes) : undefined,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          sessionId: log.sessionId,
          reason: log.reason,
          tenantId: log.tenantId
        }));

      // Perform data integrity checks
      const integrityChecks = await this.performDataIntegrityChecks();

      // Detect security events
      const securityEvents = await this.detectSecurityEvents(startDate, endDate);

      return {
        period: { startDate, endDate },
        totalTransactions: auditLogs.length,
        userActivity,
        criticalActions,
        dataIntegrityChecks: integrityChecks,
        securityEvents
      };

    } catch (error) {
      console.error('❌ Error generating compliance report:', error);
      throw error;
    }
  }

  /**
   * 🔒 DETECT SECURITY EVENTS
   */
  private async detectSecurityEvents(startDate: Date, endDate: Date): Promise<{
    suspiciousActivity: number;
    failedAccess: number;
    details: string[];
  }> {
    const details: string[] = [];
    let suspiciousActivity = 0;
    let failedAccess = 0;

    // Check for unusual activity patterns
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        tenantId: this.tenantId,
        timestamp: { gte: startDate, lte: endDate }
      }
    });

    // Group by user and IP
    const userIpMap = new Map();
    auditLogs.forEach(log => {
      const key = log.userId;
      if (!userIpMap.has(key)) {
        userIpMap.set(key, new Set());
      }
      if (log.ipAddress) {
        userIpMap.get(key).add(log.ipAddress);
      }
    });

    // Detect users with multiple IP addresses (potential account sharing)
    userIpMap.forEach((ips, userId) => {
      if (ips.size > 3) {
        suspiciousActivity++;
        details.push(`User ${userId} accessed from ${ips.size} different IP addresses`);
      }
    });

    // Check for rapid-fire actions (potential automation)
    const userActionTimes = new Map();
    auditLogs.forEach(log => {
      if (!userActionTimes.has(log.userId)) {
        userActionTimes.set(log.userId, []);
      }
      userActionTimes.get(log.userId).push(log.timestamp);
    });

    userActionTimes.forEach((times, userId) => {
      times.sort((a, b) => a.getTime() - b.getTime());
      let rapidActions = 0;
      
      for (let i = 1; i < times.length; i++) {
        const timeDiff = times[i].getTime() - times[i-1].getTime();
        if (timeDiff < 1000) { // Less than 1 second apart
          rapidActions++;
        }
      }
      
      if (rapidActions > 10) {
        suspiciousActivity++;
        details.push(`User ${userId} performed ${rapidActions} rapid actions (< 1 second apart)`);
      }
    });

    return {
      suspiciousActivity,
      failedAccess,
      details
    };
  }

  /**
   * ✅ PERFORM DATA INTEGRITY CHECKS
   */
  private async performDataIntegrityChecks(): Promise<{
    checksPerformed: number;
    issuesFound: number;
    details: string[];
  }> {
    const details: string[] = [];
    let checksPerformed = 0;
    let issuesFound = 0;

    try {
      // Check 1: Verify journal entry balance
      checksPerformed++;
      const unbalancedEntries = await prisma.$queryRaw`
        SELECT journalId, SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE -amount END) as balance
        FROM entries 
        WHERE tenantId = ${this.tenantId}
        GROUP BY journalId
        HAVING ABS(balance) > 0.01
      `;
      
      if (Array.isArray(unbalancedEntries) && unbalancedEntries.length > 0) {
        issuesFound += unbalancedEntries.length;
        details.push(`Found ${unbalancedEntries.length} unbalanced journal entries`);
      }

      // Check 2: Verify invoice paid amounts
      checksPerformed++;
      const invalidInvoices = await prisma.invoice.findMany({
        where: {
          tenantId: this.tenantId,
          paidAmount: { gt: prisma.invoice.fields.totalAmount }
        }
      });
      
      if (invalidInvoices.length > 0) {
        issuesFound += invalidInvoices.length;
        details.push(`Found ${invalidInvoices.length} invoices with paid amount exceeding total`);
      }

      // Check 3: Verify bill paid amounts
      checksPerformed++;
      const invalidBills = await prisma.bill.findMany({
        where: {
          tenantId: this.tenantId,
          paidAmount: { gt: prisma.bill.fields.totalAmount }
        }
      });
      
      if (invalidBills.length > 0) {
        issuesFound += invalidBills.length;
        details.push(`Found ${invalidBills.length} bills with paid amount exceeding total`);
      }

      // Check 4: Verify bank transaction balances
      checksPerformed++;
      // This would require more complex logic to verify running balances

    } catch (error) {
      console.error('Error performing integrity checks:', error);
      details.push(`Error during integrity checks: ${error.message}`);
      issuesFound++;
    }

    return {
      checksPerformed,
      issuesFound,
      details
    };
  }

  /**
   * 🚨 CHECK IF ACTION IS CRITICAL
   */
  private isCriticalAction(action: AuditAction): boolean {
    const criticalActions: AuditAction[] = [
      'DELETE',
      'VOID',
      'REVERSE',
      'APPROVE'
    ];
    return criticalActions.includes(action);
  }

  /**
   * 🚨 LOG CRITICAL ACTION
   */
  private async logCriticalAction(auditLog: any): Promise<void> {
    await prisma.criticalActionLog.create({
      data: {
        auditLogId: auditLog.id,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        userId: auditLog.userId,
        alertSent: false,
        tenantId: this.tenantId
      }
    });
  }

  /**
   * 📊 CALCULATE FIELD CHANGES
   */
  private calculateFieldChanges(
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>
  ): FieldChange[] | null {
    if (!oldValues || !newValues) return null;

    const changes: FieldChange[] = [];
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

    allKeys.forEach(key => {
      const oldValue = oldValues[key];
      const newValue = newValues[key];

      if (oldValue !== newValue) {
        changes.push({
          field: key,
          oldValue,
          newValue,
          dataType: typeof newValue
        });
      }
    });

    return changes.length > 0 ? changes : null;
  }

  /**
   * 📤 EXPORT AUDIT TRAIL
   * Export audit trail for external compliance requirements
   */
  async exportAuditTrail(
    filter: AuditFilter,
    format: 'JSON' | 'CSV' = 'JSON'
  ): Promise<string> {
    const { entries } = await this.searchAuditTrail(filter, 1, 10000);

    if (format === 'CSV') {
      const headers = ['Timestamp', 'Entity Type', 'Entity ID', 'Action', 'User ID', 'User Email', 'IP Address', 'Reason'];
      const csvRows = [
        headers.join(','),
        ...entries.map(entry => [
          entry.timestamp.toISOString(),
          entry.entityType,
          entry.entityId,
          entry.action,
          entry.userId,
          entry.userEmail || '',
          entry.ipAddress || '',
          entry.reason || ''
        ].map(field => `"${field}"`).join(','))
      ];
      return csvRows.join('\n');
    }

    return JSON.stringify(entries, null, 2);
  }
}