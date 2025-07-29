/**
 * 🧮 FINANCIAL CALCULATOR
 * 
 * Advanced financial calculations including:
 * - Interest and compounding calculations
 * - Depreciation calculations
 * - Tax calculations
 * - Foreign exchange calculations
 * - Financial ratios and metrics
 */

export class FinancialCalculator {
  /**
   * 💰 INTEREST CALCULATIONS
   */
  
  /**
   * Calculate simple interest
   */
  static calculateSimpleInterest(principal: number, rate: number, time: number): number {
    return Number((principal * rate * time).toFixed(2));
  }

  /**
   * Calculate compound interest
   */
  static calculateCompoundInterest(
    principal: number, 
    rate: number, 
    time: number, 
    compoundingFrequency: number = 1
  ): number {
    const amount = principal * Math.pow((1 + rate / compoundingFrequency), compoundingFrequency * time);
    return Number((amount - principal).toFixed(2));
  }

  /**
   * Calculate present value
   */
  static calculatePresentValue(futureValue: number, rate: number, periods: number): number {
    return Number((futureValue / Math.pow(1 + rate, periods)).toFixed(2));
  }

  /**
   * Calculate future value
   */
  static calculateFutureValue(presentValue: number, rate: number, periods: number): number {
    return Number((presentValue * Math.pow(1 + rate, periods)).toFixed(2));
  }

  /**
   * 📉 DEPRECIATION CALCULATIONS
   */

  /**
   * Calculate straight-line depreciation
   */
  static calculateStraightLineDepreciation(
    cost: number, 
    salvageValue: number, 
    usefulLife: number
  ): number {
    return Number(((cost - salvageValue) / usefulLife).toFixed(2));
  }

  /**
   * Calculate double declining balance depreciation
   */
  static calculateDoubleDecliningBalance(
    cost: number, 
    salvageValue: number, 
    usefulLife: number, 
    year: number
  ): number {
    const rate = 2 / usefulLife;
    let bookValue = cost;
    let totalDepreciation = 0;

    for (let i = 1; i <= year; i++) {
      const yearlyDepreciation = Math.min(bookValue * rate, bookValue - salvageValue);
      totalDepreciation += yearlyDepreciation;
      bookValue -= yearlyDepreciation;

      if (i === year) {
        return Number(yearlyDepreciation.toFixed(2));
      }
    }

    return 0;
  }

  /**
   * Calculate units of production depreciation
   */
  static calculateUnitsOfProductionDepreciation(
    cost: number,
    salvageValue: number,
    totalUnits: number,
    unitsProduced: number
  ): number {
    const depreciationPerUnit = (cost - salvageValue) / totalUnits;
    return Number((depreciationPerUnit * unitsProduced).toFixed(2));
  }

  /**
   * 💸 TAX CALCULATIONS
   */

  /**
   * Calculate sales tax
   */
  static calculateSalesTax(amount: number, taxRate: number): number {
    return Number((amount * (taxRate / 100)).toFixed(2));
  }

  /**
   * Calculate compound tax (tax on tax)
   */
  static calculateCompoundTax(amount: number, taxRates: number[]): {
    totalTax: number;
    taxBreakdown: Array<{ rate: number; tax: number; taxableAmount: number }>;
  } {
    let taxableAmount = amount;
    let totalTax = 0;
    const taxBreakdown: Array<{ rate: number; tax: number; taxableAmount: number }> = [];

    for (const rate of taxRates) {
      const tax = this.calculateSalesTax(taxableAmount, rate);
      totalTax += tax;
      taxBreakdown.push({ rate, tax, taxableAmount });
      taxableAmount += tax; // For compound tax calculation
    }

    return {
      totalTax: Number(totalTax.toFixed(2)),
      taxBreakdown
    };
  }

  /**
   * Calculate income tax using progressive brackets
   */
  static calculateProgressiveIncomeTax(
    income: number,
    brackets: Array<{ min: number; max: number; rate: number }>
  ): {
    totalTax: number;
    effectiveRate: number;
    marginalRate: number;
    bracketBreakdown: Array<{ bracket: any; taxableIncome: number; tax: number }>;
  } {
    let totalTax = 0;
    let marginalRate = 0;
    const bracketBreakdown: Array<{ bracket: any; taxableIncome: number; tax: number }> = [];

    for (const bracket of brackets) {
      if (income > bracket.min) {
        const taxableIncome = Math.min(income, bracket.max) - bracket.min;
        const tax = taxableIncome * (bracket.rate / 100);
        totalTax += tax;
        marginalRate = bracket.rate;

        bracketBreakdown.push({
          bracket,
          taxableIncome,
          tax: Number(tax.toFixed(2))
        });

        if (income <= bracket.max) break;
      }
    }

    const effectiveRate = income > 0 ? (totalTax / income) * 100 : 0;

    return {
      totalTax: Number(totalTax.toFixed(2)),
      effectiveRate: Number(effectiveRate.toFixed(4)),
      marginalRate,
      bracketBreakdown
    };
  }

  /**
   * 💱 FOREIGN EXCHANGE CALCULATIONS
   */

  /**
   * Convert currency with exchange rate
   */
  static convertCurrency(
    amount: number, 
    exchangeRate: number, 
    precision: number = 2
  ): number {
    return Number((amount * exchangeRate).toFixed(precision));
  }

