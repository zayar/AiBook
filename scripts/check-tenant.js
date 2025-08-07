const { PrismaClient } = require('@prisma/client');

const DATABASE_URL = "mysql://gtadmin:gtapp456$%^@34.123.50.107:3306/aiAccount?sslmode=disable";
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function checkTenant() {
  try {
    console.log('🔍 Checking for default tenant...');
    
    const tenant = await prisma.tenant.findUnique({
      where: { id: 'default' }
    });
    
    if (tenant) {
      console.log('✅ Default tenant found:');
      console.log('   ID:', tenant.id);
      console.log('   Name:', tenant.name);
      console.log('   Domain:', tenant.domain);
      console.log('   Base Currency:', tenant.baseCurrency);
    } else {
      console.log('❌ Default tenant not found!');
      console.log('Creating default tenant...');
      
      const newTenant = await prisma.tenant.create({
        data: {
          id: 'default',
          name: 'Default Organization',
          domain: 'default.local',
          industry: 'Technology',
          location: 'Myanmar',
          baseCurrency: 'MMK',
          fiscalYearStart: 1,
          fiscalYearEnd: 12,
          fiscalYearStartDay: 1,
          reportBasis: 'ACCRUAL',
          language: 'English',
          timezone: '(GMT 6:30) Myanmar Time (Asia/Rangoon)',
          dateFormat: 'dd MMM yyyy [05 Aug 2025]',
          isActive: true
        }
      });
      
      console.log('✅ Created default tenant:', newTenant.name);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTenant();
