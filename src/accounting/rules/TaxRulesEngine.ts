/**
 * 🧾 TAX RULES ENGINE
 * 
 * Automated tax calculation and compliance engine including:
 * - Sales tax calculation rules
 * - Tax jurisdiction management
 * - Tax exemption handling
 * - Multi-state tax compliance
 * - International tax rules
 */

export interface TaxRule {
  id: string;
  name: string;
  jurisdiction: string;
  taxType: TaxType;
  rate: number;
  isActive: boolean;
  effectiveDate: Date;
  expirationDate?: Date;
  conditions: TaxCondition[];
  exemptions: TaxExemption[];
  tenantId: string;
}

export type TaxType = 
  | 'SALES_TAX'
  | 'USE_TAX'
  | 'VAT'
  | 'GST'
  | 'EXCISE_TAX'
  | 'WITHHOLDING_TAX'
  | 'PROPERTY_TAX'
  | 'PAYROLL_TAX';

export interface TaxCondition {
  field: string;
  operator: string;
  value: any;
}

export interface TaxExemption {
  id: string;
  exemptionType: ExemptionType;
  entityId?: string;
  productCategory?: string;
  exemptionNumber?: string;
  isActive: boolean;
}

export type ExemptionType = 
  | 'RESALE'
  | 'NON_PROFIT'
  | 'GOVERNMENT'
  | 'AGRICULTURAL'
  | 'MANUFACTURING'
  | 'EXPORT'
  | 'MEDICAL'
  | 'EDUCATION';

export interface TaxCalculationRequest {
  amount: number;
  customerLocation: Address;
  vendorLocation: Address;
  productType?: string;
  customerExemptions?: TaxExemption[];
  transactionDate: Date;
  transactionType: 'SALE' | 'PURCHASE' | 'SERVICE';
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface TaxCalculationResult {
  taxableAmount: number;
  totalTax: number;
  taxBreakdown: TaxBreakdownItem[];
  jurisdiction: string;
  exemptionsApplied: TaxExemption[];
  isCompliant: boolean;
  warnings: string[];
}

export interface TaxBreakdownItem {
  taxType: TaxType;
  jurisdiction: string;
  rate: number;
  taxableAmount: number;
  taxAmount: number;
  description: string;
}

export class TaxRulesEngine {
  private tenantId: string;
  private taxRules: TaxRule[] = [];

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.initializeDefaultTaxRules();
  }

  /**
   * 🧮 CALCULATE TAX
   * Calculate tax for a transaction based on applicable rules
   */
  async calculateTax(request: TaxCalculationRequest): Promise<TaxCalculationResult> {
    const applicableRules = await this.getApplicableTaxRules(request);
    const exemptionsApplied: TaxExemption[] = [];
    const taxBreakdown: TaxBreakdownItem[] = [];
    const warnings: string[] = [];

    let totalTax = 0;
    let taxableAmount = request.amount;

    // Apply exemptions first
    if (request.customerExemptions) {
      for (const exemption of request.customerExemptions) {
        if (this.isExemptionApplicable(exemption, request)) {
          exemptionsApplied.push(exemption);
          // Some exemptions might reduce taxable amount
          if (exemption.exemptionType === 'RESALE') {
            taxableAmount = 0; // Resale exemption typically makes entire transaction non-taxable
          }
        }
      }
    }

    // Calculate tax for each applicable rule
    for (const rule of applicableRules) {
      if (taxableAmount > 0) {
        const ruleResult = this.calculateTaxForRule(rule, taxableAmount, request);
        
        if (ruleResult.taxAmount > 0) {
          totalTax += ruleResult.taxAmount;
          taxBreakdown.push(ruleResult);
        }
      }
    }

    // Validate compliance
    const complianceCheck = this.validateTaxCompliance(request, taxBreakdown);
    if (!complianceCheck.isCompliant) {
      warnings.push(...complianceCheck.warnings);
    }

    return {
      taxableAmount,
      totalTax: Number(totalTax.toFixed(2)),
      taxBreakdown,
      jurisdiction: this.determineJurisdiction(request),
      exemptionsApplied,
      isCompliant: complianceCheck.isCompliant,
      warnings
    };
  }

