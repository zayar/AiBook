/*
  Warnings:

  - You are about to alter the column `depositType` on the `payments_received` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(18))` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `payments_received` MODIFY `depositType` VARCHAR(191) NOT NULL DEFAULT 'CASH_IN_HAND';
