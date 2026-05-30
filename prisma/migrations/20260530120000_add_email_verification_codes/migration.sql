-- Create table for temporary email OTP verification codes used by emergency protocol
CREATE TABLE IF NOT EXISTS "email_verification_codes" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" text NOT NULL,
  "code" text NOT NULL,
  "purpose" text NOT NULL,
  "expiresAt" timestamp(3) NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_verification_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "email_verification_codes_userId_purpose_idx" ON "email_verification_codes" ("userId", "purpose");
