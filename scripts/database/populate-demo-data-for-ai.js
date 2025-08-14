const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function populateDemoData() {
  console.log('🚀 Starting AI Demo Data Population...');
  
  const tenantId = 'default-tenant';
  
  try {
    // 1. Create additional customers
    console.log('👥 Creating customers...');
    const customers = await Promise.all([
      prisma.customer.upsert({
        where: { tenantId_email: { tenantId, email: 'tech@startupco.com' } },
        update: {},
        create: {
          tenantId,
          name: 'StartupCo Technologies',
          email: 'tech@startupco.com',
          phone: '+1-555-0101',
          paymentTerms: 30,
          creditLimit: 100000,
          isActive: true
        }
      }),
      prisma.customer.upsert({
        where: { tenantId_email: { tenantId, email: 'orders@retailplus.com' } },
        update: {},
        create: {
          tenantId,
          name: 'RetailPlus Corp',
          email: 'orders@retailplus.com',
          phone: '+1-555-0202',
          paymentTerms: 15,
          creditLimit: 75000,
          isActive: true
        }
      }),
      prisma.customer.upsert({
        where: { tenantId_email: { tenantId, email: 'finance@manufacturing.com' } },
        update: {},
        create: {
          tenantId,
          name: 'Global Manufacturing Ltd',
          email: 'finance@manufacturing.com',
          phone: '+1-555-0303',
          paymentTerms: 60,
          creditLimit: 200000,
          isActive: true
        }
      })
    ]);

    // 2. Define service items (we'll create them as invoice items directly)
    console.log('📦 Defining service items...');
    const items = [
      {
        name: 'Premium Software License',
        unitPrice: 2500.00,
        description: 'Annual premium software license with support'
      },
      {
        name: 'Cloud Hosting Package',
        unitPrice: 800.00,
        description: 'Monthly cloud hosting with 99.9% uptime'
      },
      {
        name: 'Professional Consulting',
        unitPrice: 150.00,
        description: 'Hourly professional consulting services'
      },
      {
        name: 'Data Analytics Package',
        unitPrice: 5000.00,
        description: 'Comprehensive data analytics and reporting'
      }
    ];

    // 3. Get the default book and accounts
    const book = await prisma.book.findFirst({ where: { tenantId } });
    if (!book) {
      throw new Error('No book found for tenant');
    }

    const revenueAccount = await prisma.account.findFirst({
      where: { tenantId, type: 'INCOME' }
    });
    
    const expenseAccount = await prisma.account.findFirst({
      where: { tenantId, type: 'EXPENSE' }
    });

    if (!revenueAccount || !expenseAccount) {
      throw new Error('Required accounts not found');
    }

    // 4. Create invoices for the last 3 months
    console.log('📄 Creating invoices...');
    const today = new Date();
    const invoices = [];
    
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const invoiceDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 15);
      
      for (let i = 0; i < 5; i++) {
        const customer = customers[i % customers.length];
        const item = items[i % items.length];
        
        const quantity = Math.floor(Math.random() * 10) + 1;
        const subtotal = item.unitPrice * quantity;
        const taxAmount = subtotal * 0.1; // 10% tax
        const totalAmount = subtotal + taxAmount;
        
        const invoice = await prisma.invoice.create({
          data: {
            tenantId,
            customerId: customer.id,
            invoiceNumber: `INV-${Date.now()}-${i}`,
            issueDate: invoiceDate,
            dueDate: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000),
            subtotal,
            taxAmount,
            totalAmount,
            paidAmount: monthOffset > 0 ? totalAmount : 0, // Older invoices are paid
            status: monthOffset > 0 ? 'PAID' : 'SENT',
            currency: 'MMK',
            items: {
              create: [{
                description: item.description,
                quantity,
                unitPrice: item.unitPrice,
                totalPrice: subtotal,
                tenantId
              }]
            }
          }
        });
        
        invoices.push(invoice);
        
        // Create journal entries for paid invoices
        if (monthOffset > 0) {
          await prisma.entry.create({
            data: {
              tenantId,
              accountId: revenueAccount.id,
              bookId: book.id,
              amount: totalAmount,
              type: 'CREDIT',
              memo: `Revenue from ${invoice.invoiceNumber}`,
              journalId: `INV-${invoice.id}`,
              postedAt: invoiceDate
            }
          });
        }
      }
    }

    // 5. Create some expense entries
    console.log('💰 Creating expense entries...');
    const expenseTypes = [
      { name: 'Office Rent', amount: 2000 },
      { name: 'Utilities', amount: 500 },
      { name: 'Marketing', amount: 1500 },
      { name: 'Software Subscriptions', amount: 800 },
      { name: 'Travel & Entertainment', amount: 1200 }
    ];

    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const expenseDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 5);
      
      for (const expenseType of expenseTypes) {
        const amount = expenseType.amount + (Math.random() * 200 - 100); // Add some variation
        
        await prisma.entry.create({
          data: {
            tenantId,
            accountId: expenseAccount.id,
            bookId: book.id,
            amount: Math.abs(amount),
            type: 'DEBIT',
            memo: `${expenseType.name} for ${expenseDate.toISOString().slice(0, 7)}`,
            journalId: `EXP-${Date.now()}-${expenseType.name.replace(/\s+/g, '')}`,
            postedAt: expenseDate
          }
        });
      }
    }

    // 6. Create payment received records for paid invoices
    console.log('💳 Creating payment records...');
    const cashAccount = await prisma.account.findFirst({
      where: { tenantId, type: 'CASH' }
    });

    if (cashAccount) {
      const paidInvoices = invoices.filter(inv => inv.status === 'PAID');
      
      for (let i = 0; i < paidInvoices.slice(0, 10).length; i++) { // Create payments for first 10 paid invoices
        const invoice = paidInvoices[i];
        await prisma.paymentReceived.create({
          data: {
            tenantId,
            customerId: invoice.customerId,
            paymentNumber: `PAY-${Date.now()}-${i}`,
            amount: invoice.totalAmount,
            paymentDate: invoice.issueDate,
            paymentMode: 'BANK_TRANSFER',
            depositToAccountId: cashAccount.id,
            referenceNumber: `Payment for ${invoice.invoiceNumber}`,
            status: 'COMPLETED',
            invoicePayments: {
              create: [{
                invoiceId: invoice.id,
                amount: invoice.totalAmount,
                tenantId
              }]
            }
          }
        });
      }
    }

    // 7. Update todo status
    console.log('✅ Demo data population completed!');
    console.log(`Created ${customers.length} customers`);
    console.log(`Created ${items.length} items`);
    console.log(`Created ${invoices.length} invoices`);
    console.log('Created 15 expense entries');
    console.log('Created payment records');
    
    console.log('\n🎯 Your AI system now has rich data to analyze!');
    console.log('\n📊 Try these AI queries:');
    console.log('- "What is our total revenue this month?"');
    console.log('- "Show me profit and loss for the last 3 months"');
    console.log('- "What are our biggest expenses?"');
    console.log('- "Generate cash flow report"');
    console.log('- "How much did we make from StartupCo Technologies?"');
    console.log('- "What is our profit margin?"');

  } catch (error) {
    console.error('❌ Error populating demo data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populateDemoData()
  .then(() => {
    console.log('✅ Demo data population script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Demo data population failed:', error);
    process.exit(1);
  });
