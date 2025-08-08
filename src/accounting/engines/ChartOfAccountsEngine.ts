import { PrismaClient } from '@prisma/client';
import { AccountType } from '@prisma/client';

const prisma = new PrismaClient();

export interface AccountStructure {
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string;
  description?: string;
  isActive: boolean;
  level: number;
}

export interface AccountBalance {
  accountCode: string;
  debitBalance: number;
  creditBalance: number;
  netBalance: number;
  lastUpdated: Date;
}

/**
 * 🏗️ CHART OF ACCOUNTS ENGINE
 * Manages the chart of accounts for a tenant
 */
export class ChartOfAccountsEngine {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

    /**
   * 🏗️ CREATE STANDARD CHART OF ACCOUNTS
   * Initialize with standard accounting structure
   */
  async createStandardChartOfAccounts(): Promise<AccountStructure[]> {
    const accountDefinitions = [
      // Assets
      { code: '1000', name: 'Assets', type: 'ASSET' as AccountType, parentCode: undefined },
      { code: '1100', name: 'Current Assets', type: 'ASSET' as AccountType, parentCode: '1000' },
      { code: '1110', name: 'Cash and Cash Equivalents', type: 'ASSET' as AccountType, parentCode: '1100' },
      { code: '1111', name: 'Bank Accounts', type: 'ASSET' as AccountType, parentCode: '1110' },
      { code: '1112', name: 'Cash in Hand', type: 'ASSET' as AccountType, parentCode: '1110' },
      { code: '1113', name: 'Petty Cash', type: 'ASSET' as AccountType, parentCode: '1110' },
      { code: '1115', name: 'Undeposited Funds', type: 'ASSET' as AccountType, parentCode: '1110' },
      { code: '1116', name: 'Savings Account', type: 'ASSET' as AccountType, parentCode: '1110' },
      { code: '1117', name: 'Checking Account', type: 'ASSET' as AccountType, parentCode: '1110' },
      { code: '1118', name: 'Money Market Account', type: 'ASSET' as AccountType, parentCode: '1110' },
      { code: '1120', name: 'Accounts Receivable', type: 'ASSET' as AccountType, parentCode: '1100' },
      { code: '1121', name: 'Trade Accounts Receivable', type: 'ASSET' as AccountType, parentCode: '1120' },
      { code: '1122', name: 'Other Accounts Receivable', type: 'ASSET' as AccountType, parentCode: '1120' },
      { code: '1123', name: 'Allowance for Doubtful Accounts', type: 'ASSET' as AccountType, parentCode: '1120' },
      { code: '1130', name: 'Inventory', type: 'ASSET' as AccountType, parentCode: '1100' },
      { code: '1131', name: 'Raw Materials', type: 'ASSET' as AccountType, parentCode: '1130' },
      { code: '1132', name: 'Work in Process', type: 'ASSET' as AccountType, parentCode: '1130' },
      { code: '1133', name: 'Finished Goods', type: 'ASSET' as AccountType, parentCode: '1130' },
      { code: '1134', name: 'Merchandise Inventory', type: 'ASSET' as AccountType, parentCode: '1130' },
      { code: '1140', name: 'Prepaid Expenses', type: 'ASSET' as AccountType, parentCode: '1100' },
      { code: '1141', name: 'Prepaid Insurance', type: 'ASSET' as AccountType, parentCode: '1140' },
      { code: '1142', name: 'Prepaid Rent', type: 'ASSET' as AccountType, parentCode: '1140' },
      { code: '1143', name: 'Prepaid Subscriptions', type: 'ASSET' as AccountType, parentCode: '1140' },
      { code: '1150', name: 'Short-term Investments', type: 'ASSET' as AccountType, parentCode: '1100' },
      { code: '1151', name: 'Marketable Securities', type: 'ASSET' as AccountType, parentCode: '1150' },
      { code: '1152', name: 'Treasury Bills', type: 'ASSET' as AccountType, parentCode: '1150' },
      { code: '1200', name: 'Fixed Assets', type: 'ASSET' as AccountType, parentCode: '1000' },
      { code: '1210', name: 'Equipment', type: 'ASSET' as AccountType, parentCode: '1200' },
      { code: '1211', name: 'Office Equipment', type: 'ASSET' as AccountType, parentCode: '1210' },
      { code: '1212', name: 'Computer Equipment', type: 'ASSET' as AccountType, parentCode: '1210' },
      { code: '1213', name: 'Manufacturing Equipment', type: 'ASSET' as AccountType, parentCode: '1210' },
      { code: '1214', name: 'Vehicles', type: 'ASSET' as AccountType, parentCode: '1210' },
      { code: '1220', name: 'Furniture and Fixtures', type: 'ASSET' as AccountType, parentCode: '1200' },
      { code: '1221', name: 'Office Furniture', type: 'ASSET' as AccountType, parentCode: '1220' },
      { code: '1222', name: 'Store Fixtures', type: 'ASSET' as AccountType, parentCode: '1220' },
      { code: '1230', name: 'Buildings', type: 'ASSET' as AccountType, parentCode: '1200' },
      { code: '1231', name: 'Office Building', type: 'ASSET' as AccountType, parentCode: '1230' },
      { code: '1232', name: 'Warehouse', type: 'ASSET' as AccountType, parentCode: '1230' },
      { code: '1233', name: 'Factory Building', type: 'ASSET' as AccountType, parentCode: '1230' },
      { code: '1240', name: 'Land', type: 'ASSET' as AccountType, parentCode: '1200' },
      { code: '1241', name: 'Land - Office', type: 'ASSET' as AccountType, parentCode: '1240' },
      { code: '1242', name: 'Land - Warehouse', type: 'ASSET' as AccountType, parentCode: '1240' },
      { code: '1250', name: 'Accumulated Depreciation', type: 'ASSET' as AccountType, parentCode: '1200' },
      { code: '1251', name: 'Accumulated Depreciation - Equipment', type: 'ASSET' as AccountType, parentCode: '1250' },
      { code: '1252', name: 'Accumulated Depreciation - Furniture', type: 'ASSET' as AccountType, parentCode: '1250' },
      { code: '1253', name: 'Accumulated Depreciation - Buildings', type: 'ASSET' as AccountType, parentCode: '1250' },
      { code: '1300', name: 'Intangible Assets', type: 'ASSET' as AccountType, parentCode: '1000' },
      { code: '1310', name: 'Goodwill', type: 'ASSET' as AccountType, parentCode: '1300' },
      { code: '1320', name: 'Patents', type: 'ASSET' as AccountType, parentCode: '1300' },
      { code: '1330', name: 'Trademarks', type: 'ASSET' as AccountType, parentCode: '1300' },
      { code: '1340', name: 'Copyrights', type: 'ASSET' as AccountType, parentCode: '1300' },
      { code: '1350', name: 'Software', type: 'ASSET' as AccountType, parentCode: '1300' },
      { code: '1360', name: 'Accumulated Amortization', type: 'ASSET' as AccountType, parentCode: '1300' },

      // Liabilities
      { code: '2000', name: 'Liabilities', type: 'LIABILITY' as AccountType, parentCode: undefined },
      { code: '2100', name: 'Current Liabilities', type: 'LIABILITY' as AccountType, parentCode: '2000' },
      { code: '2110', name: 'Accounts Payable', type: 'LIABILITY' as AccountType, parentCode: '2100' },
      { code: '2111', name: 'Trade Accounts Payable', type: 'LIABILITY' as AccountType, parentCode: '2110' },
      { code: '2112', name: 'Other Accounts Payable', type: 'LIABILITY' as AccountType, parentCode: '2110' },
      { code: '2120', name: 'Accrued Expenses', type: 'LIABILITY' as AccountType, parentCode: '2100' },
      { code: '2121', name: 'Accrued Salaries', type: 'LIABILITY' as AccountType, parentCode: '2120' },
      { code: '2122', name: 'Accrued Rent', type: 'LIABILITY' as AccountType, parentCode: '2120' },
      { code: '2123', name: 'Accrued Utilities', type: 'LIABILITY' as AccountType, parentCode: '2120' },
      { code: '2124', name: 'Accrued Interest', type: 'LIABILITY' as AccountType, parentCode: '2120' },
      { code: '2130', name: 'Sales Tax Payable', type: 'LIABILITY' as AccountType, parentCode: '2100' },
      { code: '2131', name: 'State Sales Tax Payable', type: 'LIABILITY' as AccountType, parentCode: '2130' },
      { code: '2132', name: 'Local Sales Tax Payable', type: 'LIABILITY' as AccountType, parentCode: '2130' },
      { code: '2140', name: 'Income Tax Payable', type: 'LIABILITY' as AccountType, parentCode: '2100' },
      { code: '2141', name: 'Federal Income Tax Payable', type: 'LIABILITY' as AccountType, parentCode: '2140' },
      { code: '2142', name: 'State Income Tax Payable', type: 'LIABILITY' as AccountType, parentCode: '2140' },
      { code: '2150', name: 'Short-term Loans', type: 'LIABILITY' as AccountType, parentCode: '2100' },
      { code: '2151', name: 'Line of Credit', type: 'LIABILITY' as AccountType, parentCode: '2150' },
      { code: '2152', name: 'Credit Cards Payable', type: 'LIABILITY' as AccountType, parentCode: '2150' },
      { code: '2160', name: 'Unearned Revenue', type: 'LIABILITY' as AccountType, parentCode: '2100' },
      { code: '2161', name: 'Customer Deposits', type: 'LIABILITY' as AccountType, parentCode: '2160' },
      { code: '2162', name: 'Prepaid Services', type: 'LIABILITY' as AccountType, parentCode: '2160' },
      { code: '2200', name: 'Long-term Liabilities', type: 'LIABILITY' as AccountType, parentCode: '2000' },
      { code: '2210', name: 'Notes Payable', type: 'LIABILITY' as AccountType, parentCode: '2200' },
      { code: '2211', name: 'Bank Loans', type: 'LIABILITY' as AccountType, parentCode: '2210' },
      { code: '2212', name: 'Equipment Loans', type: 'LIABILITY' as AccountType, parentCode: '2210' },
      { code: '2220', name: 'Mortgages Payable', type: 'LIABILITY' as AccountType, parentCode: '2200' },
      { code: '2221', name: 'Building Mortgage', type: 'LIABILITY' as AccountType, parentCode: '2220' },
      { code: '2222', name: 'Land Mortgage', type: 'LIABILITY' as AccountType, parentCode: '2220' },
      { code: '2230', name: 'Bonds Payable', type: 'LIABILITY' as AccountType, parentCode: '2200' },
      { code: '2240', name: 'Deferred Tax Liabilities', type: 'LIABILITY' as AccountType, parentCode: '2200' },

      // Equity
      { code: '3000', name: 'Equity', type: 'EQUITY' as AccountType, parentCode: undefined },
      { code: '3100', name: 'Owner\'s Equity', type: 'EQUITY' as AccountType, parentCode: '3000' },
      { code: '3110', name: 'Capital', type: 'EQUITY' as AccountType, parentCode: '3100' },
      { code: '3111', name: 'Initial Capital', type: 'EQUITY' as AccountType, parentCode: '3110' },
      { code: '3112', name: 'Additional Capital', type: 'EQUITY' as AccountType, parentCode: '3110' },
      { code: '3120', name: 'Owner\'s Draw', type: 'EQUITY' as AccountType, parentCode: '3100' },
      { code: '3121', name: 'Owner\'s Salary', type: 'EQUITY' as AccountType, parentCode: '3120' },
      { code: '3122', name: 'Owner\'s Distributions', type: 'EQUITY' as AccountType, parentCode: '3120' },
      { code: '3200', name: 'Retained Earnings', type: 'EQUITY' as AccountType, parentCode: '3000' },
      { code: '3210', name: 'Current Year Earnings', type: 'EQUITY' as AccountType, parentCode: '3200' },
      { code: '3220', name: 'Prior Year Earnings', type: 'EQUITY' as AccountType, parentCode: '3200' },
      { code: '3300', name: 'Common Stock', type: 'EQUITY' as AccountType, parentCode: '3000' },
      { code: '3310', name: 'Common Stock - Par Value', type: 'EQUITY' as AccountType, parentCode: '3300' },
      { code: '3320', name: 'Common Stock - Additional Paid-in Capital', type: 'EQUITY' as AccountType, parentCode: '3300' },
      { code: '3400', name: 'Preferred Stock', type: 'EQUITY' as AccountType, parentCode: '3000' },
      { code: '3410', name: 'Preferred Stock - Par Value', type: 'EQUITY' as AccountType, parentCode: '3400' },
      { code: '3420', name: 'Preferred Stock - Additional Paid-in Capital', type: 'EQUITY' as AccountType, parentCode: '3400' },
      { code: '3500', name: 'Treasury Stock', type: 'EQUITY' as AccountType, parentCode: '3000' },

      // Revenue
      { code: '4000', name: 'Revenue', type: 'REVENUE' as AccountType, parentCode: undefined },
      { code: '4100', name: 'Sales Revenue', type: 'REVENUE' as AccountType, parentCode: '4000' },
      { code: '4110', name: 'Product Sales', type: 'REVENUE' as AccountType, parentCode: '4100' },
      { code: '4111', name: 'Retail Sales', type: 'REVENUE' as AccountType, parentCode: '4110' },
      { code: '4112', name: 'Wholesale Sales', type: 'REVENUE' as AccountType, parentCode: '4110' },
      { code: '4113', name: 'Online Sales', type: 'REVENUE' as AccountType, parentCode: '4110' },
      { code: '4120', name: 'Service Revenue', type: 'REVENUE' as AccountType, parentCode: '4100' },
      { code: '4121', name: 'Consulting Fees', type: 'REVENUE' as AccountType, parentCode: '4120' },
      { code: '4122', name: 'Professional Services', type: 'REVENUE' as AccountType, parentCode: '4120' },
      { code: '4123', name: 'Maintenance Services', type: 'REVENUE' as AccountType, parentCode: '4120' },
      { code: '4124', name: 'Training Services', type: 'REVENUE' as AccountType, parentCode: '4120' },
      { code: '4130', name: 'Contract Revenue', type: 'REVENUE' as AccountType, parentCode: '4100' },
      { code: '4131', name: 'Fixed Price Contracts', type: 'REVENUE' as AccountType, parentCode: '4130' },
      { code: '4132', name: 'Time and Materials Contracts', type: 'REVENUE' as AccountType, parentCode: '4130' },
      { code: '4140', name: 'Subscription Revenue', type: 'REVENUE' as AccountType, parentCode: '4100' },
      { code: '4141', name: 'Monthly Subscriptions', type: 'REVENUE' as AccountType, parentCode: '4140' },
      { code: '4142', name: 'Annual Subscriptions', type: 'REVENUE' as AccountType, parentCode: '4140' },
      { code: '4150', name: 'Licensing Revenue', type: 'REVENUE' as AccountType, parentCode: '4100' },
      { code: '4151', name: 'Software Licenses', type: 'REVENUE' as AccountType, parentCode: '4150' },
      { code: '4152', name: 'Patent Licenses', type: 'REVENUE' as AccountType, parentCode: '4150' },
      { code: '4200', name: 'Other Revenue', type: 'REVENUE' as AccountType, parentCode: '4000' },
      { code: '4210', name: 'Interest Income', type: 'REVENUE' as AccountType, parentCode: '4200' },
      { code: '4211', name: 'Bank Interest', type: 'REVENUE' as AccountType, parentCode: '4210' },
      { code: '4212', name: 'Investment Interest', type: 'REVENUE' as AccountType, parentCode: '4210' },
      { code: '4220', name: 'Gain on Sale of Assets', type: 'REVENUE' as AccountType, parentCode: '4200' },
      { code: '4221', name: 'Gain on Sale of Equipment', type: 'REVENUE' as AccountType, parentCode: '4220' },
      { code: '4222', name: 'Gain on Sale of Investments', type: 'REVENUE' as AccountType, parentCode: '4220' },
      { code: '4230', name: 'Rental Income', type: 'REVENUE' as AccountType, parentCode: '4200' },
      { code: '4231', name: 'Equipment Rental', type: 'REVENUE' as AccountType, parentCode: '4230' },
      { code: '4232', name: 'Property Rental', type: 'REVENUE' as AccountType, parentCode: '4230' },
      { code: '4240', name: 'Commission Income', type: 'REVENUE' as AccountType, parentCode: '4200' },
      { code: '4250', name: 'Rebates and Refunds', type: 'REVENUE' as AccountType, parentCode: '4200' },
      { code: '4260', name: 'Foreign Exchange Gain', type: 'REVENUE' as AccountType, parentCode: '4200' },

      // Expenses
      { code: '5000', name: 'Expenses', type: 'EXPENSE' as AccountType, parentCode: undefined },
      { code: '5100', name: 'Cost of Goods Sold', type: 'EXPENSE' as AccountType, parentCode: '5000' },
      { code: '5110', name: 'Direct Labor', type: 'EXPENSE' as AccountType, parentCode: '5100' },
      { code: '5111', name: 'Production Labor', type: 'EXPENSE' as AccountType, parentCode: '5110' },
      { code: '5112', name: 'Assembly Labor', type: 'EXPENSE' as AccountType, parentCode: '5110' },
      { code: '5120', name: 'Direct Materials', type: 'EXPENSE' as AccountType, parentCode: '5100' },
      { code: '5121', name: 'Raw Materials', type: 'EXPENSE' as AccountType, parentCode: '5120' },
      { code: '5122', name: 'Components', type: 'EXPENSE' as AccountType, parentCode: '5120' },
      { code: '5123', name: 'Packaging Materials', type: 'EXPENSE' as AccountType, parentCode: '5120' },
      { code: '5130', name: 'Manufacturing Overhead', type: 'EXPENSE' as AccountType, parentCode: '5100' },
      { code: '5131', name: 'Factory Rent', type: 'EXPENSE' as AccountType, parentCode: '5130' },
      { code: '5132', name: 'Factory Utilities', type: 'EXPENSE' as AccountType, parentCode: '5130' },
      { code: '5133', name: 'Factory Equipment Depreciation', type: 'EXPENSE' as AccountType, parentCode: '5130' },
      { code: '5140', name: 'Freight and Delivery', type: 'EXPENSE' as AccountType, parentCode: '5100' },
      { code: '5141', name: 'Inbound Freight', type: 'EXPENSE' as AccountType, parentCode: '5140' },
      { code: '5142', name: 'Outbound Freight', type: 'EXPENSE' as AccountType, parentCode: '5140' },
      { code: '5150', name: 'Purchase Discounts', type: 'EXPENSE' as AccountType, parentCode: '5100' },
      { code: '5200', name: 'Operating Expenses', type: 'EXPENSE' as AccountType, parentCode: '5000' },
      { code: '5210', name: 'Salaries and Wages', type: 'EXPENSE' as AccountType, parentCode: '5200' },
      { code: '5211', name: 'Administrative Salaries', type: 'EXPENSE' as AccountType, parentCode: '5210' },
      { code: '5212', name: 'Sales Salaries', type: 'EXPENSE' as AccountType, parentCode: '5210' },
      { code: '5213', name: 'Overtime Pay', type: 'EXPENSE' as AccountType, parentCode: '5210' },
      { code: '5214', name: 'Bonuses', type: 'EXPENSE' as AccountType, parentCode: '5210' },
      { code: '5220', name: 'Rent Expense', type: 'EXPENSE' as AccountType, parentCode: '5200' },
      { code: '5221', name: 'Office Rent', type: 'EXPENSE' as AccountType, parentCode: '5220' },
      { code: '5222', name: 'Warehouse Rent', type: 'EXPENSE' as AccountType, parentCode: '5220' },
      { code: '5223', name: 'Equipment Rent', type: 'EXPENSE' as AccountType, parentCode: '5220' },
      { code: '5230', name: 'Utilities', type: 'EXPENSE' as AccountType, parentCode: '5200' },
      { code: '5231', name: 'Electricity', type: 'EXPENSE' as AccountType, parentCode: '5230' },
      { code: '5232', name: 'Water', type: 'EXPENSE' as AccountType, parentCode: '5230' },
      { code: '5233', name: 'Gas', type: 'EXPENSE' as AccountType, parentCode: '5230' },
      { code: '5234', name: 'Internet', type: 'EXPENSE' as AccountType, parentCode: '5230' },
      { code: '5235', name: 'Telephone', type: 'EXPENSE' as AccountType, parentCode: '5230' },
      { code: '5240', name: 'Office Supplies', type: 'EXPENSE' as AccountType, parentCode: '5200' },
      { code: '5241', name: 'Paper and Printing', type: 'EXPENSE' as AccountType, parentCode: '5240' },
      { code: '5242', name: 'Computer Supplies', type: 'EXPENSE' as AccountType, parentCode: '5240' },
      { code: '5243', name: 'Cleaning Supplies', type: 'EXPENSE' as AccountType, parentCode: '5240' },
      { code: '5250', name: 'Insurance', type: 'EXPENSE' as AccountType, parentCode: '5200' },
      { code: '5251', name: 'General Liability Insurance', type: 'EXPENSE' as AccountType, parentCode: '5250' },
      { code: '5252', name: 'Property Insurance', type: 'EXPENSE' as AccountType, parentCode: '5250' },
      { code: '5253', name: 'Workers Compensation Insurance', type: 'EXPENSE' as AccountType, parentCode: '5250' },
      { code: '5254', name: 'Health Insurance', type: 'EXPENSE' as AccountType, parentCode: '5250' },
      { code: '5260', name: 'Depreciation', type: 'EXPENSE' as AccountType, parentCode: '5200' },
      { code: '5261', name: 'Equipment Depreciation', type: 'EXPENSE' as AccountType, parentCode: '5260' },
      { code: '5262', name: 'Furniture Depreciation', type: 'EXPENSE' as AccountType, parentCode: '5260' },
      { code: '5263', name: 'Building Depreciation', type: 'EXPENSE' as AccountType, parentCode: '5260' },
      { code: '5270', name: 'Advertising', type: 'EXPENSE' as AccountType, parentCode: '5200' },
      { code: '5271', name: 'Print Advertising', type: 'EXPENSE' as AccountType, parentCode: '5270' },
      { code: '5272', name: 'Digital Advertising', type: 'EXPENSE' as AccountType, parentCode: '5270' },
      { code: '5273', name: 'Social Media Advertising', type: 'EXPENSE' as AccountType, parentCode: '5270' },
      { code: '5274', name: 'Trade Shows', type: 'EXPENSE' as AccountType, parentCode: '5270' },
      { code: '5280', name: 'Travel and Entertainment', type: 'EXPENSE' as AccountType, parentCode: '5200' },
      { code: '5281', name: 'Airfare', type: 'EXPENSE' as AccountType, parentCode: '5280' },
      { code: '5282', name: 'Hotel Expenses', type: 'EXPENSE' as AccountType, parentCode: '5280' },
      { code: '5283', name: 'Meals and Entertainment', type: 'EXPENSE' as AccountType, parentCode: '5280' },
      { code: '5284', name: 'Car Rental', type: 'EXPENSE' as AccountType, parentCode: '5280' },
      { code: '5290', name: 'Professional Services', type: 'EXPENSE' as AccountType, parentCode: '5200' },
      { code: '5291', name: 'Legal Fees', type: 'EXPENSE' as AccountType, parentCode: '5290' },
      { code: '5292', name: 'Accounting Fees', type: 'EXPENSE' as AccountType, parentCode: '5290' },
      { code: '5293', name: 'Consulting Fees', type: 'EXPENSE' as AccountType, parentCode: '5290' },
      { code: '5294', name: 'IT Services', type: 'EXPENSE' as AccountType, parentCode: '5290' },
      { code: '5295', name: 'Marketing Services', type: 'EXPENSE' as AccountType, parentCode: '5290' },
      { code: '5300', name: 'Other Expenses', type: 'EXPENSE' as AccountType, parentCode: '5000' },
      { code: '5310', name: 'Interest Expense', type: 'EXPENSE' as AccountType, parentCode: '5300' },
      { code: '5311', name: 'Bank Loan Interest', type: 'EXPENSE' as AccountType, parentCode: '5310' },
      { code: '5312', name: 'Credit Card Interest', type: 'EXPENSE' as AccountType, parentCode: '5310' },
      { code: '5313', name: 'Mortgage Interest', type: 'EXPENSE' as AccountType, parentCode: '5310' },
      { code: '5320', name: 'Loss on Sale of Assets', type: 'EXPENSE' as AccountType, parentCode: '5300' },
      { code: '5321', name: 'Loss on Sale of Equipment', type: 'EXPENSE' as AccountType, parentCode: '5320' },
      { code: '5322', name: 'Loss on Sale of Investments', type: 'EXPENSE' as AccountType, parentCode: '5320' },
      { code: '5330', name: 'Bank Charges', type: 'EXPENSE' as AccountType, parentCode: '5300' },
      { code: '5331', name: 'Service Charges', type: 'EXPENSE' as AccountType, parentCode: '5330' },
      { code: '5332', name: 'Overdraft Fees', type: 'EXPENSE' as AccountType, parentCode: '5330' },
      { code: '5340', name: 'Foreign Exchange Loss', type: 'EXPENSE' as AccountType, parentCode: '5300' },
      { code: '5350', name: 'Bad Debt Expense', type: 'EXPENSE' as AccountType, parentCode: '5300' },
      { code: '5360', name: 'Miscellaneous Expenses', type: 'EXPENSE' as AccountType, parentCode: '5300' },
    ];

    const standardAccounts: Omit<AccountStructure, 'level'>[] = accountDefinitions.map(acc => ({
      ...acc,
      isActive: true,
      description: undefined
    }));

    const accountsWithLevels = this.calculateAccountLevels(standardAccounts);
    const createdAccounts: AccountStructure[] = [];

    for (const accountData of accountsWithLevels) {
      const createdAccount = await this.createAccount(accountData);
      createdAccounts.push(createdAccount);
    }

    return createdAccounts;
  }

