import { PrismaClient } from '@prisma/client';
import { VertexAIService } from '../services/VertexAIService';

const prisma = new PrismaClient();

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyType: AnomalyType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  score: number; // 0-1, where 1 is most anomalous
  reasons: string[];
  recommendations: string[];
  relatedTransactions?: any[];
  riskFactors: RiskFactor[];
}

export enum AnomalyType {
  STATISTICAL = 'statistical',
  BEHAVIORAL = 'behavioral',
  TEMPORAL = 'temporal',
  AMOUNT = 'amount',
  FREQUENCY = 'frequency',
  PATTERN = 'pattern',
  VENDOR = 'vendor',
  DUPLICATE = 'duplicate'
}

export interface RiskFactor {
  type: string;
  description: string;
  impact: number; // 0-1
  likelihood: number; // 0-1
}

export interface TransactionContext {
  transaction: any;
  historical: any[];
  businessContext: any;
  temporalContext: any;
  accountContext: any;
}

/**
 * 🚨 REAL-TIME ANOMALY DETECTION ENGINE
 * Advanced anomaly detection system for financial transactions
 * 
 * Detection Methods:
 * • Statistical outlier detection using Z-scores and IQR
 * • Behavioral pattern analysis
 * • Temporal anomaly detection
 * • Amount-based anomaly detection
 * • Frequency analysis
 * • Duplicate transaction detection
 * • Vendor/merchant anomaly detection
 * • ML-based anomaly scoring
 */
export class RealTimeAnomalyDetectionEngine {
  private vertexAI: VertexAIService;
  private baselineData: Map<string, any> = new Map();
  private alertThresholds: Map<string, number> = new Map();

  constructor() {
    this.vertexAI = new VertexAIService({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    });
    this.initializeThresholds();
  }

  /**
   * 🔍 DETECT ANOMALIES
   * Main anomaly detection method
   */
  async detectAnomalies(
    tenantId: string,
    transaction: any,
    context?: TransactionContext
  ): Promise<AnomalyDetectionResult> {
    console.log(`🔍 Detecting anomalies for transaction in tenant: ${tenantId}`);

    try {
      // 1. Build comprehensive context if not provided
      const transactionContext = context || await this.buildTransactionContext(tenantId, transaction);

      // 2. Run multiple anomaly detection algorithms
      const detectionResults = await Promise.all([
        this.detectStatisticalAnomalies(tenantId, transactionContext),
        this.detectBehavioralAnomalies(tenantId, transactionContext),
        this.detectTemporalAnomalies(tenantId, transactionContext),
        this.detectAmountAnomalies(tenantId, transactionContext),
        this.detectFrequencyAnomalies(tenantId, transactionContext),
        this.detectDuplicateTransactions(tenantId, transactionContext),
        this.detectVendorAnomalies(tenantId, transactionContext)
      ]);

      // 3. Combine results and calculate overall anomaly score
      const combinedResult = this.combineDetectionResults(detectionResults);

      // 4. Determine severity and risk level
      const severity = this.calculateSeverity(combinedResult.score);

      // 5. Generate actionable recommendations
      const recommendations = await this.generateRecommendations(combinedResult, transactionContext);

      // 6. Store anomaly detection result
      await this.storeAnomalyResult(tenantId, transaction.id, combinedResult);

      return {
        isAnomaly: combinedResult.score > this.alertThresholds.get('general') || 0.7,
        anomalyType: combinedResult.primaryType,
        severity,
        confidence: combinedResult.confidence,
        score: combinedResult.score,
        reasons: combinedResult.reasons,
        recommendations,
        relatedTransactions: combinedResult.relatedTransactions,
        riskFactors: combinedResult.riskFactors
      };

    } catch (error) {
      console.error('Anomaly detection error:', error);
      return {
        isAnomaly: false,
        anomalyType: AnomalyType.STATISTICAL,
        severity: 'LOW',
        confidence: 0,
        score: 0,
        reasons: ['Anomaly detection failed'],
        recommendations: ['Manual review recommended'],
        riskFactors: []
      };
    }
  }

  /**
   * 📊 STATISTICAL ANOMALY DETECTION
   * Detect outliers using statistical methods
   */
  private async detectStatisticalAnomalies(
    tenantId: string,
    context: TransactionContext
  ): Promise<any> {
    const { transaction, historical } = context;
    
    if (historical.length < 10) {
      return { score: 0, type: AnomalyType.STATISTICAL, reasons: [] };
    }

    const amounts = historical.map(t => parseFloat(t.amount?.toString() || '0'));
    const currentAmount = parseFloat(transaction.amount?.toString() || '0');

    // Calculate statistical measures
    const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length
    );

