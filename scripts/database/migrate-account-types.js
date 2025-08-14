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

// Mapping from old account types to new sub-types based on account names/codes
const accountTypeMigrationMap = {
  // Asset accounts
  'ASSET': {
    '1000': 'CASH',           // Cash
    '1100': 'ACCOUNTS_RECEIVABLE', // Accounts Receivable
    '1200': 'STOCK',          // Inventory
    '1300': 'BANK',           // Bank accounts
    '1400': 'FIXED_ASSET',    // Fixed assets
    '1500': 'OTHER_CURRENT_ASSET', // Other current assets
    '1600': 'NON_CURRENT_ASSET',   // Non-current assets
    'default': 'OTHER_ASSET'
  },
  
  // Liability accounts
  'LIABILITY': {
    '2000': 'ACCOUNTS_PAYABLE',    // Accounts Payable
    '2100': 'CREDIT_CARD',         // Credit Card
    '2200': 'OTHER_CURRENT_LIABILITY', // Other current liabilities
    '2300': 'OUTPUT_TAX',          // Sales Tax/VAT
    '2400': 'NON_CURRENT_LIABILITY', // Long-term liabilities
    'default': 'OTHER_LIABILITY'
  },
  
  // Equity accounts
  'EQUITY': {
    'default': 'EQUITY'
  },
  
  // Revenue accounts (now Income)
  'REVENUE': {
    '4000': 'INCOME',
    '4100': 'OTHER_INCOME',
    'default': 'INCOME'
  },
  
  // Expense accounts
  'EXPENSE': {
    '5000': 'COST_OF_GOODS_SOLD',
    '6000': 'EXPENSE',
    '7000': 'OTHER_EXPENSE',
    'default': 'EXPENSE'
  }
};

function getNewAccountType(oldType, accountCode, accountName) {
  const typeMap = accountTypeMigrationMap[oldType];
  if (!typeMap) return oldType;
  
  // Try to match by account code prefix
  for (const [codePrefix, newType] of Object.entries(typeMap)) {
    if (codePrefix !== 'default' && accountCode.startsWith(codePrefix)) {
      return newType;
    }
  }
  
  // Try to match by account name keywords
  const nameLower = accountName.toLowerCase();
  if (oldType === 'ASSET') {
    if (nameLower.includes('cash')) return 'CASH';
    if (nameLower.includes('bank')) return 'BANK';
    if (nameLower.includes('receivable')) return 'ACCOUNTS_RECEIVABLE';
    if (nameLower.includes('inventory') || nameLower.includes('stock')) return 'STOCK';
    if (nameLower.includes('fixed') || nameLower.includes('equipment') || nameLower.includes('building')) return 'FIXED_ASSET';
  } else if (oldType === 'LIABILITY') {
    if (nameLower.includes('payable')) return 'ACCOUNTS_PAYABLE';
    if (nameLower.includes('credit card')) return 'CREDIT_CARD';
    if (nameLower.includes('tax') && nameLower.includes('output')) return 'OUTPUT_TAX';
  } else if (oldType === 'EXPENSE') {
    if (nameLower.includes('cost of goods') || nameLower.includes('cogs')) return 'COST_OF_GOODS_SOLD';
  }
  
  // Default mapping
  return typeMap.default || oldType;
}

async function migrateAccountTypes() {
  try {
    console.log('🔄 Starting account type migration...');
    
    // Get all existing accounts
    const accounts = await prisma.account.findMany({
      where: { tenantId: 'default' }
    });
    
    console.log(`📊 Found ${accounts.length} accounts to migrate`);
    
    let migrationCount = 0;
    
    for (const account of accounts) {
      const newType = getNewAccountType(account.type, account.code, account.name);
      
      if (newType !== account.type) {
        console.log(`📝 Migrating account ${account.code} - ${account.name}: ${account.type} → ${newType}`);
        
        await prisma.account.update({
          where: { id: account.id },
          data: { type: newType }
        });
        
        migrationCount++;
      } else {
        console.log(`✅ Account ${account.code} - ${account.name}: ${account.type} (no change needed)`);
      }
    }
    
    console.log(`🎉 Migration completed! Updated ${migrationCount} accounts.`);
    
    // Show summary of new account types
    const typeCount = await prisma.account.groupBy({
      by: ['type'],
      where: { tenantId: 'default' },
      _count: true
    });
    
    console.log('\n📊 Account type summary after migration:');
    typeCount.forEach(({ type, _count }) => {
      console.log(`   ${type}: ${_count}`);
    });
    
  } catch (error) {
    console.error('❌ Error during account type migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateAccountTypes();
