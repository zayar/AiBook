/*
  Warnings:

  - You are about to drop the column `accountCode` on the `expenses` table. All the data in the column will be lost.
  - You are about to drop the column `vendor` on the `expenses` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[expenseNumber]` on the table `expenses` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `expenseAccountId` to the `expenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expenseNumber` to the `expenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paidThroughId` to the `expenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `expenses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `bill_payments` ADD COLUMN `vendorPaymentId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `entries` ADD COLUMN `aiInsights` JSON NULL,
    ADD COLUMN `aiTags` JSON NULL,
    ADD COLUMN `confidence` DOUBLE NULL,
    ADD COLUMN `embedding` LONGBLOB NULL;

-- AlterTable
ALTER TABLE `expenses` DROP COLUMN `accountCode`,
    DROP COLUMN `vendor`,
    ADD COLUMN `branch` VARCHAR(191) NULL,
    ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'MMK',
    ADD COLUMN `exchangeRate` DECIMAL(10, 4) NOT NULL DEFAULT 1.0000,
    ADD COLUMN `expenseAccountId` VARCHAR(191) NOT NULL,
    ADD COLUMN `expenseNumber` VARCHAR(191) NOT NULL,
    ADD COLUMN `journalId` VARCHAR(191) NULL,
    ADD COLUMN `notes` VARCHAR(191) NULL,
    ADD COLUMN `paidAt` DATETIME(3) NULL,
    ADD COLUMN `paidThroughId` VARCHAR(191) NOT NULL,
    ADD COLUMN `receiptFiles` JSON NULL,
    ADD COLUMN `reference` VARCHAR(191) NULL,
    ADD COLUMN `taxAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `taxRateId` VARCHAR(191) NULL,
    ADD COLUMN `totalAmount` DECIMAL(15, 2) NOT NULL,
    ADD COLUMN `vendorId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `baseCurrency` ENUM('MMK', 'USD', 'EUR', 'GBP', 'SGD', 'THB', 'JPY', 'CNY') NOT NULL DEFAULT 'MMK';

-- CreateTable
CREATE TABLE `inventory_cost_layers` (
    `id` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `purchaseDate` DATETIME(3) NOT NULL,
    `unitCost` DECIMAL(15, 2) NOT NULL,
    `originalQuantity` DECIMAL(10, 3) NOT NULL,
    `remainingQuantity` DECIMAL(10, 3) NOT NULL,
    `isFullyConsumed` BOOLEAN NOT NULL DEFAULT false,
    `reference` VARCHAR(191) NULL,
    `billItemId` VARCHAR(191) NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `inventory_cost_layers_tenantId_inventoryItemId_purchaseDate_idx`(`tenantId`, `inventoryItemId`, `purchaseDate`),
    INDEX `inventory_cost_layers_tenantId_inventoryItemId_isFullyConsum_idx`(`tenantId`, `inventoryItemId`, `isFullyConsumed`),
    INDEX `inventory_cost_layers_billItemId_fkey`(`billItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cogs_calculations` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceItemId` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `quantitySold` DECIMAL(10, 3) NOT NULL,
    `totalCOGS` DECIMAL(15, 2) NOT NULL,
    `averageCostPerUnit` DECIMAL(15, 2) NOT NULL,
    `calculationDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `journalEntryId` VARCHAR(191) NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cogs_calculations_invoiceItemId_key`(`invoiceItemId`),
    INDEX `cogs_calculations_tenantId_inventoryItemId_calculationDate_idx`(`tenantId`, `inventoryItemId`, `calculationDate`),
    INDEX `cogs_calculations_tenantId_calculationDate_idx`(`tenantId`, `calculationDate`),
    INDEX `cogs_calculations_invoiceItemId_fkey`(`invoiceItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cogs_layer_consumptions` (
    `id` VARCHAR(191) NOT NULL,
    `cogsCalculationId` VARCHAR(191) NOT NULL,
    `costLayerId` VARCHAR(191) NOT NULL,
    `quantityConsumed` DECIMAL(10, 3) NOT NULL,
    `unitCost` DECIMAL(15, 2) NOT NULL,
    `totalCost` DECIMAL(15, 2) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cogs_layer_consumptions_tenantId_cogsCalculationId_idx`(`tenantId`, `cogsCalculationId`),
    INDEX `cogs_layer_consumptions_tenantId_costLayerId_idx`(`tenantId`, `costLayerId`),
    INDEX `cogs_layer_consumptions_cogsCalculationId_fkey`(`cogsCalculationId`),
    INDEX `cogs_layer_consumptions_costLayerId_fkey`(`costLayerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_payments` (
    `id` VARCHAR(191) NOT NULL,
    `paymentNumber` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `bankCharges` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `taxAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'MMK',
    `exchangeRate` DECIMAL(10, 6) NOT NULL DEFAULT 1.000000,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paymentMode` ENUM('CASH', 'BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_PAYMENT', 'ONLINE_TRANSFER', 'OTHER') NOT NULL DEFAULT 'CASH',
    `paidThroughId` VARCHAR(191) NOT NULL,
    `referenceNumber` VARCHAR(191) NULL,
    `taxDeducted` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `internalNotes` TEXT NULL,
    `attachments` JSON NULL,
    `branch` VARCHAR(191) NULL DEFAULT 'Head Office',
    `journalId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,

    UNIQUE INDEX `vendor_payments_paymentNumber_key`(`paymentNumber`),
    INDEX `vendor_payments_tenantId_vendorId_idx`(`tenantId`, `vendorId`),
    INDEX `vendor_payments_tenantId_paymentDate_idx`(`tenantId`, `paymentDate`),
    INDEX `vendor_payments_tenantId_paymentMode_idx`(`tenantId`, `paymentMode`),
    INDEX `vendor_payments_paidThroughId_fkey`(`paidThroughId`),
    INDEX `vendor_payments_vendorId_fkey`(`vendorId`),
    UNIQUE INDEX `vendor_payments_tenantId_paymentNumber_key`(`tenantId`, `paymentNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_insights` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('CASH_FLOW_PREDICTION', 'ANOMALY_DETECTION', 'PATTERN_RECOGNITION', 'RISK_ASSESSMENT', 'OPTIMIZATION_SUGGESTION', 'CATEGORIZATION_CONFIDENCE', 'PAYMENT_PREDICTION', 'EXPENSE_ANALYSIS', 'REVENUE_FORECAST') NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `insight` JSON NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `embedding` LONGBLOB NULL,
    `tags` JSON NULL,
    `metadata` JSON NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ai_insights_tenantId_entityType_entityId_idx`(`tenantId`, `entityType`, `entityId`),
    INDEX `ai_insights_tenantId_type_idx`(`tenantId`, `type`),
    INDEX `ai_insights_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `business_patterns` (
    `id` VARCHAR(191) NOT NULL,
    `patternType` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `pattern` JSON NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `embedding` LONGBLOB NULL,
    `frequency` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `tenantId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `business_patterns_tenantId_patternType_idx`(`tenantId`, `patternType`),
    INDEX `business_patterns_tenantId_isActive_idx`(`tenantId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_models` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL DEFAULT '1.0.0',
    `parameters` JSON NOT NULL,
    `performance` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastTrained` DATETIME(3) NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ai_models_tenantId_type_isActive_idx`(`tenantId`, `type`, `isActive`),
    INDEX `ai_models_tenantId_name_idx`(`tenantId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversation_history` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `query` VARCHAR(191) NOT NULL,
    `intent` VARCHAR(191) NULL,
    `response` JSON NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `feedback` VARCHAR(191) NULL,
    `executionTime` INTEGER NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `conversation_history_tenantId_sessionId_idx`(`tenantId`, `sessionId`),
    INDEX `conversation_history_tenantId_intent_idx`(`tenantId`, `intent`),
    INDEX `conversation_history_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prediction_cache` (
    `id` VARCHAR(191) NOT NULL,
    `predictionType` VARCHAR(191) NOT NULL,
    `inputHash` VARCHAR(191) NOT NULL,
    `prediction` JSON NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `prediction_cache_tenantId_expiresAt_idx`(`tenantId`, `expiresAt`),
    UNIQUE INDEX `prediction_cache_tenantId_predictionType_inputHash_key`(`tenantId`, `predictionType`, `inputHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `bill_payments_vendorPaymentId_idx` ON `bill_payments`(`vendorPaymentId`);

-- CreateIndex
CREATE UNIQUE INDEX `expenses_expenseNumber_key` ON `expenses`(`expenseNumber`);

-- CreateIndex
CREATE INDEX `expenses_tenantId_expenseNumber_idx` ON `expenses`(`tenantId`, `expenseNumber`);

-- CreateIndex
CREATE INDEX `expenses_vendorId_fkey` ON `expenses`(`vendorId`);

-- CreateIndex
CREATE INDEX `expenses_taxRateId_fkey` ON `expenses`(`taxRateId`);

-- CreateIndex
CREATE INDEX `expenses_expenseAccountId_fkey` ON `expenses`(`expenseAccountId`);

-- CreateIndex
CREATE INDEX `expenses_paidThroughId_fkey` ON `expenses`(`paidThroughId`);

-- AddForeignKey
ALTER TABLE `bill_payments` ADD CONSTRAINT `bill_payments_vendorPaymentId_fkey` FOREIGN KEY (`vendorPaymentId`) REFERENCES `vendor_payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_expenseAccountId_fkey` FOREIGN KEY (`expenseAccountId`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_paidThroughId_fkey` FOREIGN KEY (`paidThroughId`) REFERENCES `payment_methods`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_taxRateId_fkey` FOREIGN KEY (`taxRateId`) REFERENCES `tax_rates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_cost_layers` ADD CONSTRAINT `inventory_cost_layers_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_cost_layers` ADD CONSTRAINT `inventory_cost_layers_billItemId_fkey` FOREIGN KEY (`billItemId`) REFERENCES `bill_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_cost_layers` ADD CONSTRAINT `inventory_cost_layers_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cogs_calculations` ADD CONSTRAINT `cogs_calculations_invoiceItemId_fkey` FOREIGN KEY (`invoiceItemId`) REFERENCES `invoice_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cogs_calculations` ADD CONSTRAINT `cogs_calculations_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cogs_calculations` ADD CONSTRAINT `cogs_calculations_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cogs_layer_consumptions` ADD CONSTRAINT `cogs_layer_consumptions_cogsCalculationId_fkey` FOREIGN KEY (`cogsCalculationId`) REFERENCES `cogs_calculations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cogs_layer_consumptions` ADD CONSTRAINT `cogs_layer_consumptions_costLayerId_fkey` FOREIGN KEY (`costLayerId`) REFERENCES `inventory_cost_layers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cogs_layer_consumptions` ADD CONSTRAINT `cogs_layer_consumptions_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_payments` ADD CONSTRAINT `vendor_payments_paidThroughId_fkey` FOREIGN KEY (`paidThroughId`) REFERENCES `payment_methods`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_payments` ADD CONSTRAINT `vendor_payments_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_payments` ADD CONSTRAINT `vendor_payments_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_insights` ADD CONSTRAINT `ai_insights_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_patterns` ADD CONSTRAINT `business_patterns_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_models` ADD CONSTRAINT `ai_models_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_history` ADD CONSTRAINT `conversation_history_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prediction_cache` ADD CONSTRAINT `prediction_cache_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
