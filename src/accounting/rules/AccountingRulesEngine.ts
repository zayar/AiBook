/**
 * ⚖️ ACCOUNTING RULES ENGINE
 * 
 * Enforces business rules and accounting standards including:
 * - Account classification rules
 * - Transaction validation rules
 * - Posting rules and restrictions
 * - Compliance and audit rules
 * - Automated workflow rules
 */

export interface AccountingRule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  priority: number;
  isActive: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  tenantId: string;
}

export type RuleCategory = 
  | 'ACCOUNT_CLASSIFICATION'
  | 'TRANSACTION_VALIDATION'
  | 'POSTING_RESTRICTIONS'
  | 'COMPLIANCE'
  | 'WORKFLOW'
  | 'APPROVAL'
  | 'NOTIFICATION';

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'array';
}

export type ConditionOperator = 
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in'
  | 'between'
  | 'is_null'
  | 'is_not_null';

export interface RuleAction {
  type: ActionType;
  parameters: Record<string, any>;
}

export type ActionType = 
  | 'REJECT'
  | 'WARN'
  | 'REQUIRE_APPROVAL'
  | 'AUTO_CATEGORIZE'
  | 'SET_FIELD'
  | 'SEND_NOTIFICATION'
  | 'CREATE_TASK'
  | 'LOG_EVENT';

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  suggestedActions: string[];
  appliedActions: RuleAction[];
}

