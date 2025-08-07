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

// New Chart of Accounts with sub-types
const chartOfAccounts = [
  // ASSET ACCOUNTS
  { code: '1000', name: 'Cash on Hand', type: 'CASH', description: 'Physical cash in office' },
  { code: '1010', name: 'Petty Cash', type: 'CASH', description: 'Small cash fund for minor expenses' },
  { code: '1100', name: 'Checking Account', type: 'BANK', description: 'Main business checking account' },
  { code: '1110', name: 'Savings Account', type: 'BANK', description: 'Business savings account' },
  { code: '1200', name: 'Accounts Receivable', type: 'ACCOUNTS_RECEIVABLE', description: 'Amounts owed by customers' },
  { code: '1300', name: 'Inventory', type: 'STOCK', description: 'Goods for sale' },
  { code: '1400', name: 'Prepaid Expenses', type: 'OTHER_CURRENT_ASSET', description: 'Expenses paid in advance' },
  { code: '1500', name: 'Office Equipment', type: 'FIXED_ASSET', description: 'Computers, furniture, etc.' },
  { code: '1510', name: 'Vehicles', type: 'FIXED_ASSET', description: 'Company vehicles' },
  { code: '1600', name: 'Accumulated Depreciation', type: 'FIXED_ASSET', description: 'Depreciation of fixed assets' },
  { code: '1700', name: 'Input Tax', type: 'INPUT_TAX', description: 'VAT paid on purchases' },
  { code: '1800', name: 'Other Current Assets', type: 'OTHER_CURRENT_ASSET', description: 'Other short-term assets' },

  // LIABILITY ACCOUNTS
  { code: '2000', name: 'Accounts Payable', type: 'ACCOUNTS_PAYABLE', description: 'Amounts owed to suppliers' },
  { code: '2100', name: 'Credit Card Payable', type: 'CREDIT_CARD', description: 'Credit card balances' },
  { code: '2200', name: 'Accrued Expenses', type: 'OTHER_CURRENT_LIABILITY', description: 'Expenses incurred but not yet paid' },
  { code: '2300', name: 'Output Tax', type: 'OUTPUT_TAX', description: 'VAT collected on sales' },
  { code: '2400', name: 'Payroll Liabilities', type: 'OTHER_CURRENT_LIABILITY', description: 'Employee taxes and benefits' },
  { code: '2500', name: 'Long-term Debt', type: 'NON_CURRENT_LIABILITY', description: 'Long-term loans and mortgages' },

  // EQUITY ACCOUNTS
  { code: '3000', name: 'Owner\'s Equity', type: 'EQUITY', description: 'Owner\'s investment in business' },
  { code: '3100', name: 'Retained Earnings', type: 'EQUITY', description: 'Accumulated profits' },

  // INCOME ACCOUNTS
  { code: '4000', name: 'Sales Revenue', type: 'INCOME', description: 'Revenue from product sales' },
  { code: '4100', name: 'Service Revenue', type: 'INCOME', description: 'Revenue from services' },
  { code: '4200', name: 'Interest Income', type: 'OTHER_INCOME', description: 'Interest earned on investments' },
  { code: '4300', name: 'Other Income', type: 'OTHER_INCOME', description: 'Miscellaneous income' },

  // EXPENSE ACCOUNTS
  { code: '5000', name: 'Cost of Goods Sold', type: 'COST_OF_GOODS_SOLD', description: 'Direct cost of products sold' },
  { code: '6000', name: 'Office Expenses', type: 'EXPENSE', description: 'General office expenses' },
  { code: '6100', name: 'Rent Expense', type: 'EXPENSE', description: 'Office rent payments' },
  { code: '6200', name: 'Utilities Expense', type: 'EXPENSE', description: 'Electricity, water, internet' },
  { code: '6300', name: 'Salary Expense', type: 'EXPENSE', description: 'Employee salaries' },
  { code: '6400', name: 'Marketing Expense', type: 'EXPENSE', description: 'Advertising and marketing costs' },
  { code: '6500', name: 'Travel Expense', type: 'EXPENSE', description: 'Business travel costs' },
  { code: '6600', name: 'Professional Fees', type: 'EXPENSE', description: 'Legal, accounting, consulting fees' },
  { code: '6700', name: 'Insurance Expense', type: 'EXPENSE', description: 'Business insurance premiums' },
  { code: '6800', name: 'Depreciation Expense', type: 'EXPENSE', description: 'Depreciation of assets' },
  { code: '6900', name: 'Bank Charges', type: 'OTHER_EXPENSE', description: 'Bank fees and charges' },
  { code: '7000', name: 'Interest Expense', type: 'OTHER_EXPENSE', description: 'Interest on loans and debt' },
];

async function seedNewChartOfAccounts() {
  try {
    console.log('🌱 Starting to seed new chart of accounts...');

    // Create default tenant if it doesn't exist
    let tenant = await prisma.tenant.findUnique({
      where: { id: 'default' }
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          id: 'default',
          name: 'Default Organization',
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

    // Create accounts
    console.log('📊 Creating chart of accounts...');
    
    for (const accountData of chartOfAccounts) {
      const existingAccount = await prisma.account.findFirst({
        where: {
          code: accountData.code,
          tenantId: 'default'
        }
      });

      if (!existingAccount) {
        await prisma.account.create({
          data: {
            ...accountData,
            bookId: book.id,
            tenantId: 'default',
            currency: 'MMK',
            balance: 0,
            isActive: true
          }
        });
        console.log(`✅ Created account: ${accountData.code} - ${accountData.name} (${accountData.type})`);
      } else {
        console.log(`⚠️  Account already exists: ${accountData.code} - ${accountData.name}`);
      }
    }

    // Create summary by account types
    const accountSummary = await prisma.account.groupBy({
      by: ['type'],
      where: { tenantId: 'default' },
      _count: true
    });

    console.log('\n📊 Chart of Accounts Summary:');
    console.log('================================');
    
    // Group by main categories
    const categories = {
      'Assets': ['CASH', 'BANK', 'ACCOUNTS_RECEIVABLE', 'STOCK', 'FIXED_ASSET', 'OTHER_CURRENT_ASSET', 'INPUT_TAX', 'NON_CURRENT_ASSET', 'OTHER_ASSET'],
      'Liabilities': ['ACCOUNTS_PAYABLE', 'CREDIT_CARD', 'OTHER_CURRENT_LIABILITY', 'OUTPUT_TAX', 'NON_CURRENT_LIABILITY', 'OTHER_LIABILITY'],
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

    console.log('\n🎉 Chart of accounts seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding chart of accounts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedNewChartOfAccounts();
