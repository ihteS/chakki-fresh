import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 });
  const digits = phone.replace(/\D/g,'').slice(-10);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await sb.from('otps').upsert({ phone: digits, otp, created_at: new Date().toISOString() });

  const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN, from = process.env.TWILIO_PHONE_NUMBER;
  if (sid && tok && from) {
    const body = `Your Chakki Fresh OTP is ${otp}. Valid for 5 minutes.`;
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${Buffer.from(`${sid}:${tok}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: `+91${digits}`, From: from, Body: body }).toString(),
    });
    return NextResponse.json({ sent: true });
  }
  console.log(`[DEV OTP] ${digits}: ${otp}`);
  return NextResponse.json({ sent: true, devOtp: otp });
}
