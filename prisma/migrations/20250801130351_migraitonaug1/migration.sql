/*
  Warnings:

  - Added the required column `runningBalance` to the `bank_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `invoice_payments` DROP FOREIGN KEY `invoice_payments_paymentMethod_fkey`;

-- DropIndex
DROP INDEX `invoice_payments_paymentMethod_fkey` ON `invoice_payments`;

-- AlterTable
ALTER TABLE `bank_transactions` ADD COLUMN `bankFee` DECIMAL(15, 2) NULL,
    ADD COLUMN `contraAccountId` VARCHAR(191) NULL,
    ADD COLUMN `creditAmount` DECIMAL(15, 2) NULL,
    ADD COLUMN `debitAmount` DECIMAL(15, 2) NULL,
    ADD COLUMN `exchangeRate` DECIMAL(10, 6) NULL,
    ADD COLUMN `runningBalance` DECIMAL(15, 2) NOT NULL,
    ADD COLUMN `statementDate` DATETIME(3) NULL,
    ADD COLUMN `transactionNumber` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `invoice_payments` ADD COLUMN `amountAllocated` DECIMAL(15, 2) NULL,
    ADD COLUMN `paymentReceivedId` VARCHAR(191) NULL,
    MODIFY `paymentMethod` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `payments_received` (
    `id` VARCHAR(191) NOT NULL,
    `paymentNumber` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'MMK',
    `exchangeRate` DECIMAL(10, 6) NOT NULL DEFAULT 1.000000,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paymentMode` ENUM('CASH', 'BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_PAYMENT', 'ONLINE_TRANSFER', 'OTHER') NOT NULL DEFAULT 'CASH',
    `depositType` ENUM('CASH_IN_HAND', 'BANK_DEPOSIT', 'PETTY_CASH', 'UNDEPOSITED_FUNDS') NOT NULL DEFAULT 'CASH_IN_HAND',
    `bankCharges` DECIMAL(15, 2) NULL,
    `referenceNumber` VARCHAR(191) NULL,
    `taxDeducted` BOOLEAN NOT NULL DEFAULT false,
    `taxAmount` DECIMAL(15, 2) NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'COMPLETED',
    `isReconciled` BOOLEAN NOT NULL DEFAULT false,
    `reconciledAt` DATETIME(3) NULL,
    `reconciledBy` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `internalNotes` TEXT NULL,
    `attachments` JSON NULL,
    `sendThankYouEmail` BOOLEAN NOT NULL DEFAULT false,
    `emailSent` BOOLEAN NOT NULL DEFAULT false,
    `emailSentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,

    UNIQUE INDEX `payments_received_paymentNumber_key`(`paymentNumber`),
    INDEX `payments_received_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `payments_received_tenantId_paymentDate_idx`(`tenantId`, `paymentDate`),
    INDEX `payments_received_tenantId_customerId_idx`(`tenantId`, `customerId`),
    INDEX `payments_received_tenantId_paymentMode_idx`(`tenantId`, `paymentMode`),
    UNIQUE INDEX `payments_received_tenantId_paymentNumber_key`(`tenantId`, `paymentNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `bank_transactions_tenantId_runningBalance_idx` ON `bank_transactions`(`tenantId`, `runningBalance`);

-- CreateIndex
CREATE INDEX `bank_transactions_tenantId_transactionNumber_idx` ON `bank_transactions`(`tenantId`, `transactionNumber`);

-- CreateIndex
CREATE INDEX `bank_transactions_contraAccountId_fkey` ON `bank_transactions`(`contraAccountId`);

-- CreateIndex
CREATE INDEX `invoice_payments_tenantId_paymentReceivedId_idx` ON `invoice_payments`(`tenantId`, `paymentReceivedId`);

-- AddForeignKey
ALTER TABLE `entries` ADD CONSTRAINT `entries_reference_fkey` FOREIGN KEY (`reference`) REFERENCES `payments_received`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_payments` ADD CONSTRAINT `invoice_payments_paymentMethod_fkey` FOREIGN KEY (`paymentMethod`) REFERENCES `payment_methods`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_payments` ADD CONSTRAINT `invoice_payments_paymentReceivedId_fkey` FOREIGN KEY (`paymentReceivedId`) REFERENCES `payments_received`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_contraAccountId_fkey` FOREIGN KEY (`contraAccountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments_received` ADD CONSTRAINT `payments_received_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments_received` ADD CONSTRAINT `payments_received_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
