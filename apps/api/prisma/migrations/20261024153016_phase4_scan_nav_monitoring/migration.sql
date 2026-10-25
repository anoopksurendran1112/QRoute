-- CreateTable
CREATE TABLE `scan_events` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `nodeId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `ip` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `success` BOOLEAN NOT NULL DEFAULT true,
    `reason` VARCHAR(64) NULL,
    `scannedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `scan_events_nodeId_idx`(`nodeId`),
    INDEX `scan_events_userId_idx`(`userId`),
    INDEX `scan_events_scannedAt_idx`(`scannedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `navigation_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `startNodeId` VARCHAR(191) NOT NULL,
    `endNodeId` VARCHAR(191) NOT NULL,
    `status` ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
    `algorithm` VARCHAR(16) NULL,
    `distanceM` DECIMAL(10, 3) NULL,
    `durationSec` INTEGER NULL,
    `routeJson` JSON NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,

    INDEX `navigation_sessions_userId_idx`(`userId`),
    INDEX `navigation_sessions_status_idx`(`status`),
    INDEX `navigation_sessions_startedAt_idx`(`startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `scan_events` ADD CONSTRAINT `scan_events_nodeId_fkey` FOREIGN KEY (`nodeId`) REFERENCES `nodes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scan_events` ADD CONSTRAINT `scan_events_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `navigation_sessions` ADD CONSTRAINT `navigation_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `navigation_sessions` ADD CONSTRAINT `navigation_sessions_startNodeId_fkey` FOREIGN KEY (`startNodeId`) REFERENCES `nodes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `navigation_sessions` ADD CONSTRAINT `navigation_sessions_endNodeId_fkey` FOREIGN KEY (`endNodeId`) REFERENCES `nodes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
