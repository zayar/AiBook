/* eslint-disable @typescript-eslint/no-var-requires */
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password, salt) {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const iterations = 120000;
  const keylen = 32;
  const digest = 'sha256';
  const derived = crypto.pbkdf2Sync(password, usedSalt, iterations, keylen, digest).toString('hex');
  return `pbkdf2$${iterations}$${digest}$${usedSalt}$${derived}`;
}

async function main() {
  const email = process.env.SUPERADMIN_EMAIL || 'zayar@piti.app';
  const password = process.env.SUPERADMIN_PASSWORD || '12C@ndl$';
  const name = process.env.SUPERADMIN_NAME || 'System Administrator';

  const passwordHash = hashPassword(password);

  const admin = await prisma.systemAdmin.upsert({
    where: { email },
    update: { passwordHash, name, isActive: true },
    create: { email, passwordHash, name, isActive: true },
  });

  console.log('✅ Seeded super admin:', { id: admin.id, email: admin.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


