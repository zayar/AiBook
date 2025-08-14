/*
  Warnings:

  - You are about to drop the column `address` on the `vendors` table. All the data in the column will be lost.
  - You are about to alter the column `paymentTerms` on the `vendors` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Enum(EnumId(3))`.

*/
-- AlterTable
ALTER TABLE `vendors` DROP COLUMN `address`,
    ADD COLUMN `billingAddress` JSON NULL,
    ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'MMK',
    ADD COLUMN `displayName` VARCHAR(191) NULL,
    ADD COLUMN `enablePortal` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `openingBalance` DECIMAL(15, 2) NULL,
    ADD COLUMN `portalLanguage` VARCHAR(191) NOT NULL DEFAULT 'English',
    ADD COLUMN `primaryContact` JSON NULL,
    ADD COLUMN `shippingAddress` JSON NULL,
    ADD COLUMN `taxRate` VARCHAR(191) NULL,
    ADD COLUMN `website` VARCHAR(191) NULL,
    MODIFY `paymentTerms` ENUM('DUE_ON_RECEIPT', 'NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90', 'ADVANCE_PAYMENT', 'CUSTOM') NOT NULL DEFAULT 'DUE_ON_RECEIPT';

-- CreateTable
CREATE TABLE `vendor_contact_persons` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `salutation` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `workPhone` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `designation` VARCHAR(191) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `tenantId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vendor_contact_persons_vendorId_idx`(`vendorId`),
    UNIQUE INDEX `vendor_contact_persons_vendorId_email_key`(`vendorId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_documents` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NULL,
    `mimeType` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vendor_documents_vendorId_idx`(`vendorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `vendors_tenantId_isActive_idx` ON `vendors`(`tenantId`, `isActive`);

-- AddForeignKey
ALTER TABLE `vendor_contact_persons` ADD CONSTRAINT `vendor_contact_persons_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_documents` ADD CONSTRAINT `vendor_documents_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
