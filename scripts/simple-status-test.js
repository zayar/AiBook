const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

/**
 * 🧪 SIMPLE INVOICE STATUS TEST
 * Tests DRAFT → SENT transition and journal entry creation
 */

async function testInvoiceStatus() {
  try {
    console.log('🧪 Testing Invoice Status: DRAFT → SENT');
    console.log('=' .repeat(50));

    const tenantId = 'default';
    const API_URL = 'http://localhost:3000/api/v1';
    
    // Step 1: Create a test customer if needed
    const customer = await prisma.customer.findFirst({ 
      where: { tenantId, isActive: true } 
    });
    
    if (!customer) {
      console.log('❌ No customer found. Please run seed data first.');
      return false;
    }
    
    // Step 2: Create DRAFT invoice via API
    console.log('\n📝 Creating DRAFT invoice...');
    
    const invoiceData = {
      customerId: customer.id,
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      currency: 'MMK',
      items: [{
        description: 'Test Product',
        quantity: 1,
        unitPrice: 1000,
        accountCode: '4000'
      }]
    };
    
    const createResponse = await axios.post(`${API_URL}/invoices`, invoiceData, {
      headers: { 
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json'
      }
    });
    
    const draftInvoice = createResponse.data.invoice;
    console.log(`✅ Created invoice: ${draftInvoice.invoiceNumber}`);
    console.log(`   Status: ${draftInvoice.status}`);
    console.log(`   Total: ${draftInvoice.currency} ${draftInvoice.totalAmount}`);
    
    // Verify no journal entries exist for DRAFT
    const draftEntries = await prisma.entry.findMany({
      where: { reference: draftInvoice.invoiceNumber }
    });
    console.log(`   Journal Entries: ${draftEntries.length} (expected: 0)`);
    
    if (draftEntries.length > 0) {
      console.log('❌ ERROR: DRAFT invoice should not have journal entries!');
      return false;
    }
    
    // Step 3: Send the invoice (DRAFT → SENT)
    console.log('\n📤 Sending invoice...');
    
    const sendResponse = await axios.post(`${API_URL}/invoices/${draftInvoice.id}/send`, {}, {
      headers: { 'X-Tenant-ID': tenantId }
    });
    
    if (sendResponse.status === 200) {
      const sentInvoice = sendResponse.data.invoice;
      console.log(`✅ Invoice sent: ${sentInvoice.invoiceNumber}`);
      console.log(`   Status: ${sentInvoice.status}`);
      
      // Verify journal entries were created
      const sentEntries = await prisma.entry.findMany({
        where: { reference: sentInvoice.invoiceNumber },
        include: { account: true }
      });
      
      console.log(`   Journal Entries: ${sentEntries.length} (expected: 2-3)`);
      
      if (sentEntries.length === 0) {
        console.log('❌ ERROR: SENT invoice should have journal entries!');
        return false;
      }
      
      // Check balance
      let totalDebits = 0;
      let totalCredits = 0;
      
      console.log('   Entry Details:');
      sentEntries.forEach(entry => {
        const amount = parseFloat(entry.amount.toString());
        console.log(`     ${entry.type}: ${entry.account.name} (${entry.account.code}) - ${amount}`);
        
        if (entry.type === 'DEBIT') {
          totalDebits += amount;
        } else {
          totalCredits += amount;
        }
      });
      
      console.log(`   Totals: Debits ${totalDebits}, Credits ${totalCredits}`);
      console.log(`   Balanced: ${Math.abs(totalDebits - totalCredits) < 0.01 ? '✅' : '❌'}`);
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        console.log('❌ ERROR: Journal entries are not balanced!');
        return false;
      }
      
      console.log('\n🎉 Test Passed!');
      console.log('✅ DRAFT invoice created without journal entries');
      console.log('✅ SENT invoice created proper journal entries');
      console.log('✅ Journal entries are balanced');
      
      return true;
    } else {
      console.log(`❌ Failed to send invoice: ${sendResponse.status}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testInvoiceStatus().then(success => {
  process.exit(success ? 0 : 1);
});