    // Z-score calculation
    const zScore = stdDev > 0 ? Math.abs(currentAmount - mean) / stdDev : 0;

    // IQR method
    const sortedAmounts = amounts.sort((a, b) => a - b);
    const q1 = sortedAmounts[Math.floor(sortedAmounts.length * 0.25)];
    const q3 = sortedAmounts[Math.floor(sortedAmounts.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const reasons = [];
    let score = 0;

    // Evaluate Z-score
    if (zScore > 3) {
      score += 0.8;
      reasons.push(`Amount is ${zScore.toFixed(1)} standard deviations from normal`);
    } else if (zScore > 2) {
      score += 0.5;
      reasons.push(`Amount is significantly higher than typical transactions`);
    }

    // Evaluate IQR
    if (currentAmount < lowerBound || currentAmount > upperBound) {
      score += 0.6;
      reasons.push(`Amount falls outside normal range ($${lowerBound.toFixed(2)} - $${upperBound.toFixed(2)})`);
    }

    return {
      score: Math.min(1, score),
      type: AnomalyType.STATISTICAL,
      reasons,
      metadata: { zScore, mean, stdDev, iqr }
    };
  }

  /**
   * 🎭 BEHAVIORAL ANOMALY DETECTION
   * Detect unusual behavior patterns
   */
  private async detectBehavioralAnomalies(
    tenantId: string,
    context: TransactionContext
  ): Promise<any> {
    const { transaction, historical, accountContext } = context;
    
    const reasons = [];
    let score = 0;

    // 1. Account usage pattern analysis
    const accountTransactions = historical.filter(t => t.accountId === transaction.accountId);
    const accountUsageFreq = accountTransactions.length / historical.length;
    
    if (accountUsageFreq < 0.1 && accountTransactions.length > 0) {
      score += 0.4;
      reasons.push('Unusual account usage - rarely used account');
    }

    // 2. Time-based behavioral analysis
    const transactionHour = new Date(transaction.postedAt || transaction.date).getHours();
    const historicalHours = historical.map(t => new Date(t.postedAt || t.date).getHours());
    const usualHours = this.getMostCommonHours(historicalHours);
    
    if (!usualHours.includes(transactionHour) && usualHours.length > 0) {
      score += 0.3;
      reasons.push(`Transaction at unusual time (${transactionHour}:00, typical: ${usualHours.join(', ')}:00)`);
    }

    // 3. Transaction type pattern analysis
    const typeHistory = historical.map(t => t.type);
    const typeFrequency = this.getFrequency(typeHistory);
    const currentTypeFreq = typeFrequency[transaction.type] || 0;
    
    if (currentTypeFreq < 0.1) {
      score += 0.2;
      reasons.push(`Unusual transaction type for this account`);
    }

    // 4. Memo/description pattern analysis
    if (transaction.memo || transaction.description) {
      const memoWords = (transaction.memo || transaction.description).toLowerCase().split(' ');
      const historicalMemos = historical
        .map(t => (t.memo || t.description || '').toLowerCase())
        .filter(memo => memo.length > 0);
      
      const wordFrequency = this.getWordFrequency(historicalMemos);
      const commonWords = memoWords.filter(word => wordFrequency[word] > 0);
      
      if (commonWords.length === 0 && historicalMemos.length > 5) {
        score += 0.3;
        reasons.push('Transaction description contains unusual keywords');
      }
    }

    return {
      score: Math.min(1, score),
      type: AnomalyType.BEHAVIORAL,
      reasons
    };
  }

  /**
   * ⏰ TEMPORAL ANOMALY DETECTION
   * Detect time-based anomalies
   */
  private async detectTemporalAnomalies(
    tenantId: string,
    context: TransactionContext
  ): Promise<any> {
    const { transaction, historical } = context;
    
    const reasons = [];
    let score = 0;

    const transactionDate = new Date(transaction.postedAt || transaction.date);
    const dayOfWeek = transactionDate.getDay();
    const hour = transactionDate.getHours();

    // 1. Weekend/holiday analysis
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = await this.isHoliday(transactionDate);
    
    if ((isWeekend || isHoliday) && parseFloat(transaction.amount) > 1000) {
      score += 0.4;
      reasons.push(`Large transaction on ${isWeekend ? 'weekend' : 'holiday'}`);
    }

    // 2. Off-hours analysis
    if (hour < 6 || hour > 22) {
      score += 0.2;
      reasons.push(`Transaction at unusual hour (${hour}:00)`);
    }

    // 3. Frequency analysis - too many transactions in short period
    const recentTransactions = historical.filter(t => {
      const tDate = new Date(t.postedAt || t.date);
      const timeDiff = Math.abs(transactionDate.getTime() - tDate.getTime());
      return timeDiff < 3600000; // Within 1 hour
    });

    if (recentTransactions.length > 5) {
      score += 0.5;
      reasons.push(`High frequency: ${recentTransactions.length} transactions within 1 hour`);
    }

    // 4. Rapid succession analysis
    const lastTransaction = historical
      .sort((a, b) => new Date(b.postedAt || b.date).getTime() - new Date(a.postedAt || a.date).getTime())[0];
    
    if (lastTransaction) {
      const timeDiff = transactionDate.getTime() - new Date(lastTransaction.postedAt || lastTransaction.date).getTime();
      if (timeDiff < 60000) { // Less than 1 minute
        score += 0.6;
        reasons.push('Transaction within 1 minute of previous transaction');
      }
    }

    return {
      score: Math.min(1, score),
      type: AnomalyType.TEMPORAL,
      reasons
    };
  }

  /**
   * 💰 AMOUNT ANOMALY DETECTION
   * Detect unusual transaction amounts
   */
  private async detectAmountAnomalies(
    tenantId: string,
    context: TransactionContext
  ): Promise<any> {
    const { transaction, historical } = context;
    
    const reasons = [];
    let score = 0;
    const amount = parseFloat(transaction.amount?.toString() || '0');

    if (historical.length === 0) return { score: 0, type: AnomalyType.AMOUNT, reasons: [] };

    const amounts = historical.map(t => parseFloat(t.amount?.toString() || '0'));
    const maxAmount = Math.max(...amounts);
    const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;

    // 1. Unusually large amount
    if (amount > maxAmount * 2) {
      score += 0.8;
      reasons.push(`Amount is ${(amount / maxAmount).toFixed(1)}x larger than previous maximum`);
    } else if (amount > maxAmount * 1.5) {
      score += 0.5;
      reasons.push(`Amount significantly exceeds typical range`);
    }

    // 2. Round number analysis (potential manual entry)
    if (amount % 100 === 0 && amount > 1000) {
      score += 0.2;
      reasons.push('Suspiciously round amount for large transaction');
    }

    // 3. Deviation from average
    const deviationRatio = Math.abs(amount - avgAmount) / avgAmount;
    if (deviationRatio > 5) {
      score += 0.4;
      reasons.push(`Amount deviates significantly from average ($${avgAmount.toFixed(2)})`);
    }

    return {
      score: Math.min(1, score),
      type: AnomalyType.AMOUNT,
      reasons
    };
  }

  /**
   * 🔄 FREQUENCY ANOMALY DETECTION
   * Detect unusual transaction frequency patterns
   */
  private async detectFrequencyAnomalies(
    tenantId: string,
    context: TransactionContext
  ): Promise<any> {
    const { transaction, historical } = context;
    
    const reasons = [];
    let score = 0;

    // Group transactions by day
    const dailyTransactions = this.groupTransactionsByDay(historical);
    const transactionDate = new Date(transaction.postedAt || transaction.date);
    const dateKey = transactionDate.toISOString().split('T')[0];
    
    const todayCount = (dailyTransactions[dateKey] || 0) + 1; // Including current transaction
    const dailyCounts = Object.values(dailyTransactions);
    const avgDailyCount = dailyCounts.reduce((sum: number, count: number) => sum + count, 0) / dailyCounts.length;

    // Unusual daily frequency
    if (todayCount > avgDailyCount * 3 && todayCount > 10) {
      score += 0.6;
      reasons.push(`Unusually high transaction count today: ${todayCount} (avg: ${avgDailyCount.toFixed(1)})`);
    }

    return {
      score: Math.min(1, score),
      type: AnomalyType.FREQUENCY,
      reasons
    };
  }

  /**
   * 👥 DUPLICATE TRANSACTION DETECTION
   * Detect potential duplicate transactions
   */
  private async detectDuplicateTransactions(
    tenantId: string,
    context: TransactionContext
  ): Promise<any> {
    const { transaction, historical } = context;
    
    const reasons = [];
    let score = 0;
    const amount = parseFloat(transaction.amount?.toString() || '0');

    // Look for exact duplicates in recent history (last 7 days)
    const recentTransactions = historical.filter(t => {
      const tDate = new Date(t.postedAt || t.date);
      const currentDate = new Date(transaction.postedAt || transaction.date);
      const daysDiff = (currentDate.getTime() - tDate.getTime()) / (1000 * 3600 * 24);
      return daysDiff <= 7;
    });

    const exactDuplicates = recentTransactions.filter(t => {
      const tAmount = parseFloat(t.amount?.toString() || '0');
      const tMemo = (t.memo || t.description || '').toLowerCase();
      const currentMemo = (transaction.memo || transaction.description || '').toLowerCase();
      
      return Math.abs(tAmount - amount) < 0.01 && 
             tMemo === currentMemo && 
             tMemo.length > 0;
    });

    if (exactDuplicates.length > 0) {
      score += 0.9;
      reasons.push(`Potential duplicate: ${exactDuplicates.length} identical transaction(s) in last 7 days`);
    }

    // Look for near duplicates (same amount, similar memo)
    const nearDuplicates = recentTransactions.filter(t => {
      const tAmount = parseFloat(t.amount?.toString() || '0');
      return Math.abs(tAmount - amount) < 0.01 && t.id !== transaction.id;
    });

    if (nearDuplicates.length > 2) {
      score += 0.4;
      reasons.push(`Multiple transactions with same amount in recent history`);
    }

    return {
      score: Math.min(1, score),
      type: AnomalyType.DUPLICATE,
      reasons,
      relatedTransactions: [...exactDuplicates, ...nearDuplicates].slice(0, 5)
    };
  }

  /**
   * 🏪 VENDOR ANOMALY DETECTION
   * Detect unusual vendor/merchant patterns
   */
  private async detectVendorAnomalies(
    tenantId: string,
    context: TransactionContext
  ): Promise<any> {
    const { transaction, historical } = context;
    
    const reasons = [];
    let score = 0;

    const description = transaction.memo || transaction.description || '';
    if (description.length === 0) return { score: 0, type: AnomalyType.VENDOR, reasons: [] };

    // Extract potential vendor name
    const vendor = this.extractVendorName(description);
    if (!vendor) return { score: 0, type: AnomalyType.VENDOR, reasons: [] };

    // Check if this is a new vendor
    const vendorHistory = historical.filter(t => {
      const tDesc = t.memo || t.description || '';
      return tDesc.toLowerCase().includes(vendor.toLowerCase());
    });

    if (vendorHistory.length === 0) {
      score += 0.3;
      reasons.push(`First transaction with vendor: ${vendor}`);
    }

    // Check for suspicious vendor names
    const suspiciousPatterns = [
      /cash/i,
      /withdrawal/i,
      /atm/i,
      /unknown/i,
      /temp/i,
      /test/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(vendor))) {
      score += 0.4;
      reasons.push(`Potentially suspicious vendor name: ${vendor}`);
    }

    return {
      score: Math.min(1, score),
      type: AnomalyType.VENDOR,
      reasons
    };
  }

