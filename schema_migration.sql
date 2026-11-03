-- Migration: Extend otps table for multi-channel OTP support
-- Run this in Supabase SQL Editor after the initial schema.sql

-- New columns for the enhanced OTP system
ALTER TABLE otps ADD COLUMN IF NOT EXISTS otp_hash         text;
ALTER TABLE otps ADD COLUMN IF NOT EXISTS channel          text DEFAULT 'dev';
ALTER TABLE otps ADD COLUMN IF NOT EXISTS attempts         int  DEFAULT 0;
ALTER TABLE otps ADD COLUMN IF NOT EXISTS firebase_session text;
ALTER TABLE otps ADD COLUMN IF NOT EXISTS wa_message_id    text;

-- Index for webhook lookups by WhatsApp message ID
CREATE INDEX IF NOT EXISTS idx_otps_wa_message_id ON otps (wa_message_id) WHERE wa_message_id IS NOT NULL;

COMMENT ON COLUMN otps.otp_hash         IS 'SHA-256 hash of the OTP (server-side verification)';
COMMENT ON COLUMN otps.channel          IS 'Delivery channel: whatsapp | sms | email | dev';
COMMENT ON COLUMN otps.attempts         IS 'Number of failed verification attempts (max 5)';
COMMENT ON COLUMN otps.firebase_session IS 'Firebase Identity Toolkit sessionInfo for SMS verification';
COMMENT ON COLUMN otps.wa_message_id    IS 'WhatsApp Cloud API message ID for delivery tracking';

