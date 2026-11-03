import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateOtp, hashOtp, canResend, RESEND_COOLDOWN_MS } from '@/lib/otp';
import { sendWhatsAppOtp } from '@/lib/whatsapp';
import { sendFirebaseSmsOtp } from '@/lib/firebase-sms';
import { sendEmailOtp } from '@/lib/resend-email';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const phone = body.phone ? String(body.phone).replace(/\D/g, '').slice(-10) : '';
  const email = body.email ? String(body.email).trim().toLowerCase() : '';

  if (!phone && !email) {
    return NextResponse.json({ error: 'Phone or email required' }, { status: 400 });
  }
  if (phone && phone.length !== 10) {
    return NextResponse.json({ error: 'Invalid 10-digit phone number' }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const target = phone || email;
  const targetType: 'phone' | 'email' = phone ? 'phone' : 'email';

  // ── Rate limit ────────────────────────────────────────────────────────────
  const rl = checkRateLimit(`send:${target}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    );
  }

  // ── Resend cooldown ───────────────────────────────────────────────────────
  const supabase = supabaseAdmin();
  const { data: existing } = await supabase
    .from('otps')
    .select('created_at')
    .eq('phone', target)
    .maybeSingle();

  if (existing && !canResend(existing.created_at)) {
    const wait = Math.ceil(
      (RESEND_COOLDOWN_MS - (Date.now() - new Date(existing.created_at).getTime())) / 1000,
    );
    return NextResponse.json(
      { error: `Please wait ${wait}s before requesting a new code` },
      { status: 429 },
    );
  }

  // ── Generate OTP ──────────────────────────────────────────────────────────
  const otp = generateOtp();
  const otpHash = hashOtp(otp);

  let channel: 'whatsapp' | 'sms' | 'email' | 'dev' = targetType === 'email' ? 'email' : 'whatsapp';
  let firebaseSession: string | null = null;
  let waMessageId: string | null = null;
  let delivered = false;

  // ── Deliver ───────────────────────────────────────────────────────────────
  if (targetType === 'phone') {
    // 1) Try WhatsApp Cloud API
    const wa = await sendWhatsAppOtp(phone, otp);
    if (wa.success) {
      channel = 'whatsapp';
      waMessageId = wa.messageId ?? null;
      delivered = true;
    } else {
      // 2) Fallback: Firebase SMS (Firebase generates its own OTP)
      const fb = await sendFirebaseSmsOtp(phone);
      if (fb.success && fb.sessionInfo) {
        channel = 'sms';
        firebaseSession = fb.sessionInfo;
        delivered = true;
      }
    }
  } else {
    // Email OTP via Resend
    const em = await sendEmailOtp(email, otp);
    if (em.success) {
      channel = 'email';
      delivered = true;
    }
  }

  // ── Dev fallback (no provider configured) ─────────────────────────────────
  if (!delivered) {
    channel = 'dev';
  }

  // ── Persist OTP record ────────────────────────────────────────────────────
  // • `otp` column keeps plaintext for frontend direct-verify compatibility
  //   (except Firebase SMS where Firebase owns the code).
  // • `otp_hash` is used by the server-side /verify-otp endpoint.
  await supabase.from('otps').upsert({
    phone: target,
    otp: channel === 'sms' ? null : otp,
    otp_hash: otpHash,
    channel,
    attempts: 0,
    firebase_session: firebaseSession,
    wa_message_id: waMessageId,
    created_at: new Date().toISOString(),
  });

  // ── Response ──────────────────────────────────────────────────────────────
  if (channel === 'dev') {
    // No provider was reachable — return OTP for local development
    return NextResponse.json({ sent: true, devOtp: otp });
  }

  return NextResponse.json({ sent: true, channel });
}
