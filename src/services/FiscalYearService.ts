import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface FiscalYearSettings {
  fiscalYearStart: number; // Month (1-12)
  fiscalYearEnd: number;   // Month (1-12)
  fiscalYearStartDay: number; // Day (1-31)
  baseCurrency: string;
  timezone: string;
}

export interface FiscalPeriod {
  fiscalYear: number;
  startDate: Date;
  endDate: Date;
  quarter?: number;
  month?: number;
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
}

export interface FiscalQuarter {
  quarter: number;
  fiscalYear: number;
  startDate: Date;
  endDate: Date;
}

export interface FiscalMonth {
  month: number;
  fiscalYear: number;
  startDate: Date;
  endDate: Date;
}

/**
 * 📅 FISCAL YEAR SERVICE
 * 
 * Manages organization fiscal year settings and calculations.
 * All ALE core components should use this service for date-based calculations.
 */
export class FiscalYearService {
  private tenantId: string;
  private cachedSettings?: FiscalYearSettings;
  private cacheTimestamp?: number;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * 🏢 GET ORGANIZATION FISCAL YEAR SETTINGS
   * Fetches and caches organization fiscal year configuration
   */
  async getFiscalYearSettings(): Promise<FiscalYearSettings> {
    // Check cache
    if (this.cachedSettings && this.cacheTimestamp && 
        (Date.now() - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cachedSettings;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: this.tenantId },
      select: {
        fiscalYearStart: true,
        fiscalYearEnd: true,
        fiscalYearStartDay: true,
        baseCurrency: true,
        timezone: true,
      }
    });

    if (!tenant) {
      throw new Error(`Organization not found for tenant: ${this.tenantId}`);
    }

    this.cachedSettings = {
      fiscalYearStart: tenant.fiscalYearStart,
      fiscalYearEnd: tenant.fiscalYearEnd,
      fiscalYearStartDay: tenant.fiscalYearStartDay,
      baseCurrency: tenant.baseCurrency,
      timezone: tenant.timezone || 'UTC'
    };
    this.cacheTimestamp = Date.now();

