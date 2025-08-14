-- DropForeignKey
ALTER TABLE `entries` DROP FOREIGN KEY `entries_reference_fkey`;

-- DropIndex
DROP INDEX `entries_reference_fkey` ON `entries`;

-- AlterTable
ALTER TABLE `entries` ADD COLUMN `paymentReceivedId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `entries` ADD CONSTRAINT `entries_paymentReceivedId_fkey` FOREIGN KEY (`paymentReceivedId`) REFERENCES `payments_received`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
