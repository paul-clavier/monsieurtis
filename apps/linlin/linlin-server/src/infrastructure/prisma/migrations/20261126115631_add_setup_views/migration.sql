-- CreateTable
CREATE TABLE "SetupView" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT,
    "tagNames" TEXT[],
    "match" TEXT NOT NULL DEFAULT 'any',
    "scope" TEXT NOT NULL DEFAULT 'all',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetupView_pkey" PRIMARY KEY ("id")
);
