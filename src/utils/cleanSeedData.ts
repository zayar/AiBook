import { PrismaClient, AccountType } from '@prisma/client';

const prisma = new PrismaClient();

export async function cleanSeedDatabase() {
  console.log('🧹 Starting clean database seeding...');

  try {
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

    console.log('✅ Created test book');

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

    // Get account IDs for inventory item
    const inventoryAccount = await prisma.account.findFirst({
      where: { code: '1200', tenantId: tenant.id }
    });
    const cogsAccount = await prisma.account.findFirst({
      where: { code: '5000', tenantId: tenant.id }
    });

    // Create one test customer
    const customer = await prisma.customer.create({
      data: {
        name: 'Test Customer',
        email: 'customer@test.com',
        phone: '123-456-7890',
        address: JSON.stringify({
          billing: { attention: '', country: 'US', address1: '123 Test St', address2: '', city: 'Test City', state: 'CA', zipCode: '12345' },
          shipping: { attention: '', country: 'US', address1: '123 Test St', address2: '', city: 'Test City', state: 'CA', zipCode: '12345' }
        }),
        taxId: 'standard',
        paymentTerms: 30,
        creditLimit: 10000,
        isActive: true,
        tenantId: tenant.id
      }
    });

    console.log('✅ Created test customer:', customer.name);

    // Create one test vendor
    const vendor = await prisma.vendor.create({
      data: {
        name: 'Test Vendor',
        email: 'vendor@test.com',
        phone: '098-765-4321',
        billingAddress: JSON.stringify({
          attention: '',
          country: 'US',
          address1: '456 Vendor Ave',
          address2: '',
          city: 'Vendor City',
          state: 'NY',
          zipCode: '54321'
        }),
        taxId: 'vendor-tax-123',
        paymentTerms: 'NET_30',
        isActive: true,
        tenantId: tenant.id
      }
    });

    console.log('✅ Created test vendor:', vendor.name);

    // Create one test inventory item
    if (!inventoryAccount || !cogsAccount) {
      throw new Error('Required accounts not found for inventory item');
    }
    
    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        sku: 'TEST-001',
        name: 'Test Product',
        description: 'A test product for demonstration',
        category: 'Test Category',
        unitOfMeasure: 'each',
        unitCost: 50.00,
        unitPrice: 100.00,
        quantityOnHand: 100,
        reorderLevel: 10,
        reorderQuantity: 50,
        assetAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        isActive: true,
        tenantId: tenant.id
      }
    });

    console.log('✅ Created test inventory item:', inventoryItem.name);

    // Create one test salesperson
    const salesperson = await prisma.salesperson.create({
      data: {
        name: 'Test Salesperson',
        email: 'sales@test.com',
        phone: '555-123-4567',
        commission: 0.1000,
        isActive: true,
        tenantId: tenant.id
      }
    });

    console.log('✅ Created test salesperson:', salesperson.name);

    console.log('🎉 Clean database seeding completed successfully!');
    console.log('📊 Created:');
    console.log('   - 1 Tenant (Test Company)');
    console.log('   - 1 User (Test User)');
    console.log('   - 1 Book (General Ledger)');
    console.log('   - 8 Accounts (minimal chart)');
    console.log('   - 1 Customer (Test Customer)');
    console.log('   - 1 Vendor (Test Vendor)');
    console.log('   - 1 Inventory Item (Test Product)');
    console.log('   - 1 Salesperson (Test Salesperson)');

  } catch (error) {
    console.error('❌ Error during clean seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  cleanSeedDatabase()
    .then(() => {
      console.log('✅ Clean seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Clean seeding failed:', error);
      process.exit(1);
    });
} 