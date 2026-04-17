-- Add dynamic_url and project_id columns to qr_codes
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "dynamic_url" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "project_id" UUID;

-- CreateTable projects
CREATE TABLE IF NOT EXISTS "projects" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AddForeignKey projects -> users
ALTER TABLE "projects"
ADD CONSTRAINT "projects_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- AddForeignKey qr_codes -> projects
ALTER TABLE "qr_codes"
ADD CONSTRAINT "qr_codes_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "projects_user_id_idx" ON "projects"("user_id");