  /**
   * 🏛️ VALIDATE TAX NEXUS
   * Check if business has tax nexus in jurisdiction
   */
  async validateTaxNexus(
    jurisdiction: string,
    businessLocation: Address,
    salesVolume?: number,
    transactionCount?: number
  ): Promise<{
    hasNexus: boolean;
    nexusType: NexusType;
    reason: string;
    registrationRequired: boolean;
  }> {
    // Economic nexus thresholds (varies by state)
    const economicThresholds = this.getEconomicNexusThresholds(jurisdiction);
    
    let hasNexus = false;
    let nexusType: NexusType = 'NONE';
    let reason = '';
    let registrationRequired = false;

    // Physical nexus check
    if (this.hasPhysicalNexus(businessLocation, jurisdiction)) {
      hasNexus = true;
      nexusType = 'PHYSICAL';
      reason = 'Physical presence in jurisdiction';
      registrationRequired = true;
    }
    // Economic nexus check
    else if (salesVolume && salesVolume >= economicThresholds.salesThreshold) {
      hasNexus = true;
      nexusType = 'ECONOMIC';
      reason = `Sales volume exceeds threshold: $${salesVolume.toLocaleString()} >= $${economicThresholds.salesThreshold.toLocaleString()}`;
      registrationRequired = true;
    }
    else if (transactionCount && transactionCount >= economicThresholds.transactionThreshold) {
      hasNexus = true;
      nexusType = 'ECONOMIC';
      reason = `Transaction count exceeds threshold: ${transactionCount} >= ${economicThresholds.transactionThreshold}`;
      registrationRequired = true;
    }

    return {
      hasNexus,
      nexusType,
      reason,
      registrationRequired
    };
  }

  /**
   * 🏷️ MANAGE TAX RULES
   */

