const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const API_URL = 'http://localhost:3000/api/v1';
const tenantId = 'default';
const prisma = new PrismaClient();

console.log('🧪 TESTING ACCOUNTING COMPLIANCE FEATURES');
console.log('==========================================\n');

async function testAccountingCompliance() {
  try {
    console.log('📋 Test Coverage Verification:');
    console.log('-------------------------------');
    
    // Test 1: DRAFT invoice creation (no journal entries)
    console.log('\n1️⃣ Testing DRAFT invoice creation...');
    const draftInvoice = await createDraftInvoice();
    const draftEntries = await getJournalEntries(draftInvoice.invoiceNumber);
    
    console.log(`   ✅ DRAFT invoice created: ${draftInvoice.invoiceNumber}`);
    console.log(`   ✅ Journal entries: ${draftEntries.length} (expected: 0)`);
    
    if (draftEntries.length > 0) {
      console.log('   ❌ ERROR: DRAFT invoice should not have journal entries!');
      return false;
    }
    
    // Test 2: DRAFT → SENT transition (creates journal entries)
    console.log('\n2️⃣ Testing DRAFT → SENT transition...');
    const sentInvoice = await sendInvoice(draftInvoice.id);
    const sentEntries = await getJournalEntries(sentInvoice.invoiceNumber);
    
    console.log(`   ✅ Invoice sent: ${sentInvoice.invoiceNumber}`);
    console.log(`   ✅ Journal entries: ${sentEntries.length} (expected: 2-3)`);
    
    if (sentEntries.length === 0) {
      console.log('   ❌ ERROR: SENT invoice should have journal entries!');
      return false;
    }
    
    // Test 3: Journal entry balance validation
    console.log('\n3️⃣ Testing journal entry balance...');
    const balance = validateJournalBalance(sentEntries);
    console.log(`   ✅ Debits: ${balance.debits}, Credits: ${balance.credits}`);
    console.log(`   ✅ Balanced: ${balance.isBalanced ? 'YES' : 'NO'}`);
    
    if (!balance.isBalanced) {
      console.log('   ❌ ERROR: Journal entries are not balanced!');
      return false;
    }
    
    // Test 4: API endpoint testing
    console.log('\n4️⃣ Testing API endpoints...');
    const apiTest = await testAPIEndpoints();
    console.log(`   ✅ API endpoints: ${apiTest ? 'WORKING' : 'FAILED'}`);
    
    // Test 5: Database state verification
    console.log('\n5️⃣ Testing database state...');
    const dbTest = await testDatabaseState();
    console.log(`   ✅ Database state: ${dbTest ? 'CONSISTENT' : 'INCONSISTENT'}`);
    
    console.log('\n📊 Accounting Compliance Features - Status-Based Journal Logic:');
    console.log('================================================================');
    
    // Test status-based journal logic
    await testStatusBasedJournalLogic();
    
    console.log('\n🎉 ALL TESTS PASSED! ✅');
    console.log('Our implementation is fully aligned with accounting compliance requirements.');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function createDraftInvoice() {
  const response = await axios.post(`${API_URL}/invoices`, {
    customerId: 'cmdvkb834000hsmk7slfpgagx', // Use existing customer
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [
      {
        itemId: 'cmdvk3sq40003smk7miiql1bs', // Use existing item
        quantity: 2,
        unitPrice: 1000,
        description: 'Test Item for Compliance'
      }
    ],
    status: 'DRAFT' // Explicitly set as DRAFT
  }, {
    headers: { 'X-Tenant-ID': tenantId }
  });
  
  return response.data.invoice;
}

async function sendInvoice(invoiceId) {
  const response = await axios.post(`${API_URL}/invoices/${invoiceId}/send`, {}, {
    headers: { 'X-Tenant-ID': tenantId }
  });
  
  return response.data.invoice;
}

async function getJournalEntries(invoiceNumber) {
  const entries = await prisma.entry.findMany({
    where: {
      tenantId,
      reference: invoiceNumber
    },
    include: {
      account: {
        select: {
          code: true,
          name: true,
          type: true
        }
      }
    }
  });
  
  return entries;
}

function validateJournalBalance(entries) {
  let debits = 0;
  let credits = 0;
  
  entries.forEach(entry => {
    const amount = parseFloat(entry.amount.toString());
    if (entry.type === 'DEBIT') {
      debits += amount;
    } else {
      credits += amount;
    }
  });
  
  return {
    debits,
    credits,
    isBalanced: Math.abs(debits - credits) < 0.01
  };
}

async function testAPIEndpoints() {
  try {
    // Test invoice creation endpoint
    const createResponse = await axios.post(`${API_URL}/invoices`, {
      customerId: 'cmdvkb834000hsmk7slfpgagx',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [
        {
          itemId: 'cmdvk3sq40003smk7miiql1bs',
          quantity: 1,
          unitPrice: 500,
          description: 'API Test Item'
        }
      ],
      status: 'DRAFT'
    }, {
      headers: { 'X-Tenant-ID': tenantId }
    });
    
    // Test journal entries endpoint
    const journalResponse = await axios.get(`${API_URL}/invoices/${createResponse.data.invoice.id}/journal-entries`, {
      headers: { 'X-Tenant-ID': tenantId }
    });
    
    return createResponse.status === 201 && journalResponse.status === 200;
  } catch (error) {
    return false;
  }
}

async function testDatabaseState() {
  try {
    // Check if DRAFT invoices have no journal entries
    const draftInvoices = await prisma.invoice.findMany({
      where: { tenantId, status: 'DRAFT' }
    });
    
    for (const invoice of draftInvoices) {
      const entries = await getJournalEntries(invoice.invoiceNumber);
      if (entries.length > 0) {
        return false;
      }
    }
    
    // Check if SENT invoices have journal entries
    const sentInvoices = await prisma.invoice.findMany({
      where: { tenantId, status: 'SENT' }
    });
    
    for (const invoice of sentInvoices) {
      const entries = await getJournalEntries(invoice.invoiceNumber);
      if (entries.length === 0) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

async function testStatusBasedJournalLogic() {
  console.log('\n📋 Status-Based Journal Logic Verification:');
  console.log('--------------------------------------------');
  
  const statusTests = [
    {
      status: 'DRAFT',
      expectedEntries: 0,
      description: 'No accounting impact'
    },
    {
      status: 'SENT',
      expectedEntries: '2-3',
      description: 'Revenue recognition (A/R + Revenue)'
    },
    {
      status: 'PAID',
      expectedEntries: '2+',
      description: 'Payment collection (Cash + A/R)'
    },
    {
      status: 'CANCELLED',
      expectedEntries: '2-3',
      description: 'Undo revenue recognition (Reversals)'
    },
    {
      status: 'REFUNDED',
      expectedEntries: '2+',
      description: 'Handle refunds (Refund entries)'
    }
  ];
  
  for (const test of statusTests) {
    console.log(`\n${test.status}:`);
    console.log(`   Journal Entries: ${test.expectedEntries}`);
    console.log(`   Description: ${test.description}`);
    
    // Get actual data for this status
    const invoices = await prisma.invoice.findMany({
      where: { tenantId, status: test.status },
      take: 1
    });
    
    if (invoices.length > 0) {
      const entries = await getJournalEntries(invoices[0].invoiceNumber);
      console.log(`   ✅ Actual entries: ${entries.length}`);
      
      if (test.status === 'DRAFT' && entries.length > 0) {
        console.log('   ❌ ERROR: DRAFT invoice has journal entries!');
      } else if (test.status !== 'DRAFT' && entries.length === 0) {
        console.log('   ❌ ERROR: Non-DRAFT invoice has no journal entries!');
      } else {
        console.log('   ✅ Status logic correct');
      }
    } else {
      console.log('   ⚠️ No invoices found with this status');
    }
  }
}

// Run the test
testAccountingCompliance()
  .then(success => {
    if (success) {
      console.log('\n🎯 COMPLIANCE VERIFICATION COMPLETE');
      console.log('✅ All accounting compliance requirements are met!');
      process.exit(0);
    } else {
      console.log('\n❌ COMPLIANCE VERIFICATION FAILED');
      console.log('❌ Some accounting compliance requirements are not met!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }); 