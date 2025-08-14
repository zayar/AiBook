-- AlterTable
ALTER TABLE `bank_transactions` ADD COLUMN `paymentMethodId` VARCHAR(191) NULL,
    ADD COLUMN `reconciled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `reconciledAt` DATETIME(3) NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    MODIFY `bankAccountId` VARCHAR(191) NULL,
    MODIFY `type` ENUM('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'FEE', 'INTEREST', 'ADJUSTMENT', 'PAYMENT', 'REFUND', 'CHARGEBACK') NOT NULL;

-- AlterTable
ALTER TABLE `invoice_items` ADD COLUMN `inventoryItemId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `payment_methods` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NULL,
    `routingNumber` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `bankIdentifierCode` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'MMK',
    `branch` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `tenantId` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payment_methods_tenantId_idx`(`tenantId`),
    INDEX `payment_methods_tenantId_isActive_idx`(`tenantId`, `isActive`),
    INDEX `payment_methods_tenantId_type_idx`(`tenantId`, `type`),
    UNIQUE INDEX `payment_methods_tenantId_accountNumber_key`(`tenantId`, `accountNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_reconciliations` (
    `id` VARCHAR(191) NOT NULL,
    `paymentMethodId` VARCHAR(191) NOT NULL,
    `reconciliationDate` DATETIME(3) NOT NULL,
    `statementBalance` DECIMAL(15, 2) NOT NULL,
    `bookBalance` DECIMAL(15, 2) NULL,
    `difference` DECIMAL(15, 2) NULL,
    `reconciledTransactions` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('IN_PROGRESS', 'COMPLETED', 'DISCREPANCY', 'CANCELLED') NOT NULL DEFAULT 'IN_PROGRESS',
    `reconciledBy` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bank_reconciliations_tenantId_paymentMethodId_idx`(`tenantId`, `paymentMethodId`),
    INDEX `bank_reconciliations_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `bank_reconciliations_tenantId_reconciliationDate_idx`(`tenantId`, `reconciliationDate`),
    INDEX `bank_reconciliations_paymentMethodId_fkey`(`paymentMethodId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `bank_transactions_tenantId_paymentMethodId_idx` ON `bank_transactions`(`tenantId`, `paymentMethodId`);

-- CreateIndex
CREATE INDEX `bank_transactions_tenantId_reconciled_idx` ON `bank_transactions`(`tenantId`, `reconciled`);

-- CreateIndex
CREATE INDEX `bank_transactions_tenantId_status_idx` ON `bank_transactions`(`tenantId`, `status`);

-- CreateIndex
CREATE INDEX `bank_transactions_paymentMethodId_fkey` ON `bank_transactions`(`paymentMethodId`);

-- CreateIndex
CREATE INDEX `invoice_items_inventoryItemId_fkey` ON `invoice_items`(`inventoryItemId`);

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_payments` ADD CONSTRAINT `invoice_payments_paymentMethod_fkey` FOREIGN KEY (`paymentMethod`) REFERENCES `payment_methods`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_paymentMethodId_fkey` FOREIGN KEY (`paymentMethodId`) REFERENCES `payment_methods`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_reconciliations` ADD CONSTRAINT `bank_reconciliations_paymentMethodId_fkey` FOREIGN KEY (`paymentMethodId`) REFERENCES `payment_methods`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_reconciliations` ADD CONSTRAINT `bank_reconciliations_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
