const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Clean Test Data Script
 * Removes all data except tenants table for fresh testing
 */
async function cleanTestData() {
  console.log('🧹 Starting test data cleanup...');
  
  try {
    // Clean up in order to respect foreign key constraints
    console.log('🗑️ Cleaning AI and business data...');
    try { await prisma.businessInsight.deleteMany({}); } catch(e) { console.log('- businessInsight table not found or empty'); }
    try { await prisma.financialKPI.deleteMany({}); } catch(e) { console.log('- financialKPI table not found or empty'); }
    try { await prisma.aIModelPerformance.deleteMany({}); } catch(e) { console.log('- aIModelPerformance table not found or empty'); }
    try { await prisma.businessContext.deleteMany({}); } catch(e) { console.log('- businessContext table not found or empty'); }
    
    console.log('🗑️ Cleaning conversation history...');
    try { await prisma.conversationHistory.deleteMany({}); } catch(e) { console.log('- conversationHistory table not found or empty'); }
    
    console.log('🗑️ Cleaning AI insights...');
    try { await prisma.aIInsight.deleteMany({}); } catch(e) { console.log('- aIInsight table not found or empty'); }
    try { await prisma.businessPattern.deleteMany({}); } catch(e) { console.log('- businessPattern table not found or empty'); }
    try { await prisma.aIModel.deleteMany({}); } catch(e) { console.log('- aIModel table not found or empty'); }
    try { await prisma.predictionCache.deleteMany({}); } catch(e) { console.log('- predictionCache table not found or empty'); }
    
    console.log('🗑️ Cleaning financial transactions...');
    try { await prisma.entry.deleteMany({}); } catch(e) { console.log('- entries table not found or empty'); }
    try { await prisma.invoiceItem.deleteMany({}); } catch(e) { console.log('- invoiceItem table not found or empty'); }
    try { await prisma.invoicePayment.deleteMany({}); } catch(e) { console.log('- invoicePayment table not found or empty'); }
    try { await prisma.invoice.deleteMany({}); } catch(e) { console.log('- invoice table not found or empty'); }
    
    console.log('🗑️ Cleaning expenses and bills...');
    try { await prisma.expense.deleteMany({}); } catch(e) { console.log('- expense table not found or empty'); }
    try { await prisma.billItem.deleteMany({}); } catch(e) { console.log('- billItem table not found or empty'); }
    try { await prisma.billPayment.deleteMany({}); } catch(e) { console.log('- billPayment table not found or empty'); }
    try { await prisma.bill.deleteMany({}); } catch(e) { console.log('- bill table not found or empty'); }
    
    console.log('🗑️ Cleaning payments...');
    try { await prisma.paymentReceived.deleteMany({}); } catch(e) { console.log('- paymentReceived table not found or empty'); }
    try { await prisma.vendorPayment.deleteMany({}); } catch(e) { console.log('- vendorPayment table not found or empty'); }
    
    console.log('🗑️ Cleaning sales and purchases...');
    try { await prisma.salesOrderItem.deleteMany({}); } catch(e) { console.log('- salesOrderItem table not found or empty'); }
    try { await prisma.salesOrder.deleteMany({}); } catch(e) { console.log('- salesOrder table not found or empty'); }
    try { await prisma.purchaseItem.deleteMany({}); } catch(e) { console.log('- purchaseItem table not found or empty'); }
    try { await prisma.purchase.deleteMany({}); } catch(e) { console.log('- purchase table not found or empty'); }
    
    console.log('🗑️ Cleaning inventory...');
    try { await prisma.cogsLayerConsumption.deleteMany({}); } catch(e) { console.log('- cogsLayerConsumption table not found or empty'); }
    try { await prisma.cogsCalculation.deleteMany({}); } catch(e) { console.log('- cogsCalculation table not found or empty'); }
    try { await prisma.inventoryCostLayer.deleteMany({}); } catch(e) { console.log('- inventoryCostLayer table not found or empty'); }
    try { await prisma.inventoryAdjustment.deleteMany({}); } catch(e) { console.log('- inventoryAdjustment table not found or empty'); }
    try { await prisma.inventoryItem.deleteMany({}); } catch(e) { console.log('- inventoryItem table not found or empty'); }
    
    console.log('🗑️ Cleaning banking data...');
    try { await prisma.transactionMatch.deleteMany({}); } catch(e) { console.log('- transactionMatch table not found or empty'); }
    try { await prisma.bankStatementTransaction.deleteMany({}); } catch(e) { console.log('- bankStatementTransaction table not found or empty'); }
    try { await prisma.bankStatement.deleteMany({}); } catch(e) { console.log('- bankStatement table not found or empty'); }
    try { await prisma.bankReconciliation.deleteMany({}); } catch(e) { console.log('- bankReconciliation table not found or empty'); }
    try { await prisma.bankTransaction.deleteMany({}); } catch(e) { console.log('- bankTransaction table not found or empty'); }
    try { await prisma.reconciliation.deleteMany({}); } catch(e) { console.log('- reconciliation table not found or empty'); }
    try { await prisma.bankAccount.deleteMany({}); } catch(e) { console.log('- bankAccount table not found or empty'); }
    
    console.log('🗑️ Cleaning accounts and books...');
    try { await prisma.account.deleteMany({}); } catch(e) { console.log('- account table not found or empty'); }
    try { await prisma.book.deleteMany({}); } catch(e) { console.log('- book table not found or empty'); }
    
    console.log('🗑️ Cleaning entities...');
    try { await prisma.customer.deleteMany({}); } catch(e) { console.log('- customer table not found or empty'); }
    try { await prisma.vendorContactPerson.deleteMany({}); } catch(e) { console.log('- vendorContactPerson table not found or empty'); }
    try { await prisma.vendorDocument.deleteMany({}); } catch(e) { console.log('- vendorDocument table not found or empty'); }
    try { await prisma.vendor.deleteMany({}); } catch(e) { console.log('- vendor table not found or empty'); }
    try { await prisma.salesperson.deleteMany({}); } catch(e) { console.log('- salesperson table not found or empty'); }
    
    console.log('🗑️ Cleaning tax and payment methods...');
    try { await prisma.taxCalculation.deleteMany({}); } catch(e) { console.log('- taxCalculation table not found or empty'); }
    try { await prisma.taxRate.deleteMany({}); } catch(e) { console.log('- taxRate table not found or empty'); }
    try { await prisma.paymentMethod.deleteMany({}); } catch(e) { console.log('- paymentMethod table not found or empty'); }
    
    console.log('🗑️ Cleaning audit logs...');
    try { await prisma.criticalActionLog.deleteMany({}); } catch(e) { console.log('- criticalActionLog table not found or empty'); }
    try { await prisma.financialAuditTrail.deleteMany({}); } catch(e) { console.log('- financialAuditTrail table not found or empty'); }
    try { await prisma.auditLog.deleteMany({}); } catch(e) { console.log('- auditLog table not found or empty'); }
    
    console.log('🗑️ Cleaning transaction categories...');
    try { await prisma.transactionCategory.deleteMany({}); } catch(e) { console.log('- transactionCategory table not found or empty'); }
    
    // Keep tenants table as requested
    const tenantCount = await prisma.tenant.count();
    console.log(`✅ Cleanup completed! Preserved ${tenantCount} tenants.`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run cleanup if this file is executed directly
if (require.main === module) {
  cleanTestData()
    .then(() => {
      console.log('🎉 Test data cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanTestData };