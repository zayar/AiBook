/*
  Warnings:

  - You are about to drop the column `difference` on the `bank_reconciliations` table. All the data in the column will be lost.
  - You are about to drop the column `reconciledTransactions` on the `bank_reconciliations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `bank_reconciliations` DROP COLUMN `difference`,
    DROP COLUMN `reconciledTransactions`,
    ADD COLUMN `adjustedBookBalance` DECIMAL(15, 2) NULL,
    ADD COLUMN `isBalanced` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `statementId` VARCHAR(191) NULL,
    ADD COLUMN `variance` DECIMAL(15, 2) NULL;

-- CreateTable
CREATE TABLE `bank_statements` (
    `id` VARCHAR(191) NOT NULL,
    `paymentMethodId` VARCHAR(191) NOT NULL,
    `statementDate` DATETIME(3) NOT NULL,
    `openingBalance` DECIMAL(15, 2) NOT NULL,
    `closingBalance` DECIMAL(15, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'IMPORTED',
    `tenantId` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bank_statements_tenantId_paymentMethodId_idx`(`tenantId`, `paymentMethodId`),
    INDEX `bank_statements_tenantId_statementDate_idx`(`tenantId`, `statementDate`),
    INDEX `bank_statements_paymentMethodId_fkey`(`paymentMethodId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_statement_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `statementId` VARCHAR(191) NOT NULL,
    `transactionDate` DATETIME(3) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `isMatched` BOOLEAN NOT NULL DEFAULT false,
    `matchedTransactionId` VARCHAR(191) NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bank_statement_transactions_tenantId_statementId_idx`(`tenantId`, `statementId`),
    INDEX `bank_statement_transactions_tenantId_isMatched_idx`(`tenantId`, `isMatched`),
    INDEX `bank_statement_transactions_statementId_fkey`(`statementId`),
    INDEX `bank_statement_transactions_matchedTransactionId_fkey`(`matchedTransactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaction_matches` (
    `id` VARCHAR(191) NOT NULL,
    `statementTransactionId` VARCHAR(191) NOT NULL,
    `bookTransactionId` VARCHAR(191) NOT NULL,
    `matchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tenantId` VARCHAR(191) NOT NULL,

    INDEX `transaction_matches_tenantId_idx`(`tenantId`),
    INDEX `transaction_matches_statementTransactionId_fkey`(`statementTransactionId`),
    INDEX `transaction_matches_bookTransactionId_fkey`(`bookTransactionId`),
    UNIQUE INDEX `transaction_matches_statementTransactionId_bookTransactionId_key`(`statementTransactionId`, `bookTransactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userEmail` VARCHAR(191) NULL,
    `oldValues` VARCHAR(191) NULL,
    `newValues` VARCHAR(191) NULL,
    `changes` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_tenantId_entityType_entityId_idx`(`tenantId`, `entityType`, `entityId`),
    INDEX `audit_logs_tenantId_action_idx`(`tenantId`, `action`),
    INDEX `audit_logs_tenantId_userId_idx`(`tenantId`, `userId`),
    INDEX `audit_logs_tenantId_timestamp_idx`(`tenantId`, `timestamp`),
    INDEX `audit_logs_tenantId_ipAddress_idx`(`tenantId`, `ipAddress`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial_audit_trail` (
    `id` VARCHAR(191) NOT NULL,
    `auditLogId` VARCHAR(191) NOT NULL,
    `transactionType` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'MMK',
    `accountsAffected` VARCHAR(191) NULL,
    `tenantId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `financial_audit_trail_auditLogId_key`(`auditLogId`),
    INDEX `financial_audit_trail_tenantId_transactionType_idx`(`tenantId`, `transactionType`),
    INDEX `financial_audit_trail_tenantId_transactionId_idx`(`tenantId`, `transactionId`),
    INDEX `financial_audit_trail_auditLogId_fkey`(`auditLogId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `critical_action_logs` (
    `id` VARCHAR(191) NOT NULL,
    `auditLogId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `alertSent` BOOLEAN NOT NULL DEFAULT false,
    `tenantId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `critical_action_logs_auditLogId_key`(`auditLogId`),
    INDEX `critical_action_logs_tenantId_action_idx`(`tenantId`, `action`),
    INDEX `critical_action_logs_tenantId_alertSent_idx`(`tenantId`, `alertSent`),
    INDEX `critical_action_logs_auditLogId_fkey`(`auditLogId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `bank_reconciliations_statementId_fkey` ON `bank_reconciliations`(`statementId`);

-- AddForeignKey
ALTER TABLE `bank_reconciliations` ADD CONSTRAINT `bank_reconciliations_statementId_fkey` FOREIGN KEY (`statementId`) REFERENCES `bank_statements`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_statements` ADD CONSTRAINT `bank_statements_paymentMethodId_fkey` FOREIGN KEY (`paymentMethodId`) REFERENCES `payment_methods`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_statements` ADD CONSTRAINT `bank_statements_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_statement_transactions` ADD CONSTRAINT `bank_statement_transactions_statementId_fkey` FOREIGN KEY (`statementId`) REFERENCES `bank_statements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_statement_transactions` ADD CONSTRAINT `bank_statement_transactions_matchedTransactionId_fkey` FOREIGN KEY (`matchedTransactionId`) REFERENCES `bank_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_matches` ADD CONSTRAINT `transaction_matches_statementTransactionId_fkey` FOREIGN KEY (`statementTransactionId`) REFERENCES `bank_statement_transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_matches` ADD CONSTRAINT `transaction_matches_bookTransactionId_fkey` FOREIGN KEY (`bookTransactionId`) REFERENCES `bank_transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_matches` ADD CONSTRAINT `transaction_matches_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_audit_trail` ADD CONSTRAINT `financial_audit_trail_auditLogId_fkey` FOREIGN KEY (`auditLogId`) REFERENCES `audit_logs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `critical_action_logs` ADD CONSTRAINT `critical_action_logs_auditLogId_fkey` FOREIGN KEY (`auditLogId`) REFERENCES `audit_logs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