  /**
   * Calculate account hierarchy levels
   */
  private calculateAccountLevels(accounts: Omit<AccountStructure, 'level'>[]): AccountStructure[] {
    return accounts.map(account => ({
      ...account,
      level: this.getAccountLevel(account.code),
      isActive: true,
      description: account.description || undefined
    }));
  }

  /**
   * Get account level based on code structure
   */
  private getAccountLevel(code: string): number {
    return Math.floor(code.length / 4);
  }

  /**
   * 🏗️ CREATE INDIVIDUAL ACCOUNT
   */
  async createAccount(accountData: AccountStructure): Promise<AccountStructure> {
    // First, find the parent account if parentCode is provided
    let parentId: string | null = null;
    if (accountData.parentCode) {
      const parentAccount = await prisma.account.findFirst({
        where: {
          code: accountData.parentCode,
          tenantId: this.tenantId
        }
      });
      parentId = parentAccount?.id || null;
    }

    const bookId = await this.getDefaultBookId();

    const account = await prisma.account.upsert({
      where: {
        tenantId_code: {
          code: accountData.code,
          tenantId: this.tenantId
        }
      },
      update: {
        name: accountData.name,
        type: accountData.type,
        parentId: parentId,
        description: accountData.description,
        isActive: accountData.isActive
      },
      create: {
        code: accountData.code,
        name: accountData.name,
        type: accountData.type,
        parentId: parentId,
        description: accountData.description,
        isActive: accountData.isActive,
        tenantId: this.tenantId,
        bookId: bookId
      }
    });

    return {
      code: account.code,
      name: account.name,
      type: account.type,
      parentCode: accountData.parentCode,
      description: account.description || undefined,
      isActive: account.isActive,
      level: accountData.level
    };
  }

