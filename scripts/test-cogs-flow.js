/**
 * 🧪 COMPREHENSIVE COGS TESTING SCRIPT
 * 
 * Tests the complete COGS (Cost of Goods Sold) flow with FIFO methodology:
 * 1. Creates sample inventory items
 * 2. Creates bills (purchases) to establish cost layers
 * 3. Creates invoices (sales) to calculate COGS
 * 4. Tests inventory returns
 * 5. Validates calculations and journal entries
 * 
 * Run with: node scripts/test-cogs-flow.js
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

// Configuration
const API_BASE_URL = 'http://localhost:8000/api/v1';
const TEST_TENANT_ID = 'tenant-001'; // Replace with actual tenant ID
const TEST_HEADERS = {
  'Content-Type': 'application/json',
  'x-tenant-id': TEST_TENANT_ID
};

// Test data
const testData = {
  inventoryItems: [
    {
      sku: 'WIDGET-001',
      name: 'Premium Widget',
      description: 'High-quality widget for testing COGS',
      category: 'Electronics',
      unitOfMeasure: 'each',
      unitPrice: 25.00,
      reorderLevel: 10,
      reorderQuantity: 50
    },
    {
      sku: 'GADGET-002', 
      name: 'Super Gadget',
      description: 'Advanced gadget for COGS testing',
      category: 'Electronics',
      unitOfMeasure: 'each',
      unitPrice: 45.00,
      reorderLevel: 5,
      reorderQuantity: 25
    }
  ],
  purchases: [
    {
      // First purchase - establishes first cost layer
      items: [
        { sku: 'WIDGET-001', quantity: 100, unitCost: 10.00 },
        { sku: 'GADGET-002', quantity: 50, unitCost: 20.00 }
      ],
      purchaseDate: '2024-01-01'
    },
    {
      // Second purchase - establishes second cost layer with different costs
      items: [
        { sku: 'WIDGET-001', quantity: 75, unitCost: 12.00 },
        { sku: 'GADGET-002', quantity: 30, unitCost: 22.00 }
      ],
      purchaseDate: '2024-01-15'
    },
    {
      // Third purchase - establishes third cost layer
      items: [
        { sku: 'WIDGET-001', quantity: 50, unitCost: 11.50 }
      ],
      purchaseDate: '2024-02-01'
    }
  ],
  sales: [
    {
      // First sale - should use FIFO (oldest cost layers first)
      items: [
        { sku: 'WIDGET-001', quantity: 80 }, // Should consume from first layer ($10) and part of second layer ($12)
        { sku: 'GADGET-002', quantity: 25 }  // Should consume from first layer ($20) 
      ],
      saleDate: '2024-02-10'
    },
    {
      // Second sale - should continue FIFO consumption
      items: [
        { sku: 'WIDGET-001', quantity: 60 }, // Should consume remaining from second layer and part of third layer
        { sku: 'GADGET-002', quantity: 20 }  // Should consume remaining from first layer and part of second layer
      ],
      saleDate: '2024-02-20'
    }
  ],
  returns: [
    {
      // Return some items from first sale
      originalSaleIndex: 0,
      itemSku: 'WIDGET-001',
      returnQuantity: 10,
      returnDate: '2024-02-25'
    }
  ]
};

class COGSTestRunner {
  constructor() {
    this.createdData = {
      vendors: [],
      customers: [],
      inventoryItems: [],
      bills: [],
      invoices: [],
      cogsCalculations: []
    };
  }

  async setupTestData() {
    console.log('🔧 Setting up test data...');
    
    // Create test vendor
    const vendor = await prisma.vendor.create({
      data: {
        name: 'COGS Test Vendor Inc.',
        email: 'vendor@cogstest.com',
        phone: '+1-555-0123',
        tenantId: TEST_TENANT_ID,
        displayName: 'Test Vendor',
        currency: 'USD'
      }
    });
    this.createdData.vendors.push(vendor);
    console.log(`✅ Created vendor: ${vendor.name}`);

    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        name: 'COGS Test Customer LLC',
        email: 'customer@cogstest.com', 
        phone: '+1-555-0456',
        tenantId: TEST_TENANT_ID,
        paymentTerms: 30,
        creditLimit: 10000.00
      }
    });
    this.createdData.customers.push(customer);
    console.log(`✅ Created customer: ${customer.name}`);

    // Get required accounts
    const [assetAccount, cogsAccount] = await Promise.all([
      prisma.account.findFirst({
        where: { tenantId: TEST_TENANT_ID, type: 'ASSET', name: { contains: 'Inventory' } }
      }),
      prisma.account.findFirst({
        where: { tenantId: TEST_TENANT_ID, type: 'EXPENSE', name: { contains: 'Cost of Goods Sold' } }
      })
    ]);

    if (!assetAccount || !cogsAccount) {
      throw new Error('Required inventory accounts not found. Please ensure Chart of Accounts is set up.');
    }

    // Create inventory items
    for (const itemData of testData.inventoryItems) {
      const item = await prisma.inventoryItem.create({
        data: {
          ...itemData,
          unitCost: 0, // Will be updated as we receive inventory
          quantityOnHand: 0,
          assetAccountId: assetAccount.id,
          cogsAccountId: cogsAccount.id,
          tenantId: TEST_TENANT_ID
        }
      });
      this.createdData.inventoryItems.push(item);
      console.log(`✅ Created inventory item: ${item.sku} - ${item.name}`);
    }
  }

  async testPurchaseFlow() {
    console.log('\n📦 Testing Purchase Flow (Cost Layer Creation)...');
    
    for (let i = 0; i < testData.purchases.length; i++) {
      const purchaseData = testData.purchases[i];
      console.log(`\n--- Purchase ${i + 1} (${purchaseData.purchaseDate}) ---`);
      
      // Prepare bill items with inventory item IDs
      const billItems = [];
      for (const item of purchaseData.items) {
        const inventoryItem = this.createdData.inventoryItems.find(inv => inv.sku === item.sku);
        if (!inventoryItem) {
          throw new Error(`Inventory item not found for SKU: ${item.sku}`);
        }
        
        billItems.push({
          description: `Purchase of ${item.quantity} ${inventoryItem.name}`,
          quantity: item.quantity,
          unitPrice: item.unitCost,
          taxRate: 0,
          accountCode: '1200', // Inventory asset account
          inventoryItemId: inventoryItem.id
        });
      }

      // Calculate totals
      const subtotal = billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const totalAmount = subtotal;

      // Create bill via API
      const billResponse = await axios.post(`${API_BASE_URL}/bills`, {
        vendorId: this.createdData.vendors[0].id,
        billDate: purchaseData.purchaseDate,
        dueDate: new Date(new Date(purchaseData.purchaseDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days later
        currency: 'USD',
        exchangeRate: 1,
        notes: `Test purchase ${i + 1} for COGS testing`,
        items: billItems
      }, {
        headers: TEST_HEADERS
      });

      const bill = billResponse.data.bill;
      this.createdData.bills.push(bill);
      console.log(`✅ Created bill: ${bill.billNumber} - Total: $${totalAmount.toFixed(2)}`);

      // Verify cost layers were created
      for (const item of purchaseData.items) {
        const inventoryItem = this.createdData.inventoryItems.find(inv => inv.sku === item.sku);
        const costLayers = await prisma.inventoryCostLayer.findMany({
          where: {
            inventoryItemId: inventoryItem.id,
            tenantId: TEST_TENANT_ID,
            purchaseDate: new Date(purchaseData.purchaseDate)
          }
        });
        
        console.log(`  📊 Cost layers for ${item.sku}: ${costLayers.length} layers, Total quantity: ${costLayers.reduce((sum, layer) => sum + parseFloat(layer.remainingQuantity.toString()), 0)}`);
      }
    }
  }

  async testSalesFlow() {
    console.log('\n💰 Testing Sales Flow (COGS Calculation)...');
    
    for (let i = 0; i < testData.sales.length; i++) {
      const saleData = testData.sales[i];
      console.log(`\n--- Sale ${i + 1} (${saleData.saleDate}) ---`);
      
      // Prepare invoice items with inventory item IDs
      const invoiceItems = [];
      for (const item of saleData.items) {
        const inventoryItem = this.createdData.inventoryItems.find(inv => inv.sku === item.sku);
        if (!inventoryItem) {
          throw new Error(`Inventory item not found for SKU: ${item.sku}`);
        }
        
        invoiceItems.push({
          inventoryItemId: inventoryItem.id,
          description: `Sale of ${item.quantity} ${inventoryItem.name}`,
          quantity: item.quantity,
          unitPrice: parseFloat(inventoryItem.unitPrice.toString()),
          taxRate: 0,
          accountCode: '4000' // Sales revenue account
        });
      }

      // Create invoice via API (status: SENT to trigger COGS calculation)
      const invoiceResponse = await axios.post(`${API_BASE_URL}/invoices`, {
        customerId: this.createdData.customers[0].id,
        issueDate: saleData.saleDate,
        dueDate: new Date(new Date(saleData.saleDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        currency: 'USD',
        exchangeRate: 1,
        notes: `Test sale ${i + 1} for COGS testing`,
        status: 'SENT', // This triggers COGS calculation
        items: invoiceItems
      }, {
        headers: TEST_HEADERS
      });

      const invoice = invoiceResponse.data.invoice;
      const cogsCalculations = invoiceResponse.data.cogsCalculations || [];
      
      this.createdData.invoices.push(invoice);
      this.createdData.cogsCalculations.push(...cogsCalculations);
      
      console.log(`✅ Created invoice: ${invoice.invoiceNumber} - Total: $${parseFloat(invoice.totalAmount.toString()).toFixed(2)}`);
      console.log(`📊 COGS calculations: ${cogsCalculations.length} items`);
      
      // Display COGS details
      for (const cogsCalc of cogsCalculations) {
        const inventoryItem = this.createdData.inventoryItems.find(inv => inv.id === cogsCalc.inventoryItemId);
        console.log(`  💵 ${inventoryItem.sku}: COGS $${cogsCalc.totalCOGS.toFixed(2)} (avg: $${cogsCalc.averageCostPerUnit.toFixed(2)}/unit)`);
      }
    }
  }

  async testInventoryReturns() {
    console.log('\n🔄 Testing Inventory Returns (COGS Reversal)...');
    
    for (const returnData of testData.returns) {
      console.log(`\n--- Return: ${returnData.returnQuantity} units of ${returnData.itemSku} ---`);
      
      // Find the original invoice item
      const originalInvoice = this.createdData.invoices[returnData.originalSaleIndex];
      const inventoryItem = this.createdData.inventoryItems.find(inv => inv.sku === returnData.itemSku);
      
      const originalInvoiceItem = await prisma.invoiceItem.findFirst({
        where: {
          invoiceId: originalInvoice.id,
          inventoryItemId: inventoryItem.id
        }
      });

      if (!originalInvoiceItem) {
        throw new Error(`Original invoice item not found for ${returnData.itemSku}`);
      }

      // Process return via API
      const returnResponse = await axios.post(`${API_BASE_URL}/cogs/returns`, {
        originalInvoiceItemId: originalInvoiceItem.id,
        returnQuantity: returnData.returnQuantity,
        returnDate: returnData.returnDate,
        reference: `TEST-RETURN-${Date.now()}`,
        notes: 'Test inventory return for COGS testing'
      }, {
        headers: TEST_HEADERS
      });

      console.log(`✅ Processed return: ${returnResponse.data.message}`);
      console.log(`📦 Updated inventory quantity: ${returnResponse.data.updatedInventory.quantityOnHand}`);
    }
  }

  async generateReports() {
    console.log('\n📊 Generating COGS Reports...');
    
    // Get COGS calculations report
    const cogsResponse = await axios.get(`${API_BASE_URL}/cogs/calculations`, {
      headers: TEST_HEADERS,
      params: {
        fromDate: '2024-01-01',
        toDate: '2024-12-31'
      }
    });

    console.log('\n📋 COGS Calculations Summary:');
    console.log(`  Total calculations: ${cogsResponse.data.summary.totalCalculations}`);
    console.log(`  Total COGS: $${cogsResponse.data.summary.totalCOGS.toFixed(2)}`);
    console.log(`  Total quantity sold: ${cogsResponse.data.summary.totalQuantitySold}`);
    console.log(`  Average cost per unit: $${cogsResponse.data.summary.averageCostPerUnit.toFixed(2)}`);

    // Get cost layers report
    const layersResponse = await axios.get(`${API_BASE_URL}/cogs/cost-layers`, {
      headers: TEST_HEADERS
    });

    console.log('\n📦 Cost Layers Summary:');
    console.log(`  Total layers: ${layersResponse.data.summary.totalLayers}`);
    console.log(`  Total remaining quantity: ${layersResponse.data.summary.totalRemainingQuantity}`);
    console.log(`  Utilization rate: ${layersResponse.data.summary.utilizationRate.toFixed(2)}%`);

    // Generate detailed COGS report by item
    const reportResponse = await axios.get(`${API_BASE_URL}/cogs/reports`, {
      headers: TEST_HEADERS,
      params: {
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
        groupBy: 'item',
        includeDetails: true
      }
    });

    console.log('\n📈 Detailed COGS Report by Item:');
    for (const group of reportResponse.data.groupedData) {
      console.log(`  ${group.groupKey}:`);
      console.log(`    Total COGS: $${group.totalCOGS.toFixed(2)}`);
      console.log(`    Quantity sold: ${group.totalQuantitySold}`);
      console.log(`    Average cost: $${group.averageCostPerUnit.toFixed(2)}/unit`);
      console.log(`    Calculations: ${group.calculationCount}`);
    }
  }

  async validateFIFOLogic() {
    console.log('\n🔍 Validating FIFO Logic...');
    
    // Check cost layer consumption for each inventory item
    for (const inventoryItem of this.createdData.inventoryItems) {
      console.log(`\n--- FIFO Validation for ${inventoryItem.sku} ---`);
      
      // Get all cost layers for this item
      const costLayers = await prisma.inventoryCostLayer.findMany({
        where: {
          inventoryItemId: inventoryItem.id,
          tenantId: TEST_TENANT_ID
        },
        orderBy: [
          { purchaseDate: 'asc' },
          { createdAt: 'asc' }
        ],
        include: {
          consumptions: {
            include: {
              cogsCalculation: {
                include: {
                  invoiceItem: {
                    include: {
                      invoice: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      console.log(`  📦 Total cost layers: ${costLayers.length}`);
      
      for (let i = 0; i < costLayers.length; i++) {
        const layer = costLayers[i];
        const totalConsumed = layer.consumptions.reduce((sum, consumption) => 
          sum + parseFloat(consumption.quantityConsumed.toString()), 0);
        
        console.log(`    Layer ${i + 1} (${layer.purchaseDate.toISOString().split('T')[0]}):`);
        console.log(`      Unit cost: $${parseFloat(layer.unitCost.toString()).toFixed(2)}`);
        console.log(`      Original: ${parseFloat(layer.originalQuantity.toString())}`);
        console.log(`      Remaining: ${parseFloat(layer.remainingQuantity.toString())}`);
        console.log(`      Consumed: ${totalConsumed}`);
        console.log(`      Fully consumed: ${layer.isFullyConsumed}`);
        
        // Validate FIFO: older layers should be consumed before newer ones
        if (i > 0 && !costLayers[i-1].isFullyConsumed && layer.consumptions.length > 0) {
          console.log(`      ⚠️  WARNING: FIFO violation detected! Layer ${i+1} consumed before layer ${i} was fully consumed.`);
        }
      }
    }
  }

  async validateJournalEntries() {
    console.log('\n📝 Validating Journal Entries...');
    
    // Get all COGS-related journal entries
    const cogsEntries = await prisma.entry.findMany({
      where: {
        tenantId: TEST_TENANT_ID,
        memo: {
          contains: 'Cost of goods sold'
        }
      },
      include: {
        account: {
          select: {
            code: true,
            name: true,
            type: true
          }
        }
      },
      orderBy: {
        postedAt: 'asc'
      }
    });

    console.log(`  📊 Total COGS journal entries: ${cogsEntries.length}`);
    
    let totalCOGSDebits = 0;
    let totalInventoryCredits = 0;
    
    for (const entry of cogsEntries) {
      const amount = parseFloat(entry.amount.toString());
      console.log(`    ${entry.account.code} (${entry.account.name}): ${entry.type} $${amount.toFixed(2)} - ${entry.memo}`);
      
      if (entry.account.type === 'EXPENSE' && entry.type === 'DEBIT') {
        totalCOGSDebits += amount;
      } else if (entry.account.type === 'ASSET' && entry.type === 'CREDIT') {
        totalInventoryCredits += amount;
      }
    }
    
    console.log(`  💰 Total COGS debits: $${totalCOGSDebits.toFixed(2)}`);
    console.log(`  💰 Total inventory credits: $${totalInventoryCredits.toFixed(2)}`);
    console.log(`  ✅ Balanced: ${Math.abs(totalCOGSDebits - totalInventoryCredits) < 0.01 ? 'YES' : 'NO'}`);
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      // Delete in reverse order to handle foreign key constraints
      await prisma.cOGSLayerConsumption.deleteMany({
        where: { tenantId: TEST_TENANT_ID }
      });
      
      await prisma.cOGSCalculation.deleteMany({
        where: { tenantId: TEST_TENANT_ID }
      });
      
      await prisma.inventoryCostLayer.deleteMany({
        where: { tenantId: TEST_TENANT_ID }
      });
      
      await prisma.entry.deleteMany({
        where: { tenantId: TEST_TENANT_ID }
      });
      
      await prisma.invoiceItem.deleteMany({
        where: { tenantId: TEST_TENANT_ID }
      });
      
      await prisma.invoice.deleteMany({
        where: { tenantId: TEST_TENANT_ID }
      });
      
      await prisma.billItem.deleteMany({
        where: { tenantId: TEST_TENANT_ID }
      });
      
      await prisma.bill.deleteMany({
        where: { tenantId: TEST_TENANT_ID }
      });
      
      await prisma.inventoryItem.deleteMany({
        where: { tenantId: TEST_TENANT_ID }
      });
      
      await prisma.customer.deleteMany({
        where: { tenantId: TEST_TENANT_ID }
      });
      
      await prisma.vendor.deleteMany({
        where: { tenantId: TEST_TENANT_ID }
      });
      
      console.log('✅ Test data cleaned up successfully');
    } catch (error) {
      console.error('❌ Error during cleanup:', error.message);
    }
  }

  async run() {
    console.log('🚀 Starting COGS Flow Testing...\n');
    
    try {
      await this.setupTestData();
      await this.testPurchaseFlow();
      await this.testSalesFlow();
      await this.testInventoryReturns();
      await this.generateReports();
      await this.validateFIFOLogic();
      await this.validateJournalEntries();
      
      console.log('\n🎉 COGS Testing Completed Successfully!');
      console.log('\n📋 Test Summary:');
      console.log(`  ✅ Inventory items created: ${this.createdData.inventoryItems.length}`);
      console.log(`  ✅ Purchases processed: ${this.createdData.bills.length}`);
      console.log(`  ✅ Sales processed: ${this.createdData.invoices.length}`);
      console.log(`  ✅ COGS calculations: ${this.createdData.cogsCalculations.length}`);
      console.log(`  ✅ Returns processed: ${testData.returns.length}`);
      
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      console.error(error.stack);
    } finally {
      // Uncomment the line below to keep test data for manual inspection
      // await this.cleanup();
      await prisma.$disconnect();
    }
  }
}

// Run the test
if (require.main === module) {
  const testRunner = new COGSTestRunner();
  testRunner.run().catch(console.error);
}

module.exports = { COGSTestRunner };