export class AccountingRulesEngine {
  private tenantId: string;
  private rules: AccountingRule[] = [];

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.initializeDefaultRules();
  }

  /**
   * 🔍 EVALUATE TRANSACTION RULES
   * Evaluate all applicable rules for a transaction
   */
  async evaluateTransactionRules(transaction: any): Promise<RuleEvaluationResult[]> {
    const results: RuleEvaluationResult[] = [];
    const applicableRules = this.getApplicableRules('TRANSACTION_VALIDATION', transaction);

    for (const rule of applicableRules) {
      const result = await this.evaluateRule(rule, transaction);
      results.push(result);

      // Apply actions if rule failed
      if (!result.passed) {
        await this.applyRuleActions(rule, transaction, result);
      }
    }

    return results.sort((a, b) => a.severity.localeCompare(b.severity));
  }

  /**
   * 🏗️ EVALUATE ACCOUNT RULES
   * Evaluate rules for account creation/modification
   */
  async evaluateAccountRules(account: any): Promise<RuleEvaluationResult[]> {
    const results: RuleEvaluationResult[] = [];
    const applicableRules = this.getApplicableRules('ACCOUNT_CLASSIFICATION', account);

    for (const rule of applicableRules) {
      const result = await this.evaluateRule(rule, account);
      results.push(result);
    }

    return results;
  }

  /**
   * 📝 EVALUATE POSTING RULES
   * Check if a journal entry can be posted
   */
  async evaluatePostingRules(journalEntry: any): Promise<{
    canPost: boolean;
    results: RuleEvaluationResult[];
    requiredApprovals: string[];
  }> {
    const results: RuleEvaluationResult[] = [];
    const postingRules = this.getApplicableRules('POSTING_RESTRICTIONS', journalEntry);
    const approvalRules = this.getApplicableRules('APPROVAL', journalEntry);

    let canPost = true;
    const requiredApprovals: string[] = [];

    // Evaluate posting restriction rules
    for (const rule of postingRules) {
      const result = await this.evaluateRule(rule, journalEntry);
      results.push(result);

      if (!result.passed && result.severity === 'ERROR') {
        canPost = false;
      }
    }

    // Evaluate approval rules
    for (const rule of approvalRules) {
      const result = await this.evaluateRule(rule, journalEntry);
      results.push(result);

      if (!result.passed) {
        requiredApprovals.push(rule.name);
        canPost = false;
      }
    }

    return { canPost, results, requiredApprovals };
  }

  /**
   * 🔧 RULE MANAGEMENT
   */

  /**
   * Add custom rule
   */
  addRule(rule: Omit<AccountingRule, 'id' | 'tenantId'>): string {
    const newRule: AccountingRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: this.tenantId
    };

    this.rules.push(newRule);
    return newRule.id;
  }

  /**
   * Update existing rule
   */
  updateRule(ruleId: string, updates: Partial<AccountingRule>): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId && r.tenantId === this.tenantId);
    if (index === -1) return false;

    this.rules[index] = { ...this.rules[index], ...updates };
    return true;
  }

  /**
   * Delete rule
   */
  deleteRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId && r.tenantId === this.tenantId);
    if (index === -1) return false;

    this.rules.splice(index, 1);
    return true;
  }

  /**
   * Get all rules for tenant
   */
  getRules(): AccountingRule[] {
    return this.rules.filter(r => r.tenantId === this.tenantId);
  }

  /**
   * 🔍 PRIVATE METHODS
   */

  private getApplicableRules(category: RuleCategory, data: any): AccountingRule[] {
    return this.rules.filter(rule => 
      rule.tenantId === this.tenantId &&
      rule.category === category &&
      rule.isActive
    ).sort((a, b) => b.priority - a.priority);
  }

  private async evaluateRule(rule: AccountingRule, data: any): Promise<RuleEvaluationResult> {
    const conditionsPassed = this.evaluateConditions(rule.conditions, data);
    const severity = this.getRuleSeverity(rule);
    
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed: conditionsPassed,
      severity,
      message: conditionsPassed ? 
        `Rule "${rule.name}" passed` : 
        `Rule "${rule.name}" failed: ${rule.description}`,
      suggestedActions: this.getSuggestedActions(rule, conditionsPassed),
      appliedActions: []
    };
  }

  private evaluateConditions(conditions: RuleCondition[], data: any): boolean {
    return conditions.every(condition => this.evaluateCondition(condition, data));
  }

  private evaluateCondition(condition: RuleCondition, data: any): boolean {
    const fieldValue = this.getFieldValue(data, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'greater_equal':
        return Number(fieldValue) >= Number(condition.value);
      case 'less_equal':
        return Number(fieldValue) <= Number(condition.value);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'not_contains':
        return !String(fieldValue).includes(String(condition.value));
      case 'starts_with':
        return String(fieldValue).startsWith(String(condition.value));
      case 'ends_with':
        return String(fieldValue).endsWith(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case 'between':
        const [min, max] = condition.value;
        return Number(fieldValue) >= Number(min) && Number(fieldValue) <= Number(max);
      case 'is_null':
        return fieldValue == null;
      case 'is_not_null':
        return fieldValue != null;
      default:
        return false;
    }
  }

  private getFieldValue(data: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((obj, key) => obj?.[key], data);
  }

  private getRuleSeverity(rule: AccountingRule): 'ERROR' | 'WARNING' | 'INFO' {
    const errorActions = rule.actions.filter(a => a.type === 'REJECT');
    const warningActions = rule.actions.filter(a => a.type === 'WARN');
    
    if (errorActions.length > 0) return 'ERROR';
    if (warningActions.length > 0) return 'WARNING';
    return 'INFO';
  }

  private getSuggestedActions(rule: AccountingRule, passed: boolean): string[] {
    if (passed) return [];
    
    return rule.actions.map(action => {
      switch (action.type) {
        case 'REJECT':
          return 'Transaction rejected due to rule violation';
        case 'WARN':
          return 'Warning: Review transaction for compliance';
        case 'REQUIRE_APPROVAL':
          return 'Approval required before posting';
        case 'AUTO_CATEGORIZE':
          return 'Auto-categorization applied';
        default:
          return `Action: ${action.type}`;
      }
    });
  }

  private async applyRuleActions(
    rule: AccountingRule, 
    data: any, 
    result: RuleEvaluationResult
  ): Promise<void> {
    for (const action of rule.actions) {
      try {
        await this.executeAction(action, data, result);
        result.appliedActions.push(action);
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }
  }

  private async executeAction(action: RuleAction, data: any, result: RuleEvaluationResult): Promise<void> {
    switch (action.type) {
      case 'REJECT':
        throw new Error(`Transaction rejected: ${result.message}`);
      
      case 'WARN':
        console.warn(`Rule warning: ${result.message}`);
        break;
      
      case 'REQUIRE_APPROVAL':
        // Set approval flag
        data._requiresApproval = true;
        data._approvalReason = result.message;
        break;
      
      case 'AUTO_CATEGORIZE':
        if (action.parameters.accountCode) {
          data.accountCode = action.parameters.accountCode;
        }
        break;
      
      case 'SET_FIELD':
        const { field, value } = action.parameters;
        this.setFieldValue(data, field, value);
        break;
      
      case 'SEND_NOTIFICATION':
        // Implement notification logic
        console.log(`Notification: ${action.parameters.message}`);
        break;
      
      case 'CREATE_TASK':
        // Implement task creation logic
        console.log(`Task created: ${action.parameters.description}`);
        break;
      
      case 'LOG_EVENT':
        console.log(`Event logged: ${result.message}`);
        break;
    }
  }

  private setFieldValue(data: any, fieldPath: string, value: any): void {
    const keys = fieldPath.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((obj, key) => obj[key] = obj[key] || {}, data);
    target[lastKey] = value;
  }

  /**
   * 🏗️ INITIALIZE DEFAULT RULES
   */
  private initializeDefaultRules(): void {
    // Account Code Validation Rule
    this.rules.push({
      id: 'default_account_code_format',
      name: 'Account Code Format Validation',
      description: 'Account codes must be 4-digit numeric format',
      category: 'ACCOUNT_CLASSIFICATION',
      priority: 100,
      isActive: true,
      conditions: [
        {
          field: 'code',
          operator: 'not_equals',
          value: /^\d{4}$/,
          dataType: 'string'
        }
      ],
      actions: [
        {
          type: 'REJECT',
          parameters: { message: 'Account code must be 4 digits' }
        }
      ],
      tenantId: this.tenantId
    });

    // Large Transaction Approval Rule
    this.rules.push({
      id: 'default_large_transaction_approval',
      name: 'Large Transaction Approval',
      description: 'Transactions over $10,000 require approval',
      category: 'APPROVAL',
      priority: 90,
      isActive: true,
      conditions: [
        {
          field: 'totalAmount',
          operator: 'greater_than',
          value: 10000,
          dataType: 'number'
        }
      ],
      actions: [
        {
          type: 'REQUIRE_APPROVAL',
          parameters: { approverRole: 'manager' }
        }
      ],
      tenantId: this.tenantId
    });

    // Cash Account Documentation Rule
    this.rules.push({
      id: 'default_cash_documentation',
      name: 'Cash Transaction Documentation',
      description: 'Cash transactions require reference documentation',
      category: 'TRANSACTION_VALIDATION',
      priority: 80,
      isActive: true,
      conditions: [
        {
          field: 'accountCode',
          operator: 'in',
          value: ['1111', '1112', '1113'],
          dataType: 'array'
        },
        {
          field: 'reference',
          operator: 'is_null',
          value: null,
          dataType: 'string'
        }
      ],
      actions: [
        {
          type: 'WARN',
          parameters: { message: 'Cash transactions should include reference documentation' }
        }
      ],
      tenantId: this.tenantId
    });
  }
} 