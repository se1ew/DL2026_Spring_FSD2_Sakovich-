-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" UUID NOT NULL,
    "data" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#000000',
    "background" TEXT NOT NULL DEFAULT '#ffffff',
    "size" INTEGER NOT NULL DEFAULT 300,
    "format" TEXT NOT NULL DEFAULT 'png',
    "error_correction_level" TEXT,
    "margin" INTEGER,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

