import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ReportBasis, Currency } from '@prisma/client';

const prisma = new PrismaClient();

interface OrganizationProfileRequest {
  name: string;
  industry: string;
  location: string;
  logo?: string;
  baseCurrency: Currency;
  fiscalYearStart: number;
  fiscalYearEnd: number;
  fiscalYearStartDay: number;
  reportBasis: ReportBasis;
  language: string;
  timezone: string;
  dateFormat: string;
  companyId?: string;
}

export class OrganizationProfileController {
  /**
   * 📋 GET ORGANIZATION PROFILE
   */
  static async getOrganizationProfile(req: Request, res: Response) {
    try {
      console.log('🔍 Organization Profile Request:', {
        tenantMiddleware: req.tenant?.tenantId,
        headerTenant: req.headers['x-tenant-id'],
        userTenant: req.user?.tenantId,
        method: req.method,
        url: req.url
      });
      
      // Prefer tenant from middleware; fallback to header and finally default in dev
      const tenantId = (req.tenant?.tenantId as string)
        || (req.headers['x-tenant-id'] as string)
        || (process.env.NODE_ENV === 'development' ? (process.env.DEFAULT_TENANT_ID || 'default') : undefined);
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant ID is required' });
      }
      console.log('📋 Using tenant ID:', tenantId);

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          domain: true,
          industry: true,
          location: true,
          logo: true,
          baseCurrency: true,
          fiscalYearStart: true,
          fiscalYearEnd: true,
          fiscalYearStartDay: true,
          reportBasis: true,
          language: true,
          timezone: true,
          dateFormat: true,
          companyId: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!tenant) {
        console.log('❌ Tenant not found for ID:', tenantId);
        return res.status(404).json({
          success: false,
          message: 'Organization not found'
        });
      }

      console.log('✅ Tenant found:', tenant.name);

      // Check if base currency can be changed (has transactions)
      const hasTransactions = await prisma.entry.count({ where: { tenantId } });

      const canChangeCurrency = hasTransactions === 0;

