import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isExpired } from '@/lib/otp';
import { sendFirebaseSmsOtp } from '@/lib/firebase-sms';

/**
 * WhatsApp Cloud API Webhook
 *
 * GET  — Meta verification handshake
 * POST — Delivery-status updates; triggers Firebase SMS fallback on failure
 *
 * Setup: In Meta Business Manager → WhatsApp → Configuration → Webhook,
 *        set the callback URL to https://yourdomain.com/api/webhooks/whatsapp
 *        and use the WHATSAPP_VERIFY_TOKEN you set in your environment.
 */

// ── Webhook verification (GET) ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ── Delivery status updates (POST) ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));

  const entries: any[] = payload.entry ?? [];
  for (const entry of entries) {
    const changes: any[] = entry.changes ?? [];
    for (const change of changes) {
      const statuses: any[] = change.value?.statuses ?? [];
      for (const status of statuses) {
        if (status.status === 'failed') {
          await handleDeliveryFailure(status.id, status.recipient_id);
        }
      }
    }
  }

  // Always respond 200 to acknowledge (Meta retries on non-2xx)
  return NextResponse.json({ ok: true });
}

// ── On definitive WhatsApp failure → attempt Firebase SMS ───────────────────
async function handleDeliveryFailure(messageId: string, recipientPhone: string) {
  if (!messageId || !recipientPhone) return;

  const supabase = supabaseAdmin();
  const phone = recipientPhone.replace(/^91/, '').slice(-10);

  // Find the OTP record that matches this WhatsApp message
  const { data: record } = await supabase
    .from('otps')
    .select('*')
    .eq('phone', phone)
    .eq('wa_message_id', messageId)
    .eq('channel', 'whatsapp')
    .maybeSingle();

  if (!record) return; // already verified, expired, or not ours

  // Don't bother if the OTP is already expired
  if (isExpired(record.created_at)) return;

  // Attempt Firebase SMS fallback
  const fb = await sendFirebaseSmsOtp(phone);
  if (fb.success && fb.sessionInfo) {
    await supabase
      .from('otps')
      .update({
        channel: 'sms',
        firebase_session: fb.sessionInfo,
        otp: null, // Firebase owns the code now
      })
      .eq('phone', phone)
      .eq('wa_message_id', messageId);
  }
}

