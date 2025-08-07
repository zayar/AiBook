 import { PrismaClient, AccountType, EntryType } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clear existing data
    await prisma.entry.deleteMany();
    await prisma.account.deleteMany();
    await prisma.book.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();

    // Create default tenant
    const tenant = await prisma.tenant.create({
      data: {
        id: 'default',
        name: 'AiBook Demo Company',
        domain: 'demo.aibook.com',
        settings: {
          currency: 'USD',
          timeZone: 'America/New_York',
          fiscalYearEnd: '12-31'
        }
      }
    });

    // Create default user
    const user = await prisma.user.create({
      data: {
        firebaseUid: 'dev-user-123',
        email: 'dev@aibook.com',
        name: 'Development User',
        role: 'ADMIN',
        tenantId: tenant.id
      }
    });

    // Create default book
    const book = await prisma.book.create({
      data: {
        name: 'General Ledger',
        currency: 'USD',
        tenantId: tenant.id
      }
    });

    console.log('✅ Created tenant, user, and book');

    // Create chart of accounts
    const accounts = [
      // Assets
      { code: '1000', name: 'Cash', type: AccountType.CASH, isActive: true, description: 'Cash and cash equivalents' },
      { code: '1100', name: 'Accounts Receivable', type: AccountType.ACCOUNTS_RECEIVABLE, isActive: true, description: 'Money owed by customers' },
      { code: '1200', name: 'Inventory', type: AccountType.STOCK, isActive: true, description: 'Products for resale' },
      { code: '1300', name: 'Equipment', type: AccountType.FIXED_ASSET, isActive: true, description: 'Office equipment and furniture' },
      
      // Liabilities
      { code: '2000', name: 'Accounts Payable', type: AccountType.ACCOUNTS_PAYABLE, isActive: true, description: 'Money owed to suppliers' },
      { code: '2100', name: 'Accrued Expenses', type: AccountType.OTHER_CURRENT_LIABILITY, isActive: true, description: 'Expenses incurred but not yet paid' },
      { code: '2200', name: 'Short-term Loans', type: AccountType.OTHER_CURRENT_LIABILITY, isActive: true, description: 'Loans due within one year' },
      
      // Equity
      { code: '3000', name: 'Owner Equity', type: AccountType.EQUITY, isActive: true, description: 'Owner investment and retained earnings' },
      { code: '3100', name: 'Retained Earnings', type: AccountType.EQUITY, isActive: true, description: 'Accumulated profits' },
      
      // Revenue
      { code: '4000', name: 'Sales Revenue', type: AccountType.INCOME, isActive: true, description: 'Revenue from product sales' },
      { code: '4100', name: 'Service Revenue', type: AccountType.INCOME, isActive: true, description: 'Revenue from services' },
      { code: '4200', name: 'Other Income', type: AccountType.OTHER_INCOME, isActive: true, description: 'Miscellaneous income' },
      
      // Expenses
      { code: '5000', name: 'Cost of Goods Sold', type: AccountType.COST_OF_GOODS_SOLD, isActive: true, description: 'Direct costs of products sold' },
      { code: '6000', name: 'Office Expenses', type: AccountType.EXPENSE, isActive: true, description: 'General office operating expenses' },
      { code: '6100', name: 'Marketing Expenses', type: AccountType.EXPENSE, isActive: true, description: 'Marketing and advertising costs' },
      { code: '6200', name: 'Travel Expenses', type: AccountType.EXPENSE, isActive: true, description: 'Business travel costs' },
      { code: '6300', name: 'Software Subscriptions', type: AccountType.EXPENSE, isActive: true, description: 'Software and SaaS expenses' },
      { code: '6400', name: 'Professional Services', type: AccountType.EXPENSE, isActive: true, description: 'Legal, accounting, consulting fees' }
    ];

    const createdAccounts = [];
    for (const accountData of accounts) {
      const account = await prisma.account.create({
        data: {
          ...accountData,
          bookId: book.id,
          tenantId: tenant.id
        }
      });
      createdAccounts.push(account);
    }

    console.log('✅ Created chart of accounts');

    // Create sample journal entries for the current month
    const currentDate = new Date();
    const entries = [
      {
        journalId: 'JE-001',
        reference: 'Opening Balance',
        description: 'Opening balances for demo data',
                 lines: [
           { accountCode: '1000', type: EntryType.DEBIT, amount: 50000, description: 'Cash opening balance' },
           { accountCode: '3000', type: EntryType.CREDIT, amount: 50000, description: 'Owner equity opening balance' }
        ]
      },
      {
        journalId: 'JE-002',
        reference: 'SVC-001',
        description: 'Service to Customer A',
        lines: [
          { accountCode: '1100', type: EntryType.DEBIT, amount: 15000, description: 'Invoice for services' },
          { accountCode: '4100', type: EntryType.CREDIT, amount: 15000, description: 'Service revenue' }
        ]
      },
      {
        journalId: 'JE-003',
        reference: 'BILL-001',
        description: 'Office supplies purchase',
        lines: [
          { accountCode: '6000', type: EntryType.DEBIT, amount: 2500, description: 'Office supplies' },
          { accountCode: '2000', type: EntryType.CREDIT, amount: 2500, description: 'Accounts payable' }
        ]
      },
      {
        journalId: 'JE-004',
        reference: 'PAY-001',
        description: 'Payment received from Customer A',
        lines: [
          { accountCode: '1000', type: EntryType.DEBIT, amount: 15000, description: 'Cash received' },
          { accountCode: '1100', type: EntryType.CREDIT, amount: 15000, description: 'Payment of service invoice' }
        ]
      },
      {
        journalId: 'JE-005',
        reference: 'EXP-001',
        description: 'Marketing campaign expense',
        lines: [
          { accountCode: '6100', type: EntryType.DEBIT, amount: 5000, description: 'Digital marketing campaign' },
          { accountCode: '1000', type: EntryType.CREDIT, amount: 5000, description: 'Cash payment' }
        ]
      }
    ];

    for (const entryData of entries) {
      for (const line of entryData.lines) {
        const account = createdAccounts.find(acc => acc.code === line.accountCode);
        if (account) {
          await prisma.entry.create({
            data: {
              bookId: book.id,
              accountId: account.id,
              type: line.type,
              amount: line.amount,
              memo: line.description,
              reference: entryData.reference,
              journalId: entryData.journalId,
              postedAt: new Date(currentDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
              tenantId: tenant.id
            }
          });
        }
      }
    }

    console.log('✅ Created sample journal entries');

    console.log('🎉 Database seeding completed successfully!');
    console.log(`📊 Created ${accounts.length} accounts and ${entries.length} journal entries`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
} 