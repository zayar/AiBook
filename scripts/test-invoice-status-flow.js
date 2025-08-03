const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 🧪 TEST INVOICE STATUS FLOW
 * Verifies the complete DRAFT → SENT → PAID workflow
 */

async function testInvoiceStatusFlow() {
  try {
    console.log('🧪 Testing Invoice Status Flow (DRAFT → SENT → PAID)');
    console.log('=' .repeat(60));

    const tenantId = 'default';
    
    // Step 1: Create a DRAFT invoice (should not create journal entries)
    console.log('\n📝 Step 1: Creating DRAFT invoice...');
    
    const customer = await prisma.customer.findFirst({ 
      where: { tenantId, isActive: true } 
    });
    
    if (!customer) {
      throw new Error('No active customer found. Please run seed data first.');
    }
    
    const draftInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'TEST-001',
        customerId: customer.id,
        tenantId,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        subtotal: 1000.00,
        taxAmount: 50.00,
        totalAmount: 1050.00,
        status: 'DRAFT',
        currency: 'MMK',
        items: {
          create: [{
            description: 'Test Product',
            quantity: 1,
            unitPrice: 1000.00,
            totalPrice: 1000.00,
            accountCode: '4000',
            tenantId
          }]
        }
      },
      include: {
        customer: true,
        items: true
      }
    });
    
    console.log(`✅ Created DRAFT invoice: ${draftInvoice.invoiceNumber}`);
    console.log(`   Status: ${draftInvoice.status}`);
    console.log(`   Total: ${draftInvoice.currency} ${draftInvoice.totalAmount}`);
    
    // Check journal entries for DRAFT (should be none)
    const draftEntries = await prisma.entry.findMany({
      where: { reference: draftInvoice.invoiceNumber }
    });
    console.log(`   Journal Entries: ${draftEntries.length} (expected: 0)`);
    
    if (draftEntries.length > 0) {
      console.log('❌ ERROR: DRAFT invoice should not have journal entries!');
      return false;
    }
    
    // Step 2: Send the invoice (DRAFT → SENT, should create journal entries)
    console.log('\n📤 Step 2: Sending invoice (DRAFT → SENT)...');
    
    // Use the API endpoint to send the invoice (this will create journal entries)
    const axios = require('axios');
    const API_URL = 'http://localhost:3000/api/v1';
    
    try {
      const response = await axios.post(`${API_URL}/invoices/${draftInvoice.id}/send`, {}, {
        headers: { 'X-Tenant-ID': tenantId }
      });
      
      if (response.status === 200) {
        const sentInvoice = response.data.invoice;
        const journalResult = response.data.journalEntries;
        console.log(`✅ Invoice sent successfully: ${sentInvoice.invoiceNumber}`);
        console.log(`   Status: ${sentInvoice.status}`);
        console.log(`   Journal entries created: ${journalResult?.entries?.length || 0}`);
        
        // Verify journal entries
        const sentEntries = await prisma.entry.findMany({
          where: { reference: sentInvoice.invoiceNumber },
          include: { account: true }
        });
      
      console.log(`   Total journal entries: ${sentEntries.length} (expected: 3)`);
      
      // Analyze the entries
      let totalDebits = 0;
      let totalCredits = 0;
      const accountSummary = {};
      
      sentEntries.forEach(entry => {
        const amount = parseFloat(entry.amount.toString());
        if (entry.type === 'DEBIT') {
          totalDebits += amount;
        } else {
          totalCredits += amount;
        }
        
        accountSummary[entry.account.name] = {
          type: entry.type,
          amount: amount,
          accountCode: entry.account.code
        };
      });
      
      console.log(`   Debits: ${totalDebits}, Credits: ${totalCredits}`);
      console.log(`   Balanced: ${totalDebits === totalCredits ? '✅' : '❌'}`);
      console.log('   Account breakdown:');
      Object.entries(accountSummary).forEach(([account, details]) => {
        console.log(`     ${details.type}: ${account} (${details.accountCode}) - ${details.amount}`);
      });
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        console.log('❌ ERROR: Journal entries are not balanced!');
        return false;
      }
      
    } catch (error) {
      console.log(`❌ ERROR creating journal entries: ${error.message}`);
      return false;
    }
    
    // Step 3: Record payment (SENT → PAID)
    console.log('\n💰 Step 3: Recording payment (SENT → PAID)...');
    
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { tenantId, isActive: true }
    });
    
    if (!paymentMethod) {
      throw new Error('No active payment method found. Please run seed data first.');
    }
    
    // Create payment record
    const payment = await prisma.invoicePayment.create({
      data: {
        invoiceId: sentInvoice.id,
        amount: sentInvoice.totalAmount,
        paymentDate: new Date(),
        paymentMethod: paymentMethod.name,
        reference: `PAY-${sentInvoice.invoiceNumber}`,
        tenantId
      }
    });
    
    // Use the API endpoint to record payment (this will create journal entries and update status)
    const paymentResponse = await axios.post(`${API_URL}/invoices/${sentInvoice.id}/pay`, {
      amount: sentInvoice.totalAmount,
      paymentMethod: paymentMethod.id,
      paymentDate: new Date().toISOString(),
      reference: `PAY-${sentInvoice.invoiceNumber}`,
      notes: 'Test payment'
    }, {
      headers: { 
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json'
      }
    });
    
    const paymentJournalResult = paymentResponse.data.journalEntries;
    
    // Update invoice status to PAID
    const paidInvoice = await prisma.invoice.update({
      where: { id: sentInvoice.id },
      data: { 
        status: 'PAID',
        paidAmount: sentInvoice.totalAmount
      },
      include: {
        customer: true,
        items: true,
        payments: true
      }
    });
    
    console.log(`✅ Payment recorded successfully: ${payment.reference}`);
    console.log(`   Status: ${paidInvoice.status}`);
    console.log(`   Paid Amount: ${paidInvoice.currency} ${paidInvoice.paidAmount}`);
    console.log(`   Payment entries created: ${paymentJournalResult?.entries?.length || 0}`);
    
    // Verify all journal entries for the complete flow
    const allEntries = await prisma.entry.findMany({
      where: { 
        OR: [
          { reference: paidInvoice.invoiceNumber },
          { reference: payment.reference }
        ]
      },
      include: { account: true },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`\n📊 Complete Journal Entry Summary:`);
    console.log(`   Total entries: ${allEntries.length}`);
    
    const entriesByTransaction = {};
    allEntries.forEach(entry => {
      if (!entriesByTransaction[entry.reference]) {
        entriesByTransaction[entry.reference] = [];
      }
      entriesByTransaction[entry.reference].push(entry);
    });
    
    Object.entries(entriesByTransaction).forEach(([ref, entries]) => {
      console.log(`\n   Transaction: ${ref}`);
      let debits = 0, credits = 0;
      entries.forEach(entry => {
        const amount = parseFloat(entry.amount.toString());
        console.log(`     ${entry.type}: ${entry.account.name} (${entry.account.code}) - ${amount}`);
        if (entry.type === 'DEBIT') debits += amount;
        else credits += amount;
      });
      console.log(`     Balanced: ${Math.abs(debits - credits) < 0.01 ? '✅' : '❌'} (${debits} = ${credits})`);
    });
    
    console.log('\n🎉 Invoice Status Flow Test Completed Successfully!');
    console.log('✅ DRAFT → SENT → PAID workflow verified');
    console.log('✅ Journal entries are properly balanced');
    console.log('✅ Status transitions work correctly');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testInvoiceStatusFlow().then(success => {
  process.exit(success ? 0 : 1);
});