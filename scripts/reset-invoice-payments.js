const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetInvoicePayments() {
  try {
    console.log('🔄 Starting invoice payment reset...');

    // Get all PAID invoices
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        tenantId: 'default'
      },
      include: {
        payments: {
          include: {
            paymentReceived: true
          }
        }
      }
    });

    console.log(`📋 Found ${paidInvoices.length} paid invoices to reset`);

    for (const invoice of paidInvoices) {
      console.log(`\n🔄 Processing Invoice ${invoice.invoiceNumber}:`);
      console.log(`   Current Status: ${invoice.status}`);
      console.log(`   Current Paid Amount: ${invoice.paidAmount}`);
      console.log(`   Payment Records: ${invoice.payments.length}`);

      await prisma.$transaction(async (tx) => {
        // 1. Delete related payment received records
        for (const invoicePayment of invoice.payments) {
          if (invoicePayment.paymentReceived) {
            console.log(`   🗑️  Deleting payment record: ${invoicePayment.paymentReceived.paymentNumber}`);
            
            // Delete the payment received record (this will cascade delete invoice payments)
            await tx.paymentReceived.delete({
              where: { id: invoicePayment.paymentReceived.id }
            });
          }
        }

        // 2. Reset invoice status and amounts
        const updatedInvoice = await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'SENT', // Change back to SENT status
            paidAmount: 0,   // Reset paid amount
            updatedAt: new Date()
          }
        });

        console.log(`   ✅ Invoice ${invoice.invoiceNumber} reset to SENT status`);
      });
    }

    // Also clean up any orphaned bank transactions that might exist
    console.log('\n🧹 Cleaning up orphaned bank transactions...');
    
    const orphanedTransactions = await prisma.bankTransaction.findMany({
      where: {
        tenantId: 'default',
        category: 'customer_payment',
        metadata: {
          path: ['source'],
          equals: 'payment_received'
        }
      }
    });

    if (orphanedTransactions.length > 0) {
      console.log(`📋 Found ${orphanedTransactions.length} bank transactions to remove`);
      
      await prisma.bankTransaction.deleteMany({
        where: {
          tenantId: 'default',
          category: 'customer_payment',
          metadata: {
            path: ['source'],
            equals: 'payment_received'
          }
        }
      });
      
      console.log('✅ Orphaned bank transactions removed');
    }

    console.log('\n🎉 Invoice payment reset completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Go to your invoices page');
    console.log('   2. Click "Record Payment" on each invoice');
    console.log('   3. Select the correct deposit account (e.g., ABANK)');
    console.log('   4. Submit the payment');
    console.log('   5. Check ABANK transactions - they should now appear!');

  } catch (error) {
    console.error('❌ Error resetting invoice payments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
resetInvoicePayments();
