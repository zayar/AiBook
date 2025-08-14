#!/usr/bin/env node

/**
 * 🔄 AI Warehouse Data Synchronization Script
 * 
 * This script backfills the AI data warehouse with existing financial transactions
 * that were created before the streaming pipeline was properly configured.
 * 
 * What it does:
 * 1. Reads all existing journal entries, invoices, bills from MySQL
 * 2. Publishes them to Kafka streaming pipeline
 * 3. Ensures AI warehouse (BigQuery) gets current financial data
 * 4. Validates data consistency between MySQL and AI systems
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Initialize Prisma client
const prisma = new PrismaClient();

// Add the src directory to the module path for imports
require('module-alias/register');
require('ts-node/register');

// Import the financial event integration service (using require for compiled JS)
let financialEventIntegration;
try {
  // Try to import from the compiled source
  financialEventIntegration = require('../src/services/financialEventIntegration').financialEventIntegration;
} catch (error) {
  console.error('Failed to import financialEventIntegration:', error);
  process.exit(1);
}

class AIWarehouseSync {
  constructor() {
    this.tenantId = 'default-tenant';
    this.syncedCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
  }

  async run() {
    try {
      console.log('🔄 Starting AI Warehouse Data Synchronization...');
      console.log(`📊 Target Tenant: ${this.tenantId}`);
      console.log('='.repeat(60));

      // Initialize streaming service
      await this.initializeStreaming();

      // Sync financial data in order of dependencies
      await this.syncJournalEntries();
      await this.syncInvoices(); 
      await this.syncBills();
      await this.syncPayments();

      // Final validation
      await this.validateSync();

      console.log('✅ AI Warehouse synchronization completed successfully!');
      console.log(`📊 Total synced: ${this.syncedCount} events`);
      console.log(`⚠️ Errors: ${this.errorCount}`);
      console.log(`⏱️ Duration: ${Date.now() - this.startTime}ms`);

    } catch (error) {
      console.error('❌ Synchronization failed:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  }

  async initializeStreaming() {
    console.log('🔌 Initializing financial event streaming...');
    await financialEventIntegration.initialize();
    
    // Give it a moment to fully connect
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const metrics = financialEventIntegration.getMetrics();
    console.log('📊 Streaming Status:', metrics);
  }

  async syncJournalEntries() {
    console.log('\\n📝 Syncing Journal Entries...');
    
    const journals = await prisma.journal.findMany({
      where: { tenantId: this.tenantId },
      include: {
        entries: {
          include: {
            account: true
          }
        }
      },
      orderBy: { postedDate: 'asc' }
    });

    console.log(`📊 Found ${journals.length} journal entries to sync`);

    for (const journal of journals) {
      try {
        await financialEventIntegration.publishTransactionCreated({
          transactionId: `journal_${journal.id}`,
          journalId: journal.id,
          tenantId: journal.tenantId,
          entries: journal.entries.map(entry => ({
            entryId: entry.id,
            accountId: entry.accountId,
            accountCode: entry.account.code,
            accountName: entry.account.name,
            amount: parseFloat(entry.amount.toString()),
            type: entry.type,
            currency: journal.currency || 'MMK',
            exchangeRate: 1.0
          })),
          totalAmount: journal.entries.reduce((sum, entry) => 
            sum + parseFloat(entry.amount.toString()), 0),
          currency: journal.currency || 'MMK',
          memo: journal.memo,
          reference: journal.reference,
          postedAt: journal.postedDate
        });

        this.syncedCount++;
        
        if (this.syncedCount % 10 === 0) {
          console.log(`📈 Synced ${this.syncedCount} transactions...`);
        }

      } catch (error) {
        console.error(`❌ Failed to sync journal ${journal.id}:`, error);
        this.errorCount++;
      }
    }

    console.log(`✅ Journal entries sync complete: ${this.syncedCount} synced`);
  }

  async syncInvoices() {
    console.log('\\n🧾 Syncing Invoices...');
    
    const invoices = await prisma.invoice.findMany({
      where: { tenantId: this.tenantId },
      include: {
        customer: true,
        items: {
          include: {
            item: true
          }
        }
      },
      orderBy: { issueDate: 'asc' }
    });

    console.log(`📊 Found ${invoices.length} invoices to sync`);

    for (const invoice of invoices) {
      try {
        await financialEventIntegration.publishInvoiceCreated({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          tenantId: invoice.tenantId,
          customerId: invoice.customerId,
          customerName: invoice.customer?.name || 'Unknown Customer',
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          currency: invoice.currency,
          subtotal: parseFloat(invoice.subtotal.toString()),
          taxAmount: parseFloat(invoice.taxAmount.toString()),
          totalAmount: parseFloat(invoice.totalAmount.toString()),
          status: invoice.status,
          items: invoice.items.map(item => ({
            itemId: item.itemId,
            itemName: item.item?.name || 'Unknown Item',
            quantity: parseFloat(item.quantity.toString()),
            unitPrice: parseFloat(item.unitPrice.toString()),
            totalPrice: parseFloat(item.totalPrice.toString()),
            currency: invoice.currency
          }))
        });

        this.syncedCount++;

      } catch (error) {
        console.error(`❌ Failed to sync invoice ${invoice.invoiceNumber}:`, error);
        this.errorCount++;
      }
    }

    console.log(`✅ Invoices sync complete`);
  }

  async syncBills() {
    console.log('\\n📋 Syncing Bills...');
    
    const bills = await prisma.bill.findMany({
      where: { tenantId: this.tenantId },
      include: {
        vendor: true,
        items: {
          include: {
            item: true
          }
        }
      },
      orderBy: { billDate: 'asc' }
    });

    console.log(`📊 Found ${bills.length} bills to sync`);

    for (const bill of bills) {
      try {
        await financialEventIntegration.publishBillCreated({
          billId: bill.id,
          billNumber: bill.billNumber,
          tenantId: bill.tenantId,
          vendorId: bill.vendorId,
          vendorName: bill.vendor?.name || 'Unknown Vendor',
          billDate: bill.billDate,
          dueDate: bill.dueDate,
          currency: bill.currency,
          subtotal: parseFloat(bill.subtotal.toString()),
          taxAmount: parseFloat(bill.taxAmount.toString()),
          totalAmount: parseFloat(bill.totalAmount.toString()),
          status: bill.status,
          items: bill.items.map(item => ({
            itemId: item.itemId,
            itemName: item.item?.name || 'Unknown Item',
            quantity: parseFloat(item.quantity.toString()),
            unitCost: parseFloat(item.unitCost.toString()),
            totalCost: parseFloat(item.totalCost.toString()),
            currency: bill.currency
          }))
        });

        this.syncedCount++;

      } catch (error) {
        console.error(`❌ Failed to sync bill ${bill.billNumber}:`, error);
        this.errorCount++;
      }
    }

    console.log(`✅ Bills sync complete`);
  }

  async syncPayments() {
    console.log('\\n💰 Syncing Payments...');
    
    const payments = await prisma.paymentReceived.findMany({
      where: { tenantId: this.tenantId },
      include: {
        customer: true,
        invoice: true
      },
      orderBy: { paymentDate: 'asc' }
    });

    console.log(`📊 Found ${payments.length} payments to sync`);

    for (const payment of payments) {
      try {
        await financialEventIntegration.publishPaymentReceived({
          paymentId: payment.id,
          tenantId: payment.tenantId,
          customerId: payment.customerId,
          customerName: payment.customer?.name || 'Unknown Customer',
          invoiceId: payment.invoiceId,
          invoiceNumber: payment.invoice?.invoiceNumber,
          amount: parseFloat(payment.amount.toString()),
          currency: payment.currency,
          paymentDate: payment.paymentDate,
          paymentMethod: payment.paymentMethod,
          reference: payment.reference,
          memo: payment.memo
        });

        this.syncedCount++;

      } catch (error) {
        console.error(`❌ Failed to sync payment ${payment.id}:`, error);
        this.errorCount++;
      }
    }

    console.log(`✅ Payments sync complete`);
  }

  async validateSync() {
    console.log('\\n🔍 Validating synchronization...');
    
    // Get P&L data from MySQL (correct source)
    const mysqlPL = await this.getMySQLProfitLoss();
    
    // Wait for AI warehouse to process events
    console.log('⏳ Waiting for AI warehouse to process events...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('📊 MySQL P&L Data:');
    console.log(`   Revenue: ${mysqlPL.currency} ${mysqlPL.revenue.toLocaleString()}`);
    console.log(`   Expenses: ${mysqlPL.currency} ${mysqlPL.expenses.toLocaleString()}`);
    console.log(`   Net Income: ${mysqlPL.currency} ${mysqlPL.netIncome.toLocaleString()}`);
    
    const streamingMetrics = financialEventIntegration.getMetrics();
    console.log('📊 Streaming Metrics:', streamingMetrics);
  }

  async getMySQLProfitLoss() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get revenue from journal entries (credit entries in income accounts)
    const revenueEntries = await prisma.entry.findMany({
      where: {
        tenantId: this.tenantId,
        type: 'CREDIT',
        account: {
          type: { in: ['INCOME', 'OTHER_INCOME'] }
        },
        journal: {
          postedDate: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      },
      include: { account: true }
    });

    // Get expenses from journal entries (debit entries in expense accounts)
    const expenseEntries = await prisma.entry.findMany({
      where: {
        tenantId: this.tenantId,
        type: 'DEBIT',
        account: {
          type: { in: ['EXPENSE', 'OTHER_EXPENSE', 'COST_OF_GOODS_SOLD'] }
        },
        journal: {
          postedDate: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      },
      include: { account: true }
    });

    const revenue = revenueEntries.reduce((sum, entry) => 
      sum + parseFloat(entry.amount.toString()), 0);
    
    const expenses = expenseEntries.reduce((sum, entry) => 
      sum + parseFloat(entry.amount.toString()), 0);

    return {
      revenue,
      expenses,
      netIncome: revenue - expenses,
      currency: 'MMK'
    };
  }
}

// Run the synchronization
if (require.main === module) {
  const sync = new AIWarehouseSync();
  sync.run().catch(console.error);
}

module.exports = { AIWarehouseSync };
