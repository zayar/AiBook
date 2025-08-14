#!/usr/bin/env node
/*
  Seed helper that snapshots current live data into a consistent default tenant baseline.
  - Creates/ensures tenant 'default-tenant'
  - Does nothing destructive (no deletes)
  - Intended to be run after you have a working dataset you want as the baseline

  Usage:
    node scripts/seed-default-tenant-from-current.js
*/

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['warn', 'error'] });

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'default-tenant';

async function ensureDefaultTenant() {
  const existing = await prisma.tenant.findFirst({ where: { id: DEFAULT_TENANT_ID } }).catch(() => null);
  if (!existing) {
    await prisma.tenant.create({
      data: { id: DEFAULT_TENANT_ID, name: 'Cashflow Copilot Demo Company', isActive: true },
    });
  }
}

async function main() {
  console.log('📦 Seeding baseline from current data -> tenant:', DEFAULT_TENANT_ID);
  await ensureDefaultTenant();

  // Example: make sure there is at least one book called 'General Ledger'
  let book = await prisma.book.findFirst({ where: { tenantId: DEFAULT_TENANT_ID, name: 'General Ledger' } });
  if (!book) {
    book = await prisma.book.create({ data: { tenantId: DEFAULT_TENANT_ID, name: 'General Ledger', currency: 'MMK' } });
    console.log('➕ Created book: General Ledger');
  }

  // No-op placeholder: We keep existing data as-is; this script only ensures required anchors exist
  console.log('✅ Baseline seed complete (non-destructive)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});


