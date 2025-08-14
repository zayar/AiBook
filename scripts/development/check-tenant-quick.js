const { PrismaClient } = require('@prisma/client');

async function checkTenant() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    const tenant = await prisma.tenant.findUnique({ 
      where: { id: 'default' } 
    });
    
    if (tenant) {
      console.log('✅ Default tenant found:', tenant.name);
    } else {
      console.log('⚠️  Default tenant missing - run setup script first');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.log('⚠️  Database check failed:', error.message);
  }
}

checkTenant();
