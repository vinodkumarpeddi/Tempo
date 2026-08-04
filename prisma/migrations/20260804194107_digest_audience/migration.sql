-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "collectIntervalMin" INTEGER NOT NULL DEFAULT 30,
    "digestHourUtc" INTEGER NOT NULL DEFAULT 9,
    "warnThreshold" INTEGER NOT NULL DEFAULT 80,
    "criticalThreshold" INTEGER NOT NULL DEFAULT 95,
    "adminEmail" TEXT NOT NULL DEFAULT '',
    "digestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "digestFormat" TEXT NOT NULL DEFAULT 'inline',
    "digestAudience" TEXT NOT NULL DEFAULT 'all',
    "lastDigestAt" DATETIME
);
INSERT INTO "new_Settings" ("adminEmail", "alertsEnabled", "collectIntervalMin", "criticalThreshold", "digestEnabled", "digestFormat", "digestHourUtc", "id", "lastDigestAt", "warnThreshold") SELECT "adminEmail", "alertsEnabled", "collectIntervalMin", "criticalThreshold", "digestEnabled", "digestFormat", "digestHourUtc", "id", "lastDigestAt", "warnThreshold" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
