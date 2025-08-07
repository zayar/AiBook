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

async function cleanDatabaseForAccountUpdate() {
  try {
    console.log('🧹 Starting comprehensive database cleanup for account type update...');

    // Delete all transactional data in dependency order
    console.log('📋 Deleting transactional data...');
    
    // Delete entries first (they reference accounts)
    await prisma.entry.deleteMany({
      where: { tenantId: 'default' }
    });
    console.log('✅ Deleted all journal entries');

    // Delete invoice/bill items and related data
    await prisma.invoiceItem.deleteMany({
      where: { tenantId: 'default' }
    });
    await prisma.billItem.deleteMany({
      where: { tenantId: 'default' }
    });
    console.log('✅ Deleted all invoice and bill items');

    // Delete invoices and bills
    await prisma.invoice.deleteMany({
      where: { tenantId: 'default' }
    });
    await prisma.bill.deleteMany({
      where: { tenantId: 'default' }
    });
    console.log('✅ Deleted all invoices and bills');

    // Delete expenses
    await prisma.expense.deleteMany({
      where: { tenantId: 'default' }
    });
    console.log('✅ Deleted all expenses');

    // Delete bank transactions
    await prisma.bankTransaction.deleteMany({
      where: { tenantId: 'default' }
    });
    console.log('✅ Deleted all bank transactions');

    // Delete payment data
    await prisma.paymentReceived.deleteMany({
      where: { tenantId: 'default' }
    });
    await prisma.vendorPayment.deleteMany({
      where: { tenantId: 'default' }
    });
    console.log('✅ Deleted all payment records');

    // Delete COGS and inventory data
    await prisma.cOGSLayerConsumption.deleteMany({
      where: { tenantId: 'default' }
    });
    await prisma.cOGSCalculation.deleteMany({
      where: { tenantId: 'default' }
    });
    await prisma.inventoryCostLayer.deleteMany({
      where: { tenantId: 'default' }
    });
    await prisma.inventoryAdjustment.deleteMany({
      where: { tenantId: 'default' }
    });
    console.log('✅ Deleted all COGS and inventory data');

    // Delete items
    await prisma.inventoryItem.deleteMany({
      where: { tenantId: 'default' }
    });
    console.log('✅ Deleted all inventory items');

    // Delete books (this will cascade delete accounts)
    await prisma.book.deleteMany({
      where: { tenantId: 'default' }
    });
    console.log('✅ Deleted all books and their accounts');

    // Delete customers, vendors, and related master data
    await prisma.customer.deleteMany({
      where: { tenantId: 'default' }
    });
    await prisma.vendor.deleteMany({
      where: { tenantId: 'default' }
    });
    await prisma.salesperson.deleteMany({
      where: { tenantId: 'default' }
    });
    console.log('✅ Deleted all customers, vendors, and salespeople');

    // Delete tax rates
    await prisma.taxRate.deleteMany({
      where: { tenantId: 'default' }
    });
    console.log('✅ Deleted all tax rates');

    // Delete bank accounts and payment methods
    await prisma.bankAccount.deleteMany({
      where: { tenantId: 'default' }
    });
    await prisma.paymentMethod.deleteMany({
      where: { tenantId: 'default' }
    });
    console.log('✅ Deleted all bank accounts and payment methods');

    // Keep only the default tenant
    const tenantCount = await prisma.tenant.count();
    console.log(`📊 Current tenant count: ${tenantCount}`);

    console.log('🎉 Database cleanup completed successfully!');
    console.log('📝 Remaining data:');
    console.log(`   - Tenants: ${await prisma.tenant.count()}`);
    console.log(`   - Books: ${await prisma.book.count()}`);
    console.log(`   - Accounts: ${await prisma.account.count()}`);
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabaseForAccountUpdate();