  addTaxRule(rule: Omit<TaxRule, 'id' | 'tenantId'>): string {
    const newRule: TaxRule = {
      ...rule,
      id: `tax_rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: this.tenantId
    };

    this.taxRules.push(newRule);
    return newRule.id;
  }

  updateTaxRule(ruleId: string, updates: Partial<TaxRule>): boolean {
    const index = this.taxRules.findIndex(r => r.id === ruleId && r.tenantId === this.tenantId);
    if (index === -1) return false;

    this.taxRules[index] = { ...this.taxRules[index], ...updates };
    return true;
  }

  getTaxRules(): TaxRule[] {
    return this.taxRules.filter(r => r.tenantId === this.tenantId);
  }

  /**
   * 🔍 PRIVATE METHODS
   */

  private async getApplicableTaxRules(request: TaxCalculationRequest): Promise<TaxRule[]> {
    const jurisdiction = this.determineJurisdiction(request);
    
    return this.taxRules.filter(rule => 
      rule.tenantId === this.tenantId &&
      rule.isActive &&
      rule.jurisdiction === jurisdiction &&
      rule.effectiveDate <= request.transactionDate &&
      (!rule.expirationDate || rule.expirationDate >= request.transactionDate) &&
      this.evaluateTaxConditions(rule.conditions, request)
    );
  }

  private evaluateTaxConditions(conditions: TaxCondition[], request: TaxCalculationRequest): boolean {
    return conditions.every(condition => {
      // Simplified condition evaluation
      const fieldValue = this.getRequestFieldValue(request, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'greater_than':
          return Number(fieldValue) > Number(condition.value);
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(fieldValue);
        default:
          return true;
      }
    });
  }

  private getRequestFieldValue(request: TaxCalculationRequest, field: string): any {
    return field.split('.').reduce((obj, key) => obj?.[key], request);
  }

  private calculateTaxForRule(
    rule: TaxRule, 
    taxableAmount: number, 
    request: TaxCalculationRequest
  ): TaxBreakdownItem {
    const taxAmount = taxableAmount * (rule.rate / 100);
    
    return {
      taxType: rule.taxType,
      jurisdiction: rule.jurisdiction,
      rate: rule.rate,
      taxableAmount,
      taxAmount: Number(taxAmount.toFixed(2)),
      description: `${rule.name} (${rule.rate}%)`
    };
  }

  private isExemptionApplicable(exemption: TaxExemption, request: TaxCalculationRequest): boolean {
    if (!exemption.isActive) return false;
    
    // Add specific exemption logic based on exemption type
    switch (exemption.exemptionType) {
      case 'RESALE':
        return request.transactionType === 'SALE';
      case 'NON_PROFIT':
      case 'GOVERNMENT':
        return true; // Would check customer type
      case 'EXPORT':
        return request.customerLocation.country !== request.vendorLocation.country;
      default:
        return false;
    }
  }

  private determineJurisdiction(request: TaxCalculationRequest): string {
    // Simplified jurisdiction determination
    // In practice, this would be more complex based on tax laws
    
    if (request.transactionType === 'SALE') {
      // For sales, typically use customer location
      return `${request.customerLocation.state}_${request.customerLocation.country}`;
    } else {
      // For purchases, typically use vendor location
      return `${request.vendorLocation.state}_${request.vendorLocation.country}`;
    }
  }

  private validateTaxCompliance(
    request: TaxCalculationRequest, 
    taxBreakdown: TaxBreakdownItem[]
  ): { isCompliant: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isCompliant = true;

    // Check for missing tax on taxable transactions
    if (request.amount > 0 && taxBreakdown.length === 0) {
      warnings.push('No tax calculated for taxable transaction - verify exemptions');
      isCompliant = false;
    }

    // Check for unusually high tax rates
    const totalTaxRate = taxBreakdown.reduce((sum, item) => sum + item.rate, 0);
    if (totalTaxRate > 15) { // Threshold for high tax rate
      warnings.push(`High combined tax rate detected: ${totalTaxRate}%`);
    }

    return { isCompliant, warnings };
  }

  private hasPhysicalNexus(businessLocation: Address, jurisdiction: string): boolean {
    // Check if business has physical presence in jurisdiction
    const [state, country] = jurisdiction.split('_');
    return businessLocation.state === state && businessLocation.country === country;
  }

  private getEconomicNexusThresholds(jurisdiction: string): {
    salesThreshold: number;
    transactionThreshold: number;
  } {
    // Default thresholds - would be jurisdiction-specific in practice
    const defaultThresholds = {
      salesThreshold: 100000, // $100,000
      transactionThreshold: 200 // 200 transactions
    };

    // Jurisdiction-specific overrides
    const jurisdictionThresholds: Record<string, any> = {
      'CA_US': { salesThreshold: 500000, transactionThreshold: 0 },
      'NY_US': { salesThreshold: 500000, transactionThreshold: 100 },
      'TX_US': { salesThreshold: 500000, transactionThreshold: 0 }
    };

    return jurisdictionThresholds[jurisdiction] || defaultThresholds;
  }

  private initializeDefaultTaxRules(): void {
    // Default US sales tax rules
    const defaultRules: Omit<TaxRule, 'id' | 'tenantId'>[] = [
      {
        name: 'California State Sales Tax',
        jurisdiction: 'CA_US',
        taxType: 'SALES_TAX',
        rate: 7.25,
        isActive: true,
        effectiveDate: new Date('2020-01-01'),
        conditions: [
          { field: 'transactionType', operator: 'equals', value: 'SALE' }
        ],
        exemptions: []
      },
      {
        name: 'New York State Sales Tax',
        jurisdiction: 'NY_US',
        taxType: 'SALES_TAX',
        rate: 8.0,
        isActive: true,
        effectiveDate: new Date('2020-01-01'),
        conditions: [
          { field: 'transactionType', operator: 'equals', value: 'SALE' }
        ],
        exemptions: []
      },
      {
        name: 'Texas State Sales Tax',
        jurisdiction: 'TX_US',
        taxType: 'SALES_TAX',
        rate: 6.25,
        isActive: true,
        effectiveDate: new Date('2020-01-01'),
        conditions: [
          { field: 'transactionType', operator: 'equals', value: 'SALE' }
        ],
        exemptions: []
      }
    ];

    for (const rule of defaultRules) {
      this.addTaxRule(rule);
    }
  }
}

type NexusType = 'PHYSICAL' | 'ECONOMIC' | 'AFFILIATE' | 'CLICK_THROUGH' | 'MARKETPLACE' | 'NONE'; 