  /**
   * Get the default book ID for this tenant
   */
  private async getDefaultBookId(): Promise<string> {
    const book = await prisma.book.findFirst({
      where: { tenantId: this.tenantId }
    });
    
    if (!book) {
      // Get tenant's base currency
      const tenant = await prisma.tenant.findFirst({
        where: { id: this.tenantId },
        select: { baseCurrency: true }
      });

      const baseCurrency = tenant?.baseCurrency || 'MMK';

      // Create default book if it doesn't exist
      const newBook = await prisma.book.create({
        data: {
          name: 'General Ledger',
          currency: baseCurrency,
          tenantId: this.tenantId
        }
      });
      return newBook.id;
    }
    
    return book.id;
  }

  /**
   * 📊 GET ACCOUNT BALANCE
   * Calculate current balance for an account
   */
  async getAccountBalance(accountCode: string): Promise<AccountBalance> {
    const account = await prisma.account.findFirst({
      where: {
        code: accountCode,
        tenantId: this.tenantId
      }
    });

    if (!account) {
      throw new Error(`Account ${accountCode} not found`);
    }

    // Get all entries for this account
    const entries = await prisma.entry.findMany({
      where: {
        accountId: account.id,
        tenantId: this.tenantId
      }
    });

    const debitBalance = entries
      .filter(entry => entry.type === 'DEBIT')
      .reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);