    return this.cachedSettings;
  }

  /**
   * 📊 GET FISCAL YEAR FOR DATE
   * Determines which fiscal year a given date belongs to
   */
  async getFiscalYearForDate(date: Date): Promise<number> {
    const settings = await this.getFiscalYearSettings();
    
    // Get the calendar year
    const calendarYear = date.getFullYear();
    
    // Create fiscal year start date for this calendar year
    const fiscalStartThisYear = new Date(calendarYear, settings.fiscalYearStart - 1, settings.fiscalYearStartDay);
    
    // Create fiscal year start date for next calendar year
    const fiscalStartNextYear = new Date(calendarYear + 1, settings.fiscalYearStart - 1, settings.fiscalYearStartDay);
    
    // If date is before fiscal start this year, it belongs to previous fiscal year
    if (date < fiscalStartThisYear) {
      return calendarYear - 1;
    }
    
    // If date is after or equal to fiscal start this year and before next year's start
    if (date >= fiscalStartThisYear && date < fiscalStartNextYear) {
      return calendarYear;
    }
    
    // Otherwise, it belongs to next fiscal year
    return calendarYear + 1;
  }

  /**
   * 📅 GET FISCAL YEAR PERIOD
   * Gets the complete fiscal year period for a given fiscal year
   */
  async getFiscalYearPeriod(fiscalYear: number): Promise<FiscalPeriod> {
    const settings = await this.getFiscalYearSettings();
    
    const startDate = new Date(fiscalYear, settings.fiscalYearStart - 1, settings.fiscalYearStartDay);
    
    // Calculate end date (day before next fiscal year starts)
    let endDate: Date;
    if (settings.fiscalYearStart === 1) {
      // Calendar year fiscal year (Jan 1 - Dec 31)
      endDate = new Date(fiscalYear, 11, 31, 23, 59, 59, 999);
    } else {
      // Non-calendar fiscal year
      endDate = new Date(fiscalYear + 1, settings.fiscalYearStart - 1, settings.fiscalYearStartDay - 1, 23, 59, 59, 999);
    }

    return {
      fiscalYear,
      startDate,
      endDate,
      periodType: 'YEARLY'
    };
  }

  /**
   * 📈 GET FISCAL QUARTERS
   * Gets all quarters for a fiscal year
   */
  async getFiscalQuarters(fiscalYear: number): Promise<FiscalQuarter[]> {
    const yearPeriod = await this.getFiscalYearPeriod(fiscalYear);
    const quarters: FiscalQuarter[] = [];
    
    const quarterLengthMs = (yearPeriod.endDate.getTime() - yearPeriod.startDate.getTime()) / 4;
    
    for (let q = 1; q <= 4; q++) {
      const startDate = new Date(yearPeriod.startDate.getTime() + (q - 1) * quarterLengthMs);
      const endDate = new Date(yearPeriod.startDate.getTime() + q * quarterLengthMs - 1);
      
      // Adjust last quarter to end exactly at fiscal year end
      if (q === 4) {
        endDate.setTime(yearPeriod.endDate.getTime());
      }
      
      quarters.push({
        quarter: q,
        fiscalYear,
        startDate,
        endDate
      });
    }
    
    return quarters;
  }

  /**
   * 📆 GET FISCAL MONTHS
   * Gets all months for a fiscal year
   */
  async getFiscalMonths(fiscalYear: number): Promise<FiscalMonth[]> {
    const settings = await this.getFiscalYearSettings();
    const months: FiscalMonth[] = [];
    
    let currentDate = new Date(fiscalYear, settings.fiscalYearStart - 1, settings.fiscalYearStartDay);
    
    for (let m = 1; m <= 12; m++) {
      const startDate = new Date(currentDate);
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
      const endDate = new Date(currentDate.getTime() - 1); // Last millisecond of previous month
      
      months.push({
        month: m,
        fiscalYear,
        startDate,
        endDate
      });
    }
    
    return months;
  }

  /**
   * 🗓️ GET CURRENT FISCAL PERIOD
   * Gets the current fiscal period (year, quarter, month)
   */
  async getCurrentFiscalPeriod(): Promise<{
    year: FiscalPeriod;
    quarter: FiscalQuarter;
    month: FiscalMonth;
  }> {
    const now = new Date();
    const fiscalYear = await this.getFiscalYearForDate(now);
    
    const yearPeriod = await this.getFiscalYearPeriod(fiscalYear);
    const quarters = await this.getFiscalQuarters(fiscalYear);
    const months = await this.getFiscalMonths(fiscalYear);
    
    // Find current quarter
    const currentQuarter = quarters.find(q => now >= q.startDate && now <= q.endDate);
    if (!currentQuarter) {
      throw new Error('Unable to determine current fiscal quarter');
    }
    
    // Find current month
    const currentMonth = months.find(m => now >= m.startDate && now <= m.endDate);
    if (!currentMonth) {
      throw new Error('Unable to determine current fiscal month');
    }
    
    return {
      year: yearPeriod,
      quarter: currentQuarter,
      month: currentMonth
    };
  }

  /**
   * 📊 CREATE REPORTING PERIOD
   * Creates a standardized reporting period for given dates
   */
  async createReportingPeriod(
    startDate: Date,
    endDate: Date,
    periodType: FiscalPeriod['periodType'] = 'CUSTOM'
  ): Promise<FiscalPeriod> {
    const fiscalYear = await this.getFiscalYearForDate(endDate);
    
    let quarter: number | undefined;
    let month: number | undefined;
    
    if (periodType === 'QUARTERLY') {
      const quarters = await this.getFiscalQuarters(fiscalYear);
      const q = quarters.find(quarter => endDate >= quarter.startDate && endDate <= quarter.endDate);
      quarter = q?.quarter;
    }
    
    if (periodType === 'MONTHLY') {
      const months = await this.getFiscalMonths(fiscalYear);
      const m = months.find(month => endDate >= month.startDate && endDate <= month.endDate);
      month = m?.month;
    }
    
    return {
      fiscalYear,
      startDate,
      endDate,
      quarter,
      month,
      periodType
    };
  }

  /**
   * 🔄 GET PRIOR PERIOD
   * Gets the previous period for comparison
   */
  async getPriorPeriod(currentPeriod: FiscalPeriod): Promise<FiscalPeriod> {
    const settings = await this.getFiscalYearSettings();
    
    switch (currentPeriod.periodType) {
      case 'YEARLY':
        return await this.getFiscalYearPeriod(currentPeriod.fiscalYear - 1);
        
      case 'QUARTERLY':
        if (currentPeriod.quarter === 1) {
          // Previous quarter is Q4 of previous fiscal year
          const quarters = await this.getFiscalQuarters(currentPeriod.fiscalYear - 1);
          const q4 = quarters[3];
          return {
            fiscalYear: currentPeriod.fiscalYear - 1,
            startDate: q4.startDate,
            endDate: q4.endDate,
            quarter: 4,
            periodType: 'QUARTERLY'
          };
        } else {
          // Previous quarter same fiscal year
          const quarters = await this.getFiscalQuarters(currentPeriod.fiscalYear);
          const prevQ = quarters[currentPeriod.quarter! - 2];
          return {
            fiscalYear: currentPeriod.fiscalYear,
            startDate: prevQ.startDate,
            endDate: prevQ.endDate,
            quarter: currentPeriod.quarter! - 1,
            periodType: 'QUARTERLY'
          };
        }
        
      case 'MONTHLY':
        if (currentPeriod.month === 1) {
          // Previous month is last month of previous fiscal year
          const months = await this.getFiscalMonths(currentPeriod.fiscalYear - 1);
          const lastMonth = months[11];
          return {
            fiscalYear: currentPeriod.fiscalYear - 1,
            startDate: lastMonth.startDate,
            endDate: lastMonth.endDate,
            month: 12,
            periodType: 'MONTHLY'
          };
        } else {
          // Previous month same fiscal year
          const months = await this.getFiscalMonths(currentPeriod.fiscalYear);
          const prevMonth = months[currentPeriod.month! - 2];
          return {
            fiscalYear: currentPeriod.fiscalYear,
            startDate: prevMonth.startDate,
            endDate: prevMonth.endDate,
            month: currentPeriod.month! - 1,
            periodType: 'MONTHLY'
          };
        }
        
      default:
        // For custom periods, go back the same length of time
        const periodLength = currentPeriod.endDate.getTime() - currentPeriod.startDate.getTime();
        const priorEndDate = new Date(currentPeriod.startDate.getTime() - 1);
        const priorStartDate = new Date(priorEndDate.getTime() - periodLength);
        
        return await this.createReportingPeriod(priorStartDate, priorEndDate, 'CUSTOM');
    }
  }

  /**
   * ✅ VALIDATE FISCAL PERIOD
   * Validates that dates are within a valid fiscal period
   */
  async validateFiscalPeriod(startDate: Date, endDate: Date): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic date validation
    if (startDate >= endDate) {
      errors.push('Start date must be before end date');
    }
    
    // Check if dates span multiple fiscal years
    const startFiscalYear = await this.getFiscalYearForDate(startDate);
    const endFiscalYear = await this.getFiscalYearForDate(endDate);
    
    if (startFiscalYear !== endFiscalYear) {
      warnings.push(`Period spans multiple fiscal years: FY${startFiscalYear} to FY${endFiscalYear}`);
    }
    
    // Check if period is too far in the future
    const now = new Date();
    const currentFiscalYear = await this.getFiscalYearForDate(now);
    
    if (startFiscalYear > currentFiscalYear + 1) {
      warnings.push('Period is more than one fiscal year in the future');
    }
    
    // Check if period is very old
    if (endFiscalYear < currentFiscalYear - 5) {
      warnings.push('Period is more than 5 fiscal years old');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 🔧 CLEAR CACHE
   * Clears the cached fiscal year settings (useful after organization updates)
   */
  clearCache(): void {
    this.cachedSettings = undefined;
    this.cacheTimestamp = undefined;
  }
}