-- AlterTable
ALTER TABLE `entries` ADD COLUMN `automationLevel` ENUM('MANUAL', 'AI_SUGGESTED', 'AI_AUTOMATED', 'AI_LEARNED') NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN `businessContextId` VARCHAR(191) NULL,
    ADD COLUMN `impactScore` DOUBLE NULL,
    ADD COLUMN `learningFeedback` JSON NULL,
    ADD COLUMN `predictiveFactors` JSON NULL,
    ADD COLUMN `relationshipGraph` JSON NULL,
    ADD COLUMN `riskScore` DOUBLE NULL,
    ADD COLUMN `seasonalityFactors` JSON NULL,
    ADD COLUMN `semanticCategories` JSON NULL,
    ADD COLUMN `userBehaviorContext` JSON NULL;

-- CreateTable
CREATE TABLE `business_contexts` (
    `id` VARCHAR(191) NOT NULL,
    `businessUnit` VARCHAR(191) NULL,
    `project` VARCHAR(191) NULL,
    `campaign` VARCHAR(191) NULL,
    `channel` VARCHAR(191) NULL,
    `territory` VARCHAR(191) NULL,
    `entitySegment` VARCHAR(191) NULL,
    `entityTier` VARCHAR(191) NULL,
    `relationshipLength` INTEGER NULL,
    `lifetimeValue` DECIMAL(15, 2) NULL,
    `paymentHistory` JSON NULL,
    `riskProfile` VARCHAR(191) NULL,
    `marketConditions` JSON NULL,
    `competitorAnalysis` JSON NULL,
    `seasonalFactors` JSON NULL,
    `externalEvents` JSON NULL,
    `userDecisionPatterns` JSON NULL,
    `correctionHistory` JSON NULL,
    `predictionAccuracy` JSON NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `business_contexts_tenantId_entitySegment_idx`(`tenantId`, `entitySegment`),
    INDEX `business_contexts_tenantId_businessUnit_idx`(`tenantId`, `businessUnit`),
    INDEX `business_contexts_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_model_performances` (
    `id` VARCHAR(191) NOT NULL,
    `modelType` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `accuracy` DOUBLE NOT NULL,
    `precision` DOUBLE NOT NULL,
    `recall` DOUBLE NOT NULL,
    `f1Score` DOUBLE NOT NULL,
    `timesSaved` INTEGER NOT NULL,
    `errorsDetected` INTEGER NOT NULL,
    `revenueImpact` DECIMAL(15, 2) NULL,
    `trainingDataPoints` INTEGER NOT NULL,
    `lastTrainingDate` DATETIME(3) NOT NULL,
    `improvementRate` DOUBLE NOT NULL,
    `period` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_model_performances_tenantId_modelType_idx`(`tenantId`, `modelType`),
    INDEX `ai_model_performances_tenantId_period_idx`(`tenantId`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `business_insights` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `type` ENUM('OPPORTUNITY', 'RISK', 'OPTIMIZATION', 'PREDICTION', 'ANOMALY', 'BENCHMARK') NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `priority` ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `actionable` BOOLEAN NOT NULL DEFAULT false,
    `recommendations` JSON NOT NULL,
    `potentialImpact` DECIMAL(15, 2) NULL,
    `timeframe` VARCHAR(191) NULL,
    `effort` VARCHAR(191) NULL,
    `dataPoints` JSON NOT NULL,
    `relatedEntities` JSON NOT NULL,
    `viewed` BOOLEAN NOT NULL DEFAULT false,
    `viewedAt` DATETIME(3) NULL,
    `actionTaken` VARCHAR(191) NULL,
    `userFeedback` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `business_insights_tenantId_type_idx`(`tenantId`, `type`),
    INDEX `business_insights_tenantId_priority_idx`(`tenantId`, `priority`),
    INDEX `business_insights_tenantId_isActive_idx`(`tenantId`, `isActive`),
    INDEX `business_insights_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial_kpis` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `calculation` JSON NOT NULL,
    `currentValue` DECIMAL(15, 2) NOT NULL,
    `previousValue` DECIMAL(15, 2) NULL,
    `targetValue` DECIMAL(15, 2) NULL,
    `benchmarkValue` DECIMAL(15, 2) NULL,
    `trend` VARCHAR(191) NOT NULL,
    `changePercent` DOUBLE NULL,
    `predictedValue` DECIMAL(15, 2) NULL,
    `predictionConfidence` DOUBLE NULL,
    `period` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `financial_kpis_tenantId_category_idx`(`tenantId`, `category`),
    INDEX `financial_kpis_tenantId_period_idx`(`tenantId`, `period`),
    INDEX `financial_kpis_tenantId_name_idx`(`tenantId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `entries_tenantId_automationLevel_idx` ON `entries`(`tenantId`, `automationLevel`);

-- CreateIndex
CREATE INDEX `entries_tenantId_impactScore_idx` ON `entries`(`tenantId`, `impactScore`);

-- CreateIndex
CREATE INDEX `entries_tenantId_riskScore_idx` ON `entries`(`tenantId`, `riskScore`);

-- CreateIndex
CREATE INDEX `entries_businessContextId_fkey` ON `entries`(`businessContextId`);

-- AddForeignKey
ALTER TABLE `entries` ADD CONSTRAINT `entries_businessContextId_fkey` FOREIGN KEY (`businessContextId`) REFERENCES `business_contexts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_contexts` ADD CONSTRAINT `business_contexts_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_model_performances` ADD CONSTRAINT `ai_model_performances_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_insights` ADD CONSTRAINT `business_insights_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_kpis` ADD CONSTRAINT `financial_kpis_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