    const creditBalance = entries
      .filter(entry => entry.type === 'CREDIT')
      .reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);

    // Calculate net balance based on account type
    let netBalance: number;
    if (['ASSET', 'EXPENSE'].includes(account.type)) {
      // Normal debit balance accounts
      netBalance = debitBalance - creditBalance;
    } else {
      // Normal credit balance accounts (LIABILITY, EQUITY, REVENUE)
      netBalance = creditBalance - debitBalance;
    }

    return {
      accountCode,
      debitBalance,
      creditBalance,
      netBalance,
      lastUpdated: new Date()
    };
  }

  /**
   * 🏗️ GET ACCOUNT HIERARCHY
   * Return accounts in hierarchical structure
   */
  async getAccountHierarchy(): Promise<AccountStructure[]> {
    const accounts = await prisma.account.findMany({
      where: { tenantId: this.tenantId, isActive: true },
      orderBy: { code: 'asc' }
    });

    return accounts.map(account => ({
      code: account.code,
      name: account.name,
      type: account.type as AccountType,
      parentCode: undefined, // We'll need to implement parent code lookup if needed
      description: account.description || undefined,
      isActive: account.isActive,
      level: this.getAccountLevel(account.code)
    }));
  }

  /**
   * ✅ VALIDATE ACCOUNT CODE
   * Ensure account code follows proper format
   */
  validateAccountCode(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if code is numeric
    if (!/^\d+$/.test(code)) {
      errors.push('Account code must be numeric');
    }

    // Check if code is 4 digits
    if (code.length !== 4) {
      errors.push('Account code must be exactly 4 digits');
    }

    // Check if code follows hierarchical structure
    if (code.length > 0) {
      const level = Math.floor(code.length / 4);
      if (level > 3) {
        errors.push('Account code cannot exceed 3 levels (12 digits)');
      }
    }

    // Check for reserved codes
    const reservedCodes = ['0000', '9999'];
    if (reservedCodes.includes(code)) {
      errors.push(`Account code ${code} is reserved`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 📊 GET TRIAL BALANCE
   * Generate trial balance report
   */
  async getTrialBalance(): Promise<{
    accounts: (AccountBalance & { name: string; type: AccountType })[];
    totalDebits: number;
    totalCredits: number;
    isBalanced: boolean;
  }> {
    const accounts = await prisma.account.findMany({
      where: { tenantId: this.tenantId, isActive: true },
      orderBy: { code: 'asc' }
    });

    const accountBalances: (AccountBalance & { name: string; type: AccountType })[] = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accounts) {
      const balance = await this.getAccountBalance(account.code);
      accountBalances.push({
        ...balance,
        name: account.name,
        type: account.type
      });

      if (['ASSET', 'EXPENSE'].includes(account.type)) {
        totalDebits += balance.netBalance > 0 ? balance.netBalance : 0;
        totalCredits += balance.netBalance < 0 ? Math.abs(balance.netBalance) : 0;
      } else {
        totalCredits += balance.netBalance > 0 ? balance.netBalance : 0;
        totalDebits += balance.netBalance < 0 ? Math.abs(balance.netBalance) : 0;
      }
    }

    return {
      accounts: accountBalances,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01 // Allow for rounding differences
    };
  }
} 