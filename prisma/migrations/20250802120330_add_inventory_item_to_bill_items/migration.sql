-- AlterTable
ALTER TABLE `bill_items` ADD COLUMN `inventoryItemId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `bill_items_inventoryItemId_fkey` ON `bill_items`(`inventoryItemId`);

-- AddForeignKey
ALTER TABLE `bill_items` ADD CONSTRAINT `bill_items_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
