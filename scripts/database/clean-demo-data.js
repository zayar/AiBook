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

async function cleanDemoData() {
  try {
    console.log('🧹 Starting database cleanup...');

    // Delete all journal entries (this will cascade and remove most transactional data)
    console.log('⭐ Deleting all journal entries and related transactions...');
    
    // First delete all entries
    const deletedEntries = await prisma.entry.deleteMany({
      where: {
        tenantId: 'default'
      }
    });
    console.log(`✅ Deleted ${deletedEntries.count} journal entries`);

    // Delete invoices and related data
    console.log('📄 Deleting invoices and related data...');
    await prisma.invoicePayment.deleteMany({ where: { tenantId: 'default' } });
    await prisma.invoiceItem.deleteMany({ where: { tenantId: 'default' } });
    const deletedInvoices = await prisma.invoice.deleteMany({ where: { tenantId: 'default' } });
    console.log(`✅ Deleted ${deletedInvoices.count} invoices`);

    // Delete bills and related data
    console.log('📋 Deleting bills and related data...');
    await prisma.billPayment.deleteMany({ where: { tenantId: 'default' } });
    await prisma.billItem.deleteMany({ where: { tenantId: 'default' } });
    const deletedBills = await prisma.bill.deleteMany({ where: { tenantId: 'default' } });
    console.log(`✅ Deleted ${deletedBills.count} bills`);

    // Delete expenses
    console.log('💰 Deleting expenses...');
    const deletedExpenses = await prisma.expense.deleteMany({ where: { tenantId: 'default' } });
    console.log(`✅ Deleted ${deletedExpenses.count} expenses`);

    // Delete payments received
    console.log('💳 Deleting payments received...');
    const deletedPaymentsReceived = await prisma.paymentReceived.deleteMany({ where: { tenantId: 'default' } });
    console.log(`✅ Deleted ${deletedPaymentsReceived.count} payments received`);

    // Delete vendor payments
    console.log('💸 Deleting vendor payments...');
    const deletedVendorPayments = await prisma.vendorPayment.deleteMany({ where: { tenantId: 'default' } });
    console.log(`✅ Deleted ${deletedVendorPayments.count} vendor payments`);

    // Delete bank transactions
    console.log('🏦 Deleting bank transactions...');
    const deletedBankTransactions = await prisma.bankTransaction.deleteMany({ where: { tenantId: 'default' } });
    console.log(`✅ Deleted ${deletedBankTransactions.count} bank transactions`);

    // Delete inventory adjustments and COGS data
    console.log('📦 Deleting inventory data...');
    await prisma.cOGSLayerConsumption.deleteMany({ where: { tenantId: 'default' } });
    await prisma.cOGSCalculation.deleteMany({ where: { tenantId: 'default' } });
    await prisma.inventoryCostLayer.deleteMany({ where: { tenantId: 'default' } });
    await prisma.inventoryAdjustment.deleteMany({ where: { tenantId: 'default' } });

    // Delete sales orders and purchase orders
    console.log('📊 Deleting sales and purchase orders...');
    await prisma.salesOrderItem.deleteMany({ where: { tenantId: 'default' } });
    await prisma.salesOrder.deleteMany({ where: { tenantId: 'default' } });
    await prisma.purchaseItem.deleteMany({ where: { tenantId: 'default' } });
    await prisma.purchase.deleteMany({ where: { tenantId: 'default' } });

    // Delete customers, vendors, salespeople (but keep some for testing if needed)
    console.log('👥 Deleting customers, vendors, and salespeople...');
    const deletedCustomers = await prisma.customer.deleteMany({ where: { tenantId: 'default' } });
    const deletedVendors = await prisma.vendor.deleteMany({ where: { tenantId: 'default' } });
    const deletedSalespeople = await prisma.salesperson.deleteMany({ where: { tenantId: 'default' } });
    console.log(`✅ Deleted ${deletedCustomers.count} customers, ${deletedVendors.count} vendors, ${deletedSalespeople.count} salespeople`);

    // Reset account balances to zero
    console.log('💰 Resetting all account balances to zero...');
    const updatedAccounts = await prisma.account.updateMany({
      where: { tenantId: 'default' },
      data: { balance: 0 }
    });
    console.log(`✅ Reset ${updatedAccounts.count} account balances`);

    // Delete any AI insights and patterns (only if they exist)
    console.log('🤖 Deleting AI data...');
    try {
      await prisma.aIInsight.deleteMany({ where: { tenantId: 'default' } });
    } catch (e) { console.log('No AI insights to delete'); }
    
    try {
      await prisma.businessPattern.deleteMany({ where: { tenantId: 'default' } });
    } catch (e) { console.log('No business patterns to delete'); }
    
    try {
      await prisma.conversationHistory.deleteMany({ where: { tenantId: 'default' } });
    } catch (e) { console.log('No conversation history to delete'); }

    // Keep the tenant, book, and chart of accounts structure
    console.log('📋 Summary of what was preserved:');
    const finalStats = await prisma.tenant.findUnique({
      where: { id: 'default' },
      include: {
        books: true,
        accounts: true,
        _count: {
          select: {
            entries: true,
            invoices: true,
            bills: true,
            expenses: true,
            customers: true,
            vendors: true,
            salespeople: true
          }
        }
      }
    });

    console.log(`✅ Tenant: ${finalStats.name}`);
    console.log(`✅ Books: ${finalStats.books.length}`);
    console.log(`✅ Accounts: ${finalStats.accounts.length}`);
    console.log(`✅ Entries: ${finalStats._count.entries}`);
    console.log(`✅ Invoices: ${finalStats._count.invoices}`);
    console.log(`✅ Bills: ${finalStats._count.bills}`);
    console.log(`✅ Expenses: ${finalStats._count.expenses}`);
    console.log(`✅ Customers: ${finalStats._count.customers}`);
    console.log(`✅ Vendors: ${finalStats._count.vendors}`);
    console.log(`✅ Salespeople: ${finalStats._count.salespeople}`);

    console.log('🎉 Database cleanup completed successfully!');
    console.log('📊 You now have a clean tenant with chart of accounts but no transactional data.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanDemoData()
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
