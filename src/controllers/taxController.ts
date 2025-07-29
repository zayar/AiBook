import { Request, Response } from 'express';
import prisma from '../utils/database';
import { AppError } from '../middleware/errorHandler';

export class TaxController {
  /**
   * 🧮 CALCULATE TAX
   * Calculate tax for a given amount and jurisdiction
   */
  static async calculateTax(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const {
        amount,
        jurisdiction,
        taxType = 'SALES',
        documentType,
        documentId,
        customerId,
        vendorId,
        applyExemptions = false,
        exemptions = []
      } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      if (!amount || !jurisdiction) {
        res.status(400).json({ 
          error: 'Amount and jurisdiction are required' 
        });
        return;
      }

      // Get applicable tax rates for the jurisdiction
      const taxRates = await prisma.taxRate.findMany({
        where: {
          tenantId,
          jurisdiction,
          taxType,
          isActive: true,
          effectiveDate: { lte: new Date() },
          OR: [
            { expiryDate: null },
            { expiryDate: { gte: new Date() } }
          ]
        },
        include: {
          account: true
        },
        orderBy: { rate: 'desc' }
      });

      if (taxRates.length === 0) {
        res.status(404).json({ 
          error: `No active tax rates found for ${jurisdiction} - ${taxType}` 
        });
        return;
      }

      // Calculate tax amounts
      const calculations = taxRates.map(rate => {
        const taxableAmount = parseFloat(amount);
        const taxAmount = taxableAmount * parseFloat(rate.rate.toString());
        
        return {
          taxRateId: rate.id,
          taxRateName: rate.name,
          rate: parseFloat(rate.rate.toString()),
          taxableAmount,
          taxAmount,
          accountCode: rate.account.code,
          accountName: rate.account.name
        };
      });

      const totalTaxAmount = calculations.reduce((sum, calc) => sum + calc.taxAmount, 0);
      const totalAmount = parseFloat(amount) + totalTaxAmount;

      // Store tax calculation if document info provided
      if (documentType && documentId) {
        await Promise.all(
          calculations.map(calc => 
            prisma.taxCalculation.create({
              data: {
                tenantId,
                documentType,
                documentId,
                taxRateId: calc.taxRateId,
                taxableAmount: calc.taxableAmount,
                taxAmount: calc.taxAmount
              }
            })
          )
        );
      }

      // AI-powered tax compliance recommendations
      const aiRecommendations = await this.getTaxComplianceRecommendations(
        tenantId, 
        jurisdiction, 
        taxType,
        totalAmount
      );

      res.json({
        calculation: {
          originalAmount: parseFloat(amount),
          totalTaxAmount,
          totalAmount,
          breakdown: calculations
        },
        compliance: {
          jurisdiction,
          taxType,
          effectiveRates: taxRates.map(rate => ({
            name: rate.name,
            rate: parseFloat(rate.rate.toString()),
            effectiveDate: rate.effectiveDate
          })),
          recommendations: aiRecommendations
        },
        metadata: {
          calculatedAt: new Date().toISOString(),
          tenantId,
          documentType,
          documentId
        }
      });
    } catch (error) {
      console.error('Calculate tax error:', error);
      res.status(500).json({ error: 'Failed to calculate tax' });
    }
  }

  /**
   * 📊 GET TAX REPORTS
   * Get comprehensive tax reports and summaries
   */
  static async getTaxReports(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { 
        type = 'summary', 
        period = 'current', 
        jurisdiction,
        taxType,
        startDate,
        endDate 
      } = req.query;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      let report: any = {};

      switch (type) {
        case 'summary':
          report = await this.getTaxSummaryReport(tenantId, period as string);
          break;
        case 'jurisdiction':
          report = await this.getJurisdictionReport(tenantId, jurisdiction as string, startDate as string, endDate as string);
          break;
        case 'liability':
          report = await this.getTaxLiabilityReport(tenantId, startDate as string, endDate as string);
          break;
        case 'compliance':
          report = await this.getComplianceReport(tenantId, jurisdiction as string, taxType as string);
          break;
        default:
          res.status(400).json({ error: 'Invalid report type' });
          return;
      }

      res.json({ report });
    } catch (error) {
      console.error('Get tax reports error:', error);
      res.status(500).json({ error: 'Failed to get tax reports' });
    }
  }

  /**
   * 📋 GET TAX RATES
   * Get all tax rates for the tenant
   */
  static async getTaxRates(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { jurisdiction, taxType, active } = req.query;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const where: any = { tenantId };

      if (jurisdiction) {
        where.jurisdiction = jurisdiction;
      }

      if (taxType) {
        where.taxType = taxType;
      }

      if (active === 'true') {
        where.isActive = true;
        where.effectiveDate = { lte: new Date() };
        where.OR = [
          { expiryDate: null },
          { expiryDate: { gte: new Date() } }
        ];
      }

      const taxRates = await prisma.taxRate.findMany({
        where,
        include: {
          account: {
            select: {
              code: true,
              name: true,
              type: true
            }
          }
        },
        orderBy: [
          { jurisdiction: 'asc' },
          { taxType: 'asc' },
          { effectiveDate: 'desc' }
        ]
      });

      res.json({
        taxRates,
        summary: {
          totalRates: taxRates.length,
          jurisdictions: [...new Set(taxRates.map(rate => rate.jurisdiction))],
          taxTypes: [...new Set(taxRates.map(rate => rate.taxType))],
          activeRates: taxRates.filter(rate => rate.isActive).length
        }
      });
    } catch (error) {
      console.error('Get tax rates error:', error);
      res.status(500).json({ error: 'Failed to get tax rates' });
    }
  }

  /**
   * ➕ CREATE TAX RATE
   * Create a new tax rate
   */
  static async createTaxRate(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const {
        name,
        rate,
        jurisdiction,
        taxType,
        accountId,
        effectiveDate,
        expiryDate,
        metadata
      } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Validate required fields
      if (!name || !rate || !jurisdiction || !taxType || !accountId || !effectiveDate) {
        res.status(400).json({ 
          error: 'Name, rate, jurisdiction, tax type, account ID, and effective date are required' 
        });
        return;
      }

      // Check if account exists and belongs to tenant
      const account = await prisma.account.findFirst({
        where: { id: accountId, tenantId }
      });

      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }

      // Check for duplicate tax rate
      const existingRate = await prisma.taxRate.findFirst({
        where: {
          tenantId,
          name,
          jurisdiction,
          taxType,
          isActive: true
        }
      });

      if (existingRate) {
        res.status(409).json({ 
          error: 'A tax rate with this name already exists for this jurisdiction and type' 
        });
        return;
      }

      // Create tax rate
      const taxRate = await prisma.taxRate.create({
        data: {
          tenantId,
          name,
          rate: parseFloat(rate),
          jurisdiction,
          taxType,
          accountId,
          effectiveDate: new Date(effectiveDate),
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          isActive: true,
          metadata
        },
        include: {
          account: {
            select: {
              code: true,
              name: true,
              type: true
            }
          }
        }
      });

      res.status(201).json({
        message: 'Tax rate created successfully',
        taxRate,
        aiRecommendations: [
          'Set up automated tax calculations for invoices',
          'Configure tax reporting schedules',
          'Enable tax compliance monitoring'
        ]
      });
    } catch (error) {
      console.error('Create tax rate error:', error);
      res.status(500).json({ error: 'Failed to create tax rate' });
    }
  }

  /**
   * 🔄 UPDATE TAX RATE
   * Update an existing tax rate
   */
  static async updateTaxRate(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { id } = req.params;
      const updateData = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Check if tax rate exists and belongs to tenant
      const existingRate = await prisma.taxRate.findFirst({
        where: { id, tenantId }
      });

      if (!existingRate) {
        res.status(404).json({ error: 'Tax rate not found' });
        return;
      }

      // Update tax rate
      const updatedRate = await prisma.taxRate.update({
        where: { id },
        data: {
          ...updateData,
          rate: updateData.rate ? parseFloat(updateData.rate) : undefined,
          effectiveDate: updateData.effectiveDate ? new Date(updateData.effectiveDate) : undefined,
          expiryDate: updateData.expiryDate ? new Date(updateData.expiryDate) : undefined
        },
        include: {
          account: {
            select: {
              code: true,
              name: true,
              type: true
            }
          }
        }
      });

      res.json({
        message: 'Tax rate updated successfully',
        taxRate: updatedRate
      });
    } catch (error) {
      console.error('Update tax rate error:', error);
      res.status(500).json({ error: 'Failed to update tax rate' });
    }
  }

  // Private helper methods for reports
  private static async getTaxSummaryReport(tenantId: string, period: string) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'current':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      case 'previous':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
    }

    const [calculations, taxRates] = await Promise.all([
      prisma.taxCalculation.findMany({
        where: {
          tenantId,
          calculatedAt: { gte: startDate, lte: endDate }
        },
        include: {
          taxRate: true
        }
      }),
      prisma.taxRate.findMany({
        where: { tenantId, isActive: true }
      })
    ]);

    const summary = {
      period: { startDate, endDate },
      totalTaxCollected: calculations.reduce((sum, calc) => sum + parseFloat(calc.taxAmount.toString()), 0),
      totalTaxableAmount: calculations.reduce((sum, calc) => sum + parseFloat(calc.taxableAmount.toString()), 0),
      calculationCount: calculations.length,
      activeTaxRates: taxRates.length,
      byJurisdiction: this.groupByJurisdiction(calculations),
      byTaxType: this.groupByTaxType(calculations)
    };

    return summary;
  }

  private static async getJurisdictionReport(tenantId: string, jurisdiction: string, startDate?: string, endDate?: string) {
    const where: any = { tenantId };
    
    if (jurisdiction) {
      where.taxRate = { jurisdiction };
    }
    
    if (startDate && endDate) {
      where.calculatedAt = { 
        gte: new Date(startDate), 
        lte: new Date(endDate) 
      };
    }

    const calculations = await prisma.taxCalculation.findMany({
      where,
      include: {
        taxRate: true
      }
    });

    return {
      jurisdiction,
      period: { startDate, endDate },
      calculations,
      summary: {
        totalTax: calculations.reduce((sum, calc) => sum + parseFloat(calc.taxAmount.toString()), 0),
        totalTaxable: calculations.reduce((sum, calc) => sum + parseFloat(calc.taxableAmount.toString()), 0),
        calculationCount: calculations.length
      }
    };
  }

  private static async getTaxLiabilityReport(tenantId: string, startDate?: string, endDate?: string) {
    const where: any = { tenantId };
    
    if (startDate && endDate) {
      where.calculatedAt = { 
        gte: new Date(startDate), 
        lte: new Date(endDate) 
      };
    }

    const calculations = await prisma.taxCalculation.findMany({
      where,
      include: {
        taxRate: {
          include: {
            account: true
          }
        }
      }
    });

    // Group by tax liability account
    const liabilitySummary = calculations.reduce((acc, calc) => {
      const accountCode = calc.taxRate.account.code;
      if (!acc[accountCode]) {
        acc[accountCode] = {
          accountCode,
          accountName: calc.taxRate.account.name,
          totalTax: 0,
          calculationCount: 0
        };
      }
      acc[accountCode].totalTax += parseFloat(calc.taxAmount.toString());
      acc[accountCode].calculationCount += 1;
      return acc;
    }, {} as any);

    return {
      period: { startDate, endDate },
      liabilitySummary: Object.values(liabilitySummary),
      totalLiability: Object.values(liabilitySummary).reduce((sum: number, item: any) => sum + item.totalTax, 0)
    };
  }

  private static async getComplianceReport(tenantId: string, jurisdiction?: string, taxType?: string) {
    const where: any = { tenantId };
    
    if (jurisdiction) {
      where.jurisdiction = jurisdiction;
    }
    
    if (taxType) {
      where.taxType = taxType;
    }

    const taxRates = await prisma.taxRate.findMany({
      where,
      include: {
        account: true
      }
    });

    const complianceIssues = [];
    const now = new Date();

    // Check for expired rates
    const expiredRates = taxRates.filter(rate => 
      rate.expiryDate && rate.expiryDate < now && rate.isActive
    );

    if (expiredRates.length > 0) {
      complianceIssues.push({
        type: 'EXPIRED_RATES',
        count: expiredRates.length,
        rates: expiredRates.map(rate => ({
          name: rate.name,
          jurisdiction: rate.jurisdiction,
          expiryDate: rate.expiryDate
        }))
      });
    }

    // Check for missing liability accounts
    const ratesWithoutAccounts = taxRates.filter(rate => !rate.account);
    if (ratesWithoutAccounts.length > 0) {
      complianceIssues.push({
        type: 'MISSING_LIABILITY_ACCOUNTS',
        count: ratesWithoutAccounts.length,
        rates: ratesWithoutAccounts.map(rate => ({
          name: rate.name,
          jurisdiction: rate.jurisdiction
        }))
      });
    }

    return {
      jurisdiction,
      taxType,
      complianceIssues,
      summary: {
        totalRates: taxRates.length,
        activeRates: taxRates.filter(rate => rate.isActive).length,
        complianceScore: Math.max(0, 100 - (complianceIssues.length * 20))
      }
    };
  }

  private static async getTaxComplianceRecommendations(tenantId: string, jurisdiction: string, taxType: string, amount: number) {
    const recommendations = [];

    // Check for rate changes
    const recentRateChanges = await prisma.taxRate.findMany({
      where: {
        tenantId,
        jurisdiction,
        taxType: taxType as any,
        effectiveDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { effectiveDate: 'desc' }
    });

    if (recentRateChanges.length > 0) {
      recommendations.push({
        type: 'RATE_CHANGE',
        message: `Recent tax rate changes detected for ${jurisdiction}. Review calculations for accuracy.`,
        priority: 'high'
      });
    }

    // Check for compliance thresholds
    if (amount > 10000) {
      recommendations.push({
        type: 'THRESHOLD',
        message: `Large transaction amount detected. Consider additional compliance requirements for ${jurisdiction}.`,
        priority: 'medium'
      });
    }

    // Check for filing deadlines
    const currentMonth = new Date().getMonth();
    const filingDeadlines = {
      SALES: [3, 6, 9, 12], // Quarterly
      VAT: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] // Monthly
    };

    if (filingDeadlines[taxType as keyof typeof filingDeadlines]?.includes(currentMonth)) {
      recommendations.push({
        type: 'FILING_DEADLINE',
        message: `Tax filing deadline approaching for ${jurisdiction} ${taxType} tax.`,
        priority: 'high'
      });
    }

    return recommendations;
  }

  private static groupByJurisdiction(calculations: any[]) {
    return calculations.reduce((acc, calc) => {
      const jurisdiction = calc.taxRate.jurisdiction;
      if (!acc[jurisdiction]) {
        acc[jurisdiction] = { totalTax: 0, count: 0 };
      }
      acc[jurisdiction].totalTax += parseFloat(calc.taxAmount.toString());
      acc[jurisdiction].count += 1;
      return acc;
    }, {});
  }

  private static groupByTaxType(calculations: any[]) {
    return calculations.reduce((acc, calc) => {
      const taxType = calc.taxRate.taxType;
      if (!acc[taxType]) {
        acc[taxType] = { totalTax: 0, count: 0 };
      }
      acc[taxType].totalTax += parseFloat(calc.taxAmount.toString());
      acc[taxType].count += 1;
      return acc;
    }, {});
  }
} 