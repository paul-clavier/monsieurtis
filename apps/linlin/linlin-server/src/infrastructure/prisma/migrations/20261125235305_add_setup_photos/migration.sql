-- CreateTable
CREATE TABLE "SetupPhoto" (
    "id" UUID NOT NULL,
    "setupId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetupPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SetupPhoto_key_key" ON "SetupPhoto"("key");

-- CreateIndex
CREATE INDEX "SetupPhoto_setupId_idx" ON "SetupPhoto"("setupId");

-- AddForeignKey
ALTER TABLE "SetupPhoto" ADD CONSTRAINT "SetupPhoto_setupId_fkey" FOREIGN KEY ("setupId") REFERENCES "Setup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
