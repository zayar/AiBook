const { PrismaClient } = require('@prisma/client');

// Use the Cloud SQL database URL
const DATABASE_URL = "mysql://gtadmin:gtapp456$%^@34.123.50.107:3306/aiAccount?sslmode=disable";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

// Comprehensive Chart of Accounts with correct AccountType enum values
const comprehensiveChartOfAccounts = [
  // Assets
  { code: '1000', name: 'Assets', type: 'OTHER_ASSET', parentCode: undefined, description: 'All assets of the business' },
  { code: '1100', name: 'Current Assets', type: 'OTHER_CURRENT_ASSET', parentCode: '1000', description: 'Assets expected to be converted to cash within one year' },
  { code: '1110', name: 'Cash and Cash Equivalents', type: 'CASH', parentCode: '1100', description: 'Cash and cash-like assets' },
  { code: '1111', name: 'Bank Accounts', type: 'BANK', parentCode: '1110', description: 'All bank account balances' },
  { code: '1112', name: 'Cash in Hand', type: 'CASH', parentCode: '1110', description: 'Physical cash on premises' },
  { code: '1113', name: 'Petty Cash', type: 'CASH', parentCode: '1110', description: 'Small cash fund for minor expenses' },
  { code: '1115', name: 'Undeposited Funds', type: 'CASH', parentCode: '1110', description: 'Cash not yet deposited to bank' },
  { code: '1116', name: 'Savings Account', type: 'BANK', parentCode: '1110', description: 'Business savings account' },
  { code: '1117', name: 'Checking Account', type: 'BANK', parentCode: '1110', description: 'Business checking account' },
  { code: '1118', name: 'Money Market Account', type: 'BANK', parentCode: '1110', description: 'Money market investment account' },
  { code: '1120', name: 'Accounts Receivable', type: 'ACCOUNTS_RECEIVABLE', parentCode: '1100', description: 'Amounts owed by customers' },
  { code: '1121', name: 'Trade Accounts Receivable', type: 'ACCOUNTS_RECEIVABLE', parentCode: '1120', description: 'Receivables from normal business operations' },
  { code: '1122', name: 'Other Accounts Receivable', type: 'ACCOUNTS_RECEIVABLE', parentCode: '1120', description: 'Other amounts receivable' },
  { code: '1123', name: 'Allowance for Doubtful Accounts', type: 'ACCOUNTS_RECEIVABLE', parentCode: '1120', description: 'Contra account for doubtful receivables' },
  { code: '1130', name: 'Inventory', type: 'STOCK', parentCode: '1100', description: 'Goods held for sale' },
  { code: '1131', name: 'Raw Materials', type: 'STOCK', parentCode: '1130', description: 'Raw materials inventory' },
  { code: '1132', name: 'Work in Process', type: 'STOCK', parentCode: '1130', description: 'Inventory in production process' },
  { code: '1133', name: 'Finished Goods', type: 'STOCK', parentCode: '1130', description: 'Completed products ready for sale' },
  { code: '1134', name: 'Merchandise Inventory', type: 'STOCK', parentCode: '1130', description: 'Merchandise for resale' },
  { code: '1140', name: 'Prepaid Expenses', type: 'OTHER_CURRENT_ASSET', parentCode: '1100', description: 'Expenses paid in advance' },
  { code: '1141', name: 'Prepaid Insurance', type: 'OTHER_CURRENT_ASSET', parentCode: '1140', description: 'Insurance premiums paid in advance' },
  { code: '1142', name: 'Prepaid Rent', type: 'OTHER_CURRENT_ASSET', parentCode: '1140', description: 'Rent paid in advance' },
  { code: '1143', name: 'Prepaid Subscriptions', type: 'OTHER_CURRENT_ASSET', parentCode: '1140', description: 'Subscription fees paid in advance' },
  { code: '1150', name: 'Short-term Investments', type: 'OTHER_CURRENT_ASSET', parentCode: '1100', description: 'Short-term investment securities' },
  { code: '1151', name: 'Marketable Securities', type: 'OTHER_CURRENT_ASSET', parentCode: '1150', description: 'Marketable investment securities' },
  { code: '1152', name: 'Treasury Bills', type: 'OTHER_CURRENT_ASSET', parentCode: '1150', description: 'Government treasury bills' },
  { code: '1200', name: 'Fixed Assets', type: 'FIXED_ASSET', parentCode: '1000', description: 'Long-term tangible assets' },
  { code: '1210', name: 'Equipment', type: 'FIXED_ASSET', parentCode: '1200', description: 'Business equipment and machinery' },
  { code: '1211', name: 'Office Equipment', type: 'FIXED_ASSET', parentCode: '1210', description: 'Office equipment and furniture' },
  { code: '1212', name: 'Computer Equipment', type: 'FIXED_ASSET', parentCode: '1210', description: 'Computers and IT equipment' },
  { code: '1213', name: 'Manufacturing Equipment', type: 'FIXED_ASSET', parentCode: '1210', description: 'Manufacturing machinery and equipment' },
  { code: '1214', name: 'Vehicles', type: 'FIXED_ASSET', parentCode: '1210', description: 'Company vehicles' },
  { code: '1220', name: 'Furniture and Fixtures', type: 'FIXED_ASSET', parentCode: '1200', description: 'Furniture and fixtures' },
  { code: '1221', name: 'Office Furniture', type: 'FIXED_ASSET', parentCode: '1220', description: 'Office furniture and fixtures' },
  { code: '1222', name: 'Store Fixtures', type: 'FIXED_ASSET', parentCode: '1220', description: 'Retail store fixtures' },
  { code: '1230', name: 'Buildings', type: 'FIXED_ASSET', parentCode: '1200', description: 'Business buildings and structures' },
  { code: '1231', name: 'Office Building', type: 'FIXED_ASSET', parentCode: '1230', description: 'Office building' },
  { code: '1232', name: 'Warehouse', type: 'FIXED_ASSET', parentCode: '1230', description: 'Warehouse building' },
  { code: '1233', name: 'Factory Building', type: 'FIXED_ASSET', parentCode: '1230', description: 'Factory building' },
  { code: '1240', name: 'Land', type: 'FIXED_ASSET', parentCode: '1200', description: 'Land owned by the business' },
  { code: '1241', name: 'Land - Office', type: 'FIXED_ASSET', parentCode: '1240', description: 'Land for office building' },
  { code: '1242', name: 'Land - Warehouse', type: 'FIXED_ASSET', parentCode: '1240', description: 'Land for warehouse' },
  { code: '1250', name: 'Accumulated Depreciation', type: 'FIXED_ASSET', parentCode: '1200', description: 'Contra account for depreciation' },
  { code: '1251', name: 'Accumulated Depreciation - Equipment', type: 'FIXED_ASSET', parentCode: '1250', description: 'Accumulated depreciation on equipment' },
  { code: '1252', name: 'Accumulated Depreciation - Furniture', type: 'FIXED_ASSET', parentCode: '1250', description: 'Accumulated depreciation on furniture' },
  { code: '1253', name: 'Accumulated Depreciation - Buildings', type: 'FIXED_ASSET', parentCode: '1250', description: 'Accumulated depreciation on buildings' },
  { code: '1300', name: 'Intangible Assets', type: 'INTANGIBLE_ASSET', parentCode: '1000', description: 'Intangible assets' },
  { code: '1310', name: 'Goodwill', type: 'INTANGIBLE_ASSET', parentCode: '1300', description: 'Goodwill from business acquisitions' },
  { code: '1320', name: 'Patents', type: 'INTANGIBLE_ASSET', parentCode: '1300', description: 'Patent rights' },
  { code: '1330', name: 'Trademarks', type: 'INTANGIBLE_ASSET', parentCode: '1300', description: 'Trademark rights' },
  { code: '1340', name: 'Copyrights', type: 'INTANGIBLE_ASSET', parentCode: '1300', description: 'Copyright rights' },
  { code: '1350', name: 'Software', type: 'INTANGIBLE_ASSET', parentCode: '1300', description: 'Software licenses and development costs' },
  { code: '1360', name: 'Accumulated Amortization', type: 'INTANGIBLE_ASSET', parentCode: '1300', description: 'Contra account for amortization' },
  { code: '1400', name: 'Input Tax', type: 'INPUT_TAX', parentCode: '1000', description: 'Input tax credits' },

  // Liabilities
  { code: '2000', name: 'Liabilities', type: 'OTHER_LIABILITY', parentCode: undefined, description: 'All liabilities of the business' },
  { code: '2100', name: 'Current Liabilities', type: 'OTHER_CURRENT_LIABILITY', parentCode: '2000', description: 'Liabilities due within one year' },
  { code: '2110', name: 'Accounts Payable', type: 'ACCOUNTS_PAYABLE', parentCode: '2100', description: 'Amounts owed to suppliers' },
  { code: '2111', name: 'Trade Accounts Payable', type: 'ACCOUNTS_PAYABLE', parentCode: '2110', description: 'Payables from normal business operations' },
  { code: '2112', name: 'Other Accounts Payable', type: 'ACCOUNTS_PAYABLE', parentCode: '2110', description: 'Other amounts payable' },
  { code: '2120', name: 'Accrued Expenses', type: 'OTHER_CURRENT_LIABILITY', parentCode: '2100', description: 'Expenses incurred but not yet paid' },
  { code: '2121', name: 'Accrued Salaries', type: 'OTHER_CURRENT_LIABILITY', parentCode: '2120', description: 'Accrued employee salaries' },
  { code: '2122', name: 'Accrued Rent', type: 'OTHER_CURRENT_LIABILITY', parentCode: '2120', description: 'Accrued rent expense' },
  { code: '2123', name: 'Accrued Utilities', type: 'OTHER_CURRENT_LIABILITY', parentCode: '2120', description: 'Accrued utility expenses' },
  { code: '2124', name: 'Accrued Interest', type: 'OTHER_CURRENT_LIABILITY', parentCode: '2120', description: 'Accrued interest expense' },
  { code: '2130', name: 'Sales Tax Payable', type: 'OUTPUT_TAX', parentCode: '2100', description: 'Sales tax collected but not yet remitted' },
  { code: '2131', name: 'State Sales Tax Payable', type: 'OUTPUT_TAX', parentCode: '2130', description: 'State sales tax payable' },
  { code: '2132', name: 'Local Sales Tax Payable', type: 'OUTPUT_TAX', parentCode: '2130', description: 'Local sales tax payable' },
  { code: '2140', name: 'Income Tax Payable', type: 'OTHER_CURRENT_LIABILITY', parentCode: '2100', description: 'Income tax payable' },
  { code: '2141', name: 'Federal Income Tax Payable', type: 'OTHER_CURRENT_LIABILITY', parentCode: '2140', description: 'Federal income tax payable' },
  { code: '2142', name: 'State Income Tax Payable', type: 'OTHER_CURRENT_LIABILITY', parentCode: '2140', description: 'State income tax payable' },
  { code: '2150', name: 'Short-term Loans', type: 'OTHER_CURRENT_LIABILITY', parentCode: '2100', description: 'Short-term loans and credit lines' },
  { code: '2151', name: 'Line of Credit', type: 'OTHER_CURRENT_LIABILITY', parentCode: '2150', description: 'Business line of credit' },
  { code: '2152', name: 'Credit Cards Payable', type: 'CREDIT_CARD', parentCode: '2150', description: 'Credit card balances' },
  { code: '2160', name: 'Unearned Revenue', type: 'OTHER_CURRENT_LIABILITY', parentCode: '2100', description: 'Revenue received but not yet earned' },
  { code: '2161', name: 'Customer Deposits', type: 'OTHER_CURRENT_LIABILITY', parentCode: '2160', description: 'Customer deposits and advances' },
  { code: '2162', name: 'Prepaid Services', type: 'OTHER_CURRENT_LIABILITY', parentCode: '2160', description: 'Services paid for but not yet provided' },
  { code: '2200', name: 'Long-term Liabilities', type: 'NON_CURRENT_LIABILITY', parentCode: '2000', description: 'Liabilities due after one year' },
  { code: '2210', name: 'Notes Payable', type: 'NON_CURRENT_LIABILITY', parentCode: '2200', description: 'Long-term notes and loans' },
  { code: '2211', name: 'Bank Loans', type: 'NON_CURRENT_LIABILITY', parentCode: '2210', description: 'Long-term bank loans' },
  { code: '2212', name: 'Equipment Loans', type: 'NON_CURRENT_LIABILITY', parentCode: '2210', description: 'Equipment financing loans' },
  { code: '2220', name: 'Mortgages Payable', type: 'NON_CURRENT_LIABILITY', parentCode: '2200', description: 'Mortgage loans' },
  { code: '2221', name: 'Building Mortgage', type: 'NON_CURRENT_LIABILITY', parentCode: '2220', description: 'Building mortgage loan' },
  { code: '2222', name: 'Land Mortgage', type: 'NON_CURRENT_LIABILITY', parentCode: '2220', description: 'Land mortgage loan' },
  { code: '2230', name: 'Bonds Payable', type: 'NON_CURRENT_LIABILITY', parentCode: '2200', description: 'Bonds issued by the company' },
  { code: '2240', name: 'Deferred Tax Liabilities', type: 'DEFERRED_TAX_LIABILITY', parentCode: '2200', description: 'Deferred tax liabilities' },

  // Equity
  { code: '3000', name: 'Equity', type: 'EQUITY', parentCode: undefined, description: 'Owner\'s equity in the business' },
  { code: '3100', name: 'Owner\'s Equity', type: 'EQUITY', parentCode: '3000', description: 'Owner\'s investment and withdrawals' },
  { code: '3110', name: 'Capital', type: 'EQUITY', parentCode: '3100', description: 'Owner\'s capital investment' },
  { code: '3111', name: 'Initial Capital', type: 'EQUITY', parentCode: '3110', description: 'Initial capital investment' },
  { code: '3112', name: 'Additional Capital', type: 'EQUITY', parentCode: '3110', description: 'Additional capital contributions' },
  { code: '3120', name: 'Owner\'s Draw', type: 'EQUITY', parentCode: '3100', description: 'Owner\'s withdrawals from business' },
  { code: '3121', name: 'Owner\'s Salary', type: 'EQUITY', parentCode: '3120', description: 'Owner\'s salary payments' },
  { code: '3122', name: 'Owner\'s Distributions', type: 'EQUITY', parentCode: '3120', description: 'Owner\'s distributions' },
  { code: '3200', name: 'Retained Earnings', type: 'EQUITY', parentCode: '3000', description: 'Accumulated profits retained in business' },
  { code: '3210', name: 'Current Year Earnings', type: 'EQUITY', parentCode: '3200', description: 'Current year net income' },
  { code: '3220', name: 'Prior Year Earnings', type: 'EQUITY', parentCode: '3200', description: 'Prior years accumulated earnings' },
  { code: '3300', name: 'Common Stock', type: 'EQUITY', parentCode: '3000', description: 'Common stock equity' },
  { code: '3310', name: 'Common Stock - Par Value', type: 'EQUITY', parentCode: '3300', description: 'Common stock par value' },
  { code: '3320', name: 'Common Stock - Additional Paid-in Capital', type: 'EQUITY', parentCode: '3300', description: 'Additional paid-in capital on common stock' },
  { code: '3400', name: 'Preferred Stock', type: 'EQUITY', parentCode: '3000', description: 'Preferred stock equity' },
  { code: '3410', name: 'Preferred Stock - Par Value', type: 'EQUITY', parentCode: '3400', description: 'Preferred stock par value' },
  { code: '3420', name: 'Preferred Stock - Additional Paid-in Capital', type: 'EQUITY', parentCode: '3400', description: 'Additional paid-in capital on preferred stock' },
  { code: '3500', name: 'Treasury Stock', type: 'EQUITY', parentCode: '3000', description: 'Treasury stock (contra equity)' },

  // Revenue
  { code: '4000', name: 'Revenue', type: 'INCOME', parentCode: undefined, description: 'All revenue accounts' },
  { code: '4100', name: 'Sales Revenue', type: 'INCOME', parentCode: '4000', description: 'Revenue from sales activities' },
  { code: '4110', name: 'Product Sales', type: 'INCOME', parentCode: '4100', description: 'Revenue from product sales' },
  { code: '4111', name: 'Retail Sales', type: 'INCOME', parentCode: '4110', description: 'Retail product sales' },
  { code: '4112', name: 'Wholesale Sales', type: 'INCOME', parentCode: '4110', description: 'Wholesale product sales' },
  { code: '4113', name: 'Online Sales', type: 'INCOME', parentCode: '4110', description: 'Online product sales' },
  { code: '4120', name: 'Service Revenue', type: 'INCOME', parentCode: '4100', description: 'Revenue from services' },
  { code: '4121', name: 'Consulting Fees', type: 'INCOME', parentCode: '4120', description: 'Consulting service revenue' },
  { code: '4122', name: 'Professional Services', type: 'INCOME', parentCode: '4120', description: 'Professional service revenue' },
  { code: '4123', name: 'Maintenance Services', type: 'INCOME', parentCode: '4120', description: 'Maintenance service revenue' },
  { code: '4124', name: 'Training Services', type: 'INCOME', parentCode: '4120', description: 'Training service revenue' },
  { code: '4130', name: 'Contract Revenue', type: 'INCOME', parentCode: '4100', description: 'Revenue from contracts' },
  { code: '4131', name: 'Fixed Price Contracts', type: 'INCOME', parentCode: '4130', description: 'Fixed price contract revenue' },
  { code: '4132', name: 'Time and Materials Contracts', type: 'INCOME', parentCode: '4130', description: 'Time and materials contract revenue' },
  { code: '4140', name: 'Subscription Revenue', type: 'INCOME', parentCode: '4100', description: 'Subscription-based revenue' },
  { code: '4141', name: 'Monthly Subscriptions', type: 'INCOME', parentCode: '4140', description: 'Monthly subscription revenue' },
  { code: '4142', name: 'Annual Subscriptions', type: 'INCOME', parentCode: '4140', description: 'Annual subscription revenue' },
  { code: '4150', name: 'Licensing Revenue', type: 'INCOME', parentCode: '4100', description: 'Revenue from licensing' },
  { code: '4151', name: 'Software Licenses', type: 'INCOME', parentCode: '4150', description: 'Software licensing revenue' },
  { code: '4152', name: 'Patent Licenses', type: 'INCOME', parentCode: '4150', description: 'Patent licensing revenue' },
  { code: '4200', name: 'Other Revenue', type: 'OTHER_INCOME', parentCode: '4000', description: 'Other revenue sources' },
  { code: '4210', name: 'Interest Income', type: 'OTHER_INCOME', parentCode: '4200', description: 'Interest earned on investments' },
  { code: '4211', name: 'Bank Interest', type: 'OTHER_INCOME', parentCode: '4210', description: 'Interest earned on bank accounts' },
  { code: '4212', name: 'Investment Interest', type: 'OTHER_INCOME', parentCode: '4210', description: 'Interest earned on investments' },
  { code: '4220', name: 'Gain on Sale of Assets', type: 'OTHER_INCOME', parentCode: '4200', description: 'Gains from asset sales' },
  { code: '4221', name: 'Gain on Sale of Equipment', type: 'OTHER_INCOME', parentCode: '4220', description: 'Gains from equipment sales' },
  { code: '4222', name: 'Gain on Sale of Investments', type: 'OTHER_INCOME', parentCode: '4220', description: 'Gains from investment sales' },
  { code: '4230', name: 'Rental Income', type: 'OTHER_INCOME', parentCode: '4200', description: 'Rental income' },
  { code: '4231', name: 'Equipment Rental', type: 'OTHER_INCOME', parentCode: '4230', description: 'Equipment rental income' },
  { code: '4232', name: 'Property Rental', type: 'OTHER_INCOME', parentCode: '4230', description: 'Property rental income' },
  { code: '4240', name: 'Commission Income', type: 'OTHER_INCOME', parentCode: '4200', description: 'Commission income' },
  { code: '4250', name: 'Rebates and Refunds', type: 'OTHER_INCOME', parentCode: '4200', description: 'Rebates and refunds received' },
  { code: '4260', name: 'Foreign Exchange Gain', type: 'OTHER_INCOME', parentCode: '4200', description: 'Foreign exchange gains' },

  // Expenses
  { code: '5000', name: 'Expenses', type: 'EXPENSE', parentCode: undefined, description: 'All expense accounts' },
  { code: '5100', name: 'Cost of Goods Sold', type: 'COST_OF_GOODS_SOLD', parentCode: '5000', description: 'Direct costs of products sold' },
  { code: '5110', name: 'Direct Labor', type: 'COST_OF_GOODS_SOLD', parentCode: '5100', description: 'Direct labor costs' },
  { code: '5111', name: 'Production Labor', type: 'COST_OF_GOODS_SOLD', parentCode: '5110', description: 'Production labor costs' },
  { code: '5112', name: 'Assembly Labor', type: 'COST_OF_GOODS_SOLD', parentCode: '5110', description: 'Assembly labor costs' },
  { code: '5120', name: 'Direct Materials', type: 'COST_OF_GOODS_SOLD', parentCode: '5100', description: 'Direct material costs' },
  { code: '5121', name: 'Raw Materials', type: 'COST_OF_GOODS_SOLD', parentCode: '5120', description: 'Raw material costs' },
  { code: '5122', name: 'Components', type: 'COST_OF_GOODS_SOLD', parentCode: '5120', description: 'Component costs' },
  { code: '5123', name: 'Packaging Materials', type: 'COST_OF_GOODS_SOLD', parentCode: '5120', description: 'Packaging material costs' },
  { code: '5130', name: 'Manufacturing Overhead', type: 'COST_OF_GOODS_SOLD', parentCode: '5100', description: 'Manufacturing overhead costs' },
  { code: '5131', name: 'Factory Rent', type: 'COST_OF_GOODS_SOLD', parentCode: '5130', description: 'Factory rent expense' },
  { code: '5132', name: 'Factory Utilities', type: 'COST_OF_GOODS_SOLD', parentCode: '5130', description: 'Factory utility expenses' },
  { code: '5133', name: 'Factory Equipment Depreciation', type: 'COST_OF_GOODS_SOLD', parentCode: '5130', description: 'Factory equipment depreciation' },
  { code: '5140', name: 'Freight and Delivery', type: 'COST_OF_GOODS_SOLD', parentCode: '5100', description: 'Freight and delivery costs' },
  { code: '5141', name: 'Inbound Freight', type: 'COST_OF_GOODS_SOLD', parentCode: '5140', description: 'Inbound freight costs' },
  { code: '5142', name: 'Outbound Freight', type: 'COST_OF_GOODS_SOLD', parentCode: '5140', description: 'Outbound freight costs' },
  { code: '5150', name: 'Purchase Discounts', type: 'COST_OF_GOODS_SOLD', parentCode: '5100', description: 'Purchase discounts taken' },
  { code: '5200', name: 'Operating Expenses', type: 'EXPENSE', parentCode: '5000', description: 'General operating expenses' },
  { code: '5210', name: 'Salaries and Wages', type: 'EXPENSE', parentCode: '5200', description: 'Employee salaries and wages' },
  { code: '5211', name: 'Administrative Salaries', type: 'EXPENSE', parentCode: '5210', description: 'Administrative staff salaries' },
  { code: '5212', name: 'Sales Salaries', type: 'EXPENSE', parentCode: '5210', description: 'Sales staff salaries' },
  { code: '5213', name: 'Overtime Pay', type: 'EXPENSE', parentCode: '5210', description: 'Employee overtime pay' },
  { code: '5214', name: 'Bonuses', type: 'EXPENSE', parentCode: '5210', description: 'Employee bonuses' },
  { code: '5220', name: 'Rent Expense', type: 'EXPENSE', parentCode: '5200', description: 'Rent expenses' },
  { code: '5221', name: 'Office Rent', type: 'EXPENSE', parentCode: '5220', description: 'Office rent expense' },
  { code: '5222', name: 'Warehouse Rent', type: 'EXPENSE', parentCode: '5220', description: 'Warehouse rent expense' },
  { code: '5223', name: 'Equipment Rent', type: 'EXPENSE', parentCode: '5220', description: 'Equipment rental expense' },
  { code: '5230', name: 'Utilities', type: 'EXPENSE', parentCode: '5200', description: 'Utility expenses' },
  { code: '5231', name: 'Electricity', type: 'EXPENSE', parentCode: '5230', description: 'Electricity expense' },
  { code: '5232', name: 'Water', type: 'EXPENSE', parentCode: '5230', description: 'Water expense' },
  { code: '5233', name: 'Gas', type: 'EXPENSE', parentCode: '5230', description: 'Gas expense' },
  { code: '5234', name: 'Internet', type: 'EXPENSE', parentCode: '5230', description: 'Internet expense' },
  { code: '5235', name: 'Telephone', type: 'EXPENSE', parentCode: '5230', description: 'Telephone expense' },
  { code: '5240', name: 'Office Supplies', type: 'EXPENSE', parentCode: '5200', description: 'Office supply expenses' },
  { code: '5241', name: 'Paper and Printing', type: 'EXPENSE', parentCode: '5240', description: 'Paper and printing expenses' },
  { code: '5242', name: 'Computer Supplies', type: 'EXPENSE', parentCode: '5240', description: 'Computer supply expenses' },
  { code: '5243', name: 'Cleaning Supplies', type: 'EXPENSE', parentCode: '5240', description: 'Cleaning supply expenses' },
  { code: '5250', name: 'Insurance', type: 'EXPENSE', parentCode: '5200', description: 'Insurance expenses' },
  { code: '5251', name: 'General Liability Insurance', type: 'EXPENSE', parentCode: '5250', description: 'General liability insurance' },
  { code: '5252', name: 'Property Insurance', type: 'EXPENSE', parentCode: '5250', description: 'Property insurance' },
  { code: '5253', name: 'Workers Compensation Insurance', type: 'EXPENSE', parentCode: '5250', description: 'Workers compensation insurance' },
  { code: '5254', name: 'Health Insurance', type: 'EXPENSE', parentCode: '5250', description: 'Health insurance' },
  { code: '5260', name: 'Depreciation', type: 'EXPENSE', parentCode: '5200', description: 'Depreciation expenses' },
  { code: '5261', name: 'Equipment Depreciation', type: 'EXPENSE', parentCode: '5260', description: 'Equipment depreciation' },
  { code: '5262', name: 'Furniture Depreciation', type: 'EXPENSE', parentCode: '5260', description: 'Furniture depreciation' },
  { code: '5263', name: 'Building Depreciation', type: 'EXPENSE', parentCode: '5260', description: 'Building depreciation' },
  { code: '5270', name: 'Advertising', type: 'EXPENSE', parentCode: '5200', description: 'Advertising expenses' },
  { code: '5271', name: 'Print Advertising', type: 'EXPENSE', parentCode: '5270', description: 'Print advertising expenses' },
  { code: '5272', name: 'Digital Advertising', type: 'EXPENSE', parentCode: '5270', description: 'Digital advertising expenses' },
  { code: '5273', name: 'Social Media Advertising', type: 'EXPENSE', parentCode: '5270', description: 'Social media advertising expenses' },
  { code: '5274', name: 'Trade Shows', type: 'EXPENSE', parentCode: '5270', description: 'Trade show expenses' },
  { code: '5280', name: 'Travel and Entertainment', type: 'EXPENSE', parentCode: '5200', description: 'Travel and entertainment expenses' },
  { code: '5281', name: 'Airfare', type: 'EXPENSE', parentCode: '5280', description: 'Airfare expenses' },
  { code: '5282', name: 'Hotel Expenses', type: 'EXPENSE', parentCode: '5280', description: 'Hotel expenses' },
  { code: '5283', name: 'Meals and Entertainment', type: 'EXPENSE', parentCode: '5280', description: 'Meals and entertainment expenses' },
  { code: '5284', name: 'Car Rental', type: 'EXPENSE', parentCode: '5280', description: 'Car rental expenses' },
  { code: '5290', name: 'Professional Services', type: 'EXPENSE', parentCode: '5200', description: 'Professional service expenses' },
  { code: '5291', name: 'Legal Fees', type: 'EXPENSE', parentCode: '5290', description: 'Legal fees' },
  { code: '5292', name: 'Accounting Fees', type: 'EXPENSE', parentCode: '5290', description: 'Accounting fees' },
  { code: '5293', name: 'Consulting Fees', type: 'EXPENSE', parentCode: '5290', description: 'Consulting fees' },
  { code: '5294', name: 'IT Services', type: 'EXPENSE', parentCode: '5290', description: 'IT service expenses' },
  { code: '5295', name: 'Marketing Services', type: 'EXPENSE', parentCode: '5290', description: 'Marketing service expenses' },
  { code: '5300', name: 'Other Expenses', type: 'OTHER_EXPENSE', parentCode: '5000', description: 'Other miscellaneous expenses' },
  { code: '5310', name: 'Interest Expense', type: 'OTHER_EXPENSE', parentCode: '5300', description: 'Interest expenses' },
  { code: '5311', name: 'Bank Loan Interest', type: 'OTHER_EXPENSE', parentCode: '5310', description: 'Bank loan interest' },
  { code: '5312', name: 'Credit Card Interest', type: 'OTHER_EXPENSE', parentCode: '5310', description: 'Credit card interest' },
  { code: '5313', name: 'Mortgage Interest', type: 'OTHER_EXPENSE', parentCode: '5310', description: 'Mortgage interest' },
  { code: '5320', name: 'Loss on Sale of Assets', type: 'OTHER_EXPENSE', parentCode: '5300', description: 'Losses from asset sales' },
  { code: '5321', name: 'Loss on Sale of Equipment', type: 'OTHER_EXPENSE', parentCode: '5320', description: 'Losses from equipment sales' },
  { code: '5322', name: 'Loss on Sale of Investments', type: 'OTHER_EXPENSE', parentCode: '5320', description: 'Losses from investment sales' },
  { code: '5330', name: 'Bank Charges', type: 'OTHER_EXPENSE', parentCode: '5300', description: 'Bank charges and fees' },
  { code: '5331', name: 'Service Charges', type: 'OTHER_EXPENSE', parentCode: '5330', description: 'Bank service charges' },
  { code: '5332', name: 'Overdraft Fees', type: 'OTHER_EXPENSE', parentCode: '5330', description: 'Bank overdraft fees' },
  { code: '5340', name: 'Foreign Exchange Loss', type: 'OTHER_EXPENSE', parentCode: '5300', description: 'Foreign exchange losses' },
  { code: '5350', name: 'Bad Debt Expense', type: 'OTHER_EXPENSE', parentCode: '5300', description: 'Bad debt expenses' },
  { code: '5360', name: 'Miscellaneous Expenses', type: 'OTHER_EXPENSE', parentCode: '5300', description: 'Miscellaneous expenses' },
];

