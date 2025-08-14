/*
  Warnings:

  - The values [ASSET,LIABILITY,REVENUE] on the enum `accounts_type` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[shareToken]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `expenses` DROP FOREIGN KEY `expenses_paidThroughId_fkey`;

-- DropForeignKey
ALTER TABLE `vendor_payments` DROP FOREIGN KEY `vendor_payments_paidThroughId_fkey`;

-- AlterTable
ALTER TABLE `accounts` MODIFY `type` ENUM('OTHER_ASSET', 'OTHER_CURRENT_ASSET', 'CASH', 'BANK', 'FIXED_ASSET', 'ACCOUNTS_RECEIVABLE', 'STOCK', 'PAYMENT_CLEARING_ACCOUNT', 'INPUT_TAX', 'INTANGIBLE_ASSET', 'NON_CURRENT_ASSET', 'DEFERRED_TAX_ASSET', 'OTHER_CURRENT_LIABILITY', 'CREDIT_CARD', 'NON_CURRENT_LIABILITY', 'OTHER_LIABILITY', 'ACCOUNTS_PAYABLE', 'OVERSEAS_TAX_PAYABLE', 'OUTPUT_TAX', 'DEFERRED_TAX_LIABILITY', 'EQUITY', 'INCOME', 'OTHER_INCOME', 'EXPENSE', 'COST_OF_GOODS_SOLD', 'OTHER_EXPENSE') NOT NULL;

-- AlterTable
ALTER TABLE `cogs_calculations` MODIFY `invoiceItemId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `expenses` ADD COLUMN `paidThroughAccountId` VARCHAR(191) NULL,
    MODIFY `paidThroughId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `invoices` ADD COLUMN `designSettings` JSON NULL,
    ADD COLUMN `shareExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `shareToken` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `payment_methods` ADD COLUMN `chartAccountId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `payments_received` ADD COLUMN `depositToAccountId` VARCHAR(191) NULL,
    MODIFY `depositType` VARCHAR(191) NULL DEFAULT 'CASH_IN_HAND';

-- AlterTable
ALTER TABLE `users` ADD COLUMN `passwordHash` VARCHAR(191) NULL,
    ADD COLUMN `passwordMustChange` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `vendor_payments` ADD COLUMN `paidThroughAccountId` VARCHAR(191) NULL,
    MODIFY `paidThroughId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `system_admins` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_admins_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversation_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'COMPLETED', 'TIMEOUT') NOT NULL DEFAULT 'ACTIVE',
    `context` JSON NULL,
    `preferences` JSON NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastActiveAt` DATETIME(3) NOT NULL,
    `endedAt` DATETIME(3) NULL,
    `totalMessages` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `conversation_sessions_sessionId_key`(`sessionId`),
    INDEX `conversation_sessions_tenantId_userId_idx`(`tenantId`, `userId`),
    INDEX `conversation_sessions_tenantId_status_idx`(`tenantId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversation_messages` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `messageType` ENUM('USER', 'ASSISTANT', 'SYSTEM', 'ERROR') NOT NULL DEFAULT 'USER',
    `content` TEXT NOT NULL,
    `intent` VARCHAR(191) NULL,
    `entities` JSON NULL,
    `confidence` DOUBLE NULL,
    `executionTime` INTEGER NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `conversation_messages_sessionId_createdAt_idx`(`sessionId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_preferences` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `preferenceType` ENUM('REPORT_FORMAT', 'CURRENCY_DISPLAY', 'DATE_FORMAT', 'NOTIFICATION_FREQUENCY', 'DASHBOARD_LAYOUT', 'COMMUNICATION_STYLE', 'LANGUAGE', 'TIMEZONE') NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `confidence` DOUBLE NOT NULL DEFAULT 0.5,
    `learningSource` ENUM('CONVERSATION', 'USER_INTERACTION', 'SYSTEM_OBSERVATION', 'EXPLICIT_FEEDBACK') NOT NULL DEFAULT 'CONVERSATION',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_preferences_tenantId_userId_idx`(`tenantId`, `userId`),
    UNIQUE INDEX `user_preferences_userId_tenantId_preferenceType_key_key`(`userId`, `tenantId`, `preferenceType`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_templates` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `templateType` ENUM('PROFIT_LOSS', 'BALANCE_SHEET', 'CASH_FLOW', 'TRIAL_BALANCE', 'GENERAL_LEDGER', 'ACCOUNTS_RECEIVABLE', 'ACCOUNTS_PAYABLE', 'INVENTORY_REPORT', 'TAX_REPORT', 'CUSTOM') NOT NULL,
    `nlQuery` VARCHAR(191) NOT NULL,
    `sqlQuery` VARCHAR(191) NULL,
    `parameters` JSON NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `avgExecutionTime` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `report_templates_tenantId_templateType_idx`(`tenantId`, `templateType`),
    INDEX `report_templates_tenantId_isPublic_idx`(`tenantId`, `isPublic`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `books_tenantId_idx` ON `books`(`tenantId`);

-- CreateIndex
CREATE INDEX `books_tenantId_createdAt_idx` ON `books`(`tenantId`, `createdAt`);

-- CreateIndex
CREATE INDEX `expenses_paidThroughAccountId_fkey` ON `expenses`(`paidThroughAccountId`);

-- CreateIndex
CREATE UNIQUE INDEX `invoices_shareToken_key` ON `invoices`(`shareToken`);

-- CreateIndex
CREATE INDEX `payment_methods_chartAccountId_idx` ON `payment_methods`(`chartAccountId`);

-- CreateIndex
CREATE INDEX `payments_received_depositToAccountId_fkey` ON `payments_received`(`depositToAccountId`);

-- CreateIndex
CREATE INDEX `vendor_payments_paidThroughAccountId_fkey` ON `vendor_payments`(`paidThroughAccountId`);

-- AddForeignKey
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_chartAccountId_fkey` FOREIGN KEY (`chartAccountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_paidThroughAccountId_fkey` FOREIGN KEY (`paidThroughAccountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_paidThroughId_fkey` FOREIGN KEY (`paidThroughId`) REFERENCES `payment_methods`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments_received` ADD CONSTRAINT `payments_received_depositToAccountId_fkey` FOREIGN KEY (`depositToAccountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_payments` ADD CONSTRAINT `vendor_payments_paidThroughAccountId_fkey` FOREIGN KEY (`paidThroughAccountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_payments` ADD CONSTRAINT `vendor_payments_paidThroughId_fkey` FOREIGN KEY (`paidThroughId`) REFERENCES `payment_methods`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_sessions` ADD CONSTRAINT `conversation_sessions_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_messages` ADD CONSTRAINT `conversation_messages_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `conversation_sessions`(`sessionId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_templates` ADD CONSTRAINT `report_templates_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
