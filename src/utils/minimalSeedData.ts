import { PrismaClient, AccountType } from '@prisma/client';

const prisma = new PrismaClient();

export async function minimalSeedDatabase() {
  console.log('🧹 Starting minimal database seeding...');

  try {
    // Clear existing data
    await prisma.entry.deleteMany();
    await prisma.account.deleteMany();
    await prisma.book.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();

    // Create single test tenant
    const tenant = await prisma.tenant.create({
      data: {
        id: 'default',
        name: 'Test Company',
        domain: 'test.aibook.com',
        settings: {
          currency: 'USD',
          timeZone: 'America/New_York',
          fiscalYearEnd: '12-31'
        }
      }
    });

    console.log('✅ Created test tenant:', tenant.name);

    // Create test user
    const user = await prisma.user.create({
      data: {
        firebaseUid: 'test-user-123',
        email: 'test@aibook.com',
        name: 'Test User',
        role: 'ADMIN',
        tenantId: tenant.id
      }
    });

    console.log('✅ Created test user:', user.name);

    // Create test book
    const book = await prisma.book.create({
      data: {
        name: 'General Ledger',
        currency: 'USD',
        tenantId: tenant.id
      }
    });

    console.log('✅ Created test book:', book.name);

    // Create minimal chart of accounts
    const accounts = [
      // Assets
      { code: '1000', name: 'Cash', type: AccountType.ASSET, isActive: true, description: 'Cash and cash equivalents' },
      { code: '1100', name: 'Accounts Receivable', type: AccountType.ASSET, isActive: true, description: 'Money owed by customers' },
      { code: '1200', name: 'Inventory', type: AccountType.ASSET, isActive: true, description: 'Products for resale' },
      
      // Liabilities
      { code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY, isActive: true, description: 'Money owed to suppliers' },
      
      // Equity
      { code: '3000', name: 'Owner Equity', type: AccountType.EQUITY, isActive: true, description: 'Owner investment and retained earnings' },
      
      // Revenue
      { code: '4000', name: 'Sales Revenue', type: AccountType.REVENUE, isActive: true, description: 'Revenue from product sales' },
      { code: '4100', name: 'Service Revenue', type: AccountType.REVENUE, isActive: true, description: 'Revenue from services' },
      
      // Expenses
      { code: '5000', name: 'Cost of Goods Sold', type: AccountType.EXPENSE, isActive: true, description: 'Direct costs of products sold' },
      { code: '6000', name: 'Office Expenses', type: AccountType.EXPENSE, isActive: true, description: 'General office operating expenses' }
    ];

    for (const accountData of accounts) {
      await prisma.account.create({
        data: {
          ...accountData,
          bookId: book.id,
          tenantId: tenant.id
        }
      });
    }

    console.log('✅ Created minimal chart of accounts');

    console.log('🎉 Minimal database seeding completed successfully!');
    console.log(`📊 Created ${accounts.length} accounts with NO journal entries`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  minimalSeedDatabase()
    .then(() => {
      console.log('✅ Minimal seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Minimal seeding failed:', error);
      process.exit(1);
    });
} 