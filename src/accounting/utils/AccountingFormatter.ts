/**
 * 📋 ACCOUNTING FORMATTER
 * 
 * Standardized formatting utilities for accounting data including:
 * - Currency formatting
 * - Number formatting
 * - Date formatting
 * - Account code formatting
 * - Report formatting
 */

export class AccountingFormatter {
  /**
   * 💰 CURRENCY FORMATTING
   */

  /**
   * Format amount as currency
   */
  static formatCurrency(
    amount: number,
    currency: string = 'USD',
    locale: string = 'en-US',
    options: Partial<Intl.NumberFormatOptions> = {}
  ): string {
    const defaultOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options
    };

    try {
      return new Intl.NumberFormat(locale, defaultOptions).format(amount);
    } catch (error) {
      // Fallback formatting
      const symbol = this.getCurrencySymbol(currency);
      return `${symbol}${this.formatNumber(amount, 2)}`;
    }
  }

  /**
   * Format amount with accounting parentheses for negative values
   */
  static formatAccountingAmount(
    amount: number,
    currency: string = 'USD',
    locale: string = 'en-US'
  ): string {
    const isNegative = amount < 0;
    const absoluteAmount = Math.abs(amount);
    const formattedAmount = this.formatCurrency(absoluteAmount, currency, locale);
    
    return isNegative ? `(${formattedAmount})` : formattedAmount;
  }

  /**
   * Format amount for financial statements (with proper negative handling)
   */
  static formatFinancialAmount(
    amount: number,
    currency: string = 'USD',
    showParentheses: boolean = true
  ): string {
    if (showParentheses && amount < 0) {
      return `(${this.formatCurrency(Math.abs(amount), currency)})`;
    }
    return this.formatCurrency(amount, currency);
  }

  /**
   * 🔢 NUMBER FORMATTING
   */

  /**
   * Format number with specified decimal places
   */
  static formatNumber(
    value: number,
    decimals: number = 2,
    locale: string = 'en-US'
  ): string {
    try {
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(value);
    } catch (error) {
      return value.toFixed(decimals);
    }
  }

  /**
   * Format percentage
   */
  static formatPercentage(
    value: number,
    decimals: number = 2,
    locale: string = 'en-US'
  ): string {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(value / 100);
    } catch (error) {
      return `${value.toFixed(decimals)}%`;
    }
  }

  /**
   * Format large numbers with abbreviations (K, M, B)
   */
  static formatLargeNumber(value: number, decimals: number = 1): string {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (abs >= 1e9) {
      return `${sign}${(abs / 1e9).toFixed(decimals)}B`;
    } else if (abs >= 1e6) {
      return `${sign}${(abs / 1e6).toFixed(decimals)}M`;
    } else if (abs >= 1e3) {
      return `${sign}${(abs / 1e3).toFixed(decimals)}K`;
    } else {
      return `${sign}${abs.toFixed(decimals)}`;
    }
  }

  /**
   * 📅 DATE FORMATTING
   */

  /**
   * Format date for accounting reports
   */
  static formatDate(
    date: Date,
    format: DateFormat = 'short',
    locale: string = 'en-US'
  ): string {
    const options: Intl.DateTimeFormatOptions = this.getDateFormatOptions(format);
    
    try {
      return new Intl.DateTimeFormat(locale, options).format(date);
    } catch (error) {
      return date.toLocaleDateString();
    }
  }

  /**
   * Format fiscal period
   */
  static formatFiscalPeriod(
    startDate: Date,
    endDate: Date,
    periodType: 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ): string {
    switch (periodType) {
      case 'monthly':
        return `${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      case 'quarterly':
        const quarter = Math.ceil((startDate.getMonth() + 1) / 3);
        return `Q${quarter} ${startDate.getFullYear()}`;
      case 'yearly':
        return `FY ${startDate.getFullYear()}`;
      default:
        return `${this.formatDate(startDate, 'short')} - ${this.formatDate(endDate, 'short')}`;
    }
  }

  /**
   * 🏷️ ACCOUNT CODE FORMATTING
   */

  /**
   * Format account code with standard spacing
   */
  static formatAccountCode(code: string): string {
    // Add spacing for readability: 1000 -> 1000, 1100 -> 1100, etc.
    if (code.length === 4) {
      return code;
    }
    
    // Handle longer codes with spacing
    return code.replace(/(\d{4})(\d+)/, '$1-$2');
  }

  /**
   * Format account display name
   */
  static formatAccountDisplayName(code: string, name: string): string {
    return `${this.formatAccountCode(code)} - ${name}`;
  }

  /**
   * 📊 REPORT FORMATTING
   */

  /**
   * Format report header
   */
  static formatReportHeader(
    companyName: string,
    reportTitle: string,
    period: string,
    generatedDate: Date = new Date()
  ): string {
    return [
      companyName,
      reportTitle,
      period,
      `Generated: ${this.formatDate(generatedDate, 'medium')}`
    ].join('\n');
  }

  /**
   * Format table row for reports
   */
  static formatTableRow(
    columns: Array<{ value: any; type: 'text' | 'currency' | 'number' | 'percentage'; width?: number }>,
    currency: string = 'USD'
  ): string {
    return columns.map(col => {
      let formatted: string;
      
      switch (col.type) {
        case 'currency':
          formatted = this.formatAccountingAmount(col.value, currency);
          break;
        case 'number':
          formatted = this.formatNumber(col.value);
          break;
        case 'percentage':
          formatted = this.formatPercentage(col.value);
          break;
        default:
          formatted = String(col.value);
      }
      
      // Apply width padding if specified
      if (col.width) {
        formatted = formatted.padEnd(col.width);
      }
      
      return formatted;
    }).join(' | ');
  }

  /**
   * 📋 TRANSACTION FORMATTING
   */

  /**
   * Format transaction reference
   */
  static formatTransactionReference(type: string, number: string): string {
    const typeMap: Record<string, string> = {
      'INVOICE': 'INV',
      'PAYMENT': 'PMT', 
      'BILL': 'BILL',
      'EXPENSE': 'EXP',
      'JOURNAL': 'JE'
    };
    
    const prefix = typeMap[type.toUpperCase()] || type.substr(0, 3).toUpperCase();
    return `${prefix}-${number}`;
  }

  /**
   * Format journal entry description
   */
  static formatJournalEntryDescription(
    type: string,
    description: string,
    reference?: string
  ): string {
    let formatted = description;
    
    if (reference) {
      formatted += ` (Ref: ${reference})`;
    }
    
    return formatted;
  }

  /**
   * 🎨 STYLING HELPERS
   */

  /**
   * Apply conditional formatting based on value
   */
  static applyConditionalFormatting(
    value: number,
    rules: Array<{
      condition: (val: number) => boolean;
      format: { color?: string; weight?: string; style?: string };
    }>
  ): { value: string; style: Record<string, string> } {
    const matchedRule = rules.find(rule => rule.condition(value));
    const formattedValue = this.formatAccountingAmount(value);
    
    return {
      value: formattedValue,
      style: matchedRule?.format || {}
    };
  }

  /**
   * Format variance with color coding
   */
  static formatVariance(
    current: number,
    prior: number,
    currency: string = 'USD'
  ): {
    amount: string;
    percentage: string;
    direction: 'positive' | 'negative' | 'neutral';
  } {
    const variance = current - prior;
    const percentageChange = prior !== 0 ? (variance / prior) * 100 : 0;
    
    let direction: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (variance > 0) direction = 'positive';
    else if (variance < 0) direction = 'negative';
    
    return {
      amount: this.formatAccountingAmount(variance, currency),
      percentage: this.formatPercentage(percentageChange),
      direction
    };
  }

  /**
   * 🔧 UTILITY METHODS
   */

  private static getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$'
    };
    return symbols[currency] || currency;
  }

  private static getDateFormatOptions(format: DateFormat): Intl.DateTimeFormatOptions {
    switch (format) {
      case 'short':
        return { year: 'numeric', month: '2-digit', day: '2-digit' };
      case 'medium':
        return { year: 'numeric', month: 'short', day: 'numeric' };
      case 'long':
        return { year: 'numeric', month: 'long', day: 'numeric' };
      case 'fiscal':
        return { year: 'numeric', month: 'short' };
      default:
        return { year: 'numeric', month: '2-digit', day: '2-digit' };
    }
  }
}

type DateFormat = 'short' | 'medium' | 'long' | 'fiscal'; 