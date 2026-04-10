-- CreateTable
CREATE TABLE "AppSetup" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "isInitialized" BOOLEAN NOT NULL DEFAULT false,
    "initializedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetup_pkey" PRIMARY KEY ("id")
);
