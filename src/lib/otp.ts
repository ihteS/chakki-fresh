import crypto from 'crypto';

// ── Constants ───────────────────────────────────────────────────────────────
export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 5 * 60 * 1000;        // 5 minutes
export const MAX_VERIFY_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60 * 1000;     // 60 seconds

// ── Generate a cryptographically-secure 6-digit OTP ─────────────────────────
export function generateOtp(): string {
  const bytes = crypto.randomBytes(4);
  const num = (bytes.readUInt32BE(0) % 900_000) + 100_000;
  return num.toString();
}

// ── SHA-256 hash (hex) ──────────────────────────────────────────────────────
export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

// ── Timing-safe comparison against hash ─────────────────────────────────────
export function verifyOtpHash(otp: string, storedHash: string): boolean {
  const computed = hashOtp(otp);
  if (computed.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash));
}

// ── Expiry check ────────────────────────────────────────────────────────────
export function isExpired(createdAt: string | Date): boolean {
  return Date.now() - new Date(createdAt).getTime() > OTP_TTL_MS;
}

// ── Cooldown check (true = may send again) ──────────────────────────────────
export function canResend(createdAt: string | Date): boolean {
  return Date.now() - new Date(createdAt).getTime() >= RESEND_COOLDOWN_MS;
}

// ── Attempt guard ───────────────────────────────────────────────────────────
export function hasExceededAttempts(attempts: number): boolean {
  return attempts >= MAX_VERIFY_ATTEMPTS;
}