async function seedComprehensiveChartOfAccounts() {
  try {
    console.log('🌱 Starting to seed comprehensive chart of accounts...');

    // Create default tenant if it doesn't exist
    let tenant = await prisma.tenant.findUnique({
      where: { id: 'default' }
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          id: 'default',
          name: 'Cashflow Copilot Demo Company',
          domain: 'default.local',
          settings: JSON.stringify({
            currency: 'MMK',
            timezone: 'Asia/Yangon',
            dateFormat: 'YYYY-MM-DD'
          })
        }
      });
      console.log('✅ Created default tenant');
    }

    // Create default book
    let book = await prisma.book.findFirst({
      where: { tenantId: 'default' }
    });

    if (!book) {
      book = await prisma.book.create({
        data: {
          name: 'General Ledger',
          tenantId: 'default',
          currency: 'MMK'
        }
      });
      console.log('✅ Created default book');
    }

    // Create accounts with proper hierarchy
    console.log('📊 Creating comprehensive chart of accounts...');
    
    // First, create parent accounts
    const parentAccounts = comprehensiveChartOfAccounts.filter(acc => !acc.parentCode);
    
    for (const accountData of parentAccounts) {
      const existingAccount = await prisma.account.findFirst({
        where: {
          code: accountData.code,
          tenantId: 'default'
        }
      });

      if (!existingAccount) {
        await prisma.account.create({
          data: {
            code: accountData.code,
            name: accountData.name,
            type: accountData.type,
            description: accountData.description,
            bookId: book.id,
            tenantId: 'default',
            currency: 'MMK',
            balance: 0,
            isActive: true
          }
        });
        console.log(`✅ Created parent account: ${accountData.code} - ${accountData.name}`);
      } else {
        console.log(`⚠️  Parent account already exists: ${accountData.code} - ${accountData.name}`);
      }
    }

    // Then create child accounts
    const childAccounts = comprehensiveChartOfAccounts.filter(acc => acc.parentCode);
    
    for (const accountData of childAccounts) {
      const existingAccount = await prisma.account.findFirst({
        where: {
          code: accountData.code,
          tenantId: 'default'
        }
      });

      if (!existingAccount) {
        // Find parent account
        const parentAccount = await prisma.account.findFirst({
          where: {
            code: accountData.parentCode,
            tenantId: 'default'
          }
        });

        if (parentAccount) {
          await prisma.account.create({
            data: {
              code: accountData.code,
              name: accountData.name,
              type: accountData.type,
              description: accountData.description,
              parentId: parentAccount.id,
              bookId: book.id,
              tenantId: 'default',
              currency: 'MMK',
              balance: 0,
              isActive: true
            }
          });
          console.log(`✅ Created child account: ${accountData.code} - ${accountData.name} (Parent: ${accountData.parentCode})`);
        } else {
          console.log(`❌ Parent account not found for: ${accountData.code} - ${accountData.name} (Parent: ${accountData.parentCode})`);
        }
      } else {
        console.log(`⚠️  Child account already exists: ${accountData.code} - ${accountData.name}`);
      }
    }

    // Create summary by account types
    const accountSummary = await prisma.account.groupBy({
      by: ['type'],
      where: { tenantId: 'default' },
      _count: true
    });

    console.log('\n📊 Comprehensive Chart of Accounts Summary:');
    console.log('===========================================');
    
    // Group by main categories
    const categories = {
      'Assets': ['OTHER_ASSET', 'OTHER_CURRENT_ASSET', 'CASH', 'BANK', 'FIXED_ASSET', 'ACCOUNTS_RECEIVABLE', 'STOCK', 'INPUT_TAX', 'INTANGIBLE_ASSET', 'NON_CURRENT_ASSET', 'DEFERRED_TAX_ASSET'],
      'Liabilities': ['OTHER_CURRENT_LIABILITY', 'CREDIT_CARD', 'NON_CURRENT_LIABILITY', 'OTHER_LIABILITY', 'ACCOUNTS_PAYABLE', 'OUTPUT_TAX', 'DEFERRED_TAX_LIABILITY'],
      'Equity': ['EQUITY'],
      'Income': ['INCOME', 'OTHER_INCOME'],
      'Expenses': ['EXPENSE', 'COST_OF_GOODS_SOLD', 'OTHER_EXPENSE']
    };

    for (const [category, types] of Object.entries(categories)) {
      console.log(`\n${category}:`);
      const categoryCount = accountSummary
        .filter(item => types.includes(item.type))
        .reduce((sum, item) => sum + item._count, 0);
      console.log(`  Total: ${categoryCount} accounts`);
      
      for (const type of types) {
        const typeData = accountSummary.find(item => item.type === type);
        if (typeData) {
          console.log(`  - ${type}: ${typeData._count}`);
        }
      }
    }

    // Show hierarchy levels
    const hierarchyLevels = await prisma.account.groupBy({
      by: ['code'],
      where: { tenantId: 'default' },
      _count: true
    });

    const level1Accounts = hierarchyLevels.filter(acc => acc.code.length === 4).length;
    const level2Accounts = hierarchyLevels.filter(acc => acc.code.length === 4 && acc.code.endsWith('00')).length;
    const level3Accounts = hierarchyLevels.filter(acc => acc.code.length === 4 && !acc.code.endsWith('00')).length;

    console.log('\n📈 Account Hierarchy:');
    console.log(`  Level 1 (Main Categories): ${level2Accounts}`);
    console.log(`  Level 2 (Sub-categories): ${level3Accounts}`);
    console.log(`  Level 3 (Detail Accounts): ${level1Accounts - level2Accounts - level3Accounts}`);

    console.log('\n🎉 Comprehensive chart of accounts seeding completed successfully!');
    console.log(`📊 Total accounts created: ${comprehensiveChartOfAccounts.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding comprehensive chart of accounts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedComprehensiveChartOfAccounts();
