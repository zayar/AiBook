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

async function fixBillInventoryLinks() {
  try {
    console.log('🔧 Fixing bill inventory item links...');

    // Get all bill items that don't have inventory item links
    const billItemsWithoutLinks = await prisma.billItem.findMany({
      where: {
        tenantId: 'default',
        inventoryItemId: null
      },
      include: {
        bill: true
      }
    });

    console.log(`Found ${billItemsWithoutLinks.length} bill items without inventory links`);

    for (const billItem of billItemsWithoutLinks) {
      console.log(`\\n🔍 Processing bill item: "${billItem.description}"`);
      
      // Try to find matching inventory item
      const matchingInventoryItem = await prisma.inventoryItem.findFirst({
        where: {
          tenantId: 'default',
          OR: [
            { name: billItem.description },
            { name: { contains: billItem.description } },
            { sku: billItem.description },
            { sku: { contains: billItem.description } }
          ]
        }
      });
      
      if (matchingInventoryItem) {
        console.log(`✅ Found matching inventory item: ${matchingInventoryItem.name} (${matchingInventoryItem.sku})`);
        
        // Update the bill item with inventory link
        await prisma.billItem.update({
          where: { id: billItem.id },
          data: { inventoryItemId: matchingInventoryItem.id }
        });
        
        // Update inventory quantity and create cost layer
        const quantity = parseFloat(billItem.quantity.toString());
        const unitPrice = parseFloat(billItem.unitPrice.toString());
        
        console.log(`📦 Updating inventory quantity by +${quantity} units`);
        
        // Update inventory quantity
        await prisma.inventoryItem.update({
          where: { id: matchingInventoryItem.id },
          data: {
            quantityOnHand: {
              increment: quantity
            }
          }
        });
        
        // Create cost layer for FIFO tracking
        await prisma.inventoryCostLayer.create({
          data: {
            inventoryItemId: matchingInventoryItem.id,
            purchaseDate: billItem.bill.billDate,
            unitCost: unitPrice,
            originalQuantity: quantity,
            remainingQuantity: quantity,
            reference: `BILL-${billItem.bill.billNumber}-${billItem.id}`,
            billItemId: billItem.id,
            tenantId: 'default'
          }
        });
        
        console.log(`✅ Updated inventory and created cost layer for bill ${billItem.bill.billNumber}`);
      } else {
        console.log(`⚠️  No matching inventory item found for "${billItem.description}"`);
      }
    }
    
    console.log('\\n🎉 Bill inventory linking fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing bill inventory links:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBillInventoryLinks();