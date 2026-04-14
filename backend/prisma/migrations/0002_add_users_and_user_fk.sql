-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL UNIQUE,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add user_id column to qr_codes if missing
ALTER TABLE "qr_codes"
ADD COLUMN IF NOT EXISTS "user_id" UUID;

-- Backfill existing rows with a placeholder user
INSERT INTO "users" ("id", "email", "password_hash")
VALUES ('00000000-0000-0000-0000-000000000000', 'legacy@placeholder.local', '$2a$10$legacyplaceholderhash')
ON CONFLICT ("email") DO NOTHING;

UPDATE "qr_codes"
SET "user_id" = '00000000-0000-0000-0000-000000000000'
WHERE "user_id" IS NULL;

ALTER TABLE "qr_codes"
ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "qr_codes"
ADD CONSTRAINT "qr_codes_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "qr_codes_user_id_idx" ON "qr_codes"("user_id");
