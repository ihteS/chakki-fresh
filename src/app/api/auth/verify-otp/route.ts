import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const OTP_TTL_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone ?? '').replace(/\D/g, '').slice(-10);
  const otp = String(body.otp ?? '');
  const fullName = String(body.fullName ?? '').trim();
  const email = String(body.email ?? '').trim();

  if (!phone || phone.length !== 10 || !otp) {
    return NextResponse.json({ error: 'Phone and OTP are required' }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: otpRecord, error: otpError } = await supabase
    .from('otps')
    .select('otp, created_at')
    .eq('phone', phone)
    .maybeSingle();

  if (otpError && otpError.code !== 'PGRST116') {
    return NextResponse.json({ error: otpError.message }, { status: 500 });
  }

  if (!otpRecord || otpRecord.otp !== otp) {
    return NextResponse.json({ error: 'Invalid OTP' }, { status: 401 });
  }

  const otpAge = Date.now() - new Date(otpRecord.created_at ?? 0).getTime();
  if (otpAge > OTP_TTL_MS) {
    return NextResponse.json({ error: 'OTP expired' }, { status: 401 });
  }

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
    email: email || existingUser?.email || null,
    phone_verified: true,
    email_verified: existingUser?.email_verified ?? Boolean(email),
  };

  const { data: user, error: upsertError } = await supabase
    .from('users')
    .upsert(nextUser, { onConflict: 'id' })
    .select()
    .single();

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  await supabase.from('otps').delete().eq('phone', phone);

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