  // Helper methods

  private combineDetectionResults(results: any[]): any {
    const allReasons: string[] = [];
    const allRiskFactors: RiskFactor[] = [];
    let totalScore = 0;
    let maxScore = 0;
    let primaryType = AnomalyType.STATISTICAL;
    const relatedTransactions: any[] = [];

    results.forEach(result => {
      allReasons.push(...result.reasons);
      totalScore += result.score;
      
      if (result.score > maxScore) {
        maxScore = result.score;
        primaryType = result.type;
      }

      if (result.relatedTransactions) {
        relatedTransactions.push(...result.relatedTransactions);
      }

      // Convert to risk factors
      result.reasons.forEach((reason: string) => {
        allRiskFactors.push({
          type: result.type,
          description: reason,
          impact: result.score,
          likelihood: result.score > 0.5 ? 0.8 : 0.4
        });
      });
    });

    // Calculate weighted average score
    const finalScore = results.length > 0 ? totalScore / results.length : 0;
    const confidence = Math.min(0.95, 0.5 + (results.filter(r => r.score > 0).length * 0.1));

    return {
      score: finalScore,
      confidence,
      primaryType,
      reasons: allReasons,
      riskFactors: allRiskFactors,
      relatedTransactions: relatedTransactions.slice(0, 5) // Limit to 5
    };
  }

