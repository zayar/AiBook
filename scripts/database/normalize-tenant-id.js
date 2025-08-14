#!/usr/bin/env node
/*
  Normalize all tenantId values to a single canonical ID across the database.
  - Ensures there is a tenant with id = 'default-tenant'
  - Updates any lingering rows using 'default' (or other aliases) to 'default-tenant'
  - Works generically by attempting to update every table; tables without tenantId are skipped
  - Safe to run multiple times (idempotent)

  Usage:
    node scripts/normalize-tenant-id.js

  Env:
    DEFAULT_TENANT_ID   default: 'default-tenant'
*/

const { PrismaClient } = require('@prisma/client');

// Use a fixed canonical tenant id to avoid accidental drift via env
const DEFAULT_TENANT_ID = 'default-tenant';
const LEGACY_TENANT_IDS = ['default', 'tenant-default', 'demo', 'DemoTenant'];

const prisma = new PrismaClient({ log: ['warn', 'error'] });

async function main() {
  console.log('🔧 Normalizing tenant IDs...');
  console.log('➡️  Canonical tenantId:', DEFAULT_TENANT_ID);

  // Get current database/schema name
  const dbNameResult = await prisma.$queryRawUnsafe('SELECT DATABASE() AS db');
  const dbName = Array.isArray(dbNameResult) && dbNameResult[0] && dbNameResult[0].db;
  if (!dbName) {
    throw new Error('Could not determine current database name');
  }
  console.log('🗄️  Database:', dbName);

  // Ensure tenant record exists
  const existingTenant = await prisma.tenant.findFirst({ where: { id: DEFAULT_TENANT_ID } }).catch(() => null);
  if (!existingTenant) {
    // If there is any legacy tenant id, rename it, else create a new tenant row
    let renamed = false;
    for (const legacy of LEGACY_TENANT_IDS) {
      const legacyTenant = await prisma.tenant.findFirst({ where: { id: legacy } }).catch(() => null);
      if (legacyTenant) {
        console.log(`✍️  Renaming tenant '${legacy}' → '${DEFAULT_TENANT_ID}'`);
        await prisma.$executeRawUnsafe(
          `SET FOREIGN_KEY_CHECKS=0; UPDATE \`${dbName}\`.\`tenants\` SET id = ? WHERE id = ?; SET FOREIGN_KEY_CHECKS=1;`,
          DEFAULT_TENANT_ID,
          legacy
        );
        renamed = true;
        break;
      }
    }
    if (!renamed) {
      console.log('➕ Creating canonical tenant row');
      await prisma.tenant.create({
        data: {
          id: DEFAULT_TENANT_ID,
          name: 'Cashflow Copilot Demo Company',
        },
      }).catch((e) => {
        console.warn('Tenant create warning:', e.message);
      });
    }
  }

  // Find tables with a tenantId column
  const tables = await prisma.$queryRawUnsafe(
    `SELECT TABLE_NAME as tableName FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND COLUMN_NAME = 'tenantId'`,
    dbName
  );

  const tableNames = tables.map((t) => t.tableName);
  console.log(`📋 Tables with tenantId: ${tableNames.length}`);

  // Update all rows using any legacy tenant ids → DEFAULT_TENANT_ID
  for (const tableName of tableNames) {
    for (const legacy of LEGACY_TENANT_IDS) {
      if (legacy === DEFAULT_TENANT_ID) continue;
      const sql = `UPDATE \`${dbName}\`.\`${tableName}\` SET tenantId = ? WHERE tenantId = ?`;
      try {
        const result = await prisma.$executeRawUnsafe(sql, DEFAULT_TENANT_ID, legacy);
        if (result && result > 0) {
          console.log(`✅ ${tableName}: ${result} rows updated (${legacy} → ${DEFAULT_TENANT_ID})`);
        }
      } catch (err) {
        // Ignore tables that may not allow updates due to constraints; continue
        console.warn(`⚠️  Skipped ${tableName}: ${err.message}`);
      }
    }
  }

  console.log('🎉 Tenant normalization complete');
}

main()
  .catch((e) => {
    console.error('❌ Normalize tenant error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


