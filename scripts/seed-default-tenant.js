const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedDefaultTenant() {
  try {
    console.log('🌱 Seeding default tenant...');

    // Check if default tenant already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { domain: 'demo.aibook.com' }
    });

    if (existingTenant) {
      console.log('✅ Default tenant already exists');
      return;
    }

    // Create default tenant
    const defaultTenant = await prisma.tenant.create({
      data: {
        name: 'Demo Company',
        domain: 'demo.aibook.com',
        industry: 'Software Development',
        location: 'United States',
        companyId: 'DEMO-001',
        settings: {
          currency: 'USD',
          timezone: 'America/New_York',
          dateFormat: 'MM/DD/YYYY',
          fiscalYearStart: '01-01'
        }
      }
    });

    console.log('✅ Default tenant created successfully:', defaultTenant.id);

    // Create a demo user for the default tenant
    const demoUser = await prisma.user.create({
      data: {
        uid: 'demo-user-123',
        firebaseUid: 'demo-firebase-123',
        email: 'demo@aibook.com',
        tenantId: defaultTenant.id,
        role: 'ADMIN',
        profile: {
          firstName: 'Demo',
          lastName: 'User',
          phone: '+1-555-0123',
          avatar: null
        }
      }
    });

    console.log('✅ Demo user created successfully:', demoUser.email);

  } catch (error) {
    console.error('❌ Error seeding default tenant:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedDefaultTenant()
    .then(() => {
      console.log('🎉 Default tenant seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to seed default tenant:', error);
      process.exit(1);
    });
}

module.exports = { seedDefaultTenant };