-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ingestKey" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fiveHourPct" REAL NOT NULL,
    "fiveHourResetsAt" DATETIME NOT NULL,
    "sevenDayPct" REAL NOT NULL,
    "sevenDayResetsAt" DATETIME NOT NULL,
    "raw" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Snapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "collectIntervalMin" INTEGER NOT NULL DEFAULT 30,
    "digestHourUtc" INTEGER NOT NULL DEFAULT 9,
    "warnThreshold" INTEGER NOT NULL DEFAULT 80,
    "criticalThreshold" INTEGER NOT NULL DEFAULT 95,
    "adminEmail" TEXT NOT NULL DEFAULT '',
    "digestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "AlertLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_ingestKey_key" ON "User"("ingestKey");

-- CreateIndex
CREATE INDEX "Snapshot_userId_capturedAt_idx" ON "Snapshot"("userId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AlertLog_userId_kind_dedupeKey_key" ON "AlertLog"("userId", "kind", "dedupeKey");