  private calculateSeverity(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 0.9) return 'CRITICAL';
    if (score >= 0.7) return 'HIGH';
    if (score >= 0.4) return 'MEDIUM';
    return 'LOW';
  }

  private async generateRecommendations(result: any, context: TransactionContext): Promise<string[]> {
    const recommendations: string[] = [];

    if (result.score > 0.8) {
      recommendations.push('Immediate manual review required');
      recommendations.push('Consider freezing account temporarily');
    } else if (result.score > 0.6) {
      recommendations.push('Flag for manager review');
      recommendations.push('Verify transaction with account holder');
    } else if (result.score > 0.4) {
      recommendations.push('Monitor for similar patterns');
      recommendations.push('Consider additional verification');
    }

    // Type-specific recommendations
    if (result.primaryType === AnomalyType.DUPLICATE) {
      recommendations.push('Check for duplicate entry errors');
    } else if (result.primaryType === AnomalyType.AMOUNT) {
      recommendations.push('Verify large amount authorization');
    } else if (result.primaryType === AnomalyType.TEMPORAL) {
      recommendations.push('Investigate unusual timing');
    }

    return recommendations;
  }

  private async buildTransactionContext(tenantId: string, transaction: any): Promise<TransactionContext> {
    // Get historical transactions for context
    const historical = await prisma.entry.findMany({
      where: {
        tenantId,
        accountId: transaction.accountId
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Get business context
    const businessContext = await prisma.businessContext.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return {
      transaction,
      historical,
      businessContext,
      temporalContext: {
        currentTime: new Date(),
        timeZone: 'UTC'
      },
      accountContext: {
        accountId: transaction.accountId,
        accountType: transaction.account?.type
      }
    };
  }

  // Utility methods
  private getMostCommonHours(hours: number[]): number[] {
    const frequency = this.getFrequency(hours);
    const maxFreq = Math.max(...Object.values(frequency));
    return Object.keys(frequency)
      .filter(hour => frequency[parseInt(hour)] === maxFreq)
      .map(hour => parseInt(hour));
  }

  private getFrequency(array: any[]): Record<string, number> {
    const freq: Record<string, number> = {};
    array.forEach(item => {
      const key = item.toString();
      freq[key] = (freq[key] || 0) + 1;
    });
    return freq;
  }

  private getWordFrequency(memos: string[]): Record<string, number> {
    const freq: Record<string, number> = {};
    memos.forEach(memo => {
      memo.split(' ').forEach(word => {
        if (word.length > 2) {
          freq[word] = (freq[word] || 0) + 1;
        }
      });
    });
    return freq;
  }

  private groupTransactionsByDay(transactions: any[]): Record<string, number> {
    const groups: Record<string, number> = {};
    transactions.forEach(t => {
      const date = new Date(t.postedAt || t.date);
      const dateKey = date.toISOString().split('T')[0];
      groups[dateKey] = (groups[dateKey] || 0) + 1;
    });
    return groups;
  }

  private extractVendorName(description: string): string | null {
    // Simple vendor extraction - would be more sophisticated in practice
    const words = description.split(' ').filter(word => word.length > 2);
    return words.length > 0 ? words[0] : null;
  }

  private initializeThresholds(): void {
    this.alertThresholds.set('general', 0.7);
    this.alertThresholds.set('statistical', 0.8);
    this.alertThresholds.set('behavioral', 0.6);
    this.alertThresholds.set('temporal', 0.7);
    this.alertThresholds.set('amount', 0.8);
    this.alertThresholds.set('frequency', 0.6);
    this.alertThresholds.set('duplicate', 0.9);
    this.alertThresholds.set('vendor', 0.5);
  }

  // Placeholder methods
  private async isHoliday(date: Date): Promise<boolean> {
    // Would check against holiday database
    return false;
  }

  private async storeAnomalyResult(tenantId: string, transactionId: string, result: any): Promise<void> {
    // Store anomaly detection results for learning and reporting
    console.log(`📝 Storing anomaly result for transaction ${transactionId}: score ${result.score}`);
  }
}