  /**
   * Calculate foreign exchange gain/loss
   */
  static calculateFXGainLoss(
    originalAmount: number,
    originalRate: number,
    currentRate: number
  ): {
    gainLoss: number;
    gainLossPercentage: number;
    isGain: boolean;
  } {
    const originalValue = originalAmount * originalRate;
    const currentValue = originalAmount * currentRate;
    const gainLoss = currentValue - originalValue;
    const gainLossPercentage = originalValue !== 0 ? (gainLoss / originalValue) * 100 : 0;

    return {
      gainLoss: Number(gainLoss.toFixed(2)),
      gainLossPercentage: Number(gainLossPercentage.toFixed(4)),
      isGain: gainLoss > 0
    };
  }

  /**
   * 📊 FINANCIAL RATIOS
   */

  /**
   * Calculate liquidity ratios
   */
  static calculateLiquidityRatios(
    currentAssets: number,
    currentLiabilities: number,
    quickAssets: number,
    cash: number,
    inventory: number
  ): {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
    workingCapital: number;
  } {
    return {
      currentRatio: this.safeRatio(currentAssets, currentLiabilities),
      quickRatio: this.safeRatio(quickAssets, currentLiabilities),
      cashRatio: this.safeRatio(cash, currentLiabilities),
      workingCapital: Number((currentAssets - currentLiabilities).toFixed(2))
    };
  }

  /**
   * Calculate profitability ratios
   */
  static calculateProfitabilityRatios(
    revenue: number,
    grossProfit: number,
    operatingIncome: number,
    netIncome: number,
    totalAssets: number,
    totalEquity: number
  ): {
    grossProfitMargin: number;
    operatingMargin: number;
    netProfitMargin: number;
    returnOnAssets: number;
    returnOnEquity: number;
  } {
    return {
      grossProfitMargin: this.safeRatio(grossProfit, revenue) * 100,
      operatingMargin: this.safeRatio(operatingIncome, revenue) * 100,
      netProfitMargin: this.safeRatio(netIncome, revenue) * 100,
      returnOnAssets: this.safeRatio(netIncome, totalAssets) * 100,
      returnOnEquity: this.safeRatio(netIncome, totalEquity) * 100
    };
  }

  /**
   * Calculate debt ratios
   */
  static calculateDebtRatios(
    totalDebt: number,
    totalAssets: number,
    totalEquity: number,
    interestExpense: number,
    ebit: number
  ): {
    debtToAssets: number;
    debtToEquity: number;
    equityMultiplier: number;
    interestCoverage: number;
  } {
    return {
      debtToAssets: this.safeRatio(totalDebt, totalAssets),
      debtToEquity: this.safeRatio(totalDebt, totalEquity),
      equityMultiplier: this.safeRatio(totalAssets, totalEquity),
      interestCoverage: this.safeRatio(ebit, interestExpense)
    };
  }

  /**
   * 📈 GROWTH CALCULATIONS
   */

  /**
   * Calculate compound annual growth rate (CAGR)
   */
  static calculateCAGR(beginningValue: number, endingValue: number, periods: number): number {
    if (beginningValue <= 0 || endingValue <= 0 || periods <= 0) return 0;
    return Number((Math.pow(endingValue / beginningValue, 1 / periods) - 1).toFixed(4)) * 100;
  }

  /**
   * Calculate year-over-year growth
   */
  static calculateYoYGrowth(currentPeriod: number, priorPeriod: number): number {
    if (priorPeriod === 0) return 0;
    return Number(((currentPeriod - priorPeriod) / priorPeriod * 100).toFixed(2));
  }

  /**
   * 🔧 UTILITY METHODS
   */

  /**
   * Safe division to avoid division by zero
   */
  private static safeRatio(numerator: number, denominator: number): number {
    if (denominator === 0) return 0;
    return Number((numerator / denominator).toFixed(4));
  }

  /**
   * Round to specified decimal places
   */
  static round(value: number, decimals: number = 2): number {
    return Number(value.toFixed(decimals));
  }

  /**
   * Calculate percentage
   */
  static calculatePercentage(part: number, whole: number): number {
    return this.safeRatio(part, whole) * 100;
  }

  /**
   * Calculate weighted average
   */
  static calculateWeightedAverage(values: Array<{ value: number; weight: number }>): number {
    const totalValue = values.reduce((sum, item) => sum + (item.value * item.weight), 0);
    const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
    return this.safeRatio(totalValue, totalWeight);
  }

  /**
   * Calculate break-even point
   */
  static calculateBreakEvenPoint(fixedCosts: number, variableCostPerUnit: number, pricePerUnit: number): {
    breakEvenUnits: number;
    breakEvenRevenue: number;
    contributionMargin: number;
    contributionMarginRatio: number;
  } {
    const contributionMargin = pricePerUnit - variableCostPerUnit;
    const contributionMarginRatio = this.safeRatio(contributionMargin, pricePerUnit);
    const breakEvenUnits = this.safeRatio(fixedCosts, contributionMargin);
    const breakEvenRevenue = breakEvenUnits * pricePerUnit;

    return {
      breakEvenUnits: Number(breakEvenUnits.toFixed(2)),
      breakEvenRevenue: Number(breakEvenRevenue.toFixed(2)),
      contributionMargin: Number(contributionMargin.toFixed(2)),
      contributionMarginRatio: Number((contributionMarginRatio * 100).toFixed(2))
    };
  }
} 