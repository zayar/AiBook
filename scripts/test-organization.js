const { PrismaClient } = require('@prisma/client');

const DATABASE_URL = "mysql://gtadmin:gtapp456$%^@34.123.50.107:3306/aiAccount?sslmode=disable";
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function testOrganizationController() {
  try {
    console.log('🧪 Testing Organization Controller Logic...');
    
    const tenantId = 'default';
    
    console.log('1. Finding tenant...');
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        domain: true,
        industry: true,
        location: true,
        logo: true,
        baseCurrency: true,
        fiscalYearStart: true,
        fiscalYearEnd: true,
        fiscalYearStartDay: true,
        reportBasis: true,
        language: true,
        timezone: true,
        dateFormat: true,
        companyId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!tenant) {
      console.log('❌ Tenant not found!');
      return;
    }

    console.log('✅ Tenant found:', tenant.name);
    
    console.log('2. Checking for transactions...');
    const hasTransactions = await prisma.entry.count({
      where: { tenantId }
    });

    console.log('   Transactions count:', hasTransactions);
    
    const canChangeCurrency = hasTransactions === 0;
    console.log('   Can change currency:', canChangeCurrency);
    
    console.log('3. Building response...');
    const response = {
      success: true,
      data: {
        ...tenant,
        canChangeCurrency,
        fiscalYearPeriod: `${tenant.fiscalYearStart} - ${tenant.fiscalYearEnd}`,
        fiscalYearPeriodDetail: `Period: ${tenant.fiscalYearStartDay} - ${tenant.fiscalYearEnd}`
      }
    };
    
    console.log('✅ Response built successfully:');
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('❌ Error in organization controller test:', error);
    console.error('Error stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testOrganizationController();
