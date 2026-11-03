import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyOtpHash, isExpired, hasExceededAttempts } from '@/lib/otp';
import { verifyFirebaseSmsOtp } from '@/lib/firebase-sms';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone ?? '').replace(/\D/g, '').slice(-10);
  const email = String(body.email ?? '').trim().toLowerCase();
  const otp = String(body.otp ?? '');
  const fullName = String(body.fullName ?? '').trim();
  const bodyEmail = String(body.email ?? '').trim();

  const target = phone || email;
  const targetType: 'phone' | 'email' = phone ? 'phone' : 'email';

  if (!target || !otp) {
    return NextResponse.json({ error: 'Phone/email and OTP are required' }, { status: 400 });
  }
  if (phone && phone.length !== 10) {
    return NextResponse.json({ error: 'Phone and OTP are required' }, { status: 400 });
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  const rl = checkRateLimit(`verify:${target}`, 15);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 },
    );
  }

  const supabase = supabaseAdmin();

  // ── Fetch OTP record ──────────────────────────────────────────────────────
  const { data: otpRecord, error: otpError } = await supabase
    .from('otps')
    .select('*')
    .eq('phone', target)
    .maybeSingle();

  if (otpError && otpError.code !== 'PGRST116') {
    return NextResponse.json({ error: otpError.message }, { status: 500 });
  }

  if (!otpRecord) {
    return NextResponse.json({ error: 'No OTP found. Please request a new one.' }, { status: 401 });
  }

  // ── Max-attempts guard ────────────────────────────────────────────────────
  if (hasExceededAttempts(otpRecord.attempts ?? 0)) {
    await supabase.from('otps').delete().eq('phone', target);
    return NextResponse.json(
      { error: 'Maximum attempts exceeded. Please request a new OTP.' },
      { status: 401 },
    );
  }

  // ── Expiry check ──────────────────────────────────────────────────────────
  if (isExpired(otpRecord.created_at)) {
    await supabase.from('otps').delete().eq('phone', target);
    return NextResponse.json({ error: 'OTP expired' }, { status: 401 });
  }

  // ── Verify OTP (channel-aware) ────────────────────────────────────────────
  let verified = false;
  const channel: string = otpRecord.channel ?? 'dev';

  if (channel === 'sms' && otpRecord.firebase_session) {
    // Firebase SMS: Firebase owns the code — verify via its REST API
    const fb = await verifyFirebaseSmsOtp(otpRecord.firebase_session, otp);
    verified = fb.verified;
  } else if (otpRecord.otp_hash) {
    // WhatsApp / Email / Dev — verify against our SHA-256 hash
    verified = verifyOtpHash(otp, otpRecord.otp_hash);
  } else if (otpRecord.otp) {
    // Legacy plaintext fallback (pre-migration records)
    verified = otpRecord.otp === otp;
  }

  if (!verified) {
    await supabase
      .from('otps')
      .update({ attempts: (otpRecord.attempts ?? 0) + 1 })
      .eq('phone', target);
    return NextResponse.json({ error: 'Invalid OTP' }, { status: 401 });
  }

  // ── OTP valid — user upsert (preserves existing logic) ────────────────────
  if (targetType === 'phone') {
    const { data: existingUser, error: userLookupError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (userLookupError && userLookupError.code !== 'PGRST116') {
      return NextResponse.json({ error: userLookupError.message }, { status: 500 });
    }

    const userId = existingUser?.id ?? `u_${crypto.randomUUID()}`;
    const nextUser = {
      id: userId,
      full_name: fullName || existingUser?.full_name || 'Chakki Customer',
      phone,
      email: bodyEmail || existingUser?.email || null,
      phone_verified: true,
      email_verified: existingUser?.email_verified ?? Boolean(bodyEmail),
    };

    const { data: user, error: upsertError } = await supabase
      .from('users')
      .upsert(nextUser, { onConflict: 'id' })
      .select()
      .single();

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    // Single-use: delete the OTP
    await supabase.from('otps').delete().eq('phone', target);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
      },
    });
  }

  // ── Email OTP verification → user upsert ──────────────────────────────────
  const { data: existingUser, error: userLookupError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (userLookupError && userLookupError.code !== 'PGRST116') {
    return NextResponse.json({ error: userLookupError.message }, { status: 500 });
  }

  const userId = existingUser?.id ?? `u_${crypto.randomUUID()}`;
  const nextUser = {
    id: userId,
    full_name: fullName || existingUser?.full_name || 'Chakki Customer',
    phone: existingUser?.phone || null,
    email,
    email_verified: true,
    phone_verified: existingUser?.phone_verified ?? false,
  };

  const { data: user, error: upsertError } = await supabase
    .from('users')
    .upsert(nextUser, { onConflict: 'id' })
    .select()
    .single();

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  await supabase.from('otps').delete().eq('phone', target);

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
    },
  });
}