      res.json({
        success: true,
        data: {
          ...tenant,
          canChangeCurrency,
          fiscalYearPeriod: `${tenant.fiscalYearStart} - ${tenant.fiscalYearEnd}`,
          fiscalYearPeriodDetail: `Period: ${tenant.fiscalYearStartDay} - ${tenant.fiscalYearEnd}`
        }
      });
    } catch (error) {
      console.error('❌ Error fetching organization profile:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({
        success: false,
        message: 'Failed to fetch organization profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * ✏️ UPDATE ORGANIZATION PROFILE
   */
  static async updateOrganizationProfile(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const data: Partial<OrganizationProfileRequest> = req.body;

      // Check if organization exists
      const existingTenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      });

      if (!existingTenant) {
        return res.status(404).json({
          success: false,
          message: 'Organization not found'
        });
      }

      // Check if base currency can be changed
      if (data.baseCurrency && data.baseCurrency !== existingTenant.baseCurrency) {
        const hasTransactions = await prisma.entry.count({
          where: { tenantId }
        });

        if (hasTransactions > 0) {
          return res.status(400).json({
            success: false,
            message: 'You can\'t change the base currency as there are transactions recorded in your organization.'
          });
        }
      }

      // Validate fiscal year settings
      if (data.fiscalYearStart || data.fiscalYearEnd || data.fiscalYearStartDay) {
        const start = data.fiscalYearStart ?? existingTenant.fiscalYearStart;
        const end = data.fiscalYearEnd ?? existingTenant.fiscalYearEnd;
        const startDay = data.fiscalYearStartDay ?? existingTenant.fiscalYearStartDay;

        if (start < 1 || start > 12 || end < 1 || end > 12) {
          return res.status(400).json({
            success: false,
            message: 'Fiscal year months must be between 1 and 12'
          });
        }

        if (startDay < 1 || startDay > 31) {
          return res.status(400).json({
            success: false,
            message: 'Fiscal year start day must be between 1 and 31'
          });
        }
      }

      // Update organization profile
      const updatedTenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          name: data.name,
          industry: data.industry,
          location: data.location,
          logo: data.logo,
          baseCurrency: data.baseCurrency,
          fiscalYearStart: data.fiscalYearStart,
          fiscalYearEnd: data.fiscalYearEnd,
          fiscalYearStartDay: data.fiscalYearStartDay,
          reportBasis: data.reportBasis,
          language: data.language,
          timezone: data.timezone,
          dateFormat: data.dateFormat,
          companyId: data.companyId,
          updatedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          domain: true,
          industry: true,
          location: true,
          logo: true,
          baseCurrency: true,
          fiscalYearStart: true,
          fiscalYearEnd: true,
          fiscalYearStartDay: true,
          reportBasis: true,
          language: true,
          timezone: true,
          dateFormat: true,
          companyId: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json({
        success: true,
        message: 'Organization profile updated successfully',
        data: {
          ...updatedTenant,
          fiscalYearPeriod: `${updatedTenant.fiscalYearStart} - ${updatedTenant.fiscalYearEnd}`,
          fiscalYearPeriodDetail: `Period: ${updatedTenant.fiscalYearStartDay} - ${updatedTenant.fiscalYearEnd}`
        }
      });
    } catch (error) {
      console.error('Error updating organization profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update organization profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 🖼️ UPLOAD ORGANIZATION LOGO
   */
  static async uploadLogo(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { logo } = req.body;

      if (!logo) {
        return res.status(400).json({
          success: false,
          message: 'Logo data is required'
        });
      }

      // Validate logo format and size
      if (logo.length > 1024 * 1024) { // 1MB limit
        return res.status(400).json({
          success: false,
          message: 'Logo file size must be less than 1MB'
        });
      }

      // Update logo
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { logo }
      });

      res.json({
        success: true,
        message: 'Logo uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload logo',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 🗑️ DELETE ORGANIZATION LOGO
   */
  static async deleteLogo(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;

      await prisma.tenant.update({
        where: { id: tenantId },
        data: { logo: null }
      });

      res.json({
        success: true,
        message: 'Logo deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting logo:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete logo',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 📊 GET ORGANIZATION STATISTICS
   */
  static async getOrganizationStats(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;

      const [
        totalCustomers,
        totalVendors,
        totalInvoices,
        totalBills,
        totalTransactions,
        totalAccounts
      ] = await Promise.all([
        prisma.customer.count({ where: { tenantId } }),
        prisma.vendor.count({ where: { tenantId } }),
        prisma.invoice.count({ where: { tenantId } }),
        prisma.bill.count({ where: { tenantId } }),
        prisma.entry.count({ where: { tenantId } }),
        prisma.account.count({ where: { tenantId } })
      ]);

      res.json({
        success: true,
        data: {
          totalCustomers,
          totalVendors,
          totalInvoices,
          totalBills,
          totalTransactions,
          totalAccounts
        }
      });
    } catch (error) {
      console.error('Error fetching organization statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch organization statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 🔧 GET AVAILABLE OPTIONS
   */
  static async getAvailableOptions(req: Request, res: Response) {
    try {
      const currencies = Object.values(Currency);
      const reportBasis = Object.values(ReportBasis);
      const languages = ['English', 'Myanmar', 'Chinese', 'Thai', 'Japanese'];
      const timezones = [
        '(GMT 6:30) Myanmar Time (Asia/Rangoon)',
        '(GMT 0:00) UTC (UTC)',
        '(GMT -5:00) Eastern Time (America/New_York)',
        '(GMT -8:00) Pacific Time (America/Los_Angeles)',
        '(GMT 1:00) Central European Time (Europe/Paris)',
        '(GMT 8:00) China Standard Time (Asia/Shanghai)',
        '(GMT 9:00) Japan Standard Time (Asia/Tokyo)'
      ];
      const dateFormats = [
        'dd MMM yyyy [05 Aug 2025]',
        'MM/dd/yyyy [08/05/2025]',
        'dd/MM/yyyy [05/08/2025]',
        'yyyy-MM-dd [2025-08-05]',
        'MMMM dd, yyyy [August 05, 2025]'
      ];
      const industries = [
        'Mobile App',
        'Web Development',
        'Retail',
        'Manufacturing',
        'Healthcare',
        'Education',
        'Finance',
        'Real Estate',
        'Transportation',
        'Food & Beverage',
        'Technology',
        'Consulting',
        'Other'
      ];
      const locations = [
        'Myanmar',
        'United States',
        'United Kingdom',
        'Singapore',
        'Thailand',
        'China',
        'Japan',
        'Australia',
        'Canada',
        'Germany',
        'France',
        'Other'
      ];

      res.json({
        success: true,
        data: {
          currencies,
          reportBasis,
          languages,
          timezones,
          dateFormats,
          industries,
          locations
        }
      });
    } catch (error) {
      console.error('Error fetching available options:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available options',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Helper methods
  private static getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'Unknown';
  }

  private static getLastDayOfMonth(month: number): number {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return daysInMonth[month - 1] || 31;
  }
} 