const { PrismaClient } = require('@prisma/client');

async function ensureDefaultTenant() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    console.log('🔗 Connecting to Cloud SQL database...');
    
    // Check if default tenant exists
    const existing = await prisma.tenant.findUnique({
      where: { id: 'default' }
    });

    if (existing) {
      console.log('✅ Default tenant already exists:', existing.name);
    } else {
      console.log('⚠️  Default tenant not found. Creating...');
      
      // Create default tenant
      const tenant = await prisma.tenant.create({
        data: {
          id: 'default',
          name: 'Cashflow Copilot Demo Company',
          domain: 'localhost',
          industry: 'Technology',
          location: 'Myanmar',
          baseCurrency: 'USD',
          fiscalYearStart: 1,
          fiscalYearEnd: 12,
          fiscalYearStartDate: new Date('2024-01-01'),
          isActive: true,
          metadata: {
            demo: true,
            autoCreated: true,
            createdAt: new Date().toISOString()
          }
        }
      });
      
      console.log('✅ Created default tenant:', tenant.name);
    }
    
    await prisma.$disconnect();
    console.log('✅ Database connection verified and default tenant ensured');
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

ensureDefaultTenant();