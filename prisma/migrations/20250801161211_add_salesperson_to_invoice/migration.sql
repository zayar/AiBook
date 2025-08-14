-- AlterTable
ALTER TABLE `invoices` ADD COLUMN `salespersonId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sales_orders` ADD COLUMN `salespersonId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `salespeople` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `position` VARCHAR(191) NULL,
    `commission` DECIMAL(5, 4) NULL,
    `target` DECIMAL(15, 2) NULL,
    `territory` VARCHAR(191) NULL,
    `manager` VARCHAR(191) NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `salespeople_tenantId_name_idx`(`tenantId`, `name`),
    INDEX `salespeople_tenantId_isActive_idx`(`tenantId`, `isActive`),
    UNIQUE INDEX `salespeople_tenantId_email_key`(`tenantId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `invoices_salespersonId_fkey` ON `invoices`(`salespersonId`);

-- CreateIndex
CREATE INDEX `sales_orders_salespersonId_fkey` ON `sales_orders`(`salespersonId`);

-- AddForeignKey
ALTER TABLE `salespeople` ADD CONSTRAINT `salespeople_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_salespersonId_fkey` FOREIGN KEY (`salespersonId`) REFERENCES `salespeople`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_salespersonId_fkey` FOREIGN KEY (`salespersonId`) REFERENCES `salespeople`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
