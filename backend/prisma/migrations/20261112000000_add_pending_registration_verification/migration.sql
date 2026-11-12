CREATE TABLE "PendingRegistration" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "invitation_token_hash" TEXT,
    "otp_hash" TEXT NOT NULL,
    "otp_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "otp_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_sent_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingRegistration_email_key" ON "PendingRegistration"("email");
CREATE INDEX "PendingRegistration_otp_expires_at_idx" ON "PendingRegistration"("otp_expires_at");
CREATE INDEX "PendingRegistration_consumed_at_idx" ON "PendingRegistration"("consumed_at");
